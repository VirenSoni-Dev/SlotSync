import { verifyAccessToken } from "../utils/generateToken";
import { sendError } from "../utils/apiResponse";

const authMiddleware = async (req, res, next) => {
   try {
      // Read Authorization header
      const authHeader = req.headers['authorization'];

      // Header must exist and start with "Bearer "
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return sendError(res, 'Access Denied. No token provided.', 401);
      }

      // Extract token from header
      const token = authHeader.split(' ')[1];

      // Verify token
      const decoded = verifyAccessToken(token);

      req.user = decoded; // Attach decoded user info to request

      next();
   } catch (error) {
      if (error.name === 'TokenExpiredError') {
         return sendError(res, 'Access token expired. Please log in again.', 401);
      }
      return sendError(res, 'Invalid token. Please log in again.', 401);
   }
};

export default authMiddleware;
