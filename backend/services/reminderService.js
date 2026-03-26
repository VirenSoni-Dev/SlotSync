// ============================================================
//  services/reminderService.js
//  Cron job that runs every 15 minutes and sends reminders
//
//  Two types of reminders:
//  1. Day before  → sent at 9:00 AM the day before appointment
//  2. Same day    → sent 2 hours before appointment
//
//  Each has its own flag in bookings table so both can fire
//  independently without interfering with each other
// ============================================================

import cron from 'node-cron';
import * as bookingModel from '../models/bookingModel.js';
import * as mailService from './mailService.js';
import db from '../config/db.js';

// ── Fetch bookings that need day-before reminder ──
// Conditions:
//  - appointment is tomorrow
//  - current time is between 9:00 AM and 9:15 AM (our window)
//  - reminder_day_before_sent = FALSE
const getBookingsForDayBeforeReminder = async () => {
   const [rows] = await db.query(
      `SELECT
            b.id,
            u.name        AS user_name,
            u.email       AS user_email,
            s.service_name,
            sl.date,
            sl.start_time
         FROM bookings b
         JOIN users    u  ON b.user_id    = u.id
         JOIN services s  ON b.service_id = s.id
         JOIN slots    sl ON b.slot_id    = sl.id
         WHERE b.status = 'confirmed'
           AND b.reminder_day_before_sent = FALSE
           AND sl.date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
           AND HOUR(NOW()) = 9
           --only fires during the 9 AM hour
           --cron runs every 15 min so it will catch it`
    );
return rows;
};

// ── Fetch bookings that need same-day reminder ──
// Conditions:
//  - appointment is today
//  - appointment starts between 2 hours and 2h15m from now
//  - reminder_same_day_sent = FALSE
const getBookingsForSameDayReminder = async () => {
   const [rows] = await db.query(
      `SELECT
            b.id,
            u.name        AS user_name,
            u.email       AS user_email,
            s.service_name,
            sl.date,
            sl.start_time
         FROM bookings b
         JOIN users    u  ON b.user_id    = u.id
         JOIN services s  ON b.service_id = s.id
         JOIN slots    sl ON b.slot_id    = sl.id
         WHERE b.status = 'confirmed'
           AND b.reminder_same_day_sent = FALSE
           AND sl.date = CURDATE()
           AND CONCAT(sl.date, ' ', sl.start_time)
               BETWEEN DATE_ADD(NOW(), INTERVAL 2 HOUR)
               AND     DATE_ADD(NOW(), INTERVAL 2 HOUR + 15 MINUTE)
           --window matches cron frequency(every 15 min)
           --so no appointment is missed or double - reminded`
   );
   return rows;
};

// ── Mark day before reminder sent ──
const markDayBeforeSent = async (id) => {
   await db.query(
      'UPDATE bookings SET reminder_day_before_sent = TRUE WHERE id = ?',
      [id]
   );
};

// ── Mark same day reminder sent ──
const markSameDaySent = async (id) => {
   await db.query(
      'UPDATE bookings SET reminder_same_day_sent = TRUE WHERE id = ?',
      [id]
   );
};

// ── Start cron job ──
const startReminderJob = () => {

   // Runs every 15 minutes
   // */15 = every 15 minutes
   cron.schedule('*/15 * * * *', async () => {
      console.log('⏰ Reminder job running:', new Date().toISOString());

      // ── Day before reminders ──
      try {
         const dayBeforeBookings = await getBookingsForDayBeforeReminder();

         for (const booking of dayBeforeBookings) {
            try {
               await mailService.sendDayBeforeReminder(booking.user_email, {
                  name: booking.user_name,
                  serviceName: booking.service_name,
                  date: booking.date,
                  startTime: booking.start_time
               });
               await markDayBeforeSent(booking.id);
               console.log(`   ✅ Day-before reminder → ${booking.user_email}`);
            } catch (err) {
               console.error(`   ❌ Day-before failed → ${booking.user_email}:`, err.message);
            }
         }
      } catch (err) {
         console.error('❌ Day-before reminder job error:', err.message);
      }

      // ── Same day reminders ──
      try {
         const sameDayBookings = await getBookingsForSameDayReminder();

         for (const booking of sameDayBookings) {
            try {
               await mailService.sendReminderEmail(booking.user_email, {
                  name: booking.user_name,
                  serviceName: booking.service_name,
                  date: booking.date,
                  startTime: booking.start_time
               });
               await markSameDaySent(booking.id);
               console.log(`   ✅ Same-day reminder → ${booking.user_email}`);
            } catch (err) {
               console.error(`   ❌ Same-day failed → ${booking.user_email}:`, err.message);
            }
         }
      } catch (err) {
         console.error('❌ Same-day reminder job error:', err.message);
      }
   });

   console.log('✅ Reminder cron job started (runs every 15 minutes)');
};

export { startReminderJob };
