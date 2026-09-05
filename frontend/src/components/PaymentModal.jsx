import React, { useState } from 'react';
import { X, CreditCard, Smartphone, Banknote, Wallet, ShieldCheck, CheckCircle2, Copy, Check } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const PaymentModal = ({ isOpen, onClose, ride, onPaymentSuccess, walletBalance = 0 }) => {
  const { addToast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState('UPI');
  const kvnUpiId = import.meta.env.VITE_KVN_UPI_ID || '9121792433@ybl';
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiId, setUpiId] = useState('9121792433@ybl');
  const [loading, setLoading] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  if (!isOpen || !ride) return null;

  const fareAmount = ride.fareBreakdown?.totalFare || 0;

  const handlePay = async () => {
    setLoading(true);
    try {
      if (selectedMethod === 'WALLET') {
        const res = await api.post('/payments/wallet', { rideId: ride._id });
        setPaidSuccess(true);
        addToast(res.message, 'success');
        setTimeout(() => {
          onPaymentSuccess(res.payment);
        }, 1200);
      } else if (selectedMethod === 'CASH') {
        const res = await api.post('/payments/verify', {
          rideId: ride._id,
          method: 'CASH',
          amount: fareAmount,
        });
        setPaidSuccess(true);
        addToast('Cash payment registered with driver!', 'success');
        setTimeout(() => {
          onPaymentSuccess(res.payment);
        }, 1200);
      } else {
        // UPI or Card simulation through backend verify endpoint
        const res = await api.post('/payments/verify', {
          rideId: ride._id,
          method: selectedMethod,
          amount: fareAmount,
          transactionId: 'TXN_' + Date.now().toString().slice(-8),
        });
        setPaidSuccess(true);
        addToast(`Payment of ₹${fareAmount} successful via ${selectedMethod}!`, 'success');
        setTimeout(() => {
          onPaymentSuccess(res.payment);
        }, 1200);
      }
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Payment Checkout</h3>
            <p className="text-xs text-slate-400">Select your preferred payment mode</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paidSuccess ? (
          <div className="py-12 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-white mb-1">Payment Successful!</h4>
            <p className="text-sm text-slate-400">₹{fareAmount} settled successfully.</p>
          </div>
        ) : (
          <>
            {/* Amount Banner */}
            <div className="my-5 p-4 rounded-xl bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Total Amount Due</span>
                <span className="text-2xl font-black text-white">₹{fareAmount}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-teal-400 font-semibold bg-teal-950/80 px-2.5 py-1 rounded-full border border-teal-500/30">
                  {ride.vehicleType} RIDE
                </span>
              </div>
            </div>

            {/* Payment Options */}
            <div className="space-y-2.5 mb-6">
              {/* UPI */}
              <label
                onClick={() => setSelectedMethod('UPI')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'UPI'
                    ? 'bg-teal-950/40 border-teal-500 text-white shadow-glow'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">UPI (GPay / PhonePe / Paytm)</div>
                    <div className="text-[11px] text-slate-400">Instant zero-fee transfer</div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={selectedMethod === 'UPI'}
                  onChange={() => setSelectedMethod('UPI')}
                  className="accent-teal-500 w-4 h-4"
                />
              </label>

              {/* UPI Details Card */}
              {selectedMethod === 'UPI' && (
                <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/40 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">KVN Merchant UPI ID:</span>
                    <span className="text-teal-400 font-mono font-bold text-xs bg-slate-900 px-2 py-0.5 rounded border border-teal-500/30">
                      {kvnUpiId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(kvnUpiId);
                        setCopiedUpi(true);
                        addToast(`Copied UPI ID: ${kvnUpiId}`, 'success');
                        setTimeout(() => setCopiedUpi(false), 2000);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy UPI ID</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`upi://pay?pa=${kvnUpiId}&pn=KVN%20Rides&am=${fareAmount}&cu=INR`}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <span>Pay via UPI App</span>
                    </a>
                  </div>
                </div>
              )}

              {/* KVN Wallet */}
              <label
                onClick={() => setSelectedMethod('WALLET')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'WALLET'
                    ? 'bg-teal-950/40 border-teal-500 text-white shadow-glow'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">KVN Wallet</div>
                    <div className="text-[11px] text-slate-400">
                      Balance: <span className="text-amber-400 font-bold">₹{walletBalance}</span>
                    </div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={selectedMethod === 'WALLET'}
                  onChange={() => setSelectedMethod('WALLET')}
                  className="accent-teal-500 w-4 h-4"
                />
              </label>

              {/* Card */}
              <label
                onClick={() => setSelectedMethod('CARD')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'CARD'
                    ? 'bg-teal-950/40 border-teal-500 text-white shadow-glow'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Credit / Debit Card</div>
                    <div className="text-[11px] text-slate-400">Visa, Mastercard, RuPay</div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={selectedMethod === 'CARD'}
                  onChange={() => setSelectedMethod('CARD')}
                  className="accent-teal-500 w-4 h-4"
                />
              </label>

              {/* Cash */}
              <label
                onClick={() => setSelectedMethod('CASH')}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === 'CASH'
                    ? 'bg-teal-950/40 border-teal-500 text-white shadow-glow'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Cash to Driver</div>
                    <div className="text-[11px] text-slate-400">Pay directly at drop location</div>
                  </div>
                </div>
                <input
                  type="radio"
                  name="payment"
                  checked={selectedMethod === 'CASH'}
                  onChange={() => setSelectedMethod('CASH')}
                  className="accent-teal-500 w-4 h-4"
                />
              </label>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm tracking-wide shadow-glow flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Processing...' : `PAY ₹${fareAmount} SECURELY`}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
