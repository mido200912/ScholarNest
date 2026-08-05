import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useToast } from '../components/ui/Toast';
import axios from 'axios';
import {
  FileText, PenLine, Send, Loader2, Copy, CheckCircle,
  ChevronRight, Lightbulb, BookOpen, MessageSquare
} from 'lucide-react';

import { API_BASE as API } from '../config/api';

export default function CoverLetterAssistant() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState<'learn' | 'review'>('learn');
  const [letter, setLetter] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReview = async () => {
    if (!letter.trim()) {
      toastError(isAr ? 'اكتب الخطاب' : 'Write your letter', isAr ? 'الصق خطاب النية في المربع' : 'Paste your cover letter in the text box');
      return;
    }
    setLoading(true);
    setFeedback('');
    try {
      const { data } = await axios.post(`${API}/ai/chat`, {
        messages: [
          {
            role: 'user',
            content: `You are an expert scholarship cover letter reviewer. Review the following cover letter and provide detailed feedback in both Arabic and English. Structure your response as follows:

## Overall Assessment
Rate the letter (Weak / Good / Excellent) and give a brief summary.

## Strengths
List 2-3 things the letter does well.

## Areas for Improvement
List specific issues with the letter (vague language, missing elements, weak opening, etc.)

## Suggested Improvements
Provide a rewritten/improved version of the paragraph or section that needs the most work.

## Final Tips
Give 2-3 actionable tips to make this letter stronger.

---

COVER LETTER TO REVIEW:
${letter}`
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      setFeedback(data.message?.content || 'No feedback generated.');
    } catch {
      toastError('Error', isAr ? 'فشل في تحليل الخطاب' : 'Failed to analyze the letter');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(feedback.replace(/[#*`]/g, ''));
    setCopied(true);
    toastSuccess(isAr ? 'تم النسخ' : 'Copied!', '');
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = [
    {
      icon: BookOpen,
      title: isAr ? 'الهيكل الأساسي' : 'Basic Structure',
      items: isAr ? [
        'الفقرة الأولى: المقدمة والهدف من الكتابة',
        'الثانية: لماذا أنت مناسب للبرنامج',
        'الثالثة: خبراتك وإنجازاتك',
        'الرابعة: أهدافك المستقبلية',
        'الخامسة: الخاتمة وطلب المتابعة',
      ] : [
        'Paragraph 1: Introduction & purpose',
        'Paragraph 2: Why you fit the program',
        'Paragraph 3: Your experience & achievements',
        'Paragraph 4: Future goals',
        'Paragraph 5: Closing & call to action',
      ]
    },
    {
      icon: Lightbulb,
      title: isAr ? 'نصائح مهمة' : 'Key Tips',
      items: isAr ? [
        'خصص كل خطاب للمنحة المحددة — لا تستخدم خطاباً واحداً للكل',
        'ابدأ بجملة قوية تجذب الانتباه',
        'استخدم أمثلة محددة من حياتك بدلاً من العبارات العامة',
        'أظهر كيف ستفيد أنت والمجتمع من هذه المنحة',
        'راجع القواعد الإملائية والنحوية',
      ] : [
        'Tailor each letter to the specific scholarship — never use one for all',
        'Start with a strong opening sentence',
        'Use specific examples instead of generic statements',
        'Show how you and the community will benefit',
        'Proofread for grammar and spelling errors',
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <PenLine className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground">
                {isAr ? 'مساعد خطاب النية' : 'Cover Letter Assistant'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isAr ? 'تعلم كيف تكتب خطاب نية احترافي واحصل على تقييم فوري' : 'Learn to write a professional cover letter and get instant feedback'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('learn')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'learn'
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
          >
            <BookOpen className="w-4 h-4" />
            {isAr ? 'تعلم الكتابة' : 'How to Write'}
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeTab === 'review'
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
          >
            <MessageSquare className="w-4 h-4" />
            {isAr ? 'قيّم خطابي' : 'Review My Letter'}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            LEARN TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'learn' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="space-y-6">
              {sections.map((section, idx) => (
                <Card key={idx} className="border-border shadow-none bg-card rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <section.icon className="w-5 h-5 text-red-500" />
                      </div>
                      <h3 className="font-bold text-foreground">{section.title}</h3>
                    </div>
                    <ul className="space-y-3">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <ChevronRight className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}

              {/* Example Paragraph */}
              <Card className="border-border shadow-none bg-card rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="font-bold text-foreground">
                      {isAr ? 'مثال على مقدمة قوية' : 'Strong Opening Example'}
                    </h3>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground leading-relaxed font-light italic">
                    {isAr
                      ? '"أنا متحمس لتقديم طلبي لمنحة DAAD للدراسات العليا في الهندسة الكهربائية. خلال دراستي للبكالوريوس، قادت فريقاً من 5 طلاب لتطوير نظام ذكاء اصطناعي لتشخيص الأمراض، وهو مشروع فاز بالجائزة الأولى في مسابقة الابتكار nationally. أرى أن هذه المنحة تمثل فرصة فريدة لتطوير مهاراتي في بيئة أكاديمية عالمية."'
                      : '"I am excited to apply for the DAAD Graduate Scholarship in Electrical Engineering. During my undergraduate studies, I led a team of 5 students to develop an AI-powered disease diagnosis system, which won first place in a national innovation competition. I believe this scholarship represents a unique opportunity to advance my skills in a world-class academic environment."'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            REVIEW TAB
            ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'review' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-border shadow-none bg-card rounded-2xl mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="font-bold text-foreground">
                    {isAr ? 'الصق خطابك هنا' : 'Paste Your Cover Letter'}
                  </h3>
                </div>
                <textarea
                  value={letter}
                  onChange={e => setLetter(e.target.value)}
                  rows={12}
                  placeholder={isAr
                    ? 'الصق خطاب النية بتاعك هنا...\n\nالمساعد الذكي هايقيملك:\n- تقييم عام للخطاب\n- نقاط القوة\n- اقتراحات التحسين\n- نسخة محسنة من الفقرات الضعيفة'
                    : 'Paste your cover letter here...\n\nThe AI assistant will provide:\n- Overall assessment\n- Strengths\n- Areas for improvement\n- Rewritten sections'}
                  className="w-full border border-input bg-background p-4 rounded-xl text-sm shadow-none resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    {letter.length > 0 ? `${letter.split(/\s+/).filter(Boolean).length} words` : ''}
                  </span>
                  <Button
                    onClick={handleReview}
                    disabled={loading || !letter.trim()}
                    className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold px-6"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isAr ? 'جاري التحليل...' : 'Analyzing...'}</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> {isAr ? 'قيّم الخطاب' : 'Review Letter'}</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Result */}
            {feedback && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border shadow-none bg-card rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <h3 className="font-bold text-foreground">
                          {isAr ? 'تقييم الخطاب' : 'Letter Review'}
                        </h3>
                      </div>
                      <Button onClick={handleCopy} variant="outline" size="sm" className="rounded-lg text-xs">
                        {copied ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                        {copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}
                      </Button>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {feedback}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
