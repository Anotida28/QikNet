import { Router } from 'express';
import { paymentsRoutes } from './modules/payments/payments.routes';
import { vouchersRoutes } from './modules/vouchers/vouchers.routes';
import { adminRoutes } from './modules/admin/admin.routes';

export function registerRoutes(app: Router): void {
  // Public routes
  app.use(paymentsRoutes);
  app.use(vouchersRoutes);
  
  // Admin routes (protected by X-Admin-Key header)
  app.use('/admin', adminRoutes);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
