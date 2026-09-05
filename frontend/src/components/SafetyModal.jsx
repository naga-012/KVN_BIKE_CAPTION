import React, { useState } from 'react';
import { X, ShieldAlert, PhoneCall, Share2, Users, AlertTriangle, Check } from 'lucide-react';
import { socket } from '../services/socket';
import { useToast } from '../context/ToastContext';

export const SafetyModal = ({ isOpen, onClose, ride, user }) => {
  const { addToast } = useToast();
  const [sosTriggered, setSosTriggered] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSos = () => {
    setSosTriggered(true);
    socket.emit('sos:trigger', {
      rideId: ride?._id,
      customerName: user?.name,
      location: ride?.pickupLocation,
    });
    addToast('Emergency SOS alert activated! KVN Safety team & emergency contacts notified.', 'error', 6000);
  };

  const handleShareTrip = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    addToast('Live trip link copied to clipboard. Share via WhatsApp or SMS!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">KVN Safety Center</h3>
              <p className="text-xs text-slate-400">24x7 Trip Safety & Assistance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SOS Button Area */}
        <div className="my-6 text-center">
          <button
            onClick={handleSos}
            disabled={sosTriggered}
            className={`w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center font-black transition-all duration-300 shadow-2xl ${
              sosTriggered
                ? 'bg-rose-700 text-white cursor-not-allowed animate-pulse ring-8 ring-rose-500/30'
                : 'bg-rose-600 hover:bg-rose-500 text-white hover:scale-105 active:scale-95 shadow-rose-600/50'
            }`}
          >
            <AlertTriangle className="w-10 h-10 mb-1 animate-bounce" />
            <span className="text-xl tracking-wider">SOS</span>
            <span className="text-[10px] font-medium opacity-80">EMERGENCY</span>
          </button>
          <p className="text-xs text-slate-400 mt-3 max-w-xs mx-auto">
            {sosTriggered
              ? '🚨 Emergency teams alerted. Stay inside the vehicle if safe.'
              : 'Pressing SOS instantly alerts KVN Safety Response Team and shares your live coordinates.'}
          </p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={handleShareTrip}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-teal-400 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-teal-400" />}
            <span>{copied ? 'Link Copied' : 'Share Live Trip'}</span>
          </button>

          <a
            href="tel:112"
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-rose-400 transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-rose-400" />
            <span>Call 112 Police</span>
          </a>
        </div>

        {/* Emergency Contacts List */}
        <div className="mt-5 p-3 rounded-xl bg-slate-850 border border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span>Emergency Contacts</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span>Dr. Anita Sharma (Mother)</span>
              <a href="tel:9876500001" className="text-teal-400 font-semibold hover:underline">9876500001</a>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>KVN 24/7 Safety Helpline</span>
              <a href="tel:1800200300" className="text-teal-400 font-semibold hover:underline">1800-200-300</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
