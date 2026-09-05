import React, { useState } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import { 
  Lock, 
  Phone, 
  Mail, 
  User, 
  Car, 
  FileText, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

export const CaptainAuthPage = ({ onSuccess }) => {
  const { login, register, allCaptains, switchCaptain, addToast } = useCaptainAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form state
  const [loginIdent, setLoginIdent] = useState('9848011221');
  const [loginPass, setLoginPass] = useState('Password@123');

  // Register form state (6 Steps)
  const [regData, setRegData] = useState({
    name: 'Captain Suresh Reddy',
    phone: '9848099881',
    email: 'suresh.reddy@kvn.com',
    password: 'Password@123',
    vehicleType: 'BIKE',
    vehicleModel: 'Hero Splendor Plus',
    vehicleColor: 'Black',
    plateNumber: 'TS 09 ED 7721',
    drivingLicenseNumber: 'TS09-2023-1189441',
    bankAccountNumber: '9848099881001',
    bankIfsc: 'SBIN0004521'
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(loginIdent, loginPass);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await register(regData);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center p-4 bg-dark-900 animate-in fade-in">
      <div className="w-full max-w-md bg-dark-800 border border-dark-600 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 mx-auto flex items-center justify-center font-black text-dark-900 text-2xl shadow-glow-gold">
            KVN
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isRegister ? 'Captain Partner Onboarding' : 'KVN Captain Login'}
          </h2>
          <p className="text-xs text-slate-400">Ride. Earn. Move with KVN Telangana.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Tab Toggle: Login vs Register */}
        <div className="grid grid-cols-2 p-1 bg-dark-900 rounded-2xl border border-dark-600">
          <button
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`py-2 text-xs font-bold uppercase rounded-xl transition-all ${
              !isRegister ? 'bg-brand-500 text-dark-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setIsRegister(true); setStep(1); setError(''); }}
            className={`py-2 text-xs font-bold uppercase rounded-xl transition-all ${
              isRegister ? 'bg-brand-500 text-dark-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* LOGIN FORM */}
        {!isRegister ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Registered Phone or Email</label>
              <div className="relative">
                <input
                  type="text"
                  value={loginIdent}
                  onChange={(e) => setLoginIdent(e.target.value)}
                  placeholder="9848011221"
                  className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Password</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-dark-900 border border-dark-600 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-dark-900 font-black text-sm tracking-wider uppercase transition-all shadow-glow-gold"
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN TO DASHBOARD'}
            </button>

            {/* Quick Demo Test Logins */}
            <div className="pt-2 border-t border-dark-600/70 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
                Instant Test Switch (Captains A - E)
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { code: 'cpt_a', name: 'Captain A (0.5km)' },
                  { code: 'cpt_b', name: 'Captain B (0.8km)' },
                  { code: 'cpt_c', name: 'Captain C (1.2km)' },
                  { code: 'cpt_d', name: 'Captain D (1.7km)' },
                ].map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      switchCaptain(c.code);
                      if (onSuccess) onSuccess();
                    }}
                    className="p-2 rounded-xl bg-dark-900 hover:bg-dark-700 border border-dark-600 text-slate-300 hover:text-brand-400 font-semibold text-[11px] transition-colors text-center"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </form>
        ) : (
          /* 6-STEP REGISTRATION ONBOARDING WIZARD */
          <div className="space-y-4">
            {/* Step Indicator */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-dark-600/60 pb-2">
              <span>Step {step} of 6</span>
              <span className="font-semibold text-brand-400 uppercase">
                {step === 1 && 'Contact Details'}
                {step === 2 && 'Personal Info'}
                {step === 3 && 'Vehicle Info'}
                {step === 4 && 'Driver License'}
                {step === 5 && 'Bank Settlement'}
                {step === 6 && 'Review & Approval'}
              </span>
            </div>

            {/* Step 1: Contact */}
            {step === 1 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    value={regData.phone}
                    onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white mt-1 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Email</label>
                  <input
                    type="email"
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white mt-1 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Set Password</label>
                  <input
                    type="password"
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white mt-1 focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Personal */}
            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Full Legal Name</label>
                  <input
                    type="text"
                    value={regData.name}
                    onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white mt-1 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Operating City / Region</label>
                  <input
                    type="text"
                    defaultValue="Hyderabad / Rangareddy, Telangana"
                    readOnly
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-slate-400 mt-1"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Vehicle */}
            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Vehicle Category</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {['BIKE', 'AUTO', 'CAB'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRegData({ ...regData, vehicleType: t })}
                        className={`py-2.5 rounded-xl font-bold text-xs uppercase border transition-all ${
                          regData.vehicleType === t
                            ? 'bg-brand-500 text-dark-900 border-brand-500'
                            : 'bg-dark-900 text-slate-300 border-dark-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold">Vehicle Model & Color</label>
                  <input
                    type="text"
                    value={regData.vehicleModel}
                    onChange={(e) => setRegData({ ...regData, vehicleModel: e.target.value })}
                    placeholder="Honda Activa 6G"
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white mt-1 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold">Vehicle Plate Number (TS Registration)</label>
                  <input
                    type="text"
                    value={regData.plateNumber}
                    onChange={(e) => setRegData({ ...regData, plateNumber: e.target.value })}
                    placeholder="TS 08 EA 4589"
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white mt-1 font-mono uppercase focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Documents */}
            {step === 4 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Driving License Number</label>
                  <input
                    type="text"
                    value={regData.drivingLicenseNumber}
                    onChange={(e) => setRegData({ ...regData, drivingLicenseNumber: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white mt-1 font-mono uppercase focus:border-brand-500"
                  />
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Instant digital Aadhaar & DL OCR verification active</span>
                </div>
              </div>
            )}

            {/* Step 5: Bank */}
            {step === 5 && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold">Bank Account Number</label>
                  <input
                    type="text"
                    value={regData.bankAccountNumber}
                    onChange={(e) => setRegData({ ...regData, bankAccountNumber: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white mt-1 font-mono focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold">IFSC Code</label>
                  <input
                    type="text"
                    value={regData.bankIfsc}
                    onChange={(e) => setRegData({ ...regData, bankIfsc: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-600 rounded-xl p-3 text-xs text-white mt-1 font-mono uppercase focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {step === 6 && (
              <div className="space-y-3 text-xs">
                <div className="bg-dark-900 p-3.5 rounded-2xl border border-dark-600 space-y-2">
                  <div className="flex justify-between"><span className="text-slate-400">Name:</span> <span className="font-bold text-white">{regData.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Phone:</span> <span className="font-mono text-white">{regData.phone}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Vehicle:</span> <span className="font-mono text-brand-400">{regData.vehicleType} • {regData.plateNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Status:</span> <span className="font-bold text-emerald-400">Pre-Approved</span></div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="flex items-center gap-2 pt-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="py-3 px-4 rounded-xl bg-dark-700 text-slate-300 hover:text-white font-bold text-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}

              {step < 6 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="flex-1 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-dark-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRegisterSubmit}
                  disabled={loading}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-dark-900 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Approving...' : 'SUBMIT & GO ONLINE'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CaptainAuthPage;
