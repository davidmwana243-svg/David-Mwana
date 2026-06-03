import { Router } from 'express';
import { initiatePayment, handleCallback } from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', verifyToken, initiatePayment);
router.post('', verifyToken, initiatePayment);
router.post('/callback', handleCallback);

export default router;
