import db from '../config/db.js';

// ── Create a booking ──
// Called inside a transaction — receives connection, not db
const createBooking = async (connection, { user_id, service_id, slot_id, notes }) => {
   const [result] = await connection.query(
      `INSERT INTO bookings (user_id, service_id, slot_id, status, payment_status, notes)
       VALUES (?, ?, ?, 'pending', 'pending', ?)`,
      [user_id, service_id, slot_id, notes || null]
   );
   return result.insertId;
};

// ── Get booking by ID ──
// Joins users, services, slots for full details
const getBookingById = async (id) => {
   const [rows] = await db.query(
      `SELECT
         b.id,
         b.status,
         b.payment_status,
         b.notes,
         b.reminder_sent,
         b.created_at,
         u.id         AS user_id,
         u.name       AS user_name,
         u.email      AS user_email,
         u.phone      AS user_phone,
         s.id         AS service_id,
         s.service_name,
         s.price,
         s.duration_minutes,
         sl.id        AS slot_id,
         sl.date,
         sl.start_time,
         sl.end_time
       FROM bookings b
       JOIN users    u  ON b.user_id    = u.id
       JOIN services s  ON b.service_id = s.id
       JOIN slots    sl ON b.slot_id    = sl.id
       WHERE b.id = ?`,
      [id]
   );
   return rows[0] || null;
};

// ── Get all bookings for a customer ──
const getBookingsByUser = async (userId) => {
   const [rows] = await db.query(
      `SELECT
         b.id,
         b.status,
         b.payment_status,
         b.notes,
         b.created_at,
         s.service_name,
         s.price,
         sl.date,
         sl.start_time,
         sl.end_time
       FROM bookings b  
       JOIN services s  ON b.service_id = s.id
       JOIN slots    sl ON b.slot_id    = sl.id
       WHERE b.user_id = ?
       ORDER BY sl.date DESC, sl.start_time DESC`,
      [userId]
   );
   return rows;
};

// ── Get all bookings — admin ──
const getAllBookings = async () => {
   const [rows] = await db.query(
      `SELECT
         b.id,
         b.status,
         b.payment_status,
         b.created_at,
         u.name       AS user_name,
         u.email      AS user_email,
         s.service_name,
         s.price,
         sl.date,
         sl.start_time,
         sl.end_time
       FROM bookings b
       JOIN users    u  ON b.user_id    = u.id
       JOIN services s  ON b.service_id = s.id
       JOIN slots    sl ON b.slot_id    = sl.id
       ORDER BY sl.date DESC, sl.start_time DESC`
   );
   return rows;
};

// ── Update booking status ──
// Used for: confirm, cancel, complete
const updateBookingStatus = async (id, status) => {
   await db.query(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, id]
   );
};

// ── Update payment status ──
const updatePaymentStatus = async (id, paymentStatus) => {
   await db.query(
      'UPDATE bookings SET payment_status = ? WHERE id = ?',
      [paymentStatus, id]
   );
};

// ── Mark reminder sent ──
// Called by cron job after sending reminder email
const markReminderSent = async (id) => {
   await db.query(
      'UPDATE bookings SET reminder_sent = TRUE WHERE id = ?',
      [id]
   );
};

// ── Get upcoming bookings that need reminders ──
// Called by cron job every hour
// Finds confirmed bookings starting in next 60 min
// that haven't had a reminder sent yet
const getBookingsForReminder = async () => {
   const [rows] = await db.query(
      `SELECT
         b.id,
         b.reminder_sent,
         u.name       AS user_name,
         u.email      AS user_email,
         s.service_name,
         sl.date,
         sl.start_time
       FROM bookings b
       JOIN users    u  ON b.user_id    = u.id
       JOIN services s  ON b.service_id = s.id
       JOIN slots    sl ON b.slot_id    = sl.id
       WHERE b.status         = 'confirmed'
         AND b.reminder_sent  = FALSE
         AND CONCAT(sl.date, ' ', sl.start_time) BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 HOUR)`
   );
   return rows;
};

export {
   createBooking,
   getBookingById,
   getBookingsByUser,
   getAllBookings,
   updateBookingStatus,
   updatePaymentStatus,
   markReminderSent,
   getBookingsForReminder
};
