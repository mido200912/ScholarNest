import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import axios from 'axios';
import ThemeToggle from '../components/shared/ThemeToggle';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { API_BASE } from '../config/api';

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isRtl = i18n.language === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/auth/login`, {
        email,
        password,
      });
      setUser(data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side (Form) */}
      <div className="w-full lg:w-1/2 flex flex-col px-8 sm:px-16 lg:px-24 py-12">
        <div className="flex justify-between items-center mb-16">
          <Link to="/" className="text-xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity flex items-center gap-2">
            <ArrowLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
            <img src="/Scholarnest.png" alt="ScholarNest Logo" className="h-8 w-auto" />
          </Link>
          <div className="flex gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-light tracking-tight mb-2 text-foreground">Welcome Back</h1>
            <p className="text-muted-foreground mb-8">Enter your credentials to access your account.</p>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-4 border-l-2 border-destructive mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-transparent rounded-none border-t-0 border-x-0 border-b-border focus-visible:ring-0 focus-visible:border-foreground transition-colors px-0 shadow-none text-lg"
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Forgot password?</a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-transparent rounded-none border-t-0 border-x-0 border-b-border focus-visible:ring-0 focus-visible:border-foreground transition-colors px-0 shadow-none text-lg"
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 rounded-none text-base mt-8 bg-foreground text-background hover:bg-foreground/90">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Don't have an account?{' '}
                <Link to="/register" className="text-foreground font-medium underline underline-offset-4 hover:opacity-80">
                  Create an account
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Right side (Visual) */}
      <div className="hidden lg:flex w-1/2 bg-muted items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-background/5" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative z-10 max-w-lg px-12"
        >
          <div className="w-16 h-16 border-2 border-foreground rounded-full flex items-center justify-center mb-8">
            <span className="text-2xl font-serif italic">"</span>
          </div>
          <blockquote className="text-4xl font-light leading-tight text-foreground mb-6">
            Education is not preparation for life; education is life itself.
          </blockquote>
          <p className="text-muted-foreground tracking-widest uppercase text-sm font-semibold">John Dewey</p>
        </motion.div>

        {/* Minimal geometric decoration */}
        <div className="absolute right-0 bottom-0 w-96 h-96 border-l border-t border-border translate-x-1/2 translate-y-1/2 rounded-tl-full opacity-50" />
      </div>
    </div>
  );
}
