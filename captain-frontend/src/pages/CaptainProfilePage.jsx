import React from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import { 
  User, 
  Phone, 
  Mail, 
  Star, 
  ShieldCheck, 
  FileText, 
  Car, 
  CreditCard, 
  LogOut,
  CheckCircle2,
  Award
} from 'lucide-react';

export const CaptainProfilePage = ({ onOpenAuth }) => {
  const { captain, logout } = useCaptainAuth();

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in pb-16">
      {/* Profile Header Card */}
      <div className="bg-dark-800 border border-dark-600 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="relative">
            <img
              src={captain?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}
              alt={captain?.name || 'Captain'}
              className="w-24 h-24 rounded-full object-cover border-4 border-brand-500 shadow-glow-gold"
            />
            <span className="absolute bottom-0 right-0 bg-emerald-500 text-dark-900 p-1.5 rounded-full border-2 border-dark-800">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-white">{captain?.name || 'Captain Partner'}</h2>
              <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold self-center sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Partner</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-brand-400" />
                <span>{captain?.phone || '+91 98480 11221'}</span>
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-brand-400" />
                <span>{captain?.email || 'captain@kvn.com'}</span>
              </span>
            </div>

            {/* Rating & Lifetime Stats */}
            <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
              <div className="flex items-center gap-1.5 bg-dark-700 px-3 py-1 rounded-xl border border-dark-600 text-xs">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="font-extrabold text-white">{captain?.rating || 4.92}</span>
                <span className="text-slate-400 text-[10px]">Rating</span>
              </div>
              <div className="bg-dark-700 px-3 py-1 rounded-xl border border-dark-600 text-xs text-slate-300">
                <span className="font-extrabold text-white">{captain?.totalRides || 482}</span>
                <span className="text-slate-400 text-[10px] ml-1">Lifetime Rides</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Management Section */}
      <div className="bg-dark-800 border border-dark-600 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-dark-600/70 pb-3">
          <div className="flex items-center gap-2 text-brand-400">
            <Car className="w-5 h-5" />
            <h3 className="font-extrabold text-white text-base">Vehicle Information</h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded border border-brand-500/20">
            {captain?.vehicleType || 'BIKE'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-dark-900/60 p-3 rounded-2xl border border-dark-600/50">
            <p className="text-slate-400 text-[10px] uppercase font-semibold">Vehicle Plate</p>
            <p className="text-white font-mono font-bold mt-1">{captain?.plateNumber || 'TS 08 EA 4589'}</p>
          </div>

          <div className="bg-dark-900/60 p-3 rounded-2xl border border-dark-600/50">
            <p className="text-slate-400 text-[10px] uppercase font-semibold">Model</p>
            <p className="text-white font-semibold mt-1">{captain?.vehicleModel || 'Honda Activa 6G'}</p>
          </div>

          <div className="bg-dark-900/60 p-3 rounded-2xl border border-dark-600/50">
            <p className="text-slate-400 text-[10px] uppercase font-semibold">Color</p>
            <p className="text-white font-semibold mt-1">{captain?.vehicleColor || 'Black'}</p>
          </div>

          <div className="bg-dark-900/60 p-3 rounded-2xl border border-dark-600/50">
            <p className="text-slate-400 text-[10px] uppercase font-semibold">Permit Status</p>
            <p className="text-emerald-400 font-bold mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Commercial</span>
            </p>
          </div>
        </div>
      </div>

      {/* Compliance & Document Verification Checklist */}
      <div className="bg-dark-800 border border-dark-600 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-emerald-400 border-b border-dark-600/70 pb-3">
          <FileText className="w-5 h-5" />
          <h3 className="font-extrabold text-white text-base">Verified Documents</h3>
        </div>

        <div className="space-y-2.5 text-xs">
          {[
            { title: 'Driving License (DL)', id: 'TS08-2022-0098124', status: 'Approved & Verified' },
            { title: 'Registration Certificate (RC)', id: 'TS 08 EA 4589', status: 'Approved & Verified' },
            { title: 'Vehicle Insurance Policy', id: 'INS-KVN-2026-9921', status: 'Active (Expires Dec 2026)' },
            { title: 'Police Background Verification', id: 'TELANGANA-POLICE-CLR', status: 'Clear & Certified' },
          ].map((doc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-2xl bg-dark-900/60 border border-dark-600/50"
            >
              <div>
                <p className="font-bold text-white">{doc.title}</p>
                <p className="text-[11px] text-slate-400 font-mono">{doc.id}</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{doc.status}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bank & Payment Settlement */}
      <div className="bg-dark-800 border border-dark-600 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-brand-400 border-b border-dark-600/70 pb-3">
          <CreditCard className="w-5 h-5" />
          <h3 className="font-extrabold text-white text-base">Direct Bank Settlement</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-dark-900/60 p-3 rounded-2xl border border-dark-600/50">
            <p className="text-slate-400 text-[10px] uppercase font-semibold">Bank Account</p>
            <p className="text-white font-mono font-bold mt-1">•••• •••• 1221 (SBI)</p>
          </div>
          <div className="bg-dark-900/60 p-3 rounded-2xl border border-dark-600/50">
            <p className="text-slate-400 text-[10px] uppercase font-semibold">IFSC Code</p>
            <p className="text-white font-mono font-bold mt-1">SBIN0004521</p>
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full py-3.5 rounded-2xl bg-dark-800 hover:bg-rose-500/20 text-rose-400 font-bold text-xs uppercase tracking-wider transition-all border border-rose-500/30 flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>LOGOUT FROM CAPTAIN ACCOUNT</span>
        </button>
      </div>
    </div>
  );
};

export default CaptainProfilePage;
