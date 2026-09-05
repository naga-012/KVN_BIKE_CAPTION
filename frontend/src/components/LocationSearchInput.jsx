import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Loader2, Navigation } from 'lucide-react';
import api from '../services/api';

// Instant local fallback suggestions when input is focused or empty
const POPULAR_TELANGANA_SPOTS = [
  {
    title: 'BN Reddy Nagar Bus Stop',
    subtitle: 'Sagar Ring Road, L.B. Nagar, Hyderabad, Telangana',
    address: 'BN Reddy Nagar Bus Stop, Sagar Ring Road, L.B. Nagar, Hyderabad, Telangana',
    lat: 17.3228,
    lng: 78.5630,
  },
  {
    title: 'BIET College (Bharat Institute of Eng & Tech)',
    subtitle: 'Mangalpally, Ibrahimpatnam, Ranga Reddy, Telangana',
    address: 'Bharat Institute of Engineering and Technology (BIET), Ibrahimpatnam, Telangana',
    lat: 17.1895,
    lng: 78.6534,
  },
  {
    title: 'Hitec City Cyber Towers',
    subtitle: 'Madhapur, Hyderabad, Telangana',
    address: 'Cyber Towers, Hitec City, Madhapur, Hyderabad, Telangana',
    lat: 17.4504,
    lng: 78.3808,
  },
  {
    title: 'Gachibowli Financial District',
    subtitle: 'Nanakramguda, Hyderabad, Telangana',
    address: 'Financial District, Gachibowli, Hyderabad, Telangana',
    lat: 17.4401,
    lng: 78.3489,
  },
  {
    title: 'Charminar',
    subtitle: 'Old City, Hyderabad, Telangana',
    address: 'Charminar, Ghansi Bazaar, Hyderabad, Telangana',
    lat: 17.3616,
    lng: 78.4747,
  },
  {
    title: 'Secunderabad Railway Station',
    subtitle: 'Secunderabad, Hyderabad, Telangana',
    address: 'Secunderabad Junction Railway Station, Secunderabad, Telangana',
    lat: 17.4344,
    lng: 78.5013,
  },
  {
    title: 'Rajiv Gandhi Int. Airport (RGIA)',
    subtitle: 'Shamshabad, Hyderabad, Telangana',
    address: 'Rajiv Gandhi International Airport, Shamshabad, Hyderabad, Telangana',
    lat: 17.2403,
    lng: 78.4294,
  },
  {
    title: 'Kukatpally Housing Board (KPHB)',
    subtitle: 'Kukatpally, Hyderabad, Telangana',
    address: 'KPHB Colony, Kukatpally, Hyderabad, Telangana',
    lat: 17.4938,
    lng: 78.3995,
  }
];

export const LocationSearchInput = ({
  label,
  dotColor = 'teal', // 'teal' | 'rose'
  location,
  onSelectLocation,
  placeholder = 'Search place or street in Telangana...',
  onUseCurrentLocation,
}) => {
  const [query, setQuery] = useState(location?.address || '');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);

  // Sync internal query when external location prop changes (e.g. from 1-click presets or map pin)
  useEffect(() => {
    if (location?.address !== undefined && location.address !== query) {
      setQuery(location.address || '');
    }
  }, [location?.address]);

  // Click outside listener to dismiss suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live suggestions on query change with debounce
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions(POPULAR_TELANGANA_SPOTS);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/locations/search?q=${encodeURIComponent(trimmed)}`);
        if (res.data?.locations && res.data.locations.length > 0) {
          setSuggestions(res.data.locations);
        } else {
          // Fallback filter from popular spots if offline
          const fallback = POPULAR_TELANGANA_SPOTS.filter(
            (p) =>
              p.title.toLowerCase().includes(trimmed.toLowerCase()) ||
              p.subtitle.toLowerCase().includes(trimmed.toLowerCase())
          );
          setSuggestions(fallback);
        }
      } catch (err) {
        // Local fallback
        const fallback = POPULAR_TELANGANA_SPOTS.filter(
          (p) =>
            p.title.toLowerCase().includes(trimmed.toLowerCase()) ||
            p.subtitle.toLowerCase().includes(trimmed.toLowerCase())
        );
        setSuggestions(fallback);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const handleSelect = (item) => {
    const selectedAddress = item.title ? `${item.title}, ${item.subtitle}` : item.address;
    setQuery(selectedAddress);
    setIsOpen(false);
    onSelectLocation({
      address: selectedAddress,
      lat: item.lat,
      lng: item.lng,
    });
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions(POPULAR_TELANGANA_SPOTS);
    onSelectLocation({ address: '', lat: null, lng: null });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-start gap-3">
        {/* Color Pin Indicator */}
        <div
          className={`w-3 h-3 rounded-full mt-2 shrink-0 ${
            dotColor === 'teal'
              ? 'bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.6)]'
              : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {label}
            </label>

            {onUseCurrentLocation && (
              <button
                type="button"
                onClick={onUseCurrentLocation}
                className="text-[10px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 transition-colors"
                title="Detect Current GPS Location"
              >
                <Navigation className="w-2.5 h-2.5" />
                <span>My Location</span>
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onFocus={() => {
                setIsOpen(true);
                if (!query.trim()) {
                  setSuggestions(POPULAR_TELANGANA_SPOTS);
                }
              }}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              placeholder={placeholder}
              className="w-full bg-slate-900/60 border border-slate-700/80 hover:border-slate-600 focus:border-teal-400 rounded-xl px-3 py-2 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />

            {/* Clear or loading indicator */}
            <div className="absolute right-2.5 flex items-center gap-1">
              {isLoading && <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />}
              {!isLoading && query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Google Places Style Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-6 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto divide-y divide-slate-800">
          <div className="px-3 py-1.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>Google Location Suggestions (Telangana)</span>
            {isLoading && <span className="text-teal-400">Searching...</span>}
          </div>

          {suggestions.length > 0 ? (
            suggestions.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800/90 flex items-start gap-3 transition-colors group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-teal-500/20 text-slate-400 group-hover:text-teal-400 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-teal-300 truncate transition-colors">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 mt-1">
                  TS
                </span>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              {isLoading ? 'Searching Telangana locations...' : 'No location matches found. Try another search.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
