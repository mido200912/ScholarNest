import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { QuestProgress } from '../models/QuestProgress';
import {
  getWeeklyQuests,
  getWeekKey,
  getQuestProgressValue,
  WEEKLY_BONUS_POINTS,
} from '../services/questService';
import { awardPoints } from '../services/gamificationService';

// @desc    Get weekly quests with live progress
// @route   GET /api/quests
// @access  Private
export const getMyQuests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const weekKey = getWeekKey();
    const quests = getWeeklyQuests();

    let progress = await QuestProgress.findOne({ user: user._id, weekKey });
    if (!progress) {
      progress = await QuestProgress.create({ user: user._id, weekKey, claimed: [] });
    }

    const data = await Promise.all(
      quests.map(async quest => {
        const value = await getQuestProgressValue(quest, user);
        const completed = value >= quest.target;
        return {
          ...quest,
          progress: Math.min(value, quest.target),
          completed,
          claimed: progress!.claimed.includes(quest.id),
        };
      })
    );

    const allCompleted = data.every(q => q.completed);
    const allClaimed = data.every(q => q.claimed);

    res.json({
      success: true,
      data: {
        weekKey,
        quests: data,
        allCompleted,
        allClaimed,
        bonusPoints: WEEKLY_BONUS_POINTS,
        allCompletedBonusGiven: progress.allCompletedBonusGiven,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Claim quest reward points
// @route   POST /api/quests/:questId/claim
// @access  Private
export const claimQuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const questId = String(req.params.questId);
    const weekKey = getWeekKey();
    const quests = getWeeklyQuests();
    const quest = quests.find(q => q.id === questId);

    if (!quest) {
      res.status(404).json({ success: false, message: 'Quest not found' });
      return;
    }

    let progress = await QuestProgress.findOne({ user: user._id, weekKey });
    if (!progress) {
      progress = await QuestProgress.create({ user: user._id, weekKey, claimed: [] });
    }

    if (progress.claimed.includes(questId)) {
      res.status(400).json({ success: false, message: 'Quest reward already claimed' });
      return;
    }

    const value = await getQuestProgressValue(quest, user);
    if (value < quest.target) {
      res.status(400).json({ success: false, message: 'Quest not completed yet' });
      return;
    }

    progress.claimed.push(questId);
    await progress.save();

    await awardPoints(user._id.toString(), { points: quest.points });

    res.json({ success: true, message: 'Quest reward claimed', points: quest.points });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Claim all-quests-completed weekly bonus
// @route   POST /api/quests/bonus/claim
// @access  Private
export const claimWeeklyBonus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Not authorized' });
      return;
    }

    const weekKey = getWeekKey();
    let progress = await QuestProgress.findOne({ user: user._id, weekKey });
    if (!progress) {
      progress = await QuestProgress.create({ user: user._id, weekKey, claimed: [] });
    }

    if (progress.allCompletedBonusGiven) {
      res.status(400).json({ success: false, message: 'Weekly bonus already claimed' });
      return;
    }

    const quests = getWeeklyQuests();
    for (const quest of quests) {
      const value = await getQuestProgressValue(quest, user);
      if (value < quest.target) {
        res.status(400).json({ success: false, message: 'Complete all quests first' });
        return;
      }
    }

    progress.allCompletedBonusGiven = true;
    await progress.save();

    await awardPoints(user._id.toString(), { points: WEEKLY_BONUS_POINTS });

    res.json({ success: true, message: 'Weekly bonus claimed', points: WEEKLY_BONUS_POINTS });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
