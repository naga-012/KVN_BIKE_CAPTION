import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
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
const MapRecenter = ({ pLat, pLng, dLat, dLng, drLat, drLng, hasPickup, hasDrop, hasDriver }) => {
  const map = useMap();

  useEffect(() => {
    const points = [];
    if (hasPickup) points.push([pLat, pLng]);
    if (hasDrop) points.push([dLat, dLng]);
    if (hasDriver) points.push([drLat, drLng]);

    if (points.length === 1) {
      map.flyTo(points[0], 14, { duration: 1 });
    } else if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [pLat, pLng, dLat, dLng, drLat, drLng, hasPickup, hasDrop, hasDriver, map]);

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

  const pLat = Number(pickup?.lat);
  const pLng = Number(pickup?.lng);
  const dLat = Number(drop?.lat);
  const dLng = Number(drop?.lng);
  const drLat = Number(driverLocation?.lat);
  const drLng = Number(driverLocation?.lng);

  const hasPickup = !isNaN(pLat) && !isNaN(pLng) && pLat !== 0;
  const hasDrop = !isNaN(dLat) && !isNaN(dLng) && dLat !== 0;
  const hasDriver = !isNaN(drLat) && !isNaN(drLng) && drLat !== 0;

  const center = hasPickup ? [pLat, pLng] : defaultCenter;

  // Simple road curved polyline between pickup and drop points
  const polylinePositions = (hasPickup && hasDrop) ? [
    [pLat, pLng],
    [(pLat + dLat) / 2 + 0.003, (pLng + dLng) / 2 + 0.003],
    [dLat, dLng],
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

        <MapRecenter 
          pLat={pLat} 
          pLng={pLng} 
          dLat={dLat} 
          dLng={dLng} 
          drLat={drLat} 
          drLng={drLng} 
          hasPickup={hasPickup} 
          hasDrop={hasDrop} 
          hasDriver={hasDriver} 
        />
        <ClickHandler onMapClick={onMapClick} />

        {/* 2km Radius Circle around Pickup - interactive={false} so clicks pass through to map */}
        {hasPickup && (
          <Circle
            center={[pLat, pLng]}
            radius={2000}
            interactive={false}
            pathOptions={{
              color: '#14b8a6',
              fillColor: '#14b8a6',
              fillOpacity: 0.09,
              weight: 1.5,
              dashArray: '6, 6',
              interactive: false,
            }}
          />
        )}

        {/* Nearby Available Captains within 2km (searching state) */}
        {!driverLocation && nearbyCaptains?.map((cap, idx) => {
          const capLat = Number(cap.lat);
          const capLng = Number(cap.lng);
          return (!isNaN(capLat) && !isNaN(capLng)) ? (
            <Marker
              key={cap.id || idx}
              position={[capLat, capLng]}
              icon={getDriverIcon(cap.vehicleType || 'BIKE')}
            />
          ) : null;
        })}

        {/* Pickup Marker */}
        {hasPickup && (
          <Marker position={[pLat, pLng]} icon={pickupIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-bold text-teal-600">Pickup Location</p>
                <p className="text-slate-700 font-medium">{pickup?.address || 'Pickup Point'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Drop Marker (Destination) - Draggable so users can adjust destination anywhere */}
        {hasDrop && (
          <Marker 
            position={[dLat, dLng]} 
            icon={dropIcon}
            draggable={!driverLocation}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                if (onMapClick) {
                  onMapClick({ lat: position.lat, lng: position.lng });
                }
              },
            }}
          >
            <Popup>
              <div className="p-1 text-xs">
                <p className="font-bold text-rose-600">Destination Drop</p>
                <p className="text-slate-700 font-medium">{drop?.address || 'Drop Point'}</p>
                <p className="text-[10px] text-teal-600 font-semibold mt-0.5">Drag to adjust exact spot</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Live Driver Marker */}
        {hasDriver && (
          <Marker
            position={[drLat, drLng]}
            icon={getDriverIcon(vehicleType)}
          />
        )}

        {/* Route Polyline - interactive={false} so clicks pass through to map */}
        {polylinePositions.length > 0 && (
          <Polyline
            positions={polylinePositions}
            interactive={false}
            pathOptions={{
              color: '#0d9488',
              weight: 5,
              opacity: 0.85,
              dashArray: '8, 8',
              interactive: false,
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
