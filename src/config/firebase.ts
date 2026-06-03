import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// @ts-ignore - The file is generated dynamically
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialisation avec cache persistent hors-ligne multi-onglets activé par défaut
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app);

// Connection test helper for diagnostics
export async function testFirestoreConnection() {
  try {
    // Try to get a non-existent doc from server to verify connectivity
    await getDocFromServer(doc(db, 'system', 'connection-test'));
    console.log("Firestore connection verified.");
    return true;
  } catch (error: any) {
    console.error("Firestore connectivity check failed:", error.message);
    return false;
  }
}
