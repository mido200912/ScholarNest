import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Trash2, UserCheck } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/ui/Toast';
import { API_BASE as API } from '../../../config/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

export default function StaffTab() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();

  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userDeleteConfirmId, setUserDeleteConfirmId] = useState<string | null>(null);
  const [userDeleteLoading, setUserDeleteLoading] = useState(false);

  const [staffData, setStaffData] = useState({ name: '', email: '', password: '', telegramChatId: '' });

  const headers = { Authorization: `Bearer ${user?.token}` };

  const fetchStaff = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/staff`, { headers });
      setStaffList(data.data);
    } catch {
      toastError('Failed', 'Could not load staff.');
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/auth/assistant`, staffData, { headers });
      toastSuccess('Assistant created!', `${staffData.name} can now log in as an assistant admin.`);
      setStaffData({ name: '', email: '', password: '', telegramChatId: '' });
      fetchStaff();
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not create assistant.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    setUserDeleteLoading(true);
    try {
      await axios.delete(`${API}/auth/users/${id}`, { headers });
      toastSuccess('Deleted!', 'User account removed.');
      setUserDeleteConfirmId(null);
      fetchStaff();
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not delete user.');
    } finally {
      setUserDeleteLoading(false);
    }
  };

  if (user?.role !== 'admin') return null;

  return (
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
  );
}
