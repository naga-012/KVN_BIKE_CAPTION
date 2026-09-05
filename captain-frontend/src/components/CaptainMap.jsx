import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useCaptainAuth } from '../context/CaptainAuthContext';
import { Navigation2, MapPin, Flag, Compass } from 'lucide-react';

// Custom KVN Vehicle Marker Icon
const createCaptainMarkerIcon = (vehicleType = 'BIKE', isOnline = true) => {
  const iconEmoji = vehicleType === 'CAB' ? '🚗' : vehicleType === 'AUTO' ? '🛺' : '🏍️';
  const color = isOnline ? '#F59E0B' : '#64748B';

  return L.divIcon({
    className: 'custom-captain-marker',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        ${isOnline ? '<div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(245, 158, 11, 0.25); animation: radar-pulse 2s infinite ease-out;"></div>' : ''}
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #0D111A; border: 2.5px solid ${color}; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.6); z-index: 10;">
          ${iconEmoji}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Customer Pickup Marker Icon
const createPickupMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-pickup-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="background: #10B981; color: #0D111A; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #ffffff;">
          Pickup
        </div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #10B981; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.5); margin-top: -2px;"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 36],
  });
};

// Customer Drop Marker Icon
const createDropMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-drop-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <div style="background: #EF4444; color: #ffffff; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #ffffff;">
          Drop
        </div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #EF4444; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.5); margin-top: -2px;"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 36],
  });
};

// Helper component to smoothly center/re-center map
function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 15, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export const CaptainMap = ({ activeRide, incomingRequest }) => {
  const { captain, currentLocation, isOnline } = useCaptainAuth();

  const captainPos = [currentLocation.lat || 17.3228, currentLocation.lng || 78.5630];

  // Active ride locations
  const pickupLoc = activeRide?.pickupLocation || incomingRequest?.pickupLocation;
  const dropLoc = activeRide?.dropLocation || incomingRequest?.dropLocation;

  const pickupPos = pickupLoc?.lat && pickupLoc?.lng ? [pickupLoc.lat, pickupLoc.lng] : null;
  const dropPos = dropLoc?.lat && dropLoc?.lng ? [dropLoc.lat, dropLoc.lng] : null;

  // Build route polyline
  const routePoints = [];
  if (activeRide?.status === 'DRIVER_ASSIGNED' && pickupPos) {
    routePoints.push(captainPos, pickupPos);
  } else if (pickupPos && dropPos) {
    routePoints.push(pickupPos, dropPos);
  } else if (pickupPos) {
    routePoints.push(captainPos, pickupPos);
  }

  const mapCenter = pickupPos && activeRide ? pickupPos : captainPos;

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden shadow-2xl border border-dark-600/70">
      <MapContainer
        center={mapCenter}
        zoom={14}
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater center={mapCenter} zoom={activeRide ? 15 : 14} />

        {/* Captain Location Marker */}
        <Marker
          position={captainPos}
          icon={createCaptainMarkerIcon(captain?.vehicleType || 'BIKE', isOnline)}
        >
          <Popup className="dark-popup">
            <div className="p-1 text-xs">
              <p className="font-bold text-slate-800">{captain?.name || 'Your Location'}</p>
              <p className="text-slate-600">{captain?.vehicle || 'KVN Vehicle'}</p>
              <p className="text-slate-500 font-mono text-[10px]">
                {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Pickup Marker */}
        {pickupPos && (
          <Marker position={pickupPos} icon={createPickupMarkerIcon()}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-bold text-emerald-700">Customer Pickup</p>
                <p className="text-slate-600">{pickupLoc.address || 'Pickup Point'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Drop Marker */}
        {dropPos && (
          <Marker position={dropPos} icon={createDropMarkerIcon()}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-bold text-rose-700">Drop Destination</p>
                <p className="text-slate-600">{dropLoc.address || 'Drop Point'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Line */}
        {routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            color="#F59E0B"
            weight={5}
            opacity={0.85}
            dashArray="1, 8"
          />
        )}
      </MapContainer>

      {/* Floating Status & Map Info Pill */}
      <div className="absolute top-3 left-3 z-[1000] bg-dark-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-dark-600 shadow-lg flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
        <span className="text-xs font-semibold text-slate-200">
          {isOnline ? (activeRide ? `Trip in Progress (${activeRide.status})` : 'Scanning for 2 KM Rides') : 'GPS Standby (Offline)'}
        </span>
      </div>

      {/* Vehicle Type Indicator on Map */}
      <div className="absolute top-3 right-3 z-[1000] bg-dark-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-dark-600 shadow-lg flex items-center gap-1.5">
        <span className="text-xs text-brand-400 font-bold uppercase tracking-wider font-mono">
          {captain?.vehicleType || 'BIKE'}
        </span>
        <span className="text-[11px] text-slate-400">
          {captain?.plateNumber || 'TS 08 EA 4589'}
        </span>
      </div>
    </div>
  );
};

export default CaptainMap;
