import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/ui/Toast';
import { API_BASE as API } from '../../../config/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Button } from '../../../components/ui/button';
import { FileJson } from 'lucide-react';

export default function AnalyticsTab() {
  const { user } = useAuthStore();
  const { error: toastError } = useToast();
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const headers = { Authorization: `Bearer ${user?.token}` };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const [{ data: statsData }, { data: dailyData }] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/stats/daily`, { headers })
      ]);
      setAnalytics({ ...statsData.data, daily: dailyData.data });
    } catch {
      toastError('Failed', 'Could not load analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const padDailyData = (data: { _id: string, count: number }[]) => {
    if (!data) return [];
    if (data.length >= 7) return data;
    const padded = [...data];
    const lastDate = data.length > 0 ? new Date(data[data.length - 1]._id) : new Date();
    while (padded.length < 7) {
      lastDate.setDate(lastDate.getDate() - 1);
      padded.unshift({ _id: lastDate.toISOString().split('T')[0], count: 0 });
    }
    return padded;
  };

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20 border border-dashed border-border rounded-lg">
        <p className="text-muted-foreground">Failed to load analytics.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-light mb-6">Analytics Dashboard</h2>
      
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold mb-4">User Growth (Last 30 Days)</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={padDailyData(analytics.daily?.dailyUsers || [])} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="_id" tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}} />
                <Area type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Top Countries</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.topCountries?.length ? analytics.topCountries : [{_id: 'None', count: 1}]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="_id"
                >
                  {(analytics.topCountries?.length ? analytics.topCountries : [{_id: 'None', count: 1}]).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={analytics.topCountries?.length ? ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 5] : 'hsl(var(--muted))'} />
                  ))}
                </Pie>
                {analytics.topCountries?.length > 0 && <RechartsTooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}} />}
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', right: 0 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Degrees Distribution</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.degreesDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} maxBarSize={50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="_id" tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Funding Types</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.fundingDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} maxBarSize={50}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="_id" tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 12, fill: 'hsl(var(--muted-foreground))'}} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip cursor={{fill: 'hsl(var(--muted)/0.5)'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
    </div>
  );
}
