import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { startCronJobs, cleanupExpiredScholarships } from './cronJobs';
import { startBotPolling } from './services/telegramBot';

const PORT = process.env.PORT || 5000;

// Connect to Database then start server
connectDB().then(async () => {
  // Delete expired scholarships immediately on startup
  await cleanupExpiredScholarships();

  // Start background jobs
  startCronJobs();

  // Start Telegram bot polling
  startBotPolling();

  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
});
