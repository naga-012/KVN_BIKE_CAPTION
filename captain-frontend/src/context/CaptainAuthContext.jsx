import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import socket from '../services/socket';

const CaptainAuthContext = createContext(null);

export const CaptainAuthProvider = ({ children }) => {
  const [captain, setCaptain] = useState(() => {
    const cached = localStorage.getItem('kvn_captain_profile');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('kvn_captain_token') || null);
  const [isOnline, setIsOnline] = useState(false);
  const [captainStatus, setCaptainStatus] = useState('OFFLINE'); // OFFLINE, AVAILABLE, BUSY
  const [currentLocation, setCurrentLocation] = useState({
    lat: 17.3228,
    lng: 78.5630,
    heading: 0
  });
  const [activeRide, setActiveRide] = useState(null);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [allCaptains, setAllCaptains] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Fetch all captains for quick test selector
  const fetchAllCaptains = useCallback(async () => {
    try {
      const res = await api.get('/captains/all');
      if (res.success && res.captains) {
        setAllCaptains(res.captains);
      }
    } catch (e) {
      console.warn('Failed to fetch captains list:', e.message);
    }
  }, []);

  // Load initial captain data (default to Captain A if no login)
  useEffect(() => {
    const loadCaptain = async () => {
      try {
        const storedCode = localStorage.getItem('kvn_captain_code') || 'cpt_a';
        const res = await api.get(`/captains/me?captainId=${storedCode}`);
        if (res.success && res.captain) {
          setCaptain(res.captain);
          setIsOnline(res.captain.isOnline || false);
          setCaptainStatus(res.captain.status || (res.captain.isOnline ? 'AVAILABLE' : 'OFFLINE'));
          if (res.captain.location) {
            setCurrentLocation(res.captain.location);
          }
          localStorage.setItem('kvn_captain_profile', JSON.stringify(res.captain));
          localStorage.setItem('kvn_captain_code', res.captain.code || res.captain.id);
        }
      } catch (err) {
        console.warn('Could not auto-fetch captain profile:', err.message);
      }
    };

    loadCaptain();
    fetchAllCaptains();
  }, [fetchAllCaptains]);

  // Check for active ride periodically if captain is loaded
  const checkActiveRide = useCallback(async () => {
    if (!captain) return;
    try {
      const cptId = captain.id || captain._id || captain.code;
      const res = await api.get(`/captains/active-ride?captainId=${cptId}`);
      if (res.success && res.activeRide) {
        setActiveRide(res.activeRide);
        setCaptainStatus('BUSY');
      } else if (activeRide && (!res.activeRide || res.activeRide.status === 'RIDE_COMPLETED')) {
        // If active ride completed
        setActiveRide(null);
        if (isOnline) setCaptainStatus('AVAILABLE');
      }
    } catch (err) {
      console.warn('Check active ride error:', err.message);
    }
  }, [captain, activeRide, isOnline]);

  useEffect(() => {
    checkActiveRide();
    const interval = setInterval(checkActiveRide, 3000);
    return () => clearInterval(interval);
  }, [checkActiveRide]);

  // Socket Connection and Event Listeners
  useEffect(() => {
    if (!captain) return;
    const cptId = captain.id || captain._id || captain.code;

    // Join online room if online
    if (isOnline) {
      socket.emit('captain:online', {
        captainId: cptId,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      });
    }

    // Handle new incoming ride request
    const handleNewRequest = (data) => {
      console.log('[Socket] Incoming ride request:', data);

      // Check if captain is eligible (online, available, vehicle type match)
      if (!isOnline) return;
      if (captainStatus === 'BUSY') return;

      const myVehicleType = (captain.vehicleType || 'BIKE').toUpperCase();
      const reqVehicleType = (data.vehicleType || 'BIKE').toUpperCase();
      if (myVehicleType !== reqVehicleType) return;

      // If specific eligible list provided, check membership
      if (data.eligibleCaptainIds && data.eligibleCaptainIds.length > 0) {
        const isEligible = data.eligibleCaptainIds.includes(String(cptId)) ||
                           data.eligibleCaptainIds.includes(String(captain.code)) ||
                           data.eligibleCaptainIds.includes(String(captain._id));
        if (!isEligible) {
          console.log(`[Socket] Captain ${cptId} is beyond 2KM dispatch radius, ignoring.`);
          return;
        }
      }

      setIncomingRequest(data);
      addToast(`🔔 New Ride Request: ₹${data.estimatedFare || 50} • ${data.distanceKm || 2} km`, 'warning');
      playBeepSound();
    };

    // Handle ride cancelled / accepted by another captain
    const handleRideNoLongerAvailable = (data) => {
      console.log('[Socket] Ride no longer available:', data);
      setIncomingRequest((current) => {
        if (current && (current.rideId === data.rideId || current.ride_id === data.rideId)) {
          addToast(data.reason || 'Ride accepted by another Captain.', 'info');
          return null;
        }
        return current;
      });
    };

    // Handle when THIS captain successfully accepted
    const handleAcceptedSuccess = (data) => {
      console.log('[Socket] Ride accepted success:', data);
      setIncomingRequest(null);
      setActiveRide(data.ride);
      setCaptainStatus('BUSY');
      addToast('🎉 Ride booking confirmed! Navigate to customer.', 'success');
    };

    // Handle ride status changes
    const handleStatusChanged = (data) => {
      console.log('[Socket] Ride status changed:', data);
      if (activeRide && (activeRide.id === data.rideId || activeRide._id === data.rideId)) {
        setActiveRide((prev) => ({ ...prev, status: data.status, ...data }));
        if (data.status === 'RIDE_COMPLETED') {
          addToast('✅ Ride Completed! Earnings updated.', 'success');
          setCaptainStatus('AVAILABLE');
        }
      }
    };

    socket.on('ride:new_request', handleNewRequest);
    socket.on('ride:no_longer_available', handleRideNoLongerAvailable);
    socket.on('ride:cancelled', handleRideNoLongerAvailable);
    socket.on('ride:accepted_success', handleAcceptedSuccess);
    socket.on('ride:status_changed', handleStatusChanged);

    return () => {
      socket.off('ride:new_request', handleNewRequest);
      socket.off('ride:no_longer_available', handleRideNoLongerAvailable);
      socket.off('ride:cancelled', handleRideNoLongerAvailable);
      socket.off('ride:accepted_success', handleAcceptedSuccess);
      socket.off('ride:status_changed', handleStatusChanged);
    };
  }, [captain, isOnline, captainStatus, currentLocation, activeRide, addToast]);

  // Audio alert synthesized using Web Audio API
  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.3); // A6 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Toggle Online/Offline
  const toggleOnline = async (forcedStatus = null) => {
    if (!captain) return;
    const nextOnline = forcedStatus !== null ? forcedStatus : !isOnline;
    const cptId = captain.id || captain._id || captain.code;

    try {
      const res = await api.patch('/captains/status', {
        captainId: cptId,
        isOnline: nextOnline,
        status: nextOnline ? 'AVAILABLE' : 'OFFLINE',
      });

      if (res.success) {
        setIsOnline(nextOnline);
        setCaptainStatus(nextOnline ? 'AVAILABLE' : 'OFFLINE');
        if (nextOnline) {
          socket.emit('captain:online', {
            captainId: cptId,
            lat: currentLocation.lat,
            lng: currentLocation.lng,
          });
          addToast('🟢 You are ONLINE. Searching for nearby rides within 2 KM...', 'success');
        } else {
          socket.emit('captain:offline', { captainId: cptId });
          setIncomingRequest(null);
          addToast('⚪ You are OFFLINE. Ride requests paused.', 'info');
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to update online status', 'error');
    }
  };

  // Switch active captain (for Scenario testing: Captain A, B, C, D, E)
  const switchCaptain = async (codeOrId) => {
    try {
      const res = await api.get(`/captains/me?captainId=${codeOrId}`);
      if (res.success && res.captain) {
        setCaptain(res.captain);
        setIsOnline(res.captain.isOnline || false);
        setCaptainStatus(res.captain.status || (res.captain.isOnline ? 'AVAILABLE' : 'OFFLINE'));
        if (res.captain.location) {
          setCurrentLocation(res.captain.location);
        }
        localStorage.setItem('kvn_captain_profile', JSON.stringify(res.captain));
        localStorage.setItem('kvn_captain_code', res.captain.code || res.captain.id);
        setActiveRide(null);
        setIncomingRequest(null);
        addToast(`Switched active profile to ${res.captain.name}`, 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to switch captain', 'error');
    }
  };

  // Update Captain location
  const updateLocation = async (lat, lng, heading = 0) => {
    if (!captain) return;
    const cptId = captain.id || captain._id || captain.code;
    const newLoc = { lat, lng, heading };
    setCurrentLocation(newLoc);

    socket.emit('captain:location', {
      captainId: cptId,
      lat,
      lng,
      heading,
      rideId: activeRide?.id || activeRide?._id,
    });

    try {
      await api.post('/captains/location', {
        captainId: cptId,
        lat,
        lng,
        heading,
        rideId: activeRide?.id || activeRide?._id,
      });
    } catch (e) {
      // non-blocking
    }
  };

  // Login handler
  const login = async (identifier, password) => {
    const res = await api.post('/captains/login', { identifier, password });
    if (res.success) {
      setToken(res.token);
      setCaptain(res.captain);
      setIsOnline(res.captain.isOnline || false);
      setCaptainStatus(res.captain.status || 'AVAILABLE');
      if (res.captain.location) {
        setCurrentLocation(res.captain.location);
      }
      localStorage.setItem('kvn_captain_token', res.token);
      localStorage.setItem('kvn_captain_profile', JSON.stringify(res.captain));
      localStorage.setItem('kvn_captain_code', res.captain.code || res.captain.id);
      addToast(`Welcome back, ${res.captain.name}!`, 'success');
      return res;
    }
  };

  // Register handler
  const register = async (data) => {
    const res = await api.post('/captains/register', data);
    if (res.success) {
      setToken(res.token);
      setCaptain(res.captain);
      setIsOnline(true);
      setCaptainStatus('AVAILABLE');
      localStorage.setItem('kvn_captain_token', res.token);
      localStorage.setItem('kvn_captain_profile', JSON.stringify(res.captain));
      localStorage.setItem('kvn_captain_code', res.captain.code || res.captain.id);
      addToast('Registration Approved! You are ready to receive rides.', 'success');
      return res;
    }
  };

  // Logout handler
  const logout = () => {
    if (isOnline) {
      toggleOnline(false);
    }
    setCaptain(null);
    setToken(null);
    setActiveRide(null);
    setIncomingRequest(null);
    localStorage.removeItem('kvn_captain_token');
    localStorage.removeItem('kvn_captain_profile');
    localStorage.removeItem('kvn_captain_code');
    addToast('Logged out successfully', 'info');
  };

  return (
    <CaptainAuthContext.Provider
      value={{
        captain,
        setCaptain,
        token,
        isOnline,
        captainStatus,
        setCaptainStatus,
        currentLocation,
        setCurrentLocation,
        updateLocation,
        activeRide,
        setActiveRide,
        incomingRequest,
        setIncomingRequest,
        toasts,
        addToast,
        allCaptains,
        fetchAllCaptains,
        toggleOnline,
        switchCaptain,
        login,
        register,
        logout,
        checkActiveRide,
      }}
    >
      {children}
    </CaptainAuthContext.Provider>
  );
};

export const useCaptainAuth = () => {
  const context = useContext(CaptainAuthContext);
  if (!context) {
    throw new Error('useCaptainAuth must be used within CaptainAuthProvider');
  }
  return context;
};

export default CaptainAuthContext;
