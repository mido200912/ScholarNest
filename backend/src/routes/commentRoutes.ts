import express from 'express';
import { addComment, getCommentsByScholarship } from '../controllers/commentController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.route('/:scholarshipId')
  .get(getCommentsByScholarship)
  .post(protect, addComment);

export default router;
