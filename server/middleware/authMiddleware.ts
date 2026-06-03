import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // First try to verify with Firebase Admin
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      (req as any).user = decodedToken;
      return next();
    } catch (firebaseError: any) {
      // If Firebase verification fails, try custom JWT if applicable
      try {
        const decodedUser = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        (req as any).user = decodedUser;
        return next();
      } catch (jwtError) {
        console.error('Firebase Token error:', firebaseError);
        console.error('JWT verification error:', jwtError);
        return res.status(403).json({ message: 'Invalid or expired token', error: firebaseError.message });
      }
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  // Check custom claim in Firebase or role in custom JWT
  if (user && (user.admin === true || user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Unauthorized: Admin access required' });
  }
};
