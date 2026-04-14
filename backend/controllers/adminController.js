import db from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// ============================================================
//  GET /api/admin/analytics
//  High level numbers for the dashboard
// ============================================================
const getAnalytics = async (req, res, next) => {
   try {
      const [[{ total_bookings }]] = await db.query(
         `SELECT COUNT(*) AS total_bookings FROM bookings`
      );

      const [[{ confirmed_bookings }]] = await db.query(
         `SELECT COUNT(*) AS confirmed_bookings
          FROM bookings WHERE status = 'confirmed'`
      );

      const [[{ total_revenue }]] = await db.query(
         `SELECT COALESCE(SUM(amount), 0) AS total_revenue
          FROM bookings WHERE payment_status = 'paid'`
      );

      const [[{ monthly_revenue }]] = await db.query(
         `SELECT COALESCE(SUM(amount), 0) AS monthly_revenue
          FROM payments WHERE payment_status = 'paid'
          AND MONTH(created_at) = MONTH(NOW())
          AND YEAR(created_at)  = YEAR(NOW())`
      );

      const [[{ total_customers }]] = await db.query(
         `SELECT COUNT(*) AS total_customers
          FROM users WHERE role = 'customer'`
      );

      const [[{ total_services }]] = await db.query(
         `SELECT COUNT(*) AS total_services
          FROM services WHERE is_active = TRUE`
      );

      return sendSuccess(res, 'Analytics fetched.', {
         total_bookings,
         confirmed_bookings,
         total_revenue,
         monthly_revenue,
         total_customers,
         total_services
      });

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  GET /api/admin/peak-hours
//  Which time slots get booked the most
// ============================================================
const getPeakHours = async (req, res, next) => {
   try {
      const [rows] = await db.query(
         `SELECT
            TIME_FORMAT(sl.start_time, '%H:%i') AS hour,
            COUNT(*) AS booking_count
          FROM bookings b
          JOIN slots sl ON b.slot_id = sl.id
          WHERE b.status IN ('confirmed', 'completed')
          GROUP BY sl.start_time
          ORDER BY booking_count DESC
          LIMIT 10`
      );

      return sendSuccess(res, 'Peak hours fetched.', rows);

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  GET /api/admin/popular-services
//  Which services get booked the most
// ============================================================
const getPopularServices = async (req, res, next) => {
   try {
      const [rows] = await db.query(
         `SELECT
            s.service_name,
            s.price,
            COUNT(b.id) AS total_bookings,
            SUM(p.amount) AS total_revenue
          FROM services s
          LEFT JOIN bookings b ON s.id = b.service_id
            AND b.status IN ('confirmed', 'completed')
          LEFT JOIN payments p ON b.id = p.booking_id
            AND p.payment_status = 'paid'
          WHERE s.is_active = TRUE
          GROUP BY s.id, s.service_name, s.price
          ORDER BY total_bookings DESC`
      );

      return sendSuccess(res, 'Popular services fetched.', rows);
   } catch (err) {
      next(err);
   }
};

// ============================================================
//  GET /api/admin/recent-bookings
//  Last 10 bookings for the dashboard feed
// ============================================================
const getRecentBookings = async (req, res, next) => {
   try {
      const [rows] = await db.query(
         `SELECT
            b.id,
            b.status,
            b.payment_status,
            b.created_at,
            u.name AS user_name,
            u.email AS user_email,
            s.service_name,
            s.price,
            sl.date,
            sl.start_time
          FROM bookings b
          JOIN users u ON b.user_id    = u.id
          JOIN services s ON b.service_id = s.id
          JOIN slots sl ON b.slot_id    = sl.id
          ORDER BY b.created_at DESC
          LIMIT 10`
      );

      return sendSuccess(res, 'Recent bookings fetched.', rows);
   } catch (err) {
      next(err);
   }
};

// ============================================================
//  GET /api/admin/revenue-by-day
//  Revenue for each day in the last 30 days
//  Used for a chart on the dashboard
// ============================================================
const getRevenueByDay = async (req, res, next) => {
   try {
      const [rows] = await db.query(
         `SELECT
            DATE(created_at) AS date,
            COALESCE(SUM(amount), 0) AS revenue,
            COUNT(*) AS transactions
          FROM payments
          WHERE payment_status = 'paid'
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC`
      );

      return sendSuccess(res, 'Revenue by day fetched.', rows);
   } catch (err) {
      next(err);
   }
};

export {
   getAnalytics,
   getPeakHours,
   getPopularServices,
   getRecentBookings,
   getRevenueByDay
};
