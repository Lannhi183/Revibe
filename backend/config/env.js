import dotenv from 'dotenv';
dotenv.config();

export const env = {
  // ================================
  // APPLICATION CONFIGURATION
  // ================================
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV === 'development',

  // ================================
  // DATABASE CONFIGURATION
  // ================================
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/revibe',

  // ================================
  // SMTP EMAIL CONFIGURATION
  // ================================
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  MAIL_FROM: process.env.MAIL_FROM || 'no-reply@revibe.vn',

  // ================================
  // JWT AUTHENTICATION
  // ================================
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'default-access-secret-key',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-key',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || '15m',
  JWT_REFRESH_TTL: process.env.JWT_REFRESH_TTL || '7d',

  // ================================
  // OTP CONFIGURATION
  // ================================
  OTP_TTL_MS: Number(process.env.OTP_TTL_MS || 10 * 60 * 1000), // 10 minutes
  REFRESH_TTL_DAYS: Number(process.env.REFRESH_TTL_DAYS || 7),

  // ================================
  // RATE LIMITING
  // ================================
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 5),

  // ================================
  // CORS CONFIGURATION
  // ================================
  CORS_ORIGIN: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS === 'true',

  // ================================
  // FILE UPLOAD CONFIGURATION
  // ================================
  MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024), // 5MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
};