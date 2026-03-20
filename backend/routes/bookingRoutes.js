import { Router } from 'express';

import * as bookingController from '../controllers/bookingController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { isAdmin, isCustomer } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import * as bookingValidation from '../validations/bookingValidation.js';

const router = Router();

router.use(authMiddleware);

// ── Customer only ──

// POST /api/bookings
router.post('/',
   isCustomer,
   validate(bookingValidation.createBookingSchema),
   bookingController.createBooking
);

// GET /api/bookings/my
router.get('/my',
   isCustomer,
   bookingController.getMyBookings
);

// PUT /api/bookings/:id/cancel
// Both customer and admin can cancel
// Controller handles the role check internally
router.put('/:id/cancel',
   validate(bookingValidation.cancelBookingSchema),
   bookingController.cancelBooking
);

// PUT /api/bookings/:id/reschedule
router.put('/:id/reschedule',
   isCustomer,
   validate(bookingValidation.rescheduleBookingSchema),
   bookingController.rescheduleBooking
);

// ── Both roles ──

// GET /api/bookings/:id
// Customer sees own, admin sees any
// Controller handles the role check internally
router.get('/:id',
   bookingController.getBookingById
);

// ── Admin only ──

// GET /api/bookings/all
router.get('/all',
   isAdmin,
   bookingController.getAllBookings
);

export default router;
