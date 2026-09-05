import React from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, Wallet, LogOut, ShieldCheck } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/kvn-logo.png"
            alt="KVN Logo"
            className="w-10 h-10 rounded-xl object-contain bg-white shadow-md border border-slate-700/60"
          />
          <div>
            <div className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-teal-400 bg-clip-text text-transparent">
              KVN RIDES
            </div>
            <div className="text-[10px] text-teal-400 font-semibold tracking-widest uppercase flex items-center gap-1.5">
              <span>Customer App</span>
              <span>•</span>
              <span className="flex items-center text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                Telangana Live
              </span>
            </div>
          </div>
        </div>

        {/* Right Info: Safety Badge, Wallet Quick Balance & User */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/50 text-xs font-semibold text-slate-300">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>24x7 Safety Assured</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2">
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-teal-500/40 object-cover"
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold leading-none text-white">{user.name}</div>
                  <div className="text-[10px] text-teal-400 font-medium">{user.phone}</div>
                </div>
              </div>

              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
