import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';
import scholarshipRoutes from './routes/scholarshipRoutes';
import aiRoutes from './routes/aiRoutes';
import applicationRoutes from './routes/applicationRoutes';
import commentRoutes from './routes/commentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import alertRoutes from './routes/alertRoutes';
import questRoutes from './routes/questRoutes';

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

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/quests', questRoutes);

// Basic Health Check Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'success', message: 'ScholarNest API is running normally.' });
});

app.get('/', (req, res) => {
  res.status(200).send('Welcome to ScholarNest API. The frontend is hosted separately.');
});

export default app;
