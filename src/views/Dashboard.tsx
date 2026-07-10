import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Evaluation, STATUS_LABELS } from '../types';
import { Users, TrendingUp, Award, AlertTriangle, FileSpreadsheet, Printer, Download, BarChart2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import * as xlsx from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [evals, setEvals] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');

  useEffect(() => {
    fetchEvals();
  }, []);

  const fetchEvals = async () => {
    try {
      const res = await fetch('/api/evaluations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setEvals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
    }
    
    setTimeout(() => {
      window.print();
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
    }, 100);
  };

  const filteredEvals = evals.filter(e => {
    const matchesSearch = e.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || e.employeeId.includes(searchQuery);
    const matchesCampus = filterCampus ? e.campus === filterCampus : true;
    const matchesPeriod = filterPeriod ? e.reviewDate.startsWith(filterPeriod) : true;
    return matchesSearch && matchesCampus && matchesPeriod;
  });

  const campuses = Array.from(new Set(evals.map(e => e.campus)));
  const periods = Array.from(new Set(evals.map(e => e.reviewDate.substring(0, 7)))); // YYYY-MM

  const handleExportExcel = () => {
    const exportData = filteredEvals.map(e => {
      const rating = getRating(e.overallScore);
      const statusLabel = e.status ? (STATUS_LABELS[e.status]?.kh || e.status) : 'ព្រាង';
      return {
        'លេខសម្គាល់បុគ្គលិក / Employee ID': e.employeeId,
        'ឈ្មោះបុគ្គលិក / Employee Name': e.employeeName,
        'សាខា / Campus': e.campus,
        'តួនាទី / Position': e.position,
        'ប្រភេទការវាយតម្លៃ / Evaluation Type': e.evaluationType,
        'កាលបរិច្ឆេទ / Review Date': e.reviewDate,
        'ពិន្ទុខ្លួនឯង / Self Score': e.totalSelf,
        'អ្នកគ្រប់គ្រងវាយតម្លៃ / Supervisor Score': e.totalSuper,
        'ពិន្ទុសរុប / Final Score': e.overallScore.toFixed(1),
        'ចំណាត់ថ្នាក់ / Rating': `${rating.khLabel} (${rating.label})`,
        'មតិយោបល់ / Comments': e.evaluatorComments || '',
        'ស្ថានភាពអនុម័ត / Approval Status': statusLabel,
        'អ្នកវាយតម្លៃ / Evaluator': e.createdByName,
        'កាលបរិច្ឆេទបង្កើត / Created At': e.createdAt ? format(new Date(e.createdAt), 'yyyy-MM-dd HH:mm') : ''
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Evaluations');
    
    // Auto-size columns
    const wscols = Object.keys(exportData[0] || {}).map(key => ({ wch: Math.max(key.length, 20) }));
    worksheet['!cols'] = wscols;

    xlsx.writeFile(workbook, `Appraisal_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const avgScore = evals.length ? (evals.reduce((sum, e) => sum + e.overallScore, 0) / evals.length).toFixed(1) : '0.0';
  const topScore = evals.length ? Math.max(...evals.map(e => e.overallScore)).toFixed(1) : '0.0';
  const needsImprovement = evals.filter(e => e.overallScore < 70).length;

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <div className="hidden print:block mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">របាយការណ៍វាយតម្លៃបុគ្គលិកប្រចាំឆ្នាំ</h1>
        <h2 className="text-xl font-bold text-slate-700 mb-4">Annual Performance Evaluations</h2>
        <p className="text-sm text-slate-500">ថ្ងៃទីបញ្ចេញរបាយការណ៍ / Generated on: {format(new Date(), 'dd MMM yyyy, h:mm a')}</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 print:hidden">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'overview' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          <FileSpreadsheet size={18} />
          ទិដ្ឋភាពទូទៅ / Overview
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          <BarChart2 size={18} />
          វិភាគទិន្នន័យ / Analytics
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            <StatCard title="សរុប / Total Evaluated" value={evals.length.toString()} icon={<Users />} color="blue" />
            <StatCard title="ពិន្ទុមធ្យម / Average Score" value={avgScore} icon={<TrendingUp />} color="indigo" />
            <StatCard title="លទ្ធផលខ្ពស់បំផុត / Top Result" value={topScore} icon={<Award />} color="emerald" />
            <StatCard title="ត្រូវកែលម្អ / Needs Improvement" value={needsImprovement.toString()} icon={<AlertTriangle />} color="amber" />
          </div>

          {/* Reports Table */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <FileSpreadsheet size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">របាយការណ៍វាយតម្លៃ / Evaluation Reports</h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
                <select
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100"
                  value={filterCampus}
                  onChange={(e) => setFilterCampus(e.target.value)}
                >
                  <option value="">គ្រប់សាខា / All Campuses</option>
                  {campuses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900 dark:text-slate-100"
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                >
                  <option value="">គ្រប់ពេល / All Periods</option>
                  {periods.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                <input
                  type="text"
                  placeholder="ស្វែងរក / Search..."
                  className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
                >
                  <Printer size={18} />
                  <span className="hidden sm:inline">PDF</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">បុគ្គលិក<br/><span className="text-xs font-normal">Employee</span></th>
                    <th className="px-6 py-4">តួនាទី<br/><span className="text-xs font-normal">Position</span></th>
                    <th className="px-6 py-4">ប្រភេទ<br/><span className="text-xs font-normal">Type</span></th>
                    <th className="px-6 py-4">កាលបរិច្ឆេទ<br/><span className="text-xs font-normal">Date</span></th>
                    <th className="px-6 py-4 text-right">ពិន្ទុខ្លួនឯង<br/><span className="text-xs font-normal">Self</span></th>
                    <th className="px-6 py-4 text-right">អ្នកគ្រប់គ្រង<br/><span className="text-xs font-normal">Super</span></th>
                    <th className="px-6 py-4 text-right">ពិន្ទុសរុប<br/><span className="text-xs font-normal">Overall</span></th>
                    <th className="px-6 py-4 text-center">ចំណាត់ថ្នាក់<br/><span className="text-xs font-normal">Rating</span></th>
                    <th className="px-6 py-4 text-center">ស្ថានភាព<br/><span className="text-xs font-normal">Status</span></th>
                    {user?.role === 'superadmin' && <th className="px-6 py-4">អ្នកវាយតម្លៃ<br/><span className="text-xs font-normal">Evaluator</span></th>}
                    <th className="px-6 py-4 text-right print:hidden">សកម្មភាព<br/><span className="text-xs font-normal">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-bold">កំពុងផ្ទុកទិន្នន័យ... / Loading evaluations...</td>
                    </tr>
                  ) : filteredEvals.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-bold">រកមិនឃើញទិន្នន័យវាយតម្លៃទេ។ / No evaluations found.</td>
                    </tr>
                  ) : (
                    filteredEvals.map((evalRecord) => {
                      const rating = getRating(evalRecord.overallScore);
                      const statusDef = evalRecord.status ? STATUS_LABELS[evalRecord.status] : STATUS_LABELS['Draft'];
                      return (
                        <tr key={evalRecord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{evalRecord.employeeName}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide">{evalRecord.employeeId}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-700 dark:text-slate-300">{evalRecord.position}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{evalRecord.campus}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 capitalize">
                              {evalRecord.evaluationType || 'Management'}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium">{evalRecord.reviewDate}</td>
                          <td className="px-6 py-4 text-right font-medium">{evalRecord.totalSelf.toFixed(1)}</td>
                          <td className="px-6 py-4 text-right font-medium">{evalRecord.totalSuper.toFixed(1)}</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">{evalRecord.overallScore.toFixed(1)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap",
                              rating.bg, rating.text
                            )}>
                              {rating.khLabel}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">{rating.label}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {statusDef && (
                              <div className={cn("inline-flex flex-col items-center justify-center px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap text-center", statusDef.color)}>
                                <span>{statusDef.kh}</span>
                                <span className="text-[10px] opacity-80">{statusDef.label}</span>
                              </div>
                            )}
                          </td>
                          {user?.role === 'superadmin' && (
                            <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                              {evalRecord.createdByName}
                            </td>
                          )}
                          <td className="px-6 py-4 text-right print:hidden">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => {
                                navigate(`/evaluation?id=${evalRecord.id}&view=true`);
                              }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="View Report">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                              </button>
                              
                              {(user?.role === 'superadmin' || evalRecord.createdBy === user?.id) && (
                                <button onClick={() => {
                                  navigate(`/evaluation?id=${evalRecord.id}`);
                                }} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
                                </button>
                              )}
                              
                              {(user?.role === 'superadmin' || evalRecord.createdBy === user?.id) && (
                                <button onClick={async () => {
                                  if (window.confirm("Are you sure you want to delete this appraisal?")) {
                                    try {
                                      const res = await fetch(`/api/evaluations/${evalRecord.id}`, {
                                        method: 'DELETE',
                                        headers: { Authorization: `Bearer ${token}` }
                                      });
                                      if (res.ok) {
                                        fetchEvals();
                                      } else {
                                        const err = await res.json();
                                        alert(err.error);
                                      }
                                    } catch(e) { alert('Error deleting appraisal'); }
                                  }
                                }} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <AnalyticsDashboard evals={evals} />
      )}
    </div>
  );
}

function AnalyticsDashboard({ evals }: { evals: Evaluation[] }) {
  if (evals.length === 0) {
    return <div className="p-12 text-center text-slate-500 font-bold bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">មិនទាន់មានទិន្នន័យដើម្បីបង្ហាញ / No data available for analytics</div>;
  }

  // 1. Score by Department/Campus
  const campusScores = evals.reduce((acc, curr) => {
    if (!acc[curr.campus]) {
      acc[curr.campus] = { name: curr.campus, totalScore: 0, count: 0 };
    }
    acc[curr.campus].totalScore += curr.overallScore;
    acc[curr.campus].count += 1;
    return acc;
  }, {} as Record<string, { name: string, totalScore: number, count: number }>);
  
  const campusData = Object.values(campusScores).map(c => ({
    name: c.name,
    score: Number((c.totalScore / c.count).toFixed(1))
  }));

  // 2. Rating Distribution
  const ratingCounts = evals.reduce((acc, curr) => {
    const r = getRating(curr.overallScore).label;
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const COLORS = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'];
  const ratingData = Object.keys(ratingCounts).map((key) => ({
    name: key,
    value: ratingCounts[key]
  }));

  // 3. Top Performers
  const topPerformers = [...evals].sort((a, b) => b.overallScore - a.overallScore).slice(0, 5).map(e => ({
    name: e.employeeName,
    score: Number(e.overallScore.toFixed(1))
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Campus Performance */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">ពិន្ទុមធ្យមតាមសាខា</h3>
          <p className="text-sm text-slate-500 mb-6">Average Score by Campus</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campusData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} domain={[0, 100]} />
                <RechartsTooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} name="Average Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">បុគ្គលិកឆ្នើម</h3>
          <p className="text-sm text-slate-500 mb-6">Top Performers</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPerformers} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="score" fill="#10b981" radius={[0, 4, 4, 0]} name="Score" barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">របាយការណ៍ចំណាត់ថ្នាក់</h3>
          <p className="text-sm text-slate-500 mb-6">Performance Rating Distribution</p>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ratingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {ratingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: 'blue'|'indigo'|'emerald'|'amber' }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4">
      <div className={cn("p-3 rounded-xl", colors[color])}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">{title}</div>
        <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{value}</div>
      </div>
    </div>
  )
}

function getRating(score: number) {
  if (score >= 95) return { label: 'Outstanding', khLabel: 'ល្អប្រសើរបំផុត', bg: 'bg-emerald-50', text: 'text-emerald-700' };
  if (score >= 90) return { label: 'Good', khLabel: 'ល្អ', bg: 'bg-blue-50', text: 'text-blue-700' };
  if (score >= 70) return { label: 'Meets Exp.', khLabel: 'ល្អបង្គួរ', bg: 'bg-indigo-50', text: 'text-indigo-700' };
  if (score >= 60) return { label: 'Below Exp.', khLabel: 'មធ្យម', bg: 'bg-amber-50', text: 'text-amber-700' };
  return { label: 'Not Met', khLabel: 'ត្រូវកែលម្អ', bg: 'bg-red-50', text: 'text-red-700' };
}

