import db from '../config/db.js';
import * as bookingModel from '../models/bookingModel.js';
import * as slotModel from '../models/slotModel.js';
import * as serviceModel from '../models/serviceModel.js';
import * as userModel from '../models/userModel.js';
import * as mailService from '../services/mailService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// ============================================================
//  POST /api/bookings
//  Customer only
//  The FOR UPDATE transaction lives here
// ============================================================
const createBooking = async (req, res, next) => {
   // Get a single connection from the pool
   // ALL queries in this transaction must use this same connection
   const connection = await db.getConnection();

   try {
      const { service_id, slot_id, notes } = req.body;
      const user_id = req.user.id; // from authMiddleware

      // ── Validate service exists ──
      const service = await serviceModel.getServiceById(service_id);
      if (!service) {
         connection.release();
         return sendError(res, 'Service not found.', 404);
      }

      // ── BEGIN TRANSACTION ──
      await connection.beginTransaction();

      // ── FOR UPDATE — lock this slot row ──
      // No other request can read or modify this row
      // until we COMMIT or ROLLBACK
      const [rows] = await connection.query(
         'SELECT * FROM slots WHERE id = ? FOR UPDATE',
         [slot_id]
      );

      const slot = rows[0];

      if (!slot) {
         await connection.rollback();
         connection.release();
         return sendError(res, 'Slot not found.', 404);
      }

      if (slot.status === 'blocked') {
         await connection.rollback();
         connection.release();
         return sendError(res, 'This slot is blocked and cannot be booked.', 400);
      }

      // ── Check capacity ──
      if (slot.booked_count >= slot.max_capacity) {
         await connection.rollback();
         connection.release();
         return sendError(res, 'This slot is fully booked.', 400);
      }

      // ── Check date is not in the past ──
      const today = new Date().toISOString().split('T')[0];
      if (slot.date < today) {
         await connection.rollback();
         connection.release();
         return sendError(res, 'Cannot book a slot in the past.', 400);
      }

      // ── Create the booking ──
      const bookingId = await bookingModel.createBooking(connection, {
         user_id,
         service_id,
         slot_id,
         notes
      });

      // ── Increment slot's booked count ──
      await slotModel.incrementBookedCount(slot_id, connection);

      // ── COMMIT — all changes saved ──
      await connection.commit();
      connection.release();

      // ── Fetch full booking details to return ──
      const booking = await bookingModel.getBookingById(bookingId);

      return sendSuccess(
         res,
         'Booking created. Please complete payment to confirm.',
         booking,
         201
      );

   } catch (err) {
      // Something went wrong — undo ALL changes
      await connection.rollback();
      connection.release();
      next(err);
   }
};

// ============================================================
//  GET /api/bookings/my
//  Customer — their own bookings
// ============================================================
const getMyBookings = async (req, res, next) => {
   try {
      const bookings = await bookingModel.getBookingsByUser(req.user.id);
      return sendSuccess(res, 'Bookings fetched.', bookings);
   } catch (err) {
      next(err);
   }
};

// ============================================================
//  GET /api/bookings/all
//  Admin — all bookings
// ============================================================
const getAllBookings = async (req, res, next) => {
   try {
      const bookings = await bookingModel.getAllBookings();
      return sendSuccess(res, 'All bookings fetched.', bookings);
   } catch (err) {
      next(err);
   }
};

// ============================================================
//  GET /api/bookings/:id
//  Customer can view their own booking
//  Admin can view any booking
// ============================================================
const getBookingById = async (req, res, next) => {
   try {
      const booking = await bookingModel.getBookingById(req.params.id);

      if (!booking) {
         return sendError(res, 'Booking not found.', 404);
      }

      // Customer can only view their own booking
      if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
         return sendError(res, 'Access denied.', 403);
      }

      return sendSuccess(res, 'Booking fetched.', booking);
   } catch (err) {
      next(err);
   }
};

// ============================================================
//  PUT /api/bookings/:id/cancel
//  Customer cancels their own booking
//  Admin can cancel any booking
// ============================================================
const cancelBooking = async (req, res, next) => {
   try {
      const booking = await bookingModel.getBookingById(req.params.id);

      if (!booking) {
         return sendError(res, 'Booking not found.', 404);
      }

      // Customer can only cancel their own
      if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
         return sendError(res, 'Access denied.', 403);
      }

      // Can only cancel pending or confirmed bookings
      if (!['pending', 'confirmed'].includes(booking.status)) {
         return sendError(res, `Cannot cancel a booking with status: ${booking.status}`, 400);
      }

      // Update booking status
      await bookingModel.updateBookingStatus(booking.id, 'cancelled');

      // Free up the slot
      await slotModel.decrementBookedCount(booking.slot_id);

      // Send cancellation email
      const user = await userModel.findById(booking.user_id);
      await mailService.sendCancellationEmail(user.email, {
         name: user.name,
         serviceName: booking.service_name,
         date: booking.date,
         startTime: booking.start_time
      });

      return sendSuccess(res, 'Booking cancelled successfully.');

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  PUT /api/bookings/:id/reschedule
//  Customer reschedules to a new slot
// ============================================================
const rescheduleBooking = async (req, res, next) => {
   const connection = await db.getConnection();

   try {
      const { new_slot_id } = req.body;
      const booking = await bookingModel.getBookingById(req.params.id);

      if (!booking) {
         connection.release();
         return sendError(res, 'Booking not found.', 404);
      }

      // Only customer's own confirmed booking
      if (req.user.role === 'customer' && booking.user_id !== req.user.id) {
         connection.release();
         return sendError(res, 'Access denied.', 403);
      }

      if (booking.status !== 'confirmed') {
         connection.release();
         return sendError(res, 'Only confirmed bookings can be rescheduled.', 400);
      }

      // ── BEGIN TRANSACTION ──
      await connection.beginTransaction();

      // Lock new slot
      const [rows] = await connection.query(
         'SELECT * FROM slots WHERE id = ? FOR UPDATE',
         [new_slot_id]
      );
      const newSlot = rows[0];

      if (!newSlot) {
         await connection.rollback();
         connection.release();
         return sendError(res, 'New slot not found.', 404);
      }

      if (newSlot.booked_count >= newSlot.max_capacity) {
         await connection.rollback();
         connection.release();
         return sendError(res, 'New slot is fully booked.', 400);
      }

      if (newSlot.status === 'blocked') {
         await connection.rollback();
         connection.release();
         return sendError(res, 'New slot is blocked.', 400);
      }

      // Free old slot
      await slotModel.decrementBookedCount(booking.slot_id);

      // Update booking with new slot
      await connection.query(
         'UPDATE bookings SET slot_id = ?, reminder_sent = FALSE WHERE id = ?',
         [new_slot_id, booking.id]
         // reset reminder_sent so reminder goes out for new time
      );

      // Increment new slot count
      await slotModel.incrementBookedCount(new_slot_id, connection);

      await connection.commit();
      connection.release();

      const updated = await bookingModel.getBookingById(booking.id);
      return sendSuccess(res, 'Booking rescheduled successfully.', updated);

   } catch (err) {
      await connection.rollback();
      connection.release();
      next(err);
   }
};

export {
   createBooking,
   getMyBookings,
   getAllBookings,
   getBookingById,
   cancelBooking,
   rescheduleBooking
};
