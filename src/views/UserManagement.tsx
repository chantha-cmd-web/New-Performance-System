import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User } from '../types';
import { Shield, ShieldAlert, User as UserIcon, Activity, Clock, X, Trash2, Edit2, Plus, Key } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function UserManagement() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    role: 'admin',
    password: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user?.role === 'superadmin') {
      fetchUsers();
      fetchLogs();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({ id: '', name: '', role: 'admin', password: '' });
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setModalMode('edit');
    setEditingUser(u);
    setFormData({ id: u.id, name: u.name, role: u.role, password: '' });
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (modalMode === 'add' && !formData.password) {
      setErrorMsg('Password is required for new users.');
      return;
    }

    try {
      const res = await fetch(`/api/users${modalMode === 'edit' ? `/${editingUser?.id}` : ''}`, {
        method: modalMode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setSuccessMsg(modalMode === 'edit' ? 'User updated successfully!' : 'User created successfully!');
        fetchUsers();
        fetchLogs();
        setTimeout(() => setShowModal(false), 1500);
      } else {
        setErrorMsg(data.error || 'Failed to save user');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers();
        fetchLogs();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('An error occurred');
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only Super Administrators can access this area.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          <UserIcon size={18} />
          User Accounts
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
        >
          <Activity size={18} />
          Audit Logs
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Administrator Accounts</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage system access and roles.</p>
            </div>
            <button onClick={handleOpenAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors text-sm">
              <Plus size={16} /> Add User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">User ID</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">Loading...</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <UserIcon size={16} />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">{u.id}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          u.role === 'superadmin' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                        }`}>
                          {u.role === 'superadmin' && <Shield size={12} />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => handleOpenEdit(u)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          {u.id !== user?.id && u.id !== 'superadmin' && (
                            <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Audit Logs</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track system activity, user actions, and modifications.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">Loading...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No audit logs found.</td></tr>
                ) : (
                  logs.slice(0, 50).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">{log.userName} <span className="text-slate-400 font-normal">({log.userId})</span></td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs border border-slate-200 dark:border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {modalMode === 'add' ? 'Add New User' : 'Edit User'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-500/20">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium border border-green-100 dark:border-green-500/20">
                  {successMsg}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">User ID / Username</label>
                <input 
                  type="text" 
                  required
                  disabled={modalMode === 'edit'}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 outline-none"
                  value={formData.id}
                  onChange={e => setFormData({...formData, id: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Role</label>
                <select 
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  disabled={editingUser?.id === 'superadmin'}
                >
                  <option value="admin">Administrator</option>
                  <option value="superadmin">Super Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {modalMode === 'add' ? 'Password' : 'New Password (leave blank to keep current)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key size={16} />
                  </div>
                  <input 
                    type="password" 
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-colors">
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
