import { Response } from 'express';
import { Alert } from '../models/Alert';
import { AuthRequest } from '../middleware/auth';

// @desc    Get user's alerts
// @route   GET /api/alerts
// @access  Private
export const getMyAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alerts = await Alert.find({ user: req.user?._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Alert.countDocuments({ user: req.user?._id, isRead: false });

    res.json({ success: true, data: alerts, unreadCount });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark alert as read
// @route   PATCH /api/alerts/:id/read
// @access  Private
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Alert.findOneAndUpdate(
      { _id: req.params.id, user: req.user?._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all alerts as read
// @route   PUT /api/alerts/read-all
// @access  Private
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Alert.updateMany(
      { user: req.user?._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete an alert
// @route   DELETE /api/alerts/:id
// @access  Private
export const deleteAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Alert.findOneAndDelete({ _id: req.params.id, user: req.user?._id });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Create an alert
export const createAlert = async (
  userId: string,
  type: string,
  title: { en: string; ar: string },
  message: { en: string; ar: string },
  link?: string
) => {
  try {
    await Alert.create({ user: userId, type, title, message, link });
  } catch (error) {
    console.error('Error creating alert:', error);
  }
};
