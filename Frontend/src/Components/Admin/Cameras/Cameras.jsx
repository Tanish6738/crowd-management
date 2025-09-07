import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff as CamOffIcon, Search as SearchIcon, Grid as GridIcon, List as ListIcon, AlertTriangle, RefreshCcw, BarChart3, Layers, FolderPlus, Trash2, Edit2, Check, X, Box, Filter, Database, Activity, Download, Upload } from 'lucide-react';
import cameraApi, { normalizeCCTV } from '@/Services/Camera';
import heatMapApi from '@/Services/heatMapApi';

// Status styling helpers (app-level canonical set)
const STATUS_COLORS = {
  active: 'bg-emerald-500/15 text-emerald-500 border-emerald-400/30',
  inactive: 'bg-red-600/15 text-red-500 border-red-400/30',
  maintenance: 'bg-amber-500/15 text-amber-500 border-amber-400/30',
  unknown: 'bg-gray-500/15 text-gray-400 border-gray-400/30'
};
const badge = (s) => STATUS_COLORS[s] || STATUS_COLORS.unknown;

// Small utilities
const cx = (...c) => c.filter(Boolean).join(' ');
const nowISO = () => new Date().toISOString();

// Lightweight in-component toast system
const useToasts = () => {
  const [toasts, setToasts] = useState([]);
  const push = React.useCallback((msg, type='info', ttl=4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, type }]);
    if (ttl > 0) setTimeout(()=> setToasts(t => t.filter(x=>x.id!==id)), ttl);
  }, []);
  const api = React.useMemo(()=>({ push }), [push]);
  return { toasts, api };
};

const INITIAL_FORM = {
  name: '',
  area: '',
  zone: '',
  location_type: 'gate',
  location_name: '',
  video_source: '',
  source_type: 'http',
  status: 'active'
};

// Reusable small presentational components (memoized) ---------------------
const StatCard = React.memo(({ label, value }) => (
  <div className="p-4 rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] flex flex-col gap-1">
    <span className="text-[11px] uppercase tracking-wide text-white/45">{label}</span>
    <span className="text-xl font-semibold text-white/90">{value}</span>
  </div>
));

