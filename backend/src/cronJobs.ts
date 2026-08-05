import cron from 'node-cron';
import { Application } from './models/Application';
import { Scholarship } from './models/Scholarship';
import { createNotification } from './controllers/notificationController';

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

export const startCronJobs = () => {
  // Run expired scholarships cleanup every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily expired scholarship cleanup...');
    await cleanupExpiredScholarships();
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
};
