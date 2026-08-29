import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Trash2, Loader2, Pencil } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/ui/Toast';
import { API_BASE as API } from '../../../config/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

export default function ManageScholarshipsTab() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  
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
  const [updateLoading, setUpdateLoading] = useState(false);

  const headers = { Authorization: `Bearer ${user?.token}` };

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
    fetchAllScholarships(1, manageSearch, manageStatus);
  }, []);

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
    setUpdateLoading(true);
    try {
      const { _id, submittedBy, createdAt, updatedAt, __v, ...fields } = editingScholarship;
      await axios.put(`${API}/scholarships/${_id}`, fields, { headers });
      toastSuccess('Updated!', 'Scholarship updated successfully.');
      setEditingScholarship(null);
      fetchAllScholarships(allScholarshipsPage, manageSearch, manageStatus);
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not update scholarship.');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (editingScholarship) {
    return (
      <div className="max-w-3xl">
        <h2 className="text-2xl font-light mb-6 flex items-center justify-between">
          Edit Scholarship
          <Button variant="outline" size="sm" onClick={() => setEditingScholarship(null)}>Cancel</Button>
        </h2>
        <form onSubmit={handleUpdateScholarship} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5"><label className="text-xs">Title (EN)</label><Input value={editingScholarship.title?.en} onChange={e => setEditingScholarship({...editingScholarship, title: {...editingScholarship.title, en: e.target.value}})} required /></div>
            <div className="space-y-1.5"><label className="text-xs">Title (AR)</label><Input value={editingScholarship.title?.ar} onChange={e => setEditingScholarship({...editingScholarship, title: {...editingScholarship.title, ar: e.target.value}})} required dir="rtl" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5"><label className="text-xs">University (EN)</label><Input value={editingScholarship.university?.en} onChange={e => setEditingScholarship({...editingScholarship, university: {...editingScholarship.university, en: e.target.value}})} required /></div>
            <div className="space-y-1.5"><label className="text-xs">University (AR)</label><Input value={editingScholarship.university?.ar} onChange={e => setEditingScholarship({...editingScholarship, university: {...editingScholarship.university, ar: e.target.value}})} required dir="rtl" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5"><label className="text-xs">Country (EN)</label><Input value={editingScholarship.country?.en} onChange={e => setEditingScholarship({...editingScholarship, country: {...editingScholarship.country, en: e.target.value}})} required /></div>
            <div className="space-y-1.5"><label className="text-xs">Country (AR)</label><Input value={editingScholarship.country?.ar} onChange={e => setEditingScholarship({...editingScholarship, country: {...editingScholarship.country, ar: e.target.value}})} required dir="rtl" /></div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs">Link</label>
            <Input value={editingScholarship.link} onChange={e => setEditingScholarship({...editingScholarship, link: e.target.value})} required />
          </div>
          <Button type="submit" disabled={updateLoading} className="w-full">
            {updateLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Changes'}
          </Button>
        </form>
      </div>
    );
  }

  return (
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
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                      s.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                      'bg-red-500/10 text-red-600'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.university?.en} · {s.country?.en}</p>
                  <p className="text-xs text-muted-foreground mt-1">Deadline: {new Date(s.deadline).toLocaleDateString()}</p>
                </div>
                <div className="shrink-0 flex gap-2">
                  {!deleteConfirmId && (
                    <Button onClick={() => setEditingScholarship({ ...s })} size="sm" variant="outline" className="h-7 px-3 text-xs rounded-md">
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  )}
                  {deleteConfirmId === s._id ? (
                    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                      <span className="text-xs text-red-600 font-medium">Delete?</span>
                      <Button onClick={() => handleDeleteScholarship(s._id)} disabled={deleteLoading} size="sm" className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md">
                        {deleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                      </Button>
                      <Button onClick={() => setDeleteConfirmId(null)} size="sm" variant="outline" className="h-7 px-3 text-xs rounded-md">No</Button>
                    </div>
                  ) : (
                    <Button onClick={() => setDeleteConfirmId(s._id)} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {allScholarshipsTotal > 15 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button onClick={() => fetchAllScholarships(allScholarshipsPage - 1, manageSearch, manageStatus)} disabled={allScholarshipsPage <= 1} variant="outline" size="sm" className="rounded-lg text-xs">Previous</Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">Page {allScholarshipsPage} of {Math.ceil(allScholarshipsTotal / 15)}</span>
          <Button onClick={() => fetchAllScholarships(allScholarshipsPage + 1, manageSearch, manageStatus)} disabled={allScholarshipsPage >= Math.ceil(allScholarshipsTotal / 15)} variant="outline" size="sm" className="rounded-lg text-xs">Next</Button>
        </div>
      )}
    </div>
  );
}
