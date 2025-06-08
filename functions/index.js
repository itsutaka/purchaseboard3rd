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

    if (doc.data().userId !== req.user.uid) {
      return res.status(403).json({ message: 'Forbidden. You can only update your own requirements.' });
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


// GET /api/requirements (Read All)
app.get('/api/requirements', async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').orderBy('createdAt', 'desc').get();
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
    res.status(200).json(requirements);
  } catch (error) {
    functions.logger.error('Critical error fetching requirements list:', error);
    res.status(500).json({ message: 'Critical error fetching requirements list', error: error.message });
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
