import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet.heat';
import { useTheme } from '@/Context/ThemeContext.jsx';
import { getUserMapData, getHeatmapData, sendLocationUpdate } from '@/Services/heatMapApi.js';

/*
  HeatMap (Demo)
  --------------------------------------------------
  { id: 'fb1', type: 'hospital', name: 'City Care Hospital', coords: [77.2152, 28.6129] },
  { id: 'fb2', type: 'pharmacy', name: 'Wellness Pharmacy', coords: [77.2052, 28.622] },
  { id: 'fb3', type: 'atm', name: 'Bank ATM 24x7', coords: [77.199, 28.603] },
  A React implementation inspired by the provided static Leaflet HTML.
  Uses maplibre-gl (already in dependencies) to render:
    - Base map (Open source style)
    - Facility markers (emoji icons)
    - Toggleable heatmap layer (demo random intensities)
    - User geolocation + tracking mode
    - Status + info panels styled with existing design tokens

  All data here is placeholder and easily swappable for real API calls later.
*/

// Facility categories & emoji (same spirit as original HTML example)
const FACILITY_ICONS = {
  hospital: '🏥',
  public_washroom: '🚻',
  school: '🏫',
  police_station: '🚔',
  fire_station: '🚒',
  atm: '🏧',
  bank: '🏦',
  pharmacy: '💊',
  gas_station: '⛽',
  restaurant: '🍽️',
  hotel: '🏨',
  shopping_mall: '🛍️',
  bus_stop: '🚌',
  metro_station: '🚇',
  parking: '🅿️',
  post_office: '📮',
  library: '📚',
  mosque: '🕌',
  temple: '🛕',
  church: '⛪',
  park: '🌳',
  gym: '💪',
  cinema: '🎬',
  market: '🛒',
  government_office: '🏛️'
};

// Local fallback demo facilities (used if API unavailable)
const FALLBACK_DEMO_FACILITIES = [
  { id: 'fb1', type: 'hospital', name: 'City Care Hospital', coords: [77.2152, 28.6129] },
  { id: 'fb2', type: 'pharmacy', name: 'Wellness Pharmacy', coords: [77.2052, 28.622] },
  { id: 'fb3', type: 'atm', name: 'Bank ATM 24x7', coords: [77.199, 28.603] },
  { id: 'fb4', type: 'restaurant', name: 'Spice Route', coords: [77.229, 28.61] },
  { id: 'fb5', type: 'park', name: 'Central Greens', coords: [77.21, 28.6] },
  { id: 'fb6', type: 'school', name: 'Modern Public School', coords: [77.225, 28.59] },
  { id: 'fb7', type: 'police_station', name: 'CP Police HQ', coords: [77.2085, 28.63] },
  { id: 'fb8', type: 'library', name: 'Knowledge Hub Library', coords: [77.235, 28.605] },
  { id: 'fb9', type: 'bus_stop', name: 'ISBT Stand', coords: [77.24, 28.66] },
  { id: 'fb10', type: 'market', name: 'Old Bazaar', coords: [77.19, 28.65] }
];

// Convert facilities -> GeoJSON for heatmap (with random intensity)
function facilitiesToHeatGeoJSON(facilities) {
  return {
    type: 'FeatureCollection',
    features: facilities.map(f => ({
      type: 'Feature',
      properties: {
        id: f.id,
        type: f.type,
        name: f.name,
        intensity: Math.random() * 0.75 + 0.25 // 0.25 - 1 range
      },
      geometry: { type: 'Point', coordinates: f.coords }
    }))
  };
}

const STATUS_TIMEOUT_MS = 3200;

