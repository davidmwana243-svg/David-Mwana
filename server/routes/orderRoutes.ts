import { Router } from 'express';
import { 
  createOrder, 
  getUserOrders, 
  getOrderById, 
  getAllOrders, 
  updateOrderStatus, 
  cancelOrder 
} from '../controllers/orderController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Protected routes (User)
router.post('/', verifyToken, createOrder);
router.get('/my-orders', verifyToken, getUserOrders);
router.get('/:id', verifyToken, getOrderById);
router.patch('/:id/cancel', verifyToken, cancelOrder);

// Admin routes
router.get('/admin/all', verifyToken, isAdmin, getAllOrders);
router.patch('/admin/:id/status', verifyToken, isAdmin, updateOrderStatus);

export default router;
