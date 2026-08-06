import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { useTranslation } from 'react-i18next';
import {
  FileText, Bookmark, GraduationCap, MapPin, Calendar, Clock,
  Loader2, Plus, ArrowRight, Settings, CheckCircle, ExternalLink,
  Trash2, ChevronDown, Sparkles, X, XCircle, Copy, MessageSquare, Menu, Pencil, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';
import { useToast } from '../components/ui/Toast';

import { API_BASE as API } from '../config/api';

interface Scholarship {
  _id: string;
  title: { en: string; ar: string };
  university: { en: string; ar: string };
  country: { en: string; ar: string };
  degree: string;
  fundingType: string;
  deadline: string;
  link: string;
  image?: string;
  majors?: string[];
  matchPercentage?: number;
  matchReasons?: {
    countryMatch?: boolean;
    majorMatch?: boolean;
  };
}

interface AppEntry {
  _id: string;
  scholarship: Scholarship;
  status: 'saved' | 'applying' | 'accepted';
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'saved' | 'applying' | 'accepted' | 'contribute' | 'matches' | 'mysubmissions' | 'analytics'>('saved');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [applications, setApplications] = useState<{ saved: AppEntry[]; applying: AppEntry[]; underReview: AppEntry[]; interview: AppEntry[]; accepted: AppEntry[]; rejected: AppEntry[] }>({
    saved: [], applying: [], underReview: [], interview: [], accepted: [], rejected: []
  });
  const [matchedScholarships, setMatchedScholarships] = useState<Scholarship[]>([]);
  const [myScholarships, setMyScholarships] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingMyScholarships, setLoadingMyScholarships] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Cover Letter state
  const [clLoading, setClLoading] = useState<string | null>(null);
  const [clModalOpen, setClModalOpen] = useState(false);
  const [currentCl, setCurrentCl] = useState('');
  const [currentClTitle, setCurrentClTitle] = useState('');

  // Edit my scholarship state
  const [editingMyScholarship, setEditingMyScholarship] = useState<any | null>(null);
  const [updatingMyScholarship, setUpdatingMyScholarship] = useState(false);

  const { success: toastSuccess, error: toastError } = useToast();

  // ── Redirect admins ─────────────────────────────────────────────────────────
  if (user?.role === 'admin' || user?.role === 'assistant_admin') {
    return <AdminDashboard />;
  }

  const token = user?.token;

  const fetchApplications = useCallback(async () => {
    if (!token) return;
    setLoadingApps(true);
    try {
      const { data } = await axios.get(`${API}/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingApps(false);
    }
  }, [token]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const fetchMatches = useCallback(async () => {
    if (!token) return;
    setLoadingMatches(true);
    try {
      const { data } = await axios.get(`${API}/scholarships/matches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMatchedScholarships(data.data || []);
    } catch (e) {
      console.error(e);
      setMatchedScholarships([]);
    } finally {
      setLoadingMatches(false);
    }
  }, [token]);

  // Fetch matches when matches tab is activated
  useEffect(() => {
    if (activeTab === 'matches') {
      fetchMatches();
    }
  }, [activeTab, fetchMatches]);

  // Fetch my submissions when tab is activated
  useEffect(() => {
    if (activeTab === 'mysubmissions') {
      fetchMyScholarships();
    }
  }, [activeTab]);

  const fetchMyScholarships = useCallback(async () => {
    if (!token) return;
    setLoadingMyScholarships(true);
    try {
      const { data } = await axios.get(`${API}/scholarships/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyScholarships(data.data || []);
    } catch (e) {
      console.error(e);
      setMyScholarships([]);
    } finally {
      setLoadingMyScholarships(false);
    }
  }, [token]);

  const handleUpdateMyScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMyScholarship) return;
    setUpdatingMyScholarship(true);
    try {
      const { _id, submittedBy, createdAt, updatedAt, __v, ...fields } = editingMyScholarship;
      await axios.put(`${API}/scholarships/${_id}`, fields, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toastSuccess('Updated!', 'Your scholarship has been updated.');
      setEditingMyScholarship(null);
      fetchMyScholarships();
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not update scholarship.');
    } finally {
      setUpdatingMyScholarship(false);
    }
  };

  // Move scholarship between columns
  const handleStatusChange = async (scholarshipId: string, newStatus: 'saved' | 'applying' | 'under_review' | 'interview' | 'accepted' | 'rejected') => {
    setStatusUpdating(scholarshipId);
    try {
      await axios.patch(`${API}/applications/${scholarshipId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchApplications();
      toastSuccess(`Moved to "${newStatus}"`);
    } catch {
      toastError('Failed', 'Could not update status. Please try again.');
    } finally {
      setStatusUpdating(null);
    }
  };

  // Remove / unsave a scholarship
  const handleRemove = async (scholarshipId: string) => {
    setRemoving(scholarshipId);
    try {
      await axios.post(`${API}/applications/save/${scholarshipId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchApplications();
      toastSuccess('Removed from your list');
    } catch {
      toastError('Failed', 'Could not remove scholarship.');
    } finally {
      setRemoving(null);
    }
  };

  const handleGenerateCL = async (scholarshipId: string, title: string) => {
    if (!user?.major || !user?.englishLevel) {
      toastError('Profile Incomplete', 'Please fill out your Smart Profile first to generate accurate cover letters.');
      window.location.href = '/profile';
      return;
    }

    setClLoading(scholarshipId);
    try {
      const { data } = await axios.post(`${API}/ai/cover-letter`, { scholarshipId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentClTitle(title);
      setCurrentCl(data.data);
      setClModalOpen(true);
    } catch {
      toastError('Failed', 'Could not generate cover letter. Try again.');
    } finally {
      setClLoading(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentCl);
    toastSuccess('Copied!', 'Cover letter copied to clipboard.');
  };

  const tabs = [
    { id: 'saved',    label: 'Saved',       count: applications.saved.length,    icon: Bookmark },
    { id: 'applying', label: 'In Progress',  count: applications.applying.length, icon: Clock },
    { id: 'underReview', label: 'Under Review', count: applications.underReview.length, icon: Clock },
    { id: 'interview', label: 'Interview',    count: applications.interview.length, icon: GraduationCap },
    { id: 'accepted', label: 'Accepted',     count: applications.accepted.length, icon: GraduationCap },
    { id: 'rejected', label: 'Rejected',     count: applications.rejected.length, icon: XCircle },
    { id: 'matches',  label: 'Perfect Matches', count: matchedScholarships.length, icon: Sparkles },
    { id: 'mysubmissions', label: 'My Submissions', count: myScholarships.length, icon: FileText },
    { id: 'analytics', label: 'My Analytics', count: 0, icon: BarChart2 },
  ];

  const currentApps = applications[activeTab as keyof typeof applications] ?? [];

  const formatDeadline = (d: string) => {
    if (!d) return '—';
    const date = new Date(d);
    const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const label = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (diff < 0) return `${label} (Expired)`;
    if (diff < 14) return `${label} (${diff}d left)`;
    return label;
  };

  // ── Contribute Form ──────────────────────────────────────────────────────────
  const [loadingContrib, setLoadingContrib] = useState(false);
  const [successContrib, setSuccessContrib] = useState('');
  const [form, setForm] = useState({
    titleEn: '', titleAr: '', descEn: '', descAr: '',
    countryEn: '', countryAr: '', uniEn: '', uniAr: '',
    degree: 'Bachelor', fundingType: 'Fully Funded', deadline: '', link: '', image: ''
  });

  const handleChangeForm = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingContrib(true);
    setSuccessContrib('');
    try {
      await axios.post(`${API}/scholarships`, {
        title: { en: form.titleEn, ar: form.titleAr },
        description: { en: form.descEn, ar: form.descAr },
        country: { en: form.countryEn, ar: form.countryAr },
        university: { en: form.uniEn, ar: form.uniAr },
        degree: form.degree,
        fundingType: form.fundingType,
        deadline: form.deadline && !isNaN(Date.parse(form.deadline)) ? new Date(form.deadline).toISOString() : '',
        link: form.link,
        image: form.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop',
        keywords: ['Scholarship', form.countryEn, form.degree],
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSuccessContrib('Submitted for review! Thank you for contributing.');
      toastSuccess('Submitted!', 'Your scholarship is pending review.');
      setForm({ titleEn: '', titleAr: '', descEn: '', descAr: '', countryEn: '', countryAr: '', uniEn: '', uniAr: '', degree: 'Bachelor', fundingType: 'Fully Funded', deadline: '', link: '', image: '' });
    } catch {
      toastError('Submission failed', 'Please check all required fields.');
    } finally {
      setLoadingContrib(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-10 border-b border-border pb-8">
          <h1 className="text-4xl font-light tracking-tight mb-2">
            Welcome back, <span className="font-semibold">{user?.name}</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            {applications.saved.length + applications.applying.length + applications.accepted.length} scholarships tracked &nbsp;·&nbsp;
            {applications.accepted.length} accepted
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12">

          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed bottom-6 left-6 z-50 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl shadow-red-500/30 flex items-center justify-center transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {sidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-background border-r border-border overflow-y-auto"
                >
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="font-bold text-foreground">Menu</h2>
                    <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-muted rounded-lg">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <nav className="p-2 flex flex-col gap-1">
                    {tabs.map(tab => (
                      <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg
                          ${activeTab === tab.id ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
                        <tab.icon className="w-5 h-5" />
                        <span className="flex-1">{tab.label}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-background/20' : 'bg-muted-foreground/20'}`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                    <div className="h-px bg-border my-2" />
                    <button onClick={() => { setActiveTab('contribute'); setSidebarOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg
                        ${activeTab === 'contribute' ? 'bg-red-600 text-white font-medium' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950'}`}>
                      <Plus className="w-5 h-5" />
                      <span>Submit Scholarship</span>
                    </button>
                    <div className="h-px bg-border my-2" />
                    <Link to="/interview-simulator" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-left transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg">
                      <MessageSquare className="w-5 h-5" />
                      <span className="font-medium">Mock Interview</span>
                    </Link>
                    <Link to="/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-left transition-colors text-muted-foreground hover:bg-muted rounded-lg">
                      <Settings className="w-5 h-5" />
                      <span>Edit Profile</span>
                    </Link>
                  </nav>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Desktop Sidebar */}
          <nav className="hidden lg:flex w-60 shrink-0 flex-col gap-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 text-left transition-colors whitespace-nowrap lg:whitespace-normal
                  ${activeTab === tab.id ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
                <tab.icon className="w-5 h-5" />
                <span className="flex-1">{tab.label}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-background/20' : 'bg-muted-foreground/20'}`}>
                  {tab.count}
                </span>
              </button>
            ))}

            <div className="hidden lg:block h-px bg-border my-2" />

            <button onClick={() => setActiveTab('contribute')}
              className={`flex items-center gap-3 px-4 py-3 text-left transition-colors whitespace-nowrap lg:whitespace-normal
                ${activeTab === 'contribute' ? 'bg-red-600 text-white font-medium' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950'}`}>
              <Plus className="w-5 h-5" />
              <span>Submit Scholarship</span>
            </button>

            <div className="hidden lg:block h-px bg-border my-2" />

            <Link to="/interview-simulator" className="flex items-center gap-3 px-4 py-3 text-left transition-colors whitespace-nowrap lg:whitespace-normal text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-sm">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Mock Interview</span>
            </Link>
            <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-left transition-colors whitespace-nowrap lg:whitespace-normal text-muted-foreground hover:bg-muted rounded-sm">
              <Settings className="w-5 h-5" />
              <span>Edit Profile</span>
            </Link>
          </nav>

          {/* Main */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>

                {/* ── Contribute tab ── */}
                {activeTab === 'analytics' ? (
                  <div className="max-w-4xl">
                    <h2 className="text-2xl font-light mb-6">My Progress Analytics</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="bg-card border border-border rounded-lg p-5 shadow-sm text-center">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bookmark className="w-6 h-6 text-blue-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">Total Saved</p>
                        <p className="text-2xl font-bold mt-1">{applications.saved.length}</p>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-5 shadow-sm text-center">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Clock className="w-6 h-6 text-yellow-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">In Progress</p>
                        <p className="text-2xl font-bold mt-1">{applications.applying.length + applications.underReview.length}</p>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-5 shadow-sm text-center">
                        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                          <GraduationCap className="w-6 h-6 text-green-500" />
                        </div>
                        <p className="text-sm text-muted-foreground">Accepted</p>
                        <p className="text-2xl font-bold mt-1">{applications.accepted.length}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold mb-6">Application Funnel</h3>
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: 'Saved', count: applications.saved.length },
                              { name: 'Applied', count: applications.applying.length + applications.underReview.length },
                              { name: 'Interview', count: applications.interview.length },
                              { name: 'Accepted', count: applications.accepted.length }
                            ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} />
                              <YAxis tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} />
                              <RechartsTooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}} />
                              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                        <h3 className="font-semibold mb-6">Application Status</h3>
                        <div className="h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Saved', count: applications.saved.length },
                                  { name: 'Applying', count: applications.applying.length },
                                  { name: 'Review', count: applications.underReview.length },
                                  { name: 'Accepted', count: applications.accepted.length }
                                ].filter(d => d.count > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="count"
                              >
                                {applications.saved.length > 0 && <Cell fill="#3b82f6" />}
                                {applications.applying.length > 0 && <Cell fill="#f59e0b" />}
                                {applications.underReview.length > 0 && <Cell fill="#8b5cf6" />}
                                {applications.accepted.length > 0 && <Cell fill="#10b981" />}
                              </Pie>
                              <RechartsTooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}} />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'contribute' ? (
                  <div className="max-w-3xl">
                    <h2 className="text-2xl font-light mb-1">Contribute a Scholarship</h2>
                    <p className="text-muted-foreground mb-8 text-sm">
                      Fill in the details below. Your submission will be reviewed before being published.
                    </p>

                    {successContrib && (
                      <div className="mb-6 p-4 bg-green-500/10 text-green-600 border border-green-500/20 flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4" /> {successContrib}
                      </div>
                    )}

                    <form onSubmit={handleContribute} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5"><Label className="text-xs">Title (EN)</Label><Input name="titleEn" value={form.titleEn} onChange={handleChangeForm} required className="rounded-none shadow-none h-10" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Title (AR)</Label><Input name="titleAr" value={form.titleAr} onChange={handleChangeForm} required className="rounded-none shadow-none h-10 text-right" dir="rtl" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5"><Label className="text-xs">Description (EN)</Label><textarea name="descEn" value={form.descEn} onChange={handleChangeForm} required rows={3} className="w-full border border-input p-2.5 rounded-none bg-background text-sm shadow-none resize-none focus:outline-none focus:ring-1 focus:ring-ring" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Description (AR)</Label><textarea name="descAr" value={form.descAr} onChange={handleChangeForm} required rows={3} dir="rtl" className="w-full border border-input p-2.5 rounded-none bg-background text-sm shadow-none resize-none text-right focus:outline-none focus:ring-1 focus:ring-ring" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5"><Label className="text-xs">University (EN)</Label><Input name="uniEn" value={form.uniEn} onChange={handleChangeForm} required className="rounded-none shadow-none h-10" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">University (AR)</Label><Input name="uniAr" value={form.uniAr} onChange={handleChangeForm} required className="rounded-none shadow-none h-10 text-right" dir="rtl" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5"><Label className="text-xs">Country (EN)</Label><Input name="countryEn" value={form.countryEn} onChange={handleChangeForm} required className="rounded-none shadow-none h-10" /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Country (AR)</Label><Input name="countryAr" value={form.countryAr} onChange={handleChangeForm} required className="rounded-none shadow-none h-10 text-right" dir="rtl" /></div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        <div className="space-y-1.5"><Label className="text-xs">Degree</Label>
                          <select name="degree" value={form.degree} onChange={handleChangeForm} className="w-full h-10 border border-input bg-background px-2.5 rounded-none text-sm shadow-none">
                            <option>Bachelor</option><option>Master</option><option>PhD</option>
                          </select>
                        </div>
                        <div className="space-y-1.5 col-span-2"><Label className="text-xs">Funding Type</Label>
                          <select name="fundingType" value={form.fundingType} onChange={handleChangeForm} className="w-full h-10 border border-input bg-background px-2.5 rounded-none text-sm shadow-none">
                            <option>Fully Funded</option><option>Partially Funded</option>
                          </select>
                        </div>
                        <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="date" name="deadline" value={form.deadline} onChange={handleChangeForm} required className="rounded-none shadow-none h-10" /></div>
                      </div>
                      <div className="space-y-1.5"><Label className="text-xs">Application Link</Label><Input type="url" name="link" value={form.link} onChange={handleChangeForm} required className="rounded-none shadow-none h-10" /></div>
                      <div className="space-y-1.5"><Label className="text-xs">Image URL (optional)</Label><Input type="url" name="image" value={form.image} onChange={handleChangeForm} className="rounded-none shadow-none h-10" /></div>
                      <Button type="submit" disabled={loadingContrib} className="w-full h-11 rounded-none bg-red-600 hover:bg-red-700 text-white font-medium">
                        {loadingContrib ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : 'Submit for Review'}
                      </Button>
                    </form>
                  </div>
                ) : activeTab === 'matches' ? (
                  /* ── Perfect Matches tab ── */
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-light capitalize flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-red-500" /> Perfect Matches
                      </h2>
                      <a href="/search">
                        <Button variant="outline" className="border-border rounded-none shadow-none font-medium text-sm">
                          <Plus className="w-4 h-4 mr-2" /> Find Scholarships
                        </Button>
                      </a>
                    </div>

                    {loadingMatches ? (
                      <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : matchedScholarships.length === 0 ? (
                      <div className="text-center py-24 border border-dashed border-border">
                        <Sparkles className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Perfect Matches Yet</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                          Complete your Smart Profile with your target countries and major to get personalized scholarship recommendations.
                        </p>
                        <Link to="/profile">
                          <Button className="mt-4 rounded-none shadow-none bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white font-medium">
                            <Settings className="w-4 h-4 mr-2" /> Complete Smart Profile
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {matchedScholarships.map((s) => {
                          if (!s) return null;
                          return (
                            <Card key={s._id} className="rounded-none border-border shadow-none bg-card hover:border-foreground/30 transition-colors relative overflow-hidden">
                              {/* Match percentage badge */}
                              <div className="absolute top-3 right-3 z-10">
                                <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">
                                  {s.matchPercentage}% Match
                                </span>
                              </div>
                              <CardContent className="p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">

                                {/* Image */}
                                {s.image && (
                                  <img src={s.image} alt="" className="w-16 h-16 object-cover shrink-0 rounded-sm hidden sm:block" />
                                )}

                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-semibold truncate">{s.title?.en}</h3>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                                    <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{s.university?.en}</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.country?.en}</span>
                                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDeadline(s.deadline)}</span>
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    <span className="text-[11px] px-2 py-0.5 bg-muted font-medium">{s.fundingType}</span>
                                    <span className="text-[11px] px-2 py-0.5 bg-muted font-medium">{s.degree}</span>
                                  </div>
                                  {/* Match reasons */}
                                  {s.matchReasons && (
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                      {s.matchReasons.countryMatch && (
                                        <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 font-medium flex items-center gap-1">
                                          <MapPin className="w-3 h-3" /> Country Match
                                        </span>
                                      )}
                                      {s.matchReasons.majorMatch && (
                                        <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-600 font-medium flex items-center gap-1">
                                          <GraduationCap className="w-3 h-3" /> Major Match
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto items-center">

                                  {/* AI Cover Letter Button */}
                                  <Button
                                    onClick={() => handleGenerateCL(s._id, s.title?.en)}
                                    disabled={clLoading === s._id}
                                    className="rounded-none bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white shadow-sm text-xs h-9 px-3 w-full sm:w-auto flex items-center justify-center gap-1.5"
                                  >
                                    {clLoading === s._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    {clLoading === s._id ? 'Generating...' : 'AI Letter'}
                                  </Button>

                                  {/* Open link */}
                                  <a href={s.link} target="_blank" rel="noreferrer">
                                    <Button className="rounded-none shadow-none bg-foreground text-background hover:bg-foreground/90 text-xs h-9 px-3 w-full sm:w-auto">
                                      Apply <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                                    </Button>
                                  </a>

                                  {/* Save */}
                                  <Button variant="ghost" disabled={removing === s._id}
                                    onClick={() => handleRemove(s._id)}
                                    className="rounded-none shadow-none text-muted-foreground hover:text-green-500 h-9 px-2.5 w-full sm:w-auto">
                                    {removing === s._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
                                  </Button>
                                </div>

                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : activeTab === 'mysubmissions' ? (
                  /* ── My Submissions tab ── */
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-light flex items-center gap-2">
                        <FileText className="w-5 h-5" /> My Submissions
                      </h2>
                      <Button onClick={() => setActiveTab('contribute')} className="rounded-none shadow-none bg-red-600 hover:bg-red-700 text-white text-sm h-9 px-4">
                        <Plus className="w-4 h-4 mr-1" /> Submit New
                      </Button>
                    </div>

                    {loadingMyScholarships ? (
                      <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : myScholarships.length === 0 ? (
                      <div className="text-center py-24 border border-dashed border-border">
                        <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
                        <p className="text-muted-foreground text-sm mb-4">Submit a scholarship to see it here.</p>
                        <Button onClick={() => setActiveTab('contribute')} className="mt-2 rounded-none shadow-none bg-red-600 hover:bg-red-700 text-white font-medium">
                          <Plus className="w-4 h-4 mr-2" /> Submit Scholarship
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {myScholarships.map((s: any) => (
                          <Card key={s._id} className="rounded-none border-border shadow-none bg-card">
                            <CardContent className="p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-base font-semibold truncate">{s.title?.en}</h3>
                                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                                      s.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                                        'bg-red-500/10 text-red-600'
                                    }`}>
                                    {s.status}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                                  <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{s.university?.en}</span>
                                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.country?.en}</span>
                                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDeadline(s.deadline)}</span>
                                </div>
                              </div>
                              {s.status === 'approved' && (
                                <Button onClick={() => setEditingMyScholarship({ ...s })} variant="outline" size="sm" className="h-8 px-3 text-xs rounded-none">
                                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (

                  /* ── Kanban tabs ── */
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-light capitalize">{tabs.find(t => t.id === activeTab)?.label}</h2>
                      <div className="flex gap-2">
                        <a href="/search">
                          <Button variant="outline" className="border-border rounded-none shadow-none font-medium text-sm">
                            <Plus className="w-4 h-4 mr-2" /> Find Scholarships
                          </Button>
                        </a>
                        <Link to="/interview-simulator">
                          <Button variant="outline" className="rounded-none shadow-none border-red-200 text-red-700 font-medium text-sm">
                            <MessageSquare className="w-4 h-4 mr-2" /> Mock Interview
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {loadingApps ? (
                      <div className="flex items-center justify-center py-24">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : currentApps.length === 0 ? (
                      <div className="text-center py-24 border border-dashed border-border">
                        <Bookmark className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nothing here yet</h3>
                        <p className="text-muted-foreground text-sm">
                          {activeTab === 'saved' ? 'Search for scholarships and save the ones you like.' : `No scholarships in "${activeTab}" status.`}
                        </p>
                        <a href="/search"><Button variant="outline" className="mt-6 rounded-none shadow-none border-border font-medium">Browse Scholarships</Button></a>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {currentApps.map((app) => {
                          const s = app.scholarship;
                          if (!s) return null;
                          return (
                            <Card key={app._id} className="rounded-none border-border shadow-none bg-card hover:border-foreground/30 transition-colors">
                              <CardContent className="p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">

                                {/* Image */}
                                {s.image && (
                                  <img src={s.image} alt="" className="w-16 h-16 object-cover shrink-0 rounded-sm hidden sm:block" />
                                )}

                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-semibold truncate">{s.title?.en}</h3>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
                                    <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{s.university?.en}</span>
                                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.country?.en}</span>
                                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDeadline(s.deadline)}</span>
                                  </div>
                                  <div className="flex gap-2 mt-2">
                                    <span className="text-[11px] px-2 py-0.5 bg-muted font-medium">{s.fundingType}</span>
                                    <span className="text-[11px] px-2 py-0.5 bg-muted font-medium">{s.degree}</span>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto items-center">

                                  {/* AI Cover Letter Button (only for Saved & Applying) */}
                                  {(app.status === 'saved' || app.status === 'applying') && (
                                    <Button
                                      onClick={() => handleGenerateCL(s._id, s.title?.en)}
                                      disabled={clLoading === s._id}
                                      className="rounded-none bg-gradient-to-r from-red-600 to-red-600 hover:from-red-700 hover:to-red-700 text-white shadow-sm text-xs h-9 px-3 w-full sm:w-auto flex items-center justify-center gap-1.5"
                                    >
                                      {clLoading === s._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                      {clLoading === s._id ? 'Generating...' : 'AI Letter'}
                                    </Button>
                                  )}

                                  {/* Move status dropdown */}
                                  <div className="relative group">
                                    <Button variant="outline" disabled={statusUpdating === s._id} className="rounded-none shadow-none border-border text-xs h-9 px-3 w-full sm:w-auto">
                                      {statusUpdating === s._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ChevronDown className="w-3.5 h-3.5 mr-1" />Move to</>}
                                    </Button>
                                    <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border shadow-lg z-10 hidden group-hover:block">
                                      {(['saved', 'applying', 'under_review', 'interview', 'accepted', 'rejected'] as const).filter(st => st !== app.status).map(st => (
                                        <button key={st} onClick={() => handleStatusChange(s._id, st)}
                                          className="w-full px-3 py-2 text-left text-xs hover:bg-muted capitalize">{st}</button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Open link */}
                                  <a href={s.link} target="_blank" rel="noreferrer">
                                    <Button className="rounded-none shadow-none bg-foreground text-background hover:bg-foreground/90 text-xs h-9 px-3 w-full sm:w-auto">
                                      Apply <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                                    </Button>
                                  </a>

                                  {/* Remove */}
                                  <Button variant="ghost" disabled={removing === s._id}
                                    onClick={() => handleRemove(s._id)}
                                    className="rounded-none shadow-none text-muted-foreground hover:text-red-500 h-9 px-2.5 w-full sm:w-auto">
                                    {removing === s._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </Button>
                                </div>

                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── AI Cover Letter Modal ── */}
      <AnimatePresence>
        {clModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/40">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-red-500" /> AI Cover Letter</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">For: {currentClTitle}</p>
                </div>
                <button onClick={() => setClModalOpen(false)} className="p-1.5 hover:bg-muted rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1">
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-serif text-foreground/90 p-4 bg-background border border-border rounded-lg shadow-inner">
                  {currentCl}
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/40 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setClModalOpen(false)} className="rounded-xl px-6">Close</Button>
                <Button onClick={copyToClipboard} className="rounded-xl px-6 bg-red-600 hover:bg-red-700 text-white">
                  <Copy className="w-4 h-4 mr-2" /> Copy to Clipboard
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit My Scholarship Modal */}
      {editingMyScholarship && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingMyScholarship(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold">Edit Your Scholarship</h2>
              <Button onClick={() => setEditingMyScholarship(null)} variant="ghost" size="sm"><X className="w-5 h-5" /></Button>
            </div>
            <form onSubmit={handleUpdateMyScholarship} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Title (EN)</Label><Input value={editingMyScholarship.title?.en || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, title: { ...editingMyScholarship.title, en: e.target.value } })} required className="rounded-none shadow-none h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Title (AR)</Label><Input value={editingMyScholarship.title?.ar || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, title: { ...editingMyScholarship.title, ar: e.target.value } })} required className="rounded-none shadow-none h-10 text-right" dir="rtl" /></div>
                <div className="space-y-1.5"><Label className="text-xs">University (EN)</Label><Input value={editingMyScholarship.university?.en || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, university: { ...editingMyScholarship.university, en: e.target.value } })} required className="rounded-none shadow-none h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">University (AR)</Label><Input value={editingMyScholarship.university?.ar || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, university: { ...editingMyScholarship.university, ar: e.target.value } })} required className="rounded-none shadow-none h-10 text-right" dir="rtl" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Country (EN)</Label><Input value={editingMyScholarship.country?.en || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, country: { ...editingMyScholarship.country, en: e.target.value } })} required className="rounded-none shadow-none h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Country (AR)</Label><Input value={editingMyScholarship.country?.ar || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, country: { ...editingMyScholarship.country, ar: e.target.value } })} required className="rounded-none shadow-none h-10 text-right" dir="rtl" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Degree</Label>
                  <select value={editingMyScholarship.degree || 'Bachelor'} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, degree: e.target.value })} className="w-full h-10 border border-input bg-background px-2.5 rounded-none text-sm shadow-none">
                    <option>Bachelor</option><option>Master</option><option>PhD</option>
                  </select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Funding Type</Label>
                  <select value={editingMyScholarship.fundingType || 'Fully Funded'} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, fundingType: e.target.value })} className="w-full h-10 border border-input bg-background px-2.5 rounded-none text-sm shadow-none">
                    <option>Fully Funded</option><option>Partially Funded</option>
                  </select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="date" value={editingMyScholarship.deadline?.substring(0, 10) || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, deadline: e.target.value })} required className="rounded-none shadow-none h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Application Link</Label><Input type="url" value={editingMyScholarship.link || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, link: e.target.value })} required className="rounded-none shadow-none h-10" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Description (EN)</Label><textarea value={editingMyScholarship.description?.en || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, description: { ...editingMyScholarship.description, en: e.target.value } })} required rows={3} className="w-full border border-input p-2.5 rounded-none bg-background text-sm shadow-none resize-none focus:outline-none focus:ring-1 focus:ring-ring" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Description (AR)</Label><textarea value={editingMyScholarship.description?.ar || ''} onChange={e => setEditingMyScholarship({ ...editingMyScholarship, description: { ...editingMyScholarship.description, ar: e.target.value } })} required rows={3} dir="rtl" className="w-full border border-input p-2.5 rounded-none bg-background text-sm shadow-none resize-none text-right focus:outline-none focus:ring-1 focus:ring-ring" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingMyScholarship(null)} className="rounded-none">Cancel</Button>
                <Button type="submit" disabled={updatingMyScholarship} className="rounded-none bg-red-600 hover:bg-red-700 text-white">
                  {updatingMyScholarship ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
