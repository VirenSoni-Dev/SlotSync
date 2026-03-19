import { Router } from 'express';

import * as slotController from '../controllers/slotController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { isAdmin } from '../middleware/roleMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { generateSlotsSchema, blockSlotSchema } from '../validations/slotValidation.js';

const router = Router();

// ── Public ──

// GET /api/slots?date=2025-02-10
// Customer sees available slots for a date
router.get('/', slotController.getAvailableSlots);

// ── Admin only ──

// GET /api/slots/admin?date=2025-02-10
// Admin sees ALL slots for a date
router.get('/admin',
   authMiddleware,
   isAdmin,
   slotController.getAllSlotsByDate
);

// POST /api/slots/generate
// Admin generates slots from a time range
router.post('/generate',
   authMiddleware,
   isAdmin,
   validate(generateSlotsSchema),
   slotController.generateAndInsertSlots
);

// POST /api/slots/block
// Admin blocks a specific slot
router.post('/block',
   authMiddleware,
   isAdmin,
   validate(blockSlotSchema),
   slotController.blockSlot
);

// DELETE /api/slots/:id
// Admin deletes a slot (only if no bookings)
router.delete('/:id',
   authMiddleware,
   isAdmin,
   slotController.deleteSlot
);

export default router;
