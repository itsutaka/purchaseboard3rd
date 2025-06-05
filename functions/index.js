import express from 'express';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize firebase-admin
admin.initializeApp();
const db = admin.firestore();

const app = express();

// Middleware for parsing JSON request bodies
app.use(express.json());

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
    req.user = decodedToken; // Add decoded token to request object
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
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }
    // Add user UID to the requirement to associate it with the user
    const newRequirement = {
      text,
      status: 'pending', // Default status
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: req.user.uid, // Associate with the authenticated user
    };
    const docRef = await db.collection('requirements').add(newRequirement);
    // For the response, convert serverTimestamp to a client-friendly format immediately
    const createdData = {
        id: docRef.id,
        text: newRequirement.text,
        status: newRequirement.status,
        userId: newRequirement.userId,
        createdAt: new Date().toISOString() // Approximate for immediate client use
    };
    res.status(201).json(createdData);
  } catch (error) {
    functions.logger.error('Error creating requirement:', error, { structuredData: true });
    res.status(500).json({ message: 'Error creating requirement', error: error.message });
  }
});

// GET /api/requirements (Read All) - Public for now
app.get('/api/requirements', async (req, res) => {
  try {
    const snapshot = await db.collection('requirements').orderBy('createdAt', 'desc').get();
    const requirements = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      requirements.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
      });
    });
    res.status(200).json(requirements);
  } catch (error) {
    functions.logger.error('Error fetching requirements:', error);
    res.status(500).json({ message: 'Error fetching requirements', error: error.message });
  }
});

// GET /api/requirements/:id (Read One) - Public for now
app.get('/api/requirements/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('requirements').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'Requirement not found' });
    }
    const data = doc.data();
    res.status(200).json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    });
  } catch (error) {
    functions.logger.error('Error fetching requirement:', error);
    res.status(500).json({ message: 'Error fetching requirement', error: error.message });
  }
});

// Export the Express app as an HTTP function
export const api = functions.https.onRequest(app);
