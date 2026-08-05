import express from 'express';
import { 
  getScholarships, 
  getScholarshipById, 
  createScholarship, 
  updateScholarshipStatus, 
  updateScholarship,
  getPendingScholarships,
  bulkCreateScholarships,
  getMatchedScholarships,
  deleteScholarship,
  deleteAllScholarships,
  getAllScholarshipsAdmin,
  getMyScholarships,
} from '../controllers/scholarshipController';
import { protect, admin, assistantOrAdmin } from '../middleware/auth';

const router = express.Router();

router.route('/pending').get(protect, assistantOrAdmin, getPendingScholarships);
router.route('/matches').get(protect, getMatchedScholarships);
router.route('/my').get(protect, getMyScholarships);
router.route('/bulk').post(protect, assistantOrAdmin, bulkCreateScholarships);
router.route('/all').get(protect, assistantOrAdmin, getAllScholarshipsAdmin);
router.route('/delete-all').delete(protect, assistantOrAdmin, deleteAllScholarships);
router.route('/:id/status').patch(protect, assistantOrAdmin, updateScholarshipStatus);

router.route('/')
  .get(getScholarships)
  .post(protect, createScholarship);

router.route('/:id')
  .get(getScholarshipById)
  .put(protect, updateScholarship)
  .delete(protect, assistantOrAdmin, deleteScholarship);

export default router;

