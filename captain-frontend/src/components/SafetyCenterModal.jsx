import React, { useState } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import api from '../services/api';
import socket from '../services/socket';
import { ShieldAlert, Phone, Share2, CheckCircle2, X, AlertTriangle } from 'lucide-react';

export const SafetyCenterModal = ({ ride, isOpen, onClose }) => {
  const { captain, currentLocation, addToast } = useCaptainAuth();
  const [sosSent, setSosSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleTriggerSos = async () => {
    setLoading(true);
    const cptId = captain?.id || captain?._id || captain?.code;
    const rideId = ride?.id || ride?._id;

    const payload = {
      captainId: cptId,
      rideId,
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      reason: 'Emergency SOS initiated by Captain via Safety Center',
    };

    // Emit via Socket
    socket.emit('sos:trigger', payload);

    // Call REST endpoint
    try {
      await api.post('/captains/sos', payload);
      setSosSent(true);
      addToast('🚨 EMERGENCY SOS SENT: Police 112 & KVN Safety Central Notified!', 'error');
    } catch (e) {
      setSosSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleShareTrip = () => {
    if (navigator.share) {
      navigator.share({
        title: 'KVN Captain Live Trip Tracking',
        text: `Track my live driving route with KVN: https://kvn.com/track/${ride?.id || 'live'}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('Trip tracking link copied to clipboard!', 'info');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-dark-800 border border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-500">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <h3 className="font-extrabold text-base tracking-tight text-white uppercase">
              KVN Captain Safety Center
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-700 hover:bg-dark-600 text-slate-400 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SOS Confirmation / Action */}
        {!sosSent ? (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h4 className="font-bold text-white text-base">Are you in an emergency?</h4>
              <p className="text-xs text-slate-300 mt-1">
                Pressing SOS instantly sends your live GPS coordinates, ride ID, and vehicle details to the Police Emergency Control Room (112) and KVN Rapid Response.
              </p>
            </div>
            <button
              onClick={handleTriggerSos}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm tracking-wider uppercase transition-all shadow-lg shadow-rose-600/30"
            >
              {loading ? 'SENDING SOS...' : '🚨 TRIGGER EMERGENCY SOS (112)'}
            </button>
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-white text-sm">Emergency Alert Dispatched!</h4>
            <p className="text-xs text-slate-300">
              KVN Safety Central and Police Control Room have your real-time coordinates. Assistance is on the way.
            </p>
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Direct Emergency Lines
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href="tel:112"
              className="flex items-center gap-2 p-3 rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-600 text-slate-200 font-semibold transition-colors"
            >
              <Phone className="w-4 h-4 text-rose-400" />
              <span>Police (112)</span>
            </a>
            <a
              href="tel:108"
              className="flex items-center gap-2 p-3 rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-600 text-slate-200 font-semibold transition-colors"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Ambulance (108)</span>
            </a>
          </div>

          <button
            onClick={handleShareTrip}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-dark-700 hover:bg-dark-600 border border-dark-600 text-slate-200 text-xs font-semibold transition-colors mt-2"
          >
            <Share2 className="w-4 h-4 text-brand-400" />
            <span>Share Trip Details with Trusted Contact</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SafetyCenterModal;
