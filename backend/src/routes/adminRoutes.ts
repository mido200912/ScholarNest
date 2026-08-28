import express from 'express';
import { protect, assistantOrAdmin } from '../middleware/auth';
import {
  getAdminStats,
  getDailyStats,
  exportScholarships,
  exportUsers,
} from '../controllers/adminController';
import {
  getBotSettings,
  updateBotSettings,
  testScholarshipHunt,
} from '../controllers/botSettingsController';

const router = express.Router();

router.get('/stats', protect, assistantOrAdmin, getAdminStats);
router.get('/stats/daily', protect, assistantOrAdmin, getDailyStats);
router.get('/export/scholarships', protect, assistantOrAdmin, exportScholarships);
router.get('/export/users', protect, assistantOrAdmin, exportUsers);

// Bot Settings
router.get('/bot-settings', protect, assistantOrAdmin, getBotSettings);
router.put('/bot-settings', protect, assistantOrAdmin, updateBotSettings);
router.post('/bot-settings/test-hunt', protect, assistantOrAdmin, testScholarshipHunt);

export default router;
