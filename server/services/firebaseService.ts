import { adminDb, adminAuth, getDb } from '../config/firebaseAdmin';

export const getFirestoreDb = () => {
  return adminDb || getDb();
};

export const getFirebaseAuth = () => {
  return adminAuth;
};
