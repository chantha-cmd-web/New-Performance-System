import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, Search, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function AuditLogs() {
  const { token, user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'superadmin') {
    return <div className="p-12 text-center text-red-500 font-bold">Access Denied. Admins only.</div>;
  }

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">កំណត់ហេតុសកម្មភាព</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">System Audit Logs (HR Administrator)</p>
        </div>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50"
        >
          <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
              <ShieldAlert size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">សកម្មភាពប្រព័ន្ធ / System Actions</h2>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="ស្វែងរក / Search..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">No audit logs found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 sticky top-0 uppercase tracking-wide text-xs z-10">
                <tr>
                  <th className="px-6 py-4">កាលបរិច្ឆេទ<br/><span className="text-[10px] font-normal">Timestamp</span></th>
                  <th className="px-6 py-4">អ្នកប្រើប្រាស់<br/><span className="text-[10px] font-normal">User</span></th>
                  <th className="px-6 py-4">សកម្មភាព<br/><span className="text-[10px] font-normal">Action</span></th>
                  <th className="px-6 py-4">ព័ត៌មានលម្អិត<br/><span className="text-[10px] font-normal">Details</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{log.userName}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs">{log.userId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
