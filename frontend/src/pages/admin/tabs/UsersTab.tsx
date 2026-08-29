import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Loader2, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/ui/Toast';
import { API_BASE as API } from '../../../config/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

export default function UsersTab() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allUsersTotal, setAllUsersTotal] = useState(0);
  const [allUsersPage, setAllUsersPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userDeleteConfirmId, setUserDeleteConfirmId] = useState<string | null>(null);
  const [userDeleteLoading, setUserDeleteLoading] = useState(false);

  const headers = { Authorization: `Bearer ${user?.token}` };

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

  useEffect(() => {
    fetchAllUsers(1, userSearch, userRole);
  }, []);

  const handleDeleteUser = async (id: string) => {
    setUserDeleteLoading(true);
    try {
      await axios.delete(`${API}/auth/users/${id}`, { headers });
      toastSuccess('Deleted!', 'User account removed.');
      setUserDeleteConfirmId(null);
      fetchAllUsers(allUsersPage, userSearch, userRole);
    } catch (err: any) {
      toastError('Failed', err.response?.data?.message || 'Could not delete user.');
    } finally {
      setUserDeleteLoading(false);
    }
  };

  if (user?.role !== 'admin') return null;

  return (
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-red-500/10' : u.role === 'assistant_admin' ? 'bg-yellow-500/10' : 'bg-muted'}`}>
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
                  {u.role !== 'admin' && (
                    userDeleteConfirmId === u._id ? (
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                        <span className="text-xs text-red-600 font-medium">Delete user?</span>
                        <Button onClick={() => handleDeleteUser(u._id)} disabled={userDeleteLoading} size="sm" className="h-7 px-3 bg-red-600 hover:bg-red-700 text-white text-xs rounded-md">
                          {userDeleteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes'}
                        </Button>
                        <Button onClick={() => setUserDeleteConfirmId(null)} size="sm" variant="outline" className="h-7 px-3 text-xs rounded-md">No</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setUserDeleteConfirmId(u._id)} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs">
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    )
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
  );
}
