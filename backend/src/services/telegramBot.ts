import axios from 'axios';
import mongoose from 'mongoose';
import { Scholarship } from '../models/Scholarship';
import { answerCallbackQuery, editMessageText, sendTelegramMessage } from './telegramService';
import { sendEmail } from './emailService';
import { pendingHuntScholarships, saveAcceptedScholarship, generatePromotionalContent } from './scholarshipHunterService';

const getApiUrl = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173';

let offset = 0;
let polling = false;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDaysLeft = (deadline: Date) => {
  const diff = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'انتهت';
  if (diff === 0) return 'اليوم!';
  return `${diff} يوماً متبقياً`;
};

const searchScholarships = async (query: string) => {
  const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return Scholarship.find({
    status: 'approved',
    deadline: { $gt: new Date() },
    $or: [
      { 'title.en': searchRegex },
      { 'title.ar': searchRegex },
      { 'university.en': searchRegex },
      { 'university.ar': searchRegex },
      { 'country.en': searchRegex },
      { 'country.ar': searchRegex },
      { keywords: searchRegex },
    ],
  })
    .select('title university country degree fundingType deadline link')
    .sort({ deadline: 1 })
    .limit(5);
};

const formatScholarshipMsg = (s: any, ar: boolean) => {
  const title = ar ? s.title.ar || s.title.en : s.title.en || s.title.ar;
  const uni = ar ? s.university.ar || s.university.en : s.university.en || s.university.ar;
  const country = ar ? s.country.ar || s.country.en : s.country.en || s.country.ar;
  return [
    `🎓 <b>${escapeHtml(title)}</b>`,
    `🏛 ${escapeHtml(uni)} — ${escapeHtml(country)}`,
    `💰 ${s.fundingType} • ${s.degree} • ⏳ ${formatDaysLeft(s.deadline)}`,
    `🔗 <a href="${s.link}">التقديم</a> | <a href="${SITE_URL}/scholarships/${s._id}">التفاصيل</a>`,
  ].join('\n');
};

