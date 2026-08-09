import express from 'express';
import { getCart, updateCart } from '../controllers/cartController';

const router = express.Router();

router.get('/', getCart);
router.post('/update', updateCart);

export default router;
