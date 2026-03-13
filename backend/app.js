import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import { rateLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(cors());

app.use(morgan('dev'));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(rateLimiter);

app.get('/api/health', (req, res) => {
   res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString()
   });
});

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

app.use(errorHandler);

export default app;
