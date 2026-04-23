import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'withdraw' | 'transaction' | 'dispute' | 'system';
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  userId: string;
  roleTarget: 'user' | 'admin';
  title: string;
  message: string;
  status: 'unread' | 'read';
  link?: string;
  createdAt: Timestamp;
}

interface NotificationContextType {
  notifications: AppNotification[];
  adminAlerts: AppNotification[];
  unreadCount: number;
  unreadAdminCount: number;
  sendNotification: (params: Omit<AppNotification, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (isAdminOnly?: boolean) => Promise<void>;
  requestPushPermissions: () => Promise<void>;
  stopSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [adminAlerts, setAdminAlerts] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadAdminCount, setUnreadAdminCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoad = useRef(true);

  // Initialize audio for admin
  useEffect(() => {
    if (isAdmin) {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audioRef.current.loop = true;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isAdmin]);

  // Stop sound when clicking anywhere or opening notification center
  const stopSound = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setAdminAlerts([]);
      setUnreadCount(0);
      setUnreadAdminCount(0);
      return;
    }

    // General notifications: specifically for this user
    const qGeneral = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubGeneral = onSnapshot(qGeneral, (snapshot) => {
      const newNotifs: AppNotification[] = [];
      let unread = 0;

      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as Omit<AppNotification, 'id'>;
        if (change.type === 'added' && !isFirstLoad.current && data.roleTarget === 'user' && data.status === 'unread') {
          setToasts(prev => [...prev, { id: change.doc.id, ...data } as AppNotification]);
        }
        if (change.type === 'modified' && data.status === 'read') {
          setToasts(prev => prev.filter(t => t.id !== change.doc.id));
        }
      });

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as AppNotification;
        // Only include in general list if targeted to user
        if (data.roleTarget === 'user') {
          newNotifs.push({ ...data, id: doc.id });
          if (data.status === 'unread') unread++;
        }
      });

      setNotifications(newNotifs);
      setUnreadCount(unread);
    }, (error) => {
      console.log('General notification error:', error);
    });

    // Admin Alerts: specifically for admin role
    let unsubAdmin = () => {};
    if (user && isAdmin) {
      const qAdmin = query(
        collection(db, 'notifications'),
        where('roleTarget', '==', 'admin'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      unsubAdmin = onSnapshot(qAdmin, (snapshot) => {
        const newAlerts: AppNotification[] = [];
        let unread = 0;
        let hasNewAlert = false;

        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data() as Omit<AppNotification, 'id'>;
          if (change.type === 'added' && !isFirstLoad.current && data.status === 'unread') {
            setToasts(prev => [...prev, { id: change.doc.id, ...data } as AppNotification]);
            hasNewAlert = true;
          }
          if (change.type === 'modified' && data.status === 'read') {
            setToasts(prev => prev.filter(t => t.id !== change.doc.id));
          }
        });

        snapshot.docs.forEach((doc) => {
          const data = doc.data() as AppNotification;
          newAlerts.push({ ...data, id: doc.id });
          if (data.status === 'unread') unread++;
        });

        setAdminAlerts(newAlerts);
        setUnreadAdminCount(unread);

        if (unread === 0) {
          stopSound();
        } else if (hasNewAlert && audioRef.current) {
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
      }, (error) => {
        console.log('Admin notification error:', error);
      });
    } else {
      setAdminAlerts([]);
      setUnreadAdminCount(0);
      stopSound();
    }

    // Reset first load after a small delay to prevent initial toasts
    setTimeout(() => {
      isFirstLoad.current = false;
    }, 1000);

    return () => {
      unsubGeneral();
      unsubAdmin();
    };
  }, [user, isAdmin]);

  const sendNotification = async (params: Omit<AppNotification, 'id' | 'createdAt' | 'status'>) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        ...params,
        status: 'unread',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { status: 'read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (isAdminOnly?: boolean) => {
    try {
      const batch = writeBatch(db);
      const targetList = isAdminOnly ? adminAlerts : notifications;
      
      targetList.filter(n => n.status === 'unread').forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { status: 'read' });
      });
      await batch.commit();
      if (isAdminOnly) stopSound();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const requestPushPermissions = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      adminAlerts,
      unreadCount,
      unreadAdminCount,
      sendNotification,
      markAsRead,
      markAllAsRead,
      requestPushPermissions,
      stopSound
    }}>
      {children}
      
      {/* Toast Overlay */}
      <div className="fixed top-[70px] md:top-[80px] right-4 z-[100] flex flex-col gap-2 pointer-events-none items-end max-h-[80vh] overflow-y-auto custom-scrollbar pr-1">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isAlert = toast.roleTarget === 'admin';
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={cn(
                  "rounded-2xl p-4 shadow-2xl border flex items-start gap-3 w-80 pointer-events-auto cursor-pointer hover:shadow-xl transition-shadow",
                  isAlert 
                    ? "bg-red-50 border-red-200 text-red-900 ring-4 ring-red-500/10" 
                    : "bg-white border-divider text-gray-900"
                )}
                onMouseEnter={() => isAlert && stopSound()}
                onClick={() => {
                  markAsRead(toast.id);
                  if (toast.link) {
                    window.location.href = toast.link;
                  }
                }}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  toast.type === 'withdraw' ? "bg-orange-100 text-orange-600" :
                  toast.type === 'transaction' ? "bg-blue-100 text-blue-600" :
                  toast.type === 'dispute' ? "bg-red-100 text-red-600" :
                  "bg-gray-100 text-gray-600"
                )}>
                  {toast.type === 'withdraw' ? <Info className="w-5 h-5" /> :
                   toast.type === 'dispute' ? <ShieldAlert className="w-5 h-5" /> :
                   <Bell className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded",
                      isAlert ? "bg-red-600 text-white" : "bg-blue-100 text-blue-600"
                    )}>
                      {isAlert ? "Admin Alert" : "Notifikasi"}
                    </span>
                    <p className="font-bold text-sm truncate">{toast.title}</p>
                  </div>
                  <p className="text-xs opacity-70 line-clamp-2">{toast.message}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                  className="p-1 hover:bg-black/5 rounded-lg transition-colors relative z-10"
                >
                  <X className="w-4 h-4 opacity-50" />
                </button>
                
                {/* Auto close only for general notifications */}
                {!isAlert && <ToastAutoClose id={toast.id} onExpire={removeToast} duration={5000} />}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

function ToastAutoClose({ id, onExpire, duration }: { id: string, onExpire: (id: string) => void, duration: number }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onExpire(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, onExpire, duration]);
  return null;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

function ShieldAlert(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}
