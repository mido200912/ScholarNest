import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Bot, User as UserIcon, PlayCircle, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';

const API = 'https://scholarnest.up.railway.app/api';

export default function InterviewSimulator() {
  const { user } = useAuthStore();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const token = user?.token;

  // Saved scholarships list
  const [savedScholarships, setSavedScholarships] = useState<any[]>([]);
  const [loadingScholarships, setLoadingScholarships] = useState(true);

  // Selected scholarship & chat
  const [selectedScholarship, setSelectedScholarship] = useState<any>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch saved scholarships
  useEffect(() => {
    if (!token) return;
    setLoadingScholarships(true);
    axios.get(`${API}/applications`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        // res.data.data = { saved: [...], applying: [...], accepted: [...] }
        const data = res.data.data;
        const all: any[] = [
          ...(data.saved || []),
          ...(data.applying || []),
          ...(data.accepted || []),
        ];
        // Extract the populated scholarship object from each application
        const scholarships = all
          .map((app: any) => app.scholarship)
          .filter(Boolean);
        // Deduplicate by _id
        const unique = scholarships.filter(
          (s: any, idx: number, arr: any[]) => arr.findIndex(x => x._id === s._id) === idx
        );
        setSavedScholarships(unique);
      })
      .catch(console.error)
      .finally(() => setLoadingScholarships(false));
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startInterview = async (scholarship: any) => {
    setSelectedScholarship(scholarship);
    setMessages([]);
    setLoading(true);

    try {
      const response = await axios.post(`${API}/ai/interview`, {
        scholarship,
        history: []
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000
      });
      setMessages([{ role: 'assistant', content: response.data.data }]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to get AI response';
      setMessages([{
        role: 'assistant',
        content: isAr
          ? `عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي:\n\n${errorMsg}\n\n\nمرحباً! أنا هنا لمساعدتك في التحضير لمقابلة منحة "${scholarship.title.ar}". لنبدأ! \n\nسؤالي الأول: لماذا تريد الدراسة في ${scholarship.country.ar} تحديداً؟`
          : `Sorry, there was an error connecting to AI:\n\n${errorMsg}\n\n\nHello! I'm here to help you prepare for your "${scholarship.title.en}" scholarship interview. Let's begin!\n\nMy first question: Why do you specifically want to study in ${scholarship.country.en}?`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user' as const, content: input };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/ai/interview`, {
        scholarship: selectedScholarship,
        history: updatedHistory
      }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000
      });
      setMessages([...updatedHistory, { role: 'assistant', content: response.data.data }]);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to get AI response';
      setMessages([...updatedHistory, {
        role: 'assistant',
        content: isAr
          ? `عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي:\n${errorMsg}`
          : `Sorry, there was an error connecting to AI:\n${errorMsg}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">Please log in to use the Interview Simulator</h2>
        <Link to="/login"><Button className="rounded-xl bg-red-600 text-white">Login</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Top Bar */}
      <div className="border-b border-border bg-card shadow-sm sticky top-16 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-red-500" />
            <h1 className="font-bold text-lg">
              {selectedScholarship
                ? (isAr ? selectedScholarship.title.ar : selectedScholarship.title.en)
                : (isAr ? 'محادثة المقابلة التجريبية' : 'Mock Interview Chat')}
            </h1>
          </div>
          {selectedScholarship && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedScholarship(null); setMessages([]); }}
              className="ml-auto rounded-xl text-xs"
            >
              {isAr ? 'اختر منحة أخرى' : 'Change Scholarship'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col">
        {!selectedScholarship ? (
          /* ── Scholarship Picker ── */
          <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {isAr ? 'اختر منحة لبدء المحادثة' : 'Choose a Scholarship to Start Chat'}
              </h2>
              <p className="text-muted-foreground">
                {isAr
                  ? 'سيقوم مساعد الذكاء الاصطناعي بطرح أسئلة مقابلة مخصصة بناءً على المنحة التي تختارها'
                  : 'The AI assistant will ask tailored interview questions based on the scholarship you select'}
              </p>
            </div>

            {loadingScholarships ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : savedScholarships.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-border rounded-2xl text-center text-muted-foreground">
                <p className="mb-2 font-medium">
                  {isAr ? 'لم تقم بحفظ أي منح بعد' : 'You haven\'t saved any scholarships yet'}
                </p>
                <Link to="/search" className="text-red-600 hover:underline text-sm">
                  {isAr ? 'ابحث عن منح الآن' : 'Find Scholarships'}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground mb-2">
                  {isAr ? 'المنح المحفوظة:' : 'Your Saved Scholarships:'}
                </p>
                {savedScholarships.map(s => (
                  <button
                    key={s._id}
                    onClick={() => startInterview(s)}
                    className="w-full p-4 border border-border bg-card rounded-xl hover:border-red-400 hover:shadow-md transition-all flex items-center justify-between group text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">
                        {isAr ? s.title.ar : s.title.en}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {isAr ? s.university.ar : s.university.en} · {isAr ? s.country.ar : s.country.en}
                      </p>
                    </div>
                    <PlayCircle className="w-7 h-7 text-red-200 group-hover:text-red-500 transition-colors shrink-0 ml-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Chat Interface ── */
          <div className="flex-1 flex flex-col border border-border rounded-2xl bg-card shadow-sm overflow-hidden min-h-[500px]">

            {/* Chat Messages */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-50 dark:bg-slate-900/40">
              {messages.length === 0 && loading && (
                <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                  <Bot className="w-5 h-5 animate-bounce text-red-500" />
                  <span>{isAr ? 'يتم إعداد أول سؤال...' : 'Preparing your first question...'}</span>
                </div>
              )}

              {messages.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''} max-w-[88%] ${m.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 text-white font-bold ${m.role === 'user' ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {m.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed shadow-sm ${m.role === 'user'
                      ? 'bg-red-600 text-white rounded-tr-sm'
                      : 'bg-white dark:bg-slate-800 border border-border text-foreground rounded-tl-sm'
                    }`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}

              {loading && messages.length > 0 && (
                <div className="flex gap-3 max-w-[88%]">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                    <span className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 bg-card border-t border-border flex gap-3 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isAr ? 'اكتب إجابتك هنا...' : 'Type your answer here... (Shift+Enter for newline)'}
                rows={2}
                className="flex-1 resize-none bg-background border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-11 w-11 p-0 rounded-xl bg-red-600 hover:bg-red-700 text-white shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
