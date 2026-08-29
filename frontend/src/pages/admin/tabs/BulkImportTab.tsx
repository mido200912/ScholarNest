import { useState, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Table, FileSpreadsheet, FileJson, Upload, Copy, Plus, Minus, AlertTriangle, Loader2, FileText, X, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useToast } from '../../../components/ui/Toast';
import { API_BASE as API } from '../../../config/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

export default function BulkImportTab() {
  const { user } = useAuthStore();
  const { success: toastSuccess, error: toastError } = useToast();

  const [bulkMode, setBulkMode] = useState<'table' | 'csv' | 'json'>('table');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkJson, setBulkJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [csvText, setCsvText] = useState('');
  
  const csvFileInput = useRef<HTMLInputElement>(null);
  const jsonFileInput = useRef<HTMLInputElement>(null);

  const [bulkRows, setBulkRows] = useState<any[]>([
    { titleEn: '', titleAr: '', descEn: '', descAr: '', countryEn: '', countryAr: '', uniEn: '', uniAr: '', degree: 'Master', fundingType: 'Fully Funded', deadline: '', link: '', image: '', keywords: '' },
  ]);

  const headers = { Authorization: `Bearer ${user?.token}` };

  const csvHeaders = [
    'title_en', 'title_ar', 'description_en', 'description_ar', 'university_en', 'university_ar',
    'country_en', 'country_ar', 'degree', 'fundingType', 'deadline', 'applicationOpens', 'link', 'image', 'keywords', 'verificationNote'
  ];

  const generateCsvTemplate = () => {
    return csvHeaders.join(',') + '\n' + 'Chevening Scholarships,منح تشيفنينغ الدراسية,"Fully funded master\'s degree in the UK","منحة ماجستير ممولة بالكامل في المملكة المتحدة",Various UK Universities,جامعات بريطانية متعددة,United Kingdom,المملكة المتحدة,Master,Fully Funded,2026-10-06,2026-08-04,https://www.chevening.org/apply/,https://example.com/image.jpg,"UK, Master, Leadership, Chevening",Verified live Aug 2026';
  };

  const rowsToJson = () => {
    return bulkRows.map(r => ({
      title: { en: r.titleEn, ar: r.titleAr },
      description: { en: r.descEn, ar: r.descAr },
      country: { en: r.countryEn, ar: r.countryAr },
      university: { en: r.uniEn, ar: r.uniAr },
      degree: r.degree,
      fundingType: r.fundingType,
      deadline: r.deadline && !isNaN(Date.parse(r.deadline)) ? new Date(r.deadline).toISOString() : '',
      link: r.link,
      image: r.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop',
      keywords: typeof r.keywords === 'string' ? r.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : r.keywords,
    })).filter(r => r.title.en || r.title.ar);
  };

  const validateScholarships = (scholarships: any[]): { valid: any[]; errors: string[] } => {
    const requiredFields = [
      { key: 'title.en', label: 'Title (EN)', check: (s: any) => s.title?.en },
      { key: 'title.ar', label: 'Title (AR)', check: (s: any) => s.title?.ar },
      { key: 'description.en', label: 'Description (EN)', check: (s: any) => s.description?.en },
      { key: 'description.ar', label: 'Description (AR)', check: (s: any) => s.description?.ar },
      { key: 'university.en', label: 'University (EN)', check: (s: any) => s.university?.en },
      { key: 'university.ar', label: 'University (AR)', check: (s: any) => s.university?.ar },
      { key: 'country.en', label: 'Country (EN)', check: (s: any) => s.country?.en },
      { key: 'country.ar', label: 'Country (AR)', check: (s: any) => s.country?.ar },
      { key: 'degree', label: 'Degree', check: (s: any) => s.degree },
      { key: 'fundingType', label: 'Funding Type', check: (s: any) => s.fundingType },
      { key: 'deadline', label: 'Deadline', check: (s: any) => s.deadline },
      { key: 'link', label: 'Application Link', check: (s: any) => s.link },
    ];

    const valid: any[] = [];
    const errors: string[] = [];

    scholarships.forEach((s, idx) => {
      const missing = requiredFields.filter(f => !f.check(s)).map(f => f.label);
      if (missing.length > 0) {
        errors.push(`Row ${idx + 1} (${s.title?.en || s.title?.ar || 'Untitled'}): Missing required fields — ${missing.join(', ')}`);
      } else {
        valid.push(s);
      }
    });

    return { valid, errors };
  };

  const parseJson = (jsonText: string): any[] => {
    try {
      const parsed = JSON.parse(jsonText);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      
      return arr.map(item => {
        if (item.title?.en || item.title?.ar) return item;
        return {
          title: { en: item.title_en || item.titleEn || '', ar: item.title_ar || item.titleAr || '' },
          description: { en: item.description_en || item.descEn || '', ar: item.description_ar || item.descAr || '' },
          university: { en: item.university_en || item.uniEn || '', ar: item.university_ar || item.uniAr || '' },
          country: { en: item.country_en || item.countryEn || '', ar: item.country_ar || item.countryAr || '' },
          degree: item.degree || 'Master',
          fundingType: item.fundingType || 'Fully Funded',
          deadline: item.deadline ? (isNaN(Date.parse(item.deadline)) ? '' : new Date(item.deadline).toISOString()) : '',
          link: item.link || '',
          image: item.image || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop',
          keywords: item.keywords ? (typeof item.keywords === 'string' ? item.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : item.keywords) : [],
        };
      }).filter(r => r.title.en || r.title.ar);
    } catch {
      return [];
    }
  };

  const parseCsv = (text: string): any[] => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result.map(v => v.replace(/^"|"$/g, ''));
    };

    const headers = parseLine(lines[0]);
    return lines.slice(1).map(line => {
      const values = parseLine(line);
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });
      return obj;
    });
  };

  const handleBulkImport = async (scholarships: any[]) => {
    const { valid, errors } = validateScholarships(scholarships);
    
    if (errors.length > 0) {
      setJsonError('Validation Failed:\n\n' + errors.join('\n'));
      toastError('Validation Failed', `${errors.length} scholarship(s) have missing required fields`);
      return;
    }

    if (!valid.length) {
      toastError('Empty Data', 'No valid scholarships to import.');
      return;
    }

    setBulkLoading(true);
    setJsonError('');
    try {
      const { data } = await axios.post(`${API}/scholarships/bulk`, { scholarships }, { headers });
      toastSuccess(`${data.count} scholarships imported!`, 'All scholarships are now live.');
      setBulkRows([{ titleEn: '', titleAr: '', descEn: '', descAr: '', countryEn: '', countryAr: '', uniEn: '', uniAr: '', degree: 'Master', fundingType: 'Fully Funded', deadline: '', link: '', image: '', keywords: '' }]);
      setCsvText('');
      setBulkJson('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Bulk import failed.';
      const details = err.response?.data?.details?.join('\n') || '';
      setJsonError(details ? `${msg}\n\n${details}` : msg);
      toastError('Import failed', msg);
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <h2 className="text-2xl font-light mb-1">Bulk Import Scholarships</h2>
      <p className="text-muted-foreground text-sm mb-6">
        Import multiple scholarships at once using a table editor, CSV, or JSON.
      </p>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'table' as const, label: 'Table Editor', icon: Table },
          { id: 'csv' as const, label: 'CSV Import', icon: FileSpreadsheet },
          { id: 'json' as const, label: 'JSON (Advanced)', icon: FileJson },
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => setBulkMode(mode.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              bulkMode === mode.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <mode.icon className="w-4 h-4" />
            {mode.label}
          </button>
        ))}
      </div>

      {bulkMode === 'table' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {bulkRows.filter(r => r.titleEn || r.titleAr).length} scholarships ready
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const csv = [csvHeaders.join(','), ...bulkRows.map(r => csvHeaders.map(h => `"${r[h] || ''}"`).join(','))].join('\n');
                  navigator.clipboard.writeText(csv);
                  toastSuccess('Copied!', 'CSV copied to clipboard');
                }}
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy as CSV
              </Button>
              <Button onClick={() => setBulkRows([...bulkRows, { titleEn: '', titleAr: '', descEn: '', descAr: '', countryEn: '', countryAr: '', uniEn: '', uniAr: '', degree: 'Master', fundingType: 'Fully Funded', deadline: '', link: '', image: '', keywords: '' }])} size="sm" className="h-8 px-3 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">#</th>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">Title (EN)</th>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">Title (AR)</th>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">Country</th>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">University</th>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">Degree</th>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">Funding</th>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">Deadline</th>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">Link</th>
                  <th className="p-2 text-left font-medium text-xs text-muted-foreground uppercase">Keywords</th>
                  <th className="p-2 text-center font-medium text-xs text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, idx) => (
                  <tr key={idx} className="border-t border-border hover:bg-muted/50">
                    <td className="p-2 text-muted-foreground">{idx + 1}</td>
                    <td className="p-2"><Input value={row.titleEn} onChange={e => { const nr = [...bulkRows]; nr[idx] = { ...nr[idx], titleEn: e.target.value }; setBulkRows(nr); }} placeholder="Title EN" className="h-8 text-xs" /></td>
                    <td className="p-2"><Input value={row.titleAr} onChange={e => { const nr = [...bulkRows]; nr[idx] = { ...nr[idx], titleAr: e.target.value }; setBulkRows(nr); }} placeholder="Title AR" className="h-8 text-xs text-right" dir="rtl" /></td>
                    <td className="p-2"><Input value={row.countryEn} onChange={e => { const nr = [...bulkRows]; nr[idx] = { ...nr[idx], countryEn: e.target.value }; setBulkRows(nr); }} placeholder="Country EN" className="h-8 text-xs" /></td>
                    <td className="p-2"><Input value={row.uniEn} onChange={e => { const nr = [...bulkRows]; nr[idx] = { ...nr[idx], uniEn: e.target.value }; setBulkRows(nr); }} placeholder="University EN" className="h-8 text-xs" /></td>
                    <td className="p-2">
                      <select value={row.degree} onChange={e => { const nr = [...bulkRows]; nr[idx] = { ...nr[idx], degree: e.target.value }; setBulkRows(nr); }} className="w-full h-8 text-xs border border-input bg-background px-2 rounded">
                        <option>Bachelor</option><option>Master</option><option>PhD</option><option>Other</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.fundingType} onChange={e => { const nr = [...bulkRows]; nr[idx] = { ...nr[idx], fundingType: e.target.value }; setBulkRows(nr); }} className="w-full h-8 text-xs border border-input bg-background px-2 rounded">
                        <option>Fully Funded</option><option>Partially Funded</option>
                      </select>
                    </td>
                    <td className="p-2"><Input type="date" value={row.deadline} onChange={e => { const nr = [...bulkRows]; nr[idx] = { ...nr[idx], deadline: e.target.value }; setBulkRows(nr); }} className="h-8 text-xs" /></td>
                    <td className="p-2"><Input value={row.link} onChange={e => { const nr = [...bulkRows]; nr[idx] = { ...nr[idx], link: e.target.value }; setBulkRows(nr); }} placeholder="https://" className="h-8 text-xs" /></td>
                    <td className="p-2"><Input value={row.keywords} onChange={e => { const nr = [...bulkRows]; nr[idx] = { ...nr[idx], keywords: e.target.value }; setBulkRows(nr); }} placeholder="Eng, CS, Masters" className="h-8 text-xs" /></td>
                    <td className="p-2 text-center">
                      {bulkRows.length > 1 && (
                        <Button onClick={() => setBulkRows(bulkRows.filter((_, i) => i !== idx))} variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10">
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => handleBulkImport(rowsToJson())}
              disabled={bulkLoading || !rowsToJson().length}
              className="h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold px-6"
            >
              {bulkLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4 mr-2" /> Import All ({rowsToJson().length})</>}
            </Button>
          </div>
        </div>
      )}

      {bulkMode === 'csv' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" className="h-10 px-4" onClick={() => csvFileInput.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Upload CSV File
            </Button>
            <input ref={csvFileInput} type="file" accept=".csv" onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = ev => setCsvText(ev.target?.result as string);
                reader.readAsText(file);
              }
            }} className="hidden" />
            <Button onClick={() => setCsvText(generateCsvTemplate())} variant="outline" size="sm" className="h-8 px-3 text-xs">
              <FileText className="w-3.5 h-3.5 mr-1" /> Use Template
            </Button>
            <Button onClick={() => {
              const parsed = parseCsv(csvText);
              if (parsed.length) {
                setBulkRows(parsed.map(p => ({
                  titleEn: p.title_en || p.titleEn || '', titleAr: p.title_ar || p.titleAr || '',
                  descEn: p.description_en || p.descEn || '', descAr: p.description_ar || p.descAr || '',
                  countryEn: p.country_en || p.countryEn || '', countryAr: p.country_ar || p.countryAr || '',
                  uniEn: p.university_en || p.uniEn || '', uniAr: p.university_ar || p.uniAr || '',
                  degree: p.degree || 'Master', fundingType: p.fundingType || 'Fully Funded',
                  deadline: p.deadline || '', link: p.link || '', image: p.image || '', keywords: p.keywords || '',
                })));
                setBulkMode('table');
                toastSuccess('CSV Parsed', `${parsed.length} rows loaded into table editor`);
              }
            }} size="sm" className="h-8 px-3 text-xs">
              <Table className="w-3.5 h-3.5 mr-1" /> Load into Table
            </Button>
          </div>
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            rows={12}
            placeholder={generateCsvTemplate()}
            className="w-full font-mono text-xs border border-input p-3 rounded-lg bg-background shadow-none resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            spellCheck={false}
          />
        </div>
      )}

      {bulkMode === 'json' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-xs">Your JSON Array</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => jsonFileInput.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Upload JSON
              </Button>
              <input ref={jsonFileInput} type="file" accept=".json" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = ev => setBulkJson(ev.target?.result as string);
                  reader.readAsText(file);
                }
              }} className="hidden" />
            </div>
          </div>
          <textarea
            value={bulkJson}
            onChange={e => { setBulkJson(e.target.value); setJsonError(''); }}
            rows={14}
            placeholder='[ { "title": { "en": "..." }, ... } ]'
            className="w-full font-mono text-xs border border-input p-3 rounded-lg bg-background shadow-none resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            spellCheck={false}
          />
          {jsonError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Error</p>
              <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">{jsonError}</pre>
            </motion.div>
          )}
          <Button
            onClick={() => {
              try {
                const parsed = parseJson(bulkJson);
                if (parsed.length === 0) throw new Error('No valid scholarships found in JSON');
                handleBulkImport(parsed);
              } catch (e: any) {
                setJsonError(e.message || 'Invalid JSON format');
              }
            }}
            disabled={bulkLoading || !bulkJson.trim()}
            className="w-full h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            {bulkLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4 mr-2" /> Import Scholarships</>}
          </Button>
        </div>
      )}
    </div>
  );
}
