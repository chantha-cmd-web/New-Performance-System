import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  message: string;
  type: string;
  link: string;
}

export default function NotificationsBell() {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownToast, setHasShownToast] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          
          if (!hasShownToast && data.length > 0) {
            data.forEach((n: Notification) => {
              if (n.type === 'warning') toast.error(n.message, { icon: '⚠️' });
              else toast.success(n.message, { icon: '🔔' });
            });
            setHasShownToast(true);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [token, hasShownToast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Bell size={24} />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium text-sm">
                No new notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  onClick={() => {
                    navigate(n.link);
                    setIsOpen(false);
                  }}
                  className="p-4 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
