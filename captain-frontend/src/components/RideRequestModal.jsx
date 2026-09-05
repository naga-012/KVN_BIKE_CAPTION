import React, { useState, useEffect } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import api from '../services/api';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  IndianRupee, 
  Star, 
  CheckCircle2, 
  XCircle, 
  CreditCard,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export const RideRequestModal = ({ request, onClose }) => {
  const { captain, setActiveRide, setCaptainStatus, addToast } = useCaptainAuth();
  const [timeLeft, setTimeLeft] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronized countdown timer
  useEffect(() => {
    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose(); // Automatically dismiss when expired
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request, onClose]);

  if (!request) return null;

  const rideId = request.rideId || request.ride_id || request.id || request._id;
  const fare = request.estimatedFare || request.fareBreakdown?.totalFare || 50;
  const distance = request.distanceKm || 2.5;
  const duration = request.durationMinutes || 8;
  const pickup = request.pickupLocation?.address || 'Pickup Point';
  const drop = request.dropLocation?.address || 'Drop Destination';
  const paymentMethod = request.paymentMethod || 'UPI';
  const customerName = request.customerName || 'Customer';
  const customerRating = request.customerRating || 4.88;

  // Handle Accept Ride (Atomic First-Accept-Wins)
  const handleAccept = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const cptId = captain.id || captain._id || captain.code;
      const res = await api.post(`/rides/${rideId}/accept`, {
        captainId: cptId,
        captainName: captain.name,
        vehicle: captain.vehicle,
        plateNumber: captain.plateNumber,
        phone: captain.phone,
        avatar: captain.avatar,
      });

      if (res.success) {
        addToast(`🎉 Booking Accepted! Navigate to customer.`, 'success');
        setActiveRide(res.ride);
        setCaptainStatus('BUSY');
        onClose();
      }
    } catch (err) {
      // If another captain accepted first: HTTP 409
      if (err.status === 409 || err.message?.includes('already accepted')) {
        addToast('⚠️ Ride already accepted by another Captain! Searching for new rides...', 'error');
      } else {
        addToast(err.message || 'Failed to accept ride', 'error');
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const percentLeft = (timeLeft / 15) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-dark-800 border-2 border-brand-500 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
        {/* Top Header with Synchronized Countdown Bar */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-4 text-dark-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="animate-ping-slow inline-flex h-3 w-3 rounded-full bg-dark-900"></span>
              <h3 className="font-extrabold text-base tracking-tight uppercase">New Customer Ride Request</h3>
            </div>
            <div className="bg-dark-900 text-brand-400 px-3 py-1 rounded-full font-mono font-black text-sm shadow-inner flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft}s</span>
            </div>
          </div>
          {/* Visual Countdown Progress Bar */}
          <div className="w-full bg-dark-900/40 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-dark-900 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${percentLeft}%` }}
            ></div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Fare and Trip Stats */}
          <div className="flex items-center justify-between bg-dark-900/60 p-4 rounded-2xl border border-dark-600/70">
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Estimated Fare</p>
              <div className="flex items-baseline gap-1 text-brand-400 font-black text-3xl font-mono">
                <IndianRupee className="w-6 h-6 self-center" />
                <span>{fare}</span>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-1.5 justify-end text-xs font-semibold text-slate-300">
                <Navigation className="w-3.5 h-3.5 text-brand-400" />
                <span>{distance} KM</span>
                <span className="text-slate-500">•</span>
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                <span>~{duration} Mins</span>
              </div>
              <div className="inline-flex items-center gap-1 bg-dark-700 px-2 py-0.5 rounded text-[11px] font-medium text-slate-300">
                <CreditCard className="w-3 h-3 text-emerald-400" />
                <span>{paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Customer Profile Pill */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-brand-400 flex items-center justify-center font-bold text-dark-900 text-sm">
                {customerName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-sm text-white">{customerName}</p>
                <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{customerRating}</span>
                  <span className="text-[10px] text-slate-400 ml-1">• Verified Rider</span>
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold uppercase">
              {request.vehicleType || 'BIKE'}
            </span>
          </div>

          {/* Route Details */}
          <div className="space-y-3 bg-dark-900/40 p-3.5 rounded-2xl border border-dark-600/50 text-xs">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20"></div>
                <div className="w-0.5 h-7 bg-dark-600 my-0.5"></div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Pickup</p>
                <p className="text-slate-200 font-medium line-clamp-1">{pickup}</p>
              </div>
            </div>

            {/* Drop */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400 ring-4 ring-rose-400/20"></div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Destination</p>
                <p className="text-slate-200 font-medium line-clamp-1">{drop}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Large Touch Targets */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-dark-700 hover:bg-dark-600 text-slate-300 font-bold text-sm tracking-wide transition-all border border-dark-600 flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4 text-slate-400" />
              <span>REJECT</span>
            </button>

            <button
              onClick={handleAccept}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-dark-900 font-black text-sm tracking-wider uppercase transition-all shadow-glow-gold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5 text-dark-900" />
              <span>{isSubmitting ? 'ACCEPTING...' : 'ACCEPT RIDE'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideRequestModal;
