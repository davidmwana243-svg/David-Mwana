import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.error('Could not load firebase-applet-config.json', e);
}

const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

export function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        console.log('Firebase Admin initialized with explicit credentials.');
      } else if (projectId) {
        admin.initializeApp({ projectId });
        console.log('Firebase Admin initialized with projectId (relying on ADC).');
      } else {
        console.warn('Firebase Admin credentials missing. Skipping Firebase Admin initialization.');
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
    }
  }
}

import { getFirestore } from 'firebase-admin/firestore';

export function getDb() {
  if (admin.apps.length > 0) {
    const dbId = firebaseConfig.firestoreDatabaseId;
    return dbId ? getFirestore(admin.app(), dbId) : getFirestore(admin.app());
  }
  throw new Error('Firebase Admin is not initialized');
}

export const adminDb = admin.apps.length > 0 ? getDb() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
