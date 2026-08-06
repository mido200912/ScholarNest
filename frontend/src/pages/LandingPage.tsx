import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { 
  ArrowRight, Search, Brain, Scale, Users, 
  Bell, Star, Globe, GraduationCap, Sparkles, 
  CheckCircle, ChevronRight, Trophy, Target, Rocket, Shield,
  MessageSquare, Bot, Zap
} from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

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

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth - 0.5) * 40);
      mouseY.set((e.clientY / window.innerHeight - 0.5) * 40);
    };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  const stats = [
    { value: 12500, suffix: '+', label: isRtl ? 'منحة دراسية' : 'Scholarships' },
    { value: 190, suffix: '+', label: isRtl ? 'دولة' : 'Countries' },
    { value: 48000, suffix: '+', label: isRtl ? 'طالب مسجل' : 'Students' },
    { value: 95, suffix: '%', label: isRtl ? 'نسبة النجاح' : 'Success Rate' },
  ];

  const features = [
    { icon: Brain, title: isRtl ? 'مساعد ذكاء اصطناعي' : 'AI Assistant', desc: isRtl ? 'ذكاء اصطناعي يبحث لك في الإنترنت وقاعدة البيانات معاً، يكتب خطابات الدوافع، ويحاكي المقابلات الحقيقية.' : 'AI that searches the web and database, writes motivation letters, and simulates real interviews.', g: 'from-red-500 to-red-600' },
    { icon: Zap, title: isRtl ? 'تطابق فوري' : 'Instant Match', desc: isRtl ? 'خوارزمية ذكية تربطك بالمنح التي تناسب ملفك الشخصي بدقة عالية في ثوانٍ.' : 'Smart algorithm matches you with scholarships that perfectly fit your profile in seconds.', g: 'from-amber-500 to-orange-500' },
    { icon: Scale, title: isRtl ? 'مقارنة ذكية' : 'Smart Compare', desc: isRtl ? 'قارن بين ثلاث منح في آنٍ واحد بجدول تفصيلي واتخذ القرار الصحيح.' : 'Compare up to 3 scholarships side-by-side with detailed tables to make the best decision.', g: 'from-blue-500 to-blue-600' },
    { icon: MessageSquare, title: isRtl ? 'محاكي المقابلة' : 'Interview Prep', desc: isRtl ? 'تدرب على أسئلة المقابلة مع مدرب ذكي يعطيك تغذية راجعة فورية.' : 'Practice interview questions with an AI coach that gives instant, personalized feedback.', g: 'from-purple-500 to-violet-600' },
    { icon: Bell, title: isRtl ? 'تنبيهات ذكية' : 'Smart Alerts', desc: isRtl ? 'لا تفوتك أي موعد نهائي. سنخبرك قبل انتهاء كل منحة تماماً.' : 'Never miss a deadline. Get notified before every scholarship closes automatically.', g: 'from-emerald-500 to-green-600' },
    { icon: Users, title: isRtl ? 'مجتمع عالمي' : 'Global Community', desc: isRtl ? 'تفاعل مع طلاب من 190+ دولة وشارك تجربتك واستفد من قصص النجاح.' : 'Connect with students from 190+ countries and learn from success stories.', g: 'from-pink-500 to-rose-600' },
  ];

  const steps = [
    { step: '01', icon: Users, title: t('howItWorks.step1_title'), desc: t('howItWorks.step1_desc') },
    { step: '02', icon: Search, title: t('howItWorks.step2_title'), desc: t('howItWorks.step2_desc') },
    { step: '03', icon: Trophy, title: t('howItWorks.step3_title'), desc: t('howItWorks.step3_desc') },
  ];

  const testimonials = [
    { name: isRtl ? 'سارة أحمد' : 'Sarah Ahmed', role: isRtl ? 'منحة DAAD • ألمانيا' : 'DAAD Scholar • Germany', text: isRtl ? 'بفضل ScholarNest حصلت على منحة كاملة في ألمانيا. محاكي المقابلة ساعدني كثيراً في التحضير!' : 'Thanks to ScholarNest, I got a full scholarship in Germany. The interview simulator prepared me perfectly!', a: 'S', c: 'from-red-500 to-red-600' },
    { name: isRtl ? 'محمد علي' : 'Mohamed Ali', role: isRtl ? 'منحة Chevening • بريطانيا' : 'Chevening Scholar • UK', text: isRtl ? 'المساعد الذكي كتب لي خطاب نوايا احترافي وتُقبلت به. المنصة الأفضل بلا منازع!' : 'The AI wrote me a professional cover letter that got me accepted. Best platform I have ever used!', a: 'M', c: 'from-blue-500 to-blue-600' },
    { name: isRtl ? 'فاطمة حسن' : 'Fatima Hassan', role: isRtl ? 'منحة Erasmus • فرنسا' : 'Erasmus Scholar • France', text: isRtl ? 'قارنت بين 10 منح واستفدت من نصائح المجتمع. الآن أنا في فرنسا أكمل دراستي العليا!' : 'I compared 10 scholarships and got community tips. Now I am in France completing my Masters!', a: 'F', c: 'from-purple-500 to-violet-600' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* HERO */}
      <section ref={heroRef} className="min-h-screen flex items-center relative overflow-hidden bg-background">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.15] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]" />
          <motion.div style={{ x: springX, y: springY }} className="absolute inset-0">
            <div className="absolute top-[-10%] left-[-5%] w-[800px] h-[800px] bg-red-600/[0.03] blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-red-500/[0.02] blur-[120px] rounded-full" />
          </motion.div>
        </div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 py-28 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="max-w-2xl">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-500 bg-red-500/[0.05] border border-red-500/10 px-4 py-2 rounded-full mb-8 backdrop-blur-sm tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {isRtl ? 'مدعوم بالذكاء الاصطناعي' : 'AI-Powered Platform'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-[clamp(3rem,8vw,6rem)] font-black tracking-tighter leading-[0.88] mb-8">
                <span className="block text-foreground">{isRtl ? 'افتح' : 'Unlock'}</span>
                <span className="block text-foreground">{isRtl ? 'أبواب' : 'Your'}</span>
                <span className="inline-block relative">
                  <span className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent">{isRtl ? 'المستقبل' : 'Future'}</span>
                  <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }} className="absolute -bottom-2 left-0 w-full h-[4px] bg-red-500 rounded-full origin-left" />
                </span>
                <span className="block text-foreground/70 text-[0.6em] font-light tracking-normal mt-5">{isRtl ? 'بالمنح الدراسية' : 'With Scholarships'}</span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="text-lg sm:text-xl text-muted-foreground max-w-lg mb-10 font-light leading-relaxed">
                {isRtl ? 'اكتشف آلاف المنح الدراسية الممولة بالكامل حول العالم. دع ذكاءنا الاصطناعي يبحث في الإنترنت ويجد لك أفضل الفرص.' : 'Discover thousands of fully-funded scholarships worldwide. Let our AI search the web and find the best opportunities tailored just for you.'}
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link to="/register">
                  <Button size="lg" className="h-14 px-8 rounded-2xl text-[15px] bg-red-600 hover:bg-red-500 text-white font-bold shadow-2xl shadow-red-600/30 w-full sm:w-auto group transition-all duration-300 hover:scale-[1.02]">
                    {isRtl ? 'ابدأ مجاناً الآن' : 'Start Free Today'}
                    <ArrowRight className={`w-5 h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'} group-hover:translate-x-1 transition-transform duration-300`} />
                  </Button>
                </Link>
                <Link to="/search">
                  <Button size="lg" variant="outline" className="h-14 px-8 rounded-2xl text-[15px] border border-border/60 font-medium w-full sm:w-auto hover:bg-muted/60 hover:border-red-500/30 transition-all duration-300">
                    <Search className="w-4 h-4 mr-2" />
                    {isRtl ? 'تصفح المنح' : 'Browse Scholarships'}
                  </Button>
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="flex flex-wrap gap-2.5">
                {[
                  { icon: Shield, text: isRtl ? '100% مجاني' : '100% Free' },
                  { icon: Rocket, text: isRtl ? 'بدون ائتمان' : 'No Credit Card' },
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
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px]">
                <div className="bg-background/60 backdrop-blur-xl border border-border/40 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/10">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-foreground text-[15px]">DAAD Scholarship 2025</div>
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
                      <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} transition={{ duration: 1.5, delay: 0.5 }} className="h-full bg-red-500 rounded-full" />
                    </div>
                    <div className="text-xs font-bold text-red-500">72%</div>
                  </div>
                </div>
              </motion.div>

              {/* AI Match badge */}
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }} transition={{ opacity: { duration: 0.6, delay: 0.8 }, scale: { duration: 0.6, delay: 0.8 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 } }} className="absolute bottom-16 -left-8 bg-background/80 backdrop-blur-lg border border-border/40 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center dark:bg-red-500/10"><Sparkles className="w-5 h-5 text-red-500" /></div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{isRtl ? 'تطابق AI' : 'AI Match'}</div>
                    <div className="text-xs font-bold text-emerald-600 mt-0.5">{isRtl ? '94% مطابقة' : '94% Match'}</div>
                  </div>
                </div>
              </motion.div>

              {/* Web search badge */}
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, y: [0, -3, 0] }} transition={{ opacity: { duration: 0.6, delay: 1.1 }, scale: { duration: 0.6, delay: 1.1 }, y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 } }} className="absolute top-12 -right-6 bg-background/80 backdrop-blur-lg border border-border/40 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center dark:bg-blue-500/10"><Globe className="w-5 h-5 text-blue-500" /></div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{isRtl ? 'بحث الإنترنت' : 'Web Search'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{isRtl ? 'نتائج حقيقية' : 'Live results'}</div>
                  </div>
                </div>
              </motion.div>

              {/* Notification badge */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="absolute top-36 -left-10 bg-red-500 rounded-2xl p-3.5 shadow-lg shadow-red-500/20">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-white" />
                  <div>
                    <div className="text-xs font-bold text-white">{isRtl ? 'تنبيه جديد!' : 'New Alert!'}</div>
                    <div className="text-[10px] text-white/90">{isRtl ? 'منحة تناسبك' : 'Perfect match'}</div>
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
                <div key={i} className="flex gap-20 items-center">
                  <div className="text-2xl font-black tracking-tighter opacity-70">HARVARD</div>
                  <div className="text-2xl font-black tracking-tighter opacity-70">STANFORD</div>
                  <div className="text-2xl font-black tracking-tighter opacity-70">OXFORD</div>
                  <div className="text-2xl font-black tracking-tighter opacity-70">CAMBRIDGE</div>
                  <div className="text-2xl font-black tracking-tighter opacity-70">MIT</div>
                  <div className="text-2xl font-black tracking-tighter opacity-70">ETH ZURICH</div>
                  <div className="text-2xl font-black tracking-tighter opacity-70">TORONTO</div>
                </div>
             ))}
           </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-24 border-y border-border/30 bg-background relative">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 relative">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 lg:divide-x divide-border/50">
            {stats.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center py-6 lg:py-0 lg:px-8">
                <div className="text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-1"><AnimatedCounter target={s.value} suffix={s.suffix} /></div>
                <div className="text-sm text-muted-foreground font-medium">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-32 relative bg-background">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-red-500 mb-5 block">{isRtl ? 'لماذا ScholarNest' : 'Why ScholarNest'}</span>
            <h2 className="text-4xl lg:text-[3.5rem] font-black tracking-tighter mb-5 leading-tight">
              {isRtl ? 'كل ما تحتاجه' : 'Everything You'}<br />
              <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">{isRtl ? 'في مكان واحد' : 'Need in One Place'}</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-light">{isRtl ? 'أدوات ذكية مصممة لمساعدتك في رحلتك نحو المنحة الدراسية المثالية' : 'Smart AI-powered tools designed to guide you every step of the way.'}</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="group p-8 border border-border/50 rounded-3xl bg-card hover:border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-5`}>
                    <f.icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2.5">{f.title}</h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-32 bg-muted/10 relative">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-red-500 mb-5 block">{isRtl ? 'كيف يعمل' : 'How It Works'}</span>
            <h2 className="text-4xl lg:text-[3.5rem] font-black tracking-tighter">{isRtl ? 'ثلاث خطوات بسيطة' : 'Three Simple Steps'}</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-14 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
            {steps.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="relative text-center">
                <div className="relative inline-block mb-8">
                  <motion.div whileHover={{ scale: 1.05 }} className="w-28 h-28 rounded-[2rem] bg-card border border-border flex flex-col items-center justify-center mx-auto shadow-sm">
                    <item.icon className="w-7 h-7 mb-1 text-muted-foreground" />
                    <span className="text-2xl font-black text-foreground">{item.step}</span>
                  </motion.div>
                  <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-background border-2 border-red-500 flex items-center justify-center text-xs font-black text-red-500">{i + 1}</div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm font-light leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERVIEW SHOWCASE */}
      <section className="py-32 relative bg-background">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lg:w-1/2">
              <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-red-500 mb-5 block">{isRtl ? 'ميزة حصرية' : 'Exclusive Feature'}</span>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-6 leading-[1.05]">
                {isRtl ? 'استعد للمقابلة' : 'Ace Your'}<br />
                <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">{isRtl ? 'بالذكاء الاصطناعي' : 'Interview with AI'}</span>
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
              <Link to="/interview-simulator">
                <Button className="rounded-2xl h-12 px-7 bg-red-600 hover:bg-red-500 text-white font-bold shadow-2xl shadow-red-500/25 group transition-all duration-300 hover:scale-[1.02]">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {isRtl ? 'ابدأ التدريب مجاناً' : 'Start Practicing Free'}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.15 }} className="lg:w-1/2 w-full">
              <div className="relative">
                <div className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-xl shadow-black/5">
                  <div className="bg-muted/30 px-5 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400/80" /><div className="w-3 h-3 rounded-full bg-yellow-400/80" /><div className="w-3 h-3 rounded-full bg-green-400/80" /></div>
                    <div className="flex-1 flex justify-center"><span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" />{isRtl ? 'محاكي المقابلة AI' : 'Interview Simulator AI'}</span></div>
                  </div>
                  <div className="p-6 space-y-4 min-h-[300px]">
                    {[
                      { from: 'ai', delay: 0.2, text: isRtl ? 'لماذا تريد الدراسة في ألمانيا تحديداً؟' : 'Why do you specifically want to study in Germany?', hl: false },
                      { from: 'user', delay: 0.5, text: isRtl ? 'ألمانيا رائدة في الهندسة وتوفر تعليماً عالي الجودة مجاناً...' : 'Germany leads in engineering and provides world-class education for free...', hl: false },
                      { from: 'ai', delay: 0.8, text: isRtl ? '✓ إجابة قوية! أضف مثالاً شخصياً ليكون أقوى.' : '✓ Strong answer! Add a specific personal example to make it even better.', hl: true },
                    ].map((m, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: m.delay }} className={`flex gap-3 ${m.from === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${m.from === 'ai' ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/20' : 'bg-foreground shadow-black/10'}`}>
                          {m.from === 'ai' ? <Bot className="w-4 h-4 text-white" /> : <Users className="w-4 h-4 text-background" />}
                        </div>
                        <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.from === 'user' ? 'bg-foreground text-background rounded-tr-sm' : m.hl ? 'bg-emerald-500/10 border border-emerald-500/20 text-foreground rounded-tl-sm' : 'bg-muted text-foreground rounded-tl-sm border border-border/50'}`}>
                          {m.text}
                        </div>
                      </motion.div>
                    ))}
                    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.2 }} className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-white" /></div>
                      <div className="bg-muted border border-border/50 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                        {[0,1,2].map(j => (<motion.span key={j} className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity, delay: j * 0.2 }} />))}
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
              {isRtl ? 'غيّروا مستقبلهم' : 'They Changed'}<br />
              <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">{isRtl ? 'مع ScholarNest' : 'Their Future'}</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -5, transition: { duration: 0.2 } }} className="group p-7 border border-border/60 rounded-3xl bg-card hover:border-border hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="flex gap-1 mb-5">{[...Array(5)].map((_, j) => (<Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />))}</div>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6 pl-4 relative">
                    <span className="text-3xl text-muted-foreground/25 font-serif leading-none absolute -top-1 -left-1">"</span>
                    {s.text}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${s.c} text-white flex items-center justify-center font-bold text-sm shadow-lg`}>{s.a}</div>
                    <div><div className="font-semibold text-foreground text-sm">{s.name}</div><div className="text-xs text-muted-foreground">{s.role}</div></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-36 relative bg-background">
        <div className="max-w-4xl mx-auto px-6 relative text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-red-400 bg-red-500/[0.08] border border-red-500/15 px-4 py-2 rounded-full mb-10">
              <motion.span className="w-1.5 h-1.5 bg-red-400 rounded-full" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
              {isRtl ? '١٠٠٪ مجاني — لا بطاقة ائتمانية' : '100% Free — No Credit Card Required'}
            </span>
            <h2 className="text-5xl lg:text-[5rem] font-black tracking-tighter mb-8 leading-[0.9]">
              <span className="text-foreground">{isRtl ? 'مستقبلك' : 'Your Future'}</span><br />
              <span className="bg-gradient-to-r from-red-500 via-red-400 to-orange-400 bg-clip-text text-transparent">{isRtl ? 'يبدأ الآن' : 'Starts Now'}</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-light leading-relaxed">{isRtl ? 'انضم لـ 48,000+ طالب غيّروا حياتهم بفضل المنح الدراسية. ملفك المجاني جاهز في دقيقتين.' : 'Join 48,000+ students who transformed their lives through scholarships. Your free profile is ready in 2 minutes.'}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link to="/register">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button size="lg" className="h-16 px-12 rounded-2xl text-lg bg-red-600 hover:bg-red-500 text-white font-black shadow-lg w-full sm:w-auto group transition-all duration-300">
                    {isRtl ? 'إنشاء حساب مجاني' : 'Create Free Account'}
                    <ArrowRight className={`w-6 h-6 ${isRtl ? 'mr-3 rotate-180' : 'ml-3'} group-hover:translate-x-1 transition-transform duration-300`} />
                  </Button>
                </motion.div>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              {[isRtl ? 'بدون بطاقة ائتمان' : 'No credit card', isRtl ? 'إعداد في دقيقتين' : 'Setup in 2 minutes', isRtl ? 'إلغاء في أي وقت' : 'Cancel anytime', isRtl ? 'دعم كامل' : 'Full support'].map((item, i) => (
                <span key={i} className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-red-500" />{item}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
