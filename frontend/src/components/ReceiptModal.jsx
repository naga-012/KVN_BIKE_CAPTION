import React from 'react';
import { X, CheckCircle, Printer, Download, Car, Calendar, MapPin, ReceiptText } from 'lucide-react';

export const ReceiptModal = ({ isOpen, onClose, ride }) => {
  if (!isOpen || !ride) return null;

  const fare = ride.fareBreakdown || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">KVN Ride Invoice</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Body */}
        <div className="my-4 text-xs space-y-3.5">
          {/* Header metadata */}
          <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800">
            <div>
              <span className="font-semibold text-slate-300">Ride ID:</span> #{ride._id?.slice(-8)}
            </div>
            <div>
              {new Date(ride.createdAt || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-850 border border-slate-800">
            <div className="flex items-start gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400 mt-1 shrink-0"></div>
              <div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Pickup</div>
                <div className="text-slate-200 font-medium">{ride.pickupLocation?.address || 'Pickup Point'}</div>
              </div>
            </div>
            <div className="border-l-2 border-dashed border-slate-700 ml-1 h-3"></div>
            <div className="flex items-start gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0"></div>
              <div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Drop</div>
                <div className="text-slate-200 font-medium">{ride.dropLocation?.address || 'Drop Point'}</div>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[10px] text-slate-400">Total Distance</div>
              <div className="text-sm font-bold text-white">{ride.distanceKm} km</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="text-[10px] text-slate-400">Duration</div>
              <div className="text-sm font-bold text-white">{ride.durationMinutes} mins</div>
            </div>
          </div>

          {/* Itemized Fare */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex justify-between text-slate-400">
              <span>Base Fare</span>
              <span className="text-slate-200">₹{fare.baseFare || 0}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Distance Charge</span>
              <span className="text-slate-200">₹{fare.distanceCharge || 0}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Time Charge</span>
              <span className="text-slate-200">₹{fare.timeCharge || 0}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Booking & Platform Fee</span>
              <span className="text-slate-200">₹{fare.bookingFee || 0}</span>
            </div>
            {fare.nightCharge > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Night Charge</span>
                <span className="text-slate-200">₹{fare.nightCharge}</span>
              </div>
            )}
            {fare.discount > 0 && (
              <div className="flex justify-between text-emerald-400 font-medium">
                <span>Coupon Discount ({ride.couponCode})</span>
                <span>-₹{fare.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-400">
              <span>GST & Taxes (5%)</span>
              <span className="text-slate-200">₹{fare.taxes || 0}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm font-bold text-white">
              <span>Total Paid</span>
              <span className="text-base text-teal-400">₹{fare.totalFare || 0}</span>
            </div>
          </div>

          {/* Payment Status badge */}
          <div className="flex justify-between items-center pt-2 text-[11px]">
            <span className="text-slate-400">Payment Method:</span>
            <span className="font-bold text-slate-200 uppercase">{ride.paymentMethod}</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {ride.paymentStatus}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>Print Invoice</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center transition-all shadow-glow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
