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

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [name, setName] = useState('');
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
      const { data } = await axios.post('https://scholar-nest-1.vercel.app/api/auth/register', {
        name,
        email,
        password,
      });
      setUser(data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-row-reverse bg-background">
      {/* Right side (Form) */}
      <div className="w-full lg:w-1/2 flex flex-col px-8 sm:px-16 lg:px-24 py-12 border-l border-border">
        <div className="flex justify-between items-center mb-12">
          <Link to="/" className="text-xl font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity flex items-center gap-2">
            <ArrowLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
            ScholarNest
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
            <h1 className="text-4xl font-light tracking-tight mb-2 text-foreground">Create Account</h1>
            <p className="text-muted-foreground mb-8">Join ScholarNest and discover your opportunities.</p>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-4 border-l-2 border-destructive mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 bg-transparent rounded-none border-t-0 border-x-0 border-b-border focus-visible:ring-0 focus-visible:border-foreground transition-colors px-0 shadow-none text-lg"
                  placeholder="John Doe"
                />
              </div>

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
                <Label htmlFor="password">Password</Label>
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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Already have an account?{' '}
                <Link to="/login" className="text-foreground font-medium underline underline-offset-4 hover:opacity-80">
                  Sign in
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Left side (Visual) */}
      <div className="hidden lg:flex w-1/2 bg-background items-center justify-center relative overflow-hidden">
        {/* Minimal abstract grid */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-20">
           {Array.from({ length: 36 }).map((_, i) => (
             <div key={i} className="border-r border-b border-border"></div>
           ))}
        </div>
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative z-10 w-full max-w-md p-8 border border-border bg-background/50 backdrop-blur-sm"
        >
          <h2 className="text-3xl font-light mb-4">Your future starts here.</h2>
          <p className="text-muted-foreground leading-relaxed">
            By joining ScholarNest, you gain access to an exclusive database of fully funded opportunities, tailored AI guidance, and a community of ambitious scholars globally.
          </p>
          
          <div className="mt-8 pt-8 border-t border-border flex flex-col gap-4">
            {['AI Profile Matching', 'Real-time Updates', 'Cover Letter Generator'].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-foreground"></div>
                <span className="text-sm font-medium tracking-wide">{feature}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
