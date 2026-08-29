import { useState } from 'react';
import axios from 'axios';
import { Loader2, Tag } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/ui/Toast';
import { API_BASE as API } from '../../../config/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

export default function AddScholarshipTab() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    titleEn: '', titleAr: '', descEn: '', descAr: '', countryEn: '', countryAr: '',
    uniEn: '', uniAr: '', degree: 'Bachelor', fundingType: 'Fully Funded',
    deadline: '', link: '', image: '', keywordsRaw: ''
  });

  const headers = { Authorization: `Bearer ${user?.token}` };
  const handleChange = (e: any) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAddScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const keywords = formData.keywordsRaw.split(',').map(k => k.trim()).filter(Boolean);
      await axios.post(`${API}/scholarships`, {
        title: { en: formData.titleEn, ar: formData.titleAr },
        description: { en: formData.descEn, ar: formData.descAr },
        country: { en: formData.countryEn, ar: formData.countryAr },
        university: { en: formData.uniEn, ar: formData.uniAr },
        degree: formData.degree,
        fundingType: formData.fundingType,
        deadline: formData.deadline && !isNaN(Date.parse(formData.deadline)) ? new Date(formData.deadline).toISOString() : '',
        link: formData.link,
        image: formData.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop',
        keywords: keywords.length ? keywords : ['Scholarship', formData.countryEn, formData.degree],
      }, { headers });
      toastSuccess('Scholarship published!', `"${formData.titleEn}" is now live.`);
      setFormData({ titleEn: '', titleAr: '', descEn: '', descAr: '', countryEn: '', countryAr: '', uniEn: '', uniAr: '', degree: 'Bachelor', fundingType: 'Fully Funded', deadline: '', link: '', image: '', keywordsRaw: '' });
    } catch (err: any) {
      toastError('Failed to publish', err.response?.data?.message || 'Check all required fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-light mb-6">Add Scholarship</h2>
      <form onSubmit={handleAddScholarship} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5"><Label className="text-xs">Title (EN)</Label><Input name="titleEn" value={formData.titleEn} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Title (AR)</Label><Input name="titleAr" value={formData.titleAr} onChange={handleChange} required className="rounded-lg shadow-none h-10 text-right" dir="rtl" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5"><Label className="text-xs">Description (EN)</Label><textarea name="descEn" value={formData.descEn} onChange={handleChange} required rows={3} className="w-full border border-input p-2.5 rounded-lg bg-background text-sm shadow-none resize-none focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Description (AR)</Label><textarea name="descAr" value={formData.descAr} onChange={handleChange} required rows={3} dir="rtl" className="w-full border border-input p-2.5 rounded-lg bg-background text-sm shadow-none resize-none text-right focus:outline-none focus:ring-1 focus:ring-ring" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5"><Label className="text-xs">University (EN)</Label><Input name="uniEn" value={formData.uniEn} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
          <div className="space-y-1.5"><Label className="text-xs">University (AR)</Label><Input name="uniAr" value={formData.uniAr} onChange={handleChange} required className="rounded-lg shadow-none h-10 text-right" dir="rtl" /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5"><Label className="text-xs">Country (EN)</Label><Input name="countryEn" value={formData.countryEn} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Country (AR)</Label><Input name="countryAr" value={formData.countryAr} onChange={handleChange} required className="rounded-lg shadow-none h-10 text-right" dir="rtl" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="space-y-1.5"><Label className="text-xs">Degree</Label>
            <select name="degree" value={formData.degree} onChange={handleChange} className="w-full h-10 border border-input bg-background px-2.5 rounded-lg text-sm shadow-none">
              <option>Bachelor</option><option>Master</option><option>PhD</option><option>Other</option>
            </select>
          </div>
          <div className="col-span-2 space-y-1.5"><Label className="text-xs">Funding Type</Label>
            <select name="fundingType" value={formData.fundingType} onChange={handleChange} className="w-full h-10 border border-input bg-background px-2.5 rounded-lg text-sm shadow-none">
              <option>Fully Funded</option><option>Partially Funded</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Deadline</Label><Input type="date" name="deadline" value={formData.deadline} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Keywords <span className="text-muted-foreground">(comma separated)</span></Label>
          <Input name="keywordsRaw" value={formData.keywordsRaw} onChange={handleChange} placeholder="Germany, Master, Engineering" className="rounded-lg shadow-none h-10" />
          {formData.keywordsRaw && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.keywordsRaw.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                <span key={k} className="px-2 py-0.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-medium rounded-full border border-red-200 dark:border-red-800">{k}</span>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1.5"><Label className="text-xs">Application Link</Label><Input type="url" name="link" value={formData.link} onChange={handleChange} required className="rounded-lg shadow-none h-10" /></div>
        <div className="space-y-1.5"><Label className="text-xs">Image URL (optional)</Label><Input type="url" name="image" value={formData.image} onChange={handleChange} className="rounded-lg shadow-none h-10" /></div>
        <Button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-semibold">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing…</> : 'Publish Scholarship'}
        </Button>
      </form>
    </div>
  );
}
