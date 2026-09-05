import React, { useState, useRef, useEffect } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import api from '../services/api';
import { KeyRound, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

export const OtpVerificationModal = ({ ride, isOpen, onClose }) => {
  const { setActiveRide, addToast } = useCaptainAuth();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);

  const rideId = ride?.id || ride?._id;

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '']);
      setError('');
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen || !ride) return null;

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    setError('');

    if (value && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const otpValue = digits.join('');

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (otpValue.length !== 4) {
      setError('Please enter all 4 digits of the Ride OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Verify OTP
      const verifyRes = await api.post(`/rides/${rideId}/verify-otp`, { otp: otpValue });
      if (verifyRes.success) {
        // 2. Start Ride
        const startRes = await api.post(`/rides/${rideId}/start`);
        if (startRes.success) {
          setActiveRide((prev) => ({ ...prev, status: 'RIDE_STARTED', otpVerified: true }));
          addToast('✅ OTP Verified! Trip Started. Drive safely.', 'success');
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Incorrect OTP. Please check with customer.');
    } finally {
      setLoading(false);
    }
  };

  // Quick helper for test automation: fill ride OTP or master OTP "1234"
  const handleAutoFillOtp = () => {
    const testOtp = ride.otp ? String(ride.otp) : '1234';
    const arr = testOtp.split('').slice(0, 4);
    while (arr.length < 4) arr.push('0');
    setDigits(arr);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-sm bg-dark-800 border border-dark-600 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400">
            <KeyRound className="w-5 h-5" />
            <span className="font-extrabold text-sm uppercase tracking-wider">Ride OTP Verification</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-700 hover:bg-dark-600 text-slate-400 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center space-y-1">
          <h4 className="text-lg font-bold text-white">Ask Customer for 4-Digit OTP</h4>
          <p className="text-xs text-slate-400">
            The customer sees this 4-digit code in their KVN booking screen.
          </p>
        </div>

        {/* 4-Box Inputs */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex justify-center gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-14 h-16 text-center text-2xl font-black font-mono bg-dark-900 border-2 border-dark-600 rounded-2xl text-brand-400 focus:border-brand-500 focus:outline-none transition-all shadow-inner"
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Auto-Fill Demo OTP Pill */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleAutoFillOtp}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-700 hover:bg-dark-600 text-[11px] font-semibold text-slate-300 border border-dark-600"
            >
              <Sparkles className="w-3 h-3 text-brand-400" />
              <span>Auto-fill Customer OTP ({ride.otp || '1234'})</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || otpValue.length !== 4}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-dark-900 font-black text-sm tracking-wider uppercase transition-all shadow-glow-gold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5 text-dark-900" />
              <span>{loading ? 'VERIFYING...' : 'VERIFY & START TRIP'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpVerificationModal;
