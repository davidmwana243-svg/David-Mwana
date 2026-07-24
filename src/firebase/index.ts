import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, memoryLocalCache, getFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// @ts-ignore - The file is generated dynamically
import firebaseConfig from '../../firebase-applet-config.json';

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache(),
      ignoreUndefinedProperties: true,
    }, firebaseConfig.firestoreDatabaseId);
  } catch (e1) {
    console.warn("Persistent cache failed, trying memory cache:", e1);
    try {
      return initializeFirestore(app, {
        localCache: memoryLocalCache(),
        ignoreUndefinedProperties: true,
      }, firebaseConfig.firestoreDatabaseId);
    } catch (e2) {
      console.warn("initializeFirestore failed, using default getFirestore:", e2);
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
}

export const db = createFirestoreInstance();
export const storage = getStorage(app);

// Connection test helper for diagnostics
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const { doc, getDocFromServer } = await import('firebase/firestore');
    const testDocRef = doc(db, '_connection_test', 'test');
    await getDocFromServer(testDocRef);
    return true;
  } catch (e) {
    console.warn('Firestore connection test warning:', e);
    return false;
  }
}
