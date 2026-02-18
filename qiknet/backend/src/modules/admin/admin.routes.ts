import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../../env';
import { UnauthorizedError } from '../../common/errors';
import * as adminService from './admin.service';

const router = Router();

/**
 * Admin authentication middleware.
 * Requires X-Admin-Key header with matching ADMIN_API_KEY.
 */
function adminAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-admin-key'];
  
  if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
    return next(new UnauthorizedError('Invalid or missing admin key'));
  }
  
  next();
}

// Apply auth to all admin routes
router.use(adminAuth);

/**
 * GET /admin/stats
 * Get system statistics.
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/payments
 * List payments with optional filters.
 */
router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await adminService.listPayments({
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/vouchers
 * List vouchers with optional filters.
 */
router.get('/vouchers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, limit, offset } = req.query;
    const result = await adminService.listVouchers({
      status: status as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/vouchers/:code/revoke
 * Revoke a voucher.
 */
router.post('/vouchers/:code/revoke', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const voucher = await adminService.revokeVoucher(req.params.code);
    res.json({ success: true, data: voucher });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/maintenance
 * Run maintenance tasks (mark expired vouchers, etc).
 */
router.post('/maintenance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.runMaintenance();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export const adminRoutes = router;
