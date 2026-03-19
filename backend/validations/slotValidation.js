import Joi from 'joi';

// ── Generate slots ──
// POST /api/slots/generate
const generateSlotsSchema = Joi.object({
   date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .required()
      .messages({
         'string.pattern.base': 'Date must be in YYYY-MM-DD format',
         'any.required': 'Date is required'
      }),

   start_time: Joi.string()
      .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
      .required()
      .messages({
         'string.pattern.base': 'Start time must be in HH:MM format',
         'any.required': 'Start time is required'
      }),

   end_time: Joi.string()
      .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
      .required()
      .messages({
         'string.pattern.base': 'End time must be in HH:MM format',
         'any.required': 'End time is required'
      }),

   duration_min: Joi.number()
      .integer()
      .min(5)
      .max(480)
      .required()
      .messages({
         'number.min': 'Duration must be at least 5 minutes',
         'number.max': 'Duration cannot exceed 480 minutes (8 hours)',
         'any.required': 'Duration is required'
      }),

   max_cap: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(1)
});

// ── Block a slot ──
// POST /api/slots/block
const blockSlotSchema = Joi.object({
   slot_id: Joi.number()
      .integer()
      .required()
      .messages({
         'any.required': 'Slot ID is required'
      })
});

export {
   generateSlotsSchema,
   blockSlotSchema
};
