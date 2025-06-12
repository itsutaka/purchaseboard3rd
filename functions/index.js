import express from 'express';
import * as functions from 'firebase-functions';
import admin from 'firebase-admin';

// Initialize firebase-admin
admin.initializeApp();
const db = admin.firestore();

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

// Helper function to get user display name
const getUserDisplayName = async (uid) => {
  if (!uid) return 'Anonymous';
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord.displayName || userRecord.email || 'Anonymous';
  } catch (error) {
    functions.logger.error('Error fetching user data for display name:', uid, error);
    return 'Unknown User';
  }
};


// Authentication Middleware
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    functions.logger.warn('No Firebase ID token was passed as a Bearer token in the Authorization header.');
    return res.status(401).json({ message: 'Unauthorized. No token provided.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    functions.logger.log('ID Token correctly decoded', decodedToken);
    next();
  } catch (error) {
    functions.logger.error('Error while verifying Firebase ID token:', error);
    res.status(403).json({ message: 'Forbidden. Invalid token.', error: error.message });
  }
};

// API endpoint for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'Server is healthy' });
});

// --- Requirements API Endpoints ---

// POST /api/requirements (Create) - Protected
app.post('/api/requirements', verifyFirebaseToken, async (req, res) => {
  try {
    const { text, description, accountingCategory } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text (title) is required' });
    }

    const newRequirement = {
      text,
      description: description || "", // Store description
      accountingCategory: accountingCategory || "",
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: req.user.uid,
      requesterName: req.user.name || req.user.email || 'Anonymous', // Store requester's name at creation
    };
    const docRef = await db.collection('requirements').add(newRequirement);
    const createdData = { id: docRef.id, ...newRequirement, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()};
    res.status(201).json(createdData);
  } catch (error) {
    functions.logger.error('Error creating requirement:', error);
    res.status(500).json({ message: 'Error creating requirement', error: error.message });
  }
});

// PUT /api/requirements/:id (Update) - Protected
app.put('/api/requirements/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const dataToUpdate = req.body; // e.g., { status, purchaseAmount, text, description, etc. }

    const requirementRef = db.collection('requirements').doc(id);
    const doc = await requirementRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Requirement not found' });
    }
    
    const docData = doc.data(); // 取得【文件上】的資料
    const actionRequesterId = req.user.uid; // 取得【操作者】的資料

    const isReverting = dataToUpdate.status === 'pending'; // 判斷這是否是一個「撤銷」操作

    if (isReverting) {
    // 開始進行比對
      const isPurchaser = docData.purchaserId === actionRequesterId; // 比對操作者是不是文件的購買者

      if (!isPurchaser) {
    // 如果兩個都不是，就拒絕操作
        return res.status(403).json({ message: '權限不足，只有購買者才能撤銷此操作。' });
     }
    }

    //if (doc.data().userId !== req.user.uid) {
    //  return res.status(403).json({ message: 'Forbidden. You can only update your own requirements.' });
    //}
    // ***** 新增這段邏輯來處理前端發送的 null 值 *****
    const fieldsToDelete = ['purchaseAmount', 'purchaseDate', 'purchaserName'];
    for (const field of fieldsToDelete) {
        if (dataToUpdate[field] === null) {
            dataToUpdate[field] = admin.firestore.FieldValue.delete();
        }
    }
    // Ensure server timestamp for updatedAt
    dataToUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Handle explicit null values for clearing fields
    const fieldsToClear = ['purchaseAmount', 'purchaseDate', 'purchaserName'];
    fieldsToClear.forEach(field => {
      if (dataToUpdate[field] === null) {
        dataToUpdate[field] = admin.firestore.FieldValue.delete(); // Or set to null if preferred and handled by client
      }
    });


    await requirementRef.update(dataToUpdate);
    const updatedDoc = await requirementRef.get();
    const updatedData = { id: updatedDoc.id, ...updatedDoc.data(),
        createdAt: updatedDoc.data().createdAt?.toDate().toISOString(), // keep original createdAt
        updatedAt: updatedDoc.data().updatedAt?.toDate().toISOString()
    };
    res.status(200).json(updatedData);
  } catch (error) {
    functions.logger.error('Error updating requirement:', error);
    res.status(500).json({ message: 'Error updating requirement', error: error.message });
  }
});

