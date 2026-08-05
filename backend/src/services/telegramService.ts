import axios from 'axios';

const getApiUrl = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export const sendTelegramMessage = async (
  chatId: string,
  text: string,
  replyMarkup?: any
): Promise<boolean> => {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
      console.log('Telegram bot not configured, skipping');
      return false;
    }

    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    await axios.post(`${getApiUrl()}/sendMessage`, payload);
    console.log(`Telegram message sent to ${chatId}`);
    return true;
  } catch (error: any) {
    console.error('Telegram send error:', error.message);
    console.error('Chat ID:', chatId);
    console.error('Response data:', error.response?.data);
    return false;
  }
};

export const answerCallbackQuery = async (callbackQueryId: string, text?: string): Promise<void> => {
  try {
    await axios.post(`${getApiUrl()}/answerCallbackQuery`, {
      callback_query_id: callbackQueryId,
      text: text || '',
    });
  } catch (error: any) {
    console.error('Answer callback error:', error.message);
  }
};

export const editMessageText = async (
  chatId: string,
  messageId: number,
  text: string,
  replyMarkup?: any
): Promise<void> => {
  try {
    const payload: any = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    await axios.post(`${getApiUrl()}/editMessageText`, payload);
  } catch (error: any) {
    console.error('Edit message error:', error.message);
  }
};

export const sendScholarshipNotification = async (
  chatId: string,
  scholarshipTitle: string,
  university: string,
  submittedBy: string,
  scholarshipId: string
): Promise<boolean> => {
  const message = [
    '🎓 <b>منحة جديدة للمراجعة</b>',
    '',
    `📚 <b>المنحة:</b> ${scholarshipTitle}`,
    `🏛 <b>الجامعة:</b> ${university}`,
    `👤 <b>قام بالتقديم:</b> ${submittedBy}`,
    '',
    'اضغط على زر الموافقة أو الرفض:',
  ].join('\n');

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ قبول', callback_data: `accept:${scholarshipId}` },
        { text: '❌ رفض', callback_data: `reject:${scholarshipId}` },
      ],
    ],
  };

  return sendTelegramMessage(chatId, message, replyMarkup);
};

export const sendNewScholarshipEmail = async (
  to: string,
  scholarshipTitle: string,
  university: string,
  submittedBy: string
): Promise<boolean> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">ScholarNest</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1f2937; margin-top: 0;">🎓 منحة جديدة للمراجعة</h2>
        <p style="color: #4b5563; line-height: 1.6;">تم تقديم منحة جديدة تحتاج مراجعتها:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #374151;">المنحة:</td>
            <td style="padding: 8px; color: #4b5563;">${scholarshipTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #374151;">الجامعة:</td>
            <td style="padding: 8px; color: #4b5563;">${university}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold; color: #374151;">قام بالتقديم:</td>
            <td style="padding: 8px; color: #4b5563;">${submittedBy}</td>
          </tr>
        </table>
        <div style="text-align: center; margin-top: 30px;">
          <a href="http://localhost:5173/admin/scholarships" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">مراجعة الآن</a>
        </div>
      </div>
      <div style="text-align: center; padding: 15px; color: #9ca3af; font-size: 12px;">
        <p>إشعار تلقائي من ScholarNest</p>
      </div>
    </div>
  `;

  const { sendEmail } = await import('./emailService');
  return sendEmail(to, `منحة جديدة: ${scholarshipTitle} - ScholarNest`, html);
};
