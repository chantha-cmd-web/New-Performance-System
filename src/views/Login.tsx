import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogIn, User, Lock, Loader2, Moon, Sun } from 'lucide-react';
import React from 'react';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-1000 ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
      
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className={`absolute top-6 right-6 z-20 p-3 rounded-2xl backdrop-blur-xl border transition-all ${
          isDark 
            ? 'bg-white/10 border-white/20 text-slate-300 hover:text-white hover:bg-white/20' 
            : 'bg-white/50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white/80'
        }`}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Aurora Background */}
      <div className="absolute inset-0 z-0 opacity-80">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], x: [0, 100, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500 rounded-full mix-blend-multiply filter blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3], x: [0, -100, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500 rounded-full mix-blend-multiply filter blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2], y: [0, -100, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-pink-500 rounded-full mix-blend-multiply filter blur-[100px] -translate-x-1/2"
        />
      </div>

      {/* Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        className={`relative z-10 w-full max-w-[420px] p-10 backdrop-blur-2xl border shadow-2xl rounded-3xl overflow-hidden transition-colors duration-1000 ${
          isDark 
            ? 'bg-white/10 border-white/20 shadow-indigo-500/10' 
            : 'bg-white/60 border-white/50 shadow-slate-200/50'
        }`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${isDark ? 'from-white/10 to-transparent' : 'from-white/50 to-white/10'}`} />
        
        <div className="text-center mb-10 relative z-10">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30">
            <LogIn className="w-7 h-7 text-white" />
          </div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Performance System</h1>
          <p className={`font-medium mt-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>User ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className={`h-5 w-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <input
                type="text"
                required
                className={`block w-full pl-11 pr-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-white/5 border-white/10 text-white placeholder-slate-400' 
                    : 'bg-white/80 border-slate-200 text-slate-900 placeholder-slate-500'
                }`}
                placeholder="Enter User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className={`h-5 w-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>
              <input
                type="password"
                required
                className={`block w-full pl-11 pr-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-white/5 border-white/10 text-white placeholder-slate-400' 
                    : 'bg-white/80 border-slate-200 text-slate-900 placeholder-slate-500'
                }`}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm font-bold text-center bg-red-50/50 py-2 rounded-xl"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-indigo-500/30 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
