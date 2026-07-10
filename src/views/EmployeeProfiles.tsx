import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, Upload, Download, Trash2, Edit2, X, Check, AlertCircle, ChevronLeft, ChevronRight, Filter, Eye, UserCheck, UserX, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Employee, PaginatedResponse, ImportValidationResult } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function EmployeeProfiles() {
  const { token, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [formData, setFormData] = useState({
    id: '', name: '', khmerName: '', campus: '', department: '', position: '',
    category: '', supervisorId: '', supporterId: '', evalModel: '', evalPeriod: '',
    email: '', phone: '', hireDate: '', active: 1
  });

  const [importStep, setImportStep] = useState<'none' | 'upload' | 'preview' | 'complete'>('none');
  const [importData, setImportData] = useState<ImportValidationResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const [profileSettings, setProfileSettings] = useState<Record<string, string[]>>({
    campuses: [], departments: [], positions: [], categories: [], evalModels: [], evalPeriods: []
  });

  const [saveLoading, setSaveLoading] = useState(false);

  const fetchEmployees = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (searchTerm) params.set('search', searchTerm);
      if (filterCampus) params.set('campus', filterCampus);
      if (filterDepartment) params.set('department', filterDepartment);
      if (filterActive !== '') params.set('active', filterActive);

      const res = await fetch(`/api/employees?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: PaginatedResponse<Employee> = await res.json();
        setEmployees(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [token, searchTerm, filterCampus, filterDepartment, filterActive]);

  const fetchProfileSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/profile-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const grouped: Record<string, string[]> = { campuses: [], departments: [], positions: [], categories: [], evalModels: [], evalPeriods: [] };
        for (const item of data) {
          if (grouped[item.category]) grouped[item.category].push(item.value);
        }
        setProfileSettings(grouped);
      }
    } catch (err) {}
  }, [token]);

  useEffect(() => { fetchProfileSettings(); }, [fetchProfileSettings]);
  useEffect(() => { fetchEmployees(1); }, [fetchEmployees]);

  const handleSearch = () => { fetchEmployees(1); };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCampus('');
    setFilterDepartment('');
    setFilterActive('');
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({
      id: '', name: '', khmerName: '', campus: '', department: '', position: '',
      category: '', supervisorId: '', supporterId: '', evalModel: '', evalPeriod: '',
      email: '', phone: '', hireDate: '', active: 1
    });
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setModalMode('edit');
    setEditingId(emp.id);
    setFormData({
      id: emp.id, name: emp.name, khmerName: emp.khmerName || '', campus: emp.campus || '',
      department: emp.department || '', position: emp.position || '', category: emp.category || '',
      supervisorId: emp.supervisorId || '', supporterId: emp.supporterId || '',
      evalModel: emp.evalModel || '', evalPeriod: emp.evalPeriod || '',
      email: emp.email || '', phone: emp.phone || '', hireDate: emp.hireDate || '',
      active: emp.active ?? 1
    });
    setShowModal(true);
  };

  const viewDetail = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowDetail(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) {
      toast.error('Staff ID and Name are required');
      return;
    }
    setSaveLoading(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success(modalMode === 'add' ? 'Employee created' : 'Employee updated');
        setShowModal(false);
        fetchEmployees(pagination.page);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save');
      }
    } catch (err) {
      toast.error('Failed to save employee');
    } finally {
      setSaveLoading(false);
    }
  };

  const toggleActive = async (emp: Employee) => {
    try {
      const newActive = emp.active ? 0 : 1;
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...emp, active: newActive })
      });
      if (res.ok) {
        toast.success(newActive ? 'Employee activated' : 'Employee deactivated');
        fetchEmployees(pagination.page);
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this employee record? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Employee deleted');
        fetchEmployees(pagination.page);
      } else {
        toast.error('Failed to delete');
      }
    } catch (err) {
      toast.error('Failed to delete employee');
    }
  };

  const handleExport = () => {
    const data = employees.map(e => ({
      'Staff ID': e.id,
      'Employee Name': e.name,
      'Khmer Name': e.khmerName || '',
      'Campus': e.campus || '',
      'Department': e.department || '',
      'Position': e.position || '',
      'Category': e.category || '',
      'Direct Supervisor ID': e.supervisorId || '',
      'Supporter ID': e.supporterId || '',
      'Evaluation Model': e.evalModel || '',
      'Evaluation Period': e.evalPeriod || '',
      'Email': e.email || '',
      'Phone': e.phone || '',
      'Hire Date': e.hireDate || '',
      'Status': e.active ? 'Active' : 'Inactive'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, `employees_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const data = [{
      'Staff ID': 'EMP001',
      'Employee Name': 'John Doe',
      'Khmer Name': 'សុខ សាន្ត',
      'Campus': 'Main Campus',
      'Department': 'Information Technology',
      'Position': 'Developer',
      'Category': 'Full-time',
      'Direct Supervisor ID': 'SUP001',
      'Supporter ID': '',
      'Evaluation Model': 'campus_60_40',
      'Evaluation Period': 'Q3 2026',
      'Email': 'john@example.com',
      'Phone': '012345678',
      'Hire Date': '2024-01-15'
    }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "employee_import_template.xlsx");
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const res = await fetch('/api/employees/validate-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ records: data })
        });

        if (res.ok) {
          const result = await res.json();
          setImportData(result);
          setImportStep('preview');
        } else {
          toast.error('Validation failed');
          setImportStep('upload');
        }
      } catch (err) {
        toast.error('Failed to process file');
        setImportStep('upload');
      }
    };
    reader.readAsBinaryString(file);
    if (importFileInputRef.current) importFileInputRef.current.value = '';
  };

  const executeImport = async () => {
    if (!importData) return;
    setImporting(true);
    try {
      const res = await fetch('/api/employees/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ records: importData.validRecords })
      });
      if (res.ok) {
        setImportStep('complete');
        toast.success(`Import complete!`);
        fetchEmployees(1);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Import failed');
      }
    } catch (err) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Employee Profiles / <span className="font-medium text-lg text-slate-500">ប្រវត្តិរូបបុគ្គលិក</span></h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage {pagination.total} employee records</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-sm shadow-sm transition-all active:scale-95">
            <Download size={16} /> Export
          </button>
          {user?.role === 'superadmin' && (
            <>
              <button onClick={() => { setImportStep('upload'); setImportData(null); }} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 font-bold text-sm shadow-sm transition-all active:scale-95">
                <Upload size={16} /> Bulk Import
              </button>
              <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95">
                <Plus size={16} /> Add Employee
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by Staff ID, Name, Department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
          />
        </div>
        <select value={filterCampus} onChange={(e) => setFilterCampus(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Campuses</option>
          {profileSettings.campuses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Departments</option>
          {profileSettings.departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button onClick={handleSearch} className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"><Search size={18} /></button>
        {(searchTerm || filterCampus || filterDepartment || filterActive) && (
          <button onClick={clearFilters} className="p-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"><X size={18} /></button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-700 z-10">
              <tr>
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Staff ID / អត្តលេខ</th>
                <th className="px-4 py-3">Name / ឈ្មោះ</th>
                <th className="px-4 py-3 hidden md:table-cell">Campus / សាខា</th>
                <th className="px-4 py-3 hidden lg:table-cell">Department / ដេប៉ាតឺម៉ង់</th>
                <th className="px-4 py-3 hidden lg:table-cell">Position / តួនាទី</th>
                <th className="px-4 py-3 text-center w-20">Status / ស្ថានភាព</th>
                {user?.role === 'superadmin' && <th className="px-4 py-3 text-right w-32">Actions / សកម្មភាព</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 dark:text-slate-500 font-bold">កំពុងផ្ទុក... Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 dark:text-slate-500 font-bold">រកមិនឃើញបុគ្គលិកទេ / No employees found</td></tr>
              ) : (
                employees.map((emp, idx) => (
                  <tr key={emp.id} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer", !emp.active && "opacity-60")} onClick={() => viewDetail(emp)}>
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono">{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">{emp.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{emp.name}</div>
                      {emp.khmerName && <div className="text-xs text-slate-500 dark:text-slate-400">{emp.khmerName}</div>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{emp.campus || '-'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600 dark:text-slate-400">{emp.department || '-'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">{emp.position || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold", emp.active ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400')}>
                        {emp.active ? <UserCheck size={12} /> : <UserX size={12} />}
                        {emp.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {user?.role === 'superadmin' && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditModal(emp)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Edit"><Edit2 size={15} /></button>
                          <button onClick={() => toggleActive(emp)} className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors" title={emp.active ? 'Deactivate' : 'Activate'}>
                            {emp.active ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                          <button onClick={() => deleteEmployee(emp.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchEmployees(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, pagination.page - 2);
                const pageNum = start + i;
                if (pageNum > pagination.totalPages) return null;
                return (
                  <button key={pageNum} onClick={() => fetchEmployees(pageNum)}
                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                      pageNum === pagination.page ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    )}>{pageNum}</button>
                );
              })}
              <button onClick={() => fetchEmployees(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{modalMode === 'add' ? 'Add Employee / បន្ថែមបុគ្គលិក' : 'Edit Employee / កែប្រែបុគ្គលិក'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Staff ID * / អត្តលេខ</label>
                  <input type="text" required disabled={modalMode === 'edit'} value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Name * / ឈ្មោះ</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Khmer Name / ឈ្មោះជាភាសាខ្មែរ</label>
                  <input type="text" value={formData.khmerName} onChange={e => setFormData({...formData, khmerName: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Campus / សាខា</label>
                  <select value={formData.campus} onChange={e => setFormData({...formData, campus: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select...</option>
                    {profileSettings.campuses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Department / ដេប៉ាតឺម៉ង់</label>
                  <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select...</option>
                    {profileSettings.departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Position / តួនាទី</label>
                  <select value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select...</option>
                    {profileSettings.positions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category / ប្រភេទ</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select...</option>
                    {profileSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Direct Supervisor ID</label>
                  <input type="text" value={formData.supervisorId} onChange={e => setFormData({...formData, supervisorId: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Supporter ID</label>
                  <input type="text" value={formData.supporterId} onChange={e => setFormData({...formData, supporterId: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Evaluation Model</label>
                  <select value={formData.evalModel} onChange={e => setFormData({...formData, evalModel: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select...</option>
                    {profileSettings.evalModels.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Evaluation Period</label>
                  <select value={formData.evalPeriod} onChange={e => setFormData({...formData, evalPeriod: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select...</option>
                    {profileSettings.evalPeriods.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Hire Date</label>
                  <input type="date" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select value={formData.active} onChange={e => setFormData({...formData, active: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saveLoading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
                  {saveLoading ? 'Saving...' : modalMode === 'add' ? 'Create Employee' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {showDetail && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Employee Profile / ប្រវត្តិរូប</h2>
              <button onClick={() => setShowDetail(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl">
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedEmployee.name}</h3>
                  {selectedEmployee.khmerName && <p className="text-sm text-slate-500 dark:text-slate-400">{selectedEmployee.khmerName}</p>}
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-1", selectedEmployee.active ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400')}>
                    {selectedEmployee.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Staff ID:</span><br/><span className="text-slate-900 dark:text-slate-100 font-mono">{selectedEmployee.id}</span></div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Campus / សាខា:</span><br/>{selectedEmployee.campus || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Department / ដេប៉ាតឺម៉ង់:</span><br/>{selectedEmployee.department || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Position / តួនាទី:</span><br/>{selectedEmployee.position || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Category / ប្រភេទ:</span><br/>{selectedEmployee.category || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Supervisor ID:</span><br/>{selectedEmployee.supervisorId || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Supporter ID:</span><br/>{selectedEmployee.supporterId || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Eval Model:</span><br/>{selectedEmployee.evalModel || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Eval Period:</span><br/>{selectedEmployee.evalPeriod || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Email:</span><br/>{selectedEmployee.email || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Phone:</span><br/>{selectedEmployee.phone || '-'}</div>
                <div><span className="font-bold text-slate-500 dark:text-slate-400">Hire Date:</span><br/>{selectedEmployee.hireDate || '-'}</div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                {user?.role === 'superadmin' && (
                  <button onClick={() => { setShowDetail(false); openEditModal(selectedEmployee); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors">Edit</button>
                )}
                <button onClick={() => setShowDetail(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-sm transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {(importStep === 'upload' || importStep === 'preview' || importStep === 'complete') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setImportStep('none')}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {importStep === 'upload' ? 'Bulk Import Employees / នាំចូលបុគ្គលិកច្រើននាក់' :
                 importStep === 'preview' ? 'Preview Import / មើលជាមុន' : 'Import Complete / នាំចូលរួចរាល់'}
              </h2>
              <button onClick={() => setImportStep('none')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"><X size={20} /></button>
            </div>

            <div className="p-6">
              {importStep === 'upload' && (
                <div className="space-y-6">
                  <div className="p-6 bg-indigo-50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/20 text-center">
                    <FileSpreadsheet size={48} className="mx-auto text-indigo-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Import Employee Records</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Upload an Excel (.xlsx) or CSV file with employee data. Download the template first to ensure correct format.</p>
                    <div className="flex gap-4 justify-center">
                      <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                        <Download size={18} /> Download Template
                      </button>
                      <div className="relative">
                        <input type="file" accept=".xlsx,.xls,.csv" ref={importFileInputRef} onChange={handleImportFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                          <Upload size={18} /> Select File
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                    <p className="font-bold mb-1">Required columns:</p>
                    <code className="text-indigo-600 dark:text-indigo-400">Staff ID, Employee Name</code>
                    <p className="font-bold mt-2 mb-1">Optional columns:</p>
                    <code className="text-slate-600 dark:text-slate-300">Khmer Name, Campus, Department, Position, Category, Direct Supervisor ID, Supporter ID, Evaluation Model, Evaluation Period, Email, Phone, Hire Date</code>
                  </div>
                </div>
              )}

              {importStep === 'preview' && importData && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-center">
                      <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{importData.total}</div>
                      <div className="text-xs text-slate-500">Total Records</div>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-center">
                      <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{importData.valid}</div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">Valid</div>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl text-center">
                      <div className="text-2xl font-extrabold text-red-600 dark:text-red-400">{importData.errors}</div>
                      <div className="text-xs text-red-600 dark:text-red-400">Errors</div>
                    </div>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-center">
                      <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{importData.summary.creates}/{importData.summary.updates}</div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400">New/Update</div>
                    </div>
                  </div>

                  {importData.errors > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                      <h4 className="font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2"><AlertCircle size={16} /> Validation Errors</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importData.errorDetails.map((err, i) => (
                          <div key={i} className="text-xs text-red-600 dark:text-red-400"><strong>Row {err.row}:</strong> {err.message}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importData.validRecords.length > 0 && (
                    <div>
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">Preview (first {importData.validRecords.length} records)</h4>
                      <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">Action</th>
                              <th className="px-3 py-2 text-left">Staff ID</th>
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-left">Campus</th>
                              <th className="px-3 py-2 text-left">Department</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {importData.validRecords.slice(0, 20).map((r: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                                <td className="px-3 py-2"><span className={cn("px-1.5 py-0.5 rounded font-bold", r.action === 'create' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'text-amber-600 bg-amber-50 dark:bg-amber-500/10')}>{r.action}</span></td>
                                <td className="px-3 py-2 font-mono">{r.id}</td>
                                <td className="px-3 py-2">{r.name}</td>
                                <td className="px-3 py-2">{r.campus}</td>
                                <td className="px-3 py-2">{r.department}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={() => setImportStep('upload')} className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Back</button>
                    <button onClick={executeImport} disabled={importing || importData.validRecords.length === 0} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
                      {importing ? 'Importing...' : `Import ${importData.validRecords.length} Records`}
                    </button>
                  </div>
                </div>
              )}

              {importStep === 'complete' && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Check size={32} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Import Successful!</h3>
                  <p className="text-slate-500 dark:text-slate-400">Records have been imported successfully.</p>
                  <button onClick={() => setImportStep('none')} className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">Done</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
