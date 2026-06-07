import { Request, Response } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { validateEmail, validatePassword } from '../utils/validation.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

export const register = async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || '',
    });

    res.status(201).json({
      message: 'User registered successfully',
      uid: userRecord.uid,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Error creating user' });
  }
};

/**
 * Note: Login is typically handled on the client-side with Firebase Client SDK.
 * This server-side login endpoint can be used to issue custom JWTs if needed,
 * or verify a token from the client and return extra info.
 */
export const login = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'ID Token is required' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // You could issue a custom JWT here if you want to bypass Firebase for subsequent requests
    const token = jwt.sign(
      { uid: decodedToken.uid, email: decodedToken.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: decodedToken,
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const adminLogin = async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: 'ID Token is required' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check if user has admin privileges (e.g., specific email or custom claim)
    // For this example, we'll check if the email is one of the admin emails
    const authorizedAdmins = ['davstore4@gmail.com', 'davidmwana243@gmail.com'];
    const isAdmin = authorizedAdmins.includes(decodedToken.email || '');

    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied: Not an administrator' });
    }

    // Set custom claim for persistent admin status in Firebase
    await admin.auth().setCustomUserClaims(decodedToken.uid, { admin: true });

    const token = jwt.sign(
      { uid: decodedToken.uid, email: decodedToken.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Admin login successful',
      token,
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    
    // In a real app, you would send this link via email (using e.g., Resend or SendGrid)
    // For now, we return it for testing
    console.log('Password reset link:', link);

    res.json({
      message: 'Password reset link generated',
      // link: link // Usually you don't return the link to the client for security
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: error.message || 'Error generating reset link' });
  }
};

export const verifyTokenStatus = async (req: Request, res: Response) => {
  // Middleware should have already verified the token
  res.json({
    valid: true,
    user: (req as any).user,
  });
};

import { getDb } from '../firebase/index.js';

export const deleteCustomer = async (req: Request, res: Response) => {
  const { uid } = req.params;

  if (!uid) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    console.log(`[Admin/Delete] Début de la suppression pour l'UID: ${uid}`);

    // 1. Delete user from Firebase Auth
    let authDeleted = false;
    try {
      await admin.auth().deleteUser(uid);
      console.log(`[Admin/Delete] Deleted user ${uid} from Firebase Auth`);
      authDeleted = true;
    } catch (authError: any) {
      console.warn(`[Admin/Delete] Warning: User auth account not found or error: ${authError.message}`);
    }

    // 2. Delete user document from Firestore (users collection)
    const db = getDb();
    await db.collection('users').doc(uid).delete();
    console.log(`[Admin/Delete] Deleted user doc ${uid} from Firestore`);

    const responsePayload = {
      success: true,
      message: 'Utilisateur supprimé définitivement avec succès.',
      authDeleted
    };
    
    console.log(`[Admin/Delete] Réponse renvoyée au client:`, JSON.stringify(responsePayload));
    res.json(responsePayload);
  } catch (error: any) {
    console.error(`[Admin/Delete] Error deleting customer ${uid}:`, error);
    const errorPayload = { message: error.message || 'Error deleting user' };
    console.log(`[Admin/Delete] Réponse d'erreur renvoyée au client:`, JSON.stringify(errorPayload));
    res.status(500).json(errorPayload);
  }
};

