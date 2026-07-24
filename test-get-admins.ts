import { initializeFirebaseAdmin, getDb } from './server/firebase/index.js';
initializeFirebaseAdmin();
const db = getDb();
async function run() {
  const users = await db.collection('users').get();
  users.forEach(doc => {
    const data = doc.data();
    if (
      data.phone?.includes('995289355') || 
      data.email?.includes('davidmwana') ||
      doc.id === 'tg_8603660651'
    ) {
      console.log('User:', doc.id, data.email, data.phone);
    }
  });
}
run();
