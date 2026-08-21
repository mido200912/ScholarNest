import { Application } from '../models/Application';
import { Comment } from '../models/Comment';
import { IUser } from '../models/User';

export interface QuestDef {
  id: string;
  type: 'save_scholarships' | 'apply_scholarships' | 'add_documents' | 'write_comments' | 'complete_profile';
  target: number;
  points: number;
  icon: string;
  title: { en: string; ar: string };
  desc: { en: string; ar: string };
}

export const WEEKLY_BONUS_POINTS = 100;

const QUEST_POOL: QuestDef[] = [
  {
    id: 'quest_save_3',
    type: 'save_scholarships',
    target: 3,
    points: 50,
    icon: '🔖',
    title: { en: 'Scholarship Hunter', ar: 'صائد المنح' },
    desc: { en: 'Save 3 scholarships this week', ar: 'احفظ 3 منح هذا الأسبوع' },
  },
  {
    id: 'quest_apply_1',
    type: 'apply_scholarships',
    target: 1,
    points: 60,
    icon: '🚀',
    title: { en: 'Take the Leap', ar: 'اتخذ الخطوة' },
    desc: { en: 'Mark 1 scholarship as "In Progress"', ar: 'حوّل منحة واحدة إلى "قيد التقديم"' },
  },
  {
    id: 'quest_profile',
    type: 'complete_profile',
    target: 1,
    points: 50,
    icon: '⭐',
    title: { en: 'Complete Your Profile', ar: 'أكمل ملفك الشخصي' },
    desc: { en: 'Fill in major, GPA, English level and target countries', ar: 'أدخل التخصص والمعدل ومستوى اللغة والدول المستهدفة' },
  },
  {
    id: 'quest_docs',
    type: 'add_documents',
    target: 1,
    points: 50,
    icon: '📎',
    title: { en: 'Paper Trail', ar: 'جهّز أوراقك' },
    desc: { en: 'Attach a document to any tracked application', ar: 'أرفق مستنداً لأي منحة تتابعها' },
  },
  {
    id: 'quest_comment',
    type: 'write_comments',
    target: 1,
    points: 40,
    icon: '💬',
    title: { en: 'Community Voice', ar: 'صوت المجتمع' },
    desc: { en: 'Post a comment on any scholarship', ar: 'اكتب تعليقاً على أي منحة' },
  },
  {
    id: 'quest_save_5',
    type: 'save_scholarships',
    target: 5,
    points: 70,
    icon: '🎯',
    title: { en: 'Marathon Explorer', ar: 'مستكشف مثابر' },
    desc: { en: 'Save 5 scholarships this week', ar: 'احفظ 5 منح هذا الأسبوع' },
  },
];

const dateToWeekNo = (d: Date): number => {
  const start = new Date(Date.UTC(d.getFullYear(), 0, 1));
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
  return Math.ceil(dayOfYear / 7);
};

export const getWeekKey = (date: Date = new Date()): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekNo = dateToWeekNo(d);
  return `${date.getFullYear()}-W${weekNo}`;
};

export const getWeekRange = (date: Date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() - diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
};

export const getWeeklyQuests = (date: Date = new Date()): QuestDef[] => {
  const weekNo = dateToWeekNo(date);
  const len = QUEST_POOL.length;
  const picks = [
    QUEST_POOL[weekNo % len],
    QUEST_POOL[(weekNo + 2) % len],
    QUEST_POOL[(weekNo + 4) % len],
  ];
  const unique: QuestDef[] = [];
  for (const q of picks) {
    if (!unique.find(u => u.id === q.id)) unique.push(q);
  }
  while (unique.length < 3) {
    const next = QUEST_POOL.find(q => !unique.find(u => u.id === q.id));
    if (!next) break;
    unique.push(next);
  }
  return unique;
};

export const getQuestProgressValue = async (quest: QuestDef, user: IUser): Promise<number> => {
  const { start, end } = getWeekRange();
  const range = { $gte: start, $lt: end };

  switch (quest.type) {
    case 'save_scholarships':
      return Application.countDocuments({ user: user._id, createdAt: range });
    case 'apply_scholarships':
      return Application.countDocuments({ user: user._id, appliedAt: range });
    case 'add_documents':
      return Application.countDocuments({
        user: user._id,
        documents: { $exists: true, $ne: [] },
        updatedAt: range,
      });
    case 'write_comments':
      return Comment.countDocuments({ user: user._id, createdAt: range });
    case 'complete_profile':
      return user.major && user.gpa && user.englishLevel && user.targetCountries?.length
        ? 1
        : 0;
    default:
      return 0;
  }
};
