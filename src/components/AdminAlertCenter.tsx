import React, { useState, useRef, useEffect } from 'react';
import { useNotifications, AppNotification } from '../contexts/NotificationContext';
import { ShieldAlert, CheckCircle2, Info, X, Clock, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function AdminAlertCenter() {
  const { adminAlerts, unreadAdminCount, markAsRead, markAllAsRead, stopSound } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: AppNotification) => {
    await markAsRead(notif.id);
    setIsOpen(false);
    stopSound();
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'withdraw': return <Info className="w-4 h-4 text-white" />;
      case 'transaction': return <Clock className="w-4 h-4 text-white" />;
      case 'dispute': return <ShieldAlert className="w-4 h-4 text-white" />;
      default: return <ShieldAlert className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-3 rounded-2xl transition-all flex items-center gap-2 group",
          unreadAdminCount > 0 
            ? "bg-red-600 text-white shadow-lg shadow-red-200 animate-pulse" 
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        )}
      >
        <ShieldAlert className="w-5 h-5" />
        <span className="font-black text-[10px] uppercase tracking-widest hidden sm:inline">Panel Alert</span>
        {unreadAdminCount > 0 && (
          <span className="w-5 h-5 bg-white text-red-600 text-[10px] font-black rounded-full flex items-center justify-center">
            {unreadAdminCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed md:absolute right-4 md:right-0 top-[70px] md:top-auto md:mt-2 w-[calc(100vw-32px)] md:w-[400px] bg-white border-2 border-red-100 rounded-3xl shadow-2xl z-[80] overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-5 border-b border-red-50 flex items-center justify-between bg-red-50/50">
              <div className="flex items-center gap-2 text-red-600">
                <h3 className="font-black text-xs uppercase tracking-widest leading-none">Alert Sistem Kritis</h3>
              </div>
              <div className="flex items-center gap-3">
                {unreadAdminCount > 0 && (
                  <button 
                    onClick={() => markAllAsRead(true)}
                    className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline"
                  >
                    Hapus Semua
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {adminAlerts.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-divider">
                    <ShieldAlert className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">Antrian bersih. Tidak ada alert admin.</p>
                </div>
              ) : (
                <div className="divide-y divide-red-50 text-left">
                  {adminAlerts.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        "p-5 hover:bg-red-50/30 transition-colors cursor-pointer relative group",
                        notif.status === 'unread' ? 'bg-red-50/20' : ''
                      )}
                    >
                      <div className="flex gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                          notif.type === 'withdraw' ? 'bg-orange-600' :
                          notif.type === 'transaction' ? 'bg-blue-600' :
                          notif.type === 'dispute' ? 'bg-red-600' : 'bg-gray-600'
                        )}>
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <p className={cn(
                              "text-sm leading-tight uppercase font-black tracking-tight",
                              notif.status === 'unread' ? 'text-red-900' : 'text-gray-600'
                            )}>
                              {notif.title}
                            </p>
                            {notif.status === 'unread' && (
                              <div className="w-2.5 h-2.5 bg-red-600 rounded-full shrink-0 ring-4 ring-red-100"></div>
                            )}
                          </div>
                          <p className="text-[13px] text-gray-600 font-medium mb-2">{notif.message}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                              {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: localeID })}
                            </p>
                            <div className="flex items-center gap-1 text-red-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                              Detail <ExternalLink className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-red-50 bg-red-50/20">
               <button 
                 onClick={() => setIsOpen(false)}
                 className="w-full py-2 bg-white border border-red-200 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-[0.2em] hover:bg-red-50 transition-colors shadow-sm"
               >
                 Tutup Panel
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
