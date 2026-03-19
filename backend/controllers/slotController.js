import * as slotModel from '../models/slotModel.js';
import { generateSlots } from '../utils/slotGenerator.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// ============================================================
//  GET /api/slots?date=2025-02-10
//  Public — customer sees available slots for a date
// ============================================================
const getAvailableSlots = async (req, res, next) => {
   try {
      const { date } = req.query;

      if (!date) {
         return sendError(res, 'Date is required as a query parameter', 400);
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
         return sendError(res, 'Date must be in YYYY-MM-DD format.', 400);
      }

      const slots = await slotModel.getAvailableSlots(date);
      return sendSuccess(res, 'Available slots fetched.', slots);

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  GET /api/slots/admin?date=2025-02-10
//  Admin only — sees ALL slots for a date (any status)
// ============================================================
const getAllSlotsByDate = async (req, res, next) => {
   try {
      const { date } = req.query;

      if (!date) {
         return sendError(res, 'Date is required as a query parameter.', 400);
      }

      const slots = await slotModel.getSlotsByDate(date);
      return sendSuccess(res, 'Slots fetched.', slots);

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  POST /api/slots/generate
//  Admin only — generate slots from a time range
// ============================================================
const generateAndInsertSlots = async (req, res, next) => {
   try {
      const { date, start_time, end_time, duration_min, max_capacity } = req.body;

      // Check date is not in the past
      const today = new Date().toISOString().split('T')[0];
      if (date < today) {
         return sendError(res, 'Cannot generate slots for a past date.', 400);
      }

      // Generate slot objects using the algorithm
      // generateSlots throws if times are invalid
      let slots;
      try {
         slots = generateSlots({ date, start_time, end_time, duration_min, max_capacity });
      } catch (err) {
         return sendError(res, err.message, 400);
      }

      if (slots.length === 0) {
         return sendError(res, 'No slots could be generated from the given time range.', 400);
      }

      // Bulk insert into DB
      const insertedCount = await slotModel.bulkInsertSlots(slots, req.user.id);

      return sendSuccess(
         res,
         `${insertedCount} slot(s) generated successfully.`,
         { count: insertedCount, slots },
         201
      );

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  POST /api/slots/block
//  Admin only — block a specific slot
// ============================================================
const blockSlot = async (req, res, next) => {
   try {
      const { slot_id } = req.body;

      const slot = await slotModel.getSlotById(slot_id);
      if (!slot) {
         return sendError(res, 'Slot not found.', 404);
      }

      if (slot.status === 'blocked') {
         return sendError(res, 'Slot is already blocked.', 400);
      }

      if (slot.booked_count > 0) {
         return sendError(res, 'Cannot block a slot that already has bookings.', 400);
      }

      await slotModel.blockSlot(slot_id);
      return sendSuccess(res, 'Slot blocked successfully.');

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  DELETE /api/slots/:id
//  Admin only — delete a slot (only if no bookings)
// ============================================================
const deleteSlot = async (req, res, next) => {
   try {
      const { id } = req.params;

      const slot = await slotModel.getSlotById(id);
      if (!slot) {
         return sendError(res, 'Slot not found.', 404);
      }

      const result = await slotModel.deleteSlot(id);

      // affectedRows = 0 means booked_count > 0, deletion was blocked
      if (result.affectedRows === 0) {
         return sendError(res, 'Cannot delete a slot that has existing bookings.', 400);
      }

      return sendSuccess(res, 'Slot deleted successfully.');

   } catch (err) {
      next(err);
   }
};

export {
   getAvailableSlots,
   getAllSlotsByDate,
   generateAndInsertSlots,
   blockSlot,
   deleteSlot
}
