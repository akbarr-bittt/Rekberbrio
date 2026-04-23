import React, { useState, useEffect } from 'react';
import { Delete, X } from 'lucide-react';

interface PinPadProps {
  title?: string;
  subtitle?: string;
  onComplete: (pin: string) => void;
  error?: string | null;
  onClose?: () => void;
  showClose?: boolean;
  isLoading?: boolean;
}

export default function PinPad({ 
  title = 'Masukkan PIN', 
  subtitle = 'Masukkan 6 digit PIN keamanan Anda', 
  onComplete, 
  error, 
  onClose,
  showClose = true,
  isLoading = false
}: PinPadProps) {
  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (error) {
      setIsShaking(true);
      setPin('');
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLoading) return;

      if (e.key >= '0' && e.key <= '9') {
        const num = parseInt(e.key);
        if (pin.length < 6) {
          const newPin = pin + num;
          setPin(newPin);
          if (newPin.length === 6) {
            onComplete(newPin);
          }
        }
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        if (pin.length === 6) {
          onComplete(pin);
        }
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isLoading, onComplete, onClose]);

  const handleNumberClick = (num: number) => {
    if (pin.length < 6 && !isLoading) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6) {
        onComplete(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !isLoading) {
      setPin(pin.slice(0, -1));
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col items-center w-full max-w-sm mx-auto p-6 bg-white rounded-3xl border border-divider relative focus:outline-none"
      tabIndex={0}
      onPaste={(e) => e.preventDefault()}
    >
      {showClose && onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      )}
      
      <div className="text-center mb-8 mt-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      {/* PIN Indicators */}
      <div className={`flex gap-2 sm:gap-3 mb-8 ${isShaking ? 'animate-shake' : ''}`}>
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className={`w-8 h-10 sm:w-10 sm:h-12 rounded-xl border-2 flex items-center justify-center transition-all duration-200 text-lg md:text-xl font-bold ${
              i < pin.length 
                ? 'border-blue-600 bg-blue-50 text-blue-600' 
                : 'border-gray-200 bg-gray-50 text-transparent'
            } ${error ? 'border-red-500 bg-red-50 text-red-500' : ''}`}
          >
            {i < pin.length ? '●' : ''}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-xs md:text-sm mb-4 font-bold animate-fade-in text-center px-4">
          {error}
        </p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            disabled={isLoading}
            className="h-14 sm:h-16 rounded-2xl bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-xl sm:text-2xl font-black text-gray-900 transition-colors flex items-center justify-center disabled:opacity-50 shadow-sm"
          >
            {num}
          </button>
        ))}
        <div className="h-14 sm:h-16"></div> {/* Empty space */}
        <button
          onClick={() => handleNumberClick(0)}
          disabled={isLoading}
          className="h-14 sm:h-16 rounded-2xl bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-xl sm:text-2xl font-black text-gray-900 transition-colors flex items-center justify-center disabled:opacity-50 shadow-sm"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          disabled={isLoading || pin.length === 0}
          className="h-14 sm:h-16 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center justify-center disabled:opacity-50 shadow-sm"
        >
          <Delete className="w-5 h-5 sm:w-6 h-6" />
        </button>
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 rounded-3xl flex items-center justify-center backdrop-blur-sm">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
}
