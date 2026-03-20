import Joi from 'joi';

// ── Create booking ──
// POST /api/bookings
const createBookingSchema = Joi.object({
   service_id: Joi.number()
      .integer()
      .required()
      .messages({
         'any.required': 'Service ID is required'
      }),

   slot_id: Joi.number()
      .integer()
      .required()
      .messages({
         'any.required': 'Slot ID is required'
      }),

   notes: Joi.string()
      .max(500)
      .optional()
      .allow('')
});

// ── Cancel booking ──
// PUT /api/bookings/:id/cancel
const cancelBookingSchema = Joi.object({
   reason: Joi.string()
      .max(300)
      .optional()
      .allow('')
});

// ── Reschedule booking ──
// PUT /api/bookings/:id/reschedule
const rescheduleBookingSchema = Joi.object({
   new_slot_is: Joi.number()
      .integer()
      .required()
      .messages({
         'any.required': 'New Slot ID is required'
      })
});

export {
   createBookingSchema,
   cancelBookingSchema,
   rescheduleBookingSchema
};
