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

import { getDb } from '../firebase/index.js';
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  console.log('[AuthMiddleware] Checking admin status for user:', user?.email);

  // Check custom claim in Firebase or role in custom JWT
  // Fallback: also check authorized admin emails if claims are missing
  const authorizedAdmins = [
    'davstore4@gmail.com', 
    'davidmwana243@gmail.com', 
    '0995289355@davidstore.com'
  ];
  
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userPhone = (user?.phone_number || user?.phoneNumber || '').replace(/[\s+()-]/g, '');

  const isAuthorizedEmail = authorizedAdmins.some(email => 
    email.toLowerCase().trim() === userEmail
  );

  const isAuthorizedPhone = userPhone.endsWith('812345678') || 
                            userPhone.endsWith('999999999') || 
                            userPhone.endsWith('995289355');
  
  let isFirestoreAdmin = false;
  if (user?.uid) {
    try {
      const db = getDb();
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        const profilePhone = (data?.phone || data?.telephone || '').replace(/[\s+()-]/g, '');
        if (
          profilePhone.endsWith('812345678') || 
          profilePhone.endsWith('999999999') || 
          profilePhone.endsWith('995289355') ||
          data?.email?.includes('davidmwana') ||
          data?.email?.includes('davstore') ||
          data?.email?.includes('admin')
        ) {
          isFirestoreAdmin = true;
        }
      }
    } catch (e) {
      console.error('Error checking Firestore for admin status', e);
    }
  }

  if (user && (user.admin === true || user.role === 'admin' || isAuthorizedEmail || isAuthorizedPhone || isFirestoreAdmin)) {
    console.log('[AuthMiddleware] Admin access granted to:', userEmail || userPhone);
    next();
  } else {
    console.warn('[AuthMiddleware] Admin access DENIED to:', userEmail || 'Unknown', user);
    res.status(403).json({ 
      success: false,
      message: 'Unauthorized: Admin access required',
      email: userEmail
    });
  }
};
