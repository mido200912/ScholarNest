import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Navbar from './components/layout/Navbar';
import { ToastProvider } from './components/ui/Toast';
import { Loader2 } from 'lucide-react';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const Search = lazy(() => import('./pages/Search'));
const ScholarshipDetails = lazy(() => import('./pages/ScholarshipDetails'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Compare = lazy(() => import('./pages/Compare'));
const InterviewSimulator = lazy(() => import('./pages/InterviewSimulator'));
const CoverLetterAssistant = lazy(() => import('./pages/CoverLetterAssistant'));
const AIChat = lazy(() => import('./components/AIChat'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function App() {
  const { user } = useAuthStore();

  return (
    <Router>
      <ToastProvider>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300 relative">
          <Navbar />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/search" element={<Search />} />
              <Route path="/scholarships/:id" element={<ScholarshipDetails />} />
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/interview-simulator" element={user ? <InterviewSimulator /> : <Navigate to="/login" />} />
              <Route path="/cover-letter" element={user ? <CoverLetterAssistant /> : <Navigate to="/login" />} />
            </Routes>
          </Suspense>
          <Suspense fallback={null}>
            <AIChat />
          </Suspense>
        </div>
      </ToastProvider>
    </Router>
  );
}

export default App;
