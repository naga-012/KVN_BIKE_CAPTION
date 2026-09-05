import React, { useState } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import { 
  Power, 
  ShieldAlert, 
  Bell, 
  Sparkles, 
  ChevronDown, 
  Compass, 
  User, 
  Wallet, 
  History,
  Radio
} from 'lucide-react';

export const CaptainNavbar = ({ activeTab, setActiveTab, onOpenSos, onOpenScenarioTest }) => {
  const { 
    captain, 
    isOnline, 
    captainStatus, 
    toggleOnline, 
    allCaptains, 
    switchCaptain 
  } = useCaptainAuth();
  
  const [showCaptainDropdown, setShowCaptainDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-dark-900/90 backdrop-blur-md border-b border-dark-600/70 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 p-0.5 shadow-glow-gold flex items-center justify-center font-bold text-dark-900 text-lg tracking-wider">
            KVN
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-tight">CAPTAIN</span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded border border-brand-500/30">
                Partner
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Ride. Earn. Move with KVN.</p>
          </div>
        </div>

        {/* Center: Online / Offline Toggle Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleOnline()}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-glow-emerald hover:bg-emerald-500/30'
                : 'bg-dark-700 text-slate-400 border border-dark-600 hover:bg-dark-600 hover:text-slate-200'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
            </span>
            <span>{isOnline ? (captainStatus === 'BUSY' ? 'IN TRIP' : 'ONLINE') : 'OFFLINE'}</span>
            <Power className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        {/* Right: Test Simulator Button, SOS, Profile / Captain Switcher */}
        <div className="flex items-center gap-2">
          {/* Test Simulator Button */}
          <button
            onClick={onOpenScenarioTest}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 text-xs font-semibold transition-colors"
            title="Open 2KM Radius & Race Condition Test Simulator"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">2KM Test Suite</span>
          </button>

          {/* SOS Safety Button */}
          <button
            onClick={onOpenSos}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/25 text-xs font-bold transition-colors shadow-sm"
            title="Emergency SOS Center"
          >
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="hidden sm:inline">SOS</span>
          </button>

          {/* Captain Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCaptainDropdown(!showCaptainDropdown)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-dark-800 border border-dark-600 hover:border-brand-500/50 transition-all text-xs text-slate-200"
            >
              <img
                src={captain?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'}
                alt={captain?.name || 'Captain'}
                className="w-6 h-6 rounded-full object-cover border border-brand-500/40"
              />
              <span className="font-semibold max-w-[90px] truncate hidden sm:inline">
                {captain?.name?.split(' ')[0] || 'Captain'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showCaptainDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-dark-600/70 mb-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand-400">Select Active Captain</p>
                  <p className="text-[10px] text-slate-400">Switch driver to test multi-captain dispatch</p>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {allCaptains.map((c) => {
                    const isCurrent = (captain?.id === c.id || captain?.code === c.code || captain?._id === c._id);
                    return (
                      <button
                        key={c.code || c.id || c._id}
                        onClick={() => {
                          switchCaptain(c.code || c.id || c._id);
                          setShowCaptainDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                          isCurrent
                            ? 'bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30'
                            : 'text-slate-300 hover:bg-dark-700 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span className="truncate">{c.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono ml-1 shrink-0">
                          {c.vehicleType}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-dark-600/70 mt-1">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setShowCaptainDropdown(false);
                    }}
                    className="w-full text-center text-[11px] font-semibold text-brand-400 hover:underline py-1"
                  >
                    View Captain Profile & Vehicle →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default CaptainNavbar;
