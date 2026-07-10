import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CriteriaScore, PeerFeedback, STATUS_LABELS } from '../types';
import { Save, Plus, Trash2, Printer, Eye, Edit2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSettings, useSelfEvalSettings } from '../hooks/useSettings';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function EvaluationForm() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isViewOnly = searchParams.get('view') === 'true';

  const { config, loading: configLoading } = useSettings();
  const { profiles, loading: profilesLoading } = useSelfEvalSettings();
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(!!editId);
  const [formData, setFormData] = useState({
    id: '',
    employeeId: '',
    employeeName: '',
    campus: '',
    department: '',
    position: '',
    category: '',
    appraiser: '',
    supporter: '',
    evalPeriod: '',
    reviewDate: new Date().toISOString().split('T')[0],
    weightScheme: '',
    evaluationType: '',
    status: 'Draft',
    createdAt: '',
    createdByName: '',
    evaluatorComments: ''
  });

  const [criteriaScores, setCriteriaScores] = useState<CriteriaScore[]>([]);
  const [peerFeedbacks, setPeerFeedbacks] = useState<PeerFeedback[]>([]);

  useEffect(() => {
    if (editId) {
      fetchEvaluation();
    }
  }, [editId]);

  const fetchEvaluation = async () => {
    try {
      const res = await fetch(`/api/evaluations/${editId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({
          id: data.id,
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          campus: data.campus,
          department: data.department || '',
          position: data.position,
          category: data.category || '',
          appraiser: data.appraiser,
          supporter: data.supporter || '',
          evalPeriod: data.evalPeriod || '',
          reviewDate: data.reviewDate,
          weightScheme: data.weightScheme,
          evaluationType: data.evaluationType || 'management',
          status: data.status || 'Draft',
          createdAt: data.createdAt,
          createdByName: data.createdByName,
          evaluatorComments: data.evaluatorComments || ''
        });
        setCriteriaScores(data.scores || []);
        setPeerFeedbacks(data.peerFeedbacks || []);
      } else {
        alert('Evaluation not found');
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    if (!editId && config && formData.evaluationType === '') {
      setFormData(prev => ({
        ...prev,
        evaluationType: config.types[0]?.id || '',
        weightScheme: config.weightingSchemes[0]?.id || ''
      }));
    }
  }, [config, editId]);

  // Find matching profile
  let matchedProfile = null;
  if (profiles) {
    matchedProfile = profiles.find(p => {
      if (p.department && p.department.toLowerCase() !== formData.department.toLowerCase()) return false;
      if (p.campus && p.campus.toLowerCase() !== formData.campus.toLowerCase()) return false;
      if (p.position && p.position.toLowerCase() !== formData.position.toLowerCase()) return false;
      if (p.category && p.category.toLowerCase() !== formData.category.toLowerCase()) return false;
      if (p.evaluationType && p.evaluationType !== formData.evaluationType) return false;
      if (p.evaluationPeriod && p.evaluationPeriod.toLowerCase() !== formData.evalPeriod.toLowerCase()) return false;
      return true;
    });
  }

  const currentCriteria = matchedProfile?.criteria && matchedProfile.criteria.length > 0
    ? matchedProfile.criteria 
    : config?.criteriaSets[formData.evaluationType] || [];
  
  useEffect(() => {
    if (!editId && !initialLoad && currentCriteria.length > 0 && criteriaScores.length === 0) {
      setCriteriaScores(currentCriteria.map(c => ({ 
        criteriaId: c.id, 
        selfScore: 0, 
        superScore: 0,
        supporterScore: 0,
        managementScore: 0,
        aspScore: 0
      })));
    }
  }, [formData.evaluationType, currentCriteria, editId, initialLoad]);

  const handleCriteriaChange = (idx: number, field: keyof CriteriaScore, val: string, maxScore: number = 10) => {
    const num = Math.min(maxScore, Math.max(0, parseFloat(val) || 0));
    const newScores = [...criteriaScores];
    if (newScores[idx]) {
      (newScores[idx][field] as number) = num;
      setCriteriaScores(newScores);
    }
  };

  const addPeerFeedback = () => setPeerFeedbacks([...peerFeedbacks, { peerName: '', feedback: '', score: 0 }]);
  const updatePeerFeedback = (idx: number, field: keyof PeerFeedback, val: string | number) => {
    const newFb = [...peerFeedbacks];
    newFb[idx] = { ...newFb[idx], [field]: val };
    setPeerFeedbacks(newFb);
  };
  const removePeerFeedback = (idx: number) => setPeerFeedbacks(peerFeedbacks.filter((_, i) => i !== idx));

  // Determine which columns to show based on weighting scheme
  const showSelf = true; // Always show self score
  const showSuper = ['campus_60_40', 'campus_50_50', 'campus_100', 'central_100'].includes(formData.weightScheme);
  const showSupporter = ['campus_60_40', 'campus_50_50'].includes(formData.weightScheme);
  const showManagement = formData.weightScheme === 'management_100';
  const showAsp = formData.weightScheme === 'asp_100';

  // Calculate scores
  const totalSelf = criteriaScores.reduce((sum, c) => sum + (c.selfScore || 0), 0);
  const totalSuper = criteriaScores.reduce((sum, c) => sum + (c.superScore || 0), 0);
  const totalSupporter = criteriaScores.reduce((sum, c) => sum + (c.supporterScore || 0), 0);
  const totalManagement = criteriaScores.reduce((sum, c) => sum + (c.managementScore || 0), 0);
  const totalAsp = criteriaScores.reduce((sum, c) => sum + (c.aspScore || 0), 0);
  const maxPossibleScore = currentCriteria.reduce((sum, c) => sum + (c.max || 10), 0);
  
  let overallScore = 0;
  if (formData.weightScheme === 'campus_60_40') {
    overallScore = (totalSuper * 0.6) + (totalSupporter * 0.4);
  } else if (formData.weightScheme === 'campus_50_50') {
    overallScore = (totalSuper * 0.5) + (totalSupporter * 0.5);
  } else if (formData.weightScheme === 'management_100') {
    overallScore = totalManagement;
  } else if (formData.weightScheme === 'asp_100') {
    overallScore = totalAsp;
  } else {
    // campus_100 or central_100
    overallScore = totalSuper;
  }

  // Normalize to 100 based on criteria max scores
  if (maxPossibleScore > 0) {
    overallScore = (overallScore / maxPossibleScore) * 100;
  }

  // Peer feedback adjustment (max +5 bonus)
  if (peerFeedbacks.length > 0) {
    const avgPeer = peerFeedbacks.reduce((sum, p) => sum + p.score, 0) / peerFeedbacks.length;
    overallScore += (avgPeer * 0.5);
  }

  overallScore = Math.min(100, Math.max(0, overallScore));

  const fetchEmployeeData = async (empId: string) => {
    if (!empId) return;
    try {
      const res = await fetch(`/api/employees?id=${empId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const emp = await res.json();
        if (emp) {
          setFormData(prev => ({
            ...prev,
            employeeName: emp.name + (emp.khmerName ? ` (${emp.khmerName})` : ''),
            campus: emp.campus || prev.campus,
            department: emp.department || prev.department,
            position: emp.position || prev.position,
            category: emp.category || prev.category,
            appraiser: emp.supervisorId || prev.appraiser,
            supporter: emp.supporterId || prev.supporter,
            weightScheme: emp.evalModel || prev.weightScheme,
            evalPeriod: emp.evalPeriod || prev.evalPeriod
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch employee", err);
    }
  };

  // Calculate permissions based on role and status
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const isEmployee = user?.id === formData.employeeId;
  const isAppraiser = user?.id === formData.appraiser;
  const isSupporter = user?.id === formData.supporter;

  const canEditSelf = !isViewOnly && (isAdmin || (isEmployee && (formData.status === 'Draft' || formData.status === 'Self Evaluation Pending')));
  const canEditSuper = !isViewOnly && (isAdmin || (isAppraiser && formData.status === 'Waiting for Supervisor'));
  const canEditSupporter = !isViewOnly && (isAdmin || (isSupporter && formData.status === 'Waiting for Supporter'));
  const canEditMgmt = !isViewOnly && isAdmin; // Only admin for management/ASP score
  
  // Submit actions handling
  const nextStatus = (action: 'save' | 'submit') => {
    if (action === 'save') return formData.status;
    
    if (formData.status === 'Draft' || formData.status === 'Self Evaluation Pending') return 'Waiting for Supervisor';
    if (formData.status === 'Waiting for Supervisor') return showSupporter ? 'Waiting for Supporter' : 'Completed';
    if (formData.status === 'Waiting for Supporter') return 'Completed';
    return formData.status;
  };

  const handleActionSubmit = async (e: React.FormEvent, action: 'save' | 'submit') => {
    e.preventDefault();
    if (isViewOnly) return;
    
    setLoading(true);

    try {
      const targetStatus = nextStatus(action);
      const res = await fetch(editId ? `/api/evaluations/${editId}` : '/api/evaluations', {
        method: editId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          status: targetStatus,
          criteriaScores,
          peerFeedbacks,
          totalSelf,
          totalSuper,
          overallScore
        })
      });

      if (!res.ok) throw new Error('Failed to submit evaluation');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert('Error saving evaluation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => handleActionSubmit(e, 'submit');

  if (configLoading) return <div className="text-center p-12 text-slate-500 font-bold">Loading form configuration...</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-8 print:space-y-4 print:max-w-none">
      
      {/* Print Only Header */}
      <div className="hidden print:flex flex-col items-center justify-center mb-8 border-b border-slate-200 pb-6">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">របាយការណ៍វាយតម្លៃបុគ្គលិក</h1>
        <h2 className="text-lg font-bold text-slate-700 mb-2">Employee Performance Appraisal</h2>
        <div className="text-xs text-slate-500 font-medium">Performance Appraisal System • {format(new Date(), 'dd MMM yyyy')}</div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            {isViewOnly ? 'របាយការណ៍វាយតម្លៃ' : editId ? 'កែប្រែការវាយតម្លៃ' : 'ការវាយតម្លៃបុគ្គលិកថ្មី'}
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {isViewOnly ? 'View Evaluation Report' : editId ? 'Edit Performance Evaluation' : 'Create a New Performance Evaluation'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isViewOnly && (
            <button 
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm transition-colors active:scale-95"
            >
              <Printer size={18} />
              បោះពុម្ព / Print PDF
            </button>
          )}

          {!isViewOnly && (
            <>
              {formData.status !== 'Completed' && formData.status !== 'Approved' && (
                <button 
                  type="button"
                  onClick={(e) => handleActionSubmit(e, 'save')}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm transition-colors active:scale-95 disabled:opacity-50"
                >
                  រក្សាទុក / Save as Draft
                </button>
              )}
              <button 
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-colors active:scale-95 disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'កំពុងរក្សាទុក...' : 'បញ្ជូនបន្ត / Submit'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">ព័ត៌មានបុគ្គលិក<br/><span className="text-sm font-medium text-slate-500">Employee Information</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Input disabled={isViewOnly} label={<>លេខសម្គាល់បុគ្គលិក<br/><span className="text-[10px] font-normal">Employee ID (Staff ID)</span></>} value={formData.employeeId} onChange={v => setFormData({...formData, employeeId: v})} onBlur={() => fetchEmployeeData(formData.employeeId)} required />
            <Input disabled={isViewOnly} label={<>ឈ្មោះបុគ្គលិក<br/><span className="text-[10px] font-normal">Employee Name</span></>} value={formData.employeeName} onChange={v => setFormData({...formData, employeeName: v})} required />
            <Input disabled={isViewOnly} label={<>សាខា<br/><span className="text-[10px] font-normal">Campus</span></>} value={formData.campus} onChange={v => setFormData({...formData, campus: v})} required />
            <Input disabled={isViewOnly} label={<>ផ្នែក / នាយកដ្ឋាន<br/><span className="text-[10px] font-normal">Department</span></>} value={formData.department} onChange={v => setFormData({...formData, department: v})} required />
            <Input disabled={isViewOnly} label={<>តួនាទី<br/><span className="text-[10px] font-normal">Position</span></>} value={formData.position} onChange={v => setFormData({...formData, position: v})} required />
            <Input disabled={isViewOnly} label={<>ប្រភេទបុគ្គលិក<br/><span className="text-[10px] font-normal">Category</span></>} value={formData.category} onChange={v => setFormData({...formData, category: v})} />
            <Input disabled={isViewOnly} label={<>អ្នកវាយតម្លៃផ្ទាល់<br/><span className="text-[10px] font-normal">Direct Supervisor</span></>} value={formData.appraiser} onChange={v => setFormData({...formData, appraiser: v})} required />
            <Input disabled={isViewOnly} label={<>អ្នកគាំទ្រវាយតម្លៃ<br/><span className="text-[10px] font-normal">Supporter</span></>} value={formData.supporter} onChange={v => setFormData({...formData, supporter: v})} />
            <Input disabled={isViewOnly} label={<>វដ្តវាយតម្លៃ<br/><span className="text-[10px] font-normal">Evaluation Period</span></>} value={formData.evalPeriod} onChange={v => setFormData({...formData, evalPeriod: v})} />
            <Input disabled={isViewOnly} label={<>កាលបរិច្ឆេទត្រួតពិនិត្យ<br/><span className="text-[10px] font-normal">Review Date</span></>} type="date" value={formData.reviewDate} onChange={v => setFormData({...formData, reviewDate: v})} required />
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ប្រភេទការវាយតម្លៃ<br/><span className="text-[10px] font-normal">Evaluation Type</span></label>
              <select 
                disabled={isViewOnly || !!editId}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 outline-none transition-all disabled:opacity-75 disabled:bg-slate-100 disabled:dark:bg-slate-900"
                value={formData.evaluationType}
                onChange={e => setFormData({...formData, evaluationType: e.target.value})}
              >
                {config?.types.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">របៀបគណនាពិន្ទុ<br/><span className="text-[10px] font-normal">Weighting Scheme</span></label>
              <select 
                disabled={isViewOnly || !!editId}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 outline-none transition-all disabled:opacity-75 disabled:bg-slate-100 disabled:dark:bg-slate-900"
                value={formData.weightScheme}
                onChange={e => setFormData({...formData, weightScheme: e.target.value})}
              >
                {config?.weightingSchemes.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">ការវាយតម្លៃលើជំនាញវិជ្ជាជីវៈ<br/><span className="text-sm font-medium text-slate-500">Professional Skills Evaluation</span></h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wide text-xs">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">#</th>
                  <th className="px-6 py-4 min-w-[300px]">លក្ខណៈវាយតម្លៃ<br/><span className="text-[10px] font-normal">Criteria</span></th>
                  {showSelf && <th className="px-6 py-4 text-center w-36">ខ្លួនឯង<br/><span className="text-[10px] font-normal">Self</span></th>}
                  {showSuper && <th className="px-6 py-4 text-center w-36">អ្នកគ្រប់គ្រង<br/><span className="text-[10px] font-normal">Supervisor</span></th>}
                  {showSupporter && <th className="px-6 py-4 text-center w-36">អ្នកគាំទ្រ<br/><span className="text-[10px] font-normal">Supporter</span></th>}
                  {showManagement && <th className="px-6 py-4 text-center w-36">ថ្នាក់គ្រប់គ្រង<br/><span className="text-[10px] font-normal">Management</span></th>}
                  {showAsp && <th className="px-6 py-4 text-center w-36">គណៈអភិបាល<br/><span className="text-[10px] font-normal">ASP</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {currentCriteria.map((crit, i) => (
                  <tr key={crit.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-400 dark:text-slate-500 text-center">{crit.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-base">{crit.kh}</div>
                      <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5 mb-2">{crit.en}</div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium text-sm leading-relaxed">{crit.khDesc}</div>
                      <div className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-1 leading-relaxed">{crit.desc}</div>
                    </td>
                    {showSelf && (
                      <td className="px-6 py-3">
                        <input type="number" step="0.5" min="0" max={crit.max || 10} required
                          disabled={!canEditSelf}
                          className="w-full px-3 py-2 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-transparent disabled:border-transparent print:border-none print:p-0"
                          value={criteriaScores[i]?.selfScore ?? ''}
                          onChange={e => handleCriteriaChange(i, 'selfScore', e.target.value, crit.max)}
                        />
                      </td>
                    )}
                    {showSuper && (
                      <td className="px-6 py-3">
                        <input type="number" step="0.5" min="0" max={crit.max || 10} required
                          disabled={!canEditSuper}
                          className="w-full px-3 py-2 text-center rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/10 font-bold text-lg text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-transparent disabled:border-transparent print:border-none print:p-0"
                          value={criteriaScores[i]?.superScore ?? ''}
                          onChange={e => handleCriteriaChange(i, 'superScore', e.target.value, crit.max)}
                        />
                      </td>
                    )}
                    {showSupporter && (
                      <td className="px-6 py-3">
                        <input type="number" step="0.5" min="0" max={crit.max || 10} required
                          disabled={!canEditSupporter}
                          className="w-full px-3 py-2 text-center rounded-lg border border-teal-200 dark:border-teal-500/30 bg-teal-50/50 dark:bg-teal-500/10 font-bold text-lg text-teal-700 dark:text-teal-400 focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-transparent disabled:border-transparent print:border-none print:p-0"
                          value={criteriaScores[i]?.supporterScore ?? ''}
                          onChange={e => handleCriteriaChange(i, 'supporterScore', e.target.value, crit.max)}
                        />
                      </td>
                    )}
                    {showManagement && (
                      <td className="px-6 py-3">
                        <input type="number" step="0.5" min="0" max={crit.max || 10} required
                          disabled={!canEditMgmt}
                          className="w-full px-3 py-2 text-center rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/10 font-bold text-lg text-amber-700 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-transparent disabled:border-transparent print:border-none print:p-0"
                          value={criteriaScores[i]?.managementScore ?? ''}
                          onChange={e => handleCriteriaChange(i, 'managementScore', e.target.value, crit.max)}
                        />
                      </td>
                    )}
                    {showAsp && (
                      <td className="px-6 py-3">
                        <input type="number" step="0.5" min="0" max={crit.max || 10} required
                          disabled={!canEditMgmt}
                          className="w-full px-3 py-2 text-center rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/10 font-bold text-lg text-rose-700 dark:text-rose-400 focus:ring-2 focus:ring-rose-500 outline-none disabled:bg-transparent disabled:border-transparent print:border-none print:p-0"
                          value={criteriaScores[i]?.aspScore ?? ''}
                          onChange={e => handleCriteriaChange(i, 'aspScore', e.target.value, crit.max)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={2} className="px-6 py-4 font-extrabold text-slate-800 dark:text-slate-100 text-right uppercase tracking-widest text-xs">Total Scores / សរុប (Max {maxPossibleScore})</td>
                  {showSelf && <td className="px-6 py-4 text-center font-extrabold text-xl text-slate-700 dark:text-slate-300">{totalSelf.toFixed(1)}</td>}
                  {showSuper && <td className="px-6 py-4 text-center font-extrabold text-xl text-indigo-600 dark:text-indigo-400">{totalSuper.toFixed(1)}</td>}
                  {showSupporter && <td className="px-6 py-4 text-center font-extrabold text-xl text-teal-600 dark:text-teal-400">{totalSupporter.toFixed(1)}</td>}
                  {showManagement && <td className="px-6 py-4 text-center font-extrabold text-xl text-amber-600 dark:text-amber-400">{totalManagement.toFixed(1)}</td>}
                  {showAsp && <td className="px-6 py-4 text-center font-extrabold text-xl text-rose-600 dark:text-rose-400">{totalAsp.toFixed(1)}</td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 360 Peer Feedback Module */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">មតិយោបល់មិត្តរួមការងារ (៣៦០ ដឺក្រេ)<br/><span className="text-sm font-medium text-slate-500">360-Degree Peer Feedback</span></h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Optional. Adds weight to the overall score.</p>
            </div>
            {!isViewOnly && (
              <button type="button" onClick={addPeerFeedback} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl shadow-sm transition-colors print:hidden">
                <Plus size={16} /> បន្ថែមមតិយោបល់ / Add Feedback
              </button>
            )}
          </div>
          
          {peerFeedbacks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 font-medium border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
              មិនទាន់មានមតិយោបល់ទេ។<br/><span className="text-xs">No peer feedback added yet.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {peerFeedbacks.map((fb, i) => (
                <div key={i} className="flex gap-4 items-start p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm relative group hover:border-indigo-200 transition-all">
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input disabled={isViewOnly} label={<>ឈ្មោះមិត្តរួមការងារ<br/><span className="text-[10px] font-normal">Peer Name</span></>} value={fb.peerName} onChange={v => updatePeerFeedback(i, 'peerName', v)} required />
                      <Input disabled={isViewOnly} label={<>ពិន្ទុ (1-10)<br/><span className="text-[10px] font-normal">Rating (1-10)</span></>} type="number" value={fb.score.toString()} onChange={v => updatePeerFeedback(i, 'score', parseFloat(v))} required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">សង្ខេបមតិយោបល់<br/><span className="text-[10px] font-normal">Feedback Summary</span></label>
                      <textarea 
                        disabled={isViewOnly}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium disabled:opacity-75 disabled:bg-slate-100 disabled:dark:bg-slate-900 print:bg-transparent print:border-none print:p-0"
                        rows={2}
                        value={fb.feedback}
                        onChange={e => updatePeerFeedback(i, 'feedback', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  {!isViewOnly && (
                    <button type="button" onClick={() => removePeerFeedback(i)} className="p-2 text-slate-300 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors print:hidden">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden p-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">មតិយោបល់អ្នកវាយតម្លៃ<br/><span className="text-sm font-medium text-slate-500">Evaluator Comments</span></h2>
        <textarea 
          disabled={isViewOnly || (!canEditSuper && !canEditSupporter && !canEditMgmt)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium disabled:opacity-75 disabled:bg-slate-100 disabled:dark:bg-slate-900 print:bg-transparent print:border-none print:p-0"
          rows={4}
          value={formData.evaluatorComments}
          onChange={e => setFormData({...formData, evaluatorComments: e.target.value})}
          placeholder="បញ្ចូលមតិយោបល់របស់អ្នកវាយតម្លៃនៅទីនេះ... / Enter evaluator comments here..."
        />
      </div>

      <div className="bg-indigo-900 dark:bg-indigo-950 rounded-2xl shadow-xl p-8 flex flex-col sm:flex-row items-center justify-between text-white border border-indigo-800 dark:border-indigo-900 print:bg-transparent print:border-none print:shadow-none print:text-slate-900 print:p-0 print:border-t print:border-slate-300 print:rounded-none">
        <div>
          <div className="text-indigo-200 print:text-slate-500 font-bold uppercase tracking-wider text-xs mb-1">ពិន្ទុវាយតម្លៃចុងក្រោយ / Final Evaluation Rating</div>
          <div className="flex items-center gap-6">
            <div className="text-4xl font-extrabold">{overallScore.toFixed(1)} <span className="text-2xl text-indigo-400 dark:text-indigo-500 print:text-slate-500 font-medium">/ 100</span></div>
            <div className="hidden print:block h-12 w-px bg-slate-300"></div>
            <div className="hidden print:block text-left">
              <div className="text-xs text-slate-500 font-bold uppercase mb-1">ចំណាត់ថ្នាក់ / Grade</div>
              <div className="text-xl font-extrabold text-indigo-600">{getRating(overallScore).khLabel} ({getRating(overallScore).label})</div>
            </div>
          </div>
        </div>
        {!isViewOnly && (
          <div className="flex items-center gap-3 mt-6 sm:mt-0 print:hidden">
            {formData.status !== 'Completed' && formData.status !== 'Approved' && (
              <button 
                type="button"
                onClick={(e) => handleActionSubmit(e, 'save')}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl shadow-sm transition-colors active:scale-95 disabled:opacity-50"
              >
                រក្សាទុក / Draft
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading} 
              className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 font-extrabold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'កំពុងរក្សាទុក...' : 'បញ្ជូនបន្ត / Submit'}
            </button>
          </div>
        )}
      </div>

      {/* Print Signature Section */}
      <div className="hidden print:block mt-16 pt-8">
        <div className="mb-12">
          <span className="font-bold text-slate-700">ស្ថានភាពអនុម័ត / Approval Status:</span> 
          <span className={cn(
            "ml-2 font-bold px-3 py-1 rounded border",
            (formData.status === 'Approved' || formData.status === 'Completed') ? "text-emerald-600 border-emerald-600" : "text-amber-600 border-amber-600"
          )}>
            {STATUS_LABELS[formData.status]?.kh || formData.status} / {STATUS_LABELS[formData.status]?.label?.toUpperCase() || formData.status.toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <p className="font-bold text-sm mb-16">ហត្ថលេខាអ្នកវាយតម្លៃ / Appraiser</p>
            <div className="border-t border-slate-400 w-48 mx-auto"></div>
            <p className="mt-2 text-xs">កាលបរិច្ឆេទ / Date: ........................</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-sm mb-16">ហត្ថលេខាអ្នកត្រួតពិនិត្យ / Reviewer</p>
            <div className="border-t border-slate-400 w-48 mx-auto"></div>
            <p className="mt-2 text-xs">កាលបរិច្ឆេទ / Date: ........................</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-sm mb-16">ហត្ថលេខាអ្នកទទួល / Employee</p>
            <div className="border-t border-slate-400 w-48 mx-auto"></div>
            <p className="mt-2 text-xs">កាលបរិច្ឆេទ / Date: ........................</p>
          </div>
        </div>
      </div>
    </form>
  );
}

function getRating(score: number) {
  if (score >= 95) return { label: 'Outstanding', khLabel: 'ល្អប្រសើរបំផុត', bg: 'bg-emerald-50', text: 'text-emerald-700' };
  if (score >= 90) return { label: 'Good', khLabel: 'ល្អ', bg: 'bg-blue-50', text: 'text-blue-700' };
  if (score >= 70) return { label: 'Meets Exp.', khLabel: 'ល្អបង្គួរ', bg: 'bg-indigo-50', text: 'text-indigo-700' };
  if (score >= 60) return { label: 'Below Exp.', khLabel: 'មធ្យម', bg: 'bg-amber-50', text: 'text-amber-700' };
  return { label: 'Not Met', khLabel: 'ត្រូវកែលម្អ', bg: 'bg-red-50', text: 'text-red-700' };
}

function Input({ label, value, onChange, onBlur, type="text", required=false, disabled=false }: { label: React.ReactNode, value: string, onChange: (v: string) => void, onBlur?: () => void, type?: string, required?: boolean, disabled?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{label}</label>
      <input 
        type={type}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100 outline-none transition-all disabled:opacity-75 disabled:bg-slate-100 disabled:dark:bg-slate-900"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  )
}
