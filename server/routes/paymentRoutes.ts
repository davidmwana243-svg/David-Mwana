import { Router } from 'express';
import { initiatePayment, handleCallback } from '../controllers/paymentController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/', verifyToken, initiatePayment);
router.post('', verifyToken, initiatePayment);
router.post('/callback', handleCallback);

export default router;
