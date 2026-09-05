import React, { useState } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import api from '../services/api';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Radio, 
  RefreshCw, 
  ShieldCheck, 
  X,
  Zap
} from 'lucide-react';

export const ScenarioTestModal = ({ isOpen, onClose }) => {
  const { switchCaptain, addToast } = useCaptainAuth();
  const [scenario45Result, setScenario45Result] = useState(null);
  const [scenario46Result, setScenario46Result] = useState(null);
  const [loading45, setLoading45] = useState(false);
  const [loading46, setLoading46] = useState(false);

  if (!isOpen) return null;

  // Run Scenario 45 Test (2 KM Radius Simultaneous Broadcast)
  const runScenario45 = async () => {
    setLoading45(true);
    try {
      const res = await api.post('/captains/test-scenario/reset');
      if (res.success) {
        setScenario45Result(res);
        addToast('Scenario 45 Verified: Captains A, B, C, D within 2KM; E excluded!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to run Scenario 45 test', 'error');
    } finally {
      setLoading45(false);
    }
  };

  // Run Scenario 46 Test (Simultaneous Accept Race Condition Test)
  const runScenario46 = async () => {
    setLoading46(true);
    try {
      const res = await api.post('/captains/test-scenario/race-accept');
      if (res.success) {
        setScenario46Result(res);
        addToast('Scenario 46 Verified: Atomic lock prevented duplicate assignment!', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Failed to run Scenario 46 test', 'error');
    } finally {
      setLoading46(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-2xl bg-dark-800 border-2 border-indigo-500/60 rounded-3xl p-6 shadow-2xl space-y-6 my-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-600/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">KVN Captain — Automated Test Suite</h3>
              <p className="text-xs text-indigo-300 font-medium">Verify 2 KM Geospatial Dispatch & Atomic First-Accept-Wins</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-dark-700 hover:bg-dark-600 text-slate-400 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Scenario 45 (2 KM Radius Filter Test) */}
        <div className="bg-dark-900/70 border border-dark-600 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                Requirement #45
              </span>
              <h4 className="text-sm font-bold text-white mt-1">2 KM Radius Simultaneous Broadcast Test</h4>
              <p className="text-xs text-slate-400">
                Customer at BN Reddy Nagar. Tests 5 Captains: A (0.5km), B (0.8km), C (1.2km), D (1.7km), E (2.5km).
              </p>
            </div>
            <button
              onClick={runScenario45}
              disabled={loading45}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading45 ? 'animate-spin' : ''}`} />
              <span>{loading45 ? 'Testing...' : 'Test 2KM Radius'}</span>
            </button>
          </div>

          {scenario45Result && (
            <div className="mt-3 pt-3 border-t border-dark-600/70 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{scenario45Result.summary}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {/* Eligible A, B, C, D */}
                <div className="bg-dark-800 p-3 rounded-xl border border-emerald-500/20 space-y-1.5">
                  <p className="font-bold text-emerald-400 text-[11px] uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Eligible Captains (Within 2 KM)</span>
                  </p>
                  {scenario45Result.eligibleWithin2Km?.map((c) => (
                    <div key={c.code} className="flex items-center justify-between text-slate-200">
                      <span>{c.name}</span>
                      <span className="font-mono text-emerald-400 font-bold">{c.distanceKm} km</span>
                    </div>
                  ))}
                </div>

                {/* Excluded E */}
                <div className="bg-dark-800 p-3 rounded-xl border border-rose-500/20 space-y-1.5">
                  <p className="font-bold text-rose-400 text-[11px] uppercase flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Excluded (Beyond 2 KM)</span>
                  </p>
                  {scenario45Result.excludedOutside2Km?.map((c) => (
                    <div key={c.code} className="flex items-center justify-between text-slate-200">
                      <span>{c.name}</span>
                      <span className="font-mono text-rose-400 font-bold">{c.distanceKm} km (Excluded)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Scenario 46 (Atomic Race Condition Safeguard Test) */}
        <div className="bg-dark-900/70 border border-dark-600 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                Requirement #46
              </span>
              <h4 className="text-sm font-bold text-white mt-1">First-Accept-Wins Atomic Lock Test</h4>
              <p className="text-xs text-slate-400">
                Fires simultaneous accept requests from Captain A and Captain B to guarantee atomic assignment without race conditions.
              </p>
            </div>
            <button
              onClick={runScenario46}
              disabled={loading46}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-dark-900 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${loading46 ? 'animate-bounce' : ''}`} />
              <span>{loading46 ? 'Testing...' : 'Test Race Condition'}</span>
            </button>
          </div>

          {scenario46Result && (
            <div className="mt-3 pt-3 border-t border-dark-600/70 space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{scenario46Result.raceConditionSafeguard}</span>
              </div>

              <div className="bg-dark-800 p-3 rounded-xl border border-dark-600 space-y-2">
                <p className="font-bold text-white text-xs">Execution Breakdown:</p>
                {scenario46Result.results?.map((res, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      res.result === 'WON' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-rose-500/10 border border-rose-500/30'
                    }`}
                  >
                    <span className="font-semibold text-slate-200">{res.name}</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        res.result === 'WON' ? 'bg-emerald-500 text-dark-900' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {res.result === 'WON' ? 'HTTP 200 WON BOOKING' : 'HTTP 409 CONFLICT REJECTED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Quick 1-Click Driver Switcher */}
        <div className="bg-dark-900/50 p-4 rounded-2xl border border-dark-600/60 space-y-2">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Switch Current Driver Session:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              { code: 'cpt_a', label: 'Captain A (0.5km)' },
              { code: 'cpt_b', label: 'Captain B (0.8km)' },
              { code: 'cpt_c', label: 'Captain C (1.2km)' },
              { code: 'cpt_d', label: 'Captain D (1.7km)' },
              { code: 'cpt_e', label: 'Captain E (2.5km)' },
            ].map((d) => (
              <button
                key={d.code}
                onClick={() => {
                  switchCaptain(d.code);
                  onClose();
                }}
                className="p-2 rounded-xl bg-dark-700 hover:bg-brand-500 hover:text-dark-900 text-slate-300 font-semibold border border-dark-600 transition-all text-center"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioTestModal;
