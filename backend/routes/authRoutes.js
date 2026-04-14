import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validate } from '../middleware/validateMiddleware.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

import {
   registerSchema,
   loginSchema,
   sendOtpSchema,
   verifyOtpSchema,
   forgotPasswordSchema,
   resetPasswordSchema
} from '../validations/authValidations.js';

const router = Router();

// ── Public routes ──
// No token required — these are how users get a token in the first place

// POST /api/auth/register
// authLimiter → stricter rate limit (10 requests per 20 min)
// validate    → checks name, email, phone, password
// controller  → creates user, sends OTP
router.post('/register',
   authLimiter,
   validate(registerSchema),
   authController.register
);

router.post('/registerAdmin',
   authLimiter,
   validate(registerSchema),
   authController.registerAdmin
);

// POST /api/auth/login
router.post('/login',
   authLimiter,
   validate(loginSchema),
   authController.login
);

// POST /api/auth/send-otp
router.post('/send-otp',
   authLimiter,
   validate(sendOtpSchema),
   authController.sendOtp
);

// POST /api/auth/verify-otp
router.post('/verify-otp',
   validate(verifyOtpSchema),
   authController.verifyOtp
);

// POST /api/auth/forgot-password
router.post('/forgot-password',
   authLimiter,
   validate(forgotPasswordSchema),
   authController.forgotPassword
);

// POST /api/auth/reset-password
router.post('/reset-password',
   validate(resetPasswordSchema),
   authController.resetPassword
);

// ── Protected routes ──
// Token required — authMiddleware runs first

// POST /api/auth/refresh-token
// reads refreshToken from httpOnly cookie → returns new accessToken
router.post('/refresh-token',
   authController.refreshToken
);

// POST /api/auth/logout
router.post('/logout',
   authMiddleware,
   authController.logout
);

// PUT /api/auth/profile
router.put('/profile',
   authMiddleware,
   authController.updateProfile
);

// PUT /api/auth/change-password
router.put('/change-password',
   authMiddleware,
   authController.changePassword
);

export default router;
