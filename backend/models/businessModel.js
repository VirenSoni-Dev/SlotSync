import db from '../config/db.js';

// ============================================================
//  businessModel.js
//  Single-business profile — always at most one row in the
//  business_profile table.
//
//  getProfile  → used by admin dashboard, and optionally by
//                the public landing page to show business info
//  upsertProfile → INSERT the first time, UPDATE every time after
// ============================================================

// ── GET the business profile (returns null if not set up yet) ──
const getProfile = async () => {
   const [rows] = await db.query(
      'SELECT * FROM business_profile LIMIT 1'
   );
   return rows[0] || null;
};

// ── INSERT first time, UPDATE on every subsequent call ──
//    Works because there is always only one row (id = 1).
//    Using DUPLICATE KEY UPDATE keeps the query idempotent —
//    no need to check existence before calling.
const upsertProfile = async ({ name, tagline, email, phone, address, category, website }) => {
   await db.query(
      `INSERT INTO business_profile
          (id, name, tagline, email, phone, address, category, website)
       VALUES
          (1, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
          name     = VALUES(name),
          tagline  = VALUES(tagline),
          email    = VALUES(email),
          phone    = VALUES(phone),
          address  = VALUES(address),
          category = VALUES(category),
          website  = VALUES(website)`,
      [name, tagline ?? null, email ?? null, phone ?? null,
         address ?? null, category ?? null, website ?? null]
   );

   // Return the updated row so the controller can send it back
   return getProfile();
};

export { getProfile, upsertProfile };