import cors from 'cors';

export const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-merchant-key', 'x-merchant-id', 'x-site-id'],
};

export const corsMiddleware = cors(corsOptions);
