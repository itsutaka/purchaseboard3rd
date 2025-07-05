import express from 'express';
import admin from 'firebase-admin';
import * as logger from "firebase-functions/logger"; // Gen 2 logging
import {onRequest} from "firebase-functions/v2/https"; // For HTTP functions
import {onCall, HttpsError} from "firebase-functions/v2/https"; // For Callable functions
import * as functions from 'firebase-functions';


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
    logger.error('Error fetching user data for display name:', uid, error);
    return 'Unknown User';
  }
};

// Helper function to get user details (name and email)
const getUserDetails = async (uid) => {
  if (!uid) return { name: null, email: null };
  try {
    const userRecord = await admin.auth().getUser(uid);
    return {
      name: userRecord.displayName,
      email: userRecord.email,
    };
  } catch (error) {
    // 如果因為找不到用戶等原因出錯，回傳 null，避免整個 API 崩潰
    logger.warn('Could not fetch user data for uid:', uid, error.code);
    return { name: null, email: null };
  }
};
// Authentication Middleware
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('No Firebase ID token was passed as a Bearer token in the Authorization header.');
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
      logger.warn(`User ${decodedToken.uid} is not approved or profile does not exist.`);
      return res.status(403).json({
        message: 'Forbidden. Your account requires administrator approval to access this resource.'
      });
    }
    // --- 審核邏輯結束 ---

    req.user = decodedToken;
    logger.log('ID Token correctly decoded', decodedToken);
    next();
  } catch (error) {
    logger.error('Error while verifying Firebase ID token:', error);
    res.status(403).json({ message: 'Forbidden. Invalid token.', error: error.message });
  }
};

// API endpoint for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', message: 'Server is healthy' });
});

// --- Users API Endpoint ---

// GET /api/users (Get All Users) - Protected
app.get('/api/users', verifyFirebaseToken, async (req, res) => {
  try {
    const listUsersResult = await admin.auth().listUsers();
    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      displayName: userRecord.displayName || 'N/A',
    }));
    res.status(200).json(users);
  } catch (error) {
    logger.error('Error listing users:', error);
    res.status(500).json({ message: 'Error listing users', error: error.message });
  }
});

// --- Requirements API Endpoints ---

// POST /api/requirements (Create) - Protected
// POST /api/requirements (Create) - Protected
app.post('/api/requirements', verifyFirebaseToken, async (req, res) => {
  try {
    // 👇 解構出所有可能的欄位
    const { text, description, accountingCategory, status, purchaseAmount, purchaseDate } = req.body;

    if (!text) {
      return res.status(400).json({ message: 'Text (title) is required' });
    }

    const newRequirement = {
      text,
      description: description || "",
      accountingCategory: accountingCategory || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: req.user.uid,
      requesterName: req.user.name || req.user.email || 'Anonymous',
    };

    // ▼▼▼ 核心修改：根據傳入的 status 決���如何處理 ▼▼▼
    if (status === 'purchased') {
      // 如果是直接建立 "已購買" 狀態
      if (typeof purchaseAmount !== 'number' || purchaseAmount <= 0) {
        return res.status(400).json({ message: 'A valid purchaseAmount is required for purchased status.' });
      }
      newRequirement.status = 'purchased';
      newRequirement.purchaseAmount = purchaseAmount;
      // 使用客戶端傳來的 purchaseDate，或設為當前伺服器時間作為備用
      newRequirement.purchaseDate = purchaseDate || new Date().toISOString();
      newRequirement.purchaserName = req.user.name || req.user.email; // 使用 token 中的使用者資訊
      newRequirement.purchaserId = req.user.uid;
    } else {
      // 預設行為：建立 "待購買" 狀態
      newRequirement.status = 'pending';
    }
    // ▲▲▲ 修改結束 ▲▲▲

    const docRef = await db.collection('requirements').add(newRequirement);
    const createdData = { id: docRef.id, ...newRequirement, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()};
    res.status(201).json(createdData);
  } catch (error) {
    logger.error('Error creating requirement:', error);
    res.status(500).json({ message: 'Error creating requirement', error: error.message });
  }
});

