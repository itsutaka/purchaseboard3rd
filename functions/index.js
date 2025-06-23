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

     // --- 👇 新增的審核邏輯 ---
    // 取得 Firestore 中的使用者文件
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    // 如果文件不存在，或狀態不是 'approved'，則拒絕存取
    if (!userDoc.exists || userDoc.data().status !== 'approved') {
      functions.logger.warn(`User ${decodedToken.uid} is not approved or profile does not exist.`);
      return res.status(403).json({ 
        message: 'Forbidden. Your account requires administrator approval to access this resource.' 
      });
    }
    // --- 審核邏輯結束 ---

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

// PUT /api/requirements/:id (Update) - Protected with Transaction
app.put('/api/requirements/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const dataToUpdate = req.body; // e.g., { status, purchaseAmount, text, description, etc. }
    const requirementRef = db.collection('requirements').doc(id);

    // Run the update in a transaction
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(requirementRef);
      if (!doc.exists) {
        // Use a custom error message to be caught later
        throw new Error('NOT_FOUND');
      }

      const docData = doc.data();
      const actionRequesterId = req.user.uid;

      // Logic for marking as 'purchased'
      if (dataToUpdate.status === 'purchased') {
        // ✨ **關鍵檢查**：只允許在 'pending' 狀態下購買
        if (docData.status !== 'pending') {
          throw new Error('ALREADY_PURCHASED'); // Custom error for race condition
        }
      } 
      // Logic for reverting to 'pending'
      else if (dataToUpdate.status === 'pending') {
        // Permission check: only the original purchaser can revert
        if (docData.purchaserId !== actionRequesterId) {
          throw new Error('PERMISSION_DENIED');
        }
      }

      // Prepare the update payload
      const updatePayload = { ...dataToUpdate };

      // Handle clearing fields when reverting
      const fieldsToClear = ['purchaseAmount', 'purchaseDate', 'purchaserName', 'purchaserId'];
      for (const field of fieldsToClear) {
        if (updatePayload[field] === null) {
          updatePayload[field] = admin.firestore.FieldValue.delete();
        }
      }
      
      updatePayload.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      transaction.update(requirementRef, updatePayload);
    });

    // If transaction is successful, fetch the updated document and send it back
    const updatedDocSnap = await requirementRef.get();
    const responseData = { id: updatedDocSnap.id, ...updatedDocSnap.data() };
    // Convert Timestamps for client-side consumption
    responseData.createdAt = responseData.createdAt?.toDate().toISOString();
    responseData.updatedAt = responseData.updatedAt?.toDate().toISOString();
    
    res.status(200).json(responseData);

  } catch (error) {
    functions.logger.error('Error updating requirement:', error.message);
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ message: '該採購需求不存在。' });
    }
    if (error.message === 'ALREADY_PURCHASED') {
      return res.status(409).json({ message: '此需求已被他人標記為已購買，頁面將會自動更新。' });
    }
    if (error.message === 'PERMISSION_DENIED') {
      return res.status(403).json({ message: '權限不足，只有原始購買者才能撤銷此操作。' });
    }
    res.status(500).json({ message: '更新採購需求時發生錯誤', error: error.message });
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
app.get('/api/requirements', verifyFirebaseToken, async (req, res) => {
  functions.logger.info('Received request for /api/requirements'); 
  try {
    const snapshot = await db.collection('requirements').orderBy('createdAt', 'desc').get();
    functions.logger.info(`Firestore snapshot fetched. Empty: ${snapshot.empty}. Size: ${snapshot.size}`); 

    if (snapshot.empty) {
      functions.logger.info('No requirements found, returning empty array.'); 
      return res.status(200).json([]); 
    }

    const requirementsPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      let requesterName = data.requesterName; 

      if (!requesterName && data.userId) { 
        try {
          requesterName = await getUserDisplayName(data.userId);
        } catch (userError) {
          functions.logger.error(`Failed to get display name for UID: ${data.userId} in requirement ${doc.id}`, userError);
          requesterName = 'Unknown User (Error)'; 
        }
      } else if (!requesterName) {
        requesterName = 'Anonymous'; 
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
        requesterName, 
        comments, 
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      };
    });
    const requirements = await Promise.all(requirementsPromises);
    functions.logger.info(`Successfully processed ${requirements.length} requirements. Returning them.`); 
    res.status(200).json(requirements);
  } catch (error) {
    functions.logger.error('Error in /api/requirements:', error); 
    return res.status(500).json({ message: 'Error fetching requirements from server', error: error.message, stack: error.stack }); 
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
      return res.status(403).json({ message: 'Forbidden. You can only delete your own comments.' });
    }

    await commentRef.delete();
    res.status(204).send(); // No Content
  } catch (error) {
    functions.logger.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment', error: error.message });
  }
});

// MODIFIED: Convert callable function to regular HTTP endpoint with CORS
// This replaces the getUserDisplayNameCallable function
app.get('/api/user/current/display-name', verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.user.uid; // From verified token
    
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        message: 'User profile not found in Firestore.' 
      });
    }

    const displayName = userDoc.data().displayName;
    if (!displayName) {
      return res.status(404).json({ 
        message: 'Display name not found for this user.' 
      });
    }

    res.status(200).json({ displayName });
  } catch (error) {
    functions.logger.error(`Error fetching display name for UID ${req.user?.uid}:`, error);
    res.status(500).json({ 
      message: 'Failed to retrieve display name.',
      error: error.message 
    });
  }
});

// 當有新使用者在 Authentication 建立時，自動在 Firestore 中建立 user profile
export const createuserprofile = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName } = user;
  const userProfile = {
    email: email,
    displayName: displayName || 'N/A',
    status: 'pending', // 預設狀態為待審核
    roles: ['user'],   // 可選：預設角色
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('users').doc(uid).set(userProfile);
    functions.logger.log(`Successfully created profile for user ${uid}`);
  } catch (error) {
    functions.logger.error(`Error creating profile for user ${uid}:`, error);
  }
});

// Export the Express app as an HTTP function
export const api = functions.https.onRequest(app);