import React, { useEffect, useRef, useState, useCallback } from 'react';
import heatMapApi from '../../../Services/heatMapApi';
import '../../../App.css'; // assume global base styles; adjust if needed

// NOTE: We intentionally load Leaflet & Leaflet-Draw CSS via CDN to avoid extra package setup.
// If you later install leaflet-draw from npm, you can replace the dynamic asset injection with imports.

const MARKER_TYPES = [
  'toilets','drinking_water','food_distribution','tent_areas','dharamshalas',
  'hospitals','first_aid','police_booths','fire_station','lost_found',
  'railway_station','bus_stands','parking_areas','pickup_dropoff','mandir'
];

const TYPE_ICONS = {
  toilets: '🚻',
  drinking_water: '💧',
  food_distribution: '🍛',
  tent_areas: '⛺',
  dharamshalas: '🏨',
  hospitals: '🏥',
  first_aid: '⛑️',
  police_booths: '👮',
  fire_station: '🚒',
  lost_found: '🧳',
  railway_station: '🚉',
  bus_stands: '🚌',
  parking_areas: '🅿️',
  pickup_dropoff: '🚖',
  mandir: '🛕'
};

const TABS = [
  { id: 'markers', label: 'Markers' },
  { id: 'areas', label: 'Areas' },
  { id: 'zones', label: 'Zones' }
];

