import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { env } from './env';
import { registerRoutes } from './routes';
import { logger } from './common/logger';
import { isAppError, AppError } from './common/errors';
import { db } from './db';

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// CORS - Allow same-origin by default, configure if needed
if (env.NODE_ENV === 'development') {
  app.use(cors());
} else {
  // In production, only allow same-origin
  app.use(cors({
    origin: false, // Disable CORS (same-origin only)
  }));
}

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to sensitive endpoints
app.use('/pay', paymentLimiter);
app.use('/vouchers/validate', paymentLimiter);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  
  next();
});

// API routes
registerRoutes(app);

// Serve static frontend files
const frontendPath = path.resolve(__dirname, '../../frontend/public');
app.use(express.static(frontendPath));

// SPA fallback - serve index.html for non-API routes
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api') || req.path.startsWith('/admin')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error', {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
  
  if (isAppError(err)) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(err instanceof (await import('./common/errors')).ValidationError && {
        details: err.details,
      }),
    });
    return;
  }
  
  // Unknown error
  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  await db.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`Server started`, {
    port: PORT,
    env: env.NODE_ENV,
    frontendPath,
  });
});

export default app;
