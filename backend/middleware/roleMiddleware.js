import { sendError } from "../utils/apiResponse";

const isAdmin = (req, res, next) => {
   if (req.user?.role !== 'admin') {
      return sendError(res, 'Access denied. Admins only.', 403);
   }
   next();
};

const isCustomer = (req, res, next) => {
   if (req.user?.role !== 'customer') {
      return sendError(res, 'Access denied. Customers only.', 403);
   }
   next();
};

const isAuthenticated = (req, res, next) => {
   if (!req.user) {
      return sendError(res, 'Access denied. Please log in.', 401);
   }
   next();
};

export {
   isAdmin,
   isCustomer,
   isAuthenticated
};
