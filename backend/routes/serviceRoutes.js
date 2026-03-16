import { Router } from 'express';
import * as serviceController from '../controllers/serviceController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';

const router = Router();

// ── Public routes ──

// GET /api/services
router.get('/', serviceController.getAllServices);

// GET /api/services/:id
router.get('/:id', serviceController.getServiceById);

// ── Admin only routes ──

// POST /api/services
router.post('/', authMiddleware, isAdmin, serviceController.createService);

// PUT /api/services/:id
router.put('/:id', authMiddleware, isAdmin, serviceController.updateService);

// DELETE /api/services/:id
router.delete('/:id', authMiddleware, isAdmin, serviceController.deleteService);

export default router;
