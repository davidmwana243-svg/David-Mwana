import express from 'express';
import { handleTelegramWebhook } from '../controllers/telegramController';

const router = express.Router();

router.post('/webhook', handleTelegramWebhook);

export default router;
