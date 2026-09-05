import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { MapView } from '../components/MapView';
import { RideChatModal } from '../components/RideChatModal';
import { SafetyModal } from '../components/SafetyModal';
import { PaymentModal } from '../components/PaymentModal';
import { RatingModal } from '../components/RatingModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { LocationSearchInput } from '../components/LocationSearchInput';
import { CaptainsNetworkModal } from '../components/CaptainsNetworkModal';
import {
  Bike,
  Navigation,
  MapPin,
  Clock,
  Shield,
  Phone,
  MessageSquare,
  AlertTriangle,
  Wallet,
  History,
  Tag,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Plus,
  Send,
  Lock,
  PlayCircle,
  CheckCircle,
  Radio,
  Bell,
  Zap,
} from 'lucide-react';

// Preset popular Telangana destinations for quick 1-click testing
const QUICK_DESTINATIONS = [
  { name: 'BN Reddy Nagar Bus Stop', lat: 17.3228, lng: 78.5630, tag: 'Bus Stop' },
  { name: 'BIET College (Bharat Institute), Ibrahimpatnam', lat: 17.1895, lng: 78.6534, tag: 'College' },
  { name: 'Hitec City Cyber Towers, Hyderabad', lat: 17.4504, lng: 78.3808, tag: 'IT Hub' },
  { name: 'Gachibowli Financial District, Hyderabad', lat: 17.4401, lng: 78.3489, tag: 'Work' },
  { name: 'Charminar, Old City, Hyderabad', lat: 17.3616, lng: 78.4747, tag: 'Heritage' },
  { name: 'Secunderabad Railway Station', lat: 17.4344, lng: 78.5013, tag: 'Transit' },
  { name: 'Rajiv Gandhi Int. Airport (RGIA), Shamshabad', lat: 17.2403, lng: 78.4294, tag: 'Airport' },
  { name: 'Kakatiya Fort, Warangal, Telangana', lat: 17.9689, lng: 79.5941, tag: 'Warangal' },
];

