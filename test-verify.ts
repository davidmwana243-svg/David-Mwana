import 'dotenv/config';
import { initializeFirebaseAdmin } from './server/firebase/index.js';
import admin from 'firebase-admin';

async function run() {
  initializeFirebaseAdmin();
  const user = await admin.auth().getUserByEmail('davidmwana243@gmail.com');
  console.log(user);
}
run();
