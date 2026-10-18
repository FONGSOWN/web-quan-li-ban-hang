import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Security & CORS
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root health check
app.get('/', (_req, res) => {
  res.json({
    name: 'QuanLyBanHang API Server',
    status: 'running',
    docs: '/api/health',
  });
});

// API Routes
app.use('/api', apiRouter);

// 404 handler for undefined API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint API không tồn tại.',
  });
});

// Centralized Error Handler
app.use(errorHandler);

