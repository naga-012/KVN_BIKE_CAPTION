import React, { useState, useEffect } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import api from '../services/api';
import { 
  History, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  IndianRupee, 
  ChevronRight,
  Filter,
  X
} from 'lucide-react';

export const RideHistoryPage = () => {
  const { captain } = useCaptainAuth();
  const [rides, setRides] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, COMPLETED, CANCELLED
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const cptId = captain?.id || captain?._id || captain?.code || 'cpt_a';
        const res = await api.get(`/captains/history?captainId=${cptId}`);
        if (res.success && res.rides) {
          setRides(res.rides);
        }
      } catch (err) {
        console.warn('Failed to fetch ride history:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [captain]);

  const filteredRides = rides.filter((r) => {
    if (filter === 'COMPLETED') return r.status === 'RIDE_COMPLETED';
    if (filter === 'CANCELLED') return r.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in">
      {/* Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Ride History</h2>
          <p className="text-xs text-slate-400">View past completed customer bookings and receipts</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-dark-800 p-1.5 rounded-2xl border border-dark-600/80">
          {['ALL', 'COMPLETED', 'CANCELLED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-brand-500 text-dark-900 shadow-glow-gold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Ride Cards List */}
      <div className="space-y-3">
        {filteredRides.length === 0 ? (
          <div className="bg-dark-800 rounded-3xl border border-dark-600 p-12 text-center text-slate-400 space-y-2">
            <History className="w-10 h-10 mx-auto text-slate-600" />
            <p className="font-bold text-white text-base">No rides found</p>
            <p className="text-xs">Completed rides will appear here automatically.</p>
          </div>
        ) : (
          filteredRides.map((ride) => {
            const isCompleted = ride.status === 'RIDE_COMPLETED';
            const fare = ride.fareBreakdown?.totalFare || 50;
            const earnings = ride.fareBreakdown?.driverEarning || Math.round(fare * 0.82);

            return (
              <div
                key={ride.id || ride._id}
                onClick={() => setSelectedRide(ride)}
                className="bg-dark-800 hover:bg-dark-750 p-4 md:p-5 rounded-3xl border border-dark-600/70 hover:border-brand-500/50 transition-all cursor-pointer shadow-md space-y-3"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-dark-600/60">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-300">
                      #{String(ride.id || ride._id).slice(-6).toUpperCase()}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="font-semibold text-brand-400 font-mono">
                      {ride.vehicleType || 'BIKE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{ride.status}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Route */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                    <span className="text-slate-300 truncate">{ride.pickupLocation?.address || 'Pickup Point'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                    <span className="text-slate-300 truncate">{ride.dropLocation?.address || 'Destination'}</span>
                  </div>
                </div>

                {/* Bottom Bar: Distance, Fare & Take Home */}
                <div className="flex items-center justify-between pt-2 text-xs text-slate-400 border-t border-dark-600/40">
                  <span>{ride.distanceKm || 3.2} KM</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-400">Total: ₹{fare}</span>
                    <span className="font-mono font-black text-brand-400 text-sm">
                      Earned: ₹{earnings}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Ride Detail Drawer / Modal */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-dark-800 border border-dark-600 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-dark-600/70 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Ride Details & Receipt</h3>
                <p className="text-xs text-slate-400 font-mono">
                  ID: #{String(selectedRide.id || selectedRide._id).slice(-8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedRide(null)}
                className="w-8 h-8 rounded-full bg-dark-700 hover:bg-dark-600 text-slate-400 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fare Summary Box */}
            <div className="bg-dark-900/80 p-4 rounded-2xl border border-dark-600 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase">Captain Net Earnings</p>
              <div className="flex items-center justify-center font-mono font-black text-brand-400 text-3xl mt-1">
                <IndianRupee className="w-6 h-6" />
                <span>{selectedRide.fareBreakdown?.driverEarning || Math.round((selectedRide.fareBreakdown?.totalFare || 50) * 0.82)}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs bg-dark-900/50 p-3.5 rounded-2xl border border-dark-600/50">
              <div className="flex justify-between text-slate-300">
                <span>Total Fare</span>
                <span className="font-mono font-bold text-white">₹{selectedRide.fareBreakdown?.totalFare || 50}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Vehicle Type</span>
                <span className="font-mono font-bold text-brand-400">{selectedRide.vehicleType || 'BIKE'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Payment Method</span>
                <span className="font-mono font-bold text-emerald-400">{selectedRide.paymentMethod || 'UPI'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Trip Distance</span>
                <span className="font-mono font-bold">{selectedRide.distanceKm || 3} KM</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedRide(null)}
              className="w-full py-3 rounded-xl bg-dark-700 hover:bg-dark-600 text-white font-bold text-xs uppercase"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideHistoryPage;