const MapEditor = () => {
  const mapRef = useRef(null);
  const mapNodeRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const drawControlRef = useRef(null);
  const leafletLoadedRef = useRef(false);

  const [activeTab, setActiveTab] = useState('markers');
  const [loading, setLoading] = useState(true);
  const [scriptError, setScriptError] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedAreaForZone, setSelectedAreaForZone] = useState('');
  const [areaFilterForMarkers, setAreaFilterForMarkers] = useState('');
  const [zoneFilterForMarkers, setZoneFilterForMarkers] = useState('');
  const [creatingPolygonType, setCreatingPolygonType] = useState(null); // 'area' | 'zone' | null
  const [pendingAreaData, setPendingAreaData] = useState({ name: '', description: '' });
  const [pendingZoneData, setPendingZoneData] = useState({ name: '', description: '', area_id: '' });
  const [newMarker, setNewMarker] = useState({
    type: MARKER_TYPES[0],
    name: '',
    lat: '',
    lng: '',
    description: '',
    area_id: '',
    zone_id: ''
  });
  const [message, setMessage] = useState('');
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);

  // Utility: set transient message
  const flash = useCallback((msg, ms = 3500) => {
    setMessage(msg);
    if (ms) setTimeout(() => setMessage(''), ms);
  }, []);

  // Load CDN assets for Leaflet + Draw
  useEffect(() => {
    const leafletCss = document.querySelector('link[data-leaflet]');
    if (!leafletCss) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      l.setAttribute('data-leaflet','');
      document.head.appendChild(l);
    }
    const drawCss = document.querySelector('link[data-leaflet-draw]');
    if (!drawCss) {
      const l2 = document.createElement('link');
      l2.rel = 'stylesheet';
      l2.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
      l2.setAttribute('data-leaflet-draw','');
      document.head.appendChild(l2);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
      script2.async = true;
      script2.onload = () => {
        leafletLoadedRef.current = true;
        initMap();
      };
      script2.onerror = () => setScriptError('Failed loading leaflet-draw');
      document.body.appendChild(script2);
    };
    script.onerror = () => setScriptError('Failed loading Leaflet');
    document.body.appendChild(script);
    return () => {
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (_) { /* ignore */ }
        mapRef.current = null;
      }
      if (mapNodeRef.current && mapNodeRef.current._leaflet_id) {
        try { delete mapNodeRef.current._leaflet_id; } catch (_) { mapNodeRef.current._leaflet_id = null; }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize map
  const initMap = () => {
    if (!mapNodeRef.current || !window.L) return;
    const L = window.L;
    if (mapNodeRef.current._leaflet_id) {
      try { mapRef.current && mapRef.current.remove(); } catch (_) { /* ignore */ }
      try { delete mapNodeRef.current._leaflet_id; } catch (_) { mapNodeRef.current._leaflet_id = null; }
    }
    mapRef.current = L.map(mapNodeRef.current).setView([28.6139, 77.2090], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapRef.current);
    drawnItemsRef.current = new L.FeatureGroup();
    mapRef.current.addLayer(drawnItemsRef.current);

    drawControlRef.current = new L.Control.Draw({
      edit: { featureGroup: drawnItemsRef.current },
      draw: { polygon: { allowIntersection: false, showArea: true }, polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false }
    });
    mapRef.current.addControl(drawControlRef.current);

    mapRef.current.on('click', (e) => {
      if (isPlacingMarker) {
        setNewMarker(m => ({ ...m, lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) }));
        flash('Marker coordinates captured');
      }
    });

    mapRef.current.on(window.L.Draw.Event.CREATED, (e) => {
      const { layer } = e;
      drawnItemsRef.current.addLayer(layer);
      const latlngs = layer.getLatLngs();
      const coords = normalizeLatLngs(latlngs);
      if (creatingPolygonType === 'area') {
        createAreaWithPolygon(coords);
      } else if (creatingPolygonType === 'zone') {
        createZoneWithPolygon(coords);
      } else {
        flash('Polygon drawn (no type selected)');
      }
      setCreatingPolygonType(null);
    });

    setLoading(false);
    refreshAll();
    setTimeout(() => mapRef.current.invalidateSize(), 150);
  };

  const normalizeLatLngs = (latlngs) => {
    if (!Array.isArray(latlngs)) return [];
    const flat = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
    return flat.map(pt => [pt.lat, pt.lng]);
  };

  // API integration wrappers
  const loadMarkers = useCallback(async () => {
    try { const data = await heatMapApi.listMarkers(); setMarkers(Array.isArray(data) ? data : (data?.markers || [])); } catch (e) { flash('Error loading markers: ' + e.message); }
  }, [flash]);

  const loadAreas = useCallback(async () => {
    try { const data = await heatMapApi.listAreas(); setAreas(Array.isArray(data) ? data : []); } catch (e) { flash('Error loading areas: ' + e.message); }
  }, [flash]);

  const loadZones = useCallback(async () => {
    try { const data = await heatMapApi.listZones(); setZones(Array.isArray(data) ? data : []); } catch (e) { flash('Error loading zones: ' + e.message); }
  }, [flash]);

  const refreshAll = useCallback(async () => { await Promise.all([loadMarkers(), loadAreas(), loadZones()]); }, [loadMarkers, loadAreas, loadZones]);

  // Marker creation
  const handleCreateMarker = async (e) => {
    e.preventDefault();
    const { type, name, lat, lng, description, area_id, zone_id } = newMarker;
    if (!lat || !lng) { flash('Lat/Lng required (click on map or enter manually)'); return; }
    try {
      const payload = { type, name, lat: parseFloat(lat), lng: parseFloat(lng), description, area_id: area_id || undefined, zone_id: zone_id || undefined };
      await heatMapApi.createMarker(payload);
      flash('Marker created');
      setNewMarker(m => ({ ...m, name: '', lat: '', lng: '', description: '' }));
      loadMarkers();
    } catch (e2) { flash('Create failed: ' + e2.message); }
  };

  // Area creation
  const createAreaWithPolygon = async (coords) => {
    try { const payload = { name: pendingAreaData.name || ('Area ' + (areas.length + 1)), description: pendingAreaData.description, polygon: coords }; await heatMapApi.createArea(payload); flash('Area created'); setPendingAreaData({ name: '', description: '' }); loadAreas(); } catch (e) { flash('Area create failed: ' + e.message); }
  };

  const handleAreaFormSubmit = async (e) => {
    e.preventDefault();
    if (creatingPolygonType === 'area') { flash('Finish drawing the polygon on map'); return; }
    createAreaWithPolygon(undefined);
  };

  // Zone creation
  const createZoneWithPolygon = async (coords) => {
    try { if (!pendingZoneData.area_id) { flash('Select Area first for zone'); return; } const payload = { name: pendingZoneData.name || ('Zone ' + (zones.length + 1)), description: pendingZoneData.description, area_id: pendingZoneData.area_id, polygon: coords }; await heatMapApi.createZone(payload); flash('Zone created'); setPendingZoneData(z => ({ ...z, name: '', description: '' })); loadZones(); } catch (e) { flash('Zone create failed: ' + e.message); }
  };

  const handleZoneFormSubmit = (e) => {
    e.preventDefault();
    if (!pendingZoneData.area_id) { flash('Select Area'); return; }
    if (creatingPolygonType === 'zone') { flash('Finish drawing the polygon'); return; }
    createZoneWithPolygon(undefined);
  };

  // Delete marker
  const deleteMarker = async (id) => { if (!window.confirm('Delete marker?')) return; try { await heatMapApi.deleteMarker(id); flash('Deleted'); loadMarkers(); } catch (e) { flash('Delete failed: ' + e.message); } };

  // Filtered markers
  const filteredMarkers = markers.filter(m => { if (areaFilterForMarkers && m.area_id !== areaFilterForMarkers) return false; if (zoneFilterForMarkers && m.zone_id !== zoneFilterForMarkers) return false; return true; });

  // Tab content renderers (markup adjusted for styling only)
  const renderMarkersTab = () => (
    <div className="tab-pane">
      <h3>Create Marker</h3>
      <form onSubmit={handleCreateMarker} className="form-grid">
        <label>Type
          <select value={newMarker.type} onChange={e => setNewMarker(m => ({ ...m, type: e.target.value }))}>
            {MARKER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Name
          <input value={newMarker.name} onChange={e => setNewMarker(m => ({ ...m, name: e.target.value }))} placeholder="Marker name" />
        </label>
        <div className="coord-row">
          <label>Lat
            <input value={newMarker.lat} onChange={e => setNewMarker(m => ({ ...m, lat: e.target.value }))} placeholder="Latitude" />
          </label>
          <label>Lng
            <input value={newMarker.lng} onChange={e => setNewMarker(m => ({ ...m, lng: e.target.value }))} placeholder="Longitude" />
          </label>
        </div>
        <button type="button" onClick={() => setIsPlacingMarker(v => !v)} className={isPlacingMarker ? 'secondary active' : 'secondary'}>
          {isPlacingMarker ? 'Click map to set coords (ON)' : 'Enable map click for coords'}
        </button>
        <label>Description
          <textarea rows={2} value={newMarker.description} onChange={e => setNewMarker(m => ({ ...m, description: e.target.value }))} />
        </label>
        <label>Area (optional)
          <select value={newMarker.area_id} onChange={e => setNewMarker(m => ({ ...m, area_id: e.target.value, zone_id: '' }))}>
            <option value="">-- none --</option>
            {areas.map(a => <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>)}
          </select>
        </label>
        <label>Zone (optional)
          <select value={newMarker.zone_id} onChange={e => setNewMarker(m => ({ ...m, zone_id: e.target.value }))} disabled={!newMarker.area_id}>
            <option value="">-- none --</option>
            {zones.filter(z => z.area_id === newMarker.area_id).map(z => <option key={z.id || z._id} value={z.id || z._id}>{z.name}</option>)}
          </select>
        </label>
        <button type="submit">Create Marker</button>
      </form>

      <h3 style={{ marginTop: '1.5rem' }}>Markers</h3>
      <div className="filter-row">
        <select value={areaFilterForMarkers} onChange={e => { setAreaFilterForMarkers(e.target.value); setZoneFilterForMarkers(''); }}>
          <option value="">All Areas</option>
          {areas.map(a => <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>)}
        </select>
        <select value={zoneFilterForMarkers} onChange={e => setZoneFilterForMarkers(e.target.value)} disabled={!areaFilterForMarkers}>
          <option value="">All Zones</option>
          {zones.filter(z => !areaFilterForMarkers || z.area_id === areaFilterForMarkers).map(z => <option key={z.id || z._id} value={z.id || z._id}>{z.name}</option>)}
        </select>
        <button type="button" className="secondary" onClick={() => refreshAll()}>↻</button>
      </div>
      <ul className="item-list markers-scroll">
        {filteredMarkers.map(m => (
          <li key={m.id || m._id} className="item marker-item">
            <div className="item-header">
              <div className="title-row">
                <span className="type-badge" data-type={m.type}>{TYPE_ICONS[m.type] || '📍'}</span>
                <strong className="truncate">{m.name || '(unnamed)'}</strong>
              </div>
              <button className="danger small" onClick={() => deleteMarker(m.id || m._id)}>✕</button>
            </div>
            <div className="item-body">
              <small className="dims">{m.type} • {parseFloat(m.lat).toFixed(4)}, {parseFloat(m.lng).toFixed(4)}</small>
              {m.description && <p>{m.description}</p>}
            </div>
          </li>
        ))}
        {!filteredMarkers.length && <li className="empty">No markers</li>}
      </ul>
    </div>
  );

  const renderAreasTab = () => (
    <div className="tab-pane">
      <h3>Create Area</h3>
      <form onSubmit={handleAreaFormSubmit} className="form-grid">
        <label>Name
          <input value={pendingAreaData.name} onChange={e => setPendingAreaData(a => ({ ...a, name: e.target.value }))} placeholder="Area name" />
        </label>
        <label>Description
          <textarea rows={2} value={pendingAreaData.description} onChange={e => setPendingAreaData(a => ({ ...a, description: e.target.value }))} />
        </label>
        <div className="button-row">
          <button type="button" className={creatingPolygonType === 'area' ? 'secondary active' : 'secondary'} onClick={() => setCreatingPolygonType(p => p === 'area' ? null : 'area')}>{creatingPolygonType === 'area' ? 'Drawing ON - finish on map' : 'Draw Polygon'}</button>
          <button type="submit">Create (no polygon)</button>
        </div>
      </form>
      <h3 style={{ marginTop: '1.5rem' }}>Areas</h3>
      <ul className="item-list compact">
        {areas.map(a => (
          <li key={a.id || a._id} className="item area-item">
            <div className="item-header">
              <strong>{a.name}</strong>
              <span className={"pill " + (a.polygon ? 'pill-green' : 'pill-gray')}>{a.polygon ? 'Polygon' : 'No polygon'}</span>
            </div>
            {a.description && <p className="desc-text">{a.description}</p>}
          </li>
        ))}
        {!areas.length && <li className="empty">No areas</li>}
      </ul>
    </div>
  );

  const renderZonesTab = () => (
    <div className="tab-pane">
      <h3>Create Zone</h3>
      <form onSubmit={handleZoneFormSubmit} className="form-grid">
        <label>Area
          <select value={pendingZoneData.area_id} onChange={e => setPendingZoneData(z => ({ ...z, area_id: e.target.value }))}>
            <option value="">-- select area --</option>
            {areas.map(a => <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>)}
          </select>
        </label>
        <label>Name
          <input value={pendingZoneData.name} onChange={e => setPendingZoneData(z => ({ ...z, name: e.target.value }))} placeholder="Zone name" />
        </label>
        <label>Description
          <textarea rows={2} value={pendingZoneData.description} onChange={e => setPendingZoneData(z => ({ ...z, description: e.target.value }))} />
        </label>
        <div className="button-row">
          <button type="button" disabled={!pendingZoneData.area_id} className={creatingPolygonType === 'zone' ? 'secondary active' : 'secondary'} onClick={() => setCreatingPolygonType(p => p === 'zone' ? null : 'zone')}>{creatingPolygonType === 'zone' ? 'Drawing ON - finish on map' : 'Draw Polygon'}</button>
          <button type="submit">Create (no polygon)</button>
        </div>
      </form>
      <h3 style={{ marginTop: '1.5rem' }}>Zones</h3>
      <ul className="item-list compact">
        {zones.map(z => (
          <li key={z.id || z._id} className="item zone-item">
            <div className="item-header">
              <strong>{z.name}</strong>
              <span className={"pill " + (z.polygon ? 'pill-green' : 'pill-gray')}>{z.polygon ? 'Polygon' : 'No polygon'}</span>
            </div>
            <small className="meta-line">Area: {areas.find(a => (a.id||a._id) === z.area_id)?.name || '—'}</small>
            {z.description && <p className="desc-text">{z.description}</p>}
          </li>
        ))}
        {!zones.length && <li className="empty">No zones</li>}
      </ul>
    </div>
  );

  // Add markers to map each time markers list changes
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (mapRef.current._markerLayerGroup) {
      mapRef.current.removeLayer(mapRef.current._markerLayerGroup);
    }
    const grp = L.layerGroup();
    markers.forEach(m => {
      if (!m.lat || !m.lng) return;
      const icon = L.divIcon({ className: 'custom-marker', html: `<span>${TYPE_ICONS[m.type] || '📍'}</span>`, iconSize: [24,24], iconAnchor: [12,24] });
      const mk = L.marker([m.lat, m.lng], { icon });
      mk.bindPopup(`<strong>${m.name}</strong><br/>${m.type}<br/>${m.description || ''}`);
      grp.addLayer(mk);
    });
    grp.addTo(mapRef.current);
    mapRef.current._markerLayerGroup = grp;
  }, [markers]);

  return (
    <div className="map-editor-root">
      <div className="nav-header">
        <div className="nav-title">🗺️ Map Editor</div>
        <div className="nav-links">
          <button onClick={() => refreshAll()} className="secondary">Refresh All</button>
        </div>
      </div>
      <div className="editor-container">
        <div className="map-wrapper">
          {loading && <div className="overlay">Initializing map…</div>}
          {scriptError && <div className="overlay error">{scriptError}</div>}
          <div ref={mapNodeRef} id="map" style={{ width: '100%', height: '100%', minHeight: 500, border: '3px solid #333', borderRadius: 10 }} />
          {creatingPolygonType && <div className="drawing-hint">Drawing {creatingPolygonType} polygon – finish by clicking first point.</div>}
        </div>
        <aside className="sidebar">
          <div className="tabs">
            {TABS.map(t => <button key={t.id} className={t.id === activeTab ? 'tab-button active' : 'tab-button'} onClick={() => setActiveTab(t.id)}>{t.label}</button>)}
          </div>
          <div className="tab-content">
            {activeTab === 'markers' && renderMarkersTab()}
            {activeTab === 'areas' && renderAreasTab()}
            {activeTab === 'zones' && renderZonesTab()}
          </div>
          {message && <div className="result-box">{message}</div>}
          <div className="legend">
            <h4>Legend</h4>
            <ul>
              {MARKER_TYPES.map(t => <li key={t}><span>{TYPE_ICONS[t] || '📍'}</span> {t}</li>)}
            </ul>
          </div>
        </aside>
      </div>
      <style>{`
        /* THEME + LAYOUT ENHANCEMENTS */
        .map-editor-root { --c-bg:#f5f7fb; --c-panel:#ffffff; --c-border:#d9e2ec; --c-border-strong:#b3c1ce; --c-accent:#007cba; --c-accent-hover:#00649a; --c-danger:#d9534f; --c-text:#1f2d3d; --c-muted:#5c6b7a; --radius-s:4px; --radius-m:8px; --shadow-sm:0 1px 2px rgba(0,0,0,0.08); --shadow-md:0 3px 10px -2px rgba(0,0,0,0.12); font-family:system-ui, Arial, sans-serif; height:100%; display:flex; flex-direction:column; background:linear-gradient(135deg,#eef2f7,#f8fafc); color:var(--c-text);}        
        .nav-header { background:linear-gradient(90deg,#0f3e62,#17669b); color:#fff; padding:14px 22px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 6px rgba(0,0,0,0.25);}        
        .nav-title { font-weight:600; font-size:1.3rem; letter-spacing:.5px; display:flex; align-items:center; gap:6px;}        
        .editor-container { flex:1; display:flex; min-height:600px; overflow:hidden; backdrop-filter:blur(2px);}        
        .map-wrapper { position:relative; flex:1; background:#e2e8f0;}        
        .sidebar { width:430px; background:rgba(255,255,255,0.9); padding:18px 16px 22px; display:flex; flex-direction:column; overflow:auto; border-left:1px solid var(--c-border); box-shadow:-4px 0 12px -6px rgba(0,0,0,0.15); backdrop-filter:blur(6px);}        
        .sidebar::-webkit-scrollbar { width:10px;}        
        .sidebar::-webkit-scrollbar-track { background:transparent;}        
        .sidebar::-webkit-scrollbar-thumb { background:#c4d1dd; border-radius:20px; border:2px solid transparent; background-clip:content-box;}        
        .tabs { display:flex; gap:6px; margin-bottom:14px; position:sticky; top:0; background:inherit; padding-bottom:6px; z-index:10;}        
        .tab-button { flex:1; background:var(--c-panel); border:1px solid var(--c-border); padding:10px 12px; cursor:pointer; font-weight:600; border-radius:var(--radius-s); font-size:0.8rem; color:var(--c-muted); transition:.25s; position:relative;}        
        .tab-button:hover { color:var(--c-text); box-shadow:var(--shadow-sm);}        
        .tab-button.active { color:#fff; background:var(--c-accent); border-color:var(--c-accent); box-shadow:0 2px 6px -2px rgba(0,124,186,.6);}        
        .tab-pane h3 { margin:0 0 10px; font-size:0.95rem; letter-spacing:.5px; font-weight:600; color:var(--c-text);}        
        .tab-pane form { background:var(--c-panel); border:1px solid var(--c-border); padding:14px 14px 12px; border-radius:var(--radius-m); box-shadow:var(--shadow-sm); position:relative; overflow:hidden;}        
        .tab-pane form:before { content:""; position:absolute; inset:0; background:linear-gradient(135deg,rgba(0,124,186,0.05),rgba(0,124,186,0)); pointer-events:none;}        
        .form-grid label { display:block; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:10px; font-weight:600; color:var(--c-muted);}        
        .form-grid input, .form-grid select, .form-grid textarea { width:100%; box-sizing:border-box; padding:8px 10px; margin-top:5px; font-size:0.8rem; border:1px solid var(--c-border); border-radius:var(--radius-s); background:#fff; color:var(--c-text); font-family:inherit; transition:border-color .2s, box-shadow .2s;}        
        .form-grid input:focus, .form-grid select:focus, .form-grid textarea:focus { outline:none; border-color:var(--c-accent); box-shadow:0 0 0 2px rgba(0,124,186,0.25);}        
        .button-row { display:flex; gap:10px; margin-top:4px; flex-wrap:wrap;}        
        button { background:var(--c-accent); color:#fff; border:1px solid var(--c-accent); border-radius:var(--radius-s); padding:9px 14px; cursor:pointer; font-size:0.8rem; font-weight:600; letter-spacing:.4px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px -2px rgba(0,0,0,0.3); transition:background .2s, transform .15s, box-shadow .2s;}        
        button:hover:not(:disabled) { background:var(--c-accent-hover);}        
        button:active:not(:disabled) { transform:translateY(1px); box-shadow:0 1px 3px -1px rgba(0,0,0,0.4);}        
        button.secondary { background:#64748b; border-color:#64748b;}        
        button.secondary:hover { background:#526073;}        
        button.secondary.active { background:#334155; border-color:#334155;}        
        button.danger { background:var(--c-danger); border-color:var(--c-danger);}        
        button.danger:hover { background:#c94440;}        
        button.small { padding:4px 8px; font-size:0.65rem; font-weight:600; box-shadow:none;}        
        button:disabled { opacity:.55; cursor:not-allowed;}        
        .item-list { list-style:none; padding:0; margin:12px 0 4px;}        
        .item { background:var(--c-panel); border:1px solid var(--c-border); margin-bottom:10px; padding:10px 12px 8px; border-radius:var(--radius-m); position:relative; display:flex; flex-direction:column; gap:4px; box-shadow:var(--shadow-sm); transition:box-shadow .25s, transform .25s, border-color .25s;}        
        .item:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); border-color:var(--c-border-strong);}        
        .item.marker-item { border-left:5px solid var(--c-accent);}        
        .item.area-item { border-left:5px solid #6366f1;}        
        .item.zone-item { border-left:5px solid #0ea5e9;}        
        .item-header { display:flex; justify-content:space-between; align-items:center; gap:8px;}        
        .title-row { display:flex; align-items:center; gap:6px; min-width:0;}        
        .truncate { max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}        
        .item-body p, .desc-text { margin:3px 0 2px; font-size:0.7rem; line-height:1.15rem; color:var(--c-text);}        
        .meta-line { display:block; font-size:0.65rem; color:var(--c-muted); margin-bottom:2px;}        
        .dims { color:var(--c-muted);}        
        .empty { font-size:0.7rem; color:var(--c-muted); font-style:italic;}        
        .result-box { background:linear-gradient(135deg,#ffffff,#f1f7fb); border:1px solid var(--c-border); padding:10px 12px; border-radius:var(--radius-m); font-size:0.7rem; margin-top:10px; white-space:pre-wrap; display:flex; align-items:center; gap:8px; box-shadow:var(--shadow-sm); animation:fadeIn .4s ease;}        
        .legend { margin-top:18px; background:var(--c-panel); border:1px solid var(--c-border); padding:10px 12px; border-radius:var(--radius-m); box-shadow:var(--shadow-sm);}        
        .legend h4 { margin:0 0 8px; font-size:0.75rem; text-transform:uppercase; letter-spacing:.6px; color:var(--c-muted);}        
        .legend ul { list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:6px 10px;}        
        .legend li { font-size:0.65rem; display:flex; gap:6px; align-items:center; background:#f1f5f9; padding:4px 6px; border-radius:var(--radius-s); border:1px solid #e2e8f0;}        
        .coord-row { display:flex; gap:10px;}        
        .filter-row { display:flex; gap:8px; margin:8px 0 12px;}        
        .filter-row select { flex:1;}        
        .overlay { position:absolute; inset:0; background:linear-gradient(120deg,rgba(255,255,255,0.9),rgba(255,255,255,0.75)); display:flex; flex-direction:column; gap:8px; align-items:center; justify-content:center; font-weight:600; font-size:0.9rem; z-index:500; letter-spacing:.5px;}        
        .overlay.error { background:rgba(255,220,220,0.95); color:#7f1d1d;}        
        .drawing-hint { position:absolute; bottom:14px; left:14px; background:var(--c-accent); color:#fff; padding:8px 12px; border-radius:24px; font-size:0.65rem; z-index:400; box-shadow:0 4px 14px -4px rgba(0,0,0,0.4); letter-spacing:.5px; display:flex; align-items:center; gap:6px; animation:floatPulse 3s ease-in-out infinite;}        
        .custom-marker span { font-size:20px; line-height:20px; filter:drop-shadow(0 1px 2px rgba(0,0,0,.4));}        
        .type-badge { width:26px; height:26px; background:#f1f5f9; border:1px solid #d9e2ec; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:var(--shadow-sm);}        
        .pill { font-size:0.55rem; text-transform:uppercase; letter-spacing:.7px; padding:4px 8px 3px; border-radius:20px; background:#e2e8f0; color:#334155; font-weight:600; border:1px solid #cbd5e1;}        
        .pill-green { background:#dcfce7; color:#166534; border-color:#bbf7d0;}        
        .pill-gray { background:#f1f5f9; color:#475569; border-color:#e2e8f0;}        
        .markers-scroll { max-height:300px; overflow:auto; padding-right:4px;}        
        .markers-scroll::-webkit-scrollbar { width:8px;}        
        .markers-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:20px;}        
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:translateY(0);} }        
        @keyframes floatPulse { 0%,100% { transform:translateY(0);} 50% { transform:translateY(-3px);} }        
        @media (max-width:1280px) { .sidebar { width:380px; } }
        @media (max-width:1100px) { .sidebar { width:340px; } }
        @media (max-width:950px) { .sidebar { width:320px; } }
        @media (max-width:900px) { .editor-container { flex-direction:column; } .sidebar { width:auto; order:-1; box-shadow:0 4px 14px -6px rgba(0,0,0,0.2); border-left:none; border-bottom:1px solid var(--c-border); } .map-wrapper { min-height:420px; } }
        @media (max-width:560px) { .tab-button { padding:8px 6px; font-size:0.7rem; } .nav-title { font-size:1.05rem; } .sidebar { padding:14px 12px 18px; } }
        @media (max-width:440px) { .coord-row { flex-direction:column; } .truncate { max-width:120px; } }
        button:focus-visible, .form-grid input:focus-visible, .form-grid select:focus-visible, .form-grid textarea:focus-visible { outline:2px solid var(--c-accent); outline-offset:2px; }
        @media (prefers-contrast: more) { .item { border-color:var(--c-border-strong); } }
      `}</style>
    </div>
  );
};

export default MapEditor;