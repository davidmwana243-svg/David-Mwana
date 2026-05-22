import admin from 'firebase-admin';

// Load from environment variables instead of hard-coding
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Handle escaped newlines in env vars

export function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    if (!projectId || !clientEmail || !privateKey) {
      console.warn('Firebase Admin credentials missing. Skipping Firebase Admin initialization.');
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin initialized successfully.');
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
    }
  }
}

export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