export const CustomerApp = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Customer Navigation Tab: 'BOOKING' | 'HISTORY' | 'WALLET' | 'SUPPORT'
  const [activeTab, setActiveTab] = useState('BOOKING');


  // Booking locations (Telangana - defaults to BN Reddy Bus Stop & BIET College)
  const [pickup, setPickup] = useState({
    address: 'BN Reddy Nagar Bus Stop, Hyderabad, Telangana',
    lat: 17.3228,
    lng: 78.5630,
  });
  const [drop, setDrop] = useState({
    address: 'BIET College (Bharat Institute), Ibrahimpatnam, Telangana',
    lat: 17.1895,
    lng: 78.6534,
  });

  // Selected vehicle & estimates
  const [vehicleType, setVehicleType] = useState('BIKE'); // 'BIKE' | 'AUTO' | 'CAB'
  const [estimates, setEstimates] = useState(null);
  const [estimatesLoading, setEstimatesLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  // Active Ride state
  const [activeRide, setActiveRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSafetyOpen, setIsSafetyOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isCaptainsModalOpen, setIsCaptainsModalOpen] = useState(false);
  const [completedRideData, setCompletedRideData] = useState(null);

  // Wallet & History
  const [wallet, setWallet] = useState({ balance: 350, promotionalBalance: 50 });
  const [topupAmount, setTopupAmount] = useState(200);
  const [historyRides, setHistoryRides] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Support
  const [supportCategory, setSupportCategory] = useState('RIDE_ISSUE');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDesc, setSupportDesc] = useState('');
  const [myTickets, setMyTickets] = useState([]);

  // Fetch fare estimates from Python FastAPI
  const fetchEstimates = async () => {
    if (!pickup?.lat || !drop?.lat) return;
    setEstimatesLoading(true);
    try {
      const res = await api.post('/rides/estimate', {
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
        couponCode: couponCode.trim() || undefined,
      });
      setEstimates(res.estimates);
      setAppliedCoupon(res.appliedCoupon);
    } catch (err) {
      console.error('Fare estimate error:', err);
    } finally {
      setEstimatesLoading(false);
    }
  };

  // Auto-detect customer GPS location on mount if available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          console.log('[CustomerApp] Auto-detected customer GPS location:', lat, lng);
          setPickup((prev) => ({
            ...prev,
            lat,
            lng,
            address: prev.address === 'BN Reddy Nagar Bus Stop, Hyderabad, Telangana' ? 'Current Location' : prev.address
          }));
        },
        (err) => {
          console.log('[CustomerApp] Geolocation fallback to default:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    }
  }, []);

  useEffect(() => {
    fetchEstimates();
  }, [pickup, drop]);

  // Periodic polling for active ride status updates from backend
  useEffect(() => {
    if (!activeRide?._id || activeRide.status === 'RIDE_COMPLETED' || activeRide.status === 'CANCELLED') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/rides/${activeRide._id}`);
        if (res.ride) {
          const prevStatus = activeRide.status;
          setActiveRide(res.ride);

          if (res.ride.driverLiveLocation) {
            setDriverLocation(res.ride.driverLiveLocation);
          }

          if (prevStatus === 'SEARCHING_DRIVER' && res.ride.status === 'DRIVER_ASSIGNED') {
            addToast('Driver Partner Suresh Kumar assigned! On the way.', 'success');
          } else if (prevStatus !== 'DRIVER_ARRIVED' && res.ride.status === 'DRIVER_ARRIVED') {
            addToast('Driver has arrived at your pickup location!', 'info');
          } else if (prevStatus !== 'RIDE_STARTED' && res.ride.status === 'RIDE_STARTED') {
            addToast('Trip started! Have a safe journey.', 'success');
          } else if (res.ride.status === 'RIDE_COMPLETED' && prevStatus !== 'RIDE_COMPLETED') {
            setCompletedRideData(res.ride);
            setIsPaymentOpen(true);
            addToast('Reached destination! Complete payment.', 'success');
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeRide?._id, activeRide?.status]);

  // Fetch Wallet & History when tabs change
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'WALLET') {
      api.get('/wallet').then((res) => setWallet(res.wallet)).catch(console.error);
    }
    if (activeTab === 'HISTORY') {
      setHistoryLoading(true);
      api.get('/rides/my-rides')
        .then((res) => setHistoryRides(res.rides))
        .catch(console.error)
        .finally(() => setHistoryLoading(false));
    }
    if (activeTab === 'SUPPORT') {
      api.get('/support/my-tickets').then((res) => setMyTickets(res.tickets)).catch(console.error);
    }
  }, [activeTab, user]);

  // Request Ride
  const handleConfirmRide = async () => {
    if (!user) {
      addToast('Please login to book a ride', 'info');
      return;
    }
    setBookingLoading(true);
    try {
      const res = await api.post('/rides', {
        source: 'KVN_BIKE_BOOKING',
        pickupLocation: pickup,
        dropLocation: drop,
        vehicleType,
        couponCode: couponCode || undefined,
        paymentMethod,
        customerName: user?.name || user?.email || 'KVN Customer',
        customerPhone: user?.phone || '',
      });

      setActiveRide(res.ride);
      addToast('Searching for nearby KVN drivers...', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel Ride
  const handleCancelRide = async () => {
    if (!activeRide) return;
    try {
      await api.post(`/rides/${activeRide._id}/cancel`);
      setActiveRide(null);
      setDriverLocation(null);
      addToast('Ride cancelled', 'info');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Advance Ride Status (Simulate Trip Progression)
  const handleAdvanceStatus = async () => {
    if (!activeRide) return;
    try {
      const res = await api.post(`/rides/${activeRide._id}/advance-status`);
      addToast(`Trip advanced to: ${res.status}`, 'info');
      const updated = await api.get(`/rides/${activeRide._id}`);
      setActiveRide(updated.ride);
      if (res.status === 'RIDE_COMPLETED') {
        setCompletedRideData(updated.ride);
        setIsPaymentOpen(true);
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Wallet Topup
  const handleTopup = async () => {
    try {
      const res = await api.post('/wallet/topup', { amount: topupAmount });
      setWallet(res.wallet);
      addToast(res.message, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  // Create Support Ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!supportSubject || !supportDesc) {
      addToast('Subject and description are required', 'error');
      return;
    }
    try {
      const res = await api.post('/support/tickets', {
        category: supportCategory,
        subject: supportSubject,
        description: supportDesc,
        rideId: activeRide?._id,
      });
      setMyTickets([res.ticket, ...myTickets]);
      setSupportSubject('');
      setSupportDesc('');
      addToast('Support ticket submitted. KVN Helpdesk is on it!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-65px)] flex flex-col bg-slate-950 text-slate-100">

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Left: Interactive Map Container */}
        <div className="flex-1 relative min-h-[380px] md:min-h-full">
          <MapView
            pickup={pickup}
            drop={drop}
            driverLocation={driverLocation || activeRide?.driverLiveLocation}
            vehicleType={activeRide?.vehicleType || vehicleType}
            nearbyCaptains={activeRide?.status === 'SEARCHING_DRIVER' ? (activeRide.broadcastCaptains || []) : []}
            className="w-full h-full"
            onMapClick={(coords) => {
              if (!activeRide) {
                setDrop({
                  address: `Selected Pin (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
                  lat: coords.lat,
                  lng: coords.lng,
                });
                addToast('Drop location updated from map pin', 'info');
              }
            }}
          />
        </div>

        {/* Right: Customer Control Suite */}
        <div className="w-full md:w-[460px] bg-slate-900/95 backdrop-blur-xl border-t md:border-t-0 md:border-l border-slate-800 flex flex-col max-h-[calc(100vh-65px)] shadow-2xl z-30">
          {/* Sub Navigation Bar */}
          <div className="flex items-center justify-around border-b border-slate-800 px-2 py-2 bg-slate-850 shrink-0 text-xs">
            <button
              onClick={() => setActiveTab('BOOKING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'BOOKING' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Book Ride</span>
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'HISTORY' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Rides</span>
            </button>
            <button
              onClick={() => setActiveTab('WALLET')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'WALLET' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Wallet</span>
            </button>
            <button
              onClick={() => setActiveTab('SUPPORT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'SUPPORT' ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Support</span>
            </button>
          </div>

          {/* TAB 1: RIDE BOOKING & ACTIVE TRIP LIFECYCLE */}
          {activeTab === 'BOOKING' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* STATE 1: SEARCHING DRIVER PULSE */}
              {activeRide?.status === 'SEARCHING_DRIVER' && (
                <div className="p-6 rounded-2xl bg-gradient-to-b from-teal-950/40 to-slate-900 border border-teal-500/30 text-center animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-4 pulse-radar border border-teal-500/40">
                    <Navigation className="w-8 h-8 animate-spin" />
                  </div>
                  <h3 className="text-lg font-extrabold text-white">Connecting with Nearby Drivers...</h3>
                  <p className="text-xs text-teal-300 font-semibold mt-1 max-w-xs mx-auto">
                    Customer booking goes 2km radius only
                  </p>
                  <div className="mt-4 inline-flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full text-xs text-teal-300 font-semibold border border-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Estimated Fare: ₹{activeRide.fareBreakdown?.totalFare}</span>
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2.5">
                    <button
                      onClick={handleCancelRide}
                      className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-rose-400 text-xs font-bold transition-all"
                    >
                      Cancel Search
                    </button>
                    <button
                      onClick={handleAdvanceStatus}
                      className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all"
                    >
                      Fast-Track Match ⚡
                    </button>
                  </div>

                  {/* Open Captains App Simulator Button */}
                  <button
                    type="button"
                    onClick={() => setIsCaptainsModalOpen(true)}
                    className="mt-3 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-teal-500/20 border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer hover:bg-slate-800/80"
                  >
                    <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Open Captains App (Simultaneous 2km Alerts)</span>
                  </button>

                  {/* Active Captains Alerting within 2km */}
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-left">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        Alerting Captains within 2km
                      </span>
                      <span className="text-teal-400 text-[10px] font-mono">Live Broadcast</span>
                    </div>
                    <div className="space-y-1.5">
                      {(activeRide.broadcastCaptains && activeRide.broadcastCaptains.length > 0 ? activeRide.broadcastCaptains : [
                        { name: 'Captain Ramesh Yadav', vehicle: 'Honda Activa (Bike)', distanceKm: 0.52 },
                        { name: 'Captain Shiva Kumar', vehicle: 'Bajaj RE (Auto)', distanceKm: 0.88 },
                        { name: 'Captain Venkat Reddy', vehicle: 'Swift Dzire (Cab)', distanceKm: 1.24 },
                      ]).slice(0, 3).map((cap, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🔔</span>
                            <div>
                              <div className="font-bold text-white leading-tight">{cap.name}</div>
                              <div className="text-[10px] text-slate-400">{cap.vehicle}</div>
                            </div>
                          </div>
                          <span className="text-[11px] text-teal-400 font-semibold">{cap.distanceKm} km away</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STATE 2: DRIVER ASSIGNED / ARRIVED / ACTIVE TRIP */}
              {activeRide && activeRide.status !== 'SEARCHING_DRIVER' && activeRide.status !== 'RIDE_COMPLETED' && (
                <div className="p-5 rounded-2xl bg-slate-850 border border-teal-500/30 space-y-4 animate-fade-in shadow-xl">
                  {/* Status banner */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-extrabold tracking-widest text-teal-400 uppercase">
                        {activeRide.status === 'DRIVER_ASSIGNED' && 'Driver On The Way'}
                        {activeRide.status === 'DRIVER_ARRIVED' && 'Driver Has Arrived!'}
                        {activeRide.status === 'RIDE_STARTED' && 'Active Ride In Progress'}
                      </span>
                      <h4 className="text-base font-black text-white">
                        {activeRide.status === 'DRIVER_ARRIVED' ? 'Share OTP with Driver' : 'Trip in Progress'}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-teal-400">
                        {activeRide.vehicleType} RIDE
                      </span>
                    </div>
                  </div>

                  {/* 4-DIGIT SECURE RIDE OTP CARD */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 border border-amber-500/40 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>RIDE START OTP</span>
                      </div>
                      <div className="text-xs text-slate-400">Share with driver to begin your journey</div>
                    </div>
                    <div className="px-4 py-2 rounded-xl bg-slate-900 border border-amber-400/60 font-black text-2xl tracking-widest text-amber-400 shadow-glow">
                      {activeRide.otp || '5821'}
                    </div>
                  </div>

                  {/* Assigned Driver Card */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
                        alt="Driver"
                        className="w-12 h-12 rounded-full border border-teal-500/40 object-cover"
                      />
                      <div>
                        <div className="font-bold text-white text-sm">Suresh Kumar</div>
                        <div className="text-xs text-slate-400 font-medium">Honda Activa 6G • <span className="text-teal-400 font-bold">KA 03 ER 4589</span></div>
                        <div className="text-[11px] text-amber-400 font-semibold">★ 4.88 (48 ratings)</div>
                      </div>
                    </div>
                  </div>

                  {/* Trip Progression Simulation Bar */}
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <PlayCircle className="w-4 h-4 text-teal-400" />
                      <span>Simulate Ride Progress:</span>
                    </span>
                    <button
                      onClick={handleAdvanceStatus}
                      className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all shadow-glow"
                    >
                      {activeRide.status === 'DRIVER_ASSIGNED' && 'Driver Arrive'}
                      {activeRide.status === 'DRIVER_ARRIVED' && 'Start Ride'}
                      {activeRide.status === 'RIDE_STARTED' && 'Complete Ride'}
                    </button>
                  </div>

                  {/* Action Buttons: Call, Chat, Safety SOS, Cancel */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <a
                      href="tel:9888800001"
                      className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-[10px] font-semibold transition-colors"
                    >
                      <Phone className="w-4 h-4 text-emerald-400 mb-1" />
                      <span>Call</span>
                    </a>
                    <button
                      onClick={() => setIsChatOpen(true)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-[10px] font-semibold transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-teal-400 mb-1" />
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={() => setIsSafetyOpen(true)}
                      className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-[10px] font-semibold transition-colors"
                    >
                      <Shield className="w-4 h-4 text-rose-400 mb-1" />
                      <span>Safety SOS</span>
                    </button>
                    <button
                      onClick={handleCancelRide}
                      className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-[10px] font-semibold transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4 mb-1" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 0: DEFAULT BOOKING CONTROLS */}
              {(!activeRide || activeRide.status === 'RIDE_COMPLETED') && (
                <>
                  {/* Locations Input Card with Google Places Autocomplete */}
                  <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3 relative">
                    <LocationSearchInput
                      label="Pickup Location"
                      dotColor="teal"
                      placeholder="Search pickup (e.g. BN Reddy Bus Stop, Hitec City)..."
                      location={pickup}
                      onSelectLocation={(loc) => {
                        setPickup(loc);
                        addToast(`Pickup set to ${loc.address.split(',')[0]}`, 'info');
                      }}
                      onUseCurrentLocation={() => {
                        if (navigator.geolocation) {
                          addToast('Detecting current GPS location...', 'info');
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setPickup({
                                address: 'Current Location (GPS Detected, Hyderabad)',
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                              });
                              addToast('Updated pickup to your current location!', 'success');
                            },
                            () => {
                              addToast('Could not access GPS. Please type or select from suggestions.', 'error');
                            }
                          );
                        }
                      }}
                    />

                    {/* Swap Button */}
                    <div className="flex justify-end pr-1 -my-1">
                      <button
                        type="button"
                        onClick={() => {
                          const temp = { ...pickup };
                          setPickup({ ...drop });
                          setDrop(temp);
                          addToast('Swapped pickup and destination locations', 'info');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-teal-400 border border-slate-700/60 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        title="Swap Pickup & Destination"
                      >
                        <span>⇅ Swap</span>
                      </button>
                    </div>

                    <LocationSearchInput
                      label="Destination Drop"
                      dotColor="rose"
                      placeholder="Search drop (e.g. BIET College, Charminar)..."
                      location={drop}
                      onSelectLocation={(loc) => {
                        setDrop(loc);
                        addToast(`Destination set to ${loc.address.split(',')[0]}`, 'info');
                      }}
                    />
                  </div>

                  {/* Preset Quick Destinations */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 mb-2">Popular Telangana Destinations</div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_DESTINATIONS.map((dest, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setDrop({ address: dest.name, lat: dest.lat, lng: dest.lng })}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 text-[11px] text-slate-300 hover:text-teal-400 transition-colors"
                        >
                          {dest.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle Categories: Bike, Auto, Cab */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                      <span>Available Rides</span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {estimates ? `${estimates.BIKE?.distanceKm} km • ~${estimates.BIKE?.durationMinutes} mins` : 'Estimating...'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {/* BIKE */}
                      <div
                        onClick={() => setVehicleType('BIKE')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          vehicleType === 'BIKE'
                            ? 'bg-gradient-to-r from-teal-950/50 to-slate-900 border-teal-500 text-white shadow-glow'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold">
                            🛵
                          </div>
                          <div>
                            <div className="font-extrabold text-sm flex items-center gap-2">
                              <span>KVN Bike</span>
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-semibold">Fastest</span>
                            </div>
                            <div className="text-[11px] text-slate-400">Beat city traffic • 1 Person</div>
                            <div className="text-[10px] text-teal-400 font-semibold mt-0.5">
                              ETA {estimates?.BIKE?.etaMinutes || 3} mins away
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-white">
                            ₹{estimates?.BIKE?.fare?.totalFare || 81}
                          </div>
                        </div>
                      </div>

                      {/* AUTO */}
                      <div
                        onClick={() => setVehicleType('AUTO')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          vehicleType === 'AUTO'
                            ? 'bg-gradient-to-r from-teal-950/50 to-slate-900 border-teal-500 text-white shadow-glow'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">
                            🛺
                          </div>
                          <div>
                            <div className="font-extrabold text-sm flex items-center gap-2">
                              <span>KVN Auto</span>
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Popular</span>
                            </div>
                            <div className="text-[11px] text-slate-400">Pocket friendly • 3 Persons</div>
                            <div className="text-[10px] text-teal-400 font-semibold mt-0.5">
                              ETA {estimates?.AUTO?.etaMinutes || 2} mins away
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-white">
                            ₹{estimates?.AUTO?.fare?.totalFare || 124}
                          </div>
                        </div>
                      </div>

                      {/* CAB */}
                      <div
                        onClick={() => setVehicleType('CAB')}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          vehicleType === 'CAB'
                            ? 'bg-gradient-to-r from-teal-950/50 to-slate-900 border-teal-500 text-white shadow-glow'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-bold">
                            🚕
                          </div>
                          <div>
                            <div className="font-extrabold text-sm flex items-center gap-2">
                              <span>KVN Cab AC</span>
                              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-semibold">AC Comfort</span>
                            </div>
                            <div className="text-[11px] text-slate-400">Chilled AC hatchback • 4 Persons</div>
                            <div className="text-[10px] text-teal-400 font-semibold mt-0.5">
                              ETA {estimates?.CAB?.etaMinutes || 4} mins away
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-white">
                            ₹{estimates?.CAB?.fare?.totalFare || 186}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Promo Code Input */}
                  <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-teal-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Promo code (KVN50 / FIRST20 / BIKE10)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none uppercase font-bold"
                    />
                    <button
                      type="button"
                      onClick={fetchEstimates}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 text-xs font-bold transition-all"
                    >
                      Apply
                    </button>
                  </div>

                  {appliedCoupon && (
                    <div className="text-xs text-emerald-400 flex items-center gap-1.5 px-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Coupon Applied: {appliedCoupon.code}</span>
                    </div>
                  )}

                  {/* Payment Method Selector */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2 text-slate-300 font-semibold">
                      <CreditCard className="w-4 h-4 text-teal-400" />
                      <span>Payment Method:</span>
                    </div>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:outline-none"
                    >
                      <option value="UPI">UPI (GPay/PhonePe)</option>
                      <option value="WALLET">KVN Wallet (₹{wallet.balance})</option>
                      <option value="CASH">Cash to Driver</option>
                      <option value="CARD">Credit/Debit Card</option>
                    </select>
                  </div>

                  {/* BOOK RIDE BUTTON */}
                  <button
                    onClick={handleConfirmRide}
                    disabled={bookingLoading || estimatesLoading}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-400 hover:from-teal-400 hover:to-teal-300 text-slate-950 font-black text-sm tracking-wider shadow-glow flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                  >
                    <span>{bookingLoading ? 'DISPATCHING...' : `CONFIRM ${vehicleType} RIDE`}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <div className="text-center text-[11px] text-teal-400 font-semibold py-0.5">
                    Customer booking goes 2km radius only
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: RIDE HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-white mb-2">Past Trips</h3>
              {historyLoading ? (
                <div className="text-center py-12 text-slate-500 text-xs">Loading rides...</div>
              ) : historyRides.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">No rides taken yet.</div>
              ) : (
                historyRides.map((ride) => (
                  <div
                    key={ride._id || ride.id}
                    className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-white uppercase">{ride.vehicleType}</span>
                        <div className="text-[10px] text-slate-400">
                          {new Date(ride.createdAt || Date.now()).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-white">₹{ride.fareBreakdown?.totalFare}</span>
                        <span className="block text-[10px] font-bold text-emerald-400">{ride.status}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-300">
                      <div className="truncate">From: {ride.pickupLocation?.address}</div>
                      <div className="truncate">To: {ride.dropLocation?.address}</div>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="text-[11px] text-slate-400 font-medium">{ride.distanceKm} km • {ride.durationMinutes} mins</span>
                      <button
                        onClick={() => {
                          setCompletedRideData(ride);
                          setIsReceiptOpen(true);
                        }}
                        className="text-[11px] text-teal-400 hover:underline font-bold"
                      >
                        View Invoice
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: WALLET */}
          {activeTab === 'WALLET' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-900/60 to-slate-900 border border-teal-500/40 shadow-xl">
                <span className="text-xs text-slate-400 font-semibold block">KVN Wallet Balance</span>
                <div className="text-3xl font-black text-white mt-1">₹{wallet.balance}</div>
                <div className="text-xs text-amber-400 font-medium mt-1">
                  Includes ₹{wallet.promotionalBalance || 50} promotional cash
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white">Topup KVN Balance</h4>
                <div className="flex gap-2">
                  {[100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopupAmount(amt)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        topupAmount === amt
                          ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleTopup}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-glow transition-all"
                >
                  ADD ₹{topupAmount} TO WALLET
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SUPPORT */}
          {activeTab === 'SUPPORT' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-white">Help & Customer Support</h3>
              <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Issue Category</label>
                  <select
                    value={supportCategory}
                    onChange={(e) => setSupportCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="RIDE_ISSUE">Ride Issue</option>
                    <option value="PAYMENT_ISSUE">Payment / Billing</option>
                    <option value="DRIVER_ISSUE">Driver Behavior</option>
                    <option value="LOST_ITEM">Lost & Found Item</option>
                    <option value="SAFETY">Safety Concern</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of the issue"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Description</label>
                  <textarea
                    rows="3"
                    required
                    placeholder="Describe what happened..."
                    value={supportDesc}
                    onChange={(e) => setSupportDesc(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-glow"
                >
                  SUBMIT TICKET
                </button>
              </form>

              {myTickets.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300">Your Recent Tickets</h4>
                  {myTickets.map((t) => (
                    <div key={t._id || t.ticketNumber} className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs">
                      <div className="flex justify-between font-bold text-white">
                        <span>{t.ticketNumber}</span>
                        <span className="text-teal-400">{t.status}</span>
                      </div>
                      <div className="text-slate-400 mt-1">{t.subject}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <RideChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        rideId={activeRide?._id}
        currentUser={user || { id: 'cust1', name: 'Customer', role: 'CUSTOMER' }}
        partnerName="Suresh Kumar (Driver Partner)"
      />

      <SafetyModal
        isOpen={isSafetyOpen}
        onClose={() => setIsSafetyOpen(false)}
        ride={activeRide}
        user={user}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        ride={activeRide || completedRideData}
        walletBalance={wallet.balance}
        onPaymentSuccess={(payment) => {
          setIsPaymentOpen(false);
          setIsRatingOpen(true);
        }}
      />

      <RatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        ride={activeRide || completedRideData}
        onRatingSubmitted={() => {
          setIsRatingOpen(false);
          setIsReceiptOpen(true);
          setActiveRide(null);
        }}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        ride={completedRideData || activeRide}
      />

      <CaptainsNetworkModal
        isOpen={isCaptainsModalOpen}
        onClose={() => setIsCaptainsModalOpen(false)}
        activeRide={activeRide}
        onRideAccepted={(updatedRide) => {
          setActiveRide(updatedRide);
          setIsCaptainsModalOpen(false);
          addToast(`Order accepted by ${updatedRide.driver?.name || 'Captain'}! Disappeared from other captains.`, 'success');
        }}
      />
    </div>
  );
};
