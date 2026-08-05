import express from 'express';
import {
  getMyApplications,
  toggleSave,
  updateApplicationStatus,
  getApplicationTimeline,
  addDocument,
  deleteDocument,
  getSavedIds,
} from '../controllers/applicationController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect); // All routes require auth

router.get('/', getMyApplications);
router.get('/saved-ids', getSavedIds);
router.post('/save/:scholarshipId', toggleSave);
router.patch('/:scholarshipId/status', updateApplicationStatus);
router.get('/:scholarshipId/timeline', getApplicationTimeline);
router.post('/:scholarshipId/docs', addDocument);
router.delete('/:scholarshipId/docs/:docId', deleteDocument);

export default router;
