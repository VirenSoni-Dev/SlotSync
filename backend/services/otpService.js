import db from '../config/db.js';

// ── Generate a random 6-digit OTP ──
const generateOtp = () => {
   return String(Math.floor(Math.random() * 900000) + 100000);
};

// ── Store OTP in database ──
// Deletes any existing unused OTPs for same email+purpose first
// so user can request a new one without old ones piling up
const generateAndStoreOtp = async (email, purpose) => {
   // Delete old OTPs for this email + purpose
   await db.query(
      'DELETE FROM otps WHERE email = ? AND purpose = ?',
      [email, purpose]
   );

   const otp = generateOtp();
   const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
   //                         ↑ current time + 10 minutes in milliseconds

   await db.query(
      `INSERT INTO otps (email, otp_code, purpose, expires_at, is_used)
         VALUES (?, ?, ?, ?, FALSE)`,
      [email, otp, purpose, expiresAt]
   );

   return otp; // returned so authController can pass it to mailService
};

// ── Verify OTP ──
// Returns the OTP record if valid
// Returns null if not found, expired, or already used
const verifyOtp = async (email, otpCode, purpose) => {
   const [rows] = await db.query(
      `SELECT * FROM otps
         WHERE email = ?
           AND otp_code = ?
           AND purpose = ?
           AND is_used = FALSE
           AND expires_at > NOW()`,
      //  ↑ NOW() is MySQL current time
      //  expires_at > NOW() means it hasn't expired yet
      [email, otpCode, purpose]
   );

   return rows[0] || null;
};

// ── Mark OTP as used ──
// Called immediately after verifyOtp succeeds
// Prevents the same OTP from being used twice (replay attack)
const markOtpUsed = async (id) => {
   await db.query(
      'UPDATE otps SET is_used = TRUE WHERE id = ?',
      [id]
   );
};

// ── Delete all OTPs for an email ──
// Called after password reset is complete — cleanup
const deleteOtps = async (email, purpose) => {
   await db.query(
      'DELETE FROM otps WHERE email = ? AND purpose = ?',
      [email, purpose]
   );
};

export {
   generateAndStoreOtp,
   verifyOtp,
   markOtpUsed,
   deleteOtps
};