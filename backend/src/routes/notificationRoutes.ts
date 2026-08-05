import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);

export default router;
