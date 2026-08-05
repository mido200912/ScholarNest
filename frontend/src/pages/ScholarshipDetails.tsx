import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  GraduationCap, MapPin, Calendar, ExternalLink, Bookmark,
  BookmarkCheck, Loader2, ArrowLeft, Building2, Tag, Clock, MessageSquare, Send, DollarSign
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/ui/Toast';

const API = 'http://localhost:5000/api';

interface Scholarship {
  _id: string;
  title: { en: string; ar: string };
  university: { en: string; ar: string };
  country: { en: string; ar: string };
  description: { en: string; ar: string };
  degree: string;
  fundingType: string;
  deadline: string;
  link: string;
  image?: string;
  keywords?: string[];
  createdAt: string;
}

export default function ScholarshipDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'saved' | 'applying' | 'accepted' | null>(null);
  const [savingLoading, setSavingLoading] = useState(false);

  // Fetch scholarship data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${API}/scholarships/${id}`);
        setScholarship(data.data);
        
        const commentRes = await axios.get(`${API}/comments/${id}`);
        setComments(commentRes.data.data);
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Check if already saved
  useEffect(() => {
    if (!user?.token || !id) return;
    const checkSaved = async () => {
      try {
        const { data } = await axios.get(`${API}/applications/saved-ids`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const found = data.data.find((a: any) => a.scholarship.toString() === id);
        if (found) {
          setIsSaved(true);
          setSavingStatus(found.status);
        }
      } catch (e) { /* not logged in */ }
    };
    checkSaved();
  }, [id, user?.token]);

  const handleSave = async () => {
    if (!user?.token) {
      toastInfo('Login required', 'Please log in to save scholarships.');
      navigate('/login');
      return;
    }
    setSavingLoading(true);
    try {
      await axios.post(`${API}/applications/save/${id}`, {}, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const wasAlreadySaved = isSaved;
      setIsSaved(prev => !prev);
      setSavingStatus(isSaved ? null : 'saved');
      if (wasAlreadySaved) toastSuccess('Removed from saved');
      else toastSuccess('Saved!', 'Find it in your Dashboard.');
    } catch {
      toastError('Failed to save', 'Please try again.');
    } finally {
      setSavingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  if (notFound || !scholarship) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pt-20 gap-4">
        <h2 className="text-2xl font-bold">Scholarship Not Found</h2>
        <Button onClick={() => navigate('/search')} variant="outline" className="rounded-none shadow-none">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Search
        </Button>
      </div>
    );
  }

  const title = isAr ? scholarship.title.ar : scholarship.title.en;
  const university = isAr ? scholarship.university.ar : scholarship.university.en;
  const country = isAr ? scholarship.country.ar : scholarship.country.en;
  const description = isAr ? scholarship.description?.ar : scholarship.description?.en;

  return (
    <div className="min-h-screen bg-background pb-20" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        <img
          src={scholarship.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop'}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="absolute top-24 left-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium z-10">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
          <span className="inline-block px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full mb-3 shadow">
            {scholarship.fundingType}
          </span>
          <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight max-w-3xl">
            {title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: MapPin,         label: 'Country',    value: country },
                { icon: GraduationCap,  label: 'Degree',     value: scholarship.degree },
                { icon: Building2,      label: 'University', value: university },
                { icon: Calendar,       label: 'Deadline',   value: new Date(scholarship.deadline).toLocaleDateString() },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </div>
                  <p className={`font-semibold text-sm text-foreground`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-bold mb-3 border-b border-border pb-2">About this Scholarship</h2>
              {description ? (
                <p className="text-muted-foreground leading-relaxed text-base whitespace-pre-line">{description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description available for this scholarship.</p>
              )}
            </div>

            {/* Keywords */}
            {scholarship.keywords && scholarship.keywords.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4" /> Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {scholarship.keywords.map(k => (
                    <span key={k} className="px-2.5 py-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium rounded-full border border-red-200 dark:border-red-800">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar Actions */}
          <div className="space-y-4">
            <div className="border border-border rounded-lg p-6 space-y-4 sticky top-24">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{new Date(scholarship.deadline).toLocaleDateString()}</span>
              </div>

              <a href={scholarship.link} target="_blank" rel="noreferrer" className="block">
                <Button className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg">
                  Apply Now <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </a>

              <Button
                variant="outline"
                onClick={handleSave}
                disabled={savingLoading}
                className={`w-full h-11 rounded-lg font-semibold transition-all ${isSaved ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/40' : 'border-border text-foreground hover:bg-muted'}`}
              >
                {savingLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSaved ? (
                  <><BookmarkCheck className="w-4 h-4 mr-2" /> Saved</>
                ) : (
                  <><Bookmark className="w-4 h-4 mr-2" /> Save for Later</>
                )}
              </Button>
              
              {isSaved && (
                <p className="text-xs text-center text-muted-foreground">
                  ✓ Added to your Dashboard under "Saved"
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Community & Comments */}
        <div className="mt-16 bg-card border border-border rounded-2xl p-6 md:p-10 shadow-sm">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-red-500" /> Community Discussions
          </h2>

          {/* Post Comment Form */}
          {user ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newComment.trim()) return;
              setCommentLoading(true);
              try {
                const { data } = await axios.post(`http://localhost:5000/api/comments/${id}`, 
                  { text: newComment }, 
                  { headers: { Authorization: `Bearer ${useAuthStore.getState().user?.token}` } }
                );
                setComments([data.data, ...comments]);
                setNewComment('');
              } catch (err) {
                console.error(err);
              } finally {
                setCommentLoading(false);
              }
            }} className="mb-10">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0 text-red-600 font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 space-y-3">
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ask a question or share your experience..."
                    rows={3}
                    className="w-full resize-none p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={commentLoading || !newComment.trim()} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
                      {commentLoading ? 'Posting...' : <><Send className="w-4 h-4 mr-2" /> Post Comment</>}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-6 bg-muted rounded-xl text-center mb-10 border-2 border-dashed border-border">
              <p className="text-muted-foreground mb-4">Please log in to participate in the discussion.</p>
              <Link to="/login"><Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-none">Login to Comment</Button></Link>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-6">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to start the discussion!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment._id} className="flex gap-4 p-5 bg-background border border-border rounded-xl shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 font-bold text-muted-foreground">
                    {comment.user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-semibold">{comment.user?.name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
