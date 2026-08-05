import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { useToast } from '../components/ui/Toast';
import axios from 'axios';
import {
  Loader2, Plus, CheckCircle, Clock, XCircle,
  ShieldCheck, Upload, FileJson, X, Tag, Sparkles,
  Trash2, Search, RefreshCw, Menu, Users, UserCheck, Pencil
} from 'lucide-react';

import { API_BASE as API } from '../config/api';

// ── JSON Schema Template ────────────────────────────────────────────────────
const JSON_TEMPLATE = `[
  {
    "title":       { "en": "Scholarship Title", "ar": "اسم المنحة" },
    "description": { "en": "Full description here", "ar": "الوصف هنا" },
    "university":  { "en": "University Name", "ar": "اسم الجامعة" },
    "country":     { "en": "Germany", "ar": "ألمانيا" },
    "degree":      "Master",
    "fundingType": "Fully Funded",
    "deadline":    "2025-12-31",
    "link":        "https://example.com/apply",
    "image":       "https://images.unsplash.com/photo-1523050854058?w=800",
    "keywords":    ["Engineering", "Germany", "Masters"]
  }
]`;

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [activeTab, setActiveTab] = useState<'analytics' | 'pending' | 'add' | 'bulk' | 'staff' | 'manage' | 'users'>('analytics');
  const [pendingScholarships, setPendingScholarships] = useState<any[]>([]);
  const [allScholarships, setAllScholarships] = useState<any[]>([]);
  const [allScholarshipsTotal, setAllScholarshipsTotal] = useState(0);
  const [allScholarshipsPage, setAllScholarshipsPage] = useState(1);
  const [manageSearch, setManageSearch] = useState('');
  const [manageStatus, setManageStatus] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<any | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { data } = await axios.get(`${API}/admin/stats`, { headers });
      setAnalytics(data.data);
    } catch {
      toastError('Failed', 'Could not load analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Users & Staff state
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allUsersTotal, setAllUsersTotal] = useState(0);
  const [allUsersPage, setAllUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [userDeleteConfirmId, setUserDeleteConfirmId] = useState<string | null>(null);
  const [userDeleteLoading, setUserDeleteLoading] = useState(false);

  const headers = { Authorization: `Bearer ${user?.token}` };

  // ── Pending ──────────────────────────────────────────────────────────────────
  const fetchPending = async () => {
    try {
      const { data } = await axios.get(`${API}/scholarships/pending`, { headers });
      setPendingScholarships(data.data);
    } catch {
      toastError('Failed to load', 'Could not fetch pending scholarships.');
    }
  };

  useEffect(() => { if (activeTab === 'pending') fetchPending(); }, [activeTab]);

  // ── All Scholarships (Manage) ────────────────────────────────────────────────
  const fetchAllScholarships = async (page = 1, search = '', status = '') => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const { data } = await axios.get(`${API}/scholarships/all?${params}`, { headers });
      setAllScholarships(data.data);
      setAllScholarshipsTotal(data.pagination?.total || 0);
      setAllScholarshipsPage(page);
    } catch {
      toastError('Failed', 'Could not load scholarships.');
    }
  };

  useEffect(() => {
    if (activeTab === 'manage') fetchAllScholarships(1, manageSearch, manageStatus);
  }, [activeTab]);

  const handleManageSearch = () => {
    fetchAllScholarships(1, manageSearch, manageStatus);
  };

  const handleDeleteScholarship = async (id: string) => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/scholarships/${id}`, { headers });
      toastSuccess('Deleted!', 'Scholarship and all related data removed.');
      setDeleteConfirmId(null);
      fetchAllScholarships(allScholarshipsPage, manageSearch, manageStatus);
    } catch {
      toastError('Failed', 'Could not delete scholarship.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAllScholarships = async () => {
    setDeleteAllLoading(true);
    try {
      await axios.delete(`${API}/scholarships/delete-all`, { headers });
      toastSuccess('All Deleted!', 'All scholarships have been removed.');
      setDeleteAllConfirm(false);
      fetchAllScholarships(1, '', '');
    } catch {
      toastError('Failed', 'Could not delete all scholarships.');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleUpdateScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScholarship) return;
    setLoading(true);
    try {
      const { _id, submittedBy, createdAt, updatedAt, __v, ...fields } = editingScholarship;
      await axios.put(`${API}/scholarships/${_id}`, fields, { headers });
      toastSuccess('Updated!', 'Scholarship updated successfully.');
      setEditingScholarship(null);
      fetchAllScholarships(allScholarshipsPage, manageSearch, manageStatus);
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not update scholarship.');
    } finally {
      setLoading(false);
    }
  };

  // ── Users (Admin only) ─────────────────────────────────────────────────────
  const fetchAllUsers = async (page = 1, search = '', role = '') => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      const { data } = await axios.get(`${API}/auth/users?${params}`, { headers });
      setAllUsers(data.data);
      setAllUsersTotal(data.pagination?.total || 0);
      setAllUsersPage(page);
    } catch {
      toastError('Failed', 'Could not load users.');
    }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/staff`, { headers });
      setStaffList(data.data);
    } catch {
      toastError('Failed', 'Could not load staff.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    setUserDeleteLoading(true);
    try {
      await axios.delete(`${API}/auth/users/${id}`, { headers });
      toastSuccess('Deleted!', 'User account removed.');
      setUserDeleteConfirmId(null);
      fetchAllUsers(allUsersPage, userSearch, userRole);
      fetchStaff();
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not delete user.');
    } finally {
      setUserDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'users') fetchAllUsers(1, userSearch, userRole);
    if (activeTab === 'staff') fetchStaff();
  }, [activeTab]);

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await axios.patch(`${API}/scholarships/${id}/status`, { status }, { headers });
      toastSuccess(status === 'approved' ? 'Scholarship approved!' : 'Scholarship rejected.');
      fetchPending();
    } catch {
      toastError('Failed', 'Could not update scholarship status.');
    }
  };

  // ── Add Single Scholarship ───────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    titleEn: '', titleAr: '', descEn: '', descAr: '', countryEn: '', countryAr: '',
    uniEn: '', uniAr: '', degree: 'Bachelor', fundingType: 'Fully Funded',
    deadline: '', link: '', image: '', keywordsRaw: ''
  });
  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const keywords = formData.keywordsRaw
        .split(',').map(k => k.trim()).filter(Boolean);
      await axios.post(`${API}/scholarships`, {
        title: { en: formData.titleEn, ar: formData.titleAr },
        description: { en: formData.descEn, ar: formData.descAr },
        country: { en: formData.countryEn, ar: formData.countryAr },
        university: { en: formData.uniEn, ar: formData.uniAr },
        degree: formData.degree,
        fundingType: formData.fundingType,
        deadline: new Date(formData.deadline).toISOString(),
        link: formData.link,
        image: formData.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop',
        keywords: keywords.length ? keywords : ['Scholarship', formData.countryEn, formData.degree],
      }, { headers });
      toastSuccess('Scholarship published!', `"${formData.titleEn}" is now live.`);
      setFormData({ titleEn: '', titleAr: '', descEn: '', descAr: '', countryEn: '', countryAr: '', uniEn: '', uniAr: '', degree: 'Bachelor', fundingType: 'Fully Funded', deadline: '', link: '', image: '', keywordsRaw: '' });
    } catch (err: any) {
      toastError('Failed to publish', err.response?.data?.message || 'Check all required fields.');
    } finally {
      setLoading(false);
    }
  };

  // ── Bulk Import ──────────────────────────────────────────────────────────────
  const [bulkJson, setBulkJson] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [jsonError, setJsonError] = useState('');

  const validateJsonWithAI = async (rawJson: string, parseError: string) => {
    try {
      const { data } = await axios.post(`${API}/ai/chat`, {
        messages: [{
          role: 'user',
          content: `This JSON for scholarship import has an error. Explain the problem clearly and concisely in 2-3 sentences, and show the corrected JSON:\n\nError: ${parseError}\n\nJSON:\n${rawJson}`
        }]
      }, {
        headers: { Authorization: `Bearer ${user?.token}` }
      });
      return data.message?.content || parseError;
    } catch {
      return parseError;
    }
  };

  const handleBulkImport = async () => {
    if (!bulkJson.trim()) {
      toastError('Empty JSON', 'Please paste your JSON array first.');
      return;
    }

    // 1. Parse JSON locally first
    let parsed: any[];
    try {
      parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error('Root element must be a JSON array [ ... ]');
    } catch (e: any) {
      setBulkLoading(true);
      setJsonError('Analyzing error with AI...');
      const aiExplanation = await validateJsonWithAI(bulkJson, e.message);
      setJsonError(aiExplanation);
      setBulkLoading(false);
      toastError('Invalid JSON', 'AI has analyzed the error — see details below.');
      return;
    }

    // 2. Send to backend
    setBulkLoading(true);
    setJsonError('');
    try {
      const { data } = await axios.post(`${API}/scholarships/bulk`, { scholarships: parsed }, { headers });
      if (data.partial) {
        toastSuccess(`${data.count} of ${data.total} imported!`, data.message);
        if (data.details?.length) {
          setJsonError(`${data.failedCount} failed:\n${data.details.join('\n')}`);
        }
      } else {
        toastSuccess(`${data.count} scholarships imported!`, 'All scholarships are now live.');
        setBulkJson('');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Bulk import failed.';
      const details = err.response?.data?.details?.join('\n') || '';
      setJsonError(details ? `${msg}\n\n${details}` : msg);
      toastError('Import failed', msg);
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Staff ────────────────────────────────────────────────────────────────────
  const [staffData, setStaffData] = useState({ name: '', email: '', password: '', telegramChatId: '' });
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/assistant`, staffData, { headers });
      toastSuccess('Assistant created!', `${staffData.name} can now log in as an assistant admin.`);
      setStaffData({ name: '', email: '', password: '', telegramChatId: '' });
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not create assistant.');
    } finally {
      setLoading(false);
    }
  };

  // ── Sidebar Tabs ─────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: Sparkles, badge: undefined },
    { id: 'pending', label: 'Pending Review', icon: Clock, badge: pendingScholarships.length || undefined },
    { id: 'manage', label: 'Manage Scholarships', icon: Search, badge: allScholarshipsTotal || undefined },
    { id: 'add', label: 'Add Scholarship', icon: Plus, badge: undefined },
    { id: 'bulk', label: 'Bulk Import (JSON)', icon: FileJson, badge: undefined },
    ...(user?.role === 'admin' ? [
      { id: 'users', label: 'Manage Users', icon: Users, badge: allUsersTotal || undefined },
      { id: 'staff', label: 'Manage Staff', icon: ShieldCheck, badge: staffList.length || undefined },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8 flex">

      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed bottom-6 left-6 z-50 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl shadow-red-500/30 flex items-center justify-center transition-colors"
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
              className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-background border-r border-border overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-bold text-foreground">Admin Workspace</h2>
                <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="p-2 flex flex-col gap-1">
                {tabs.map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id as any); setSidebarOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors rounded-lg
                      ${activeTab === tab.id ? 'bg-foreground text-background font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                    <tab.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{tab.label}</span>
                    {tab.badge ? <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{tab.badge}</span> : null}
                  </button>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-60 shrink-0 border-r border-border pr-6 flex-col gap-1">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 px-4">Admin Workspace</h2>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors rounded-lg
              ${activeTab === tab.id ? 'bg-foreground text-background font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            <tab.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{tab.label}</span>
            {tab.badge ? <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{tab.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 md:pl-10 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

            {/* ── ANALYTICS ── */}
            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-2xl font-light mb-6">Analytics Dashboard</h2>
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !analytics ? (
                  <div className="text-center py-20 border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground">Failed to load analytics.</p>
                  </div>
                ) : (
                  <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-card border border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Total Users</p>
                        <p className="text-2xl font-bold">{analytics.users?.total || 0}</p>
                        <p className="text-[10px] text-green-600 mt-1">+{analytics.users?.today || 0} today</p>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Total Scholarships</p>
                        <p className="text-2xl font-bold">{analytics.scholarships?.total || 0}</p>
                        <p className="text-[10px] text-green-600 mt-1">{analytics.scholarships?.active || 0} active</p>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Applications</p>
                        <p className="text-2xl font-bold">{analytics.applications?.total || 0}</p>
                        <p className="text-[10px] text-blue-600 mt-1">{analytics.applications?.accepted || 0} accepted</p>
                      </div>
                      <div className="bg-card border border-border rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">Pending Review</p>
                        <p className="text-2xl font-bold text-yellow-600">{analytics.scholarships?.pending || 0}</p>
                        <p className="text-[10px] text-red-600 mt-1">{analytics.scholarships?.expired || 0} expired</p>
                      </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {/* Top Countries */}
                      <div className="bg-card border border-border rounded-lg p-5">
                        <h3 className="font-semibold mb-4">Top Countries</h3>
                        {analytics.topCountries?.map((c: any) => (
                          <div key={c._id} className="flex items-center justify-between mb-2">
                            <span className="text-sm">{c._id || 'Unknown'}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${(c.count / (analytics.topCountries[0]?.count || 1)) * 100}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-6 text-right">{c.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Top Universities */}
                      <div className="bg-card border border-border rounded-lg p-5">
                        <h3 className="font-semibold mb-4">Top Universities</h3>
                        {analytics.topUniversities?.map((u: any) => (
                          <div key={u._id} className="flex items-center justify-between mb-2">
                            <span className="text-sm truncate mr-2">{u._id || 'Unknown'}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(u.count / (analytics.topUniversities[0]?.count || 1)) * 100}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-6 text-right">{u.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-card border border-border rounded-lg p-5">
                        <h3 className="font-semibold mb-4">Degrees Distribution</h3>
                        {analytics.degreesDistribution?.map((d: any) => (
                          <div key={d._id} className="flex items-center justify-between mb-2">
                            <span className="text-sm">{d._id}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${(d.count / (analytics.degreesDistribution[0]?.count || 1)) * 100}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-6 text-right">{d.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="bg-card border border-border rounded-lg p-5">
                        <h3 className="font-semibold mb-4">Funding Types</h3>
                        {analytics.fundingDistribution?.map((f: any) => (
                          <div key={f._id} className="flex items-center justify-between mb-2">
                            <span className="text-sm">{f._id}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(f.count / (analytics.fundingDistribution[0]?.count || 1)) * 100}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-6 text-right">{f.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex gap-3 mt-8">
                      <a href={`${API}/admin/export/scholarships`} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="rounded-lg text-xs">
                          <FileJson className="w-3.5 h-3.5 mr-1" /> Export Scholarships CSV
                        </Button>
                      </a>
                      <a href={`${API}/admin/export/users`} target="_blank" rel="noreferrer">
                        <Button variant="outline" className="rounded-lg text-xs">
                          <FileJson className="w-3.5 h-3.5 mr-1" /> Export Users CSV
                        </Button>
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── PENDING ── */}
            {activeTab === 'pending' && (
              <div>
                <h2 className="text-2xl font-light mb-6">Pending Review
                  {pendingScholarships.length > 0 && <span className="ml-2 text-sm font-semibold text-red-500">({pendingScholarships.length})</span>}
                </h2>
                {pendingScholarships.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-border rounded-lg">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-60" />
                    <p className="text-muted-foreground">All caught up! No pending scholarships.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingScholarships.map(s => (
                      <Card key={s._id} className="rounded-lg border-border shadow-none bg-card">
                        <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{s.title?.en}</h3>
                            <p className="text-sm text-muted-foreground">{s.university?.en} · {s.country?.en}</p>
                            <span className="mt-1.5 inline-block text-[11px] font-medium bg-muted px-2 py-0.5 rounded">
                              Submitted by: {s.submittedBy?.name || 'Unknown'}
                            </span>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button onClick={() => handleStatusChange(s._id, 'approved')} size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs">
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                            <Button onClick={() => handleStatusChange(s._id, 'rejected')} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MANAGE SCHOLARSHIPS ── */}
            {activeTab === 'manage' && (
              <div>
                <h2 className="text-2xl font-light mb-6">Manage Scholarships
                  <span className="ml-2 text-sm font-semibold text-red-500">({allScholarshipsTotal})</span>
                </h2>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={manageSearch}
                      onChange={e => setManageSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleManageSearch()}
                      placeholder="Search scholarships..."
                      className="w-full h-10 pl-9 pr-4 border border-input bg-background rounded-lg text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <select
                    value={manageStatus}
                    onChange={e => { setManageStatus(e.target.value); fetchAllScholarships(1, manageSearch, e.target.value); }}
                    className="h-10 px-3 border border-input bg-background rounded-lg text-sm shadow-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <Button onClick={handleManageSearch} variant="outline" className="h-10 rounded-lg text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                  </Button>
                  {!deleteAllConfirm ? (
                    <Button onClick={() => setDeleteAllConfirm(true)} variant="outline" className="h-10 rounded-lg text-xs border-red-200 text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete All
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 font-medium">Delete ALL?</span>
                      <Button onClick={handleDeleteAllScholarships} disabled={deleteAllLoading} size="sm" className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md">
                        {deleteAllLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes, Delete All'}
                      </Button>
                      <Button onClick={() => setDeleteAllConfirm(false)} size="sm" variant="outline" className="h-8 px-3 text-xs rounded-md">
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {allScholarships.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground">No scholarships found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allScholarships.map((s: any) => (
                      <Card key={s._id} className="rounded-lg border-border shadow-none bg-card">
                        <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{s.title?.en}</h3>
                              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                                  s.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                                    'bg-red-500/10 text-red-600'
                                }`}>
                                {s.status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{s.university?.en} · {s.country?.en}</p>
                            <p className="text-xs text-muted-foreground mt-1">Deadline: {new Date(s.deadline).toLocaleDateString()}</p>
                            {s.submittedBy && (
                              <p className="text-[10px] text-muted-foreground mt-1">Submitted by: {s.submittedBy.name || 'Unknown'}</p>
                            )}
                          </div>
                          <div className="shrink-0 flex gap-2">
                            {!deleteConfirmId && (
                              <Button
                                onClick={() => setEditingScholarship({ ...s })}
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs rounded-md"
                              >
                                <Pencil className="w-3 h-3 mr-1" /> Edit
                              </Button>
                            )}
                            {deleteConfirmId === s._id ? (
                              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                                <span className="text-xs text-red-600 font-medium">Delete?</span>
                                <Button
                                  onClick={() => handleDeleteScholarship(s._id)}
                                  disabled={deleteLoading}
                                  size="sm"
                                  className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md"
                                >
                                  {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                </Button>
                                <Button
                                  onClick={() => setDeleteConfirmId(null)}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-xs rounded-md"
                                >
                                  No
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => setDeleteConfirmId(s._id)}
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {allScholarshipsTotal > 15 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      onClick={() => fetchAllScholarships(allScholarshipsPage - 1, manageSearch, manageStatus)}
                      disabled={allScholarshipsPage <= 1}
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-3 text-sm text-muted-foreground">
                      Page {allScholarshipsPage} of {Math.ceil(allScholarshipsTotal / 15)}
                    </span>
                    <Button
                      onClick={() => fetchAllScholarships(allScholarshipsPage + 1, manageSearch, manageStatus)}
                      disabled={allScholarshipsPage >= Math.ceil(allScholarshipsTotal / 15)}
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── ADD SINGLE ── */}
            {activeTab === 'add' && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-light mb-6">Add Scholarship</h2>
                <form onSubmit={handleAddScholarship} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5"><Label className="text-xs">Title (EN)</Label><Input name="titleEn" value={formData.titleEn} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Title (AR)</Label><Input name="titleAr" value={formData.titleAr} onChange={handleChange} required className="rounded-lg shadow-none h-10 text-right" dir="rtl" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5"><Label className="text-xs">Description (EN)</Label><textarea name="descEn" value={formData.descEn} onChange={handleChange} required rows={3} className="w-full border border-input p-2.5 rounded-lg bg-background text-sm shadow-none resize-none focus:outline-none focus:ring-1 focus:ring-ring" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Description (AR)</Label><textarea name="descAr" value={formData.descAr} onChange={handleChange} required rows={3} dir="rtl" className="w-full border border-input p-2.5 rounded-lg bg-background text-sm shadow-none resize-none text-right focus:outline-none focus:ring-1 focus:ring-ring" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5"><Label className="text-xs">University (EN)</Label><Input name="uniEn" value={formData.uniEn} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">University (AR)</Label><Input name="uniAr" value={formData.uniAr} onChange={handleChange} required className="rounded-lg shadow-none h-10 text-right" dir="rtl" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5"><Label className="text-xs">Country (EN)</Label><Input name="countryEn" value={formData.countryEn} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Country (AR)</Label><Input name="countryAr" value={formData.countryAr} onChange={handleChange} required className="rounded-lg shadow-none h-10 text-right" dir="rtl" /></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                    <div className="space-y-1.5"><Label className="text-xs">Degree</Label>
                      <select name="degree" value={formData.degree} onChange={handleChange} className="w-full h-10 border border-input bg-background px-2.5 rounded-lg text-sm shadow-none">
                        <option>Bachelor</option><option>Master</option><option>PhD</option>
                      </select>
                    </div>
                    <div className="col-span-2 space-y-1.5"><Label className="text-xs">Funding Type</Label>
                      <select name="fundingType" value={formData.fundingType} onChange={handleChange} className="w-full h-10 border border-input bg-background px-2.5 rounded-lg text-sm shadow-none">
                        <option>Fully Funded</option><option>Partially Funded</option>
                      </select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="date" name="deadline" value={formData.deadline} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
                  </div>
                  {/* Keywords */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Keywords <span className="text-muted-foreground">(comma separated)</span></Label>
                    <Input name="keywordsRaw" value={formData.keywordsRaw} onChange={handleChange} placeholder="Germany, Master, Engineering, Fully Funded, No IELTS" className="rounded-lg shadow-none h-10" />
                    {formData.keywordsRaw && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {formData.keywordsRaw.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                          <span key={k} className="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium rounded-full border border-red-200 dark:border-red-800">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Application Link</Label><Input type="url" name="link" value={formData.link} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Image URL (optional)</Label><Input type="url" name="image" value={formData.image} onChange={handleChange} className="rounded-lg shadow-none h-10" /></div>
                  <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold">
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing…</> : 'Publish Scholarship'}
                  </Button>
                </form>
              </div>
            )}

            {/* ── BULK IMPORT ── */}
            {activeTab === 'bulk' && (
              <div className="max-w-4xl">
                <h2 className="text-2xl font-light mb-1">Bulk Import via JSON</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Paste an array of scholarship objects. If your JSON has errors, the AI will explain them automatically.
                </p>

                {/* Template */}
                <div className="mb-5 p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><FileJson className="w-3.5 h-3.5" /> JSON Template</span>
                    <button onClick={() => setBulkJson(JSON_TEMPLATE)} className="text-xs text-red-600 hover:underline">Use Template</button>
                  </div>
                  <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">{JSON_TEMPLATE}</pre>
                </div>

                {/* Textarea */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs">Your JSON</Label>
                    {bulkJson && <button onClick={() => { setBulkJson(''); setJsonError(''); }} className="text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>}
                  </div>
                  <textarea
                    value={bulkJson}
                    onChange={e => { setBulkJson(e.target.value); setJsonError(''); }}
                    rows={14}
                    placeholder='[ { "title": { "en": "..." }, ... } ]'
                    className="w-full font-mono text-xs border border-input p-3 rounded-lg bg-background shadow-none resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    spellCheck={false}
                  />
                </div>

                {/* AI Error Display */}
                {jsonError && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">AI Error Analysis</p>
                        <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap leading-relaxed">{jsonError}</pre>
                      </div>
                    </div>
                  </motion.div>
                )}

                <Button onClick={handleBulkImport} disabled={bulkLoading || !bulkJson.trim()}
                  className="w-full h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold">
                  {bulkLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4 mr-2" /> Import Scholarships</>}
                </Button>
              </div>
            )}

            {/* ── STAFF ── */}
            {activeTab === 'staff' && user?.role === 'admin' && (
              <div className="max-w-3xl">
                <h2 className="text-2xl font-light mb-1">Manage Staff</h2>
                <p className="text-muted-foreground text-sm mb-6">Create and manage assistant admin accounts.</p>

                {/* Existing Staff List */}
                {staffList.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Existing Assistants ({staffList.length})</h3>
                    <div className="space-y-3">
                      {staffList.map((s: any) => (
                        <Card key={s._id} className="rounded-lg border-border shadow-none bg-card">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-red-500" />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{s.name}</div>
                                <div className="text-xs text-muted-foreground">{s.email}</div>
                              </div>
                            </div>
                            <div>
                              {userDeleteConfirmId === s._id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-600">Delete?</span>
                                  <Button onClick={() => handleDeleteUser(s._id)} disabled={userDeleteLoading} size="sm" className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md">
                                    {userDeleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                  </Button>
                                  <Button onClick={() => setUserDeleteConfirmId(null)} size="sm" variant="outline" className="h-7 px-3 text-xs rounded-md">No</Button>
                                </div>
                              ) : (
                                <Button onClick={() => setUserDeleteConfirmId(s._id)} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs">
                                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create New Assistant */}
                <div className="max-w-md">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Create New Assistant</h3>
                  <form onSubmit={handleAddStaff} className="space-y-4">
                    <div className="space-y-1.5"><Label className="text-xs">Full Name</Label><Input type="text" value={staffData.name} onChange={e => setStaffData({ ...staffData, name: e.target.value })} required className="rounded-lg shadow-none h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={staffData.email} onChange={e => setStaffData({ ...staffData, email: e.target.value })} required className="rounded-lg shadow-none h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Password</Label><Input type="password" value={staffData.password} onChange={e => setStaffData({ ...staffData, password: e.target.value })} required className="rounded-lg shadow-none h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Telegram Chat ID (optional)</Label><Input type="text" value={staffData.telegramChatId} onChange={e => setStaffData({ ...staffData, telegramChatId: e.target.value })} placeholder="e.g. 8901344688" className="rounded-lg shadow-none h-10" /></div>
                    <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold">
                      {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</> : 'Create Assistant'}
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {/* ── USERS ── */}
            {activeTab === 'users' && user?.role === 'admin' && (
              <div>
                <h2 className="text-2xl font-light mb-6">Manage Users
                  <span className="ml-2 text-sm font-semibold text-red-500">({allUsersTotal})</span>
                </h2>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchAllUsers(1, userSearch, userRole)}
                      placeholder="Search by name or email..."
                      className="w-full h-10 pl-9 pr-4 border border-input bg-background rounded-lg text-sm shadow-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <select
                    value={userRole}
                    onChange={e => { setUserRole(e.target.value); fetchAllUsers(1, userSearch, e.target.value); }}
                    className="h-10 px-3 border border-input bg-background rounded-lg text-sm shadow-none"
                  >
                    <option value="">All Roles</option>
                    <option value="user">Users</option>
                    <option value="assistant_admin">Assistants</option>
                  </select>
                  <Button onClick={() => fetchAllUsers(1, userSearch, userRole)} variant="outline" className="h-10 rounded-lg text-xs">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                  </Button>
                </div>

                {allUsers.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-border rounded-lg">
                    <p className="text-muted-foreground">No users found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allUsers.map((u: any) => (
                      <Card key={u._id} className="rounded-lg border-border shadow-none bg-card">
                        <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-red-500/10' : u.role === 'assistant_admin' ? 'bg-yellow-500/10' : 'bg-muted'
                              }`}>
                              <span className="text-sm font-bold">
                                {u.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm truncate">{u.name}</h3>
                                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-red-500/10 text-red-600' :
                                    u.role === 'assistant_admin' ? 'bg-yellow-500/10 text-yellow-600' :
                                      'bg-muted text-muted-foreground'
                                  }`}>
                                  {u.role}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                              {u.major && <p className="text-xs text-muted-foreground">Major: {u.major}</p>}
                              <p className="text-[10px] text-muted-foreground mt-1">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="shrink-0">
                            {u.role === 'admin' ? (
                              <span className="text-xs text-muted-foreground italic">Protected</span>
                            ) : userDeleteConfirmId === u._id ? (
                              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                                <span className="text-xs text-red-600 font-medium">Delete?</span>
                                <Button onClick={() => handleDeleteUser(u._id)} disabled={userDeleteLoading} size="sm" className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md">
                                  {userDeleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                                </Button>
                                <Button onClick={() => setUserDeleteConfirmId(null)} size="sm" variant="outline" className="h-7 px-3 text-xs rounded-md">No</Button>
                              </div>
                            ) : (
                              <Button onClick={() => setUserDeleteConfirmId(u._id)} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs">
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {allUsersTotal > 15 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button onClick={() => fetchAllUsers(allUsersPage - 1, userSearch, userRole)} disabled={allUsersPage <= 1} variant="outline" size="sm" className="rounded-lg text-xs">Previous</Button>
                    <span className="flex items-center px-3 text-sm text-muted-foreground">Page {allUsersPage} of {Math.ceil(allUsersTotal / 15)}</span>
                    <Button onClick={() => fetchAllUsers(allUsersPage + 1, userSearch, userRole)} disabled={allUsersPage >= Math.ceil(allUsersTotal / 15)} variant="outline" size="sm" className="rounded-lg text-xs">Next</Button>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Edit Scholarship Modal */}
      {editingScholarship && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditingScholarship(null)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold">Edit Scholarship</h2>
              <Button onClick={() => setEditingScholarship(null)} variant="ghost" size="sm"><X className="w-5 h-5" /></Button>
            </div>
            <form onSubmit={handleUpdateScholarship} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-xs">Title (EN)</Label><Input value={editingScholarship.title?.en || ''} onChange={e => setEditingScholarship({ ...editingScholarship, title: { ...editingScholarship.title, en: e.target.value } })} required className="rounded-md h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Title (AR)</Label><Input value={editingScholarship.title?.ar || ''} onChange={e => setEditingScholarship({ ...editingScholarship, title: { ...editingScholarship.title, ar: e.target.value } })} required dir="rtl" className="rounded-md h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">University (EN)</Label><Input value={editingScholarship.university?.en || ''} onChange={e => setEditingScholarship({ ...editingScholarship, university: { ...editingScholarship.university, en: e.target.value } })} required className="rounded-md h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">University (AR)</Label><Input value={editingScholarship.university?.ar || ''} onChange={e => setEditingScholarship({ ...editingScholarship, university: { ...editingScholarship.university, ar: e.target.value } })} required dir="rtl" className="rounded-md h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Country (EN)</Label><Input value={editingScholarship.country?.en || ''} onChange={e => setEditingScholarship({ ...editingScholarship, country: { ...editingScholarship.country, en: e.target.value } })} required className="rounded-md h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Country (AR)</Label><Input value={editingScholarship.country?.ar || ''} onChange={e => setEditingScholarship({ ...editingScholarship, country: { ...editingScholarship.country, ar: e.target.value } })} required dir="rtl" className="rounded-md h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Degree</Label>
                  <select value={editingScholarship.degree || 'Bachelor'} onChange={e => setEditingScholarship({ ...editingScholarship, degree: e.target.value })} className="w-full h-10 border border-input bg-background px-2.5 rounded-md text-sm shadow-none">
                    <option>Bachelor</option><option>Master</option><option>PhD</option><option>Other</option>
                  </select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Funding Type</Label>
                  <select value={editingScholarship.fundingType || 'Fully Funded'} onChange={e => setEditingScholarship({ ...editingScholarship, fundingType: e.target.value })} className="w-full h-10 border border-input bg-background px-2.5 rounded-md text-sm shadow-none">
                    <option>Fully Funded</option><option>Partially Funded</option>
                  </select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="date" value={editingScholarship.deadline?.substring(0, 10) || ''} onChange={e => setEditingScholarship({ ...editingScholarship, deadline: e.target.value })} required className="rounded-md h-10" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Application Link</Label><Input value={editingScholarship.link || ''} onChange={e => setEditingScholarship({ ...editingScholarship, link: e.target.value })} required className="rounded-md h-10" /></div>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Description (EN)</Label><textarea value={editingScholarship.description?.en || ''} onChange={e => setEditingScholarship({ ...editingScholarship, description: { ...editingScholarship.description, en: e.target.value } })} required rows={3} className="w-full border border-input p-2.5 rounded-md bg-background text-sm shadow-none resize-none focus:outline-none focus:ring-1 focus:ring-ring" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Description (AR)</Label><textarea value={editingScholarship.description?.ar || ''} onChange={e => setEditingScholarship({ ...editingScholarship, description: { ...editingScholarship.description, ar: e.target.value } })} required rows={3} dir="rtl" className="w-full border border-input p-2.5 rounded-md bg-background text-sm shadow-none resize-none text-right focus:outline-none focus:ring-1 focus:ring-ring" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Image URL (optional)</Label><Input value={editingScholarship.image || ''} onChange={e => setEditingScholarship({ ...editingScholarship, image: e.target.value })} className="rounded-md h-10" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingScholarship(null)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
