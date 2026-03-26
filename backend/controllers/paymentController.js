import * as paymentModel from '../models/paymentModel.js';
import * as bookingModel from '../models/bookingModel.js';
import * as userModel from '../models/userModel.js';
import * as mailService from '../services/mailService.js';
import { createOrder, verifySignature } from '../services/paymentService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// ============================================================
//  POST /api/payment/create-order
//  Customer only
//  Creates a Razorpay order for a pending booking
// ============================================================
const createPaymentOrder = async (req, res, next) => {
   try {
      const { booking_id } = req.body;
      if (!booking_id) {
         return sendError(res, 'Booking ID is required', 400);
      }

      const booking = await bookingModel.getBookingById(booking_id);
      if (!booking) {
         return sendError(res, 'Booking not found', 404);
      }

      if (booking.user_id !== req.user.id) {
         return sendError(res, 'Access Denied', 403);
      }

      if (booking.status !== 'pending') {
         return sendError(res, `Booking is already ${booking.status}`, 400);
      }

      const existingPayment = await paymentModel.getPaymentByBookingId(booking_id);
      if (existingPayment && existingPayment.payment_status === 'paid') {
         return sendError(res, 'This booking is already paid', 400);
      }

      const order = await createOrder({
         amount: booking.price,
         bookingId: booking_id
      });

      await paymentModel.createPayment({
         booking_id,
         razorpay_order_id: order.id,
         amount: booking.price
      });

      return sendSuccess(res, 'Order created successfully.', {
         order_id: order.id,
         amount: order.amount,
         currency: order.currency,
         booking_id,
         key_id: process.env.RAZORPAY_KEY_ID
      });

   } catch (error) {
      next(error);
   }
};

// ============================================================
//  POST /api/payment/verify
//  Customer only
//  Verifies Razorpay signature after payment
// ============================================================

const verifyPayment = async (req, res, next) => {
   try {
      const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
         return sendError(res, 'All payment fields are required.', 400);
      }

      const isValid = verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

      if (!isValid) {
         await paymentModel.markPaymentFailed(booking_id);
         await bookingModel.updateBookingStatus(booking_id, 'failed');
         return sendError(res, 'Payment verification failed. Invalid signature.', 400);
      }

      await paymentModel.updatePayment({
         booking_id,
         razorpay_payment_id,
         razorpay_signature,
         payment_method: 'razorpay'
      });

      await bookingModel.updateBookingStatus(booking_id, 'confirmed');
      await bookingModel.updatePaymentStatus(booking_id, 'paid');

      const booking = await bookingModel.getBookingById(booking_id);
      const user = await userModel.findById(req.user.id);

      await mailService.sendBookingConfirmation(user.email, {
         name: user.name,
         serviceName: booking.service_name,
         date: booking.date,
         startTime: booking.start_time,
         price: booking.price
      });

      return sendSuccess(res, 'Payment verified. Booking confirmed.', {
         booking_id,
         status: 'confirmed'
      });

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  GET /api/payment/history
//  Customer — their own payment history
// ============================================================
const getPaymentHistory = async (req, res, next) => {
   try {
      const bookings = await bookingModel.getBookingsByUser(req.user.id);

      // Fetch payment for each booking
      const history = await Promise.all(
         bookings.map(async (booking) => {
            const payment = await paymentModel.getPaymentByBookingId(booking.id);
            return { ...booking, payment };
         })
      );

      return sendSuccess(res, 'Payment history fetched.', history);
   } catch (err) {
      next(err);
   }
};

export {
   createPaymentOrder,
   verifyPayment,
   getPaymentHistory
};
