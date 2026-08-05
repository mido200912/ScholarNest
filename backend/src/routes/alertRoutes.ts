import express from 'express';
import {
  getMyAlerts,
  markAsRead,
  markAllAsRead,
  deleteAlert,
} from '../controllers/alertController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getMyAlerts);
router.put('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteAlert);

export default router;
