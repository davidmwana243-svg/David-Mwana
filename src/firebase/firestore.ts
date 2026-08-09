import { initializeFirestore, persistentLocalCache, memoryLocalCache, getFirestore, Firestore } from 'firebase/firestore';
import { app, firebaseConfig } from './firebaseConfig';

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache(),
      ignoreUndefinedProperties: true,
    }, (firebaseConfig as any).firestoreDatabaseId);
  } catch (e1) {
    console.warn("Persistent cache failed, trying memory cache:", e1);
    try {
      return initializeFirestore(app, {
        localCache: memoryLocalCache(),
        ignoreUndefinedProperties: true,
      }, (firebaseConfig as any).firestoreDatabaseId);
    } catch (e2) {
      console.warn("initializeFirestore failed, using default getFirestore:", e2);
      return getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
    }
  }
}

export const db = createFirestoreInstance();

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
