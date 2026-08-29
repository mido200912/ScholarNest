import cron from 'node-cron';
import { Application } from './models/Application';
import { Scholarship } from './models/Scholarship';
import { BotSettings } from './models/BotSettings';
import { createNotification } from './controllers/notificationController';
import { createAlert } from './controllers/alertController';
import { sendTelegramMessage } from './services/telegramService';
import { User } from './models/User';
import { runScholarshipHunt } from './services/scholarshipHunterService';

export const cleanupExpiredScholarships = async () => {
  try {
    const now = new Date();
    const result = await Scholarship.deleteMany({ deadline: { $lt: now } });
    if (result.deletedCount > 0) {
      console.log(`Auto-deleted ${result.deletedCount} expired scholarships.`);
    }
  } catch (error) {
    console.error('Error cleaning up expired scholarships:', error);
  }
};

export const sendDeadlineReminders = async () => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const applications = await Application.find({ status: { $in: ['saved', 'applying'] } })
      .populate('scholarship')
      .populate('user', 'name telegramChatId');

    for (const app of applications) {
      if (!app.scholarship || !app.user) continue;
      const scholarship: any = app.scholarship;
      const user: any = app.user;
      if (!scholarship.deadline) continue;

      const deadline = new Date(scholarship.deadline);
      const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

      let alertType: 'deadline_7days' | 'deadline_3days' | 'deadline_1day' | null = null;
      let title = { en: '', ar: '' };
      let message = { en: '', ar: '' };

      if (diffHours > 6 * 24 && diffHours <= 7 * 24) {
        alertType = 'deadline_7days';
        title = {
          en: `7 Days Left: ${scholarship.title.en}`,
          ar: `7 أيام متبقية: ${scholarship.title.ar}`
        };
        message = {
          en: `You have 7 days left to apply for ${scholarship.title.en} at ${scholarship.university.en}.`,
          ar: `باقي 7 أيام للتقديم على منحة ${scholarship.title.ar} في ${scholarship.university.ar}.`
        };
      } else if (diffHours > 2 * 24 && diffHours <= 3 * 24) {
        alertType = 'deadline_3days';
        title = {
          en: `3 Days Left: ${scholarship.title.en}`,
          ar: `3 أيام متبقية: ${scholarship.title.ar}`
        };
        message = {
          en: `Only 3 days left to apply for ${scholarship.title.en}!`,
          ar: `باقي 3 أيام فقط للتقديم على منحة ${scholarship.title.ar}!`
        };
      } else if (diffHours > 0 && diffHours <= 24) {
        alertType = 'deadline_1day';
        title = {
          en: `Last Day: ${scholarship.title.en}`,
          ar: `آخر يوم: ${scholarship.title.ar}`
        };
        message = {
          en: `Today is the last day to apply for ${scholarship.title.en}!`,
          ar: `اليوم آخر يوم للتقديم على منحة ${scholarship.title.ar}!`
        };
      }

      if (alertType) {
        await createAlert(
          user._id.toString(),
          alertType,
          title,
          message,
          `/scholarships/${scholarship._id}`
        );

        // Also send Telegram if available
        if (user.telegramChatId) {
          sendTelegramMessage(user.telegramChatId, `${title.en}\n\n${message.en}`).catch(() => {});
        }
      }
    }
  } catch (error) {
    console.error('Error sending deadline reminders:', error);
  }
};

export const startCronJobs = () => {
  // Run expired scholarships cleanup every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily expired scholarship cleanup...');
    await cleanupExpiredScholarships();
  });

  // Run deadline reminders every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running deadline reminders...');
    await sendDeadlineReminders();
  });
  // Run every day at midnight (0 0 * * *)
  // For testing purposes, we can run it more often, e.g. every minute: * * * * *
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily deadline check...');
    
    try {
      const today = new Date();
      const inSevenDays = new Date();
      inSevenDays.setDate(today.getDate() + 7);

      // Find all saved/applied applications
      const applications = await Application.find({ status: { $in: ['saved', 'applying'] } })
        .populate('scholarship');

      for (const app of applications) {
        if (!app.scholarship) continue;
        const scholarship: any = app.scholarship;
        
        if (scholarship.deadline) {
          const deadline = new Date(scholarship.deadline);
          
          // Check if deadline is exactly 7 days from now (within the current day)
          if (
            deadline > today &&
            deadline <= inSevenDays &&
            (deadline.getTime() - today.getTime()) > (6 * 24 * 60 * 60 * 1000)
          ) {
            // Create notification
            await createNotification(
              app.user.toString(),
              {
                en: `Deadline Approaching: ${scholarship.title.en}`,
                ar: `اقتراب الموعد النهائي: ${scholarship.title.ar}`
              },
              {
                en: `You have 7 days left to apply for the ${scholarship.title.en} scholarship at ${scholarship.university.en}. Don't miss it!`,
                ar: `باقي 7 أيام فقط للتقديم على منحة ${scholarship.title.ar} في ${scholarship.university.ar}. لا تفوت الفرصة!`
              },
              'deadline',
              `/scholarships/${scholarship._id}`
            );
          }
        }
      }
    } catch (error) {
      console.error('Error in deadline cron job:', error);
    }
  });

  // Run AI scholarship hunter based on settings
  // Default: every day at 9:00 AM, configurable from admin dashboard
  const scheduleHunter = async () => {
    try {
      const settings = await BotSettings.getSettings();
      if (settings.huntEnabled) {
        console.log(`[Hunter] Running with schedule: ${settings.huntSchedule}`);
        await runScholarshipHunt();
      }
    } catch (error: any) {
      console.error('[Hunter] Schedule error:', error.message);
    }
  };

  // Check every hour if we need to run the hunt
  cron.schedule('0 * * * *', async () => {
    try {
      const settings = await BotSettings.getSettings();
      if (!settings.huntEnabled) return;

      const now = new Date();
      const cronParts = settings.huntSchedule.split(' ');
      const hour = now.getHours();
      const minute = now.getMinutes();
      const dayOfMonth = now.getDate();
      const month = now.getMonth() + 1;
      const dayOfWeek = now.getDay();

      // Simple cron matching (supports: minute hour dayOfMonth month dayOfWeek)
      const matchField = (cronVal: string, actual: number): boolean => {
        if (cronVal === '*') return true;
        if (cronVal.includes(',')) return cronVal.split(',').some(v => matchField(v.trim(), actual));
        if (cronVal.includes('-')) {
          const [start, end] = cronVal.split('-').map(Number);
          return actual >= start && actual <= end;
        }
        if (cronVal.includes('/')) {
          const [, step] = cronVal.split('/');
          return actual % parseInt(step) === 0;
        }
        return parseInt(cronVal) === actual;
      };

      if (
        matchField(cronParts[0], minute) &&
        matchField(cronParts[1], hour) &&
        matchField(cronParts[2], dayOfMonth) &&
        matchField(cronParts[3], month) &&
        matchField(cronParts[4], dayOfWeek)
      ) {
        console.log('[Hunter] Cron triggered, running hunt...');
        await runScholarshipHunt();
      }
    } catch (error: any) {
      console.error('[Hunter] Cron check error:', error.message);
    }
  });
};
