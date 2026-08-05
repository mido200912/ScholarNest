import express from 'express';
import { generateCoverLetter, chatInterview, chatWithAI } from '../controllers/aiController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/chat', protect, chatWithAI);
router.post('/cover-letter', protect, generateCoverLetter);
router.post('/interview', protect, chatInterview);

export default router;
