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
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [skippedRideIds, setSkippedRideIds] = useState(() => new Set());
  const incomingRequest = incomingRequests[currentRequestIndex] || null;
  const setIncomingRequest = useCallback((req) => {
    if (!req) {
      setIncomingRequests([]);
      setCurrentRequestIndex(0);
    } else {
      setIncomingRequests([req]);
      setCurrentRequestIndex(0);
    }
  }, []);
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

  // Query exact device GPS location
  const detectLiveGpsLocation = useCallback(async (showFeedback = true) => {
    if (!navigator.geolocation) {
      if (showFeedback) addToast('GPS is not supported on this browser or device.', 'error');
      return null;
    }

    if (showFeedback) addToast('📡 Fetching exact live GPS location...', 'info');

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
      });

      const exactLoc = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading || 0,
        accuracy: pos.coords.accuracy,
      };

      setCurrentLocation(exactLoc);
      setIsLocationActive(true);

      const cptId = captain?.id || captain?._id || captain?.code || 'cpt_a';
      socket.emit('captain:location', {
        captainId: cptId,
        lat: exactLoc.lat,
        lng: exactLoc.lng,
        heading: exactLoc.heading,
      });

      try {
        await api.post('/captains/location', {
          captainId: cptId,
          lat: exactLoc.lat,
          lng: exactLoc.lng,
          heading: exactLoc.heading,
        });
      } catch (e) {
        // non-blocking
      }

      if (showFeedback) {
        addToast(`🎯 GPS Location Updated: (${exactLoc.lat.toFixed(4)}, ${exactLoc.lng.toFixed(4)}) • Accuracy ±${Math.round(pos.coords.accuracy || 10)}m`, 'success');
      }
      return exactLoc;
    } catch (err) {
      if (showFeedback) {
        let msg = 'Could not retrieve GPS location.';
        if (err.code === 1) msg = 'Location permission denied. Please allow location access in your browser.';
        else if (err.code === 2) msg = 'Position unavailable. Please turn on device GPS/Location.';
        else if (err.code === 3) msg = 'Location request timed out. Please retry.';
        addToast(`⚠️ ${msg}`, 'warning');
      }
      return null;
    }
  }, [captain, addToast]);

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
    // Try auto-detecting real device location on load
    detectLiveGpsLocation(false);
  }, [fetchAllCaptains, detectLiveGpsLocation]);


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

  // Resilient fallback: Check active broadcasting orders from KVN Bike Booking
  const checkActiveBroadcastOrder = useCallback(async () => {
    if (!isOnline || activeRide) return;
    try {
      const cptId = captain?.id || captain?._id || captain?.code || 'cpt_a';
      const res = await api.get(`/captains/active-order?captainId=${cptId}`);
      if (res.success) {
        const rawOrders = res.activeOrders || (res.activeOrder ? [res.activeOrder] : []);
        const myVType = (captain?.vehicleType || 'BIKE').toUpperCase();

        const validOrders = [];
        for (const order of rawOrders) {
          if (!order || order.status !== 'SEARCHING_DRIVER') continue;
          if (order.source && order.source !== 'KVN_BIKE_BOOKING') continue;

          const ordVType = (order.vehicleType || 'BIKE').toUpperCase();
          if (myVType !== ordVType) continue;

          const rId = String(order.id || order._id || order.rideId);
          if (skippedRideIds.has(rId)) continue;

          let dist = 2.0;
          if (order.pickupLocation?.lat && order.pickupLocation?.lng) {
            dist = calculateDistanceKm(
              currentLocation.lat,
              currentLocation.lng,
              order.pickupLocation.lat,
              order.pickupLocation.lng
            );
          }

          validOrders.push({
            ...order,
            rideId: rId,
            ride_id: rId,
            source: 'KVN_BIKE_BOOKING',
            customerName: order.customerName || 'KVN Customer',
            customerPhone: order.customerPhone || '',
            estimatedFare: order.fareBreakdown?.totalFare || order.estimatedFare || 50,
            distanceKm: order.distanceKm || (dist < 999 ? Number(dist.toFixed(1)) : 2.0),
          });
        }

        setIncomingRequests((prev) => {
          const prevIds = new Set(prev.map((r) => String(r.rideId || r.ride_id || r.id || r._id)));
          const newOrders = validOrders.filter((o) => !prevIds.has(String(o.rideId)));

          if (newOrders.length > 0) {
            playBeepSound();
            if (prev.length === 0) {
              if (validOrders.length === 1) {
                addToast(`🔔 New KVN Ride Request: ₹${validOrders[0].estimatedFare} • ${validOrders[0].pickupLocation?.address || 'Pickup'}`, 'warning');
              } else {
                addToast(`🔔 ${validOrders.length} KVN Ride Requests Available within 2 KM!`, 'warning');
              }
            } else {
              addToast(`🔔 +${newOrders.length} more KVN ride request available!`, 'warning');
            }
          }

          return validOrders;
        });
      }
    } catch (err) {
      // non-blocking
    }
  }, [isOnline, activeRide, captain, currentLocation, skippedRideIds, addToast]);

  useEffect(() => {
    if (!isOnline || activeRide) return;
    const pollInterval = setInterval(checkActiveBroadcastOrder, 2500);
    return () => clearInterval(pollInterval);
  }, [checkActiveBroadcastOrder, isOnline, activeRide]);

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

    // Handle new incoming ride request from KVN Bike Booking
    const handleNewRequest = (data) => {
      console.log('[Socket] Incoming ride request:', data);

      // Check if captain is eligible (online, available)
      if (!isOnline) return;
      if (captainStatus === 'BUSY' || activeRide) return;

      // Only give rides to the captain who are booking from KVN Bike Booking!
      if (data.source && data.source !== 'KVN_BIKE_BOOKING') {
        console.log(`[Socket] Rejecting ride from non-KVN source: ${data.source}`);
        return;
      }

      const myVehicleType = (captain.vehicleType || 'BIKE').toUpperCase();
      const reqVehicleType = (data.vehicleType || 'BIKE').toUpperCase();
      if (myVehicleType !== reqVehicleType) return;

      const rId = String(data.rideId || data.ride_id || data.id || data._id);
      if (skippedRideIds.has(rId)) {
        console.log(`[Socket] Ride ${rId} already skipped by captain, ignoring.`);
        return;
      }

      let distKm = 2.0;
      if (data.pickupLocation && data.pickupLocation.lat && data.pickupLocation.lng) {
        distKm = calculateDistanceKm(
          currentLocation.lat,
          currentLocation.lng,
          data.pickupLocation.lat,
          data.pickupLocation.lng
        );
      }

      const formatted = {
        ...data,
        rideId: rId,
        ride_id: rId,
        source: 'KVN_BIKE_BOOKING',
        customerName: data.customerName || 'KVN Customer',
        customerPhone: data.customerPhone || '',
        distanceKm: data.distanceKm || (distKm < 999 ? Number(distKm.toFixed(1)) : 2.0),
        estimatedFare: data.estimatedFare || data.fareBreakdown?.totalFare || 50,
      };

      setIncomingRequests((prev) => {
        const exists = prev.some((r) => String(r.rideId || r.ride_id || r.id || r._id) === rId);
        if (exists) {
          return prev.map((r) => (String(r.rideId || r.ride_id || r.id || r._id) === rId ? formatted : r));
        }
        playBeepSound();
        addToast(`🔔 New KVN Ride Request: ₹${formatted.estimatedFare} • ${formatted.pickupLocation?.address || 'Pickup'}`, 'warning');
        return [...prev, formatted];
      });
    };

    // Handle ride cancelled / accepted by another captain
    const handleRideNoLongerAvailable = (data) => {
      console.log('[Socket] Ride no longer available:', data);
      const rId = String(data.rideId || data.ride_id || data.id || data._id);
      setIncomingRequests((prev) => {
        const found = prev.some((r) => String(r.rideId || r.ride_id || r.id || r._id) === rId);
        if (found) {
          addToast(data.reason || 'Ride accepted by another Captain.', 'info');
          return prev.filter((r) => String(r.rideId || r.ride_id || r.id || r._id) !== rId);
        }
        return prev;
      });
      setCurrentRequestIndex((curr) => Math.max(0, curr - 1));
    };

    // Handle when THIS captain successfully accepted
    const handleAcceptedSuccess = (data) => {
      console.log('[Socket] Ride accepted success:', data);
      setIncomingRequests([]);
      setCurrentRequestIndex(0);
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

  // Skip a ride from the queue
  const skipRide = useCallback(async (rideId, reason = 'Captain skipped ride') => {
    if (!rideId) return;
    const rId = String(rideId);

    // Record locally in skippedRideIds
    setSkippedRideIds((prev) => {
      const next = new Set(prev);
      next.add(rId);
      return next;
    });

    // Remove from incomingRequests
    setIncomingRequests((prev) => {
      const updated = prev.filter((r) => String(r.rideId || r.ride_id || r.id || r._id) !== rId);
      return updated;
    });

    // Adjust index safely
    setCurrentRequestIndex((prev) => (prev > 0 ? prev - 1 : 0));
    addToast('⏭️ Ride skipped. Checking other available rides...', 'info');

    // Notify backend
    try {
      const cptId = captain?.id || captain?._id || captain?.code || 'cpt_a';
      await api.post(`/rides/${rId}/skip`, {
        captainId: cptId,
        reason: reason,
      });
    } catch (err) {
      console.warn('Backend skip recording error:', err.message);
    }
  }, [captain, addToast]);

  // Navigate through multiple incoming requests
  const nextRequest = useCallback(() => {
    setIncomingRequests((prev) => {
      if (prev.length <= 1) return prev;
      setCurrentRequestIndex((curr) => (curr + 1) % prev.length);
      return prev;
    });
  }, []);

  const prevRequest = useCallback(() => {
    setIncomingRequests((prev) => {
      if (prev.length <= 1) return prev;
      setCurrentRequestIndex((curr) => (curr - 1 + prev.length) % prev.length);
      return prev;
    });
  }, []);

  const selectRequest = useCallback((idx) => {
    setCurrentRequestIndex(idx);
  }, []);

  const clearIncomingRequests = useCallback(() => {
    setIncomingRequests([]);
    setCurrentRequestIndex(0);
  }, []);

  // Logout handler
  const logout = () => {
    if (isOnline) {
      toggleOnline(false);
    }
    setCaptain(null);
    setToken(null);
    setActiveRide(null);
    setIncomingRequests([]);
    setCurrentRequestIndex(0);
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
        detectLiveGpsLocation,

        activeRide,
        setActiveRide,
        incomingRequest,
        incomingRequests,
        currentRequestIndex,
        setCurrentRequestIndex,
        setIncomingRequest,
        skipRide,
        nextRequest,
        prevRequest,
        selectRequest,
        clearIncomingRequests,
        skippedRideIds,
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
