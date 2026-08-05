import express from 'express';
import {
  getMyApplications,
  toggleSave,
  updateApplicationStatus,
  getSavedIds,
} from '../controllers/applicationController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect); // All routes require auth

router.get('/', getMyApplications);
router.get('/saved-ids', getSavedIds);
router.post('/save/:scholarshipId', toggleSave);
router.patch('/:scholarshipId/status', updateApplicationStatus);

export default router;
