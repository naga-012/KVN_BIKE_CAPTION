import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import socket from '../services/socket';

const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999;
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) dist = 1;
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515 * 1.609344;
  return dist;
};

const CaptainAuthContext = createContext(null);

export const CaptainAuthProvider = ({ children }) => {
  const [captain, setCaptain] = useState(() => {
    try {
      const cached = localStorage.getItem('kvn_captain_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('kvn_captain_token') || null);
  const [isOnline, setIsOnline] = useState(false);
  const [captainStatus, setCaptainStatus] = useState('OFFLINE');
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({
    lat: 17.3228,
    lng: 78.5630,
    heading: 0
  });
  const [activeRide, setActiveRide] = useState(null);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [allCaptains, setAllCaptains] = useState([]);
  const watchIdRef = useRef(null);

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

      // Strictly check distance from captain's exact location to pickup (2.0 km radius)
      if (data.pickupLocation && data.pickupLocation.lat && data.pickupLocation.lng) {
        const distKm = calculateDistanceKm(
          currentLocation.lat,
          currentLocation.lng,
          data.pickupLocation.lat,
          data.pickupLocation.lng
        );
        if (distKm > 2.0) {
          console.log(`[Socket] Ride pickup is ${distKm.toFixed(2)} km away (> 2.0 km radius). Order rejected for captain ${cptId}.`);
          return;
        }
      }

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

  // Geolocation Promise helper
  const getDeviceLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Device does not support GPS / Geolocation.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading || 0,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          let msg = 'Failed to get location';
          if (err.code === err.PERMISSION_DENIED) {
            msg = 'Location permission is required. Please turn on device GPS and allow location access to go online.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Device location is OFF. Please turn on your device GPS / Location to go online.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Location request timed out. Please ensure GPS is enabled and retry.';
          }
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  };

  const startLocationWatch = (cptId) => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const updated = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading || 0,
        };
        setCurrentLocation(updated);
        setIsLocationActive(true);
        socket.emit('captain:location_update', {
          captainId: cptId,
          ...updated,
        });
      },
      (err) => {
        console.warn('Location watch warning:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  };

  const stopLocationWatch = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLocationActive(false);
  };

  // Toggle Online/Offline
  const toggleOnline = async (forcedStatus = null) => {
    let currentCaptain = captain;
    if (!currentCaptain) {
      try {
        const storedCode = localStorage.getItem('kvn_captain_code') || 'cpt_a';
        const res = await api.get(`/captains/me?captainId=${storedCode}`);
        if (res.success && res.captain) {
          currentCaptain = res.captain;
          setCaptain(res.captain);
        }
      } catch (e) {
        console.warn('Could not auto-fetch captain profile:', e);
      }
    }

    const targetOnline = forcedStatus !== null ? forcedStatus : !isOnline;
    const cptId = currentCaptain ? (currentCaptain.id || currentCaptain._id || currentCaptain.code) : 'cpt_a';

    if (targetOnline) {
      // Captain MUST turn ON location first!
      addToast('📍 Checking device GPS location...', 'info');
      let exactLoc;
      try {
        exactLoc = await getDeviceLocation();
      } catch (locErr) {
        addToast(`⚠️ ${locErr.message}`, 'error');
        setIsOnline(false);
        setCaptainStatus('OFFLINE');
        setIsLocationActive(false);
        if (currentCaptain) {
          const updated = { ...currentCaptain, isOnline: false, status: 'OFFLINE' };
          setCaptain(updated);
          localStorage.setItem('kvn_captain_profile', JSON.stringify(updated));
        }
        return false;
      }

      // Location successfully verified
      setCurrentLocation(exactLoc);
      setIsLocationActive(true);
      setIsOnline(true);
      setCaptainStatus('AVAILABLE');

      if (currentCaptain) {
        const updated = { ...currentCaptain, isOnline: true, status: 'AVAILABLE', location: exactLoc };
        setCaptain(updated);
        localStorage.setItem('kvn_captain_profile', JSON.stringify(updated));
      }

      startLocationWatch(cptId);

      socket.emit('captain:online', {
        captainId: cptId,
        lat: exactLoc.lat,
        lng: exactLoc.lng,
      });

      addToast(`🟢 You are ONLINE at GPS location (${exactLoc.lat.toFixed(4)}, ${exactLoc.lng.toFixed(4)}). Listening for orders within 2 KM!`, 'success');

      try {
        await api.patch('/captains/status', {
          captainId: cptId,
          isOnline: true,
          status: 'AVAILABLE',
          lat: exactLoc.lat,
          lng: exactLoc.lng,
        });
      } catch (err) {
        console.warn('Status patch warning:', err.message);
      }
    } else {
      stopLocationWatch();
      setIsOnline(false);
      setCaptainStatus('OFFLINE');
      setIsLocationActive(false);

      if (currentCaptain) {
        const updated = { ...currentCaptain, isOnline: false, status: 'OFFLINE' };
        setCaptain(updated);
        localStorage.setItem('kvn_captain_profile', JSON.stringify(updated));
      }

      socket.emit('captain:offline', { captainId: cptId });
      setIncomingRequest(null);
      addToast('⚪ You are OFFLINE. Ride requests paused.', 'info');

      try {
        await api.patch('/captains/status', {
          captainId: cptId,
          isOnline: false,
          status: 'OFFLINE',
        });
      } catch (err) {
        console.warn('Status patch warning:', err.message);
      }
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
        isLocationActive,
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
