import { Router } from 'express';
import { 
  register, 
  login, 
  adminLogin, 
  resetPassword, 
  verifyTokenStatus,
  deleteCustomer
} from '../controllers/authController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/verify', verifyToken, verifyTokenStatus);
router.post('/delete-user/:uid', verifyToken, isAdmin, deleteCustomer);
router.get('/admin-only', verifyToken, isAdmin, (req, res) => {
  res.json({ message: 'Welcome, Admin!' });
});

export default router;
