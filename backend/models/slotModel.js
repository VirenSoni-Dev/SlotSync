// ============================================================
//  models/slotModel.js
//  All SQL queries for the slots table
// ============================================================

import db from '../config/db.js';

// ── Get all slots for a specific date ──
// Returns ALL slots regardless of status (available, booked, blocked)
// Used by: admin slot management page to see full picture of a date
const getSlotsByDate = async (date) => {
   const [rows] = await db.query(
      `SELECT * FROM slots
         WHERE date = ?
         ORDER BY start_time ASC`,
      [date]
   );
   return rows;
};

// ── Get available slots for a date ──
// Only returns slots that still have remaining capacity
// Used by: customer booking page — only show what can actually be booked
const getAvailableSlots = async (date) => {
   const [rows] = await db.query(
      `SELECT * FROM slots
         WHERE date = ?
         AND status = 'available'
         AND booked_count < max_capacity
         ORDER BY start_time ASC`,
      [date]
   );
   return rows;
};

// ── Get single slot by ID ──
// Used by: booking controller (check before booking)
const getSlotById = async (id) => {
   const [rows] = await db.query(
      'SELECT * FROM slots WHERE id = ?',
      [id]
   );
   return rows[0] || null;
};

// ── Bulk insert generated slots ──
// Used by: slotController after slotGenerator creates the array
// Inserts all slots in one query — much faster than one INSERT per slot
const bulkInsertSlots = async (slots, createdBy) => {
   const values = slots.map(slot => [
      slot.date,
      slot.start_time,
      slot.end_time,
      slot.max_cap,
      0,
      'available',
      createdBy
   ]);

   const [result] = await db.query(
      `INSERT INTO slots
         (date, start_time, end_time, max_capacity, booked_count, status, created_by)
         VALUES ?`,
      [values]
   );

   return result.affectedRows;
};

// ── Block a slot ──
// Admin manually blocks a slot — no one can book it
const blockSlot = async (id) => {
   await db.query(
      `UPDATE slots SET status = 'blocked' WHERE id = ?`,
      [id]
   );
};

// ── Delete a slot ──
// Only allowed if slot has no bookings
const deleteSlot = async (id) => {
   const [result] = await db.query(
      'DELETE FROM slots WHERE id = ? AND booked_count = 0',
      [id]
   );
   return result;
};

// ── Increment booked count ──
// Called inside booking transaction when a slot is booked
// Also updates status to 'booked' if capacity is now full
const incrementBookedCount = async (id, connection) => {
   // Uses passed connection for transaction support
   // When called inside a transaction, must use the same connection
   await connection.query(
      `UPDATE slots
         SET booked_count = booked_count + 1,
            status = CASE
               WHEN booked_count + 1 >= max_capacity THEN 'booked'
               ELSE 'available'
            END
         WHERE id = ?`,
      [id]
   );
};

// ── Decrement booked count ──
// Called when a booking is cancelled
// Sets status back to 'available'
const decrementBookedCount = async (id) => {
   await db.query(
      `UPDATE slots
         SET booked_count = GREATEST(booked_count - 1, 0),
            status = 'available'
         WHERE id = ?`,
      [id]
   );
};

export {
   getSlotsByDate,
   getAvailableSlots,
   getSlotById,
   bulkInsertSlots,
   blockSlot,
   deleteSlot,
   incrementBookedCount,
   decrementBookedCount
};
