import React, { useState, useEffect } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import api from '../services/api';
import { 
  IndianRupee, 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Award, 
  ArrowUpRight,
  Wallet
} from 'lucide-react';

export const EarningsPage = () => {
  const { captain } = useCaptainAuth();
  const [stats, setStats] = useState(null);
  const [recentEarnings, setRecentEarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const cptId = captain?.id || captain?._id || captain?.code || 'cpt_a';
        const res = await api.get(`/captains/earnings?captainId=${cptId}`);
        if (res.success) {
          setStats(res.stats);
          setRecentEarnings(res.recentEarnings || []);
        }
      } catch (err) {
        console.warn('Failed to fetch earnings:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, [captain]);

  const today = stats?.todayEarnings || captain?.todayEarnings || 850;
  const weekly = stats?.weeklyEarnings || captain?.weeklyEarnings || 5420;
  const monthly = stats?.monthlyEarnings || captain?.monthlyEarnings || 21800;
  const rides = stats?.completedRides || captain?.totalRides || 8;
  const hours = stats?.onlineHours || captain?.onlineHoursToday || 5.4;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Earnings Dashboard</h2>
          <p className="text-xs text-slate-400">Track your daily income, trip commissions, and payouts</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs">
          <Award className="w-4 h-4" />
          <span>KVN Gold Partner</span>
        </div>
      </div>

      {/* Main Income Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today */}
        <div className="bg-gradient-to-br from-dark-800 to-dark-700/80 p-5 rounded-3xl border border-brand-500/40 shadow-glow-gold relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-400">Today's Earnings</span>
            <span className="p-1.5 rounded-xl bg-brand-500/10 text-brand-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-mono font-black text-white text-3xl md:text-4xl mt-3">
            <IndianRupee className="w-7 h-7 text-brand-400" />
            <span>{today}</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-2 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14% from yesterday</span>
          </p>
        </div>

        {/* This Week */}
        <div className="bg-dark-800 p-5 rounded-3xl border border-dark-600 shadow-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">This Week</span>
            <span className="p-1.5 rounded-xl bg-dark-700 text-slate-300">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-mono font-black text-white text-3xl md:text-4xl mt-3">
            <IndianRupee className="w-7 h-7 text-slate-400" />
            <span>{weekly}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">7 days rolling total</p>
        </div>

        {/* This Month */}
        <div className="bg-dark-800 p-5 rounded-3xl border border-dark-600 shadow-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">This Month</span>
            <span className="p-1.5 rounded-xl bg-dark-700 text-slate-300">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-mono font-black text-white text-3xl md:text-4xl mt-3">
            <IndianRupee className="w-7 h-7 text-slate-400" />
            <span>{monthly}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Payout every Tuesday</p>
        </div>
      </div>

      {/* Performance Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-dark-800/80 p-4 rounded-2xl border border-dark-600/70 text-center">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Completed Trips</p>
          <p className="text-2xl font-black text-white font-mono mt-1">{rides}</p>
        </div>

        <div className="bg-dark-800/80 p-4 rounded-2xl border border-dark-600/70 text-center">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Online Hours</p>
          <p className="text-2xl font-black text-white font-mono mt-1">{hours}h</p>
        </div>

        <div className="bg-dark-800/80 p-4 rounded-2xl border border-dark-600/70 text-center">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Average Fare</p>
          <p className="text-2xl font-black text-white font-mono mt-1">₹78</p>
        </div>

        <div className="bg-dark-800/80 p-4 rounded-2xl border border-dark-600/70 text-center">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">KVN Commission</p>
          <p className="text-2xl font-black text-brand-400 font-mono mt-1">18%</p>
        </div>
      </div>

      {/* Recent Trips Earnings Breakdown */}
      <div className="bg-dark-800 rounded-3xl border border-dark-600 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Trip-Wise Earnings History</h3>
          <span className="text-xs text-slate-400">Showing recent credited rides</span>
        </div>

        {recentEarnings.length === 0 ? (
          <div className="space-y-2">
            {[
              { id: 'KVN-8412', time: '11:42 AM', type: 'BIKE', distance: '4.2 km', total: '₹65', earning: '₹53' },
              { id: 'KVN-8395', time: '10:15 AM', type: 'BIKE', distance: '8.5 km', total: '₹115', earning: '₹94' },
              { id: 'KVN-8380', time: '09:05 AM', type: 'BIKE', distance: '2.1 km', total: '₹40', earning: '₹33' },
              { id: 'KVN-8362', time: '08:10 AM', type: 'BIKE', distance: '12.0 km', total: '₹160', earning: '₹131' },
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-dark-900/60 border border-dark-600/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-white">{item.id} • {item.type}</p>
                    <p className="text-[11px] text-slate-400">{item.time} • {item.distance}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-400 text-sm font-mono">+{item.earning}</p>
                  <p className="text-[10px] text-slate-500">Fare {item.total}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {recentEarnings.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-dark-900/60 border border-dark-600/60 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-white">{r.vehicleType || 'BIKE'} Ride</p>
                    <p className="text-[11px] text-slate-400">{r.distanceKm} km • {r.paymentMethod}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-400 text-sm font-mono">+₹{r.amount}</p>
                  <p className="text-[10px] text-slate-500">Fare ₹{r.totalFare}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EarningsPage;
