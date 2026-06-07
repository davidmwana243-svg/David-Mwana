import 'dotenv/config';
import { getDb, initializeFirebaseAdmin } from './server/firebase/index.ts';

async function count() {
  try {
    initializeFirebaseAdmin();
    const db = getDb();
    const snapshot = await db.collection('users').get();
    console.log(`TOTAL_USERS: ${snapshot.size}`);
  } catch (e) {
    console.log("Error:", e);
  }
  process.exit(0);
}
count();