// purchaseboard/functions/index.js

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
    if (responseData.purchaseDate && responseData.purchaseDate.toDate) {
      responseData.purchaseDate = responseData.purchaseDate.toDate().toISOString();
    }

    res.status(200).json(responseData);

  } catch (error) {
    logger.error('Error updating requirement:', error.message);
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
      logger.log(`已刪除 ${commentsSnapshot.size} 則與採購需求 ${id} 相關的留言`);
    }

    // 刪除主文件
    await requirementRef.delete();
    logger.log(`採購需求 ${id} 已被用戶 ${req.user.uid} 成功刪除`);

    // 成功刪除後，回傳 204 No Content 是標準做法
    res.status(204).send();

  } catch (error) {
    logger.error('刪除採購需求時發生錯誤:', error);
    res.status(500).json({ message: '刪除採購需求時發生錯誤', error: error.message });
  }
});
// GET /api/requirements (Read All)
app.get('/api/requirements', verifyFirebaseToken, async (req, res) => {
  logger.info('Received request for /api/requirements'); // 新增日誌
  try {
    const snapshot = await db.collection('requirements').orderBy('createdAt', 'desc').get();
    logger.info(`Firestore snapshot fetched. Empty: ${snapshot.empty}. Size: ${snapshot.size}`); // 新增日誌

    if (snapshot.empty) {
      logger.info('No requirements found, returning empty array.'); // 新增日誌
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
          logger.error(`Failed to get display name for UID: ${data.userId} in requirement ${doc.id}`, userError);
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
    logger.info(`Successfully processed ${requirements.length} requirements. Returning them.`); // 新增日誌
    res.status(200).json(requirements);
  } catch (error) {
    logger.error('Error in /api/requirements:', error); // 你已經有這個了，很好
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
    logger.error('Error fetching requirement:', error);
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
    logger.error('Error creating comment:', error);
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
    logger.error('Error deleting comment:', error);
    res.status(500).json({ message: 'Error deleting comment', error: error.message });
  }
});

// =================================================================
// Tithing Tasks API Endpoints (CORRECTED SYNTAX)
// =================================================================

// GET all tithing tasks
app.get('/api/tithe-tasks', verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await db.collection('tithe').orderBy('calculationTimestamp', 'desc').get();
    
    // ✨ 所有需要的名稱都已存在於文件中，無需額外查詢
    const tasks = snapshot.docs.map(doc => {
      const taskData = doc.data();
      return {
        id: doc.id,
        ...taskData,
        // 確保時間戳總是 ISO string 格式
        calculationTimestamp: taskData.calculationTimestamp?.toDate().toISOString(),
      };
    });
    
    res.status(200).json(tasks);
  } catch (error) {
    logger.error('Error getting tithing tasks:', error);
    res.status(500).json({ message: 'Error getting tithing tasks', error: error.message });
  }
});

