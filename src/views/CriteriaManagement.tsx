import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings, EvaluationConfig, Criterion, EvaluationType, WeightingScheme } from '../hooks/useSettings';
import { Save, Plus, Trash2, Settings, List, PlusCircle } from 'lucide-react';

export default function CriteriaManagement() {
  const { config, loading, saveSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<'types' | 'weighting' | 'criteria'>('criteria');
  const [selectedType, setSelectedType] = useState<string>('management');
  const [saving, setSaving] = useState(false);
  const [localConfig, setLocalConfig] = useState<EvaluationConfig | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ isOpen: boolean, type: 'type' | 'weighting', value: string, title: string, placeholder: string }>({ isOpen: false, type: 'type', value: '', title: '', placeholder: '' });

  React.useEffect(() => {
    if (config) setLocalConfig(JSON.parse(JSON.stringify(config)));
  }, [config]);

  React.useEffect(() => {
    if (localConfig && localConfig.types.length > 0) {
      if (!localConfig.types.some(t => t.id === selectedType)) {
        setSelectedType(localConfig.types[0].id);
      }
    }
  }, [localConfig, selectedType]);

  if (loading || !localConfig) {
    return <div className="p-12 text-center font-bold text-slate-500">Loading Configuration...</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    const success = await saveSettings(localConfig);
    setSaving(false);
    if (success) {
      // Show a temporary success message instead of alert
      const msg = document.createElement('div');
      msg.className = 'fixed bottom-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-bold';
      msg.textContent = 'Settings saved successfully!';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    } else {
      const msg = document.createElement('div');
      msg.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 font-bold';
      msg.textContent = 'Error saving settings.';
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
    }
  };

  const openAddType = () => {
    setPromptDialog({ isOpen: true, type: 'type', value: '', title: 'Add Evaluation Type', placeholder: 'Enter a short ID (e.g. finance)' });
  };

  const openAddWeighting = () => {
    setPromptDialog({ isOpen: true, type: 'weighting', value: '', title: 'Add Weighting Scheme', placeholder: 'Enter a short ID (e.g. central_50)' });
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = promptDialog.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!id) return;

    if (promptDialog.type === 'type') {
      if (localConfig.types.find(t => t.id === id)) return; // Prevent duplicate
      setLocalConfig({
        ...localConfig,
        types: [...localConfig.types, { id, label: `New Type (${id})` }],
        criteriaSets: { ...localConfig.criteriaSets, [id]: [] }
      });
      setSelectedType(id);
    } else {
      if (localConfig.weightingSchemes.find(w => w.id === id)) return; // Prevent duplicate
      setLocalConfig({
        ...localConfig,
        weightingSchemes: [...localConfig.weightingSchemes, { id, label: `New Scheme (${id})` }]
      });
    }
    setPromptDialog({ ...promptDialog, isOpen: false });
  };

  const updateType = (idx: number, label: string) => {
    const newTypes = [...localConfig.types];
    newTypes[idx].label = label;
    setLocalConfig({ ...localConfig, types: newTypes });
  };

  const deleteType = (idx: number) => {
    const typeId = localConfig.types[idx].id;
    if (confirm(`Delete ${typeId}? This removes all its criteria.`)) {
      const newTypes = localConfig.types.filter((_, i) => i !== idx);
      const newSets = { ...localConfig.criteriaSets };
      delete newSets[typeId];
      setLocalConfig({ ...localConfig, types: newTypes, criteriaSets: newSets });
      if (selectedType === typeId) setSelectedType(newTypes[0]?.id || '');
    }
  };

  const updateWeighting = (idx: number, label: string) => {
    const newSchemes = [...localConfig.weightingSchemes];
    newSchemes[idx].label = label;
    setLocalConfig({ ...localConfig, weightingSchemes: newSchemes });
  };

  const deleteWeighting = (idx: number) => {
    if (confirm('Delete this weighting scheme?')) {
      const newSchemes = localConfig.weightingSchemes.filter((_, i) => i !== idx);
      setLocalConfig({ ...localConfig, weightingSchemes: newSchemes });
    }
  };

  const addCriterion = () => {
    if (!selectedType) {
      alert("Please add or select an Evaluation Type first.");
      return;
    }
    const newSets = { ...localConfig.criteriaSets };
    newSets[selectedType] = [
      ...(newSets[selectedType] || []),
      { id: Date.now(), kh: 'លក្ខណៈថ្មី', khDesc: 'ការពិពណ៌នាថ្មី', en: 'New Criteria', desc: 'New Description', max: 10 }
    ];
    setLocalConfig({ ...localConfig, criteriaSets: newSets });
  };

  const updateCriterion = (idx: number, field: keyof Criterion, val: string | number) => {
    const newSets = { ...localConfig.criteriaSets };
    const newArr = [...(newSets[selectedType] || [])];
    newArr[idx] = { ...newArr[idx], [field]: val };
    newSets[selectedType] = newArr;
    setLocalConfig({ ...localConfig, criteriaSets: newSets });
  };

  const deleteCriterion = (idx: number) => {
    const newSets = { ...localConfig.criteriaSets };
    newSets[selectedType] = newSets[selectedType].filter((_, i) => i !== idx);
    setLocalConfig({ ...localConfig, criteriaSets: newSets });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">System Configuration</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Manage Evaluation Criteria, Weighting & Evaluators / រៀបចំលក្ខណៈវិនិច្ឆ័យ</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors active:scale-95 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700 p-2 gap-2 bg-slate-50 dark:bg-slate-900/50">
          <TabButton active={activeTab === 'types'} onClick={() => setActiveTab('types')} icon={<List size={18}/>} label="Evaluation Types" />
          <TabButton active={activeTab === 'weighting'} onClick={() => setActiveTab('weighting')} icon={<Settings size={18}/>} label="Weighting Schemes" />
          <TabButton active={activeTab === 'criteria'} onClick={() => setActiveTab('criteria')} icon={<PlusCircle size={18}/>} label="Criteria Sets" />
        </div>

        <div className="p-8">
          {activeTab === 'types' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Evaluation Types / ប្រភេទវាយតម្លៃ</h3>
                <button onClick={openAddType} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <Plus size={16} /> Add Type
                </button>
              </div>
              <div className="space-y-4">
                {localConfig.types.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
                    <div className="w-48 font-mono text-xs font-bold text-slate-400 dark:text-slate-500 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">{t.id}</div>
                    <input 
                      className="flex-1 px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400"
                      value={t.label} onChange={e => updateType(i, e.target.value)} placeholder="Type Name"
                    />
                    <button onClick={() => deleteType(i)} className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'weighting' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Weighting Schemes / របៀបគណនា</h3>
                <button onClick={openAddWeighting} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold text-sm rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                  <Plus size={16} /> Add Scheme
                </button>
              </div>
              <div className="space-y-4">
                {localConfig.weightingSchemes.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
                    <div className="w-48 font-mono text-xs font-bold text-slate-400 dark:text-slate-500 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">{s.id}</div>
                    <input 
                      className="flex-1 px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400"
                      value={s.label} onChange={e => updateWeighting(i, e.target.value)} placeholder="Scheme Label"
                    />
                    <button onClick={() => deleteWeighting(i)} className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'criteria' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="font-bold text-slate-700 dark:text-slate-300">Select Type to Edit:</label>
                <select 
                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 outline-none"
                  value={selectedType} onChange={e => setSelectedType(e.target.value)}
                >
                  {localConfig.types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <button onClick={addCriterion} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus size={16} /> Add Criterion
                </button>
              </div>

              <div className="space-y-6">
                {(localConfig.criteriaSets[selectedType] || []).map((c, i) => (
                  <div key={c.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 relative group hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all">
                    <button 
                      onClick={() => deleteCriterion(i)} 
                      className="absolute top-4 right-4 p-2 text-slate-300 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18}/>
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ចំណងជើងជាភាសាខ្មែរ<br/><span className="text-[10px] font-normal">Khmer Title</span></label>
                        <input className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100" value={c.kh} onChange={e => updateCriterion(i, 'kh', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ចំណងជើងជាភាសាអង់គ្លេស<br/><span className="text-[10px] font-normal">English Title</span></label>
                        <input className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100" value={c.en} onChange={e => updateCriterion(i, 'en', e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ពិន្ទុអតិបរមា<br/><span className="text-[10px] font-normal">Max Score</span></label>
                        <input type="number" min="1" max="100" className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 dark:text-slate-100" value={c.max || 10} onChange={e => updateCriterion(i, 'max', parseInt(e.target.value) || 10)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ការពិពណ៌នាជាភាសាខ្មែរ<br/><span className="text-[10px] font-normal">Khmer Description</span></label>
                        <textarea rows={2} className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm text-slate-600 dark:text-slate-300 resize-none" value={c.khDesc} onChange={e => updateCriterion(i, 'khDesc', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">ការពិពណ៌នាជាភាសាអង់គ្លេស<br/><span className="text-[10px] font-normal">English Description</span></label>
                        <textarea rows={2} className="w-full px-4 py-2 bg-transparent border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm text-slate-600 dark:text-slate-300 resize-none" value={c.desc} onChange={e => updateCriterion(i, 'desc', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
                {(localConfig.criteriaSets[selectedType] || []).length === 0 && (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                    No criteria defined for this type.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {promptDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{promptDialog.title}</h2>
            </div>
            <form onSubmit={handlePromptSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Identifier</label>
                <input
                  autoFocus
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 dark:text-slate-100 outline-none transition-all"
                  placeholder={promptDialog.placeholder}
                  value={promptDialog.value}
                  onChange={e => setPromptDialog({ ...promptDialog, value: e.target.value })}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Use lowercase letters, numbers, and underscores only.</p>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setPromptDialog({ ...promptDialog, isOpen: false })}
                  className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${active ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
    >
      {icon}
      {label}
    </button>
  );
}
