import { Response } from 'express';
import { Application } from '../models/Application';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Scholarship } from '../models/Scholarship';
import { sendTelegramMessage } from '../services/telegramService';
import { awardPoints } from '../services/gamificationService';

const VALID_STATUSES = ['saved', 'applying', 'under_review', 'interview', 'accepted', 'rejected'];

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

    const saved        = valid.filter(a => a.status === 'saved');
    const applying     = valid.filter(a => a.status === 'applying');
    const underReview  = valid.filter(a => a.status === 'under_review');
    const interview    = valid.filter(a => a.status === 'interview');
    const accepted     = valid.filter(a => a.status === 'accepted');
    const rejected     = valid.filter(a => a.status === 'rejected');

    res.json({ success: true, data: { saved, applying, underReview, interview, accepted, rejected } });
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
      await Application.deleteOne({ _id: existing._id });
      res.json({ success: true, saved: false, message: 'Removed from saved' });
    } else {
      const app = await Application.create({
        user: userId,
        scholarship: scholarshipId as string,
        status: 'saved',
        timeline: [{ status: 'saved', date: new Date(), note: 'Scholarship saved' }],
      });
      res.status(201).json({ success: true, saved: true, message: 'Saved successfully', data: app });

      // Award points
      awardPoints(userId.toString(), 'save');

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
              `Student saved a scholarship\n\nTitle: ${scholarshipTitle}\nUniversity: ${scholarshipUniversity}\nStudent: ${submitterName}`
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
    const { status, note } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const now = new Date();
    const updateData: any = { status };

    // Auto-set timestamps based on status
    if (status === 'applying') updateData.appliedAt = now;
    if (status === 'under_review') updateData.reviewedAt = now;
    if (status === 'interview') updateData.interviewAt = now;

    const app = await Application.findOneAndUpdate(
      { user: userId, scholarship: scholarshipId },
      {
        ...updateData,
        $push: { timeline: { status, date: now, note: note || `Status changed to ${status}` } },
      },
      { new: true, upsert: true }
    );

    // Award points for applying
    if (status === 'applying') {
      awardPoints(userId.toString(), 'apply');
    }

    res.json({ success: true, data: app });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get application timeline
// @route   GET /api/applications/:scholarshipId/timeline
// @access  Private
export const getApplicationTimeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const app = await Application.findOne({
      user: req.user?._id,
      scholarship: req.params.scholarshipId,
    }).select('timeline status appliedAt reviewedAt interviewAt createdAt updatedAt');

    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.json({ success: true, data: app });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add document to application
// @route   POST /api/applications/:scholarshipId/docs
// @access  Private
export const addDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, url } = req.body;
    if (!name || !url) {
      res.status(400).json({ success: false, message: 'Name and URL are required' });
      return;
    }

    const app = await Application.findOneAndUpdate(
      { user: req.user?._id, scholarship: req.params.scholarshipId },
      { $push: { documents: { name, url, uploadedAt: new Date() } } },
      { new: true }
    );

    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.json({ success: true, data: app.documents });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete document from application
// @route   DELETE /api/applications/:scholarshipId/docs/:docId
// @access  Private
export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const app = await Application.findOneAndUpdate(
      { user: req.user?._id, scholarship: req.params.scholarshipId },
      { $pull: { documents: { _id: req.params.docId } } },
      { new: true }
    );

    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found' });
      return;
    }

    res.json({ success: true, data: app.documents });
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
