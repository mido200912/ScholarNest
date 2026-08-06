import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Trash2, ExternalLink, ArrowLeft, GraduationCap, MapPin, Calendar, CheckCircle2, DollarSign, Plus } from 'lucide-react';
import { useCompareStore } from '../store/compareStore';
import { Button } from '../components/ui/button';
import { useEffect } from 'react';
import axios from 'axios';

import { API_BASE as API } from '../config/api';

export default function Compare() {
  const { scholarships, removeScholarship, clearCompare } = useCompareStore();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  // Validate scholarships still exist in DB on mount
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

  const formatDeadline = (d: string) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const hasDiff = (key: string) => {
    if (scholarships.length < 2) return false;
    const firstVal = String(scholarships[0][key as keyof typeof scholarships[0]] || '');
    return scholarships.some(s => String(s[key as keyof typeof s] || '') !== firstVal);
  };

  const hasNestedDiff = (parent: string, child: 'en' | 'ar') => {
    if (scholarships.length < 2) return false;
    const firstVal = String((scholarships[0] as any)[parent]?.[child] || '');
    return scholarships.some(s => String((s as any)[parent]?.[child] || '') !== firstVal);
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/search">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-black text-foreground">{isAr ? 'مقارنة المنح' : 'Compare Scholarships'}</h1>
            </div>
            <p className="text-muted-foreground ml-12">
              {isAr ? 'قارن بين ما يصل إلى 3 منح دراسية لاختيار الأنسب لك.' : 'Compare up to 3 scholarships side-by-side to make the best decision.'}
            </p>
          </div>
          {scholarships.length > 0 && (
            <Button variant="outline" onClick={clearCompare} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-900 rounded-xl">
              {isAr ? 'مسح الكل' : 'Clear All'}
            </Button>
          )}
        </div>

        {scholarships.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-border rounded-3xl">
            <h3 className="text-xl font-medium mb-3">{isAr ? 'لم يتم تحديد منح' : 'No scholarships selected'}</h3>
            <p className="text-muted-foreground mb-6">{isAr ? 'انتقل إلى صفحة البحث وحدد بعض المنح للمقارنة.' : 'Go to the search page and select some scholarships to compare.'}</p>
            <Link to="/search">
              <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white">{isAr ? 'ابحث عن منح' : 'Find Scholarships'}</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto pb-8">
            <div className="min-w-[900px] border border-border rounded-3xl bg-card shadow-sm">
              {/* Sticky Header Row */}
              <div className="grid grid-cols-4 sticky top-[64px] z-20 bg-card/95 backdrop-blur-md border-b-2 border-border shadow-sm">
                <div className="col-span-1 p-6 flex flex-col justify-end border-r border-border">
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{isAr ? 'المميزات' : 'Features'}</span>
                </div>
                
                {scholarships.map((s, index) => (
                  <div key={s._id} className="col-span-1 relative p-6 border-r border-border last:border-r-0">
                    <button
                      onClick={() => removeScholarship(s._id)}
                      className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-full transition-colors z-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {s.image ? (
                      <img src={s.image} alt={s.title.en} className="w-full h-32 object-cover rounded-xl mb-4 shadow-inner" />
                    ) : (
                      <div className="w-full h-32 bg-muted rounded-xl mb-4" />
                    )}
                    <h3 className="text-lg font-bold leading-tight">{isAr ? s.title.ar : s.title.en}</h3>
                  </div>
                ))}
                
                {/* Empty columns up to 3 */}
                {Array.from({ length: 3 - scholarships.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="col-span-1 p-6 border-r border-border last:border-r-0 flex flex-col items-center justify-center text-center opacity-60">
                    <Link to="/search" className="flex flex-col items-center group cursor-pointer">
                      <div className="w-16 h-16 rounded-full bg-muted group-hover:bg-red-50 flex items-center justify-center mb-4 transition-colors">
                        <Plus className="w-8 h-8 text-muted-foreground group-hover:text-red-500 transition-colors" />
                      </div>
                      <h4 className="font-medium mb-2 group-hover:text-red-600 transition-colors">{isAr ? 'إضافة منحة' : 'Add Scholarship'}</h4>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Rows */}
              {[
                { key: 'university', icon: GraduationCap, label: isAr ? 'الجامعة' : 'University', isNested: true },
                { key: 'country', icon: MapPin, label: isAr ? 'الدولة' : 'Country', isNested: true },
                { key: 'degree', icon: CheckCircle2, label: isAr ? 'الدرجة العلمية' : 'Degree', isNested: false },
                { key: 'fundingType', icon: DollarSign, label: isAr ? 'التمويل' : 'Funding', isNested: false },
                { key: 'deadline', icon: Calendar, label: isAr ? 'آخر موعد' : 'Deadline', isNested: false },
              ].map((row, idx) => {
                const diff = row.isNested ? hasNestedDiff(row.key, isAr ? 'ar' : 'en') : hasDiff(row.key);
                return (
                  <div key={row.key} className={`grid grid-cols-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors ${diff ? 'bg-primary/5 hover:bg-primary/10' : ''}`}>
                    <div className="col-span-1 p-6 font-medium text-muted-foreground border-r border-border flex items-center gap-3">
                      <row.icon className={`w-5 h-5 ${diff ? 'text-primary' : ''}`} />
                      <span className={diff ? 'text-foreground font-semibold' : ''}>{row.label}</span>
                    </div>
                    {scholarships.map(s => (
                      <div key={`${s._id}-${row.key}`} className="col-span-1 p-6 font-medium text-foreground border-r border-border last:border-r-0 flex items-center">
                        {row.key === 'deadline' 
                          ? formatDeadline(s.deadline)
                          : row.key === 'fundingType'
                            ? <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 px-3 py-1 rounded-full text-sm">{s.fundingType}</span>
                            : row.isNested ? (s as any)[row.key]?.[isAr ? 'ar' : 'en'] : (s as any)[row.key]
                        }
                      </div>
                    ))}
                    {Array.from({ length: 3 - scholarships.length }).map((_, i) => (
                      <div key={`empty-row-${row.key}-${i}`} className="col-span-1 p-6 border-r border-border last:border-r-0 bg-muted/10"></div>
                    ))}
                  </div>
                );
              })}

              {/* Action Row */}
              <div className="grid grid-cols-4 bg-muted/20">
                <div className="col-span-1 p-6 border-r border-border"></div>
                {scholarships.map(s => (
                  <div key={`${s._id}-action`} className="col-span-1 p-6 border-r border-border last:border-r-0">
                    <a href={s.link} target="_blank" rel="noreferrer" className="block w-full">
                      <Button className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-md h-12">
                        {isAr ? 'قدم الآن' : 'Apply Now'} <ExternalLink className={`w-4 h-4 ${isAr ? 'mr-2' : 'ml-2'}`} />
                      </Button>
                    </a>
                  </div>
                ))}
                {Array.from({ length: 3 - scholarships.length }).map((_, i) => (
                  <div key={`empty-action-${i}`} className="col-span-1 p-6 border-r border-border last:border-r-0"></div>
                ))}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
