import { Router, Request, Response, NextFunction } from 'express';
import * as vouchersService from './vouchers.service';

const router = Router();

/**
 * POST /vouchers/validate
 * Validate a voucher code (for captive portal).
 */
router.post('/vouchers/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await vouchersService.validateVoucher(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export const vouchersRoutes = router;
