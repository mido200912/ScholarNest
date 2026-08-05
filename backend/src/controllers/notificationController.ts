import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { sendNotificationEmail } from '../services/emailService';
import { sendTelegramMessage } from '../services/telegramService';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const limit = parseInt(req.query.limit as string) || 20;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const notificationId = req.params.id;

    if (notificationId === 'all') {
      await Notification.updateMany(
        { user: userId, isRead: false },
        { $set: { isRead: true } }
      );
    } else {
      await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { $set: { isRead: true } }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Internal function to create notifications (e.g. from cron jobs)
export const createNotification = async (
  userId: string,
  title: { en: string; ar: string },
  message: { en: string; ar: string },
  type: 'deadline' | 'system',
  link?: string
) => {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type,
      link
    });

    // Send email + Telegram in parallel
    const user = await User.findById(userId).select('email telegramChatId name');
    if (user) {
      // Send email notification
      if (user.email) {
        sendNotificationEmail(user.email, user.name, title.en, message.en).catch(() => {});
      }
      // Send Telegram notification
      if (user.telegramChatId) {
        const telegramText = `🔔 <b>${title.en}</b>\n\n${message.en}`;
        sendTelegramMessage(user.telegramChatId, telegramText).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
