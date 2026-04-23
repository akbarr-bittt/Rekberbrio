import React, { useState, useEffect } from 'react';
import { doc, updateDoc, increment, collection, addDoc, Timestamp, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { X, Copy, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import PinVerificationModal from './PinVerificationModal';
import { formatCurrency } from '../lib/utils';
import { useNotifications } from '../contexts/NotificationContext';

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BalanceModal({ isOpen, onClose }: BalanceModalProps) {
  const { user, profile, systemStatus } = useAuth();
  const { sendNotification } = useNotifications();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  if (!isOpen) return null;

  const handleConfirmClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (systemStatus === 'OFFLINE') return;
    const numAmount = parseInt(amount.replace(/\D/g, '')) || 0;
    if (numAmount <= 0 || !user) return;

    if ((profile?.balance || 0) < numAmount) {
      setError('Saldo tidak mencukupi');
      return;
    }
    
    setShowPinModal(true);
  };

  const executeTransaction = async () => {
    const numAmount = parseInt(amount.replace(/\D/g, '')) || 0;
    if (numAmount <= 0 || !user) return;

    setLoading(true);
    setError('');
    setShowPinModal(false);
    
    try {
      if (!profile?.bankName || !profile?.bankAccount || !profile?.bankAccountName) {
         setError('Silakan lengkapi data rekening bank di profil Anda terlebih dahulu.');
         setLoading(false);
         return;
      }
      
      await addDoc(collection(db, 'withdrawals'), {
        userId: user.uid,
        userName: profile?.name || 'User',
        amount: numAmount,
        status: 'PENDING',
        bankName: profile.bankName,
        bankAccount: profile.bankAccount,
        bankAccountName: profile.bankAccountName,
        createdAt: Timestamp.now()
      });

      // Notify Admin
      await sendNotification({
        userId: user.uid,
        roleTarget: 'admin',
        type: 'withdraw',
        priority: 'high',
        title: 'Permintaan Tarik Dana',
        message: `${profile?.name || 'User'} meminta penarikan dana sebesar ${formatCurrency(numAmount)}`,
        link: '/admin'
      });

      alert('Permintaan tarik dana berhasil dibuat.');
      onClose();
      setAmount('');
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md relative border border-divider shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-900">Tarik Dana</h2>
        
        <form onSubmit={handleConfirmClick} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                setError('');
                const val = e.target.value.replace(/\D/g, '');
                setAmount(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
              }}
              className="w-full px-4 py-3 rounded-xl border border-divider focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0"
            />
            <div className="mt-2 flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>Saldo Tersedia:</span>
              <span className="text-gray-900">{formatCurrency(profile?.balance || 0)}</span>
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          <button 
            disabled={loading || !amount || systemStatus === 'OFFLINE'} 
            className="btn-primary w-full"
          >
            {systemStatus === 'OFFLINE' ? 'Platform Offline' : (loading ? 'Memproses...' : 'Konfirmasi')}
          </button>
        </form>
      </div>

      <PinVerificationModal 
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={executeTransaction}
        actionName={'penarikan dana'}
      />
    </div>
  );
}