// DELETE /api/requirements/:id (刪除一筆採購需求) - 受保護
app.delete('/api/requirements/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requirementRef = db.collection('requirements').doc(id);
    const doc = await requirementRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: '找不到該採購需求' });
    }

    // 權限檢查：確保只有建立者本人才能刪除
    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ message: '權限不足，您只能刪除自己建立的需求。' });
    }

    // (建議步驟) Firestore 不會自動刪除子集合，所以在刪除文件前，先手動刪除其下的所有留言
    const commentsRef = requirementRef.collection('comments');
    const commentsSnapshot = await commentsRef.get();
    if (!commentsSnapshot.empty) {
      const batch = db.batch();
      commentsSnapshot.docs.forEach(commentDoc => {
        batch.delete(commentDoc.ref);
      });
      await batch.commit();
      functions.logger.log(`已刪除 ${commentsSnapshot.size} 則與採購需求 ${id} 相關的留言`);
    }

    // 刪除主文件
    await requirementRef.delete();
    functions.logger.log(`採購需求 ${id} 已被用戶 ${req.user.uid} 成功刪除`);
    
    // 成功刪除後，回傳 204 No Content 是標準做法
    res.status(204).send();

  } catch (error) {
    functions.logger.error('刪除採購需求時發生錯誤:', error);
    res.status(500).json({ message: '刪除採購需求時發生錯誤', error: error.message });
  }
});
// GET /api/requirements (Read All)
app.get('/api/requirements', async (req, res) => {
  functions.logger.info('Received request for /api/requirements'); // 新增日誌
  try {
    const snapshot = await db.collection('requirements').orderBy('createdAt', 'desc').get();
    functions.logger.info(`Firestore snapshot fetched. Empty: ${snapshot.empty}. Size: ${snapshot.size}`); // 新增日誌

    if (snapshot.empty) {
      functions.logger.info('No requirements found, returning empty array.'); // 新增日誌
      return res.status(200).json([]); // 確保空情況回傳陣列
    }

    const requirementsPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let requesterName = data.requesterName; // 從既有資料開始

      if (!requesterName && data.userId) { // 只有當 requesterName 不存在且有 userId 時才嘗試獲取
        try {
          requesterName = await getUserDisplayName(data.userId);
        } catch (userError) {
          // 即使 getUserDisplayName 內部發生了無法預料的錯誤（例如網路問題、服務暫時不可用）
          // 或者如果 getUserDisplayName 被修改為可能拋出錯誤
          functions.logger.error(`Failed to get display name for UID: ${data.userId} in requirement ${doc.id}`, userError);
          requesterName = 'Unknown User (Error)'; // 或其他標識符
        }
      } else if (!requesterName) {
        requesterName = 'Anonymous'; // 如果連 userId 都沒有
      }

      // Fetch comments for each requirement
      const commentsSnapshot = await db.collection('requirements').doc(doc.id).collection('comments').orderBy('createdAt', 'asc').get();
      const comments = commentsSnapshot.docs.map(commentDoc => ({
        id: commentDoc.id,
        ...commentDoc.data(),
        createdAt: commentDoc.data().createdAt?.toDate().toISOString(),
      }));

      return {
        id: doc.id,
        ...data,
        requesterName, // 使用處理過的 requesterName
        comments, // Add comments array
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      };
    });
    const requirements = await Promise.all(requirementsPromises);
    functions.logger.info(`Successfully processed ${requirements.length} requirements. Returning them.`); // 新增日誌
    res.status(200).json(requirements);
  } catch (error) {
    functions.logger.error('Error in /api/requirements:', error); // 你已經有這個了，很好
    // 確保錯誤時也回傳 JSON
    return res.status(500).json({ message: 'Error fetching requirements from server', error: error.message, stack: error.stack }); // 可以考慮加入 stack trace 以便調試
  }
});

// GET /api/requirements/:id (Read One)
app.get('/api/requirements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('requirements').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Requirement not found' });
    }
    const data = doc.data();

    // Fetch comments
    const commentsSnapshot = await db.collection('requirements').doc(id).collection('comments').orderBy('createdAt', 'asc').get();
    const comments = commentsSnapshot.docs.map(commentDoc => ({
      id: commentDoc.id,
      ...commentDoc.data(),
      createdAt: commentDoc.data().createdAt?.toDate().toISOString(),
    }));

    const requesterName = data.requesterName || await getUserDisplayName(data.userId);

    res.status(200).json({
      id: doc.id,
      ...data,
      requesterName,
      comments,
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString(),
    });
  } catch (error) {
    functions.logger.error('Error fetching requirement:', error);
    res.status(500).json({ message: 'Error fetching requirement', error: error.message });
  }
});

// --- Comments API Endpoints ---

// POST /api/requirements/:reqId/comments (Create Comment) - Protected
app.post('/api/requirements/:reqId/comments', verifyFirebaseToken, async (req, res) => {
  try {
    const { reqId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    // Check if requirement exists
    const requirementRef = db.collection('requirements').doc(reqId);
    const requirementDoc = await requirementRef.get();
    if (!requirementDoc.exists) {
      return res.status(404).json({ message: 'Requirement not found' });
    }

    const newComment = {
      text,
      userId: req.user.uid,
      authorName: req.user.name || req.user.email || 'Anonymous', // Use token name or email
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const commentRef = await requirementRef.collection('comments').add(newComment);
    const createdCommentData = { id: commentRef.id, ...newComment, createdAt: new Date().toISOString() };

    res.status(201).json(createdCommentData);
  } catch (error) {
    functions.logger.error('Error creating comment:', error);
    res.status(500).json({ message: 'Error creating comment', error: error.message });
  }
});

// DELETE /api/requirements/:reqId/comments/:commentId (Delete Comment) - Protected
app.delete('/api/requirements/:reqId/comments/:commentId', verifyFirebaseToken, async (req, res) => {
  try {
    const { reqId, commentId } = req.params;

    const commentRef = db.collection('requirements').doc(reqId).collection('comments').doc(commentId);
    const commentDoc = await commentRef.get();

    if (!commentDoc.exists) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Authorization: Only comment author can delete (or requirement owner - more complex, skip for now)
    if (commentDoc.data().userId !== req.user.uid) {
      // As an alternative, one might allow the requirement owner to delete comments too.
      // const requirementDoc = await db.collection('requirements').doc(reqId).get();
      // if (!requirementDoc.exists || requirementDoc.data().userId !== req.user.uid) {
      //   return res.status(403).json({ message: 'Forbidden. You can only delete your own comments.' });
      // }
      return res.status(403).json({ message: 'Forbidden. You can only delete your own comments.' });
    }

    await commentRef.delete();
    res.status(204).send(); // No Content
  } catch (error) {
    functions.logger.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment', error: error.message });
  }
});


// Export the Express app as an HTTP function
export const api = functions.https.onRequest(app);
