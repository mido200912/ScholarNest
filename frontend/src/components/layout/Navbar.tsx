import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/button';
import axios from 'axios';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import ThemeToggle from '../shared/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Scale, Bell, AlertTriangle, User as UserIcon, MessageSquare, PenLine } from 'lucide-react';
import { API_BASE } from '../../config/api';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const token = user?.token;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    if (user && token) {
      axios.get(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setNotifications(res.data.data)).catch(console.error);
      axios.get(`${API_BASE}/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setAlerts(res.data.data || [])).catch(console.error);
    }
  }, [user, token]);

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await axios.put(`${API_BASE}/notifications/all/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const unreadAlertsCount = alerts.filter(a => !a.isRead).length;

  const markAllAlertsAsRead = async () => {
    if (!token) return;
    try {
      await axios.put(`${API_BASE}/alerts/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(alerts.map(a => ({ ...a, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed w-full z-40 top-0 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 border-b border-border transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 transition-transform duration-300">
          <img src="/Scholarnest.png" alt="ScholarNest Logo" className="h-8 w-auto" />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="font-medium text-muted-foreground hover:text-foreground transition-colors">{t('nav.home')}</Link>
          <Link to="/search" className="font-medium text-muted-foreground hover:text-foreground transition-colors">{t('nav.search')}</Link>
          <Link to="/compare" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <Scale className="w-4 h-4" /> {t('nav.compare')}
          </Link>
          <Link to="/interview-simulator" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <MessageSquare className="w-4 h-4" /> {t('nav.interview')}
          </Link>
          <Link to="/cover-letter" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <PenLine className="w-4 h-4" /> {t('nav.coverLetter')}
          </Link>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <LanguageSwitcher />
          <ThemeToggle />

          {user ? (
            <div className="flex items-center gap-4 relative">
              {/* Notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setShowNotifications(!showNotifications); setShowAlerts(false); }}
                  className="relative rounded-full text-muted-foreground hover:text-foreground"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background"></span>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-card border border-border shadow-lg rounded-2xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">{t('nav.notifications')}</h3>
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-xs text-red-600 hover:text-red-700 font-medium">
                            {t('nav.markAllRead')}
                          </button>
                        )}
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground text-sm">
                            {t('nav.noNotifications')}
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div key={n._id} className={`p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!n.isRead ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
                              <p className="text-sm font-medium text-foreground mb-1">
                                {isRtl ? n.title.ar : n.title.en}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isRtl ? n.message.ar : n.message.en}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-2">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Alerts */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setShowAlerts(!showAlerts); setShowNotifications(false); }}
                  className="relative rounded-full text-muted-foreground hover:text-foreground"
                >
                  <AlertTriangle className="w-5 h-5" />
                  {unreadAlertsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-background"></span>
                  )}
                </Button>

                <AnimatePresence>
                  {showAlerts && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-80 bg-card border border-border shadow-lg rounded-2xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Alerts</h3>
                        {unreadAlertsCount > 0 && (
                          <button onClick={markAllAlertsAsRead} className="text-xs text-red-600 hover:text-red-700 font-medium">
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {alerts.length === 0 ? (
                          <div className="p-6 text-center text-muted-foreground text-sm">
                            No alerts yet
                          </div>
                        ) : (
                          alerts.slice(0, 10).map(a => (
                            <div key={a._id} className={`p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!a.isRead ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}`}>
                              <p className="text-sm font-medium text-foreground mb-1">
                                {isRtl ? a.title.ar : a.title.en}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {isRtl ? a.message.ar : a.message.en}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-2">
                                {new Date(a.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link to="/dashboard">
                <Button variant="outline" className="gap-2 rounded-xl border-border">
                  <UserIcon className="w-4 h-4" /> {user.name}
                </Button>
              </Link>
              <Button onClick={logout} variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 font-medium rounded-none">{t('nav.logout')}</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium rounded-none">{t('nav.login')}</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-none px-6 font-medium">{t('nav.signup')}</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-foreground focus:outline-none"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4 flex flex-col">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="block font-bold text-foreground hover:text-red-600 p-2">{t('nav.home')}</Link>
              <Link to="/search" onClick={() => setIsMobileMenuOpen(false)} className="block font-bold text-foreground hover:text-red-600 p-2">{t('nav.search')}</Link>
              <Link to="/compare" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 font-bold text-foreground hover:text-red-600 p-2">
                <Scale className="w-4 h-4" /> {t('nav.compare')}
              </Link>
              <Link to="/interview-simulator" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 font-bold text-foreground hover:text-red-600 p-2">
                <MessageSquare className="w-4 h-4" /> {t('nav.interview')}
              </Link>
              <Link to="/cover-letter" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 font-bold text-foreground hover:text-red-600 p-2">
                <PenLine className="w-4 h-4" /> {t('nav.coverLetter')}
              </Link>

              <div className="h-px bg-border w-full my-2"></div>

              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start border-red-500 text-red-600">{t('nav.dashboard')}</Button>
                  </Link>
                  <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full justify-start border-red-500 text-red-600">{t('nav.profile')}</Button>
                  </Link>
                  <Button onClick={() => { logout(); setIsMobileMenuOpen(false); }} variant="ghost" className="w-full justify-start text-red-500">{t('nav.logout')}</Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-foreground">{t('nav.login')}</Button>
                  </Link>
                  <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full justify-start bg-red-600 text-white">{t('nav.signup')}</Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
