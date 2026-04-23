import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PinPad from './PinPad';

interface AdminTriplePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminTriplePinModal({ isOpen, onClose, onSuccess }: AdminTriplePinModalProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastInteraction, setLastInteraction] = useState<number>(Date.now());
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setError(null);
      setAttempts(0);
    } else {
      setLastInteraction(Date.now());
    }
  }, [isOpen]);

  useEffect(() => {
    // Session timeout logic
    if (!isOpen || isLocked) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      if (step > 1 && now - lastInteraction > 30000) { // 30 seconds timeout
        setStep(1);
        setError('Sesi habis (30 detik). Silakan ulangi dari awal.');
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, step, lastInteraction, isLocked]);
  
  useEffect(() => {
    // Lock logic
    if (lockedUntil && Date.now() < lockedUntil) {
      const remainingMinutes = Math.ceil((lockedUntil - Date.now()) / 60000);
      setIsLocked(true);
      setError(`Terlalu banyak percobaan (5x). Akun admin terkunci untuk tindakan ini selama ${remainingMinutes} menit.`);
      
      const timeout = setTimeout(() => {
        setIsLocked(false);
        setLockedUntil(null);
        setError(null);
        setAttempts(0);
      }, lockedUntil - Date.now());
      
      return () => clearTimeout(timeout);
    }
  }, [lockedUntil]);

  const resetAll = useCallback(() => {
    setStep(1);
  }, []);

  if (!isOpen) return null;

  if (!profile?.pin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-2xl max-w-sm w-full text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">PIN Belum Diatur</h3>
          <p className="text-gray-600 mb-6">Anda harus mengatur PIN keamanan di menu Profil sebelum dapat melakukan konfirmasi top-up.</p>
          <button onClick={onClose} className="btn-primary w-full">Tutup</button>
        </div>
      </div>
    );
  }

  const handleComplete = async (pin: string) => {
    if (isLocked) return;
    
    setIsLoading(true);
    setLastInteraction(Date.now());
    setTimeout(async () => {
      if (pin === profile.pin) {
        setError(null);
        if (step === 1) {
          setStep(2);
        } else if (step === 2) {
          setStep(3);
        } else {
          // step 3 success
          setAttempts(0);
          setStep(1);
          try {
            await onSuccess();
          } catch (err: any) {
            setError('Terjadi kesalahan sistem admin.');
            console.error(err);
          }
        }
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          // Lock for 15 minutes
          const until = Date.now() + 15 * 60000;
          setLockedUntil(until);
          setIsLocked(true);
        } else {
          // Reset to step 1 if wrong on any step except 1
          if (step > 1) {
            setStep(1);
            setError(`PIN salah. Verifikasi diulang dari awal. Sisa percobaan: ${5 - newAttempts}`);
          } else {
            setError(`PIN salah. Sisa percobaan: ${5 - newAttempts}`);
          }
        }
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="flex flex-col items-center w-full max-w-sm">
        <PinPad 
          // @ts-ignore
          key={step} // Force re-render of PinPad on step change to clear its internal state
          title={`Verifikasi PIN Admin`}
          subtitle={`Masukkan PIN Admin (${step}/3)`}
          onComplete={handleComplete}
          error={error}
          onClose={onClose}
          isLoading={isLoading || isLocked}
        />
        {isLocked && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mt-4 max-w-sm text-center text-sm font-medium">
            Akses dikunci sementara karena percobaan gagal berulang kali.
          </div>
        )}
      </div>
    </div>
  );
}
