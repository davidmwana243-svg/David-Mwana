import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const app = initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
});

const auth = getAuth(app);

async function run() {
  try {
    const cred = await signInWithEmailAndPassword(auth, 'davidmwana243@gmail.com', '123456');
    const token = await cred.user.getIdToken();
    
    const res = await fetch('http://localhost:3000/api/orders/admin/DS-380420/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'processing' })
    });
    
    console.log('Status:', res.status);
    console.log('Body:', await res.text());
  } catch(e) {
    console.error(e);
  }
}
run();
