import 'dotenv/config';
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
import productRoutes from './server/routes/productRoutes';
import cartRoutes from './server/routes/cartRoutes';
import trackingRoutes from './server/routes/trackingRoutes';
import notificationRoutes from './server/routes/notificationRoutes';
import telegramRoutes from './server/routes/telegramRoutes';
import { handleCallback } from './server/controllers/paymentController';
import { setLastKnownHostUrl } from './server/utils/hostStore';

export async function createApp() {
  const app = express();

  // Trust front-facing proxies (Cloud Run GFE) to ensure req.protocol is correctly 'https'
  app.set('trust proxy', true);

  // Initialize Firebase Admin SDK
  initializeFirebaseAdmin();

  // Start background FCM Firestore triggers
  startNotificationListeners();

  // Start Telegram Bot Daemon
  try {
    const { startTelegramBot } = await import('./telegram/bot');
    startTelegramBot();
  } catch (err) {
    console.error('❌ [TG BOT] Failed to auto-start Telegram Bot:', err);
  }

  // Basic middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(morgan('dev'));

  // Capture real active host URL dynamically for payment gateway callback routing
  app.use((req, res, next) => {
    const host = req.get('host');
    if (host) {
      const url = `${req.protocol}://${host}`;
      setLastKnownHostUrl(url).catch(err => {
        console.error('[APP] Error saving last known host URL:', err);
      });
    }
    next();
  });

  // Static uploads directory serving
  app.use('/uploads', express.static(path.join('/tmp', 'uploads')));

  // Backend API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/tracking', trackingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/telegram', telegramRoutes);
  app.post('/api/shwary/webhook', handleCallback);

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
