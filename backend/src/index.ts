import dotenv from 'dotenv';
dotenv.config();

// Force IPv4 to prevent ENETUNREACH errors on networks without full IPv6 support
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import app from './app';
import { connectDB } from './config/db';
import { startCronJobs, cleanupExpiredScholarships } from './cronJobs';
import { startBotPolling } from './services/telegramBot';

const PORT = process.env.PORT || 5000;

// Start server immediately (don't wait for MongoDB)
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  try {
    await connectDB();
    console.log('MongoDB connected successfully');
    
    await cleanupExpiredScholarships();
    startCronJobs();
    startBotPolling();
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
});
