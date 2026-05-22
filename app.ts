import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import { errorHandler } from './server/middleware/errorHandler.js';
import { initializeFirebaseAdmin } from './server/firebase/index.js';
import authRoutes from './server/routes/authRoutes.js';
import orderRoutes from './server/routes/orderRoutes.js';

export async function createApp() {
  const app = express();

  // Initialize Firebase Admin SDK
  initializeFirebaseAdmin();

  // Basic middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // Backend API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', orderRoutes);

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
