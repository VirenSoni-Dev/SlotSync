import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
   key_id: process.env.RAZORPAY_KEY_ID,
   key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ── Create Razorpay order ──
// Called before showing the payment modal to the user
// Returns an order_id that the frontend uses to open Razorpay checkout
const createOrder = async ({ amount, bookingId }) => {
   const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `booking_${bookingId}`,
      notes: {
         booking_id: bookingId
      }
   };

   const order = await razorpay.orders.create(options);
   return order;
};

// ── Verify payment signature ──
// This is the critical security step
// Razorpay signs the payment using your secret key
// You verify that signature to confirm payment is genuine
// If someone tries to fake a payment on the frontend — this catches it
const verifySignature = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
   const body = `${razorpay_order_id}|${razorpay_payment_id}`;
   const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

   return expectedSignature === razorpay_signature;
};

export { createOrder, verifySignature };
