import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
   host: process.env.DB_HOST,
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
   database: process.env.DB_NAME,
   waitForConnections: true,
   connectionLimit: 10,
   queueLimit: 0
});

const db = pool.promise();

// Test the connection when server starts
pool.getConnection((err, connection) => {
   if (err) {
      console.error('❌ Database connection failed:', err.message);
      return;
   }
   console.log('✅ MySQL connected successfully');
   connection.release(); // return connection back to pool
});

export default db;
