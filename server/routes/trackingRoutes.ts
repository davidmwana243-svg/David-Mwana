import express from 'express';
import { getOrderTracking } from '../controllers/trackingController';

const router = express.Router();

router.get('/:orderId', getOrderTracking);

export default router;
