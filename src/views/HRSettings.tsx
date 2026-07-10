import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Save, Upload, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HRSettings() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    campuses: 'Main Campus\nNorth Campus\nSouth Campus',
    departments: 'IT\nHR\nFinance\nOperations\nAcademics',
    positions: 'Manager\nDeveloper\nTeacher\nStaff',
    categories: 'Full-time\nPart-time\nContractor',
    evalModels: 'campus_100\ncampus_60_40\ncampus_50_50',
    evalPeriods: 'Q1 2026\nQ2 2026\nQ3 2026\nQ4 2026\nAnnual 2026'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/hr_profiles', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          if (data) setSettings(data);
        }
      } catch (err) {} finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/hr_profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      if (res.ok) toast.success('Settings saved successfully');
      else toast.error('Failed to save settings');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hr_settings_export.json';
    a.click();
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        setSettings(data);
        toast.success('Settings imported successfully. Please save to apply changes.');
      } catch (err) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  if (loading) return <div className="p-12 text-center text-slate-500 font-bold">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">HR Profile Settings</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Configure drop-down options for Employee Profiles</p>
        </div>
        <div className="flex gap-3">
          <input type="file" accept=".json" ref={fileRef} onChange={importJSON} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 shadow-sm font-bold transition-colors">
            <Upload size={18} /> Import JSON
          </button>
          <button onClick={exportJSON} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 shadow-sm font-bold transition-colors">
            <Download size={18} /> Export JSON
          </button>
          <button onClick={saveSettings} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50">
            <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { key: 'campuses', label: 'Campuses' },
          { key: 'departments', label: 'Departments' },
          { key: 'positions', label: 'Positions' },
          { key: 'categories', label: 'Categories' },
          { key: 'evalModels', label: 'Evaluation Models' },
          { key: 'evalPeriods', label: 'Evaluation Periods' },
        ].map(({ key, label }) => (
          <div key={key} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{label}</h3>
              <p className="text-xs text-slate-500">One per line</p>
            </div>
            <div className="p-4">
              <textarea 
                value={(settings as any)[key]} 
                onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="w-full h-48 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