const handleTextMessage = async (chatIdRaw: number | string, text: string) => {
  const chatId = String(chatIdRaw);
  const input = text.trim();
  const isAr = /[\u0600-\u06FF]/.test(input);

  if (input === '/start' || input === '/help') {
    await sendTelegramMessage(
      chatId,
      [
        '🎓 <b>أهلاً بك في بوت ScholarNest!</b>',
        '',
        'يمكنك البحث عن المنح مباشرة من هنا:',
        '• اكتب أي كلمة: بلد، تخصص، أو اسم منحة',
        '  (مثال: <code>ألمانيا</code> أو <code>هندسة</code>)',
        '',
        '⚡ <b>الأوامر:</b>',
        '/latest — أحدث 5 منح تنتهي قريباً',
        '/top — المنح الممولة بالكامل',
        '/help — هذه الرسالة',
      ].join('\n')
    );
    return;
  }

  if (input === '/latest') {
    const docs = await Scholarship.find({ status: 'approved', deadline: { $gt: new Date() } })
      .select('title university country degree fundingType deadline link')
      .sort({ deadline: 1 })
      .limit(5);

    if (!docs.length) {
      await sendTelegramMessage(chatId, 'لا توجد منح مفتوحة حالياً 📭');
      return;
    }

    for (const s of docs) {
      await sendTelegramMessage(chatId, formatScholarshipMsg(s, true));
    }
    return;
  }

  if (input === '/top') {
    const top = await Scholarship.find({
      status: 'approved',
      deadline: { $gt: new Date() },
      fundingType: 'Fully Funded',
    })
      .select('title university country degree fundingType deadline link')
      .sort({ deadline: 1 })
      .limit(5);

    if (!top.length) {
      await sendTelegramMessage(chatId, 'لا توجد منح ممولة بالكامل حالياً 📭');
      return;
    }

    for (const s of top) {
      await sendTelegramMessage(chatId, formatScholarshipMsg(s, true));
    }
    return;
  }

  const docs = await searchScholarships(input);

  if (!docs.length) {
    await sendTelegramMessage(
      chatId,
      [
        `🔍 لا توجد نتائج لـ "${escapeHtml(input)}"`,
        '',
        `جرب كلمات أخرى، أو تصفح كل المنح: ${SITE_URL}/search`,
      ].join('\n')
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    `🔍 وجدت <b>${docs.length === 5 ? '5+' : docs.length}</b> نتيجة — أعرض الأهم أولاً:`
  );
  for (const s of docs) {
    await sendTelegramMessage(chatId, formatScholarshipMsg(s, isAr));
  }
};

const handleCallbackQuery = async (callbackQuery: any) => {
  const { id, message, data } = callbackQuery;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;

  if (!data || !chatId || !messageId) return;

  const [action, payload] = data.split(':');

  // ── Handle Hunt Accept/Reject ──────────────────────────────────────────────
  if (action === 'hunt_accept' || action === 'hunt_reject') {
    let scholarshipData = pendingHuntScholarships.get(payload);
    let scholarshipDoc: any = null;

    if (mongoose.Types.ObjectId.isValid(payload)) {
      try {
        scholarshipDoc = await Scholarship.findById(payload);
        if (scholarshipDoc && !scholarshipData) {
          scholarshipData = {
            titleEn: scholarshipDoc.title.en,
            titleAr: scholarshipDoc.title.ar,
            universityEn: scholarshipDoc.university.en,
            universityAr: scholarshipDoc.university.ar,
            countryEn: scholarshipDoc.country.en,
            countryAr: scholarshipDoc.country.ar,
            fundingType: scholarshipDoc.fundingType,
            degree: scholarshipDoc.degree,
            deadline: scholarshipDoc.deadline,
            link: scholarshipDoc.link,
            descriptionEn: scholarshipDoc.description.en,
            descriptionAr: scholarshipDoc.description.ar,
          };
        }
      } catch (e: any) {
        console.warn('[Hunt Callback] DB lookup failed:', e.message);
      }
    }

    if (!scholarshipDoc && !scholarshipData) {
      await answerCallbackQuery(id, 'المنحة لم تعد متاحة');
      return;
    }

    pendingHuntScholarships.delete(payload);

    if (action === 'hunt_reject') {
      if (scholarshipDoc) {
        scholarshipDoc.status = 'rejected';
        await scholarshipDoc.save();
      }
      const title = scholarshipData?.titleEn || scholarshipDoc?.title?.en || 'المنحة';
      const newText = [
        `🎓 <b>${escapeHtml(title)}</b>`,
        '',
        '❌ <b>تم الرفض</b>',
      ].join('\n');

      await editMessageText(chatId, messageId, newText);
      await answerCallbackQuery(id, 'تم رفض المنحة');
      return;
    }

    // Accept flow: save/approve in DB + generate promo content
    await answerCallbackQuery(id, 'جاري الحفظ وتوليد المحتوى الترويجي...');
    await editMessageText(chatId, messageId, '⏳ <b>جاري الحفظ في قاعدة البيانات وتوليد المحتوى الترويجي...</b>');

    try {
      const saved = await saveAcceptedScholarship(scholarshipDoc || scholarshipData);
      const title = saved.title.en || scholarshipData?.titleEn || 'المنحة';

      const newText = [
        `🎓 <b>${escapeHtml(title)}</b>`,
        '',
        '✅ <b>تم القبول والحفظ والمحتوى الترويجي جاهز!</b>',
        '',
        `🔗 <a href="${SITE_URL}/scholarships/${saved._id}">عرض على الموقع</a>`,
      ].join('\n');

      await editMessageText(chatId, messageId, newText);

      // Generate promotional content
      const promo = await generatePromotionalContent(saved);

      // Send Arabic promo
      await sendTelegramMessage(chatId, [
        '📣 <b>المنشور الترويجي (عربي)</b>',
        'للنشر على: واتساب + فيسبوك + الكوميونتي',
        '─────────────────',
        '',
        promo.arabic,
        '',
        '─────────────────',
        '📋 انسخ النص أعلاه والصقه في الواتساب والفيسبوك',
      ].join('\n'));

      // Send English promo
      await sendTelegramMessage(chatId, [
        '📣 <b>Promotional Post (English)</b>',
        'For: WhatsApp + Facebook + Community',
        '─────────────────',
        '',
        promo.english,
        '',
        '─────────────────',
        '📋 Copy the text above and paste it on WhatsApp & Facebook',
      ].join('\n'));

    } catch (error: any) {
      console.error('[Hunt Accept] Error:', error.message);
      const title = scholarshipData?.titleEn || 'المنحة';
      await editMessageText(chatId, messageId, [
        `🎓 <b>${escapeHtml(title)}</b>`,
        '',
        '❌ <b>حدث خطأ أثناء الحفظ</b>',
        '',
        `الخطأ: ${escapeHtml(error.message?.substring(0, 100))}`,
      ].join('\n'));
    }

    return;
  }

  // ── Handle Regular Accept/Reject (existing flow) ──────────────────────────
  if (!['accept', 'reject'].includes(action) || !payload) return;

  try {
    const scholarship = await Scholarship.findById(payload).populate('submittedBy', 'name email');

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
      } else if (update.message?.text) {
        const chatId = update.message.chat?.id;
        const text = update.message.text;
        if (chatId && text) {
          try {
            await handleTextMessage(chatId, text);
          } catch (err: any) {
            console.error('Text message handler error:', err.message);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Polling error:', error.message);
  } finally {
    polling = false;
  }
};

export const startBotPolling = () => {
  // Only poll in production (Railway). In development, Railway already handles it.
  if (process.env.NODE_ENV !== 'production') {
    console.log('⏭️ Telegram bot polling skipped (development mode - Railway handles this in production)');
    return;
  }
  console.log('🤖 Telegram bot polling started');
  setInterval(pollUpdates, 2000);
  pollUpdates();
};