const SkeletonGrid = React.memo(({ small }) => (
  <div className={cx('grid gap-4', small? 'grid-cols-2 md:grid-cols-3':'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4')}>
    {Array.from({length: small?6:8}).map((_,i)=> <div key={i} className="aspect-video rounded-lg overflow-hidden relative bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />)}
  </div>
));

const EmptyState = React.memo(() => (
  <div className="p-10 text-sm text-center border border-dashed border-white/10 rounded-lg bg-white/5 flex flex-col items-center gap-3 text-white/50">
    <AlertTriangle className="text-orange-400" size={42} />
    No cameras found.
  </div>
));

const CameraGrid = React.memo(({ data, onEdit, onDelete }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
    <AnimatePresence initial={false}>
      {data.map(cam => (<motion.div key={cam.id} layout initial={{opacity:0, y:12}} animate={{opacity:1, y:0}} exit={{opacity:0,y:-12}} className="group relative rounded-lg border border-white/10 bg-white/5 overflow-hidden flex flex-col">
        <div className="aspect-video w-full bg-black/40 flex items-center justify-center text-white/30 text-[10px]">Stream</div>
        <div className="p-2 flex flex-col gap-1 flex-1">
          <div className="text-xs font-medium text-white/90 truncate flex items-center gap-1">{cam.status==='inactive'? <CamOffIcon size={12} className="text-red-400"/> : <Camera size={12} className="text-orange-400"/>}{cam.name}</div>
          <div className="text-[10px] text-white/50 flex items-center gap-1 flex-wrap"><span className="px-1 py-0.5 rounded bg-white/5 border border-white/10">{cam.zone||'—'}</span><span className="px-1 py-0.5 rounded bg-white/5 border border-white/10">{cam.location_type}</span><span className={cx('ml-auto px-1.5 py-0.5 rounded border text-[10px] capitalize', badge(cam.status))}>{cam.status}</span></div>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center gap-2">
          <button onClick={()=>onEdit(cam)} className="h-7 px-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-[10px] flex items-center gap-1"><Edit2 size={12}/>Edit</button>
          <button onClick={()=>onDelete(cam.id)} className="h-7 px-2 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] flex items-center gap-1"><Trash2 size={12}/>Del</button>
        </div>
      </motion.div>))}
    </AnimatePresence>
  </div>
));

const CameraList = React.memo(({ data, onEdit, onDelete }) => (
  <div className="overflow-x-auto border border-white/10 rounded-lg bg-white/5">
    <table className="min-w-full text-[11px] text-white/70">
      <thead className="bg-white/5 text-white/50"><tr>{['Name','Area','Zone','Type','Status','Source','Actions'].map(h=> <th key={h} className="px-3 py-2 font-medium text-left">{h}</th>)}</tr></thead>
      <tbody>
        {data.map(cam => <tr key={cam.id} className="border-t border-white/10 hover:bg-white/5">
          <td className="px-3 py-2 whitespace-nowrap font-medium text-white/80 flex items-center gap-1">{cam.status==='inactive'? <CamOffIcon size={12} className="text-red-400"/> : <Camera size={12} className="text-orange-400"/>}{cam.name}</td>
          <td className="px-3 py-2 whitespace-nowrap">{cam.area}</td>
          <td className="px-3 py-2 whitespace-nowrap">{cam.zone}</td>
          <td className="px-3 py-2 whitespace-nowrap">{cam.location_type}</td>
          <td className="px-3 py-2 whitespace-nowrap"><span className={cx('px-1.5 py-0.5 rounded border text-[10px] capitalize', badge(cam.status))}>{cam.status}</span></td>
          <td className="px-3 py-2 whitespace-nowrap max-w-[180px] truncate" title={cam.video_source}>{cam.video_source}</td>
          <td className="px-3 py-2 whitespace-nowrap space-x-2">
            <button onClick={()=>onEdit(cam)} className="text-orange-400 hover:underline">Edit</button>
            <button onClick={()=>onDelete(cam.id)} className="text-red-400 hover:underline">Remove</button>
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>
));

const ToastRegion = React.memo(({ toasts }) => (
  <div className="fixed top-4 right-4 space-y-2 z-50 w-64">
    <AnimatePresence initial={false}>
      {toasts.map(t => <motion.div key={t.id} initial={{opacity:0, x:40}} animate={{opacity:1,x:0}} exit={{opacity:0, x:40}} className={cx('text-xs p-3 rounded border backdrop-blur shadow flex items-start gap-2', t.type==='error'?'bg-red-600/20 border-red-400/40 text-red-200': t.type==='success'?'bg-emerald-600/20 border-emerald-400/40 text-emerald-200':'bg-slate-700/60 border-white/10 text-white/80')}>
        <span className="leading-snug flex-1">{t.msg}</span>
      </motion.div>)}
    </AnimatePresence>
  </div>
));

const PlusIcon = React.memo(() => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>);

const Cameras = () => {
  // Tabs & view
  const [tab, setTab] = useState('overview'); // overview | manage | search | bulk | analytics
  const [view, setView] = useState('grid');

  // Data
  const [cameras, setCameras] = useState([]);
  const [areas, setAreas] = useState([]);
  const [zones, setZones] = useState([]);
  const [stats, setStats] = useState(null);

  // Loading/error
  const [loading, setLoading] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [error, setError] = useState(null);

  // Filters & search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [locationTypeFilter, setLocationTypeFilter] = useState('all');

  // Manage form
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);

  // Bulk
  const [bulkSelection, setBulkSelection] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('active');
  const [bulkCreateText, setBulkCreateText] = useState('');
  const [bulkWorking, setBulkWorking] = useState(false);

  // Search results (advanced tab)
  const [advResults, setAdvResults] = useState([]);
  const [advLoading, setAdvLoading] = useState(false);

  // Toasts
  const { toasts, api: toast } = useToasts();

  // Derived
  const filtered = useMemo(() => cameras.filter(c => {
    return (
      (statusFilter==='all'||c.status===statusFilter) &&
      (areaFilter==='all'||c.area===areaFilter) &&
      (zoneFilter==='all'||c.zone===zoneFilter) &&
      (locationTypeFilter==='all'||c.location_type===locationTypeFilter) &&
      (!search || (c.name||'').toLowerCase().includes(search.toLowerCase()))
    );
  }), [cameras, statusFilter, areaFilter, zoneFilter, locationTypeFilter, search]);

  const statusCounts = useMemo(() => filtered.reduce((acc,c)=>{ acc[c.status] = (acc[c.status]||0)+1; acc.total=(acc.total||0)+1; return acc; }, {}), [filtered]);

  // API calls ------------------------------------------------------------
  // Simple freshness caching / in-flight guards to avoid duplicate bursts
  const lastFetchRef = React.useRef({ cctvs: 0, areas: 0, zones: 0, summary: 0 });
  const inFlightRef = React.useRef({});
  const FRESH_MS = 30_000; // 30s freshness window

  const guarded = useCallback(async (key, fn) => {
    const now = Date.now();
    if (inFlightRef.current[key]) return inFlightRef.current[key];
    if (now - lastFetchRef.current[key] < FRESH_MS) return; // fresh
    const p = fn().catch(e=>{ throw e; }).finally(()=> { delete inFlightRef.current[key]; });
    inFlightRef.current[key] = p;
    return p;
  }, []);

  const loadCameras = useCallback(async (force=false) => {
    if (!force && Date.now() - lastFetchRef.current.cctvs < FRESH_MS && cameras.length) return; // skip
    await guarded('cctvs', async () => {
      setLoading(true); setError(null);
      try {
        const data = await cameraApi.listCCTVs();
        setCameras(Array.isArray(data) ? data.map(normalizeCCTV) : []);
        lastFetchRef.current.cctvs = Date.now();
      } catch (e) { setError(e.message); toast.push('Failed loading cameras','error'); }
      finally { setLoading(false); }
    });
  }, [guarded, toast, cameras.length]);

  const loadAreas = useCallback(async () => {
    await guarded('areas', async () => {
      setLoadingAreas(true);
      try { const res = await heatMapApi.listAreas(); setAreas(res); lastFetchRef.current.areas = Date.now(); } catch { /* ignore */ }
      finally { setLoadingAreas(false); }
    });
  }, [guarded]);

  const loadZones = useCallback(async () => {
    await guarded('zones', async () => {
      setLoadingZones(true);
      try { const res = await heatMapApi.listZones(); setZones(res); lastFetchRef.current.zones = Date.now(); } catch {/* ignore */ }
      finally { setLoadingZones(false); }
    });
  }, [guarded]);

  const loadSummary = useCallback(async () => {
    await guarded('summary', async () => {
      try { const s = await cameraApi.getSummary(); setStats(s); lastFetchRef.current.summary = Date.now(); }
      catch { setStats(null); }
    });
  }, [guarded]);

  // Initial parallel load once (React 18 StrictMode may double invoke; guards prevent duplication)
  useEffect(()=> {
    loadCameras(true);
    loadAreas();
    loadZones();
    loadSummary();
  }, [loadCameras, loadAreas, loadZones, loadSummary]);

  // Form handlers --------------------------------------------------------
  const resetForm = () => { setForm(INITIAL_FORM); setEditingId(null); };
  const submitForm = async (e) => {
    e.preventDefault();
    try {
      if (editingId) { await cameraApi.updateCCTV(editingId, form); toast.push('Camera updated','success'); }
      else { await cameraApi.createCCTV(form); toast.push('Camera created','success'); }
      resetForm(); await loadCameras(); await loadSummary();
    } catch (er) { toast.push(er.message,'error'); }
  };
  const startEdit = useCallback((cam) => { setEditingId(cam.id); setForm({
    name: cam.name||'', area: cam.area||'', zone: cam.zone||'', location_type: cam.location_type||'gate', location_name: cam.location_name||'', video_source: cam.video_source||'', source_type: cam.source_type||'http', status: cam.status||'active'
  }); setTab('manage'); }, []);

  const removeCamera = useCallback(async (id) => { if(!window.confirm('Delete camera?')) return; try { await cameraApi.deleteCCTV(id); toast.push('Deleted','success'); await loadCameras(); await loadSummary(); } catch(e){ toast.push(e.message,'error'); } }, [toast, loadCameras, loadSummary]);

  // Bulk ops -------------------------------------------------------------
  const toggleBulk = (id) => { setBulkSelection(sel => { const n=new Set(sel); n.has(id)?n.delete(id):n.add(id); return n; }); };
  const bulkUpdate = async () => { if (!bulkSelection.size) return; setBulkWorking(true); try { await cameraApi.bulkUpdateStatus(Array.from(bulkSelection), bulkStatus); toast.push('Status updated','success'); setBulkSelection(new Set()); await loadCameras(); await loadSummary(); } catch(e){ toast.push(e.message,'error'); } finally { setBulkWorking(false); } };
  const bulkDelete = async () => { if(!bulkSelection.size) return; if(!window.confirm('Delete selected cameras?')) return; setBulkWorking(true); try { await cameraApi.bulkDeleteCCTVs(Array.from(bulkSelection)); toast.push('Deleted','success'); setBulkSelection(new Set()); await loadCameras(); await loadSummary(); } catch(e){ toast.push(e.message,'error'); } finally { setBulkWorking(false); } };
  const bulkCreate = async () => {
    if(!bulkCreateText.trim()) return; setBulkWorking(true);
    try {
      // Each line: name,area,zone,location_type,location_name,video_source,source_type,status
      const lines = bulkCreateText.split('\n').map(l=>l.trim()).filter(Boolean);
      const payload = lines.map(l => {
        const [name,area,zone,location_type,location_name,video_source,source_type,status] = l.split(',').map(s=>s?.trim());
        return { name, area, zone, location_type: location_type||'gate', location_name, video_source, source_type: source_type||'http', status: status||'active' };
      });
      await cameraApi.bulkCreateCCTVs(payload);
      toast.push(`Created ${payload.length} cameras`,'success');
      setBulkCreateText(''); await loadCameras(); await loadSummary();
    } catch(e){ toast.push(e.message,'error'); } finally { setBulkWorking(false); }
  };

  // Advanced search ------------------------------------------------------
  const doAdvancedSearch = async (custom={}) => {
    setAdvLoading(true);
    try { const res = await cameraApi.searchCCTVs(custom); setAdvResults(Array.isArray(res)?res.map(normalizeCCTV):[]); } catch(e){ toast.push(e.message,'error'); } finally { setAdvLoading(false); }
  };

  // UI subsections -------------------------------------------------------
  const Overview = () => (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
  <StatCard label="Total" value={statusCounts.total||0} />
        <StatCard label="Active" value={statusCounts.active||0} />
        <StatCard label="Inactive" value={statusCounts.inactive||0} />
        <StatCard label="Maint." value={statusCounts.maintenance||0} />
        <StatCard label="Unknown" value={statusCounts.unknown||0} />
        <StatCard label="Areas" value={areas.length} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Quick search" className="h-9 w-52 pl-7 rounded-md border border-white/10 bg-white/5 focus:bg-white/10 pr-2 text-xs text-white/80 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
        </div>
        <select value={areaFilter} onChange={e=>{setAreaFilter(e.target.value); setZoneFilter('all');}} className="h-9 text-xs rounded-md border border-white/10 bg-white/5 px-2 text-white/80">
          <option value="all">All Areas</option>
          {areas.map(a=> <option key={a.id||a._id} value={a.name}>{a.name}</option>)}
        </select>
        <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="h-9 text-xs rounded-md border border-white/10 bg-white/5 px-2 text-white/80">
          <option value="all">All Zones</option>
          {zones.filter(z=> areaFilter==='all'||z.area_name===areaFilter||z.area===areaFilter).map(z=> <option key={z.id||z._id} value={z.name}>{z.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 text-xs rounded-md border border-white/10 bg-white/5 px-2 text-white/80"><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="maintenance">Maintenance</option><option value="unknown">Unknown</option></select>
        <select value={locationTypeFilter} onChange={e=>setLocationTypeFilter(e.target.value)} className="h-9 text-xs rounded-md border border-white/10 bg-white/5 px-2 text-white/80"><option value="all">All Types</option><option value="gate">Gate</option><option value="pole">Pole</option></select>
        <div className="ml-auto flex gap-1 border border-white/10 rounded-md overflow-hidden bg-white/5">
          <button onClick={()=>setView('grid')} className={cx('px-2 py-1 text-xs flex items-center gap-1', view==='grid'?'bg-orange-500 text-white':'text-white/70 hover:bg-white/10')}><GridIcon size={14}/>Grid</button>
          <button onClick={()=>setView('list')} className={cx('px-2 py-1 text-xs flex items-center gap-1', view==='list'?'bg-orange-500 text-white':'text-white/70 hover:bg-white/10')}><ListIcon size={14}/>List</button>
        </div>
  <button onClick={()=>loadCameras(true)} className="h-9 px-3 rounded-md text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 flex items-center gap-1"><RefreshCcw size={14}/>Refresh</button>
      </div>
  {loading ? <SkeletonGrid/> : (filtered.length ? (view==='grid'? <CameraGrid data={filtered} onEdit={startEdit} onDelete={removeCamera} /> : <CameraList data={filtered} onEdit={startEdit} onDelete={removeCamera} />) : <EmptyState />)}
    </div>
  );

  const Manage = () => (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-2 space-y-4">
  {loading ? <SkeletonGrid/> : <CameraList data={filtered} onEdit={startEdit} onDelete={removeCamera} />}
      </div>
      <form onSubmit={submitForm} className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-4">
        <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2"><FolderPlus size={16} className="text-orange-400"/>{editingId? 'Edit Camera':'Add Camera'}</h3>
        <div className="grid gap-3">
          {['name','location_name','video_source'].map(f => (
            <div key={f} className="space-y-1">
              <label className="text-[11px] uppercase tracking-wide text-white/40">{f.replace('_',' ')}</label>
              <input required={f==='name'} value={form[f]} onChange={e=>setForm(s=>({...s,[f]:e.target.value}))} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-[11px] uppercase tracking-wide text-white/40">Area</label><select value={form.area} onChange={e=>setForm(s=>({...s,area:e.target.value}))} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"><option value="">Select</option>{areas.map(a=> <option key={a.id||a._id} value={a.name}>{a.name}</option>)}</select></div>
            <div className="space-y-1"><label className="text-[11px] uppercase tracking-wide text-white/40">Zone</label><select value={form.zone} onChange={e=>setForm(s=>({...s,zone:e.target.value}))} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"><option value="">Select</option>{zones.filter(z=> !form.area||z.area_name===form.area||z.area===form.area).map(z=> <option key={z.id||z._id} value={z.name}>{z.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><label className="text-[11px] uppercase tracking-wide text-white/40">Loc. Type</label><select value={form.location_type} onChange={e=>setForm(s=>({...s,location_type:e.target.value}))} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"><option value="gate">Gate</option><option value="pole">Pole</option></select></div>
            <div className="space-y-1"><label className="text-[11px] uppercase tracking-wide text-white/40">Source Type</label><select value={form.source_type} onChange={e=>setForm(s=>({...s,source_type:e.target.value}))} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"><option value="http">HTTP</option><option value="file">File</option><option value="youtube">YouTube</option></select></div>
          </div>
          <div className="space-y-1"><label className="text-[11px] uppercase tracking-wide text-white/40">Status</label><select value={form.status} onChange={e=>setForm(s=>({...s,status:e.target.value}))} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"><option value="active">Active</option><option value="inactive">Inactive</option><option value="maintenance">Maintenance</option><option value="unknown">Unknown</option></select></div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="flex-1 h-9 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center justify-center gap-1">{editingId? <><Check size={14}/>Save</> : <><PlusIcon/>Create</>}</button>
          {editingId && <button type="button" onClick={resetForm} className="h-9 px-3 rounded bg-white/10 hover:bg-white/15 text-white/70 text-xs flex items-center gap-1"><X size={14}/>Cancel</button>}
        </div>
        <p className="text-[10px] text-white/40 leading-relaxed">Bulk create format (Bulk tab): name,area,zone,location_type,location_name,video_source,source_type,status</p>
      </form>
    </div>
  );

  const SearchTab = () => {
    const [q,setQ] = useState('');
    const [s,setS] = useState('');
    const [a,setA] = useState('');
    const [z,setZ] = useState('');
    const [lt,setLt] = useState('');
    return (
      <div className="space-y-6">
        <form onSubmit={e=>{e.preventDefault(); doAdvancedSearch({ q, status:s, area:a, zone:z, location_type:lt });}} className="grid md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1"><label className="text-[11px] text-white/40">Query</label><input value={q} onChange={e=>setQ(e.target.value)} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"/></div>
          <div className="space-y-1"><label className="text-[11px] text-white/40">Status</label><select value={s} onChange={e=>setS(e.target.value)} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"><option value="">Any</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="maintenance">Maintenance</option><option value="unknown">Unknown</option></select></div>
          <div className="space-y-1"><label className="text-[11px] text-white/40">Area</label><select value={a} onChange={e=>{setA(e.target.value); setZ('');}} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"><option value="">Any</option>{areas.map(ar=> <option key={ar.id||ar._id} value={ar.name}>{ar.name}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[11px] text-white/40">Zone</label><select value={z} onChange={e=>setZ(e.target.value)} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"><option value="">Any</option>{zones.filter(zo=> !a||zo.area_name===a||zo.area===a).map(zo=> <option key={zo.id||zo._id} value={zo.name}>{zo.name}</option>)}</select></div>
          <div className="space-y-1"><label className="text-[11px] text-white/40">Loc Type</label><select value={lt} onChange={e=>setLt(e.target.value)} className="h-9 w-full bg-white/5 border border-white/10 rounded px-2 text-xs text-white/80"><option value="">Any</option><option value="gate">Gate</option><option value="pole">Pole</option></select></div>
          <div className="md:col-span-5 flex gap-2"><button type="submit" className="h-9 px-4 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs flex items-center gap-1"><SearchIcon size={14}/>Search</button><button type="button" onClick={()=>{setQ('');setS('');setA('');setZ('');setLt(''); setAdvResults([]);}} className="h-9 px-3 rounded bg-white/10 hover:bg-white/15 text-white/70 text-xs">Reset</button></div>
        </form>
        <div>
          {advLoading ? <SkeletonGrid small/> : (advResults.length? <CameraList data={advResults} onEdit={startEdit} onDelete={removeCamera} /> : <div className="text-xs text-white/40 border border-dashed border-white/10 rounded p-6 text-center">No results</div>)}
        </div>
      </div>
    );
  };

  const Bulk = () => (
    <div className="space-y-8">
      <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-4">
        <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Activity size={16} className="text-orange-400"/>Selection ({bulkSelection.size})</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)} className="h-9 px-2 rounded bg-white/5 border border-white/10 text-white/80 text-xs"><option value="active">Active</option><option value="inactive">Inactive</option><option value="maintenance">Maintenance</option><option value="unknown">Unknown</option></select>
          <button disabled={!bulkSelection.size||bulkWorking} onClick={bulkUpdate} className="h-9 px-3 rounded bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 text-white flex items-center gap-1 text-xs"><Check size={14}/>Update Status</button>
          <button disabled={!bulkSelection.size||bulkWorking} onClick={bulkDelete} className="h-9 px-3 rounded bg-red-600 disabled:opacity-40 hover:bg-red-500 text-white flex items-center gap-1 text-xs"><Trash2 size={14}/>Delete</button>
          <button onClick={()=>setBulkSelection(new Set())} className="h-9 px-3 rounded bg-white/10 hover:bg-white/15 text-white/70 text-xs"><X size={14}/>Clear</button>
        </div>
        <div className="max-h-64 overflow-auto border border-white/10 rounded-md">
          <table className="min-w-full text-[11px]">
            <thead className="bg-white/5 text-white/50"><tr>{['','Name','Area','Zone','Status','Type'].map(h=> <th key={h} className="px-2 py-1 font-medium text-left">{h}</th>)}</tr></thead>
            <tbody>
              {cameras.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-2 py-1"><input type="checkbox" checked={bulkSelection.has(c.id)} onChange={()=>toggleBulk(c.id)} /></td>
                  <td className="px-2 py-1">{c.name}</td><td className="px-2 py-1">{c.area}</td><td className="px-2 py-1">{c.zone}</td>
                  <td className="px-2 py-1"><span className={cx('px-1.5 py-0.5 rounded border text-[10px]', badge(c.status))}>{c.status}</span></td>
                  <td className="px-2 py-1">{c.location_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3">
        <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Upload size={16} className="text-orange-400"/>Bulk Create</h3>
        <textarea value={bulkCreateText} onChange={e=>setBulkCreateText(e.target.value)} placeholder="name,area,zone,location_type,location_name,video_source,source_type,status" className="w-full h-40 text-xs bg-black/20 border border-white/10 rounded p-2 text-white/70 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-y" />
        <div className="flex gap-2">
          <button disabled={bulkWorking||!bulkCreateText.trim()} onClick={bulkCreate} className="h-9 px-4 rounded bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs flex items-center gap-1"><Upload size={14}/>Import</button>
          <button type="button" onClick={()=>setBulkCreateText('')} className="h-9 px-3 rounded bg-white/10 hover:bg-white/15 text-white/70 text-xs">Clear</button>
        </div>
        <p className="text-[10px] text-white/40">One camera per line. Commas separate fields.</p>
      </div>
    </div>
  );

  const Analytics = () => {
    const byArea = useMemo(()=> cameras.reduce((m,c)=>{ m[c.area]= (m[c.area]||0)+1; return m; },{}),[cameras]);
    const byZone = useMemo(()=> cameras.reduce((m,c)=>{ m[c.zone]= (m[c.zone]||0)+1; return m; },{}),[cameras]);
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3"><h4 className="text-xs font-semibold text-white/70 flex items-center gap-2"><Layers size={14} className="text-orange-400"/>By Area</h4><ul className="space-y-1 text-xs">{Object.entries(byArea).map(([k,v])=> <li key={k} className="flex justify-between"><span className="text-white/60">{k||'—'}</span><span className="text-white/80 font-medium">{v}</span></li>)}</ul></div>
        <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-3"><h4 className="text-xs font-semibold text-white/70 flex items-center gap-2"><Database size={14} className="text-orange-400"/>By Zone</h4><ul className="space-y-1 text-xs">{Object.entries(byZone).map(([k,v])=> <li key={k} className="flex justify-between"><span className="text-white/60">{k||'—'}</span><span className="text-white/80 font-medium">{v}</span></li>)}</ul></div>
      </div>
    );
  };

  // Shared subcomponents --------------------------------------------------
  // Main render ----------------------------------------------------------
  const TabBtn = ({ id, icon:Icon, label }) => <button onClick={()=>setTab(id)} className={cx('h-9 px-3 rounded-md text-xs flex items-center gap-1 border border-white/10 bg-white/5 hover:bg-white/10', tab===id && 'bg-orange-600 hover:bg-orange-600 text-white border-orange-500/70')}>{Icon && <Icon size={14}/>} {label}</button>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2 items-center">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Camera size={16} className="text-orange-400"/>CCTV Management <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 text-[10px] border border-orange-400/30">{cameras.length}</span></h2>
        <div className="flex gap-1 flex-wrap ml-auto">
          <TabBtn id="overview" icon={GridIcon} label="Overview" />
            <TabBtn id="manage" icon={FolderPlus} label="Manage" />
            <TabBtn id="search" icon={SearchIcon} label="Search" />
            <TabBtn id="bulk" icon={Box} label="Bulk" />
            <TabBtn id="analytics" icon={BarChart3} label="Analytics" />
        </div>
      </div>
      {error && <div className="p-3 bg-red-600/15 border border-red-500/30 rounded text-xs text-red-400">{error}</div>}
      {tab==='overview' && <Overview/>}
      {tab==='manage' && <Manage/>}
      {tab==='search' && <SearchTab/>}
      {tab==='bulk' && <Bulk/>}
      {tab==='analytics' && <Analytics/>}
  <ToastRegion toasts={toasts} />
    </div>
  );
};

export default Cameras;
