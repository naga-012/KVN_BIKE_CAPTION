import React, { useState } from 'react';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import CaptainMap from '../components/CaptainMap';
import ActiveRideSheet from '../components/ActiveRideSheet';
import RideRequestModal from '../components/RideRequestModal';
import OtpVerificationModal from '../components/OtpVerificationModal';
import CaptainChatModal from '../components/CaptainChatModal';
import SafetyCenterModal from '../components/SafetyCenterModal';
import { 
  Power, 
  IndianRupee, 
  Clock, 
  CheckCircle, 
  Radio, 
  Sparkles, 
  MapPin, 
  ShieldCheck,
  TrendingUp,
  Navigation
} from 'lucide-react';

export const CaptainDashboard = ({ onOpenScenarioTest }) => {
  const { 
    captain, 
    isOnline, 
    isLocationActive,
    currentLocation,
    captainStatus, 
    toggleOnline, 
    activeRide, 
    incomingRequest, 
    setIncomingRequest 
  } = useCaptainAuth();

  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);

  return (
    <div className="relative flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden">
      {/* Interactive Map Area */}
      <div className="flex-1 relative w-full h-full">
        <CaptainMap 
          activeRide={activeRide} 
          incomingRequest={incomingRequest} 
        />
      </div>

      {/* Bottom Interface Container */}
      <div className="w-full z-30">
        {/* If an active ride exists, render the Active Ride Bottom Sheet */}
        {activeRide ? (
          <ActiveRideSheet
            ride={activeRide}
            onOpenOtpModal={() => setIsOtpModalOpen(true)}
            onOpenChat={() => setIsChatModalOpen(true)}
            onOpenSos={() => setIsSosModalOpen(true)}
          />
        ) : (
          /* When NOT on active trip: Show Online / Offline Bottom Card */
          <div className="bg-dark-800/95 backdrop-blur-md border-t border-dark-600 rounded-t-3xl shadow-2xl p-4 md:p-6 transition-all">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    <h3 className="font-extrabold text-base md:text-lg text-white">
                      {isOnline ? 'You are Online & Available' : 'You are Offline'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isOnline 
                      ? 'Listening for customer bookings within 2 KM radius...' 
                      : 'Turn on location and go online to receive nearby ride requests within 2 KM.'}
                  </p>
                  {/* GPS & 2KM Radius Status Badge */}
                  <div className="mt-2 flex items-center gap-2">
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        Exact GPS ({currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}) • 2 KM Radius Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-500/30">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        GPS Location Required to Go Online
                      </span>
                    )}
                  </div>
                </div>

                {/* Go Online / Go Offline Primary Button */}
                <button
                  onClick={() => toggleOnline()}
                  className={`px-6 py-3.5 rounded-2xl font-black text-xs md:text-sm tracking-wider uppercase transition-all shadow-lg flex items-center gap-2 shrink-0 ${
                    isOnline
                      ? 'bg-dark-700 hover:bg-dark-600 text-slate-300 border border-dark-600'
                      : 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 text-dark-900 shadow-glow-gold'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{isOnline ? 'GO OFFLINE' : 'GO ONLINE'}</span>
                </button>
              </div>

              {/* Quick Metrics Bar: Today's Earnings, Completed Trips, Hours */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {/* Today's Earnings */}
                <div className="bg-dark-900/70 p-3 rounded-2xl border border-dark-600/70 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Today's Earnings</p>
                  <div className="flex items-center justify-center font-mono font-black text-brand-400 text-lg md:text-xl mt-0.5">
                    <IndianRupee className="w-4 h-4" />
                    <span>{captain?.todayEarnings || 850}</span>
                  </div>
                </div>

                {/* Completed Trips */}
                <div className="bg-dark-900/70 p-3 rounded-2xl border border-dark-600/70 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Completed Trips</p>
                  <div className="font-mono font-black text-emerald-400 text-lg md:text-xl mt-0.5">
                    {captain?.totalRides || 8}
                  </div>
                </div>

                {/* Online Hours */}
                <div className="bg-dark-900/70 p-3 rounded-2xl border border-dark-600/70 text-center">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Online Hours</p>
                  <div className="font-mono font-black text-slate-200 text-lg md:text-xl mt-0.5">
                    {captain?.onlineHoursToday || 5.4}h
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incoming Ride Request Modal (Simultaneous 2KM Broadcast) */}
      {incomingRequest && (
        <RideRequestModal
          request={incomingRequest}
          onClose={() => setIncomingRequest(null)}
        />
      )}

      {/* OTP Verification Modal */}
      {isOtpModalOpen && activeRide && (
        <OtpVerificationModal
          ride={activeRide}
          isOpen={isOtpModalOpen}
          onClose={() => setIsOtpModalOpen(false)}
        />
      )}

      {/* Chat Modal */}
      {isChatModalOpen && activeRide && (
        <CaptainChatModal
          ride={activeRide}
          isOpen={isChatModalOpen}
          onClose={() => setIsChatModalOpen(false)}
        />
      )}

      {/* Safety SOS Modal */}
      {isSosModalOpen && (
        <SafetyCenterModal
          ride={activeRide}
          isOpen={isSosModalOpen}
          onClose={() => setIsSosModalOpen(false)}
        />
      )}
    </div>
  );
};

export default CaptainDashboard;
