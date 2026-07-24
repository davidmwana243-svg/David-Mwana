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

function cleanEnvValue(value: string | undefined): string | undefined {
  if (!value) return value;
  let v = value.trim();
  if (v.endsWith(',')) {
    v = v.slice(0, -1).trim();
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

const projectId = cleanEnvValue(process.env.FIREBASE_PROJECT_ID) || firebaseConfig.projectId;
const clientEmail = cleanEnvValue(process.env.FIREBASE_CLIENT_EMAIL);

// Robustly parse the private key to handle wrapping quotes, escaped characters and newlines
let privateKey = cleanEnvValue(process.env.FIREBASE_PRIVATE_KEY);
if (privateKey) {
  // Replace double-escaped literal \n sequences with actual newline characters
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // Fix French translation of PEM headers/footers resulting from auto-translate tools
  privateKey = privateKey
    .replace(/-----DEBUT PRIVÉ CLÉ-----/i, '-----BEGIN PRIVATE KEY-----')
    .replace(/-----DEBUT DE LA CLÉ PRIVÉE-----/i, '-----BEGIN PRIVATE KEY-----')
    .replace(/-----DEBUT DE LA CLE PRIVEE-----/i, '-----BEGIN PRIVATE KEY-----')
    .replace(/-----DEBUT DE CLÉ PRIVÉE-----/i, '-----BEGIN PRIVATE KEY-----')
    .replace(/-----DEBUT DE CLE PRIVEE-----/i, '-----BEGIN PRIVATE KEY-----')
    .replace(/-----DEBUT CLÉ PRIVÉE-----/i, '-----BEGIN PRIVATE KEY-----')
    .replace(/-----DEBUT CLE PRIVEE-----/i, '-----BEGIN PRIVATE KEY-----');

  privateKey = privateKey
    .replace(/-----FIN DE LA CLÉ PRIVÉE-----/i, '-----END PRIVATE KEY-----')
    .replace(/-----FIN DE LA CLE PRIVEE-----/i, '-----END PRIVATE KEY-----')
    .replace(/-----FIN CLÉ PRIVÉE-----/i, '-----END PRIVATE KEY-----')
    .replace(/-----FIN CLE PRIVEE-----/i, '-----END PRIVATE KEY-----')
    .replace(/-----FIN DE CLÉ PRIVÉE-----/i, '-----END PRIVATE KEY-----')
    .replace(/-----FIN DE CLE PRIVEE-----/i, '-----END PRIVATE KEY-----');
  
  // Make sure newlines are fully resolved if they were double-escaped inside quotes
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (clientEmail && (clientEmail.includes('require') || clientEmail.includes('admin.initializeApp'))) {
  console.error('\n⚠️ [FIREBASE ADMIN ERROR] FIREBASE_CLIENT_EMAIL contains Node.js code instead of a valid email!');
  console.error('Please change your FIREBASE_CLIENT_EMAIL environment variable in your Settings.');
  console.error('It should be the service account email (e.g. firebase-adminsdk-xxxxx@gen-lang-client-0356564841.iam.gserviceaccount.com) found in your serviceAccountKey.json.\n');
}

export let adminDb: ReturnType<typeof getDb> | null = null;
export let adminAuth: admin.auth.Auth | null = null;

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
        console.log('Firebase Admin initialized successfully with explicit credentials.');
      } else if (projectId) {
        admin.initializeApp({ projectId });
        console.log('Firebase Admin initialized with projectId (relying on Application Default Credentials).');
      } else {
        console.warn('Firebase Admin credentials missing (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY is unconfigured). Skipping initialization.');
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
    }
  }

  if (admin.apps.length > 0) {
    try {
      adminDb = getDb();
      adminAuth = admin.auth();
    } catch (e) {
      console.error('Could not obtain live references for adminDb/adminAuth:', e);
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

