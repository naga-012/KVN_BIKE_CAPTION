import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Smartphone,
  Mail,
  Lock,
  User,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

export const CustomerAuthPage = () => {
  const { login, register, loginWithOtp, loading } = useAuth();
  const { addToast } = useToast();

  // Mode: 'LOGIN' | 'REGISTER' | 'OTP'
  const [mode, setMode] = useState('LOGIN');

  // Input states - initialized completely empty (no prefilled mock details)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (mode === 'LOGIN') {
        if (!identifier.trim() || !password) {
          addToast('Please enter your mobile number or email and password', 'error');
          return;
        }
        const loggedUser = await login(identifier.trim(), password);
        addToast(`Welcome back, ${loggedUser.name}!`, 'success');
      } else if (mode === 'REGISTER') {
        if (!name.trim() || !phone.trim() || !email.trim() || !password) {
          addToast('Please fill in all registration fields', 'error');
          return;
        }
        const newUser = await register({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
        });
        addToast(`Account created! Welcome to KVN, ${newUser.name}!`, 'success');
      } else if (mode === 'OTP') {
        if (!phone.trim() || !otp.trim()) {
          addToast('Please enter your mobile number and 4-digit OTP', 'error');
          return;
        }
        const user = await loginWithOtp(phone.trim(), otp.trim(), name.trim());
        addToast(`Verified successfully! Welcome, ${user.name}!`, 'success');
      }
    } catch (err) {
      addToast(err.message || 'Authentication failed. Please check your credentials.', 'error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background Ambience Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg z-10">
        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          {/* Header with Logo Photo */}
          <div className="text-center mb-6">
            <div className="relative inline-block mb-3">
              <img
                src="/kvn-logo.png"
                alt="KVN Rides Logo"
                className="w-24 h-24 rounded-2xl mx-auto shadow-2xl border-2 border-teal-500/30 object-cover bg-white"
              />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shadow">
                Telangana Only
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">
              Welcome to KVN Rides
            </h1>
            <p className="text-xs text-teal-400 font-semibold mt-1">
              Exclusively for Telangana People
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
              Serving Hyderabad, Warangal, Nizamabad, Karimnagar & all Telangana districts
            </p>
          </div>

          {/* Telangana Exclusive Notice Banner */}
          <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-sm">
              📍
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold text-amber-300">
                Exclusive Service Notice
              </div>
              <div className="text-[10px] text-slate-300">
                KVN site & ride booking services are strictly for residents & travelers in Telangana state.
              </div>
            </div>
          </div>

          {/* Ride Perks Pills */}
          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <div className="text-base mb-0.5">🛵</div>
              <div className="text-[11px] font-bold text-white">KVN Bike</div>
              <div className="text-[9px] text-teal-400 font-medium">Fastest in traffic</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <div className="text-base mb-0.5">🛺</div>
              <div className="text-[11px] font-bold text-white">KVN Auto</div>
              <div className="text-[9px] text-emerald-400 font-medium">Pocket friendly</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/40">
              <div className="text-base mb-0.5">🚕</div>
              <div className="text-[11px] font-bold text-white">KVN Cab</div>
              <div className="text-[9px] text-blue-400 font-medium">Chilled AC</div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl mb-6 text-xs font-bold border border-slate-700/40">
            <button
              type="button"
              onClick={() => { setMode('LOGIN'); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'LOGIN'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('REGISTER'); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'REGISTER'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => { setMode('OTP'); }}
              className={`flex-1 py-2 rounded-lg transition-all ${
                mode === 'OTP'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mobile OTP
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* REGISTER FIELDS */}
            {mode === 'REGISTER' && (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* LOGIN FIELDS */}
            {mode === 'LOGIN' && (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Mobile Number or Email
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Enter mobile number or email"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* OTP FIELDS */}
            {mode === 'OTP' && (
              <>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter 10-digit mobile number"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Your Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Enter 4-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!phone.trim() || phone.trim().length < 10) {
                          addToast('Please enter your 10-digit mobile number first', 'error');
                          return;
                        }
                        setOtpSent(true);
                        setOtp('1234');
                        addToast(`OTP sent to +91 ${phone.trim()} (Demo OTP: 1234)`, 'success');
                      }}
                      className="text-[11px] text-teal-400 hover:text-teal-300 font-bold transition-colors"
                    >
                      {otpSent ? 'Resend OTP' : 'Get OTP'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 text-white text-center font-bold tracking-widest text-xl focus:outline-none focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Instant login with any mobile number
                  </p>
                </div>
              </>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-slate-950 font-black text-xs tracking-wider shadow-glow flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 mt-4"
            >
              <span>
                {loading
                  ? 'Processing...'
                  : mode === 'LOGIN'
                  ? 'SIGN IN'
                  : mode === 'REGISTER'
                  ? 'CREATE ACCOUNT & RIDE'
                  : 'VERIFY OTP & CONTINUE'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Quick Switch Helper Links */}
            <div className="text-center pt-2 text-[11px] text-slate-400 space-y-1">
              {mode === 'LOGIN' && (
                <>
                  <div>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('REGISTER')}
                      className="text-teal-400 font-bold hover:underline"
                    >
                      Create Account
                    </button>
                  </div>
                  <div>
                    Or use{' '}
                    <button
                      type="button"
                      onClick={() => setMode('OTP')}
                      className="text-teal-400 font-bold hover:underline"
                    >
                      Quick Mobile OTP Login
                    </button>
                  </div>
                </>
              )}
              {mode === 'REGISTER' && (
                <div>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('LOGIN')}
                    className="text-teal-400 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </div>
              )}
              {mode === 'OTP' && (
                <div>
                  Prefer password login?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('LOGIN')}
                    className="text-teal-400 font-bold hover:underline"
                  >
                    Sign In with Password
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Safety footer */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Encrypted login • 24/7 Verified Driver Partners</span>
          </div>
        </div>
      </div>
    </div>
  );
};
