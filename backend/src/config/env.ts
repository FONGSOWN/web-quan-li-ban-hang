import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'quanlybanhang_jwt_secret_dev_key_2026_secure_hash',
  jwtExpiresIn: '7d',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASSWORD || 'change_me_local_only',
    database: process.env.DB_NAME || 'quanlybanhang',
    connectionLimit: 15,
  },
  isDev: process.env.NODE_ENV !== 'production',
};

