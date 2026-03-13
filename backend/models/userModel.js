import db from '../config/db.js';

const findByEmail = async (email) => {
   const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
   );
   return rows[0] || null;
};

const findById = async (id) => {
   const [rows] = await db.query(
      'SELECT id, name, email, phone, role, is_verified, created_at FROM users WHERE id = ?',
      [id]
   );
   return rows[0] || null;
};

const createUser = async ({ name, email, phone, password }) => {
   const [result] = await db.query(
      `INSERT INTO users (name, email, phone, password, role, is_verified)
         VALUES (?, ?, ?, ?, 'customer', FALSE)`,
      [name, email, phone, password]
   );
   return result.insertId;  // returns the new user's ID
};

const verifyUser = async (email) => {
   await db.query(
      'UPDATE users SET is_verified = TRUE WHERE email = ?',
      [email]
   );
};

const updatePassword = async (email, hashedPassword) => {
   await db.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
   );
};

const updateProfile = async (id, { name, phone }) => {
   await db.query(
      'UPDATE users SET name = ?, phone = ? WHERE id = ?',
      [name, phone, id]
   );
};

export {
   findByEmail,
   findById,
   createUser,
   verifyUser,
   updatePassword,
   updateProfile
};
