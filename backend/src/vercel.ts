import app from './app';
import { connectDB } from './config/db';

// Initiate database connection
// Mongoose buffers operations automatically, so we don't need to await this before handling requests
connectDB();

export default app;