// POST a new tithing task
app.post('/api/tithe-tasks', verifyFirebaseToken, async (req, res) => {
  try {
    const { uid, name, email } = req.user; // 從已驗證的 token 中取得司庫資訊
    const { financeStaffUid } = req.body; // 從請求的 body 中獲取財務同工的 UID

    if (!financeStaffUid) {
      return res.status(400).json({ message: 'Finance staff UID is required.' });
    }

    // ✨ 步驟 1: 即時查詢財務同工的最新 displayName
    const financeStaffUserRecord = await admin.auth().getUser(financeStaffUid);
    const financeStaffName = financeStaffUserRecord.displayName || financeStaffUserRecord.email || 'N/A';
    
    // ✨ 步驟 2: 將 UID 和 Name 快照一起寫入資料庫
    const newTaskData = {
      treasurerUid: uid,
      treasurerName: name || email || 'Anonymous', // 寫入司庫名稱快照
      financeStaffUid: financeStaffUid,
      financeStaffName: financeStaffName || email || 'Anonymous', // 寫入財務同工名稱快照
      status: 'in-progress',
      calculationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('tithe').add(newTaskData);
    
    const createdTask = { 
      id: docRef.id, 
      ...newTaskData,
      calculationTimestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.status(201).json(createdTask);
  } catch (error) {
    logger.error('Error creating tithing task:', error);
    res.status(500).json({ message: 'Error creating tithing task', error: error.message });
  }
});

app.get('/api/finance-staff', verifyFirebaseToken, async (req, res) => {
  try {
    const requestingUserUid = req.user.uid; // 新增：取得請求者 UID
    const staffQuery = db.collection('users').where('roles', 'array-contains-any', ['finance_staff', 'treasurer']);
    const staffSnapshot = await staffQuery.get();

    if (staffSnapshot.empty) {
      return res.status(200).json([]);
    }

    const staffUids = staffSnapshot.docs
    .map(doc => doc.id)
    .filter(uid => uid !== requestingUserUid); // 修改：過濾掉請求者自己
    
    // ✨ 批次查詢 Firebase Auth
    const userRecordsResult = await admin.auth().getUsers(staffUids.map(uid => ({ uid })));

    // ✨ 建立最終回傳列表，只包含成功找到的使用者
    const staffList = userRecordsResult.users.map(user => ({
      uid: user.uid,
      displayName: user.displayName || user.email || 'N/A',
    }));

    // (可選，但建議) 記錄下哪些 UID 找不到，方便除錯
    if (userRecordsResult.notFound.length > 0) {
        logger.warn('The following UIDs were not found in Firebase Auth:', userRecordsResult.notFound.map(user => user.uid));
    }
    
    res.status(200).json(staffList);

  } catch (error) {
    // 針對非預期的錯誤進行記錄
    logger.error('Error fetching finance staff list:', error);
    res.status(500).json({ message: 'An unexpected error occurred while fetching the staff list.', error: error.message });
  }
});


// =================================================================
// 只有在所有 API 路由都定義完畢後，才匯出 Express app
// =================================================================

export const api = onRequest(app); 
// 新增：可呼叫雲端函式來獲取用戶的 displayName
// Gen 2 syntax for onCall
export const getUserDisplayNameCallable = onCall(async (request) => {
  // 1. 檢查用戶是否已登入
  if (!request.auth) {
    throw new HttpsError( // Use imported HttpsError
      'unauthenticated',
      'Only authenticated users can request their display name.'
    );
  }

  const uid = request.auth.uid; // 從 request.auth 中獲取當前用戶的 UID

  try {
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      throw new HttpsError( // Use imported HttpsError
        'not-found',
        'User profile not found in Firestore.'
      );
    }

    const displayName = userDoc.data().displayName;
    if (!displayName) {
      throw new HttpsError( // Use imported HttpsError
        'not-found',
        'Display name not found for this user.'
      );
    }

    return { displayName: displayName };
  } catch (error) {
    logger.error(`Error fetching display name for UID ${uid}:`, error);
    // 如果是 HttpsError，重新拋出；否則，包裝成 HttpsError
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError( // Use imported HttpsError
      'internal',
      'Failed to retrieve display name.',
      error.message
    );
  }
});

// --- 👇 這是要修改的部分 ---

// 當有新使用者在 Authentication 建立時，自動在 Firestore 中建立 user profile
// Gen 2 syntax for onUserCreate
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
// Gen 2 syntax for onRequest
// You can add options here if needed, e.g., onRequest({region: 'us-central1'}, app)

// New Cloud Function for Tithing Task Aggregation
export const completeTithingTask = onCall(async (request) => {
  // 1. Authentication check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { taskId } = request.data;
  if (!taskId) {
    throw new HttpsError('invalid-argument', 'The function must be called with a "taskId" argument.');
  }

  const taskRef = db.collection('tithe').doc(taskId);
  const dedicationsRef = taskRef.collection('dedications');

  try {
    const taskDoc = await taskRef.get();
    if (!taskDoc.exists) {
      throw new HttpsError('not-found', 'The specified task does not exist.');
    }

    // Optional: Add a role-based check here later if needed
    // For now, we assume the frontend logic prevents unauthorized calls.

    const dedicationsSnapshot = await dedicationsRef.get();
    if (dedicationsSnapshot.empty) {
      logger.info(`No dedications found for task ${taskId}. Marking as complete with zero amounts.`);
    }

    const summary = {
      totalAmount: 0,
      byCategory: {},
    };

    dedicationsSnapshot.forEach(doc => {
      const { amount, dedicationCategory } = doc.data();
      if (typeof amount === 'number' && dedicationCategory) {
        summary.totalAmount += amount;
        summary.byCategory[dedicationCategory] = (summary.byCategory[dedicationCategory] || 0) + amount;
      }
    });

    await taskRef.update({
      summary: summary,
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.log(`Task ${taskId} has been successfully completed and aggregated.`);
    return { success: true, summary };

  } catch (error) {
    logger.error(`Error completing tithing task ${taskId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'An unexpected error occurred while completing the task.');
  }
});
