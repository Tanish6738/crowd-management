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
  // Layer groups and draw handler for programmatic drawing
  const areaLayerGroupRef = useRef(null);
  const zoneLayerGroupRef = useRef(null);
  const drawHandlerRef = useRef(null);

  const [activeTab, setActiveTab] = useState('markers');
  const [loading, setLoading] = useState(true);
  const [scriptError, setScriptError] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedAreaForZone, setSelectedAreaForZone] = useState('');
  const [areaFilterForMarkers, setAreaFilterForMarkers] = useState('');
  const [zoneFilterForMarkers, setZoneFilterForMarkers] = useState('');
  const [creatingPolygonType, setCreatingPolygonType] = useState(null); // 'area' | 'zone' | 'area-update' | 'zone-update' | null
  const [pendingAreaData, setPendingAreaData] = useState({ name: '', description: '' });
  const [pendingZoneData, setPendingZoneData] = useState({ name: '', description: '', area_id: '' });
  const [areaToUpdateId, setAreaToUpdateId] = useState('');
  const [zoneToUpdateId, setZoneToUpdateId] = useState('');
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

    // separate groups for areas and zones overlays
    areaLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    zoneLayerGroupRef.current = L.layerGroup().addTo(mapRef.current);

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
      // turn off live draw tool if enabled programmatically
      if (drawHandlerRef.current?.disable) {
        try { drawHandlerRef.current.disable(); } catch (_) {}
        drawHandlerRef.current = null;
      }
      if (creatingPolygonType === 'area') {
        createAreaWithPolygon(coords);
      } else if (creatingPolygonType === 'zone') {
        createZoneWithPolygon(coords);
      } else if (creatingPolygonType === 'area-update') {
        if (!areaToUpdateId) { flash('Select an Area to update'); }
        else { updateAreaPolygon(areaToUpdateId, coords); }
      } else if (creatingPolygonType === 'zone-update') {
        if (!zoneToUpdateId) { flash('Select a Zone to update'); }
        else { updateZonePolygon(zoneToUpdateId, coords); }
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

  // Programmatic drawing when creatingPolygonType changes
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    if (creatingPolygonType) {
      // disable any existing handler
      if (drawHandlerRef.current?.disable) {
        try { drawHandlerRef.current.disable(); } catch (_) {}
      }
      drawHandlerRef.current = new L.Draw.Polygon(mapRef.current, {
        allowIntersection: false,
        showArea: true
      });
      try { drawHandlerRef.current.enable(); } catch (_) {}
      flash(`Drawing ${creatingPolygonType.replace('-update','')} polygon…`);
    } else {
      if (drawHandlerRef.current?.disable) {
        try { drawHandlerRef.current.disable(); } catch (_) {}
        drawHandlerRef.current = null;
      }
    }
  }, [creatingPolygonType, flash]);

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

  // Update polygon helpers
  const updateAreaPolygon = async (areaId, coords) => {
    try {
      await heatMapApi.updateArea(areaId, { polygon: coords });
      flash('Area polygon updated');
      await loadAreas();
    } catch (e) { flash('Update area failed: ' + e.message); }
  };

  const updateZonePolygon = async (zoneId, coords) => {
    try {
      await heatMapApi.updateZone(zoneId, { polygon: coords });
      flash('Zone polygon updated');
      await loadZones();
    } catch (e) { flash('Update zone failed: ' + e.message); }
  };

  // Delete marker
  const deleteMarker = async (id) => { if (!window.confirm('Delete marker?')) return; try { await heatMapApi.deleteMarker(id); flash('Deleted'); loadMarkers(); } catch (e) { flash('Delete failed: ' + e.message); } };

  // Filtered markers
  const filteredMarkers = markers.filter(m => { if (areaFilterForMarkers && m.area_id !== areaFilterForMarkers) return false; if (zoneFilterForMarkers && m.zone_id !== zoneFilterForMarkers) return false; return true; });

  // Render Areas polygons with click-to-fill marker coords
  useEffect(() => {
    if (!mapRef.current || !window.L || !areaLayerGroupRef.current) return;
    const L = window.L;
    areaLayerGroupRef.current.clearLayers();
    areas.forEach(a => {
      const id = a.id || a._id;
      if (Array.isArray(a.polygon) && a.polygon.length) {
        try {
          const poly = L.polygon(a.polygon, { color: 'blue', weight: 3, dashArray: '10, 10', fillOpacity: 0, opacity: 1 });
          poly.on('click', (e) => {
            if (creatingPolygonType) return;
            setNewMarker(m => ({ ...m, lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6), area_id: id, zone_id: '' }));
            setActiveTab('markers');
            flash(`Coord set from Area: ${a.name}`);
            L.DomEvent.stopPropagation(e);
          });
          poly.addTo(areaLayerGroupRef.current);
        } catch (_) {}
      }
    });
  }, [areas, creatingPolygonType, flash]);

  // Render Zones polygons with click-to-fill marker coords
  useEffect(() => {
    if (!mapRef.current || !window.L || !zoneLayerGroupRef.current) return;
    const L = window.L;
    zoneLayerGroupRef.current.clearLayers();
    zones.forEach(z => {
      const id = z.id || z._id;
      if (Array.isArray(z.polygon) && z.polygon.length) {
        try {
          const poly = L.polygon(z.polygon, { color: 'red', weight: 2, dashArray: '5, 5', fillOpacity: 0, opacity: 1 });
          poly.on('click', (e) => {
            if (creatingPolygonType) return;
            setNewMarker(m => ({ ...m, lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6), area_id: z.area_id || m.area_id, zone_id: id }));
            setActiveTab('markers');
            flash(`Coord set from Zone: ${z.name}`);
            L.DomEvent.stopPropagation(e);
          });
          poly.addTo(zoneLayerGroupRef.current);
        } catch (_) {}
      }
    });
  }, [zones, creatingPolygonType, flash]);

  // Tab content renderers (markup adjusted for styling only)
  const renderMarkersTab = () => (
    <div className="tab-pane space-y-4">
      <h3 className="text-sm font-semibold mk-text-secondary">Create Marker</h3>
      <form onSubmit={handleCreateMarker} className="grid grid-cols-1 gap-3 mk-subtle p-3 rounded">
        <label className="text-xs mk-text-muted">Type
          <select className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={newMarker.type} onChange={e => setNewMarker(m => ({ ...m, type: e.target.value }))}>
            {MARKER_TYPES.map(t => <option className="bg-[#0e2033] theme-light:bg-white" key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs mk-text-muted">Name
          <input className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={newMarker.name} onChange={e => setNewMarker(m => ({ ...m, name: e.target.value }))} placeholder="Marker name" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs mk-text-muted">Lat
            <input className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={newMarker.lat} onChange={e => setNewMarker(m => ({ ...m, lat: e.target.value }))} placeholder="Latitude" />
          </label>
          <label className="text-xs mk-text-muted">Lng
            <input className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={newMarker.lng} onChange={e => setNewMarker(m => ({ ...m, lng: e.target.value }))} placeholder="Longitude" />
          </label>
        </div>
        <button type="button" onClick={() => setIsPlacingMarker(v => !v)} className={`mk-btn-tab ${isPlacingMarker ? 'mk-btn-tab-active' : ''}`}>
          {isPlacingMarker ? 'Click map to set coords (ON)' : 'Enable map click for coords'}
        </button>
        <label className="text-xs mk-text-muted">Description
          <textarea rows={2} className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={newMarker.description} onChange={e => setNewMarker(m => ({ ...m, description: e.target.value }))} />
        </label>
        <label className="text-xs mk-text-muted">Area (optional)
          <select className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={newMarker.area_id} onChange={e => setNewMarker(m => ({ ...m, area_id: e.target.value, zone_id: '' }))}>
            <option className="bg-[#0e2033] theme-light:bg-white" value="">-- none --</option>
            {areas.map(a => <option className="bg-[#0e2033] theme-light:bg-white" key={a.id || a._id} value={a.id || a._id}>{a.name}</option>)}
          </select>
        </label>
        <label className="text-xs mk-text-muted">Zone (optional)
          <select className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border disabled:opacity-50" value={newMarker.zone_id} onChange={e => setNewMarker(m => ({ ...m, zone_id: e.target.value }))} disabled={!newMarker.area_id}>
            <option className="bg-[#0e2033] theme-light:bg-white" value="">-- none --</option>
            {zones.filter(z => z.area_id === newMarker.area_id).map(z => <option className="bg-[#0e2033] theme-light:bg-white" key={z.id || z._id} value={z.id || z._id}>{z.name}</option>)}
          </select>
        </label>
        <button type="submit" className="mk-btn-tab">Create Marker</button>
      </form>

      <h3 className="text-sm font-semibold mk-text-secondary mt-6">Markers</h3>
      <div className="flex items-center gap-2">
        <select className="px-3 py-2 rounded bg-transparent mk-border" value={areaFilterForMarkers} onChange={e => { setAreaFilterForMarkers(e.target.value); setZoneFilterForMarkers(''); }}>
          <option className="bg-[#0e2033] theme-light:bg-white" value="">All Areas</option>
          {areas.map(a => <option className="bg-[#0e2033] theme-light:bg-white" key={a.id || a._id} value={a.id || a._id}>{a.name}</option>)}
        </select>
        <select className="px-3 py-2 rounded bg-transparent mk-border disabled:opacity-50" value={zoneFilterForMarkers} onChange={e => setZoneFilterForMarkers(e.target.value)} disabled={!areaFilterForMarkers}>
          <option className="bg-[#0e2033] theme-light:bg-white" value="">All Zones</option>
          {zones.filter(z => !areaFilterForMarkers || z.area_id === areaFilterForMarkers).map(z => <option className="bg-[#0e2033] theme-light:bg-white" key={z.id || z._id} value={z.id || z._id}>{z.name}</option>)}
        </select>
        <button type="button" className="mk-btn-tab" onClick={() => refreshAll()}>↻</button>
      </div>
      <ul className="mt-2 space-y-2 max-h-64 overflow-auto pr-1">
        {filteredMarkers.map(m => (
          <li key={m.id || m._id} className="mk-card p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="mk-badge" data-type={m.type}>{TYPE_ICONS[m.type] || '📍'}</span>
                <strong className="truncate">{m.name || '(unnamed)'}</strong>
              </div>
              <button className="mk-btn-tab" onClick={() => deleteMarker(m.id || m._id)}>✕</button>
            </div>
            <div className="mt-1 text-xs mk-text-muted">
              {m.type} • {parseFloat(m.lat).toFixed(4)}, {parseFloat(m.lng).toFixed(4)}
            </div>
            {m.description && <p className="mt-1 text-sm">{m.description}</p>}
          </li>
        ))}
        {!filteredMarkers.length && <li className="mk-text-muted text-sm">No markers</li>}
      </ul>
    </div>
  );

  const renderAreasTab = () => (
    <div className="tab-pane space-y-4">
      <h3 className="text-sm font-semibold mk-text-secondary">Create Area</h3>
      <form onSubmit={handleAreaFormSubmit} className="grid grid-cols-1 gap-3 mk-subtle p-3 rounded">
        <label className="text-xs mk-text-muted">Name
          <input className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={pendingAreaData.name} onChange={e => setPendingAreaData(a => ({ ...a, name: e.target.value }))} placeholder="Area name" />
        </label>
        <label className="text-xs mk-text-muted">Description
          <textarea rows={2} className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={pendingAreaData.description} onChange={e => setPendingAreaData(a => ({ ...a, description: e.target.value }))} />
        </label>
        <div className="flex items-center gap-2">
          <button type="button" className={`mk-btn-tab ${creatingPolygonType === 'area' ? 'mk-btn-tab-active' : ''}`} onClick={() => setCreatingPolygonType(p => p === 'area' ? null : 'area')}>{creatingPolygonType === 'area' ? 'Drawing ON - finish on map' : 'Draw Polygon'}</button>
          <button type="submit" className="mk-btn-tab">Create (no polygon)</button>
        </div>
      </form>

      <h4 className="text-xs mk-text-muted">Add Polygon to Existing Area</h4>
      <div className="mk-subtle p-3 rounded grid grid-cols-1 gap-3">
        <label className="text-xs mk-text-muted">Select Area
          <select className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={areaToUpdateId} onChange={(e) => setAreaToUpdateId(e.target.value)}>
            <option className="bg-[#0e2033] theme-light:bg-white" value="">-- select area --</option>
            {areas.map(a => <option className="bg-[#0e2033] theme-light:bg-white" key={a.id || a._id} value={a.id || a._id}>{a.name} {a.polygon ? '' : '(No polygon)'}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" disabled={!areaToUpdateId} className={`mk-btn-tab ${creatingPolygonType === 'area-update' ? 'mk-btn-tab-active' : ''} disabled:opacity-50`} onClick={() => setCreatingPolygonType(p => p === 'area-update' ? null : 'area-update')}>
            {creatingPolygonType === 'area-update' ? 'Drawing ON - finish on map' : 'Draw Polygon for Selected Area'}
          </button>
        </div>
      </div>

      <h3 className="text-sm font-semibold mk-text-secondary mt-4">Areas</h3>
      <ul className="mt-2 space-y-2 max-h-64 overflow-auto pr-1">
        {areas.map(a => (
          <li key={a.id || a._id} className="mk-card p-3">
            <div className="flex items-center justify-between">
              <strong>{a.name}</strong>
              <span className={`mk-badge ${a.polygon ? 'mk-badge-accent' : ''}`}>{a.polygon ? 'Polygon' : 'No polygon'}</span>
            </div>
            {a.description && <p className="mt-1 text-sm">{a.description}</p>}
          </li>
        ))}
        {!areas.length && <li className="mk-text-muted text-sm">No areas</li>}
      </ul>
    </div>
  );

  const renderZonesTab = () => (
    <div className="tab-pane space-y-4">
      <h3 className="text-sm font-semibold mk-text-secondary">Create Zone</h3>
      <form onSubmit={handleZoneFormSubmit} className="grid grid-cols-1 gap-3 mk-subtle p-3 rounded">
        <label className="text-xs mk-text-muted">Area
          <select className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={pendingZoneData.area_id} onChange={e => setPendingZoneData(z => ({ ...z, area_id: e.target.value }))}>
            <option className="bg-[#0e2033] theme-light:bg-white" value="">-- select area --</option>
            {areas.map(a => <option className="bg-[#0e2033] theme-light:bg-white" key={a.id || a._id} value={a.id || a._id}>{a.name}</option>)}
          </select>
        </label>
        <label className="text-xs mk-text-muted">Name
          <input className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={pendingZoneData.name} onChange={e => setPendingZoneData(z => ({ ...z, name: e.target.value }))} placeholder="Zone name" />
        </label>
        <label className="text-xs mk-text-muted">Description
          <textarea rows={2} className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={pendingZoneData.description} onChange={e => setPendingZoneData(z => ({ ...z, description: e.target.value }))} />
        </label>
        <div className="flex items-center gap-2">
          <button type="button" disabled={!pendingZoneData.area_id} className={`mk-btn-tab ${creatingPolygonType === 'zone' ? 'mk-btn-tab-active' : ''} disabled:opacity-50`} onClick={() => setCreatingPolygonType(p => p === 'zone' ? null : 'zone')}>{creatingPolygonType === 'zone' ? 'Drawing ON - finish on map' : 'Draw Polygon'}</button>
          <button type="submit" className="mk-btn-tab">Create (no polygon)</button>
        </div>
      </form>

      <h4 className="text-xs mk-text-muted">Add Polygon to Existing Zone</h4>
      <div className="mk-subtle p-3 rounded grid grid-cols-1 gap-3">
        <label className="text-xs mk-text-muted">Select Zone
          <select className="mt-1 w-full px-3 py-2 rounded bg-transparent mk-border" value={zoneToUpdateId} onChange={(e) => setZoneToUpdateId(e.target.value)}>
            <option className="bg-[#0e2033] theme-light:bg-white" value="">-- select zone --</option>
            {zones.map(z => <option className="bg-[#0e2033] theme-light:bg-white" key={z.id || z._id} value={z.id || z._id}>{z.name}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" disabled={!zoneToUpdateId} className={`mk-btn-tab ${creatingPolygonType === 'zone-update' ? 'mk-btn-tab-active' : ''} disabled:opacity-50`} onClick={() => setCreatingPolygonType(p => p === 'zone-update' ? null : 'zone-update')}>
            {creatingPolygonType === 'zone-update' ? 'Drawing ON - finish on map' : 'Draw Polygon for Selected Zone'}
          </button>
        </div>
      </div>

      <h3 className="text-sm font-semibold mk-text-secondary mt-4">Zones</h3>
      <ul className="mt-2 space-y-2 max-h-64 overflow-auto pr-1">
        {zones.map(z => (
          <li key={z.id || z._id} className="mk-card p-3">
            <div className="flex items-center justify-between">
              <strong>{z.name}</strong>
              <span className={`mk-badge ${z.polygon ? 'mk-badge-accent' : ''}`}>{z.polygon ? 'Polygon' : 'No polygon'}</span>
            </div>
            <small className="block mt-1 text-xs mk-text-muted">Area: {areas.find(a => (a.id||a._id) === z.area_id)?.name || '—'}</small>
            {z.description && <p className="mt-1 text-sm">{z.description}</p>}
          </li>
        ))}
        {!zones.length && <li className="mk-text-muted text-sm">No zones</li>}
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
    <div className="mk-gradient-bg p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold mk-text-primary">🗺️ Map Editor</div>
        <div className="flex items-center gap-2">
          <button onClick={() => refreshAll()} className="mk-btn-tab">Refresh All</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 items-start">
        <div className="relative min-h-[520px] mk-card overflow-hidden">
          {loading && <div className="absolute inset-0 flex items-center justify-center text-sm mk-text-muted">Initializing map…</div>}
          {scriptError && <div className="absolute inset-0 flex items-center justify-center text-sm mk-status-danger">{scriptError}</div>}
          <div ref={mapNodeRef} id="map" className="w-full h-full min-h-[520px] rounded" />
          {creatingPolygonType && (
            <div className="absolute left-3 bottom-3 mk-badge mk-badge-accent">Drawing {creatingPolygonType} – click first point to finish</div>
          )}
        </div>
        <aside className="mk-panel p-3 rounded space-y-3">
          <div className="flex gap-2 flex-wrap">
            {TABS.map(t => (
              <button key={t.id} className={`mk-btn-tab ${t.id === activeTab ? 'mk-btn-tab-active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
            ))}
          </div>
          <div>
            {activeTab === 'markers' && renderMarkersTab()}
            {activeTab === 'areas' && renderAreasTab()}
            {activeTab === 'zones' && renderZonesTab()}
          </div>
          {message && <div className="mk-status-success p-2 rounded text-sm">{message}</div>}
          <div className="mt-2">
            <h4 className="text-xs mk-text-muted mb-1">Legend</h4>
            <ul className="flex flex-wrap gap-2">
              {MARKER_TYPES.map(t => (
                <li key={t} className="mk-badge"><span className="mr-1">{TYPE_ICONS[t] || '📍'}</span> {t}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MapEditor;