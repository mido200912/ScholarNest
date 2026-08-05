import axios from 'axios';
import { Scholarship } from '../models/Scholarship';
import { answerCallbackQuery, editMessageText, sendTelegramMessage } from './telegramService';
import { sendEmail } from './emailService';

const getApiUrl = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

let offset = 0;
let polling = false;

const handleCallbackQuery = async (callbackQuery: any) => {
  const { id, message, data } = callbackQuery;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;

  if (!data || !chatId || !messageId) return;

  const [action, scholarshipId] = data.split(':');

  if (!['accept', 'reject'].includes(action) || !scholarshipId) return;

  try {
    const scholarship = await Scholarship.findById(scholarshipId).populate('submittedBy', 'name email');

    if (!scholarship) {
      await answerCallbackQuery(id, 'المنحة لم تعد موجودة');
      return;
    }

    const newStatus = action === 'accept' ? 'approved' : 'rejected';
    const statusText = action === 'accept' ? 'تم القبول ✅' : 'تم الرفض ❌';

    scholarship.status = newStatus as any;
    await scholarship.save();

    const newText = [
      `🎓 <b>المنحة: ${scholarship.title.en}</b>`,
      `🏛 <b>الجامعة:</b> ${scholarship.university.en}`,
      '',
      `<b>الحالة:</b> ${statusText}`,
    ].join('\n');

    await editMessageText(chatId, messageId, newText);
    await answerCallbackQuery(id, statusText);

    const submitter = scholarship.submittedBy as any;
    if (submitter?.email) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${action === 'accept' ? '#16a34a' : '#dc2626'}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">ScholarNest</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">${statusText}</h2>
            <p style="color: #4b5563; line-height: 1.6;">مرحباً ${submitter.name},</p>
            <p style="color: #4b5563; line-height: 1.6;">تم ${action === 'accept' ? 'قبول' : 'رفض'} منحتك "<b>${scholarship.title.en}</b>" في ${scholarship.university.en}.</p>
          </div>
          <div style="text-align: center; padding: 15px; color: #9ca3af; font-size: 12px;">
            <p>إشعار تلقائي من ScholarNest</p>
          </div>
        </div>
      `;
      sendEmail(submitter.email, `${statusText} - ${scholarship.title.en}`, emailHtml).catch(() => {});
    }
  } catch (error: any) {
    console.error('Callback handler error:', error.message);
    await answerCallbackQuery(id, 'حدث خطأ');
  }
};

const pollUpdates = async () => {
  if (polling) return;
  polling = true;

  try {
    if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
      polling = false;
      return;
    }

    const response = await axios.get(`${getApiUrl()}/getUpdates`, {
      params: { offset, timeout: 5 },
    });

    const updates = response.data.result || [];

    for (const update of updates) {
      offset = update.update_id + 1;

      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
      }
    }
  } catch (error: any) {
    console.error('Polling error:', error.message);
  } finally {
    polling = false;
  }
};

export const startBotPolling = () => {
  console.log('🤖 Telegram bot polling started');
  setInterval(pollUpdates, 2000);
  pollUpdates();
};
