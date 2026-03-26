import app from './app.js';
import dotenv from 'dotenv';
import './config/db.js';
import { startReminderJob } from './services/reminderService.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
   console.log(`🚀 Server running on http://localhost:${PORT}`);
   console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
   console.log(`🌍 Environment: development`);

   startReminderJob();
});
