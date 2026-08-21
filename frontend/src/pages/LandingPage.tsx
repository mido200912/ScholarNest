import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import {
  ArrowRight, Search, Brain, Scale, Users,
  Bell, Star, Globe, GraduationCap, Sparkles,
  CheckCircle, ChevronRight, ChevronDown, Trophy, Target, Rocket, Shield,
  MessageSquare, Bot, Zap, LayoutDashboard, HelpCircle, FileText,
  Heart, Award, Mail, Send, MapPin, Clock, TrendingUp
} from 'lucide-react';
import { useRef, useEffect, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';
import { API_BASE } from '../config/api';

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    let frame = 0;
    const totalFrames = 108;
    const timer = setInterval(() => {
      frame++;
      const eased = 1 - Math.pow(1 - frame / totalFrames, 3);
      setCount(Math.floor(eased * target));
      if (frame >= totalFrames) { setCount(target); clearInterval(timer); }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [started, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

function SpotlightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const onMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden group ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500 z-0"
        style={{
          opacity,
          background: `radial-gradient(550px circle at ${pos.x}px ${pos.y}px, rgba(239,68,68,0.08), transparent 45%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isRtl = i18n.language === 'ar';
  const { scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  const [spotPos, setSpotPos] = useState({ x: 50, y: 30 });
  const [liveCount, setLiveCount] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 40);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 40);
      setSpotPos({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
    };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/scholarships?limit=1`)
      .then(res => res.json())
      .then(json => {
        const total = json?.pagination?.total ?? json?.total ?? json?.data?.length;
        if (typeof total === 'number' && total > 0) setLiveCount(total);
      })
      .catch(() => {});
  }, []);

  const stats = [
    { value: liveCount || 50, suffix: '+', label: isRtl ? 'منحة موثقة' : 'Verified Scholarships', icon: Award },
    { value: 190, suffix: '+', label: isRtl ? 'دولة' : 'Countries', icon: Globe },
    { value: 48000, suffix: '+', label: isRtl ? 'طالب مسجل' : 'Students', icon: Users },
    { value: 95, suffix: '%', label: isRtl ? 'نسبة الرضا' : 'Satisfaction', icon: TrendingUp },
  ];

  const features = [
    { icon: Zap, title: isRtl ? 'تطابق فوري' : 'Instant Match', desc: isRtl ? 'خوارزمية ذكية تربطك بالمنح التي تناسب ملفك الشخصي بدقة عالية في ثوانٍ.' : 'Smart algorithm matches you with scholarships that perfectly fit your profile in seconds.', tint: 'text-amber-500' },
    { icon: Scale, title: isRtl ? 'مقارنة ذكية' : 'Smart Compare', desc: isRtl ? 'قارن بين ثلاث منح في آنٍ واحد بجدول تفصيلي واتخذ القرار الصحيح.' : 'Compare up to 3 scholarships side-by-side with detailed tables to make the best decision.', tint: 'text-blue-500' },
    { icon: MessageSquare, title: isRtl ? 'محاكي المقابلة' : 'Interview Prep', desc: isRtl ? 'تدرب على أسئلة المقابلة مع مدرب ذكي يعطيك تغذية راجعة فورية.' : 'Practice interview questions with an AI coach that gives instant, personalized feedback.', tint: 'text-purple-500' },
    { icon: Bell, title: isRtl ? 'تنبيهات ذكية' : 'Smart Alerts', desc: isRtl ? 'لا تفوتك أي موعد نهائي. سنخبرك قبل انتهاء كل منحة تماماُ.' : 'Never miss a deadline. Get notified before every scholarship closes automatically.', tint: 'text-emerald-500' },
    { icon: FileText, title: isRtl ? 'مساعد خطابات الدوافع' : 'Cover Letter AI', desc: isRtl ? 'ارفع مسودة خطابك واحصل على مراجعة احترافية وتغذية راجعة فورية.' : 'Upload your draft and get professional review with instant, actionable feedback.', tint: 'text-pink-500' },
  ];

  const steps = [
    { step: '01', icon: Users, title: t('howItWorks.step1_title'), desc: t('howItWorks.step1_desc') },
    { step: '02', icon: Search, title: t('howItWorks.step2_title'), desc: t('howItWorks.step2_desc') },
    { step: '03', icon: Trophy, title: t('howItWorks.step3_title'), desc: t('howItWorks.step3_desc') },
  ];

  const testimonials = [
    { name: isRtl ? 'سارة أحمد' : 'Sarah Ahmed', role: isRtl ? 'منحة DAAD • ألمانيا' : 'DAAD Scholar • Germany', text: isRtl ? 'بفضل ScholarNest حصلت على منحة كاملة في ألمانيا. محاكي المقابلة ساعدني كثيرا في التحضير!' : 'Thanks to ScholarNest, I got a full scholarship in Germany. The interview simulator prepared me perfectly!', a: 'S', c: 'from-red-500 to-red-600' },
    { name: isRtl ? 'محمد علي' : 'Mohamed Ali', role: isRtl ? 'منحة Chevening • بريطانيا' : 'Chevening Scholar • UK', text: isRtl ? 'المساعد الذكي راجع خطاب نواياي باحترافية وقُبلت به. المنصة الأفضل بلا منازع!' : 'The AI reviewed my cover letter professionally and I got accepted. Best platform I have ever used!', a: 'M', c: 'from-blue-500 to-blue-600' },
    { name: isRtl ? 'فاطمة حسن' : 'Fatima Hassan', role: isRtl ? 'منحة Erasmus • فرنسا' : 'Erasmus Scholar • France', text: isRtl ? 'قارنت بين 10 منح واستفدت من نصائح المجتمع. الآن أنا في فرنسا أكمل دراستي العليا!' : 'I compared 10 scholarships and got community tips. Now I am in France completing my Masters!', a: 'F', c: 'from-purple-500 to-violet-600' },
  ];

  const faqs = [
    {
      q: isRtl ? 'هل ScholarNest مجاني حقاً؟' : 'Is ScholarNest really free?',
      a: isRtl ? 'نعم، مجاني 100%. البحث والمقارنة والمساعد الذكي ومحاكي المقابلات كلها متاحة بدون أي رسوم أو بطاقة ائتمانية، الآن وإلى الأبد.' : 'Yes, 100% free. Search, compare, AI assistant and interview simulator are all available with no fees and no credit card — now and forever.',
    },
    {
      q: isRtl ? 'كيف يعمل التطابق الذكي مع المنح؟' : 'How does smart matching work?',
      a: isRtl ? 'بعد إكمال ملفك الشخصي (التخصص، المعدل، درجة اللغة، الدول المفضلة)، تحلل خوارزميتنا آلاف المنح وتعرض لك الأعلى توافقاً مع ملفك مع نسبة تطابق لكل منحة.' : 'Once you complete your profile (major, GPA, language score, preferred countries), our algorithm analyzes thousands of scholarships and ranks them by match score for you.',
    },
    {
      q: isRtl ? 'هل يكتب الذكاء الاصطناعي خطاب الدوافع بدلاً عني؟' : 'Does the AI write my motivation letter for me?',
      a: isRtl ? 'نؤمن بأصالة قصتك. لذلك نساعدك بالمراجعة والتحسين واقتراح الصياغة الأقوى، بينما يبقى الخطاب بصوتك أنت — وهذا بالضبط ما تبحث عنه لجان القبول.' : 'We believe in your authentic story. So we review, refine and suggest stronger phrasing while the letter stays in your voice — exactly what admission committees look for.',
    },
    {
      q: isRtl ? 'من أين تأتون بيانات المنح؟' : 'Where does the scholarship data come from?',
      a: isRtl ? 'قاعدة بياناتنا تُحدَّث باستمرار من المصادر الرسمية للجامعات والجهات المانحة، ويراجعها فريقنا يدوياً، كما يبحث مساعدنا الذكي في الإنترنت عن أحدث الفرص.' : 'Our database is continuously updated from official university and sponsor sources, manually reviewed by our team, and enriched by live AI web search for the newest opportunities.',
    },
    {
      q: isRtl ? 'هل التنبيهات تصلني على تليجرام والبريد؟' : 'Do alerts reach me on Telegram and email?',
      a: isRtl ? 'نعم. فعّل تنبيهاتك المتقدمة وسيصلك إشعار داخل الموقع، ورسالة بريد إلكتروني، ورسالة تلجرام عند اقتراب مواعيد المنح التي تناسبك أو حفظتها.' : 'Yes. Enable smart alerts to get in-app notifications, emails and Telegram messages when saved or matching scholarships approach their deadlines.',
    },
  ];

  const primaryCta = user ? (
    <Button
      size="lg"
      onClick={() => navigate('/dashboard')}
      className="h-14 px-8 rounded-2xl text-[15px] bg-red-600 hover:bg-red-500 text-white font-bold shadow-2xl shadow-red-600/30 w-full sm:w-auto group transition-all duration-300 hover:scale-[1.02] relative overflow-hidden"
    >
      <LayoutDashboard className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'}`} />
      {isRtl ? 'انتقل إلى لوحة التحكم' : 'Go to Dashboard'}
      <ArrowRight className={`w-5 h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'} group-hover:translate-x-1 transition-transform duration-300`} />
    </Button>
  ) : (
    <Button size="lg" onClick={() => navigate('/register')} className="h-14 px-8 rounded-2xl text-[15px] bg-red-600 hover:bg-red-500 text-white font-bold shadow-2xl shadow-red-600/30 w-full sm:w-auto group transition-all duration-300 hover:scale-[1.02]">
      {isRtl ? 'ابدأ مجانياً' : 'Start Free Today'}
      <ArrowRight className={`w-5 h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'} group-hover:translate-x-1 transition-transform duration-300`} />
    </Button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* SCROLL PROGRESS */}
      <motion.div
        style={{ scaleX: progressScale }}
        className="fixed top-0 inset-x-0 h-[3px] origin-left z-50 bg-gradient-to-r from-red-600 via-red-500 to-orange-500"
      />

      {/* HERO */}
      <section className="min-h-screen flex items-center relative overflow-hidden bg-background">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.15] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]" />
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ background: `radial-gradient(700px circle at ${spotPos.x}% ${spotPos.y}%, rgba(220,38,38,0.045), transparent 55%)` }}
          />
          <motion.div style={{ x: springX, y: springY }} className="absolute inset-0">
            <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-red-600/[0.05] blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-red-500/[0.04] blur-[120px] rounded-full" />
            <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-orange-500/[0.03] blur-[100px] rounded-full" />
          </motion.div>
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 py-32 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="max-w-2xl">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-500 bg-red-500/[0.06] border border-red-500/15 px-4 py-2 rounded-full mb-8 backdrop-blur-sm tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  {isRtl ? 'منصة المنح المدعومة بالذكاء الاصطناعي' : 'The AI-Powered Scholarship Platform'}
                  <ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                </span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-[clamp(3rem,8vw,6rem)] font-black tracking-tighter leading-[0.88] mb-8">
                <span className="block text-foreground">{isRtl ? 'افتح' : 'Unlock'}</span>
                <span className="block text-foreground">{isRtl ? 'أبواب' : 'Your'}</span>
                <span className="inline-block relative">
                  <span className="animate-gradient-x bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-[length:200%_auto] bg-clip-text text-transparent">{isRtl ? 'المستقبل' : 'Future'}</span>
                  <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }} className="absolute -bottom-2 left-0 w-full h-[4px] bg-red-500 rounded-full origin-left" />
                </span>
                <span className="block text-foreground/70 text-[0.6em] font-light tracking-normal mt-5">{isRtl ? 'بالمنح الدراسية' : 'With Scholarships'}</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="text-lg sm:text-xl text-muted-foreground max-w-lg mb-10 font-light leading-relaxed">
                {isRtl ? 'اكتشف آلاف المنح الدراسية الممولة بالكامل حول العالم. دع ذكاءنا الاصطناعي يبحث في الإنترنت ويجد لك أفضل الفرص.' : 'Discover thousands of fully-funded scholarships worldwide. Let our AI search the web and find the best opportunities tailored just for you.'}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 mb-12">
                {primaryCta}
                <Button size="lg" variant="outline" onClick={() => navigate('/search')} className="h-14 px-8 rounded-2xl text-[15px] border border-border/60 font-medium w-full sm:w-auto hover:bg-muted/60 hover:border-red-500/30 transition-all duration-300">
                  <Search className="w-4 h-4 mr-2" />
                  {isRtl ? 'تصفح المنح' : 'Browse Scholarships'}
                </Button>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex flex-wrap gap-2.5">
                {[
                  { icon: Shield, text: isRtl ? '100% مجاني' : '100% Free' },
                  { icon: Rocket, text: isRtl ? 'بدون بطاقة ائتمان' : 'No Credit Card' },
                  { icon: Target, text: isRtl ? 'نتائج فورية' : 'Instant Results' },
                  { icon: Globe, text: isRtl ? '١٩٠+ دولة' : '190+ Countries' },
                ].map((b, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 border border-border/60 px-3 py-1.5 rounded-full font-medium">
                    <b.icon className="w-3.5 h-3.5 text-red-500" />{b.text}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right Cards */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }} className="hidden lg:block relative h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent blur-[50px] rounded-full scale-110" />

              {/* Main card */}
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px]">
                <div className="bg-background/70 backdrop-blur-xl border border-border/50 rounded-3xl p-5 shadow-[0_8px_40px_rgb(220_38_38/0.12)] ring-1 ring-red-500/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-foreground text-[15px]">DAAD Scholarship 2026</div>
                      <div className="text-[13px] text-muted-foreground mt-0.5">{isRtl ? 'ألمانيا • دكتوراه' : 'Germany • PhD'}</div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">{isRtl ? 'مفتوح' : 'Open'}</span>
                  </div>
                  <div className="flex gap-1.5 mb-4">
                    {['Engineering', 'CS', 'Math'].map(tag => (<span key={tag} className="text-[10px] bg-muted px-2.5 py-1 rounded-full text-muted-foreground font-medium">{tag}</span>))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground shrink-0">{isRtl ? '٢٤ يوماً' : '24 days'}</div>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full" />
                    </div>
                    <div className="text-xs font-bold text-red-500">72%</div>
                  </div>
                </div>
              </motion.div>

              {/* AI Match badge */}
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }} transition={{ opacity: { duration: 0.6, delay: 0.8 }, scale: { duration: 0.6, delay: 0.8 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 } }} className="absolute bottom-16 -left-8 bg-background/80 backdrop-blur-lg border border-border/40 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center dark:bg-red-500/10"><Sparkles className="w-5 h-5 text-red-500" /></div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{isRtl ? 'تطابق AI' : 'AI Match'}</div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">{isRtl ? '94% مطابقة' : '94% Match'}</div>
                  </div>
                </div>
              </motion.div>

              {/* Web search badge */}
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }} transition={{ opacity: { duration: 0.6, delay: 1.1 }, scale: { duration: 0.6, delay: 1.1 }, y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 } }} className="absolute top-12 -right-6 bg-background/80 backdrop-blur-lg border border-border/40 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center dark:bg-blue-500/10"><Globe className="w-5 h-5 text-blue-500" /></div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{isRtl ? 'بحث الإنترنت' : 'Web Search'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{isRtl ? 'نتائج حقيقية' : 'Live results'}</div>
                  </div>
                </div>
              </motion.div>

              {/* Notification badge */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="absolute top-36 -left-10 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-3.5 shadow-lg shadow-red-500/40">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-white" />
                  <div>
                    <div className="text-xs font-bold text-white">{isRtl ? 'تنبيه جديد!' : 'New Alert!'}</div>
                    <div className="text-[10px] text-white/90">{isRtl ? 'منحة تناسبك' : 'Perfect match'}</div>
                  </div>
                </div>
              </motion.div>

              {/* Deadline badge */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, y: [0, -3, 0] }} transition={{ opacity: { delay: 1.7 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 } }} className="absolute -bottom-2 right-4 bg-background/80 backdrop-blur-lg border border-border/40 rounded-2xl px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center dark:bg-orange-500/10"><Clock className="w-4 h-4 text-orange-500" /></div>
                  <div>
                    <div className="text-xs font-bold text-foreground">{isRtl ? 'قبل الموعد النهائي' : 'Before deadline'}</div>
                    <div className="text-[10px] text-muted-foreground">{isRtl ? 'تذكير تلقائي' : 'Auto reminder'}</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-5 h-9 border-2 border-border/50 rounded-full flex justify-center pt-2">
            <motion.div animate={{ opacity: [1, 0, 1], y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* TRUSTED BY TICKER */}
      <section className="py-12 border-y border-border/30 bg-muted/10 relative overflow-hidden flex flex-col items-center justify-center">
        <p className="text-[11px] font-bold text-muted-foreground/60 mb-6 uppercase tracking-[0.3em]">
          {isRtl ? 'جامعات يدرس بها طلابنا' : 'Students accepted at top universities'}
        </p>
        <div className="w-full max-w-screen-xl mx-auto px-6 overflow-hidden relative">
           <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
           <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
           <motion.div
             className="flex gap-20 items-center w-max opacity-50 grayscale hover:grayscale-0 transition-all duration-500"
             animate={{ x: isRtl ? ['0%', '50%'] : ['0%', '-50%'] }}
             transition={{ ease: 'linear', duration: 40, repeat: Infinity }}
           >
             {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-20 items-center shrink-0">
                  {['HARVARD', 'STANFORD', 'OXFORD', 'CAMBRIDGE', 'MIT', 'ETH ZURICH', 'TORONTO'].map(u => (
                    <div key={u} className="text-2xl font-black tracking-tighter opacity-70 shrink-0">{u}</div>
                  ))}
                </div>
             ))}
           </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-24 border-b border-border/30 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-red-500/[0.03] blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 lg:divide-x divide-border/50">
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center py-6 lg:py-0 lg:px-8 group">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-red-500/[0.06] border border-red-500/10 mb-3">
                  <s.icon className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-1"><AnimatedCounter target={s.value} suffix={s.suffix} /></div>
                <div className="text-sm text-muted-foreground font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — BENTO GRID */}
      <section className="py-32 relative bg-background">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-red-500 mb-5 block">{isRtl ? 'لماذا ScholarNest' : 'Why ScholarNest'}</span>
            <h2 className="text-4xl lg:text-[3.5rem] font-black tracking-tighter mb-5 leading-tight">
              {isRtl ? 'كل ما تحتاجه' : 'Everything You Need'}<br />
              <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">{isRtl ? 'في مكان واحد' : 'In One Place'}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">{isRtl ? 'أدوات ذكية مصممة لمساعدتك في رحلتك نحو المنحة الدراسية المثالية' : 'Smart AI-powered tools designed to guide you every step of the way.'}</p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Big AI card */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lg:col-span-2">
              <SpotlightCard className="h-full p-8 border border-border/50 rounded-3xl bg-card hover:border-red-500/25 hover:shadow-2xl hover:shadow-red-500/[0.07] hover:-translate-y-1 transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-8 h-full">
                  <div className="flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-5 shadow-lg shadow-red-500/25">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2.5">{isRtl ? 'مساعد ذكاء اصطناعي' : 'AI Assistant'}</h3>
                    <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6">{isRtl ? 'ذكاء اصطناعي يبحث لك في الإنترنت وقاعدة البيانات معا، يكتب خطابات الدوافع، ويحاكي المقابلات الحقيقية.' : 'AI that searches the web and our database, writes motivation letters, and simulates real interviews.'}</p>
                    <div className="flex flex-wrap gap-2">
                      {[isRtl ? 'بحث مباشر في الويب' : 'Live web search', isRtl ? 'Function Calling' : 'Function Calling', isRtl ? 'يفهم العربية' : 'Speaks Arabic'].map(tag => (
                        <span key={tag} className="text-[11px] font-semibold text-red-500 bg-red-500/[0.06] border border-red-500/15 px-3 py-1.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="md:w-[240px] bg-muted/40 border border-border/50 rounded-2xl p-4 space-y-3 self-center">
                    <div className="flex gap-2 items-start flex-row-reverse">
                      <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center shrink-0"><Users className="w-3.5 h-3.5 text-background" /></div>
                      <div className="bg-background border border-border/60 px-3 py-2 rounded-xl rounded-tr-sm text-xs leading-relaxed max-w-[170px]">{isRtl ? 'ابحث لي عن منح هندسة في ألمانيا' : 'Find me engineering scholarships in Germany'}</div>
                    </div>
                    <div className="flex gap-2 items-start">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shrink-0"><Bot className="w-3.5 h-3.5 text-white" /></div>
                      <div className="bg-background border border-red-500/20 px-3 py-2 rounded-xl rounded-tl-sm text-xs leading-relaxed max-w-[170px]">
                        <span className="text-emerald-600 font-semibold">{isRtl ? 'وجدت 12 منحة' : 'Found 12 matches'}</span>
                        <span className="text-muted-foreground"> {isRtl ? 'تطابق ملفك، أعرضها؟' : 'for your profile. Show them?'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 items-center pl-9">
                      {[0, 1, 2].map(j => (
                        <motion.span key={j} className="w-1 h-1 bg-red-400 rounded-full" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity, delay: j * 0.2 }} />
                      ))}
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* Feature cards */}
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 * (i + 1) }} className={i === 0 ? '' : 'lg:col-span-1'}>
                <SpotlightCard className="h-full p-8 border border-border/50 rounded-3xl bg-card hover:border-red-500/25 hover:shadow-2xl hover:shadow-red-500/[0.07] hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon className={`w-6 h-6 ${f.tint}`} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2.5">{f.title}</h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed">{f.desc}</p>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-32 bg-muted/10 relative overflow-hidden">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-red-500 mb-5 block">{isRtl ? 'كيف يعمل' : 'How It Works'}</span>
            <h2 className="text-4xl lg:text-[3.5rem] font-black tracking-tighter mb-5">{isRtl ? 'ثلاث خطوات بسيطة' : 'Three Simple Steps'}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">{t('howItWorks.subtitle')}</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-14 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            {steps.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="relative text-center">
                <div className="relative inline-block mb-8">
                  <motion.div whileHover={{ scale: 1.05, rotate: i === 1 ? 2 : -2 }} className="w-28 h-28 rounded-[2rem] bg-card border border-border flex flex-col items-center justify-center mx-auto shadow-sm hover:shadow-xl hover:shadow-red-500/10 hover:border-red-500/30 transition-all duration-300">
                    <item.icon className="w-7 h-7 mb-1 text-muted-foreground" />
                    <span className="text-2xl font-black text-foreground">{item.step}</span>
                  </motion.div>
                  <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-red-600 border-2 border-background flex items-center justify-center text-xs font-black text-white shadow-lg shadow-red-500/30">{i + 1}</div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm font-light leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERVIEW SHOWCASE */}
      <section className="py-32 relative bg-background overflow-hidden">
        <div className="absolute right-[-10%] top-[20%] w-[500px] h-[500px] bg-red-500/[0.03] blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lg:w-1/2">
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-red-500 mb-5 block">{isRtl ? 'ميزة حصرية' : 'Exclusive Feature'}</span>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-6 leading-[1.05]">
                {isRtl ? 'استعد للمقابلة' : 'Ace Your Interview'}<br />
                <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">{isRtl ? 'بالذكاء الاصطناعي' : 'With AI Coaching'}</span>
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed mb-8 max-w-md">{isRtl ? 'تدرب على أسئلة مقابلة المنحة مع مساعد ذكي يعطيك تغذية راجعة فورية ويساعدك على التحسن الفعلي.' : 'Practice scholarship interview questions with an AI coach that gives instant, personalized feedback on your answers.'}</p>
              <div className="flex flex-col gap-3 mb-8">
                {[isRtl ? 'أسئلة مخصصة لكل منحة' : 'Questions tailored to each scholarship', isRtl ? 'تغذية راجعة فورية' : 'Instant constructive feedback', isRtl ? 'تتبع تقدمك مع الوقت' : 'Track your improvement over time'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-5 h-5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0"><CheckCircle className="w-3 h-3 text-red-500" /></div>
                    {item}
                  </div>
                ))}
              </div>
              <Button onClick={() => navigate('/interview-simulator')} className="rounded-2xl h-12 px-7 bg-red-600 hover:bg-red-500 text-white font-bold shadow-2xl shadow-red-500/25 group transition-all duration-300 hover:scale-[1.02]">
                <MessageSquare className="w-4 h-4 mr-2" />
                {isRtl ? 'ابدأ التدريب مجاناً' : 'Start Practicing Free'}
                <ArrowRight className={`w-4 h-4 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'} group-hover:translate-x-1 transition-transform duration-300`} />
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }} className="lg:w-1/2 w-full">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 blur-2xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-xl shadow-black/5">
                  <div className="bg-muted/30 px-5 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400/80" /><div className="w-3 h-3 rounded-full bg-yellow-400/80" /><div className="w-3 h-3 rounded-full bg-green-400/80" /></div>
                    <div className="flex-1 flex justify-center"><span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" />{isRtl ? 'محاكي المقابلة AI' : 'Interview Simulator AI'}</span></div>
                  </div>
                  <div className="p-6 space-y-4 min-h-[300px]">
                    {[
                      { from: 'ai', delay: 0.2, text: isRtl ? 'لماذا تريد الدراسة في ألمانيا تحديدا؟' : 'Why do you specifically want to study in Germany?', hl: false },
                      { from: 'user', delay: 0.5, text: isRtl ? 'ألمانيا رائدة في الهندسة وتوفر تعليما عالِ الجودة مجاناً...' : 'Germany leads in engineering and provides world-class education for free...', hl: false },
                      { from: 'ai', delay: 0.8, text: isRtl ? 'إجابة قوية! أضف مثالا شخصياً ليكون أقوى.' : 'Strong answer! Add a specific personal example to make it even better.', hl: true },
                    ].map((m, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: m.delay }} className={`flex gap-3 ${m.from === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${m.from === 'ai' ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/20' : 'bg-foreground shadow-black/10'}`}>
                          {m.from === 'ai' ? <Bot className="w-4 h-4 text-white" /> : <Users className="w-4 h-4 text-background" />}
                        </div>
                        <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.from === 'user' ? 'bg-foreground text-background rounded-tr-sm' : m.hl ? 'bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-tl-sm' : 'bg-muted text-foreground rounded-tl-sm border border-border/50'}`}>
                          {m.text}
                        </div>
                      </motion.div>
                    ))}
                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }} className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-white" /></div>
                      <div className="bg-muted border border-border/50 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                        {[0, 1, 2].map(j => (<motion.span key={j} className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }} />))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-32 bg-muted/10 border-y border-border/30 relative">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-red-500 mb-5 block">{isRtl ? 'قصص نجاح' : 'Success Stories'}</span>
            <h2 className="text-4xl lg:text-[3.5rem] font-black tracking-tighter">
              {isRtl ? 'غيّروا مستقبلهم' : 'They Changed Their Future'}<br />
              <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">{isRtl ? 'مع ScholarNest' : 'With ScholarNest'}</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((s, i) => (
              <SpotlightCard key={i} className="h-full">
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="p-7 border border-border/60 rounded-3xl bg-card hover:border-red-500/25 hover:shadow-xl hover:shadow-red-500/[0.06] transition-all duration-300 h-full">
                  <div className="flex gap-1 mb-5">{[...Array(5)].map((_, j) => (<Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />))}</div>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6 pl-4 relative">
                    <span className="text-3xl text-muted-foreground/25 font-serif leading-none absolute -top-1 -left-1">"</span>
                    {s.text}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.c} text-white flex items-center justify-center font-bold text-sm shadow-lg`}>{s.a}</div>
                    <div><div className="font-semibold text-foreground text-sm">{s.name}</div><div className="text-xs text-muted-foreground">{s.role}</div></div>
                  </div>
                </motion.div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 bg-background relative">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-red-500 mb-5 block">{isRtl ? 'الأسئلة الشائعة' : 'FAQ'}</span>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-5">
              {isRtl ? 'عندك سؤال؟' : 'Got Questions?'}<br />
              <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">{isRtl ? 'عندنا الجواب' : 'We Have Answers'}</span>
            </h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <SpotlightCard className="border border-border/60 rounded-2xl bg-card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 p-6 text-left rtl:text-right cursor-pointer"
                  >
                    <span className="flex items-center gap-3 font-bold text-foreground text-[15px]">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${openFaq === i ? 'bg-red-600 text-white' : 'bg-red-500/[0.07] text-red-500'}`}>
                        <HelpCircle className="w-4 h-4" />
                      </span>
                      {f.q}
                    </span>
                    <motion.span animate={{ rotate: openFaq === i ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0">
                      <ChevronDown className={`w-5 h-5 ${isRtl ? '-scale-x-100' : ''} ${openFaq === i ? 'text-red-500' : 'text-muted-foreground'}`} />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-6 text-muted-foreground text-sm font-light leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-36 relative bg-background overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="relative rounded-[2.5rem] overflow-hidden border border-white/10">
            <div className="absolute inset-0 bg-[#08080a] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_60%,transparent_100%)] pointer-events-none" />
            <motion.div
              animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.1, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/30 blur-[130px] rounded-full pointer-events-none"
            />
            <div className="absolute bottom-[-40%] left-[-10%] w-[400px] h-[400px] bg-orange-600/15 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative px-8 py-20 md:px-16 md:py-24 text-center">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-300 bg-red-500/10 border border-red-500/25 px-4 py-2 rounded-full mb-10">
                <motion.span className="w-1.5 h-1.5 bg-red-400 rounded-full" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
                {isRtl ? '٪100 مجاني — لا بطاقة ائتمانية' : '100% Free — No Credit Card Required'}
              </span>
              <h2 className="text-5xl lg:text-[4.5rem] font-black tracking-tighter mb-8 leading-[0.9] text-white">
                {isRtl ? 'مستقبلك' : 'Your Future'}<br />
                <span className="animate-gradient-x bg-gradient-to-r from-red-500 via-orange-400 to-red-400 bg-[length:200%_auto] bg-clip-text text-transparent">{isRtl ? 'يبدأ الآن' : 'Starts Now'}</span>
              </h2>
              <p className="text-lg md:text-xl text-white/60 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                {isRtl ? 'انضم لـ 48,000+ طالب غيّروا حياتهم بفضل المنح الدراسية. ملفك المجاني جاهز في دقيقتين.' : 'Join 48,000+ students who transformed their lives through scholarships. Your free profile is ready in 2 minutes.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="lg"
                    onClick={() => navigate(user ? '/dashboard' : '/register')}
                    className="h-16 px-12 rounded-2xl text-lg bg-red-600 hover:bg-red-500 text-white font-black shadow-[0_0_50px_rgba(220,38,38,0.4)] w-full sm:w-auto group transition-colors duration-300"
                  >
                    {user ? <LayoutDashboard className="w-6 h-6 mr-3" /> : null}
                    {user ? (isRtl ? 'انتقل إلى لوحة التحكم' : 'Go to Dashboard') : (isRtl ? 'إنشاء حساب مجاني' : 'Create Free Account')}
                    <ArrowRight className={`w-6 h-6 ${isRtl ? 'mr-3 rotate-180' : 'ml-3'} group-hover:translate-x-1 transition-transform duration-300`} />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/search')}
                    className="h-16 px-12 rounded-2xl text-lg border-white/20 bg-white/[0.03] text-white hover:bg-white/10 hover:text-white w-full sm:w-auto backdrop-blur"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    {isRtl ? 'تصفح المنح أولاً' : 'Browse First'}
                  </Button>
                </motion.div>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
                {[isRtl ? 'بدون بطاقة ائتمان' : 'No credit card', isRtl ? 'إعداد في دقيقتين' : 'Setup in 2 minutes', isRtl ? 'إلغاء في أي وقت' : 'Cancel anytime', isRtl ? 'دعم كامل' : 'Full support'].map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-red-400" />{item}</span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background border-t border-border/40 relative overflow-hidden">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 pt-16 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/20">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-black tracking-tight">Scholar<span className="text-red-500">Nest</span></span>
              </div>
              <p className="text-sm text-muted-foreground font-light leading-relaxed mb-5 max-w-xs">
                {isRtl ? 'منصة المنح الدراسية الأولى المدعومة بالذكاء الاصطناعي. من الاكتشاف إلى القبول — نحن معك.' : 'The #1 AI-powered scholarship platform. From discovery to acceptance — we are with you.'}
              </p>
              <div className="flex gap-2">
                <a href="mailto:support@scholarnest.app" aria-label="Email" className="w-9 h-9 rounded-xl border border-border/60 bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-colors">
                  <Mail className="w-4 h-4" />
                </a>
                <a href="https://t.me/scholarnest" target="_blank" rel="noreferrer" aria-label="Telegram" className="w-9 h-9 rounded-xl border border-border/60 bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-colors">
                  <Send className="w-4 h-4" />
                </a>
                <Link to="/search" aria-label="Explore" className="w-9 h-9 rounded-xl border border-border/60 bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-red-500 hover:border-red-500/40 transition-colors">
                  <Globe className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground text-sm mb-4">{isRtl ? 'المنصة' : 'Platform'}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/search" className="hover:text-red-500 transition-colors flex items-center gap-1.5"><Search className="w-3.5 h-3.5" />{isRtl ? 'تصفح المنح' : 'Browse Scholarships'}</Link></li>
                <li><Link to="/compare" className="hover:text-red-500 transition-colors flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" />{isRtl ? 'قارن المنح' : 'Compare'}</Link></li>
                <li><Link to="/dashboard" className="hover:text-red-500 transition-colors flex items-center gap-1.5"><LayoutDashboard className="w-3.5 h-3.5" />{isRtl ? 'لوحة التحكم' : 'Dashboard'}</Link></li>
                <li><Link to="/profile" className="hover:text-red-500 transition-colors flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{isRtl ? 'ملفي الشخصي' : 'My Profile'}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground text-sm mb-4">{isRtl ? 'أدوات الذكاء الاصطناعي' : 'AI Tools'}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/interview-simulator" className="hover:text-red-500 transition-colors flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" />{isRtl ? 'محاكي المقابلات' : 'Interview Simulator'}</Link></li>
                <li><Link to="/cover-letter" className="hover:text-red-500 transition-colors flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" />{isRtl ? 'مساعد خطابات الدوافع' : 'Cover Letter AI'}</Link></li>
                <li><Link to="/register" className="hover:text-red-500 transition-colors flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" />{isRtl ? 'التطابق الذكي' : 'Smart Matching'}</Link></li>
                <li><Link to="/register" className="hover:text-red-500 transition-colors flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" />{isRtl ? 'التنبيهات الذكية' : 'Smart Alerts'}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground text-sm mb-4">{isRtl ? 'ابدأ الآن' : 'Get Started'}</h4>
              <ul className="space-y-3 text-sm text-muted-foreground mb-5">
                <li className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-red-500" />{isRtl ? '١٩٠+ دولة حول العالم' : '190+ countries worldwide'}</li>
                <li className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-red-500" />{isRtl ? 'مجاني للأبد' : 'Free forever'}</li>
              </ul>
              <Link to={user ? '/dashboard' : '/register'}>
                <Button className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold h-10 px-5 text-sm group">
                  {user ? (isRtl ? 'لوحة التحكم' : 'Dashboard') : (isRtl ? 'سجّل مجاناً' : 'Sign Up Free')}
                  <ArrowRight className={`w-4 h-4 ${isRtl ? 'mr-1.5 rotate-180' : 'ml-1.5'} group-hover:translate-x-0.5 transition-transform`} />
                </Button>
              </Link>
            </div>
          </div>

          <div className="border-t border-border/40 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} ScholarNest. {isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {isRtl ? 'جميع الأنظمة تعمل' : 'All systems operational'}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isRtl ? 'صُنع بـ' : 'Made with'} <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> {isRtl ? 'للطلاب العرب' : 'for students'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
