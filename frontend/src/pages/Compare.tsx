import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Trash2, ExternalLink, ArrowLeft, GraduationCap, MapPin, Calendar, CheckCircle2, DollarSign, Plus } from 'lucide-react';
import { useCompareStore } from '../store/compareStore';
import { Button } from '../components/ui/button';
import { useEffect } from 'react';
import axios from 'axios';

const API = 'https://scholarnest.up.railway.app/api';

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

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/search">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-3xl font-black text-foreground">Compare Scholarships</h1>
            </div>
            <p className="text-muted-foreground ml-12">
              Compare up to 3 scholarships side-by-side to make the best decision.
            </p>
          </div>
          {scholarships.length > 0 && (
            <Button variant="outline" onClick={clearCompare} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-900 rounded-xl">
              Clear All
            </Button>
          )}
        </div>

        {scholarships.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed border-border rounded-3xl">
            <h3 className="text-xl font-medium mb-3">No scholarships selected</h3>
            <p className="text-muted-foreground mb-6">Go to the search page and select some scholarships to compare.</p>
            <Link to="/search">
              <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white">Find Scholarships</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto pb-8">
            <div className="min-w-[800px] grid grid-cols-4 gap-6">

              {/* Features Column */}
              <div className="col-span-1 pt-48 space-y-12 pr-6 border-r border-border font-medium text-muted-foreground">
                <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4" /> University</div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Country</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Degree</div>
                <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Funding</div>
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Deadline</div>
              </div>

              {/* Scholarship Columns */}
              {scholarships.map((s, index) => (
                <motion.div
                  key={s._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="col-span-1 flex flex-col relative bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-xl transition-shadow"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => removeScholarship(s._id)}
                    className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Header / Image */}
                  <div className="h-40 flex flex-col justify-end mb-12">
                    {s.image ? (
                      <img src={s.image} alt={s.title.en} className="w-full h-32 object-cover rounded-xl mb-4 shadow-inner" />
                    ) : (
                      <div className="w-full h-32 bg-muted rounded-xl mb-4" />
                    )}
                    <h3 className="text-lg font-bold leading-tight line-clamp-2">{isAr ? s.title.ar : s.title.en}</h3>
                  </div>

                  {/* Details */}
                  <div className="space-y-12">
                    <div className="font-medium text-foreground">{isAr ? s.university.ar : s.university.en}</div>
                    <div className="font-medium text-foreground">{isAr ? s.country.ar : s.country.en}</div>
                    <div className="font-medium text-foreground">{s.degree}</div>
                    <div className="font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 inline-flex px-3 py-1 rounded-full text-sm">
                      {s.fundingType}
                    </div>
                    <div className="font-medium text-foreground">{formatDeadline(s.deadline)}</div>
                  </div>

                  <div className="mt-auto pt-10">
                    <a href={s.link} target="_blank" rel="noreferrer" className="block w-full">
                      <Button className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold shadow-md">
                        Apply Now <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </a>
                  </div>
                </motion.div>
              ))}

              {/* Empty slot if less than 3 */}
              {scholarships.length < 3 && (
                <div className="col-span-1 border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center p-6 text-center opacity-60">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium mb-2">Add Scholarship</h4>
                  <p className="text-sm text-muted-foreground">Select another scholarship from the search page to compare.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
