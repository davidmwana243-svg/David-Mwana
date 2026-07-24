import { initializeFirebaseAdmin, getDb } from './server/firebase/index.js';
initializeFirebaseAdmin();
const db = getDb();
async function run() {
  const snap = await db.collection('orders').limit(10).get();
  snap.forEach(doc => console.log(doc.id, doc.data().status));
}
run();
