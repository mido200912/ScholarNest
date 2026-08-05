import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, BookOpen, Target, Languages, Loader2, Save } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useToast } from '../components/ui/Toast';
import axios from 'axios';

const API = 'http://localhost:5000/api';

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    major: '',
    gpa: '',
    englishLevel: '',
    targetCountries: '',
  });
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setFormData({
      name: user.name || '',
      major: user.major || '',
      gpa: user.gpa || '',
      englishLevel: user.englishLevel || '',
      targetCountries: user.targetCountries?.join(', ') || '',
    });
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const targetCountriesArray = formData.targetCountries
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);

      const { data } = await axios.put(
        `${API}/auth/profile`,
        {
          name: formData.name,
          major: formData.major,
          gpa: formData.gpa,
          englishLevel: formData.englishLevel,
          targetCountries: targetCountriesArray,
        },
        { headers: { Authorization: `Bearer ${user?.token}` } }
      );

      if (data.success) {
        setUser(data.data);
        success('Profile Updated', 'Your smart profile has been updated successfully. The AI will use this data for your cover letters.');
      }
    } catch (err: any) {
      toastError('Update Failed', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-sm"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-black text-foreground mb-2">Smart Profile</h1>
            <p className="text-muted-foreground text-sm">
              Complete your profile to let our AI generate personalized, highly-accurate cover letters and statements of purpose for you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-2">
                <User className="w-5 h-5 text-red-500" /> Basic Information
              </h2>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Ahmed Ali"
                  required
                  className="bg-background shadow-none"
                />
              </div>
            </div>

            {/* Academic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-2 mt-8">
                <BookOpen className="w-5 h-5 text-red-500" /> Academic Background
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="major">Current/Target Major</Label>
                  <Input
                    id="major"
                    name="major"
                    value={formData.major}
                    onChange={handleChange}
                    placeholder="e.g. Computer Science"
                    className="bg-background shadow-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gpa">GPA / Grades</Label>
                  <Input
                    id="gpa"
                    name="gpa"
                    value={formData.gpa}
                    onChange={handleChange}
                    placeholder="e.g. 3.8/4.0 or 95%"
                    className="bg-background shadow-none"
                  />
                </div>
              </div>
            </div>

            {/* Skills & Preferences */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-2 mt-8">
                <Languages className="w-5 h-5 text-green-500" /> Skills & Preferences
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="englishLevel">English Level (IELTS/TOEFL)</Label>
                  <Input
                    id="englishLevel"
                    name="englishLevel"
                    value={formData.englishLevel}
                    onChange={handleChange}
                    placeholder="e.g. IELTS 7.5 or Fluent"
                    className="bg-background shadow-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetCountries">Target Countries</Label>
                  <Input
                    id="targetCountries"
                    name="targetCountries"
                    value={formData.targetCountries}
                    onChange={handleChange}
                    placeholder="e.g. USA, UK, Germany (Comma separated)"
                    className="bg-background shadow-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end">
              <Button type="submit" disabled={loading} className="px-8 bg-red-600 hover:bg-red-700 text-white rounded-xl">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
