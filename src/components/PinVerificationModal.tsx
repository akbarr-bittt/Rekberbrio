import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PinPad from './PinPad';

interface PinVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  actionName?: string;
}

export default function PinVerificationModal({ isOpen, onClose, onSuccess, actionName = 'verifikasi transaksi' }: PinVerificationModalProps) {
  const { profile, platformSettings } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // If user doesn't have a PIN set, we should ideally prompt them to set one, 
  // but for now we'll just let them pass or show an error.
  // Let's assume they must have a PIN. If not, we let them pass for backward compatibility,
  // or we can force them to set it. Let's force them to set it.
  if (!profile?.pin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">PIN Belum Diatur</h3>
          <p className="text-gray-600 mb-6">Anda harus mengatur PIN keamanan di menu Profil sebelum dapat melakukan {actionName}.</p>
          <button 
            onClick={onClose}
            className="btn-primary w-full"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  const handleComplete = async (pin: string) => {
    if (isLocked) return;
    
    setIsLoading(true);
    
    // Simulate network delay for security feel
    setTimeout(async () => {
      if (pin === profile.pin) {
        setError(null);
        setAttempts(0);
        try {
          await onSuccess();
        } catch (err: any) {
          setError('Terjadi kesalahan sistem. Silakan coba lagi.');
          console.error(err);
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsLocked(true);
          setError('Terlalu banyak percobaan salah. Silakan coba lagi nanti.');
          // In a real app, we would log this to Firestore and lock the account temporarily
        } else {
          setError(`PIN salah. Sisa percobaan: ${3 - newAttempts}`);
        }
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="flex flex-col items-center w-full max-w-sm">
        <PinPad 
          title="Verifikasi PIN"
          subtitle={`Masukkan PIN Anda untuk ${actionName}`}
          onComplete={handleComplete}
          error={error}
          onClose={onClose}
          isLoading={isLoading || isLocked}
        />
        <button 
          onClick={() => alert(`Silakan hubungi admin di ${platformSettings?.adminPhone || 'WhatsApp'} atau email akbar.is.messi@gmail.com / ralif152007@gmail.com untuk mereset PIN Anda.`)}
          className="btn-tertiary text-white/80 text-sm mt-6 hover:text-white"
        >
          Lupa PIN?
        </button>
      </div>
    </div>
  );
}
