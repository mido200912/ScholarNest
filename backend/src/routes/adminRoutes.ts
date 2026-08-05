import express from 'express';
import { protect, assistantOrAdmin } from '../middleware/auth';
import {
  getAdminStats,
  getDailyStats,
  exportScholarships,
  exportUsers,
} from '../controllers/adminController';

const router = express.Router();

router.get('/stats', protect, assistantOrAdmin, getAdminStats);
router.get('/stats/daily', protect, assistantOrAdmin, getDailyStats);
router.get('/export/scholarships', protect, assistantOrAdmin, exportScholarships);
router.get('/export/users', protect, assistantOrAdmin, exportUsers);

export default router;
