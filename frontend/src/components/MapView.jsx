import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom SVG Icons
const createHtmlIcon = (htmlContent, size = [36, 36]) => {
  return L.divIcon({
    html: htmlContent,
    className: 'custom-leaflet-marker',
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });
};

const pickupIcon = createHtmlIcon(`
  <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#0d9488;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 15px rgba(13,148,136,0.8);">
    <div style="width:8px;height:8px;background:#ffffff;border-radius:50%;"></div>
  </div>
`);

const dropIcon = createHtmlIcon(`
  <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;background:#f43f5e;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 15px rgba(244,63,94,0.8);">
    <div style="width:8px;height:8px;background:#ffffff;border-radius:50%;"></div>
  </div>
`);

const getDriverIcon = (type = 'BIKE') => {
  let emoji = '🛵';
  let bgColor = '#f59e0b';
  if (type === 'AUTO') { emoji = '🛺'; bgColor = '#10b981'; }
  if (type === 'CAB') { emoji = '🚕'; bgColor = '#3b82f6'; }

  return createHtmlIcon(`
    <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:${bgColor};border:2px solid #ffffff;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.4);font-size:18px;">
      ${emoji}
    </div>
  `, [36, 36]);
};

// Component to dynamically fit bounds and invalidate size
const MapRecenter = ({ pickup, drop, driverLocation }) => {
  const map = useMap();

  useEffect(() => {
    const points = [];
    if (pickup?.lat && pickup?.lng) points.push([pickup.lat, pickup.lng]);
    if (drop?.lat && drop?.lng) points.push([drop.lat, drop.lng]);
    if (driverLocation?.lat && driverLocation?.lng) points.push([driverLocation.lat, driverLocation.lng]);

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [pickup, drop, driverLocation, map]);

  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  return null;
};

// Interactive Map Click Handler
const ClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

export const MapView = ({
  pickup,
  drop,
  driverLocation,
  vehicleType = 'BIKE',
  nearbyCaptains = [],
  onMapClick,
  className = 'h-full w-full',
}) => {
  const defaultCenter = [17.3850, 78.4867]; // Hyderabad, Telangana center

  const center = pickup?.lat ? [pickup.lat, pickup.lng] : defaultCenter;

  // Simple straight polyline between points (or simulated road curve)
  const polylinePositions = pickup?.lat && drop?.lat ? [
    [pickup.lat, pickup.lng],
    // midpoint slight offset for realistic curve
    [(pickup.lat + drop.lat) / 2 + 0.003, (pickup.lng + drop.lng) / 2 + 0.003],
    [drop.lat, drop.lng],
  ] : [];

  return (
    <div className={`relative ${className} bg-slate-900`}>
      <MapContainer
        center={center}
        zoom={14}
        zoomControl={false}
        className="w-full h-full"
        style={{ minHeight: '350px', height: '100%', width: '100%' }}
      >
        {/* Google Maps Road Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          maxZoom={20}
        />

        <MapRecenter pickup={pickup} drop={drop} driverLocation={driverLocation} />
        <ClickHandler onMapClick={onMapClick} />

        {/* 2km Radius Circle around Pickup */}
        {pickup?.lat && pickup?.lng && (
          <Circle
            center={[pickup.lat, pickup.lng]}
            radius={2000}
            pathOptions={{
              color: '#14b8a6',
              fillColor: '#14b8a6',
              fillOpacity: 0.09,
              weight: 1.5,
              dashArray: '6, 6',
            }}
          />
        )}

        {/* Nearby Available Captains within 2km (searching state) */}
        {!driverLocation && nearbyCaptains?.map((cap, idx) => (
          cap.lat && cap.lng ? (
            <Marker
              key={cap.id || idx}
              position={[cap.lat, cap.lng]}
              icon={getDriverIcon(cap.vehicleType || 'BIKE')}
            />
          ) : null
        ))}

        {/* Pickup Marker */}
        {pickup?.lat && pickup?.lng && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        )}

        {/* Drop Marker */}
        {drop?.lat && drop?.lng && (
          <Marker position={[drop.lat, drop.lng]} icon={dropIcon} />
        )}

        {/* Live Driver Marker */}
        {driverLocation?.lat && driverLocation?.lng && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={getDriverIcon(vehicleType)}
          />
        )}

        {/* Route Polyline */}
        {polylinePositions.length > 0 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#0d9488',
              weight: 5,
              opacity: 0.85,
              dashArray: '8, 8',
            }}
          />
        )}
      </MapContainer>

      {/* 2km Radius Caption */}
      <div className="absolute bottom-6 left-4 z-20 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-teal-500/40 shadow-lg text-[11px] text-teal-300 flex items-center gap-2 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
        <span className="font-semibold">Customer booking goes 2km radius only</span>
      </div>
    </div>
  );
};
