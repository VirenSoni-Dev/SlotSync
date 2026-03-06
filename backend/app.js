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
   res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.url} not found`
   });
});

app.use(errorHandler);

export default app;
