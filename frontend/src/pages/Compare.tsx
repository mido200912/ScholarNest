import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Trash2, ExternalLink, ArrowLeft, GraduationCap, MapPin,
  Calendar, DollarSign, Plus, Trophy, Star, Target, BookOpen,
  Clock, Award, TrendingUp, Zap, Shield, ChevronDown, ChevronUp,
  CheckCircle2, X, Sparkles
} from 'lucide-react';
import { useCompareStore } from '../store/compareStore';
import { Button } from '../components/ui/button';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE as API } from '../config/api';

function ScoreBar({ score, color = 'red' }: { score: number; color?: string }) {
  const colors: Record<string, string> = {
    red: 'from-red-500 to-rose-400',
    blue: 'from-blue-500 to-indigo-400',
    green: 'from-emerald-500 to-green-400',
    amber: 'from-amber-500 to-orange-400',
    purple: 'from-purple-500 to-violet-400',
  };
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${colors[color] || colors.red}`}
        />
      </div>
      <span className="text-xs font-bold text-muted-foreground w-8 text-right">{score}%</span>
    </div>
  );
}

function ScholarshipScore({ scholarship }: { scholarship: any }) {
  const isFullyFunded = scholarship.fundingType === 'Fully Funded';
  const daysLeft = Math.max(0, Math.ceil((new Date(scholarship.deadline).getTime() - Date.now()) / 86400000));
  const deadlineScore = Math.min(100, Math.round((daysLeft / 365) * 100));
  const fundingScore = isFullyFunded ? 100 : 60;
  const degreeScore = scholarship.degree === 'PhD' ? 100 : scholarship.degree === 'Master' ? 85 : scholarship.degree === 'Bachelor' ? 70 : 60;
  const majorScore = Math.min(100, (scholarship.majors?.length || 1) * 20);
  const overall = Math.round((fundingScore * 0.35) + (deadlineScore * 0.25) + (degreeScore * 0.25) + (majorScore * 0.15));
  return { overall, fundingScore, deadlineScore, degreeScore, majorScore, daysLeft };
}

export default function Compare() {
  const { scholarships, removeScholarship, clearCompare } = useCompareStore();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [bestIdx, setBestIdx] = useState<number | null>(null);

  useEffect(() => {
    if (scholarships.length === 0) return;
    scholarships.forEach(async (s) => {
      try {
        await axios.get(`${API}/scholarships/${s._id}`);
      } catch {
        removeScholarship(s._id);
      }
    });
  }, []);

  useEffect(() => {
    if (scholarships.length < 2) { setBestIdx(null); return; }
    const scores = scholarships.map(s => ScholarshipScore({ scholarship: s }).overall);
    setBestIdx(scores.indexOf(Math.max(...scores)));
  }, [scholarships]);

  const formatDeadline = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const daysLeft = (d: string) => {
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    return days > 0 ? days : 0;
  };

  const rows = [
    {
      key: 'university', icon: GraduationCap, label: isAr ? 'الجامعة' : 'University',
      render: (s: any) => (
        <div className="font-semibold text-foreground">{isAr ? s.university?.ar : s.university?.en}</div>
      )
    },
    {
      key: 'country', icon: MapPin, label: isAr ? 'الدولة' : 'Country',
      render: (s: any) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{isAr ? s.country?.ar : s.country?.en}</span>
        </div>
      )
    },
    {
      key: 'degree', icon: Award, label: isAr ? 'الدرجة العلمية' : 'Degree',
      render: (s: any) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
          s.degree === 'PhD' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
          s.degree === 'Master' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>{s.degree}</span>
      )
    },
    {
      key: 'fundingType', icon: DollarSign, label: isAr ? 'نوع التمويل' : 'Funding Type',
      render: (s: any) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
          s.fundingType === 'Fully Funded'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          {s.fundingType === 'Fully Funded'
            ? <><CheckCircle2 className="w-3 h-3" />{isAr ? 'ممول بالكامل' : 'Fully Funded'}</>
            : <><span className="w-3 h-3 text-amber-500">~</span>{isAr ? 'ممول جزئياً' : 'Partially Funded'}</>
          }
        </span>
      )
    },
    {
      key: 'deadline', icon: Calendar, label: isAr ? 'آخر موعد' : 'Deadline',
      render: (s: any) => {
        const days = daysLeft(s.deadline);
        return (
          <div>
            <div className="font-medium text-foreground">{formatDeadline(s.deadline)}</div>
            <div className={`text-xs mt-0.5 font-medium ${days < 30 ? 'text-red-500' : days < 90 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {days > 0 ? (isAr ? `${days} يوم متبقي` : `${days} days left`) : (isAr ? 'انتهى' : 'Expired')}
            </div>
          </div>
        );
      }
    },
    {
      key: 'majors', icon: BookOpen, label: isAr ? 'التخصصات' : 'Majors',
      render: (s: any) => (
        <div className="flex flex-wrap gap-1">
          {(s.majors || []).slice(0, 3).map((m: string) => (
            <span key={m} className="bg-muted px-2 py-0.5 rounded-md text-xs text-muted-foreground">{m}</span>
          ))}
          {(s.majors || []).length > 3 && (
            <span className="text-xs text-muted-foreground">+{s.majors.length - 3}</span>
          )}
        </div>
      )
    },
    {
      key: 'score', icon: TrendingUp, label: isAr ? 'نقاط التقييم' : 'Overall Score',
      render: (s: any) => {
        const scores = ScholarshipScore({ scholarship: s });
        return (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-black text-foreground">{scores.overall}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <ScoreBar score={scores.overall} color="red" />
          </div>
        );
      }
    },
  ];

  const detailRows = [
    {
      key: 'funding_detail', icon: Shield, label: isAr ? 'نقاط التمويل' : 'Funding Score',
      render: (s: any) => {
        const scores = ScholarshipScore({ scholarship: s });
        return <ScoreBar score={scores.fundingScore} color="green" />;
      }
    },
    {
      key: 'deadline_detail', icon: Clock, label: isAr ? 'وقت المتاح' : 'Time Available',
      render: (s: any) => {
        const scores = ScholarshipScore({ scholarship: s });
        return <ScoreBar score={scores.deadlineScore} color="blue" />;
      }
    },
    {
      key: 'degree_detail', icon: GraduationCap, label: isAr ? 'مستوى الدرجة' : 'Degree Level',
      render: (s: any) => {
        const scores = ScholarshipScore({ scholarship: s });
        return <ScoreBar score={scores.degreeScore} color="purple" />;
      }
    },
  ];

  // Empty state
  if (scholarships.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-28 pb-16 px-4 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-lg"
        >
          <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-6">
            <Target className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-3">
            {isAr ? 'لا توجد منح للمقارنة' : 'No Scholarships Selected'}
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {isAr
              ? 'انتقل إلى صفحة البحث وأضف حتى 3 منح لمقارنتها جنباً إلى جنب.'
              : 'Go to the search page and add up to 3 scholarships to compare side-by-side.'}
          </p>
          <Link to="/search">
            <Button className="h-12 px-8 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/25">
              <Zap className="w-4 h-4 mr-2" />
              {isAr ? 'ابحث الآن' : 'Find Scholarships'}
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Link to="/search">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted w-10 h-10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2">
                <Target className="w-7 h-7 text-red-500" />
                {isAr ? 'مقارنة المنح الذكية' : 'Smart Scholarship Compare'}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAr
                  ? `تقارن ${scholarships.length} منح — نقاط AI تساعدك في الاختيار`
                  : `Comparing ${scholarships.length} scholarship${scholarships.length > 1 ? 's' : ''} — AI scores help you decide`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scholarships.length < 3 && (
              <Link to="/search">
                <Button variant="outline" size="sm" className="rounded-xl border-dashed h-9 text-muted-foreground hover:text-foreground">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {isAr ? 'إضافة منحة' : 'Add More'}
                </Button>
              </Link>
            )}
            <Button
              variant="outline" size="sm"
              onClick={clearCompare}
              className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-800 h-9"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              {isAr ? 'مسح الكل' : 'Clear All'}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* AI Best Choice Banner */}
      <AnimatePresence>
        {bestIdx !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6"
          >
            <div className="bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/20 rounded-2xl px-5 py-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-foreground">
                <span className="font-black text-red-500">{isAr ? 'اختيار AI: ' : 'AI Pick: '}</span>
                {isAr
                  ? `"${scholarships[bestIdx]?.title?.ar}" تحصل على أعلى نقاط تقييم وتُوصى بها بشدة.`
                  : `"${scholarships[bestIdx]?.title?.en}" has the highest score and is strongly recommended.`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main comparison grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">

            {/* Scholarship Cards Row */}
            <div className={`grid gap-4 mb-6`} style={{ gridTemplateColumns: `200px repeat(${Math.max(scholarships.length, 1)}, 1fr)` }}>
              <div />
              {scholarships.map((s, idx) => (
                <motion.div
                  key={s._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                    bestIdx === idx
                      ? 'border-red-500 shadow-xl shadow-red-500/10'
                      : 'border-border shadow-sm'
                  }`}
                >
                  {bestIdx === idx && (
                    <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center text-[10px] font-black py-1 tracking-wider uppercase flex items-center justify-center gap-1">
                      <Trophy className="w-3 h-3" /> {isAr ? 'الأفضل بحسب AI' : 'AI Best Pick'}
                    </div>
                  )}
                  {/* Image */}
                  <div className={`relative ${bestIdx === idx ? 'mt-5' : ''}`}>
                    {s.image ? (
                      <img
                        src={s.image}
                        alt={s.title?.en}
                        className="w-full h-36 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop';
                        }}
                      />
                    ) : (
                      <div className="w-full h-36 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <GraduationCap className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <button
                      onClick={() => removeScholarship(s._id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {bestIdx === idx && (
                      <div className="absolute top-2 left-2">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-md" />
                      </div>
                    )}
                  </div>
                  {/* Card content */}
                  <div className="p-4 bg-card">
                    <h3 className="font-bold text-foreground text-sm leading-tight mb-1">
                      {isAr ? s.title?.ar : s.title?.en}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {isAr ? s.university?.ar : s.university?.en}
                    </p>
                    {/* Score Ring */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 ${
                        bestIdx === idx ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-950/30' : 'border-border text-foreground bg-muted'
                      }`}>
                        {ScholarshipScore({ scholarship: s }).overall}
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] text-muted-foreground">{isAr ? 'نقاط AI' : 'AI Score'}</div>
                        <ScoreBar score={ScholarshipScore({ scholarship: s }).overall} color={bestIdx === idx ? 'red' : 'blue'} />
                      </div>
                    </div>
                    <a href={s.link} target="_blank" rel="noreferrer">
                      <Button
                        size="sm"
                        className={`w-full rounded-xl h-8 text-xs font-bold transition-all ${
                          bestIdx === idx
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-500/20'
                            : 'bg-foreground/10 hover:bg-foreground/20 text-foreground'
                        }`}
                      >
                        <ExternalLink className="w-3 h-3 mr-1.5" />
                        {isAr ? 'تقديم الآن' : 'Apply Now'}
                      </Button>
                    </a>
                  </div>
                </motion.div>
              ))}

              {/* Empty slot placeholders */}
              {Array.from({ length: 3 - scholarships.length }).map((_, i) => (
                <Link key={`empty-${i}`} to="/search">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (scholarships.length + i) * 0.1 }}
                    className="rounded-2xl border-2 border-dashed border-border h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 hover:border-red-500/40 hover:bg-red-50/30 dark:hover:bg-red-950/10 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-muted group-hover:bg-red-100 dark:group-hover:bg-red-900/30 flex items-center justify-center mb-3 transition-colors">
                      <Plus className="w-7 h-7 text-muted-foreground group-hover:text-red-500 transition-colors" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground group-hover:text-red-500 transition-colors">
                      {isAr ? 'أضف منحة' : 'Add Scholarship'}
                    </span>
                  </motion.div>
                </Link>
              ))}
            </div>

            {/* Comparison rows */}
            <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
              {rows.map((row, rowIdx) => {
                // Check if values differ between scholarships
                const values = scholarships.map(s => {
                  try {
                    const temp = document.createElement('div');
                    return JSON.stringify((s as any)[row.key]);
                  } catch {
                    return '';
                  }
                });
                const hasDiff = new Set(values).size > 1;

                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIdx * 0.05 }}
                    className={`grid border-b border-border last:border-b-0 transition-colors hover:bg-muted/20 ${hasDiff ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}
                    style={{ gridTemplateColumns: `200px repeat(${Math.max(scholarships.length, 1)}, 1fr)` }}
                  >
                    {/* Label */}
                    <div className="p-4 flex items-start gap-2.5 border-r border-border bg-muted/20">
                      <row.icon className={`w-4 h-4 mt-0.5 shrink-0 ${hasDiff ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-semibold ${hasDiff ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {row.label}
                        {hasDiff && <span className="ml-1.5 text-[10px] text-amber-500 font-bold uppercase">{isAr ? 'يختلف' : 'differs'}</span>}
                      </span>
                    </div>

                    {/* Values */}
                    {scholarships.map((s, idx) => (
                      <div
                        key={`${s._id}-${row.key}`}
                        className={`p-4 border-r border-border last:border-r-0 ${bestIdx === idx ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}
                      >
                        {row.render(s)}
                      </div>
                    ))}

                    {/* Empty placeholders */}
                    {Array.from({ length: 3 - scholarships.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-4 border-r border-border last:border-r-0 bg-muted/5" />
                    ))}
                  </motion.div>
                );
              })}

              {/* Expandable detail scores */}
              <button
                onClick={() => setExpandedRow(expandedRow === 'details' ? null : 'details')}
                className="w-full p-4 flex items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {isAr ? 'تفاصيل نقاط التقييم' : 'Detailed Score Breakdown'}
                </span>
                {expandedRow === 'details' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {expandedRow === 'details' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    {detailRows.map((row, rowIdx) => (
                      <div
                        key={row.key}
                        className="grid border-b border-border/50 last:border-b-0 bg-muted/10"
                        style={{ gridTemplateColumns: `200px repeat(${Math.max(scholarships.length, 1)}, 1fr)` }}
                      >
                        <div className="p-4 flex items-center gap-2.5 border-r border-border">
                          <row.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground font-medium">{row.label}</span>
                        </div>
                        {scholarships.map((s, idx) => (
                          <div key={`${s._id}-${row.key}`} className="p-4 border-r border-border last:border-r-0">
                            {row.render(s)}
                          </div>
                        ))}
                        {Array.from({ length: 3 - scholarships.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="p-4 border-r border-border last:border-r-0" />
                        ))}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action footer */}
            <div
              className="grid gap-4 mt-4"
              style={{ gridTemplateColumns: `200px repeat(${Math.max(scholarships.length, 1)}, 1fr)` }}
            >
              <div className="flex items-center">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {isAr ? 'روابط التقديم' : 'Quick Apply'}
                </span>
              </div>
              {scholarships.map((s, idx) => (
                <a key={s._id} href={s.link} target="_blank" rel="noreferrer">
                  <Button
                    className={`w-full rounded-xl h-11 font-bold transition-all hover:scale-[1.02] ${
                      bestIdx === idx
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25'
                        : 'bg-foreground text-background hover:bg-foreground/85'
                    }`}
                  >
                    {bestIdx === idx && <Trophy className="w-4 h-4 mr-2" />}
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {isAr ? 'تقديم الآن' : 'Apply Now'}
                  </Button>
                </a>
              ))}
              {Array.from({ length: 3 - scholarships.length }).map((_, i) => (
                <div key={`empty-action-${i}`} />
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
