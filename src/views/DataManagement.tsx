import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Database, Download, Upload, RotateCcw, AlertTriangle, FileJson, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import * as xlsx from 'xlsx';

export default function DataManagement() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'reset'>('backup');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only Super Administrators can access Data Management.</p>
      </div>
    );
  }

  const handleBackup = async (format: 'json' | 'excel') => {
    setLoading(true);
    try {
      const res = await fetch('/api/data/export', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `System_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      } else if (format === 'excel') {
        const workbook = xlsx.utils.book_new();
        
        if (data.users) {
          const wsUsers = xlsx.utils.json_to_sheet(data.users);
          xlsx.utils.book_append_sheet(workbook, wsUsers, 'Users');
        }
        if (data.evaluations) {
          const wsEvals = xlsx.utils.json_to_sheet(data.evaluations);
          xlsx.utils.book_append_sheet(workbook, wsEvals, 'Evaluations');
        }
        if (data.criteriaScores) {
          const wsScores = xlsx.utils.json_to_sheet(data.criteriaScores);
          xlsx.utils.book_append_sheet(workbook, wsScores, 'Criteria_Scores');
        }
        if (data.settings) {
          const wsSettings = xlsx.utils.json_to_sheet(data.settings);
          xlsx.utils.book_append_sheet(workbook, wsSettings, 'Settings');
        }

        xlsx.writeFile(workbook, `System_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
      
      showMessage('Backup created successfully!', 'success');
    } catch (err: any) {
      showMessage(err.message || 'Failed to create backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (type: string) => {
    if (!window.confirm(`Are you absolutely sure you want to reset ${type.toUpperCase()}? This action cannot be undone!`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/data/reset/${type}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showMessage(`${type.toUpperCase()} data reset successfully!`, 'success');
      } else {
        const err = await res.json();
        showMessage(err.error || 'Failed to reset data', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">គ្រប់គ្រងទិន្នន័យ</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Data Management & Backups</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl font-medium border flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' 
            : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          {message.text}
        </div>
      )}

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
        <button 
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'backup' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          <Download size={18} />
          Backup Data
        </button>
        <button 
          onClick={() => setActiveTab('restore')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'restore' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          <Upload size={18} />
          Import / Restore
        </button>
        <button 
          onClick={() => setActiveTab('reset')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'reset' ? 'bg-red-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          <RotateCcw size={18} />
          Reset System
        </button>
      </div>

      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <FileJson size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Full JSON Backup</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Complete raw database dump. Best for migrating to a new system or disaster recovery.</p>
            <button 
              onClick={() => handleBackup('json')}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              Generate JSON Backup
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
              <FileSpreadsheet size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Excel Export Backup</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Exports all tables to separate sheets in a single Excel file. Easy to read and edit.</p>
            <button 
              onClick={() => handleBackup('excel')}
              disabled={loading}
              className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              Download Excel File
            </button>
          </div>
        </div>
      )}

      {activeTab === 'reset' && (
        <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-6">
            <AlertTriangle size={24} />
            <h3 className="text-lg font-bold">Danger Zone: System Reset</h3>
          </div>
          
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">
            Warning: These actions are permanent and cannot be undone. Always ensure you have a recent backup before performing a reset.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Reset All Evaluations</h4>
                <p className="text-xs text-slate-500 mt-1">Deletes all appraisal records and criteria scores.</p>
              </div>
              <button onClick={() => handleReset('evaluations')} disabled={loading} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors text-sm disabled:opacity-50">
                Reset Appraisals
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Reset Users</h4>
                <p className="text-xs text-slate-500 mt-1">Deletes all users EXCEPT the default superadmin.</p>
              </div>
              <button onClick={() => handleReset('users')} disabled={loading} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors text-sm disabled:opacity-50">
                Reset Users
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100">Factory Reset</h4>
                <p className="text-xs text-slate-500 mt-1">Wipes all data, users, and resets settings to default.</p>
              </div>
              <button onClick={() => handleReset('all')} disabled={loading} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm shadow-sm disabled:opacity-50">
                Wipe All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'restore' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <div className="text-center py-12 px-6">
            <Upload size={48} className="mx-auto text-slate-400 mb-4" />
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Import System Backup</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
              Select a previously generated JSON backup file to restore the system state. This will overwrite current matching records.
            </p>
            
            <label className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors cursor-pointer">
              <span>Select Backup File (.json)</span>
              <input type="file" className="hidden" accept=".json" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                if (!window.confirm('Are you sure you want to restore this backup? This may overwrite existing data.')) return;
                
                setLoading(true);
                try {
                  const text = await file.text();
                  const data = JSON.parse(text);
                  
                  const res = await fetch('/api/data/import', {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}` 
                    },
                    body: JSON.stringify(data)
                  });
                  
                  if (res.ok) {
                    showMessage('Data imported successfully!', 'success');
                  } else {
                    const err = await res.json();
                    showMessage(err.error || 'Failed to import data', 'error');
                  }
                } catch (err: any) {
                  showMessage('Invalid JSON file format', 'error');
                } finally {
                  setLoading(false);
                }
              }} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
