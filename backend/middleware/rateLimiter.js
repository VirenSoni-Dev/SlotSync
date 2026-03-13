import rateLimit from 'express-rate-limit';

const rateLimiter = rateLimit({
   windowMs: 15 * 60 * 1000,  // 15 minute window
   max: 100,              // max 100 requests per window per IP
   standardHeaders: true,            // sends limit info in response headers
   legacyHeaders: false,
   message: {
      success: false,
      message: 'Too many requests, please try again after 15 minutes'
   }
});

// Stricter limiter for auth routes (login, OTP)
const authLimiter = rateLimit({
   windowMs: 20 * 60 * 1000,  // 20 minutes
   max: 10,               // only 10 attempts per 20 min
   message: {
      success: false,
      message: 'Too many attempts, please try again after 20 minutes'
   }
});

export { rateLimiter, authLimiter };