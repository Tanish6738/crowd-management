import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Contracts (reference)
// type Zone = { id:string; name:string; polygon:GeoJSON.Polygon; capacity:number };
// type Gate = { id:string; name:string; zoneId:string; location:GeoJSON.Point; directionLine:[number,number][] };
// type Service = { id:string; name:string; type:'washroom'|'camp'|'waiting_room'|'health_camp'|'restricted'|'helpdesk'; zoneId:string; location:GeoJSON.Point };
// type Camera = { id:string; name:string; zoneId:string; location:GeoJSON.Point; rtspUrl:string; status:'online'|'offline'|'unknown' };

// Helper to inject maplibre css once
const ensureMapLibreCSS = () => {
	if (document.getElementById('maplibre-gl-css')) return;
	const link = document.createElement('link');
	link.id = 'maplibre-gl-css';
	link.rel = 'stylesheet';
	link.href = 'https://unpkg.com/maplibre-gl@3.6.1/dist/maplibre-gl.css';
	document.head.appendChild(link);
};

const TOOL_MODES = {
	SELECT: 'select',
	DRAW_ZONE: 'drawZone',
	ADD_GATE: 'addGate',
	ADD_SERVICE: 'addService',
	ADD_CAMERA: 'addCamera'
};

const SERVICE_TYPES = ['washroom','camp','waiting_room','health_camp','restricted','helpdesk'];

const defaultCenter = [77.5946, 12.9716]; // Bangalore placeholder

