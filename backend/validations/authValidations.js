import Joi from 'joi';

// ── Register ──
// POST /api/auth/register
const registerSchema = Joi.object({
   name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
         'string.min': 'Name must be at least 2 characters',
         'string.max': 'Name cannot exceed 100 characters',
         'any.required': 'Name is required'
      }),

   email: Joi.string()
      .email()
      .required()
      .messages({
         'string.email': 'Enter a valid email address',
         'any.required': 'Email is required'
      }),

   phone: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .required()
      .messages({
         'string.pattern.base': 'Phone must be a 10-digit number',
         'any.required': 'Phone is required'
      }),

   password: Joi.string()
      .min(8)
      .max(64)
      .required()
      .messages({
         'string.min': 'Password must be at least 8 characters',
         'string.max': 'Password cannot exceed 64 characters',
         'any.required': 'Password is required'
      })
});

// ── Login ──
// POST /api/auth/login
const loginSchema = Joi.object({
   email: Joi.string()
      .email()
      .required()
      .messages({
         'string.email': 'Enter a valid email address',
         'any.required': 'Email is required'
      }),

   password: Joi.string()
      .required()
      .messages({
         'any.required': 'Password is required'
      })
});

// ── Send OTP ──
// POST /api/auth/send-otp
const sendOtpSchema = Joi.object({
   email: Joi.string()
      .email()
      .required()
      .messages({
         'string.email': 'Enter a valid email address',
         'any.required': 'Email is required'
      }),

   purpose: Joi.string()
      .valid('register', 'forgot_password')
      .required()
      .messages({
         'any.only': 'Purpose must be register or forgot_password',
         'any.required': 'Purpose is required'
      })
});

// ── Verify OTP ──
// POST /api/auth/verify-otp
const verifyOtpSchema = Joi.object({
   email: Joi.string()
      .email()
      .required(),

   otp_code: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .required()
      .messages({
         'string.pattern.base': 'OTP must be a 6-digit number',
         'any.required': 'OTP code is required'
      }),

   purpose: Joi.string()
      .valid('register', 'forgot_password')
      .required()
});

// ── Forgot password — request OTP ──
// POST /api/auth/forgot-password
const forgotPasswordSchema = Joi.object({
   email: Joi.string()
      .email()
      .required()
      .messages({
         'string.email': 'Enter a valid email address',
         'any.required': 'Email is required'
      })
});

// ── Reset password ──
// POST /api/auth/reset-password
const resetPasswordSchema = Joi.object({
   email: Joi.string().email().required(),

   otp_code: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .required()
      .messages({
         'string.pattern.base': 'OTP must be a 6-digit number',
         'any.required': 'OTP code is required'
      }),

   new_password: Joi.string()
      .min(8)
      .max(64)
      .required()
      .messages({
         'string.min': 'Password must be at least 8 characters',
         'any.required': 'New password is required'
      })
});

export {
   registerSchema,
   loginSchema,
   sendOtpSchema,
   verifyOtpSchema,
   forgotPasswordSchema,
   resetPasswordSchema
};