const errorHandler = (err, req, res, next) => {

   // Log the full error in terminal (for debugging)
   console.error('❌ Error:', err.message);
   if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
   }

   // Use error's own statusCode if set, otherwise 500
   const statusCode = err.statusCode || 500;

   res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal server error',

      // Only show stack trace in development, never in production
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
   });
};

export default errorHandler;
