import React, { useEffect, useState, useMemo } from 'react';
import Modal from '../../General/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff as CamOffIcon, RefreshCcw, Search as SearchIcon, Grid as GridIcon, List as ListIcon, AlertTriangle, Clock } from 'lucide-react';

// Camera contract reference
// type Camera = { id:string; name:string; zoneName:string; status:'online'|'offline'|'unknown'|'degraded'; imageUrl:string; faceRatePerMin:number; updatedAt:string };

// Theme aware status styles -----------------------------------------------
const statusRing = (s) => ({ online:'ring-green-500/80', degraded:'ring-orange-400/80', offline:'ring-red-600/80', unknown:'ring-gray-500/60' }[s] || 'ring-gray-500/60');
const statusBadge = (s) => ({
  online:'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/30',
  degraded:'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-400/30',
  offline:'bg-red-600/15 text-red-600 dark:text-red-300 border-red-400/30',
  unknown:'bg-gray-500/15 text-gray-600 dark:text-gray-300 border-gray-400/30'
}[s] || 'bg-gray-500/15 text-gray-600 dark:text-gray-300 border-gray-400/30');

const Cameras = () => {
  const [view, setView] = useState('grid'); // grid | list
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalCamera, setModalCamera] = useState(null);
  const [tick, setTick] = useState(0); // thumbnail refresh tick

  // Fetch cameras (simulate) ----------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    setTimeout(() => {
      if (cancelled) return;
      const seed = Array.from({ length: 22 }).map((_,i) => ({
        id: 'cam'+(i+1),
        name: 'Camera '+(i+1),
        zoneName: ['Gate A','Riverbank','Transit Hub','Food Court','North Camp'][i%5],
        status: ['online','degraded','offline','online','online','unknown'][i%6],
        imageUrl: 'https://via.placeholder.com/320x180.png?text=Cam+'+(i+1),
        faceRatePerMin: Math.floor(Math.random()*40),
        updatedAt: new Date(Date.now()-i*60000).toISOString(),
      }));
      setCameras(seed);
      setLoading(false);
    }, 500);
    return () => { cancelled = true; };
  }, []);

  // Auto refresh thumbnails every 10s (update tick) -----------------------
  useEffect(() => { const iv = setInterval(()=> setTick(t=>t+1), 10000); return ()=>clearInterval(iv); }, []);

  // WebSocket status simulation -------------------------------------------
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setCameras(prev => prev.map(c => Math.random()<0.1 ? { ...c, status: ['online','offline','degraded'][Math.floor(Math.random()*3)], updatedAt: new Date().toISOString() } : c));
    }, 15000);
    return () => clearInterval(iv);
  }, [loading]);

  // Filters ----------------------------------------------------------------
  const zones = useMemo(() => ['all', ...Array.from(new Set(cameras.map(c => c.zoneName)))], [cameras]);
  const filtered = cameras.filter(c => (
    (zoneFilter==='all'||c.zoneName===zoneFilter) &&
    (statusFilter==='all'||c.status===statusFilter) &&
    c.name.toLowerCase().includes(search.toLowerCase())
  ));

  // States -----------------------------------------------------------------
  const renderLoadingCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({length:8}).map((_,i)=>(
        <div key={i} className="h-44 rounded-lg overflow-hidden relative">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
        </div>
      ))}
    </div>
  );
  const renderEmpty = () => (
    <div className="p-10 text-sm mk-text-muted text-center border border-dashed mk-border rounded-lg mk-surface-alt backdrop-blur flex flex-col items-center gap-3">
      <AlertTriangle className="text-orange-500 dark:text-orange-400" size={40} />
      No cameras configured yet.
    </div>
  );
  const renderError = () => (
    <div className="p-4 bg-red-600/10 text-red-600 dark:text-red-300 text-sm flex items-center justify-between rounded border border-red-400/30">
      <span className="font-medium">Error loading cameras</span>
      <button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs">Retry</button>
    </div>
  );

  // Grid view --------------------------------------------------------------
  const grid = (
  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      <AnimatePresence initial={false}>
        {filtered.map(cam => (
          <motion.button
            layout
            key={cam.id}
            initial={{opacity:0, y:12}}
            animate={{opacity:1, y:0}}
            exit={{opacity:0, y:-8}}
            whileHover={{y:-3}}
            whileTap={{scale:0.97}}
            onClick={()=>setModalCamera(cam)}
            className="group relative rounded-lg mk-border mk-surface-alt backdrop-blur-md shadow-sm overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500/50 flex flex-col hover:bg-black/5 dark:hover:bg-white/10 transition"
            aria-label={`Open ${cam.name} stream`}
          >
            <div className={`aspect-video w-full bg-gray-200 dark:bg-gray-800 ring-4 ${statusRing(cam.status)} ring-offset-0 flex items-center justify-center text-gray-600 dark:text-white/50 text-[11px] relative overflow-hidden`}>            
              <img src={cam.imageUrl+`&tick=${tick}`} loading="lazy" alt={cam.name+ ' thumbnail'} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100" />
              <div className="absolute inset-0 bg-black/20 dark:bg-black/30 group-hover:bg-black/40 transition-colors" />
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-white flex items-center gap-1 backdrop-blur-sm"><Clock size={10}/> {new Date(cam.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
            <div className="p-2 flex flex-col gap-1 w-full">
              <div className="text-xs font-medium text-gray-800 dark:text-white/90 truncate flex items-center gap-1">
                {cam.status==='offline'? <CamOffIcon size={14} className="text-red-500 dark:text-red-400"/> : <Camera size={14} className="text-orange-600 dark:text-orange-400"/>}
                {cam.name}
              </div>
              <div className="text-[11px] text-gray-600 dark:text-white/60 flex items-center gap-1">
                <span className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">{cam.zoneName}</span>
                <span className="ml-auto tabular-nums font-medium text-gray-800 dark:text-white/80">{cam.faceRatePerMin}<span className="text-[10px] text-gray-500 dark:text-white/40 ml-0.5">/min</span></span>
              </div>
            </div>
            <span className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded border backdrop-blur ${statusBadge(cam.status)} capitalize`}>{cam.status}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );

  // List view --------------------------------------------------------------
  const list = (
    <div className="overflow-x-auto mk-border rounded-lg mk-surface-alt backdrop-blur-md shadow-sm">
      <table className="min-w-full text-xs text-gray-700 dark:text-white/80">
        <thead className="bg-black/5 dark:bg-white/5 text-gray-500 dark:text-white/60">
          <tr>
            {['Camera','Zone','Status','Faces/min','Updated','Actions'].map(h => <th key={h} className="px-3 py-2 font-medium text-[10px] uppercase tracking-wide text-left whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {filtered.map(cam => (
            <motion.tr key={cam.id} layout initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-4}} className="even:bg-black/5 dark:even:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 focus-within:bg-black/10 dark:focus-within:bg-white/10">
              <td className="px-3 py-2 whitespace-nowrap">
                <button onClick={()=>setModalCamera(cam)} className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 rounded">
                  <div className={`w-14 h-8 rounded overflow-hidden ring-2 ${statusRing(cam.status)} bg-gray-200 dark:bg-gray-800 flex items-center justify-center`}>
                    <img src={cam.imageUrl+`&tick=${tick}`} loading="lazy" alt={cam.name+' thumbnail'} className="w-full h-full object-cover opacity-90" />
                  </div>
                  <span className="font-medium text-gray-800 dark:text-white/90 flex items-center gap-1">{cam.status==='offline'? <CamOffIcon size={14} className="text-red-500 dark:text-red-400"/> : <Camera size={14} className="text-orange-600 dark:text-orange-400"/>}{cam.name}</span>
                </button>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-white/70">{cam.zoneName}</td>
              <td className="px-3 py-2 whitespace-nowrap"><span className={`px-1.5 py-0.5 rounded border text-[10px] ${statusBadge(cam.status)} capitalize`}>{cam.status}</span></td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums text-gray-800 dark:text-white/80">{cam.faceRatePerMin}</td>
              <td className="px-3 py-2 whitespace-nowrap text-gray-500 dark:text-white/60">{new Date(cam.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
              <td className="px-3 py-2 whitespace-nowrap space-x-2">
                <button onClick={()=>setModalCamera(cam)} className="text-orange-600 dark:text-orange-300 hover:underline">View</button>
                <button className="text-gray-600 dark:text-white/60 hover:text-gray-800 dark:hover:text-white/80 hover:underline">Edit</button>
                <button className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:underline">Remove</button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Camera size={16} className="text-orange-400"/> Cameras <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 text-[10px] border border-orange-400/30">{filtered.length}</span></h2>
        <div className="flex items-center gap-2 ml-auto">
          <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            {zones.map(z => <option key={z} value={z} className="bg-slate-900">{z==='all' ? 'All Zones' : z}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            {['all','online','degraded','offline','unknown'].map(s => <option key={s} value={s} className="bg-slate-900">{s==='all' ? 'All Statuses' : s}</option>)}
          </select>
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cameras" className="h-9 w-40 sm:w-56 pl-7 rounded-md border border-white/10 bg-white/5 focus:bg-white/10 pr-2 text-xs text-white/80 placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          </div>
          <div className="flex gap-1 border border-white/10 rounded-md overflow-hidden bg-white/5">
            <button onClick={()=>setView('grid')} className={`px-2 py-1 text-xs inline-flex items-center gap-1 ${view==='grid' ? 'bg-orange-500 text-white' : 'text-white/70 hover:bg-white/10'}`}><GridIcon size={14}/> Grid</button>
            <button onClick={()=>setView('list')} className={`px-2 py-1 text-xs inline-flex items-center gap-1 ${view==='list' ? 'bg-orange-500 text-white' : 'text-white/70 hover:bg-white/10'}`}><ListIcon size={14}/> List</button>
          </div>
        </div>
      </div>
      {error && renderError()}
      {loading ? renderLoadingCards() : (filtered.length === 0 ? renderEmpty() : (view==='grid' ? grid : list))}

      <Modal open={!!modalCamera} onClose={()=>setModalCamera(null)} title={modalCamera? modalCamera.name : ''} actions={[
        <button key="close" onClick={()=>setModalCamera(null)} className="px-3 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10">Close</button>
      ]}>
        <AnimatePresence mode="wait">
          {modalCamera && (
            <motion.div key={modalCamera.id} initial={{opacity:0, y:12}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-12}} className="space-y-4">
              <div className="aspect-video w-full rounded-md bg-gray-900 flex items-center justify-center text-white/40 text-xs relative overflow-hidden ring-1 ring-white/10">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                Live Preview Placeholder
              </div>
              <div className="h-24 rounded-md bg-gradient-to-r from-white/5 via-white/10 to-white/5 flex items-center justify-center text-[11px] text-white/60 ring-1 ring-white/10">Detection timeline (faces/person) coming soon</div>
              <div className="grid grid-cols-2 gap-4 text-[11px] text-white/70">
                <div><span className="text-white/50">Zone</span><div className="font-medium text-white/90">{modalCamera.zoneName}</div></div>
                <div><span className="text-white/50">Status</span><div className={`font-medium capitalize ${statusBadge(modalCamera.status)} px-1 py-0.5 rounded border mt-0.5 inline-block`}>{modalCamera.status}</div></div>
                <div><span className="text-white/50">Updated</span><div className="font-medium">{new Date(modalCamera.updatedAt).toLocaleTimeString()}</div></div>
                <div><span className="text-white/50">Faces/min</span><div className="font-medium">{modalCamera.faceRatePerMin}</div></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </div>
  );
};

export default Cameras;
