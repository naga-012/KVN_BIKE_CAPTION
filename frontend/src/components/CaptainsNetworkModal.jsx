import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle2, X, Radio, Bell, Navigation, MapPin, Zap, UserCheck, AlertCircle } from 'lucide-react';
import api from '../services/api';

export const CaptainsNetworkModal = ({
  isOpen,
  onClose,
  activeRide,
  onRideAccepted,
}) => {
  const [captains, setCaptains] = useState([]);
  const [acceptingId, setAcceptingId] = useState(null);
  const [acceptedCaptainId, setAcceptedCaptainId] = useState(null);
  const [conflictMessage, setConflictMessage] = useState(null);

  useEffect(() => {
    if (activeRide?.broadcastCaptains && activeRide.broadcastCaptains.length > 0) {
      setCaptains(activeRide.broadcastCaptains);
    } else if (activeRide?.pickupLocation) {
      // Default fallback captains within 2km
      const pLat = activeRide.pickupLocation.lat;
      const pLng = activeRide.pickupLocation.lng;
      setCaptains([
        {
          id: 'cpt_ramesh_1',
          name: 'Captain Ramesh Yadav',
          vehicle: 'Honda Activa 6G (Black)',
          plateNumber: 'TS 08 EA 4589',
          phone: '+91 98480 11223',
          rating: 4.92,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
          distanceKm: 0.52,
          etaMinutes: 2,
        },
        {
          id: 'cpt_shiva_2',
          name: 'Captain Shiva Kumar',
          vehicle: 'Bajaj RE Auto',
          plateNumber: 'TS 07 UA 7821',
          phone: '+91 98480 22334',
          rating: 4.87,
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
          distanceKm: 0.88,
          etaMinutes: 3,
        },
        {
          id: 'cpt_venkat_3',
          name: 'Captain Venkat Reddy',
          vehicle: 'Maruti Swift Dzire AC',
          plateNumber: 'TS 09 FB 3412',
          phone: '+91 98480 33445',
          rating: 4.96,
          avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
          distanceKm: 1.24,
          etaMinutes: 4,
        },
      ]);
    }
  }, [activeRide]);

  // Handle a captain accepting the order
  const handleAcceptByCaptain = async (captain) => {
    if (!activeRide?._id && !activeRide?.id) return;
    const rideId = activeRide._id || activeRide.id;

    setAcceptingId(captain.id);
    setConflictMessage(null);

    try {
      const res = await api.post(`/rides/${rideId}/accept`, {
        captainId: captain.id,
        captainName: captain.name,
        vehicle: captain.vehicle,
        plateNumber: captain.plateNumber,
        phone: captain.phone,
        avatar: captain.avatar,
      });

      // Successful first acceptance!
      setAcceptedCaptainId(captain.id);
      if (onRideAccepted) {
        onRideAccepted(res.data.ride || res.ride);
      }
    } catch (err) {
      // 409 Conflict: Another captain already accepted! Order disappeared!
      setConflictMessage(err.message || 'Order already accepted by another captain. Disappeared from your queue.');
      setAcceptedCaptainId('OTHER');
    } finally {
      setAcceptingId(null);
    }
  };

  if (!isOpen) return null;

  const isOrderActive = activeRide && activeRide.status === 'SEARCHING_DRIVER';
  const hasCaptainAccepted = activeRide?.status === 'DRIVER_ASSIGNED' || acceptedCaptainId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Captains App Dispatcher</h3>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  2 km Radius Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Order sent to all available captains within 2km simultaneously. First to accept wins.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Order Summary Pill if active */}
          {activeRide ? (
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-teal-400">
                    Live Broadcast Order
                  </span>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">
                    ₹{activeRide.fareBreakdown?.totalFare}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({activeRide.vehicleType} • {activeRide.distanceKm} km)
                  </span>
                </div>
                <div className="text-xs text-white truncate max-w-md">
                  <span className="text-teal-400 font-bold">From: </span>
                  {activeRide.pickupLocation?.address}
                </div>
                <div className="text-xs text-slate-300 truncate max-w-md">
                  <span className="text-rose-400 font-bold">To: </span>
                  {activeRide.dropLocation?.address}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <div className="text-right sm:block hidden">
                  <div className="text-[11px] font-bold text-emerald-400">Broadcasting</div>
                  <div className="text-[10px] text-slate-400">Simultaneous Alert</div>
                </div>
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-800/40 rounded-2xl border border-slate-800">
              No active ride booking. Book a ride from the customer app to trigger the 2km captain broadcast!
            </div>
          )}

          {/* Conflict Alert message if another captain accepted */}
          {conflictMessage && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{conflictMessage}</span>
            </div>
          )}

          {/* Section Heading */}
          <div className="flex items-center justify-between pt-1">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Captains within 2km ({captains.length} Active)
            </h4>
            <span className="text-[11px] text-teal-400 font-medium">
              Simultaneous Delivery
            </span>
          </div>

          {/* Captains Grid / Cards */}
          <div className="grid grid-cols-1 gap-3">
            {captains.map((captain) => {
              const isThisCaptainAccepted =
                acceptedCaptainId === captain.id ||
                activeRide?.driver?.name?.includes(captain.name.split(' ')[1] || 'xxx');
              const isOrderGoneForThisCaptain =
                hasCaptainAccepted && !isThisCaptainAccepted;

              return (
                <div
                  key={captain.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 relative ${
                    isThisCaptainAccepted
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : isOrderGoneForThisCaptain
                      ? 'bg-slate-900/40 border-slate-800 opacity-60'
                      : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Captain Profile */}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={captain.avatar}
                          alt={captain.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-teal-500 text-slate-950 text-[9px] font-black px-1.5 rounded-full">
                          ★{captain.rating}
                        </span>
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-2">
                          <span>{captain.name}</span>
                          <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                            {captain.plateNumber}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">{captain.vehicle}</div>
                        <div className="text-[11px] text-teal-400 font-semibold mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{captain.distanceKm} km away from pickup ({captain.etaMinutes} mins ETA)</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Area for this captain */}
                    <div className="shrink-0 text-right">
                      {isThisCaptainAccepted ? (
                        <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Order Won & Assigned!</span>
                        </div>
                      ) : isOrderGoneForThisCaptain ? (
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 font-semibold block">
                            Order Disappeared
                          </span>
                          <span className="text-[10px] text-slate-600">
                            Accepted by another captain
                          </span>
                        </div>
                      ) : isOrderActive ? (
                        <button
                          type="button"
                          disabled={acceptingId !== null}
                          onClick={() => handleAcceptByCaptain(captain)}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-glow flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {acceptingId === captain.id ? 'ACCEPTING...' : 'ACCEPT RIDE'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Idle / Waiting</span>
                      )}
                    </div>
                  </div>

                  {/* Incoming alert badge if searching */}
                  {isOrderActive && !hasCaptainAccepted && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-amber-300">
                        <Bell className="w-3.5 h-3.5 animate-bounce" />
                        <span>Incoming Ride Alert Ringing on this Captain's Phone...</span>
                      </div>
                      <span className="font-mono text-teal-300 font-bold">
                        ₹{activeRide.fareBreakdown?.totalFare}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>2km Radius Atomic Dispatch Engine • First-come first-served</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
