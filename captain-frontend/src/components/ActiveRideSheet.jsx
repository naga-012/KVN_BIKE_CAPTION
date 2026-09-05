import React, { useState, useEffect } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import api from '../services/api';
import { 
  Phone, 
  MessageSquare, 
  ShieldAlert, 
  Navigation, 
  CheckCircle, 
  MapPin, 
  Clock, 
  KeyRound, 
  IndianRupee,
  Flag,
  Share2,
  ChevronUp,
  Sparkles
} from 'lucide-react';

export const ActiveRideSheet = ({ 
  ride, 
  onOpenOtpModal, 
  onOpenChat, 
  onOpenSos 
}) => {
  const { setActiveRide, setCaptainStatus, addToast } = useCaptainAuth();
  const [loading, setLoading] = useState(false);
  const [tripSeconds, setTripSeconds] = useState(0);
  const [completedSummary, setCompletedSummary] = useState(null);

  const rideId = ride?.id || ride?._id;
  const status = ride?.status || 'DRIVER_ASSIGNED';

  // Trip timer when in progress
  useEffect(() => {
    let timer = null;
    if (status === 'RIDE_STARTED') {
      timer = setInterval(() => {
        setTripSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  if (!ride) return null;

  // Step 1: Mark Captain Arrived
  const handleMarkArrived = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/rides/${rideId}/arrived`);
      if (res.success) {
        setActiveRide((prev) => ({ ...prev, status: 'DRIVER_ARRIVED' }));
        addToast('Arrived at customer pickup point! Ask customer for Ride OTP.', 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to mark arrived', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Ride
  const handleCompleteRide = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/rides/${rideId}/complete`);
      if (res.success) {
        setCompletedSummary(res);
        addToast('🎉 Ride completed successfully! Earnings credited.', 'success');
        setCaptainStatus('AVAILABLE');
      }
    } catch (err) {
      addToast(err.message || 'Failed to complete ride', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Close completed receipt and reset
  const handleFinishSummary = () => {
    setCompletedSummary(null);
    setActiveRide(null);
    setCaptainStatus('AVAILABLE');
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  const fare = ride.fareBreakdown?.totalFare || 50;
  const driverEarning = ride.fareBreakdown?.driverEarning || Math.round(fare * 0.82);

  return (
    <>
      <div className="bg-dark-800 border-t border-dark-600 rounded-t-3xl shadow-2xl p-4 md:p-6 transition-all">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Header Status Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-dark-600/80">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                {status === 'DRIVER_ASSIGNED' && 'Step 1: Navigating to Pickup'}
                {status === 'DRIVER_ARRIVED' && 'Step 2: Arrived & Verify OTP'}
                {status === 'RIDE_STARTED' && 'Step 3: Trip In Progress'}
                {status === 'RIDE_COMPLETED' && 'Trip Completed'}
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                {status === 'DRIVER_ASSIGNED' && 'Ride Accepted — Go to Pickup'}
                {status === 'DRIVER_ARRIVED' && 'At Pickup — Enter Customer OTP'}
                {status === 'RIDE_STARTED' && 'Driving to Destination'}
              </h3>
            </div>

            {/* Quick Action Icons: Call, Chat, SOS */}
            <div className="flex items-center gap-2">
              <a
                href="tel:9876543210"
                className="w-10 h-10 rounded-full bg-dark-700 hover:bg-dark-600 border border-dark-600 flex items-center justify-center text-emerald-400 transition-colors"
                title="Call Customer"
              >
                <Phone className="w-4 h-4" />
              </a>

              <button
                onClick={onOpenChat}
                className="w-10 h-10 rounded-full bg-dark-700 hover:bg-dark-600 border border-dark-600 flex items-center justify-center text-brand-400 transition-colors relative"
                title="Chat with Customer"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-brand-400 absolute top-2 right-2 animate-ping"></span>
              </button>

              <button
                onClick={onOpenSos}
                className="w-10 h-10 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 flex items-center justify-center text-rose-400 transition-colors"
                title="Safety SOS"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PRIMARY ACTION BUTTON — PLACED UP AT TOP OF DASHBOARD */}
          <div className="pt-1 pb-1">
            {/* Step 1: Navigating to pickup */}
            {status === 'DRIVER_ASSIGNED' && (
              <button
                onClick={handleMarkArrived}
                disabled={loading}
                className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-brand-500 to-amber-500 hover:from-amber-400 hover:to-brand-400 text-dark-900 font-black text-base md:text-lg tracking-wider uppercase transition-all shadow-glow-gold flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98] border-2 border-amber-300"
              >
                <CheckCircle className="w-6 h-6 text-dark-900 shrink-0" />
                <span>{loading ? 'UPDATING STATUS...' : 'I HAVE ARRIVED AT PICKUP LOCATION'}</span>
              </button>
            )}

            {/* Step 2: Arrived, waiting for OTP */}
            {status === 'DRIVER_ARRIVED' && (
              <button
                onClick={onOpenOtpModal}
                className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 hover:from-emerald-400 hover:to-teal-400 text-dark-900 font-black text-base md:text-lg tracking-wider uppercase transition-all shadow-glow-emerald flex items-center justify-center gap-3 animate-bounce-short cursor-pointer active:scale-[0.98] border-2 border-emerald-300"
              >
                <KeyRound className="w-6 h-6 text-dark-900 shrink-0" />
                <span>ENTER 4-DIGIT RIDE OTP</span>
              </button>
            )}

            {/* Step 3: Trip in progress */}
            {status === 'RIDE_STARTED' && (
              <button
                onClick={handleCompleteRide}
                disabled={loading}
                className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-dark-900 font-black text-base md:text-lg tracking-wider uppercase transition-all shadow-glow-emerald flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98] border-2 border-emerald-300"
              >
                <Flag className="w-6 h-6 text-dark-900 shrink-0" />
                <span>{loading ? 'CALCULATING FARE...' : 'COMPLETE RIDE'}</span>
              </button>
            )}
          </div>

          {/* Customer & Route Quick Details */}
          <div className="bg-dark-900/60 p-3.5 rounded-2xl border border-dark-600/70 text-xs space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">Pickup</span>
                </div>
                <p className="text-slate-200 font-medium pl-4 line-clamp-1">
                  {ride.pickupLocation?.address || 'Pickup Point'}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                  <span className="text-[11px] font-bold text-rose-400 uppercase">Drop</span>
                </div>
                <p className="text-slate-200 font-medium pl-4 line-clamp-1">
                  {ride.dropLocation?.address || 'Drop Destination'}
                </p>
              </div>
            </div>

            {/* Google Location Navigation Link */}
            <div className="pt-1 flex items-center justify-between border-t border-dark-700/60">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(ride.pickupLocation?.address || `${ride.pickupLocation?.lat},${ride.pickupLocation?.lng}`)}&destination=${encodeURIComponent(ride.dropLocation?.address || `${ride.dropLocation?.lat},${ride.dropLocation?.lng}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all"
              >
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                <span>Open Google Maps Location & Navigation ↗</span>
              </a>
              <span className="text-[10px] text-slate-400 font-medium">Turn-by-turn GPS</span>
            </div>
          </div>

          {/* Metrics Bar */}
          <div className="flex items-center justify-between text-xs px-2">
            <div className="flex items-center gap-4 text-slate-300">
              <span className="flex items-center gap-1 font-mono font-semibold">
                <Navigation className="w-3.5 h-3.5 text-brand-400" />
                {ride.distanceKm || 2.5} KM
              </span>
              <span className="flex items-center gap-1 font-mono font-semibold">
                <Clock className="w-3.5 h-3.5 text-brand-400" />
                {status === 'RIDE_STARTED' ? formatTimer(tripSeconds) : `~${ride.durationMinutes || 8} Mins`}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-400">Est. Fare:</span>
              <span className="font-extrabold text-brand-400 text-sm">₹{fare}</span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Earn ₹{driverEarning}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ride Completion Receipt Modal */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-dark-800 border border-brand-500/50 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <h3 className="text-xl font-extrabold text-white">Trip Completed!</h3>
              <p className="text-xs text-slate-400">Payment received • Earnings added to wallet</p>
            </div>

            {/* Earnings Pill */}
            <div className="bg-dark-900/80 p-4 rounded-2xl border border-dark-600 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Your Net Earnings</p>
              <div className="flex items-center justify-center text-brand-400 font-mono font-black text-4xl mt-1">
                <IndianRupee className="w-7 h-7" />
                <span>{completedSummary.driverEarning || driverEarning}</span>
              </div>
              <p className="text-[11px] text-emerald-400 mt-1 font-semibold">Credited to KVN Captain Account</p>
            </div>

            {/* Fare Breakdown */}
            <div className="space-y-2 text-xs text-slate-300 bg-dark-900/40 p-3.5 rounded-xl border border-dark-600/50">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Customer Fare</span>
                <span className="font-semibold text-white font-mono">₹{completedSummary.fare?.totalFare || fare}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Platform Commission (18%)</span>
                <span className="font-semibold text-slate-400 font-mono">- ₹{Math.round((completedSummary.fare?.totalFare || fare) * 0.18)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Taxes & Fees</span>
                <span className="font-semibold text-slate-400 font-mono">Included</span>
              </div>
              <div className="border-t border-dark-600/70 pt-2 flex justify-between font-bold text-brand-400 text-sm">
                <span>Captain Take-Home</span>
                <span className="font-mono">₹{completedSummary.driverEarning || driverEarning}</span>
              </div>
            </div>

            <button
              onClick={handleFinishSummary}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-dark-900 font-black text-sm tracking-wider uppercase transition-all shadow-glow-gold"
            >
              READY FOR NEXT RIDE
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ActiveRideSheet;
