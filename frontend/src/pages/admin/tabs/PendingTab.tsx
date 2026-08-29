import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/ui/Toast';
import { API_BASE as API } from '../../../config/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

export default function PendingTab() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const [pendingScholarships, setPendingScholarships] = useState<any[]>([]);

  const headers = { Authorization: `Bearer ${user?.token}` };

  const fetchPending = async () => {
    try {
      const { data } = await axios.get(`${API}/scholarships/pending`, { headers });
      setPendingScholarships(data.data);
    } catch {
      toastError('Failed to load', 'Could not fetch pending scholarships.');
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await axios.patch(`${API}/scholarships/${id}/status`, { status }, { headers });
      toastSuccess(status === 'approved' ? 'Scholarship approved!' : 'Scholarship rejected.');
      fetchPending();
    } catch {
      toastError('Failed', 'Could not update scholarship status.');
    }
  };

  return (
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
  );
}
