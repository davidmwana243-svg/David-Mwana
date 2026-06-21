import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { errorHandler } from './server/middleware/errorHandler';
import { initializeFirebaseAdmin } from './server/firebase/index';
import { startNotificationListeners } from './server/services/notificationService';
import authRoutes from './server/routes/authRoutes';
import orderRoutes from './server/routes/orderRoutes';
import aiRoutes from './server/routes/aiRoutes';
import uploadRoutes from './server/routes/uploadRoutes';
import paymentRoutes from './server/routes/paymentRoutes';

export async function createApp() {
  const app = express();

  // Trust front-facing proxies (Cloud Run GFE) to ensure req.protocol is correctly 'https'
  app.set('trust proxy', true);

  // Initialize Firebase Admin SDK
  initializeFirebaseAdmin();

  // Start background FCM Firestore triggers
  startNotificationListeners();

  // Basic middleware
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
  });
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(morgan('dev'));

  // Static uploads directory serving
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Backend API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/payment', paymentRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'API is running' });
  });

  // Example Protected Route placeholder
  // app.get('/api/protected', authMiddleware, (req, res) => { ... });

  // Error Handler Middleware
  app.use(errorHandler);

  // Vite middleware for development (Frontend integration)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}
