import jwt from 'jsonwebtoken';

const signAccessToken = (payload) => {
   return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
   );
};

// ── Sign refresh token ──
const signRefreshToken = (payload) => {
   return jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
   );
};

// ── Verify access token ──
// Returns decoded payload if valid
// Throws error if expired or tampered
const verifyAccessToken = (token) => {
   return jwt.verify(token, process.env.JWT_SECRET);
};

// ── Verify refresh token ──
const verifyRefreshToken = (token) => {
   return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

export {
   signAccessToken,
   signRefreshToken,
   verifyAccessToken,
   verifyRefreshToken
};
