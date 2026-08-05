import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import ScholarshipDetails from './pages/ScholarshipDetails';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Compare from './pages/Compare';
import InterviewSimulator from './pages/InterviewSimulator';
import CoverLetterAssistant from './pages/CoverLetterAssistant';
import AIChat from './components/AIChat';
import Navbar from './components/layout/Navbar';
import { ToastProvider } from './components/ui/Toast';

function App() {
  const { user } = useAuthStore();

  return (
    <Router>
      <ToastProvider>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-sans transition-colors duration-300 relative">
          <Navbar />
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
          <AIChat />
        </div>
      </ToastProvider>
    </Router>
  );
}

export default App;
