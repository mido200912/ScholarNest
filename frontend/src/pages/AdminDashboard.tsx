import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import {
  Plus, Clock, ShieldCheck, FileJson, X, Sparkles,
  Search, Menu, Users, Bot
} from 'lucide-react';

import AnalyticsTab from './admin/tabs/AnalyticsTab';
import PendingTab from './admin/tabs/PendingTab';
import ManageScholarshipsTab from './admin/tabs/ManageScholarshipsTab';
import AddScholarshipTab from './admin/tabs/AddScholarshipTab';
import BulkImportTab from './admin/tabs/BulkImportTab';
import UsersTab from './admin/tabs/UsersTab';
import StaffTab from './admin/tabs/StaffTab';
import BotSettingsTab from './admin/tabs/BotSettingsTab';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'analytics' | 'pending' | 'add' | 'bulk' | 'staff' | 'manage' | 'users' | 'bot-settings'>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Sidebar Tabs ─────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: Sparkles },
    { id: 'pending', label: 'Pending Review', icon: Clock },
    { id: 'manage', label: 'Manage Scholarships', icon: Search },
    { id: 'add', label: 'Add Scholarship', icon: Plus },
    { id: 'bulk', label: 'Bulk Import (JSON)', icon: FileJson },
    ...(user?.role === 'admin' ? [
      { id: 'users', label: 'Manage Users', icon: Users },
      { id: 'staff', label: 'Manage Staff', icon: ShieldCheck },
      { id: 'bot-settings', label: 'Bot Settings', icon: Bot },
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
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 md:pl-10 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            
            {activeTab === 'analytics' && <AnalyticsTab />}
            {activeTab === 'pending' && <PendingTab />}
            {activeTab === 'manage' && <ManageScholarshipsTab />}
            {activeTab === 'add' && <AddScholarshipTab />}
            {activeTab === 'bulk' && <BulkImportTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'staff' && <StaffTab />}
            {activeTab === 'bot-settings' && <BotSettingsTab />}

          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