const HeatMap = () => {
  const { theme, toggleTheme } = useTheme();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const facilitiesRef = useRef([]);
  const facilityMarkersRef = useRef([]);
  const routingRef = useRef(null);
  const heatLayerRef = useRef(null);
  const routeActiveRef = useRef(false);
  const heatLayerAttemptsRef = useRef(0);
  const markerAttemptsRef = useRef(0);
  const mapDestroyedRef = useRef(false);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [markerCount, setMarkerCount] = useState(0);
  const [heatPointCount, setHeatPointCount] = useState(0);
  const [status, setStatus] = useState('Ready');
  const statusTimerRef = useRef(null);
  const [locationInfo, setLocationInfo] = useState(null);
  const [heatmapHours, setHeatmapHours] = useState(6); // timeframe filter for heatmap API
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendMode, setBackendMode] = useState(false); // false if using fallback demo
  const [lastUpdated, setLastUpdated] = useState(null);
  const mountedRef = useRef(true);

  // Helper: show ephemeral status
  const pushStatus = useCallback(msg => {
    setStatus(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatus('Ready'), STATUS_TIMEOUT_MS);
  }, []);

  // Dynamically built heat points (from facilities or heatmap API)
  const heatDataRef = useRef([]); // [{lng,lat,intensity}]

  // Domain fallback (primary huggingface variant may 404 some endpoints)
  const triedAltRef = useRef(false);
  const activeBaseRef = useRef('primary'); // 'primary' | 'alt'

  // Helper to ensure map fully ready before adding layers/markers
  const withMapReady = (fn) => {
    const map = mapRef.current;
    if (!map) return;
    if (map._loaded) fn(map); else map.once('load', () => fn(map));
  };

  // Initialize map once
  useEffect(() => {
    if (mapRef.current) return; // already initialised
    if (!mapContainerRef.current) return; // DOM not yet mounted
    const map = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    mapRef.current = map;
    // Expose simple global route helper for popup button
    window.__hm_route_to = (lat, lng, name) => {
      if (!userMarkerRef.current) { pushStatus('Locate yourself first'); return; }
      const start = userMarkerRef.current.getLatLng();
      if (routingRef.current) { map.removeControl(routingRef.current); routingRef.current = null; }
      routingRef.current = L.Routing.control({
        waypoints: [start, L.latLng(lat, lng)],
        addWaypoints: false,
        routeWhileDragging: false,
        showAlternatives: false,
        createMarker: () => null,
        lineOptions: { styles: [{ color: '#2563eb', weight: 5, opacity: 0.85 }] }
      }).addTo(map);
      pushStatus('Routing to ' + name);
    };
    // Initial data load
    fetchMapAndHeatData();
  // Defer size invalidation (especially if parent animates / tab switch)
  setTimeout(() => { try { map.invalidateSize(); } catch {} }, 100);
  const onResize = () => { try { map.invalidateSize(); } catch {} };
  window.addEventListener('resize', onResize);
  return () => { mapDestroyedRef.current = true; try { map.remove(); } catch {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track mounted state for async safety
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Refetch when heatmapHours changes (live mode UX)
  useEffect(() => {
    if (!mapRef.current) return; // skip until map ready
    fetchMapAndHeatData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatmapHours]);

  // Add / rebuild heat layer when theme toggles (for color adapt if desired)
  useEffect(() => {
    // Adjust heat layer gradient via opacity tweak (Leaflet heat has limited palette control)
    if (heatLayerRef.current) {
      // Just force redraw by resetting options
      const layer = heatLayerRef.current;
      layer.setOptions({
        radius: theme === 'dark' ? 28 : 25,
        blur: theme === 'dark' ? 22 : 18
      });
    }
  }, [theme]);

  // Heatmap gradient tokens
  const HEATMAP_GRADIENT_DARK = [
    'interpolate', ['linear'], ['heatmap-density'],
    0, 'rgba(0,0,0,0)',
    0.2, 'rgba(255,143,42,0.15)',
    0.4, 'rgba(255,143,42,0.35)',
    0.6, 'rgba(255,92,108,0.55)',
    0.8, 'rgba(255,92,108,0.85)',
    1, 'rgba(255,255,255,0.95)'
  ];
  const HEATMAP_GRADIENT_LIGHT = [
    'interpolate', ['linear'], ['heatmap-density'],
    0, 'rgba(0,0,0,0)',
    0.2, 'rgba(255,122,0,0.20)',
    0.4, 'rgba(255,122,0,0.40)',
    0.6, 'rgba(224,49,49,0.55)',
    0.8, 'rgba(224,49,49,0.85)',
    1, 'rgba(0,0,0,0.95)'
  ];

  const addHeatLayer = () => {
    const map = mapRef.current;
    if (!map || !mountedRef.current) return;
    // If map not fully loaded yet, wait
    if (!map._loaded) { map.once('load', addHeatLayer); return; }
    // If container got detached (e.g., conditional render), abort
    if (!map._container || !document.body.contains(map._container)) return;
    // Leaflet heat plugin expects overlayPane; if not ready retry a few times
    if (!map._panes || !map._panes.overlayPane) {
      if (heatLayerAttemptsRef.current < 5) {
        heatLayerAttemptsRef.current += 1;
        setTimeout(addHeatLayer, 120);
      }
      return;
    }
    if (!heatDataRef.current.length) {
      heatDataRef.current = facilitiesRef.current.map(f => ({ lat: f.coords[1], lng: f.coords[0], intensity: Math.random() * 0.75 + 0.25 }));
    }
    const points = heatDataRef.current
      .map(p => [p.lat, p.lng, p.intensity || 1])
      .filter(pt => pt.length === 3 && pt.every(v => typeof v === 'number' && isFinite(v)));
    if (!points.length) return;
    try {
      if (heatLayerRef.current) {
        heatLayerRef.current.setLatLngs(points);
        heatLayerRef.current.setOptions({ maxZoom: 17 });
      } else {
        heatLayerRef.current = L.heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.2: '#2b83ba',
            0.4: '#abdda4',
            0.6: '#ffffbf',
            0.8: '#fdae61',
            1.0: '#d7191c'
          }
        });
        // Safeguard: only add layer if overlayPane still present
        if (map._panes?.overlayPane) heatLayerRef.current.addTo(map);
      }
      if (heatLayerRef.current?.getPane?.()) {
        heatLayerRef.current.setOpacity(isHeatmapVisible ? 0.9 : 0);
      }
    } catch (e) {
      if (heatLayerAttemptsRef.current < 5) {
        heatLayerAttemptsRef.current += 1;
        setTimeout(addHeatLayer, 150);
      }
      // eslint-disable-next-line no-console
      console.warn('Heat layer add failed', e);
    }
  };

  // Create HTML markers for each facility
  const addFacilityMarkers = () => {
    withMapReady((map) => {
      // Safety: ensure container still exists (component not unmounted)
      if (!mountedRef.current || mapDestroyedRef.current) return;
      if (!map?._container || !document.body.contains(map._container)) return;
      // Ensure marker pane exists; if not, retry a few times (dev StrictMode double-mount scenarios)
      if (!map._panes || !map._panes.markerPane) {
        if (markerAttemptsRef.current < 6) {
          markerAttemptsRef.current += 1;
          setTimeout(addFacilityMarkers, 120);
        }
        return;
      }
      facilityMarkersRef.current.forEach(m => m.remove());
      facilityMarkersRef.current = [];
      facilitiesRef.current.forEach(f => {
        try {
          if (!Array.isArray(f.coords) || f.coords.length < 2) return;
          const [lng, lat] = f.coords;
      if (typeof lng !== 'number' || typeof lat !== 'number' || !isFinite(lng) || !isFinite(lat)) return;
          if (mapDestroyedRef.current) return;
          if (!map._panes?.markerPane) throw new Error('markerPane missing');
          const emoji = FACILITY_ICONS[f.type] || '📍';
          const icon = L.divIcon({
            className: 'facility-marker',
            html: `<div style="font-size:22px; line-height:22px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.45));">${emoji}</div>`
          });
          const safeName = (f.name || 'Facility').replace(/"/g,'&quot;');
          let marker;
          try {
            marker = L.marker([lat, lng], { icon }).addTo(map);
          } catch (inner) {
            // Pane race condition: retry once quickly
            if (markerAttemptsRef.current < 6) {
              markerAttemptsRef.current += 1;
              setTimeout(addFacilityMarkers, 100);
            }
            throw inner;
          }
          marker.bindPopup(`<div style='font-family:system-ui;min-width:180px'><h4 style='margin:0 0 4px;font-size:14px'>${safeName}</h4><div style='font-size:12px;opacity:.7'>${(f.type||'facility').replace(/_/g,' ')}</div><button style='margin-top:6px;font-size:11px;padding:4px 8px;border-radius:6px;background:#2563eb;color:#fff;border:none;cursor:pointer' onclick='window.__hm_route_to && window.__hm_route_to(${lat},${lng},"${safeName}")'>🧭 Route</button></div>`);
          facilityMarkersRef.current.push(marker);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Marker add failed', e, f);
        }
      });
      if (!facilityMarkersRef.current.length && facilitiesRef.current.length && markerAttemptsRef.current < 6) {
        // If none succeeded, attempt another cycle after short delay
        markerAttemptsRef.current += 1;
        setTimeout(addFacilityMarkers, 150);
      }
    });
  };

  const toggleHeatmap = () => {
    const map = mapRef.current;
    if (!map) return;
    const visible = !isHeatmapVisible;
    setIsHeatmapVisible(visible);
  if (heatLayerRef.current) heatLayerRef.current.setOpacity(visible ? 0.9 : 0);
    pushStatus(visible ? 'Heatmap shown' : 'Heatmap hidden');
  };

  const clearRoute = () => {
    const map = mapRef.current;
    if (routingRef.current && map) {
      try { map.removeControl(routingRef.current); } catch { /* ignore */ }
      routingRef.current = null;
      routeActiveRef.current = false;
      pushStatus('Route cleared');
    }
  };

  const locateUser = () => {
    if (!('geolocation' in navigator)) {
      pushStatus('Geolocation unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setLocationInfo({ latitude, longitude, ts: Date.now() });
        const map = mapRef.current;
        if (!map) return;
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          userMarkerRef.current = L.marker([latitude, longitude], { icon: L.divIcon({ className: 'user-loc', html: '<div style="width:18px;height:18px;background:#ff8f2a;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(255,143,42,0.35);"></div>' })}).addTo(map);
        }
        map.setView([latitude, longitude], 13.5, { animate: true });
  pushStatus('Location updated');
  // Fire-and-forget update
  sendLocationUpdate({ lat: latitude, lng: longitude }).catch(() => {});
      },
      () => pushStatus('Location denied'),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
  };

  const toggleTracking = () => {
    if (!isTracking) {
      if (!('geolocation' in navigator)) { pushStatus('No geolocation'); return; }
      const id = navigator.geolocation.watchPosition(
        pos => {
          const { latitude, longitude } = pos.coords;
          setLocationInfo({ latitude, longitude, ts: Date.now() });
          if (userMarkerRef.current) userMarkerRef.current.setLatLng([latitude, longitude]);
          sendLocationUpdate({ lat: latitude, lng: longitude }).catch(() => {});
        },
        () => pushStatus('Tracking error'),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
      watchIdRef.current = id;
      setIsTracking(true);
      pushStatus('Tracking started');
    } else {
  if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
      pushStatus('Tracking stopped');
    }
  };

  const refreshData = () => {
    fetchMapAndHeatData(true);
  };

  // Fetch facilities + heatmap from backend
  const fetchMapAndHeatData = async (manual = false) => {
    const started = Date.now();
    setLoading(true);
    setError(null);
    try {
      pushStatus(manual ? 'Refreshing data…' : 'Loading map data…');
      let usedFallback = false;
      let mapData;
      try {
        mapData = await getUserMapData();
      } catch (err) {
        if (!mountedRef.current) return;
        // If the primary configured base returns 404, attempt alternate patterns.
        if (err?.status === 404 || /404/i.test(err?.message || '')) {
          const fallbackAttempts = [
            'https://krish09bha-dhruvai2.hf.space/api/user-map-data',
            'https://krish09bha-dhruvai2.hf.space/user-map-data',
            'https://krish09bha-dhruvai.hf.space/user-map-data'
          ];
          for (const url of fallbackAttempts) {
            try {
              const resp = await fetch(url);
              if (resp.ok) { mapData = await resp.json(); activeBaseRef.current = url.includes('2') ? 'alt' : 'primary-noapi'; break; }
            } catch { /* ignore single attempt */ }
          }
        }
      }
      if (!mountedRef.current) return;
      const markers = Array.isArray(mapData?.markers) ? mapData.markers : [];
      facilitiesRef.current = markers.map(m => ({
        id: m.id || m._id || Math.random().toString(36).slice(2),
        type: m.type?.toLowerCase() || 'facility',
        name: m.name || m.type || 'Facility',
        coords: [m.lng, m.lat]
      }));
      if (!facilitiesRef.current.length) {
        facilitiesRef.current = FALLBACK_DEMO_FACILITIES;
        usedFallback = true;
      }
      setMarkerCount(facilitiesRef.current.length);
      addFacilityMarkers();

      let heatResp;
      try {
        heatResp = await getHeatmapData(heatmapHours);
      } catch (err) {
        if (!mountedRef.current) return;
        if (err?.status === 404 || /404/i.test(err?.message || '')) {
          const heatFallbacks = [
            `https://krish09bha-dhruvai2.hf.space/api/heatmap-data?hours=${heatmapHours}`,
            `https://krish09bha-dhruvai2.hf.space/heatmap-data?hours=${heatmapHours}`,
            `https://krish09bha-dhruvai.hf.space/heatmap-data?hours=${heatmapHours}`
          ];
          for (const url of heatFallbacks) {
            try { const r = await fetch(url); if (r.ok) { heatResp = await r.json(); activeBaseRef.current = url.includes('2') ? 'alt' : 'primary-noapi'; break; } } catch { /* single attempt fail */ }
          }
        }
        if (!heatResp) usedFallback = true;
      }
      if (!mountedRef.current) return;
      if (Array.isArray(heatResp?.heatmap_points) && heatResp.heatmap_points.length) {
        heatDataRef.current = heatResp.heatmap_points.map(p => ({ lat: p.lat, lng: p.lng, intensity: p.intensity || 1 }));
        setHeatPointCount(heatResp.heatmap_points.length);
      } else {
        heatDataRef.current = facilitiesRef.current.map(f => ({ lat: f.coords[1], lng: f.coords[0], intensity: Math.random() * 0.75 + 0.25 }));
        setHeatPointCount(heatDataRef.current.length);
        usedFallback = true;
      }
      addHeatLayer();
      setBackendMode(!usedFallback);
      setLastUpdated(new Date());
      pushStatus((manual ? 'Data refreshed • ' : 'Map ready • ') + (Date.now() - started) + 'ms');
    } catch (e) {
      setBackendMode(false);
      setError(e?.message || 'Failed loading map data');
      facilitiesRef.current = FALLBACK_DEMO_FACILITIES;
      setMarkerCount(facilitiesRef.current.length);
      addFacilityMarkers();
      heatDataRef.current = facilitiesRef.current.map(f => ({ lat: f.coords[1], lng: f.coords[0], intensity: Math.random() * 0.75 + 0.25 }));
      setHeatPointCount(heatDataRef.current.length);
      addHeatLayer();
      pushStatus('Offline demo data');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup timers & watchers
  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    facilityMarkersRef.current.forEach(m => m.remove());
    if (heatLayerRef.current) heatLayerRef.current.remove();
    if (routingRef.current) routingRef.current.remove();
  }, []);

  const themeLabel = theme === 'dark' ? 'Light' : 'Dark';

  return (
    <div className="mk-gradient-bg flex flex-col h-full w-full" style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div className="flex flex-col gap-1 px-6 py-4 mk-border" style={{ background: 'var(--mk-surface)', backdropFilter: 'blur(12px)' }}>
        <h1 className="text-xl font-medium flex items-center gap-2">
          <span role="img" aria-label="map">🗺️</span> Public Facilities Heatmap {backendMode ? <span className="mk-badge" style={{ background: 'var(--mk-accent)' }}>LIVE</span> : <span className="mk-badge" style={{ background: '#aa5a00' }}>FALLBACK</span>}
        </h1>
        <p className="mk-text-muted text-sm">Explore facilities & real-time crowd intensity {backendMode ? 'from backend services' : '(demo fallback)'}.</p>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3 mk-border" style={{ background: 'var(--mk-surface-2)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={locateUser} className="mk-btn-tab" title="Locate Me">📍 Locate</button>
        <button onClick={refreshData} className="mk-btn-tab" title="Refresh Data">🔄 {loading ? 'Loading…' : 'Refresh'}</button>
  <button onClick={clearRoute} className="mk-btn-tab" title="Clear Route">🗑️ Route</button>
  <button onClick={toggleHeatmap} className={`mk-btn-tab ${isHeatmapVisible ? 'mk-btn-tab-active' : ''}`} title="Toggle Heatmap">🔥 {isHeatmapVisible ? 'Hide' : 'Show'}</button>
        <button onClick={toggleTracking} className={`mk-btn-tab ${isTracking ? 'mk-btn-tab-active' : ''}`} title="Track Location">{isTracking ? '🛑 Stop Track' : '📡 Track'}</button>
        <button onClick={toggleTheme} className="mk-btn-tab" title="Toggle Theme">🌓 {themeLabel}</button>
        <div className="flex items-center gap-1 ml-2 text-xs mk-text-muted">
          <label htmlFor="hm-hours" className="opacity-70">Hours:</label>
          <select id="hm-hours" value={heatmapHours} onChange={e => setHeatmapHours(Number(e.target.value))} className="mk-input px-2 py-1 text-xs" style={{ background:'var(--mk-surface-3)' }}>
            {[1,3,6,12,24].map(h => <option key={h} value={h}>{h}h</option>)}
          </select>
        </div>
        <div className="ml-auto text-xs mk-text-muted flex items-center gap-2">Markers: <span className="mk-badge" style={{ fontSize: 11 }}>{markerCount}</span></div>
        <div className="text-xs mk-text-muted flex items-center gap-1">Heat pts: <span className="mk-badge" style={{ fontSize: 11 }}>{heatPointCount}</span></div>
      </div>

      {/* Panels */}
      <div className="grid gap-4 md:grid-cols-3 px-6 py-4">
        <div className="mk-card p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold mk-text-secondary flex items-center gap-2">📍 Location</h3>
          {locationInfo ? (
            <div className="text-xs mk-text-muted leading-relaxed">
              Lat: {locationInfo.latitude.toFixed(5)}<br />Lng: {locationInfo.longitude.toFixed(5)}
            </div>
          ) : <div className="text-xs mk-text-faint">Not acquired yet</div>}
          <div className="mk-badge-accent" style={{ fontSize: 9 }}>{backendMode ? 'Live updates sent' : 'Local only'}</div>
        </div>
        <div className="mk-card p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold mk-text-secondary flex items-center gap-2">🔥 Heatmap</h3>
          <div className="text-xs mk-text-muted">{backendMode ? 'Aggregated user location clusters.' : 'Randomized intensity from demo facilities.'}</div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            <span className="mk-badge">Weight random</span>
            <span className="mk-badge">Radius zoom-based</span>
            <span className="mk-badge">Adaptive theme</span>
            <span className="mk-badge">{heatmapHours}h</span>
          </div>
          {lastUpdated && <div className="text-[10px] mk-text-faint">Updated {lastUpdated.toLocaleTimeString()}</div>}
        </div>
        <div className="mk-card p-4 flex flex-col gap-2">
          <h3 className="text-sm font-semibold mk-text-secondary flex items-center gap-2">ℹ️ Notes</h3>
          <ul className="text-xs mk-text-muted list-disc pl-4 space-y-1">
            <li>{backendMode ? `Facilities & heat points from API (${activeBaseRef.current})` : 'Fallback demo dataset active'}</li>
            <li>Timeframe filter queries /api/heatmap-data?hours=H</li>
            <li>Routing enabled via leaflet-routing-machine (button inside popup)</li>
            <li>OpenStreetMap tiles</li>
            {error && <li className="text-red-400">Error: {error}</li>}
          </ul>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative flex-1 px-6 pb-6" style={{ minHeight: 420 }}>
        <div
          ref={mapContainerRef}
          className="w-full rounded-lg overflow-hidden mk-border"
          style={{
            boxShadow: '0 4px 18px -6px rgba(0,0,0,.5)',
            height: 'calc(100vh - 260px)', // mimic static HTML height calc
            minHeight: 420
          }}
        />
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] px-4 py-2 rounded-full" style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)' }}>
          {status}
        </div>
      </div>
    </div>
  );
};

export default HeatMap;