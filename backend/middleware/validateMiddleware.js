const validate = (schema) => {
   return (req, res, next) => {

      const { error } = schema.validate(req.body, {
         abortEarly: false,
         stripUnknown: true
         // prevents garbage data reaching the controller
      });

      if (error) {
         // Joi returns an array of errors — join them into one readable message
         const message = error.details
            .map(detail => detail.message)
            .join(', ');

         return res.status(400).json({
            success: false,
            message
         });
      }

      next();
   };
};

export { validate };
