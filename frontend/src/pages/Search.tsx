import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon, MapPin, GraduationCap, Calendar, Bookmark, BookmarkCheck, Loader2, Scale, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { useAuthStore } from '../store/authStore';
import { useCompareStore } from '../store/compareStore';
import { useToast } from '../components/ui/Toast';
import axios from 'axios';

import { API_BASE as API } from '../config/api';

interface Scholarship {
  _id: string;
  title: { en: string; ar: string };
  university: { en: string; ar: string };
  country: { en: string; ar: string };
  degree: string;
  fundingType: string;
  deadline: string;
  image: string;
  link: string;
}

export default function Search() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const { scholarships: compareList, addScholarship, removeScholarship } = useCompareStore();

  const [query, setQuery] = useState('');
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);

  // Set of scholarship IDs the user has already saved
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchScholarships = async (searchQuery = '') => {
    setLoading(true);
    setVisibleCount(5);
    try {
      const { data } = await axios.get(`${API}/scholarships?search=${searchQuery}`);
      setScholarships(data.data);
    } catch (error) {
      console.error('Error fetching scholarships:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load saved IDs for logged-in users
  const fetchSavedIds = async () => {
    if (!user?.token) return;
    try {
      const { data } = await axios.get(`${API}/applications/saved-ids`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setSavedIds(new Set(data.data.map((a: any) => a.scholarship.toString())));
    } catch (e) {
      // Silently fail — user may not be logged in
    }
  };

  useEffect(() => {
    fetchScholarships();
    fetchSavedIds();
  }, [user?.token]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchScholarships(query);
  };

  const handleSaveToggle = async (scholarshipId: string) => {
    if (!user?.token) {
      toastInfo('Login required', 'Please log in to save scholarships.');
      window.location.href = '/login';
      return;
    }
    setSavingId(scholarshipId);
    try {
      await axios.post(`${API}/applications/save/${scholarshipId}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const wasSaved = savedIds.has(scholarshipId);
      setSavedIds(prev => {
        const next = new Set(prev);
        if (next.has(scholarshipId)) next.delete(scholarshipId);
        else next.add(scholarshipId);
        return next;
      });
      if (wasSaved) toastSuccess('Removed from saved');
      else toastSuccess('Scholarship saved!', 'Find it in your Dashboard.');
    } catch {
      toastError('Failed to save', 'Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  const formatDeadline = (d: string) => {
    const date = new Date(d);
    const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const label = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (diff < 0) return `${label} (Expired)`;
    if (diff <= 30) return `⚡ ${label} (${diff}d left)`;
    return label;
  };

  return (
    <div className="min-h-screen bg-background pt-32 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Search Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black text-foreground">
            {t('search.title1')} <span className="gradient-text">{t('search.title2')}</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg font-medium">
            {t('search.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative group">
          <div className="relative flex items-center w-full">
            <SearchIcon className={`absolute ${isAr ? 'right-4' : 'left-4'} text-muted-foreground group-hover:text-red-500 transition-colors`} size={24} />
            <Input
              type="text"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`w-full ${isAr ? 'pr-12 pl-32' : 'pl-12 pr-32'} py-8 text-lg rounded-full shadow-xl bg-card border-border transition-all hover:shadow-2xl focus:border-red-500`}
            />
            <Button type="submit" className={`absolute ${isAr ? 'left-2' : 'right-2'} rounded-full px-8 py-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-lg shadow-md`}>
              {t('search.btn')}
            </Button>
          </div>
        </form>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {(isAr
            ? ['ممولة بالكامل', 'بدون أيلتس', 'ماجستير', 'أمريكا', 'ألمانيا', 'هندسة', 'بريطانيا', 'دكتوراه']
            : ['Fully Funded', 'No IELTS', 'Master', 'USA', 'Germany', 'Engineering', 'UK', 'PhD']
          ).map((tag) => (
            <button key={tag} onClick={() => { setQuery(tag); setVisibleCount(5); fetchScholarships(tag); }}
              className="px-4 py-2 rounded-full border border-border bg-card text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors text-sm font-medium shadow-sm">
              {tag}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="pb-12">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-96 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : scholarships.length === 0 ? (
            <div className="text-center py-24">
              <SearchIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No scholarships found</h3>
              <p className="text-muted-foreground">Try a different search or clear the filters.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scholarships.slice(0, visibleCount).map((s, idx) => {
                  const isSaved = savedIds.has(s._id);
                  const isCompared = compareList.find(c => c._id === s._id);
                  return (
                    <motion.div key={s._id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}>
                      <Card className="h-full overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 bg-card border-border group flex flex-col">
                        <div className="relative h-48 overflow-hidden shrink-0">
                          <img src={s.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop'} alt="scholarship" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute top-3 right-3 bg-red-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md">
                            {s.fundingType}
                          </div>
                          {/* Save Button */}
                          <button onClick={() => handleSaveToggle(s._id)}
                            disabled={savingId === s._id}
                            className={`absolute top-3 left-3 p-2 rounded-full shadow-md transition-all ${isSaved ? 'bg-red-600 text-white' : 'bg-black/40 text-white hover:bg-red-600'}`}>
                            {savingId === s._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isSaved ? (
                              <BookmarkCheck className="w-4 h-4" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <CardHeader className="flex-1">
                          <CardTitle className="text-lg font-bold line-clamp-2 leading-snug">{s.title.en}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                          <div className="flex items-center text-muted-foreground text-sm">
                            <GraduationCap size={14} className="mr-2 text-red-500 shrink-0" />
                            <span className="truncate">{s.university.en}</span>
                          </div>
                          <div className="flex items-center text-muted-foreground text-sm">
                            <MapPin size={14} className="mr-2 text-red-500 shrink-0" />
                            {s.country.en}
                          </div>
                          <div className="flex items-center text-muted-foreground text-sm">
                            <Calendar size={14} className="mr-2 text-red-500 shrink-0" />
                            <span className={new Date(s.deadline).getTime() - Date.now() < 30 * 86400000 ? 'text-red-500 font-medium' : ''}>
                              {formatDeadline(s.deadline)}
                            </span>
                          </div>
                        </CardContent>
                        <CardFooter className="gap-2 pt-0">
                          <Link to={`/scholarships/${s._id}`} className="flex-1">
                            <Button variant="outline" className="w-full border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold">
                              View Details
                            </Button>
                          </Link>
                          <Button
                            variant={isCompared ? "default" : "outline"}
                            onClick={() => isCompared ? removeScholarship(s._id) : addScholarship(s)}
                            className={`rounded-xl shadow-none h-10 w-10 p-0 border-border ${isCompared ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-muted-foreground'}`}
                          >
                            <Scale className="w-4 h-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              {visibleCount < scholarships.length && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="rounded-full px-8 py-6 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold text-sm shadow-sm"
                  >
                    <ChevronDown className="w-4 h-4 mr-2" />
                    {isAr ? `عرض المزيد (${scholarships.length - visibleCount} متبقية)` : `Load More (${scholarships.length - visibleCount} left)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Compare Bar */}
      <AnimatePresence>
        {compareList.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg bg-card border border-border shadow-2xl rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Scale className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Compare Scholarships</p>
                <p className="text-xs text-muted-foreground">{compareList.length} / 3 selected</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/compare">
                <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm text-sm h-9 px-4">
                  Compare Now
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
