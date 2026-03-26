import { Router } from 'express';

import * as paymentController from '../controllers/paymentController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { isCustomer } from '../middleware/roleMiddleware.js';

const router = Router();

// All payment routes require login
router.use(authMiddleware);

// POST /api/payment/create-order
router.post('/create-order',
   isCustomer,
   paymentController.createPaymentOrder
);

// POST /api/payment/verify
router.post('/verify',
   isCustomer,
   paymentController.verifyPayment
);

// GET /api/payment/history
router.get('/history',
   isCustomer,
   paymentController.getPaymentHistory
);

export default router;
