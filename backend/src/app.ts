import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://scholar-nest-v1.vercel.app', 'https://scholarnest.up.railway.app']
      : 'http://localhost:5173',
    credentials: true,
  })
);

// Rate Limiter to prevent Brute Force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', apiLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scholarships', require('./routes/scholarshipRoutes').default);
app.use('/api/ai', require('./routes/aiRoutes').default);
app.use('/api/applications', require('./routes/applicationRoutes').default);
app.use('/api/comments', require('./routes/commentRoutes').default);
app.use('/api/notifications', require('./routes/notificationRoutes').default);

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'ScholarNest API is running normally.' });
});

export default app;
