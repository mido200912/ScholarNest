import { Response } from 'express';
import { Application } from '../models/Application';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Scholarship } from '../models/Scholarship';
import { sendTelegramMessage } from '../services/telegramService';

// @desc    Get user's applications grouped by status
// @route   GET /api/applications
// @access  Private
export const getMyApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;

    const applications = await Application.find({ user: userId })
      .populate({
        path: 'scholarship',
        select: 'title university country degree fundingType deadline link image status'
      })
      .sort({ updatedAt: -1 });

    // Filter out applications where scholarship was deleted or is still pending
    const valid = applications.filter(a => a.scholarship);

    const saved    = valid.filter(a => a.status === 'saved');
    const applying = valid.filter(a => a.status === 'applying');
    const accepted = valid.filter(a => a.status === 'accepted');

    res.json({ success: true, data: { saved, applying, accepted } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save / unsave a scholarship (toggle)
// @route   POST /api/applications/save/:scholarshipId
// @access  Private
export const toggleSave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { scholarshipId } = req.params;

    const existing = await Application.findOne({ user: userId, scholarship: scholarshipId });

    if (existing) {
      // Already saved → remove
      await Application.deleteOne({ _id: existing._id });
      res.json({ success: true, saved: false, message: 'Removed from saved' });
    } else {
      // Not saved → create with status "saved"
      const app = await Application.create({ user: userId, scholarship: scholarshipId, status: 'saved' });
      res.status(201).json({ success: true, saved: true, message: 'Saved successfully', data: app });

      // Notify admins via Telegram
      try {
        const [submitter, scholarship, admins] = await Promise.all([
          User.findById(userId).select('name'),
          Scholarship.findById(scholarshipId).select('title.en university.en'),
          User.find({ role: { $in: ['admin', 'assistant_admin'] } }).select('telegramChatId'),
        ]);

        const submitterName = submitter?.name || 'Unknown';
        const scholarshipTitle = scholarship?.title?.en || 'Untitled';
        const scholarshipUniversity = scholarship?.university?.en || 'Unknown';

        for (const admin of admins) {
          if (admin.telegramChatId) {
            sendTelegramMessage(
              admin.telegramChatId,
              ` بتم منحه جديد\n\n: ${scholarshipTitle}\n: ${scholarshipUniversity}\n: ${submitterName}`
            ).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Telegram notify error:', err);
      }
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update application status
// @route   PATCH /api/applications/:scholarshipId/status
// @access  Private
export const updateApplicationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { scholarshipId } = req.params;
    const { status } = req.body;

    if (!['saved', 'applying', 'accepted'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const app = await Application.findOneAndUpdate(
      { user: userId, scholarship: scholarshipId },
      { status },
      { new: true, upsert: true }
    );

    res.json({ success: true, data: app });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check if a scholarship is saved by the current user
// @route   GET /api/applications/saved-ids
// @access  Private
export const getSavedIds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const apps = await Application.find({ user: req.user?._id }).select('scholarship status');
    res.json({ success: true, data: apps });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
