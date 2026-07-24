import { Router } from 'express';
import { 
  register, 
  login, 
  adminLogin, 
  resetPassword, 
  verifyTokenStatus,
  deleteCustomer
} from '../controllers/authController';
import { verifyToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/verify', verifyToken, verifyTokenStatus);
router.post('/remove-client/:uid', verifyToken, isAdmin, deleteCustomer);
router.delete('/customers/:uid', verifyToken, isAdmin, deleteCustomer);
router.get('/admin-only', verifyToken, isAdmin, (req, res) => {
  res.json({ message: 'Welcome, Admin!' });
});

export default router;
