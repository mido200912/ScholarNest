import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import { 
  ArrowRight, Search, Brain, Scale, Users, 
  Bell, Star, Globe, Award, GraduationCap, Sparkles, 
  CheckCircle, ChevronRight, Trophy, Target, Rocket, Shield,
  MessageSquare, Bot
} from 'lucide-react';
import { useRef } from 'react';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.8]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-red-500 selection:text-white">

      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION - Full Screen with Parallax
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.section 
        ref={heroRef}
        style={{ scale: heroScale, opacity: heroOpacity }}
        className="min-h-screen flex items-center relative overflow-hidden"
      >
        {/* Animated Background Grid */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a1a_1px,transparent_1px),linear-gradient(to_bottom,#1a1a1a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.15]" />
          <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-red-500/20 blur-[150px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-400/5 blur-[100px] rounded-full" />
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 py-24 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left - Content */}
            <div>
              {/* Animated Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-flex items-center gap-2 text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  {isRtl ? '✨ منصة مدعومة بالذكاء الاصطناعي' : '✨ AI-Powered Scholarship Platform'}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tighter leading-[0.9] mb-8"
              >
                <span className="text-foreground block">{isRtl ? 'افتح' : 'Unlock'}</span>
                <span className="text-foreground block">{isRtl ? 'أبواب' : 'Your'}</span>
                <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-600 bg-clip-text text-transparent block">
                  {isRtl ? 'المستقبل' : 'Future'}
                </span>
                <span className="text-foreground block">{isRtl ? 'بالمنح الدراسية' : 'With Scholarships'}</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-lg sm:text-xl text-muted-foreground max-w-xl mb-10 font-light leading-relaxed"
              >
                {isRtl
                  ? 'اكتشف آلاف المنح الدراسية الممولة بالكامل حول العالم. دع مساعدنا الذكي يبحث لك عن أفضل الفرص ويجلب لك القبول.'
                  : 'Discover thousands of fully-funded scholarships worldwide. Our AI searches, matches, and helps you apply to the best opportunities.'}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 mb-10"
              >
                <Link to="/register">
                  <Button size="lg" className="h-16 px-10 rounded-2xl text-base bg-red-600 hover:bg-red-700 text-white font-bold shadow-2xl shadow-red-500/30 w-full sm:w-auto group">
                    {isRtl ? 'ابدأ مجاناً' : 'Start Free'}
                    <ArrowRight className={`w-5 h-5 ${isRtl ? 'mr-2 rotate-180' : 'ml-2'} group-hover:translate-x-1 transition-transform`} />
                  </Button>
                </Link>
                <Link to="/search">
                  <Button size="lg" variant="outline" className="h-16 px-10 rounded-2xl text-base border-2 border-border font-bold w-full sm:w-auto hover:bg-muted/50">
                    {isRtl ? 'تصفح المنح' : 'Browse Scholarships'}
                  </Button>
                </Link>
              </motion.div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-wrap gap-6"
              >
                {[
                  { icon: Shield, text: isRtl ? '100% مجاني' : '100% Free' },
                  { icon: Rocket, text: isRtl ? 'إعداد سريع' : 'Quick Setup' },
                  { icon: Target, text: isRtl ? 'نتائج فورية' : 'Instant Results' },
                ].map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <badge.icon className="w-4 h-4 text-red-500" />
                    <span>{badge.text}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right - Floating Demo Cards */}
            <motion.div
              initial={{ opacity: 0, x: 40, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              className="hidden lg:block relative items-center justify-center -mt-56"
            >
              {/* Glow behind cards */}
              <div className="absolute inset-0 bg-red-500/10 blur-[80px] rounded-full" />

              {/* Main Scholarship Card */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative bg-card border border-border rounded-3xl p-6 shadow-2xl mb-4"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">DAAD Scholarship</div>
                    <div className="text-xs text-muted-foreground">{isRtl ? 'ألمانيا • تعليم عالي' : 'Germany • Higher Education'}</div>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                      {isRtl ? 'مغلق' : 'Open'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  {['Engineering', 'CS', 'Math'].map((tag) => (
                    <span key={tag} className="text-xs bg-muted px-3 py-1 rounded-full text-muted-foreground">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {isRtl ? 'ينتهي في 15 يوم' : '15 days left'}
                  </div>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      transition={{ duration: 1.5, delay: 0.8 }}
                      className="h-full bg-red-500 rounded-full" 
                    />
                  </div>
                  <div className="text-xs font-bold text-red-500">85%</div>
                </div>
              </motion.div>

              {/* AI Match Card - Floating Bottom Left */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
                transition={{ 
                  opacity: { duration: 0.8, delay: 0.6 },
                  scale: { duration: 0.8, delay: 0.6 },
                  y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }
                }}
                className="absolute -bottom-4 -left-6 bg-card border border-border rounded-2xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{isRtl ? 'تطابق AI' : 'AI Match'}</div>
                    <div className="text-xs text-red-500 font-bold">{isRtl ? '92% مطابقة' : '92% Match'}</div>
                  </div>
                </div>
              </motion.div>

              {/* Interview Badge - Floating Top Right */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
                transition={{ 
                  opacity: { duration: 0.8, delay: 0.9 },
                  scale: { duration: 0.8, delay: 0.9 },
                  y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }
                }}
                className="absolute -top-4 -right-4 bg-card border border-border rounded-2xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-background" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{isRtl ? 'محاكي المقابلة' : 'Interview AI'}</div>
                    <div className="text-xs text-muted-foreground">{isRtl ? 'جاهز للتدريب' : 'Ready to practice'}</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-border rounded-full flex justify-center"
          >
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1.5 h-3 bg-foreground/50 rounded-full mt-2"
            />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES - Interactive Cards
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.05),transparent_50%)]" />
        
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-red-500 mb-4 block">
              {isRtl ? 'مميزاتنا' : 'Features'}
            </span>
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight mb-6">
              {isRtl ? 'كل ما تحتاجه' : 'Everything You Need'}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              {isRtl ? 'أدوات ذكية مصممة لمساعدتك في رحلتك نحو المنحة الدراسية المثالية' : 'Smart tools designed to help you on your journey to the perfect scholarship'}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: isRtl ? 'مساعد ذكاء اصطناعي' : 'AI Assistant',
                desc: isRtl
                  ? 'مساعد ذكي يبحث لك عن المنح المناسبة، يكتب خطابات الدوافع، ويحاكي المقابلات.'
                  : 'AI that finds matching scholarships, writes cover letters, and simulates interviews.',
                color: 'from-red-500 to-red-600',
              },
              {
                icon: Scale,
                title: isRtl ? 'مقارنة ذكية' : 'Smart Compare',
                desc: isRtl
                  ? 'قارن بين ثلاث منح في آنٍ واحد واتخذ القرار الصحيح لمستقبلك.'
                  : 'Compare up to 3 scholarships side-by-side to make the best decision.',
                color: 'from-red-500 to-red-600',
              },
              {
                icon: MessageSquare,
                title: isRtl ? 'محاكي المقابلة' : 'Interview Prep',
                desc: isRtl
                  ? 'تدرب على أسئلة المقابلة مع ذكاء اصطناعي يعطيك تغذية راجعة فورية.'
                  : 'Practice interview questions with AI that gives instant feedback.',
                color: 'from-red-500 to-red-600',
              },
              {
                icon: Target,
                title: isRtl ? 'تطابق ذكي' : 'Perfect Matches',
                desc: isRtl
                  ? 'خوارزمية ذكية تربطك بالمنح التي تناسب ملفك الشخصي بدقة.'
                  : 'Smart algorithm matches you with scholarships that fit your profile.',
                color: 'from-red-500 to-red-600',
              },
              {
                icon: Bell,
                title: isRtl ? 'تذكيرات' : 'Smart Alerts',
                desc: isRtl
                  ? 'لا تفوتك أي موعد نهائي. سنخبرك قبل انتهاء كل منحة.'
                  : 'Never miss a deadline. We notify you before every scholarship closes.',
                color: 'from-red-500 to-red-600',
              },
              {
                icon: Users,
                title: isRtl ? 'مجتمع عالمي' : 'Global Community',
                desc: isRtl
                  ? 'تفاعل مع طلاب من 190+ دولة وشارك تجربتك مع الآخرين.'
                  : 'Connect with students from 190+ countries and share your experience.',
                color: 'from-red-500 to-red-600',
              },
            ].map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="group relative p-8 border border-border rounded-3xl bg-card hover:border-red-500/30 transition-all duration-500 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:bg-red-500 group-hover:text-white transition-all duration-500">
                    <feat.icon className="w-7 h-7 text-red-500 group-hover:text-white transition-colors duration-500" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{feat.title}</h3>
                  <p className="text-muted-foreground leading-relaxed font-light">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS - Timeline
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 bg-muted/20 border-y border-border">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-red-500 mb-4 block">
              {isRtl ? 'كيف يعمل' : 'How It Works'}
            </span>
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight">
              {isRtl ? 'ثلاث خطوات' : 'Three Steps'}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-24 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
            
            {[
              { 
                step: '01', 
                icon: Users,
                title: t('howItWorks.step1_title'), 
                desc: t('howItWorks.step1_desc') 
              },
              { 
                step: '02', 
                icon: Search,
                title: t('howItWorks.step2_title'), 
                desc: t('howItWorks.step2_desc') 
              },
              { 
                step: '03', 
                icon: Trophy,
                title: t('howItWorks.step3_title'), 
                desc: t('howItWorks.step3_desc') 
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="relative text-center"
              >
                <div className="relative inline-block mb-8">
                  <div className="w-20 h-20 rounded-3xl bg-red-600 text-white flex items-center justify-center text-2xl font-black shadow-2xl shadow-red-500/30 mx-auto">
                    {item.step}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-red-500 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-red-500" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed font-light max-w-xs mx-auto">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          INTERVIEW SIMULATOR SHOWCASE
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <span className="text-xs font-bold tracking-[0.3em] uppercase text-red-500 mb-4 block">
                {isRtl ? 'ميزة حصرية' : 'Exclusive Feature'}
              </span>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6 leading-tight">
                {isRtl ? 'استعد للمقابلة' : 'Prepare for Your'}
                <br />
                <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  {isRtl ? 'بالذكاء الاصطناعي' : 'Interview with AI'}
                </span>
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed mb-8">
                {isRtl
                  ? 'تدرب على أسئلة مقابلة المنحة مع مساعد ذكي يعطيك تغذية راجعة فورية على إجاباتك ويساعدك على التحسن.'
                  : 'Practice scholarship interview questions with an AI coach that gives you instant feedback on your answers.'}
              </p>
              <Link to="/interview-simulator">
                <Button className="rounded-2xl h-14 px-8 bg-red-600 hover:bg-red-700 text-white font-bold shadow-2xl shadow-red-500/30 group">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {isRtl ? 'ابدأ التدريب' : 'Start Practicing'}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>

            {/* Right - Chat Preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2 w-full"
            >
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
                {/* Window Header */}
                <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">
                    {isRtl ? 'محاكي المقابلة' : 'Interview Simulator'}
                  </span>
                </div>
                
                {/* Chat Messages */}
                <div className="p-6 space-y-4 min-h-[300px]">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-3"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm p-4 text-sm max-w-sm">
                      {isRtl ? 'لماذا تريد الدراسة في ألمانيا تحديداً؟' : 'Why do you specifically want to study in Germany?'}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-3 flex-row-reverse"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-foreground text-background flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="bg-foreground text-background rounded-2xl rounded-tr-sm p-4 text-sm max-w-sm">
                      {isRtl ? 'ألمانيا رائدة في الهندسة وتوفر تعليماً عالي الجودة مجاناً...' : 'Germany is a leader in engineering and offers high-quality free education...'}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-3"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm p-4 text-sm max-w-sm">
                      <span className="text-green-500 font-bold">✓ {isRtl ? 'إجابة جيدة!' : 'Great answer!'}</span>{' '}
                      {isRtl ? 'أضف مثالاً شخصياً ليكون أقوى. سؤالي التالي...' : 'Add a personal example to make it stronger. My next question...'}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          TESTIMONIALS / SOCIAL PROOF
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 bg-muted/20 border-y border-border">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-red-500 mb-4 block">
              {isRtl ? 'قصص نجاح' : 'Success Stories'}
            </span>
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight">
              {isRtl ? 'قصص حقيقية' : 'Real Stories'}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: isRtl ? 'سارة أحمد' : 'Sarah Ahmed',
                role: isRtl ? 'منحة DAAD - ألمانيا' : 'DAAD Scholar - Germany',
                text: isRtl
                  ? 'بفضل ScholarNest حصلت على منحة كاملة في ألمانيا. محاكي المقابلة ساعدني كثيراً في التحضير!'
                  : 'Thanks to ScholarNest, I got a full scholarship in Germany. The interview simulator helped me prepare!',
                avatar: 'S',
              },
              {
                name: isRtl ? 'محمد علي' : 'Mohamed Ali',
                role: isRtl ? 'منحة Chevening - بريطانيا' : 'Chevening Scholar - UK',
                text: isRtl
                  ? 'المساعد الذكي كتب لي خطاب نوايا احترافي وتلقبت به. المنصة الأفضل بلا منازع!'
                  : 'The AI wrote me a professional cover letter that got me accepted. Best platform ever!',
                avatar: 'M',
              },
              {
                name: isRtl ? 'فاطمة حسن' : 'Fatima Hassan',
                role: isRtl ? 'منحة Erasmus - أوروبا' : 'Erasmus Scholar - Europe',
                text: isRtl
                  ? 'قارنت بين 10 منح واستفدت من نصائح المجتمع. الآن أنا في فرنسا أكمل دراستي!'
                  : 'I compared 10 scholarships and benefited from the community tips. Now I am in France!',
                avatar: 'F',
              },
            ].map((story, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="p-8 border border-border rounded-3xl bg-card hover:border-red-500/20 transition-all"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-red-500 text-red-500" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6 font-light">"{story.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold">
                    {story.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{story.name}</div>
                    <div className="text-xs text-muted-foreground">{story.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1),transparent_60%)]" />
        
        <div className="max-w-4xl mx-auto px-6 relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full mb-8">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {isRtl ? 'مجاناً 100%' : '100% Free'}
            </span>
            
            <h2 className="text-5xl lg:text-7xl font-black tracking-tight mb-8">
              {isRtl ? 'مستقبلك' : 'Your Future'}
              <br />
              <span className="bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                {isRtl ? 'يبدأ الآن' : 'Starts Now'}
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-light">
              {isRtl 
                ? 'انضم لآلاف الطلاب الذين غيروا حياتهم بفضل المنح الدراسية. ملفك المجاني جاهز في دقائق.'
                : 'Join thousands of students who changed their lives through scholarships. Your free profile is ready in minutes.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link to="/register">
                <Button size="lg" className="h-16 px-12 rounded-2xl text-lg bg-red-600 hover:bg-red-700 text-white font-black shadow-2xl shadow-red-500/30 w-full sm:w-auto group">
                  {isRtl ? 'إنشاء حساب مجاني' : 'Create Free Account'}
                  <ArrowRight className={`w-6 h-6 ${isRtl ? 'mr-3 rotate-180' : 'ml-3'} group-hover:translate-x-1 transition-transform`} />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              {[
                { icon: CheckCircle, text: isRtl ? 'بدون بطاقة ائتمان' : 'No credit card' },
                { icon: CheckCircle, text: isRtl ? 'إعداد في دقيقة' : 'Setup in 1 minute' },
                { icon: CheckCircle, text: isRtl ? 'إلغاء في أي وقت' : 'Cancel anytime' },
              ].map((item, idx) => (
                <span key={idx} className="flex items-center gap-2">
                  <item.icon className="w-4 h-4 text-red-500" />
                  {item.text}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}


