const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
   const response = { success: true, message };
   if (data !== null) response.data = data;
   return res.status(statusCode).json(response);
};

const sendError = (res, message = 'Something went wrong', statusCode = 500) => {
   return res.status(statusCode).json({ success: false, message });
};

export { sendSuccess, sendError };
