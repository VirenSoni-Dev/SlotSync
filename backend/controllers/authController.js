import bcrypt from 'bcryptjs';
import * as userModel from '../models/userModel.js';
import * as otpService from '../services/otpService.js';
import * as mailService from '../services/mailService.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/generateToken.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// ============================================================
//  POST /api/auth/register
//  1. Check email not already taken
//  2. Hash password
//  3. Create user
//  4. Generate + send OTP
// ============================================================
const register = async (req, res, next) => {
   try {
      const { name, email, phone, password } = req.body;

      // Check if email already exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
         // If they registered but never verified — resend OTP
         if (!existingUser.is_verified) {
            const otp = await otpService.generateAndStoreOtp(email, 'register');
            await mailService.sendOtpEmail(email, otp, 'register');
            return sendSuccess(res, 'Account exists but is unverified. OTP resent.', null, 200);
         }
         return sendError(res, 'An account with this email already exists.', 409);
      }

      // Hash password — 10 salt rounds is the standard
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user in DB
      await userModel.createUser({ name, email, phone, password: hashedPassword });

      // Generate OTP and send email
      const otp = await otpService.generateAndStoreOtp(email, 'register');
      await mailService.sendOtpEmail(email, otp, 'register');

      return sendSuccess(
         res,
         'Account created. Please check your email for the OTP.',
         null,
         201
      );

   } catch (err) {
      next(err); // passes to global errorHandler
   }
};

// ============================================================
//  POST /api/auth/verify-otp
//  1. Find and validate OTP
//  2. Mark OTP as used
//  3. Mark user as verified
// ============================================================
const verifyOtp = async (req, res, next) => {
   try {
      const { email, otp_code, purpose } = req.body;

      // Check OTP is valid
      const otpRecord = await otpService.verifyOtp(email, otp_code, purpose);
      if (!otpRecord) {
         return sendError(res, 'Invalid or expired OTP. Please request a new one.', 400);
      }

      // Mark OTP as used immediately — prevents replay attack
      await otpService.markOtpUsed(otpRecord.id);

      // Mark user as verified (only for register flow)
      if (purpose === 'register') {
         await userModel.verifyUser(email);

         // Send welcome email
         const user = await userModel.findByEmail(email);
         await mailService.sendWelcomeEmail(email, user.name);
      }

      return sendSuccess(res, 'OTP verified successfully.');

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  POST /api/auth/send-otp
//  Resend OTP — used for both register and forgot_password
// ============================================================
const sendOtp = async (req, res, next) => {
   try {
      const { email, purpose } = req.body;

      // For register — user must exist
      // For forgot_password — user must exist and be verified
      const user = await userModel.findByEmail(email);

      if (!user) {
         // Don't reveal whether email exists — security best practice
         return sendSuccess(res, 'If this email exists, an OTP has been sent.');
      }

      if (purpose === 'forgot_password' && !user.is_verified) {
         return sendError(res, 'Account is not verified.', 400);
      }

      const otp = await otpService.generateAndStoreOtp(email, purpose);
      await mailService.sendOtpEmail(email, otp, purpose);

      return sendSuccess(res, 'OTP sent successfully.');

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  POST /api/auth/login
//  1. Find user
//  2. Check verified
//  3. Compare password
//  4. Sign and return tokens
// ============================================================
const login = async (req, res, next) => {
   try {
      const { email, password } = req.body;

      // Find user — use findByEmail which includes password column
      const user = await userModel.findByEmail(email);
      if (!user) {
         return sendError(res, 'Invalid email or password.', 401);
         // note: don't say "email not found" — security best practice
         // always give a generic message
      }

      // Check account is verified
      if (!user.is_verified) {
         return sendError(res, 'Account not verified. Please verify your email first.', 401);
      }

      // Compare password with hash
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
         return sendError(res, 'Invalid email or password.', 401);
      }

      // Build payload — only what's needed
      const payload = { id: user.id, role: user.role };

      // Sign both tokens
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      // Send refresh token as httpOnly cookie
      // httpOnly = JS cannot read it → safer against XSS attacks
      res.cookie('refreshToken', refreshToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
         sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
         maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
      });

      return sendSuccess(res, 'Login successful.', {
         accessToken,
         user: {
            id: user.id,
            name: user.name,
            role: user.role
         }
      });

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  POST /api/auth/forgot-password
//  Just sends an OTP to the email
// ============================================================
const forgotPassword = async (req, res, next) => {
   try {
      const { email } = req.body;

      const user = await userModel.findByEmail(email);

      // Always return success — don't reveal if email exists
      if (!user || !user.is_verified) {
         return sendSuccess(res, 'If this email exists, a reset code has been sent.');
      }

      const otp = await otpService.generateAndStoreOtp(email, 'forgot_password');
      await mailService.sendOtpEmail(email, otp, 'forgot_password');

      return sendSuccess(res, 'Password reset code sent to your email.');

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  POST /api/auth/reset-password
//  1. Verify OTP
//  2. Hash new password
//  3. Update in DB
//  4. Cleanup OTPs
// ============================================================
const resetPassword = async (req, res, next) => {
   try {
      const { email, otp_code, new_password } = req.body;

      // Verify OTP
      const otpRecord = await otpService.verifyOtp(email, otp_code, 'forgot_password');
      if (!otpRecord) {
         return sendError(res, 'Invalid or expired OTP.', 400);
      }

      // Mark OTP used
      await otpService.markOtpUsed(otpRecord.id);

      // Hash new password and update
      const hashed = await bcrypt.hash(new_password, 10);
      await userModel.updatePassword(email, hashed);

      // Clean up remaining OTPs for this email
      await otpService.deleteOtps(email, 'forgot_password');

      return sendSuccess(res, 'Password reset successfully. You can now log in.');

   } catch (err) {
      next(err);
   }
};

// ============================================================
//  POST /api/auth/refresh-token
//  Uses refresh token from cookie to issue a new access token
// ============================================================
const refreshToken = async (req, res, next) => {
   try {
      const token = req.cookies?.refreshToken;

      if (!token) {
         return sendError(res, 'No refresh token provided.', 401);
      }

      // Verify refresh token
      const decoded = verifyRefreshToken(token);

      // Issue new access token
      const accessToken = signAccessToken({ id: decoded.id, role: decoded.role });

      return sendSuccess(res, 'Token refreshed.', { accessToken });

   } catch (err) {
      // If refresh token is expired or invalid
      return sendError(res, 'Session expired. Please log in again.', 401);
   }
};

// ============================================================
//  POST /api/auth/logout
//  Clears the refresh token cookie
// ============================================================
const logout = async (req, res) => {
   res.clearCookie('refreshToken');
   return sendSuccess(res, 'Logged out successfully.');
};

export {
   register,
   verifyOtp,
   sendOtp,
   login,
   forgotPassword,
   resetPassword,
   refreshToken,
   logout
};