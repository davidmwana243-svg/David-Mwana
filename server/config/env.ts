import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  APP_URL: process.env.APP_URL || 'https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-flash-latest',
  SHWARY_API_KEY: process.env.SHWARY_API_KEY || process.env.SHWARY_SECRET || '',
  SHWARY_SITE_ID: process.env.SHWARY_SITE_ID || '',
  SHWARY_MERCHANT_KEY: process.env.SHWARY_MERCHANT_KEY || '',
  SHWARY_MERCHANT_ID: process.env.SHWARY_MERCHANT_ID || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
};
