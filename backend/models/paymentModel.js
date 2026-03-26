import db from '../config/db.js';

// ── Create a payment record ──
// Called when Razorpay order is created
// Status starts as 'pending' until payment is verified
const createPayment = async ({ booking_id, razorpay_order_id, amount }) => {
   const [result] = await db.query(
      `INSERT INTO payments (booking_id, razorpay_order_id, amount, payment_status)
       VALUES (?, ?, ?, 'pending')`,
      [booking_id, razorpay_order_id, amount]
   );
   return result.insertId;
};

// ── Update payment after verification ──
// Called after HMAC signature is verified
const updatePayment = async ({ booking_id, razorpay_payment_id, razorpay_signature, payment_method }) => {
   await db.query(
      `UPDATE payments
       SET razorpay_payment_id = ?,
           razorpay_signature  = ?,
           payment_status      = 'paid',
           payment_method      = ?
       WHERE booking_id = ?`,
      [razorpay_payment_id, razorpay_signature, payment_method || 'razorpay', booking_id]
   );
};

const getPaymentByBookingId = async (bookingId) => {
   const [rows] = await db.query(
      `SELECT * FROM payments WHERE booking_id = ?`,
      [bookingId]
   );
   return rows[0] || null;
};

const markPaymentFailed = async (bookingId) => {
   await db.query(
      `UPDATE payments SET payment_status = 'failed' WHERE booking_id = ?`,
      [bookingId]
   );
};

const markPaymentRefunded = async (bookingId) => {
   await db.query(
      `UPDATE payments SET payment_status = 'refunded' WHERE booking_id = ?`,
      [bookingId]
   );
};

export {
   createPayment,
   updatePayment,
   getPaymentByBookingId,
   markPaymentFailed,
   markPaymentRefunded
};
