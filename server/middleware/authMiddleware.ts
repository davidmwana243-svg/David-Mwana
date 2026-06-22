import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[AuthMiddleware] No token provided in headers');
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // First try to verify with Firebase Admin
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      (req as any).user = decodedToken;
      console.log('[AuthMiddleware] Token verified via Firebase for:', decodedToken.email);
      return next();
    } catch (firebaseError: any) {
      // If Firebase verification fails, try custom JWT if applicable
      try {
        const decodedUser = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        (req as any).user = decodedUser;
        console.log('[AuthMiddleware] Token verified via JWT for:', (decodedUser as any).email);
        return next();
      } catch (jwtError) {
        console.error('[AuthMiddleware] Firebase Token error:', firebaseError.message);
        console.error('[AuthMiddleware] JWT verification error:', (jwtError as any).message);
        return res.status(403).json({ message: 'Invalid or expired token', error: firebaseError.message });
      }
    }
  } catch (error: any) {
    console.error('[AuthMiddleware] Token verification exception:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  console.log('[AuthMiddleware] Checking admin status for user:', user?.email);

  // Check custom claim in Firebase or role in custom JWT
  // Fallback: also check authorized admin emails if claims are missing
  const authorizedAdmins = [
    'davstore4@gmail.com', 
    'davidmwana243@gmail.com', 
    'davidmwana243@gmail.com',
    '0995289355@davidstore.com'
  ];
  
  const isAuthorizedEmail = authorizedAdmins.some(email => 
    email?.toLowerCase() === user?.email?.toLowerCase() || 
    email?.toLowerCase() === (user?.email || '').toLowerCase()
  );

  if (user && (user.admin === true || user.role === 'admin' || isAuthorizedEmail)) {
    console.log('[AuthMiddleware] Admin access granted to:', user?.email);
    next();
  } else {
    console.warn('[AuthMiddleware] Admin access DENIED to:', user?.email || 'Unknown');
    res.status(403).json({ message: 'Unauthorized: Admin access required' });
  }
};
