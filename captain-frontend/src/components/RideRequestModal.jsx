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
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Layers,
  Sparkles,
  X
} from 'lucide-react';

export const RideRequestModal = ({ request: propRequest, onClose }) => {
  const { 
    captain, 
    incomingRequests, 
    currentRequestIndex, 
    nextRequest, 
    prevRequest, 
    selectRequest, 
    skipRide, 
    setActiveRide, 
    setCaptainStatus, 
    addToast 
  } = useCaptainAuth();

  const [timeLeft, setTimeLeft] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Derive the active request to display: prefer incomingRequests[currentRequestIndex]
  const request = (incomingRequests && incomingRequests.length > 0 && incomingRequests[currentRequestIndex]) 
    ? incomingRequests[currentRequestIndex] 
    : propRequest;

  const totalRequests = incomingRequests?.length || (request ? 1 : 0);

  // Synchronized countdown timer per request
  useEffect(() => {
    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // If expired, skip or dismiss
          if (request) {
            const rId = request.rideId || request.ride_id || request.id || request._id;
            if (totalRequests > 1) {
              skipRide(rId, 'Request expired');
            } else {
              onClose();
            }
          } else {
            onClose();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request?.rideId, request?.ride_id, request?.id, request?._id, totalRequests, skipRide, onClose]);

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

  // Handle Skip Ride
  const handleSkip = async () => {
    if (isSkipping || isSubmitting) return;
    setIsSkipping(true);
    try {
      await skipRide(rideId, 'Captain opted to skip');
      if (totalRequests <= 1) {
        onClose();
      }
    } catch (err) {
      console.warn('Skip error:', err);
    } finally {
      setIsSkipping(false);
    }
  };

  // Handle Accept Ride (Atomic First-Accept-Wins)
  const handleAccept = async () => {
    if (isSubmitting || isSkipping) return;
    setIsSubmitting(true);

    try {
      const cptId = captain?.id || captain?._id || captain?.code || 'cpt_a';
      const res = await api.post(`/rides/${rideId}/accept`, {
        captainId: cptId,
        captainName: captain?.name,
        vehicle: captain?.vehicle,
        plateNumber: captain?.plateNumber,
        phone: captain?.phone,
        avatar: captain?.avatar,
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
        addToast('⚠️ Ride already accepted by another Captain! Checking next ride...', 'error');
        // If there are other rides in queue, skip this one
        skipRide(rideId, 'Conflict - already accepted');
        if (totalRequests <= 1) {
          onClose();
        }
      } else {
        addToast(err.message || 'Failed to accept ride', 'error');
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const percentLeft = (timeLeft / 15) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-dark-800 border-2 border-brand-500 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
        
        {/* Top Header with Synchronized Countdown Bar */}
        <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-amber-500 p-3.5 text-dark-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="animate-ping-slow inline-flex h-3 w-3 rounded-full bg-dark-900"></span>
              <h3 className="font-extrabold text-sm md:text-base tracking-tight uppercase">KVN Bike Booking Request</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-dark-900 text-brand-400 tracking-wider">
                KVN
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Countdown Timer */}
              <div className="bg-dark-900 text-brand-400 px-3 py-1 rounded-full font-mono font-black text-xs md:text-sm shadow-inner flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-dark-900/40 hover:bg-dark-900/70 text-dark-900 flex items-center justify-center transition-all"
                title="Dismiss"
              >
                <X className="w-4 h-4 text-dark-900" />
              </button>
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

        {/* Multi-Ride Switcher Carousel Bar (Visible when multiple requests exist) */}
        {totalRequests > 1 && (
          <div className="bg-dark-900/90 border-b border-dark-600/80 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-brand-500/20 text-brand-400">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-black text-white tracking-wide">
                Ride <span className="text-brand-400 font-mono">{currentRequestIndex + 1}</span> of <span className="font-mono">{totalRequests}</span> Available
              </span>
            </div>

            {/* Quick Request Selector Tabs & Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={prevRequest}
                className="p-1 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-300 transition-all"
                title="Previous Request"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {incomingRequests.map((req, idx) => {
                  const reqFare = req.estimatedFare || req.fareBreakdown?.totalFare || 50;
                  const isSelected = idx === currentRequestIndex;
                  return (
                    <button
                      key={req.rideId || req.ride_id || req.id || req._id || idx}
                      onClick={() => selectRequest(idx)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all ${
                        isSelected
                          ? 'bg-brand-500 text-dark-900 shadow-md scale-105'
                          : 'bg-dark-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ₹{reqFare}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={nextRequest}
                className="p-1 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-300 transition-all"
                title="Next Request"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 md:p-5 space-y-4">
          {/* Fare and Trip Stats */}
          <div className="flex items-center justify-between bg-dark-900/70 p-4 rounded-2xl border border-dark-600/70">
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
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-500 to-brand-400 flex items-center justify-center font-bold text-dark-900 text-sm shadow-md">
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
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono px-2 py-1 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold uppercase">
                {request.vehicleType || 'BIKE'}
              </span>
            </div>
          </div>

          {/* Route Details */}
          <div className="space-y-3 bg-dark-900/50 p-3.5 rounded-2xl border border-dark-600/50 text-xs">
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

          {/* Action Buttons: Large Touch Targets with SKIP and ACCEPT */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* SKIP BUTTON */}
            <button
              onClick={handleSkip}
              disabled={isSkipping || isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-dark-700/90 hover:bg-dark-600 text-amber-300 font-extrabold text-sm tracking-wide transition-all border border-amber-500/30 hover:border-amber-500/60 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4 text-amber-400" />
              <span>{isSkipping ? 'SKIPPING...' : totalRequests > 1 ? 'SKIP TO NEXT' : 'SKIP RIDE'}</span>
            </button>

            {/* ACCEPT BUTTON */}
            <button
              onClick={handleAccept}
              disabled={isSubmitting || isSkipping}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-dark-900 font-black text-sm tracking-wider uppercase transition-all shadow-glow-gold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
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
