import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { BotSettings } from '../models/BotSettings';

// @desc    Get bot settings
// @route   GET /api/admin/bot-settings
// @access  Admin
export const getBotSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await BotSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Get bot settings error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load bot settings' });
  }
};

// @desc    Update bot settings
// @route   PUT /api/admin/bot-settings
// @access  Admin
export const updateBotSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      hunterChatId,
      huntEnabled,
      huntSchedule,
      queriesPerDay,
      searchQueries,
      maxResultsPerQuery,
      telegramBotToken,
    } = req.body;

    const settings = await BotSettings.getSettings();

    if (hunterChatId !== undefined) settings.hunterChatId = hunterChatId;
    if (huntEnabled !== undefined) settings.huntEnabled = huntEnabled;
    if (huntSchedule !== undefined) settings.huntSchedule = huntSchedule;
    if (queriesPerDay !== undefined) settings.queriesPerDay = Math.min(8, Math.max(1, queriesPerDay));
    if (searchQueries !== undefined) settings.searchQueries = searchQueries;
    if (maxResultsPerQuery !== undefined) settings.maxResultsPerQuery = Math.min(10, Math.max(1, maxResultsPerQuery));
    if (telegramBotToken !== undefined) settings.telegramBotToken = telegramBotToken;

    await settings.save();

    res.json({ success: true, data: settings, message: 'Bot settings updated successfully' });
  } catch (error: any) {
    console.error('Update bot settings error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update bot settings' });
  }
};

// @desc    Test run scholarship hunt
// @route   POST /api/admin/bot-settings/test-hunt
// @access  Admin
export const testScholarshipHunt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { runScholarshipHunt } = await import('../services/scholarshipHunterService');
    
    // Run hunt in background
    runScholarshipHunt().catch((err: any) => {
      console.error('[Test Hunt] Error:', err.message);
    });

    res.json({ success: true, message: 'Scholarship hunt triggered! Check Telegram for results.' });
  } catch (error: any) {
    console.error('Test hunt error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to trigger hunt' });
  }
};
