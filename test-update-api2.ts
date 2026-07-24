import 'dotenv/config';
import { updateOrderStatus } from './server/controllers/orderController.js';
import { initializeFirebaseAdmin, getDb } from './server/firebase/index.js';

initializeFirebaseAdmin();

const req = {
  params: { id: 'DS-380420' },
  body: { status: 'shipped' },
  user: { email: 'davidmwana243@gmail.com', admin: true }
} as any;

const res = {
  status: (code: number) => {
    console.log('Status:', code);
    return res;
  },
  json: (data: any) => {
    console.log('JSON:', data);
  }
} as any;

async function run() {
  await updateOrderStatus(req, res);
}

run();
