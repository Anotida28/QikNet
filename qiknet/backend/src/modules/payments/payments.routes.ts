import { Router, Request, Response, NextFunction } from 'express';
import * as paymentsService from './payments.service';
import { isAppError } from '../../common/errors';

const router = Router();

/**
 * POST /pay
 * Initiate EcoCash payment.
 */
router.post('/pay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await paymentsService.initiatePayment(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /payments/:reference
 * Check payment status.
 */
router.get('/payments/:reference', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await paymentsService.getPaymentStatus(req.params.reference);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export const paymentsRoutes = router;
