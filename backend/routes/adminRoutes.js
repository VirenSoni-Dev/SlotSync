import { Router } from 'express';

import * as adminController from '../controllers/adminController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

// Apply both middlewares to entire router at once
router.use(authMiddleware);
router.use(isAdmin);

// GET /api/admin/analytics
router.get('/analytics', adminController.getAnalytics);

// GET /api/admin/peak-hours
router.get('/peak-hours', adminController.getPeakHours);

// GET /api/admin/popular-services
router.get('/popular-services', adminController.getPopularServices);

// GET /api/admin/recent-bookings
router.get('/recent-bookings', adminController.getRecentBookings);

// GET /api/admin/revenue-by-day
router.get('/revenue-by-day', adminController.getRevenueByDay);

export default router;
