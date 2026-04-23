import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { X, CheckCircle2 } from 'lucide-react';
import PinPad from './PinPad';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 1. Edit Profile Modal
export function EditProfileModal({ isOpen, onClose }: ModalProps) {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setBio(profile.bio || '');
      setBankName(profile.bankName || '');
      setBankAccount(profile.bankAccount || '');
      setBankAccountName(profile.bankAccountName || '');
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        bankName: bankName.trim(),
        bankAccount: bankAccount.trim(),
        bankAccountName: bankAccountName.trim()
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan profil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative border border-divider max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-gray-900">Edit Profil</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informasi Pribadi</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pencil focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Masukkan nama Anda"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pencil focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Contoh: 08123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Biodata Singkat</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pencil focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
                placeholder="Ceritakan sedikit tentang diri Anda"
                maxLength={500}
              />
            </div>
          </div>

          {/* Bank Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informasi Rekening (Pencairan)</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pencil focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Contoh: BCA, Mandiri, BNI"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Rekening</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 rounded-xl border border-pencil focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Masukkan nomor rekening"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pemilik Rekening</label>
              <input
                type="text"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-pencil focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Sesuai buku tabungan"
              />
            </div>
          </div>

          <button 
            disabled={loading || !name.trim()} 
            className="btn-primary w-full mt-4"
          >
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </div>
  );
}

// 2. Security Modal (PIN)
export function SecurityModal({ isOpen, onClose }: ModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleComplete = async (newPin: string) => {
    if (!user || newPin.length !== 6) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { pin: newPin });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      {success ? (
        <div className="bg-white rounded-2xl p-6 w-full max-w-md relative border border-divider">
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-lg font-bold text-gray-900">PIN Berhasil Disimpan</h3>
          </div>
        </div>
      ) : (
        <PinPad 
          title={profile?.pin ? "Ubah PIN" : "Buat PIN Baru"}
          subtitle="Masukkan 6 digit angka untuk keamanan akun Anda"
          onComplete={handleComplete}
          onClose={onClose}
          isLoading={loading}
        />
      )}
    </div>
  );
}

// 3. Settings Modal
export function SettingsModal({ isOpen, onClose }: ModalProps) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotifications(profile?.notificationsEnabled ?? true);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleToggle = async () => {
    if (!user) return;
    const newValue = !notifications;
    setNotifications(newValue);
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { notificationsEnabled: newValue });
    } catch (error) {
      console.error(error);
      setNotifications(!newValue); // revert
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative border border-divider max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold mb-6 text-gray-900">Pengaturan</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Notifikasi Push</h4>
              <p className="text-sm text-gray-500">Terima update transaksi</p>
            </div>
            <button 
              onClick={handleToggle}
              disabled={loading}
              className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notifications ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