const MapEditor = () => {
	// Published (source of truth) -------------------------------------------
	const [zonesPub, setZonesPub] = useState([]);
	const [gatesPub, setGatesPub] = useState([]);
	const [servicesPub, setServicesPub] = useState([]);
	const [camerasPub, setCamerasPub] = useState([]);

	// Draft (mutable) -------------------------------------------------------
	const [zones, setZones] = useState([]);
	const [gates, setGates] = useState([]);
	const [services, setServices] = useState([]);
	const [cameras, setCameras] = useState([]);
	const [dirty, setDirty] = useState(false);

	// Map & drawing state ---------------------------------------------------
	const mapRef = useRef(null); // maplibre instance
	const containerRef = useRef(null);
	const [mapReady, setMapReady] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [mode, setMode] = useState(TOOL_MODES.SELECT);
	const [layerVisibility, setLayerVisibility] = useState({ zones:true, gates:true, services:true, cameras:true });
	const [draftZonePoints, setDraftZonePoints] = useState([]); // array of [lng,lat]
	const [hoverCoord, setHoverCoord] = useState(null);
	const [selectedEntity, setSelectedEntity] = useState(null); // {type, data}
	const [serviceType, setServiceType] = useState('washroom');

	// Undo / Redo -----------------------------------------------------------
	const [history, setHistory] = useState([]); // stack of serialized state
	const [historyIndex, setHistoryIndex] = useState(-1);
	const pushHistory = useCallback((nextState) => {
		setHistory(h => [...h.slice(0, historyIndex+1), JSON.stringify(nextState)].slice(-50));
		setHistoryIndex(i => Math.min(49, i+1));
	}, [historyIndex]);
	const snapshot = useCallback(() => ({ zones, gates, services, cameras }), [zones, gates, services, cameras]);
	const undo = () => {
		if (historyIndex <= 0) return;
		const idx = historyIndex - 1;
		const parsed = JSON.parse(history[idx]);
		setZones(parsed.zones); setGates(parsed.gates); setServices(parsed.services); setCameras(parsed.cameras);
		setHistoryIndex(idx);
		setDirty(true);
	};
	const redo = () => {
		if (historyIndex >= history.length-1) return;
		const idx = historyIndex + 1;
		const parsed = JSON.parse(history[idx]);
		setZones(parsed.zones); setGates(parsed.gates); setServices(parsed.services); setCameras(parsed.cameras);
		setHistoryIndex(idx);
		setDirty(true);
	};

	// Initial load (simulate API) ------------------------------------------
	useEffect(() => {
		setLoading(true); setError(null);
		const t = setTimeout(() => {
			// Start with empty published map (could fetch real)
			setZonesPub([]); setGatesPub([]); setServicesPub([]); setCamerasPub([]);
			setZones([]); setGates([]); setServices([]); setCameras([]);
			setLoading(false);
			pushHistory({ zones:[], gates:[], services:[], cameras:[] });
		}, 700);
		return () => clearTimeout(t);
	}, [pushHistory]);

	// Load maplibre lazily --------------------------------------------------
	useEffect(() => {
		if (!containerRef.current || mapRef.current) return;
		let cancelled = false;
		ensureMapLibreCSS();
		import('maplibre-gl').then(lib => {
			if (cancelled) return;
			const maplibregl = lib.default || lib;
			const map = new maplibregl.Map({
				container: containerRef.current,
				style: 'https://demotiles.maplibre.org/style.json',
				center: defaultCenter,
				zoom: 14,
				attributionControl: false
			});
			mapRef.current = map;
			map.on('load', () => setMapReady(true));
			map.on('mousemove', (e) => {
				if (mode === TOOL_MODES.DRAW_ZONE && draftZonePoints.length > 0) setHoverCoord([e.lngLat.lng, e.lngLat.lat]);
			});
			map.on('click', (e) => {
				if (mode === TOOL_MODES.DRAW_ZONE) {
					const pt = [e.lngLat.lng, e.lngLat.lat];
					setDraftZonePoints(prev => [...prev, pt]);
				} else if (mode === TOOL_MODES.ADD_GATE) {
					addGateAt([e.lngLat.lng, e.lngLat.lat]);
				} else if (mode === TOOL_MODES.ADD_SERVICE) {
					addServiceAt([e.lngLat.lng, e.lngLat.lat]);
				} else if (mode === TOOL_MODES.ADD_CAMERA) {
					addCameraAt([e.lngLat.lng, e.lngLat.lat]);
				} else if (mode === TOOL_MODES.SELECT) {
					// Basic hit detection via distance to entity points / zone centroids
					const features = hitTest([e.lngLat.lng, e.lngLat.lat]);
					if (features) setSelectedEntity(features);
				}
			});
		}).catch(err => { if (!cancelled) { setError('Failed to load map library'); console.error(err); } });
		return () => { cancelled = true; };
	}, [mode, draftZonePoints.length]);

	// Basic hit test --------------------------------------------------------
	const hitTest = (lnglat) => {
		const [lng, lat] = lnglat;
		// Test cameras & services & gates by distance threshold
		const dist = (a,b) => Math.sqrt(Math.pow(a[0]-b[0],2) + Math.pow(a[1]-b[1],2));
		const gate = gates.find(g => dist(g.location.coordinates, lnglat) < 0.0015);
		if (gate) return { type:'gate', data:gate };
		const service = services.find(s => dist(s.location.coordinates, lnglat) < 0.0015);
		if (service) return { type:'service', data:service };
		const camera = cameras.find(c => dist(c.location.coordinates, lnglat) < 0.0015);
		if (camera) return { type:'camera', data:camera };
		// Zones: simple centroid distance
		const centroid = (poly) => {
			const coords = poly.coordinates[0];
			let sx=0, sy=0; coords.forEach(c => { sx+=c[0]; sy+=c[1]; });
			return [sx/coords.length, sy/coords.length];
		};
		const zone = zones.find(z => dist(centroid(z.polygon), lnglat) < 0.0025);
		if (zone) return { type:'zone', data:zone };
		return null;
	};

	// Add entity helpers ----------------------------------------------------
	const addGateAt = (pt) => {
		const id = 'g'+Date.now();
		const dir = [pt, [pt[0]+0.001, pt[1]]];
		const gate = { id, name:'Gate '+(gates.length+1), zoneId: zones[0]?.id||'', location:{ type:'Point', coordinates:pt }, directionLine:dir };
		setGates(g => [...g, gate]); markDirty();
	};
	const addServiceAt = (pt) => {
		const id = 's'+Date.now();
		const service = { id, name: serviceType.charAt(0).toUpperCase()+serviceType.slice(1)+' '+(services.length+1), type: serviceType, zoneId: zones[0]?.id||'', location:{ type:'Point', coordinates:pt } };
		setServices(s => [...s, service]); markDirty();
	};
	const addCameraAt = (pt) => {
		const id = 'c'+Date.now();
		const camera = { id, name:'Camera '+(cameras.length+1), zoneId: zones[0]?.id||'', location:{ type:'Point', coordinates:pt }, rtspUrl:'rtsp://example/'+id, status:'online' };
		setCameras(c => [...c, camera]); markDirty();
	};

	// Mark dirty & push history --------------------------------------------
	const markDirty = () => { setDirty(true); pushHistory(snapshot()); };

	// Finalize zone polygon (on Enter / double click) -----------------------
	const finalizeZone = () => {
		if (draftZonePoints.length < 3) { setDraftZonePoints([]); return; }
		const polygon = [...draftZonePoints, draftZonePoints[0]]; // close ring
		const zone = { id:'z'+Date.now(), name:'Zone '+(zones.length+1), capacity: 100, polygon:{ type:'Polygon', coordinates:[polygon] } };
		setZones(z => [...z, zone]);
		setDraftZonePoints([]); setHoverCoord(null); markDirty();
	};

	// Keyboard shortcuts ----------------------------------------------------
	useEffect(() => {
		const onKey = (e) => {
			if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
			if (e.key === 'z' || e.key === 'Z') { setMode(TOOL_MODES.DRAW_ZONE); }
			else if (e.key === 'g' || e.key === 'G') { setMode(TOOL_MODES.ADD_GATE); }
			else if (e.key === 's' || e.key === 'S') { setMode(TOOL_MODES.ADD_SERVICE); }
			else if (e.key === 'c' || e.key === 'C') { setMode(TOOL_MODES.ADD_CAMERA); }
			else if (e.key === 'Escape') {
				if (draftZonePoints.length) setDraftZonePoints([]); else setMode(TOOL_MODES.SELECT);
			} else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
			else if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.shiftKey && e.key==='z'))) { e.preventDefault(); redo(); }
			else if (e.key === 'Enter' && mode===TOOL_MODES.DRAW_ZONE) { finalizeZone(); }
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [mode, draftZonePoints.length, undo, redo]);

	// Publish / discard -----------------------------------------------------
	const publish = async () => {
		setPublishing(true);
		// Simulate API POSTs
		await new Promise(r => setTimeout(r, 800));
		setZonesPub(zones); setGatesPub(gates); setServicesPub(services); setCamerasPub(cameras);
		setDirty(false); setPublishing(false);
	};
	const discard = () => {
		setZones(zonesPub); setGates(gatesPub); setServices(servicesPub); setCameras(camerasPub);
		setDirty(false); setDraftZonePoints([]); setHoverCoord(null); setMode(TOOL_MODES.SELECT);
		pushHistory({ zones:zonesPub, gates:gatesPub, services:servicesPub, cameras:camerasPub });
	};
	const [publishing, setPublishing] = useState(false);

	// Edit entity -----------------------------------------------------------
	const updateEntity = (type, partial) => {
		if (!selectedEntity) return;
		if (type==='zone') setZones(z => z.map(item => item.id===selectedEntity.data.id ? { ...item, ...partial } : item));
		if (type==='gate') setGates(g => g.map(item => item.id===selectedEntity.data.id ? { ...item, ...partial } : item));
		if (type==='service') setServices(s => s.map(item => item.id===selectedEntity.data.id ? { ...item, ...partial } : item));
		if (type==='camera') setCameras(c => c.map(item => item.id===selectedEntity.data.id ? { ...item, ...partial } : item));
		markDirty();
	};
	const deleteEntity = () => {
		if (!selectedEntity) return;
		if (!window.confirm('Delete this '+selectedEntity.type+'?')) return;
		if (selectedEntity.type==='zone') setZones(z => z.filter(i=>i.id!==selectedEntity.data.id));
		if (selectedEntity.type==='gate') setGates(g => g.filter(i=>i.id!==selectedEntity.data.id));
		if (selectedEntity.type==='service') setServices(s => s.filter(i=>i.id!==selectedEntity.data.id));
		if (selectedEntity.type==='camera') setCameras(c => c.filter(i=>i.id!==selectedEntity.data.id));
		setSelectedEntity(null); markDirty();
	};

	// Derived overlay collections (virtualize if large) ---------------------
	const camDisplay = useMemo(() => cameras.slice(0, 500), [cameras]);
	const serviceDisplay = useMemo(() => services.slice(0, 500), [services]);

	// Overlay rendering (simple absolutely positioned markers via map.project)
	const [projectVersion, setProjectVersion] = useState(0);
	useEffect(() => {
		if (!mapRef.current) return;
		const map = mapRef.current;
		const onRender = () => setProjectVersion(v => v+1);
		map.on('move', onRender); map.on('zoom', onRender); map.on('resize', onRender);
		return () => { map.off('move', onRender); map.off('zoom', onRender); map.off('resize', onRender); };
	}, [mapReady]);

	const project = (lnglat) => {
		if (!mapRef.current) return { x:-9999,y:-9999 };
		const p = mapRef.current.project({ lng:lnglat[0], lat:lnglat[1] });
		return { x:p.x, y:p.y };
	};

	const zoneFillColor = (z) => '#f9731622';
	const zoneStrokeColor = (z) => '#f97316';

	// UI helpers ------------------------------------------------------------
	const toolActive = (t) => mode===t ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 hover:bg-orange-50';

	const loadingState = loading && (
		<div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-30">
			<div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
		</div>
	);
	const errorBanner = error && (
		<div className="absolute top-2 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2 rounded shadow z-30 flex items-center gap-3">{error}<button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 text-white">Retry</button></div>
	);
	const emptyState = (!loading && zones.length===0 && gates.length===0 && services.length===0 && cameras.length===0) && (
		<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 border border-dashed border-gray-300 rounded-lg p-6 text-xs text-gray-600 text-center z-30 w-60">No map data configured yet.<br/>Start by drawing a zone (shortcut Z).</div>
	);

	// Side drawer content ---------------------------------------------------
	const drawerOpen = !!selectedEntity;
	const se = selectedEntity;
	const updateSelectedField = (field, value) => {
		if (!se) return;
		updateEntity(se.type, { [field]: value });
		setSelectedEntity(prev => prev ? { ...prev, data: { ...prev.data, [field]: value } } : prev);
	};

	return (
		<div className="relative h-[calc(100vh-120px)] -mx-px" aria-label="Map Editor">
			{/* Map container */}
			<div ref={containerRef} className="w-full h-full relative bg-gray-200 rounded-lg overflow-hidden" />

			{/* Overlays (manual) */}
			{mapReady && (
				<div className="pointer-events-none absolute inset-0" key={projectVersion}>
					{/* Zones polygons via svg */}
					{layerVisibility.zones && zones.map(z => {
						const path = z.polygon.coordinates[0].map(c => {
							const p = project(c); return `${p.x},${p.y}`; }).join(' ');
						return <svg key={z.id} className="absolute inset-0 overflow-visible" aria-label={z.name}>
							<polygon points={path} fill={zoneFillColor(z)} stroke={zoneStrokeColor(z)} strokeWidth={2} className="pointer-events-auto" onClick={(e)=>{e.stopPropagation(); setSelectedEntity({ type:'zone', data:z });}} />
						</svg>;
					})}
					{/* Draft zone polyline */}
					{mode===TOOL_MODES.DRAW_ZONE && draftZonePoints.length>0 && (
						<svg className="absolute inset-0 overflow-visible">
							<polyline points={[...draftZonePoints, hoverCoord].filter(Boolean).map(c => { const p=project(c); return `${p.x},${p.y}`; }).join(' ')} fill="none" stroke="#f97316" strokeDasharray="4 3" strokeWidth={2} />
							{draftZonePoints.map((c,i)=> { const p=project(c); return <circle key={i} cx={p.x} cy={p.y} r={4} fill="#f97316" />; })}
						</svg>
					)}
					{/* Gates */}
					{layerVisibility.gates && gates.map(g => {
						const p = project(g.location.coordinates);
						const d2 = project(g.directionLine[1]);
						return <div key={g.id} className="absolute" style={{ left:p.x-6, top:p.y-6 }}>
							<div onClick={(e)=>{e.stopPropagation(); setSelectedEntity({ type:'gate', data:g });}} className="pointer-events-auto w-3 h-3 rounded-full bg-white border-2 border-orange-500 shadow" title={g.name} />
							<svg className="absolute inset-0 overflow-visible"><line x1={6} y1={6} x2={d2.x-p.x+6} y2={d2.y-p.y+6} stroke="#f97316" strokeWidth={2} markerEnd="url(#arrowhead)" /></svg>
							<svg width="0" height="0"><defs><marker id="arrowhead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><polygon points="0 0, 6 3, 0 6" fill="#f97316" /></marker></defs></svg>
						</div>;
					})}
					{/* Services */}
					{layerVisibility.services && serviceDisplay.map(s => { const p=project(s.location.coordinates); return <button key={s.id} onClick={(e)=>{e.stopPropagation(); setSelectedEntity({ type:'service', data:s });}} className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] shadow" style={{ left:p.x, top:p.y }}>{s.type[0].toUpperCase()}</button>; })}
					{/* Cameras */}
					{layerVisibility.cameras && camDisplay.map(c => { const p=project(c.location.coordinates); return <button key={c.id} onClick={(e)=>{e.stopPropagation(); setSelectedEntity({ type:'camera', data:c });}} className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto w-4 h-4 rounded bg-green-600 ring-1 ring-white shadow" style={{ left:p.x, top:p.y }} title={c.name} />; })}
				</div>
			)}

			{/* Toolbar */}
			<div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
				<div className="flex flex-col bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm overflow-hidden">
					<button onClick={()=>setMode(TOOL_MODES.SELECT)} className={`px-3 py-2 text-[11px] border-b ${toolActive(TOOL_MODES.SELECT)}`}>Select</button>
					<button onClick={()=>{setMode(TOOL_MODES.DRAW_ZONE);}} className={`px-3 py-2 text-[11px] border-b ${toolActive(TOOL_MODES.DRAW_ZONE)}`}>Draw Zone (Z)</button>
					<button onClick={()=>setMode(TOOL_MODES.ADD_GATE)} className={`px-3 py-2 text-[11px] border-b ${toolActive(TOOL_MODES.ADD_GATE)}`}>Add Gate (G)</button>
					<button onClick={()=>setMode(TOOL_MODES.ADD_SERVICE)} className={`px-3 py-2 text-[11px] border-b ${toolActive(TOOL_MODES.ADD_SERVICE)}`}>Add Service (S)</button>
					<button onClick={()=>setMode(TOOL_MODES.ADD_CAMERA)} className={`px-3 py-2 text-[11px] ${toolActive(TOOL_MODES.ADD_CAMERA)}`}>Link Camera (C)</button>
				</div>
				<div className="bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm p-2 flex flex-col gap-2 text-[10px]">
					<div className="font-semibold text-gray-700">Layers</div>
					{Object.entries(layerVisibility).map(([k,v]) => (
						<label key={k} className="flex items-center gap-1">
							<input type="checkbox" checked={v} onChange={()=>setLayerVisibility(o=>({...o,[k]:!o[k]}))} /> <span className="capitalize">{k}</span>
						</label>
					))}
					{mode===TOOL_MODES.ADD_SERVICE && (
						<select value={serviceType} onChange={e=>setServiceType(e.target.value)} className="mt-1 rounded border border-gray-300 bg-white px-1 py-0.5 text-[10px]">{SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}</select>
					)}
					{mode===TOOL_MODES.DRAW_ZONE && draftZonePoints.length>0 && (
						<button onClick={finalizeZone} className="mt-1 px-2 py-1 rounded bg-orange-500 text-white">Finish Zone (Enter)</button>
					)}
					<div className="h-px bg-gray-200" />
					<div className="flex gap-2">
						<button disabled={!dirty} onClick={publish} className={`flex-1 px-2 py-1 rounded text-[10px] font-medium ${dirty ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>{publishing ? 'Publishing...' : 'Publish'}</button>
						<button disabled={!dirty} onClick={discard} className={`flex-1 px-2 py-1 rounded text-[10px] font-medium ${dirty ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Discard</button>
					</div>
					<div className="flex gap-2">
						<button onClick={undo} disabled={historyIndex<=0} className="flex-1 px-2 py-1 rounded bg-white border border-gray-300 disabled:opacity-40">Undo</button>
						<button onClick={redo} disabled={historyIndex>=history.length-1} className="flex-1 px-2 py-1 rounded bg-white border border-gray-300 disabled:opacity-40">Redo</button>
					</div>
				</div>
				<div className="bg-white/90 backdrop-blur rounded-lg border border-gray-200 shadow-sm p-2 text-[10px] space-y-1 w-40">
					<div className="font-semibold text-gray-700 mb-1">Legend</div>
					<div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-orange-500" /> Zone</div>
					<div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-white border border-orange-500" /> Gate</div>
					<div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-600" /> Service</div>
					<div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-600" /> Camera</div>
				</div>
			</div>

			{/* Side Drawer */}
			<div className={`fixed inset-0 z-40 ${drawerOpen ? '' : 'pointer-events-none'}`}> 
				<div className={`absolute inset-0 bg-black/30 transition-opacity ${drawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={()=>setSelectedEntity(null)} />
				<div className={`absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-300 flex flex-col ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
					<div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
						<h2 className="text-sm font-semibold text-gray-800 capitalize">{se?.type} Detail</h2>
						<button onClick={()=>setSelectedEntity(null)} className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded">✕</button>
					</div>
					<div className="flex-1 overflow-y-auto p-4 space-y-5 text-[11px]">
						{!se && <div className="text-gray-500">No selection.</div>}
						{se?.type==='zone' && (
							<div className="space-y-3">
								<div>
									<label className="block font-medium mb-1">Name</label>
									<input value={se.data.name} onChange={e=>updateSelectedField('name', e.target.value)} className="w-full h-8 rounded border border-gray-300 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500" />
								</div>
								<div>
									<label className="block font-medium mb-1">Capacity</label>
									<input type="number" value={se.data.capacity} onChange={e=>updateSelectedField('capacity', Number(e.target.value))} className="w-full h-8 rounded border border-gray-300 px-2" />
								</div>
								<div>
									<h4 className="font-medium mb-1">Coordinates</h4>
									<pre className="bg-gray-900 text-gray-100 p-2 rounded max-h-40 overflow-auto text-[10px]">{JSON.stringify(se.data.polygon.coordinates[0], null, 2)}</pre>
								</div>
							</div>
						)}
						{se?.type==='gate' && (
							<div className="space-y-3">
								<div>
									<label className="block font-medium mb-1">Name</label>
									<input value={se.data.name} onChange={e=>updateSelectedField('name', e.target.value)} className="w-full h-8 rounded border border-gray-300 px-2" />
								</div>
								<div className="text-gray-600">Zone: {zones.find(z=>z.id===se.data.zoneId)?.name || '—'}</div>
							</div>
						)}
						{se?.type==='service' && (
							<div className="space-y-3">
								<div>
									<label className="block font-medium mb-1">Name</label>
									<input value={se.data.name} onChange={e=>updateSelectedField('name', e.target.value)} className="w-full h-8 rounded border border-gray-300 px-2" />
								</div>
								<div>
									<label className="block font-medium mb-1">Type</label>
									<select value={se.data.type} onChange={e=>updateSelectedField('type', e.target.value)} className="w-full h-8 rounded border border-gray-300 px-2">{SERVICE_TYPES.map(t => <option key={t}>{t}</option>)}</select>
								</div>
								<div className="text-gray-600">Zone: {zones.find(z=>z.id===se.data.zoneId)?.name || '—'}</div>
							</div>
						)}
						{se?.type==='camera' && (
							<div className="space-y-3">
								<div>
									<label className="block font-medium mb-1">Name</label>
									<input value={se.data.name} onChange={e=>updateSelectedField('name', e.target.value)} className="w-full h-8 rounded border border-gray-300 px-2" />
								</div>
								<div>
									<label className="block font-medium mb-1">RTSP URL</label>
									<input value={se.data.rtspUrl} onChange={e=>updateSelectedField('rtspUrl', e.target.value)} className="w-full h-8 rounded border border-gray-300 px-2" />
								</div>
								<div className="text-gray-600">Zone: {zones.find(z=>z.id===se.data.zoneId)?.name || '—'}</div>
								<div className="text-gray-600">Status: {se.data.status}</div>
							</div>
						)}
					</div>
					{se && (
						<div className="border-t border-gray-200 p-3 flex items-center gap-2">
							<button onClick={deleteEntity} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs">Delete</button>
							<button onClick={()=>setSelectedEntity(null)} className="ml-auto px-3 py-1.5 rounded border border-gray-300 bg-white text-xs">Close</button>
						</div>
					)}
				</div>
			</div>

			{loadingState}
			{errorBanner}
			{emptyState}
		</div>
	);
};

export default MapEditor;

