import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Menu, X, LayoutDashboard, FileEdit, Users, LogOut, Settings, Sun, Moon, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import NotificationsBell from './NotificationsBell';

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_state');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('sidebar_state', JSON.stringify(isOpen));
  }, [isOpen]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  if (!user) return null;

  return (
    <div className="flex h-screen print:h-auto bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden print:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isOpen ? 280 : 0,
          opacity: isOpen ? 1 : 0
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 text-white shadow-xl transition-transform lg:static lg:translate-x-0 overflow-hidden print:hidden",
          !isOpen && "-translate-x-full lg:-translate-x-0"
        )}
      >
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20">
              <span className="font-bold text-white">AP</span>
            </div>
            <div className={cn("flex flex-col whitespace-nowrap", !isOpen && "hidden")}>
              <span className="font-bold tracking-tight">Performance</span>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">System</span>
            </div>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )
            }
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink
            to="/evaluation"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
              )
            }
          >
            <FileEdit size={20} />
            <span>New Evaluation</span>
          </NavLink>

          {user.role === 'superadmin' && (
            <>
              <NavLink
                to="/employees"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                    isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <div className="flex items-center justify-center relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span>Employee Profiles</span>
              </NavLink>

              <NavLink
                to="/users"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                    isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <Users size={20} />
                <span>Manage Users</span>
              </NavLink>
              
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                    isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <Settings size={20} />
                <span>Criteria & Evaluators</span>
              </NavLink>

              <NavLink
                to="/self-eval-settings"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                    isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <FileEdit size={20} />
                <span>Self Evaluation</span>
              </NavLink>
              
              <NavLink
                to="/data-management"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                    isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <div className="flex items-center justify-center relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>
                </div>
                <span>Data Management</span>
              </NavLink>

              <NavLink
                to="/audit-logs"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap",
                    isActive ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <div className="flex items-center justify-center relative">
                  <span className="absolute w-2 h-2 rounded-full bg-red-500 -top-1 -right-1 animate-pulse"></span>
                  <ShieldAlert size={20} />
                </div>
                <span>Audit Logs</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl mb-2 whitespace-nowrap">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs uppercase">
              {user.name.slice(0, 2)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-bold">{user.name}</span>
              <span className="truncate text-xs font-medium text-slate-400 capitalize">{user.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400 whitespace-nowrap"
          >
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible relative">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-6 z-10 sticky top-0 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Menu size={20} />
            </button>
            <div className="font-bold text-slate-800 dark:text-slate-100 tracking-tight">Annual Performance Dashboard <span className="font-medium text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline-block">/ ប្រព័ន្ធគ្រប់គ្រងការវាយតម្លៃបុគ្គលិក</span></div>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationsBell />
            <button
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto print:overflow-visible p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
