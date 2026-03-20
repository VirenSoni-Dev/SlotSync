import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import cookieParser from 'cookie-parser';

import { rateLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

const app = express();

// ============================================================
// MIDDLEWARE STACK
// Every request flows through these in order, top to bottom
// ============================================================

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
    credentials: true
}));

app.use(morgan('dev'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(rateLimiter);

app.use(cookieParser());

// ============================================================
// ROUTES
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/api/health', (req, res) => {
   res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString()
   });
});

// 404 handler — catches any route that doesn't exist
app.use((req, res) => {
   res.status(404).send(`
        <html>
            <head>
                <style>
                    body { background: #121212; color: white; font-family: sans-serif; text-align: center; padding: 50px; }
                    h1 { color: #ff4757; }
                    .home-btn { text-decoration: none; color: #1e90ff; border: 1px solid #1e90ff; padding: 10px; }
                </style>
            </head>
            <body>
                <h1>404 - Page Not Found</h1>
                <p>Oops! The route ${req.url} doesn't exist.</p>
                <a href="/" class="home-btn">Go Back Home</a>
                <script>
                    console.log('404 Page Loaded');
                </script>
            </body>
        </html>
    `);
});

// ============================================================
// GLOBAL ERROR HANDLER
// Must be LAST — catches errors thrown anywhere in the app
// ============================================================
app.use(errorHandler);

export default app;
