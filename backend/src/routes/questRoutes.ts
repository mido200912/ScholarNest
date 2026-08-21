import express from 'express';
import { getMyQuests, claimQuest, claimWeeklyBonus } from '../controllers/questController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect); // All routes require auth

router.get('/', getMyQuests);
router.post('/bonus/claim', claimWeeklyBonus);
router.post('/:questId/claim', claimQuest);

export default router;
