import React, { useState, useEffect } from 'react';
import { useSelfEvalSettings, SelfEvalProfile, Criterion } from '../hooks/useSettings';
import { Save, Plus, Trash2, Edit2 } from 'lucide-react';

export default function SelfEvalCriteriaManagement() {
  const { profiles, loading, saveProfiles } = useSelfEvalSettings();
  const [localProfiles, setLocalProfiles] = useState<SelfEvalProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  useEffect(() => {
    if (profiles) {
      setLocalProfiles(JSON.parse(JSON.stringify(profiles)));
      if (profiles.length > 0 && !selectedProfileId) {
        setSelectedProfileId(profiles[0].id);
      }
    }
  }, [profiles]);

  if (loading || !localProfiles) {
    return <div className="p-12 text-center font-bold text-slate-500">Loading Configuration...</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    const success = await saveProfiles(localProfiles);
    setSaving(false);
    if (success) {
      const msg = document.createElement('div');
      msg.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-bold';
      msg.textContent = 'Settings saved successfully!';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    }
  };

  const addProfile = () => {
    const id = 'profile_' + Date.now();
    const newProfile: SelfEvalProfile = {
      id,
      name: 'New Profile',
      department: '',
      campus: '',
      position: '',
      category: '',
      evaluationType: '',
      evaluationPeriod: '',
      criteria: []
    };
    setLocalProfiles([...localProfiles, newProfile]);
    setSelectedProfileId(id);
  };

  const deleteProfile = (id: string) => {
    if (confirm('Are you sure you want to delete this profile?')) {
      const newProfiles = localProfiles.filter(p => p.id !== id);
      setLocalProfiles(newProfiles);
      if (selectedProfileId === id) setSelectedProfileId(newProfiles[0]?.id || '');
    }
  };

  const updateProfile = (id: string, updates: Partial<SelfEvalProfile>) => {
    setLocalProfiles(localProfiles.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const selectedProfile = localProfiles.find(p => p.id === selectedProfileId);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Self Evaluation Criteria</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage criteria rules for self evaluations</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors active:scale-95 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* Sidebar for Profiles */}
        <div className="w-1/3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[70vh]">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
            <h2 className="font-bold text-slate-700 dark:text-slate-200">Profiles</h2>
            <button onClick={addProfile} className="text-indigo-600 hover:text-indigo-700">
              <Plus size={20} />
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-2">
            {localProfiles.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedProfileId(p.id)}
                className={`flex justify-between items-center p-3 mb-1 rounded-xl cursor-pointer ${selectedProfileId === p.id ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
              >
                <span className="font-bold">{p.name}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            ))}
            {localProfiles.length === 0 && <div className="text-center p-4 text-slate-500 text-sm">No profiles found</div>}
          </div>
        </div>

        {/* Profile Editor */}
        <div className="w-2/3 flex flex-col gap-6">
          {selectedProfile ? (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden p-6">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100">Profile Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Profile Name</label>
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent" value={selectedProfile.name} onChange={e => updateProfile(selectedProfile.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Target Department</label>
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent" value={selectedProfile.department} onChange={e => updateProfile(selectedProfile.id, { department: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Target Campus</label>
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent" value={selectedProfile.campus} onChange={e => updateProfile(selectedProfile.id, { campus: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Target Position</label>
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent" value={selectedProfile.position} onChange={e => updateProfile(selectedProfile.id, { position: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex-1">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Criteria</h3>
                  <button 
                    onClick={() => updateProfile(selectedProfile.id, { criteria: [...selectedProfile.criteria, { id: Date.now(), kh: '', en: '', khDesc: '', desc: '', max: 10 }] })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-sm rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                  >
                    <Plus size={16} /> Add Criterion
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {selectedProfile.criteria.map((c, i) => (
                    <div key={c.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex gap-4 items-start">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <input placeholder="Khmer Title" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800" value={c.kh} onChange={e => {
                          const newC = [...selectedProfile.criteria]; newC[i].kh = e.target.value; updateProfile(selectedProfile.id, { criteria: newC });
                        }} />
                        <input placeholder="English Title" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800" value={c.en} onChange={e => {
                          const newC = [...selectedProfile.criteria]; newC[i].en = e.target.value; updateProfile(selectedProfile.id, { criteria: newC });
                        }} />
                        <textarea placeholder="Khmer Description" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" value={c.khDesc} onChange={e => {
                          const newC = [...selectedProfile.criteria]; newC[i].khDesc = e.target.value; updateProfile(selectedProfile.id, { criteria: newC });
                        }} />
                        <textarea placeholder="English Description" rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" value={c.desc} onChange={e => {
                          const newC = [...selectedProfile.criteria]; newC[i].desc = e.target.value; updateProfile(selectedProfile.id, { criteria: newC });
                        }} />
                      </div>
                      <div className="w-24">
                        <input type="number" placeholder="Max" className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center font-bold" value={c.max} onChange={e => {
                          const newC = [...selectedProfile.criteria]; newC[i].max = Number(e.target.value); updateProfile(selectedProfile.id, { criteria: newC });
                        }} />
                      </div>
                      <button onClick={() => {
                        const newC = selectedProfile.criteria.filter((_, idx) => idx !== i);
                        updateProfile(selectedProfile.id, { criteria: newC });
                      }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={20} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center h-64 text-slate-500 font-bold">
              Select a profile to edit
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
