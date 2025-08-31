import React, { useEffect, useState, useMemo } from 'react';
import Modal from '../../General/Modal';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff as CamOffIcon, RefreshCcw, Search as SearchIcon, Grid as GridIcon, List as ListIcon, AlertTriangle, Clock } from 'lucide-react';

// Camera contract reference
// type Camera = { id:string; name:string; zoneName:string; status:'online'|'offline'|'unknown'|'degraded'; imageUrl:string; faceRatePerMin:number; updatedAt:string };

const statusRing = (s) => ({ online:'ring-green-500', degraded:'ring-orange-400', offline:'ring-red-600', unknown:'ring-gray-400' }[s] || 'ring-gray-400');
const statusBadge = (s) => ({ online:'bg-green-100 text-green-700 border-green-200', degraded:'bg-orange-100 text-orange-700 border-orange-200', offline:'bg-red-100 text-red-700 border-red-200', unknown:'bg-gray-100 text-gray-600 border-gray-200' }[s] || 'bg-gray-100 text-gray-600 border-gray-200');

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
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
        </div>
      ))}
    </div>
  );
  const renderEmpty = () => (<div className="p-10 text-sm text-gray-500 text-center border border-dashed border-gray-300 rounded-lg bg-white">No cameras configured yet.</div>);
  const renderError = () => (<div className="p-4 bg-red-50 text-red-700 text-sm flex items-center justify-between rounded border border-red-200">Error loading cameras <button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 text-white text-xs">Retry</button></div>);

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
            className="group relative rounded-lg border border-gray-200 bg-white/90 backdrop-blur shadow-sm overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500 flex flex-col"
            aria-label={`Open ${cam.name} stream`}
          >
            <div className={`aspect-video w-full bg-gray-200 ring-4 ${statusRing(cam.status)} ring-offset-0 flex items-center justify-center text-gray-500 text-[11px] relative overflow-hidden`}>            
              <img src={cam.imageUrl+`&tick=${tick}`} loading="lazy" alt={cam.name+ ' thumbnail'} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-white flex items-center gap-1"><Clock size={10}/> {new Date(cam.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
            </div>
            <div className="p-2 flex flex-col gap-1 w-full">
              <div className="text-xs font-semibold text-gray-800 truncate flex items-center gap-1">
                {cam.status==='offline'? <CamOffIcon size={14} className="text-red-500"/> : <Camera size={14} className="text-orange-500"/>}
                {cam.name}
              </div>
              <div className="text-[11px] text-gray-600 flex items-center gap-1">
                <span className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200">{cam.zoneName}</span>
                <span className="ml-auto tabular-nums font-medium text-gray-700">{cam.faceRatePerMin}<span className="text-[10px] text-gray-400 ml-0.5">/min</span></span>
              </div>
            </div>
            <span className={`absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded border backdrop-blur ${statusBadge(cam.status)}`}>{cam.status}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );

  // List view --------------------------------------------------------------
  const list = (
    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-100/70 text-gray-600">
          <tr>
            {['Camera','Zone','Status','Faces/min','Updated','Actions'].map(h => <th key={h} className="px-3 py-2 font-medium text-[10px] uppercase tracking-wide text-left whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {filtered.map(cam => (
            <motion.tr key={cam.id} layout initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-4}} className="even:bg-gray-50 hover:bg-orange-50 focus-within:bg-orange-50">
              <td className="px-3 py-2 whitespace-nowrap">
                <button onClick={()=>setModalCamera(cam)} className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded">
                  <div className={`w-14 h-8 rounded overflow-hidden ring-2 ${statusRing(cam.status)} bg-gray-200 flex items-center justify-center`}>
                    <img src={cam.imageUrl+`&tick=${tick}`} loading="lazy" alt={cam.name+' thumbnail'} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-medium text-gray-800 flex items-center gap-1">{cam.status==='offline'? <CamOffIcon size={14} className="text-red-500"/> : <Camera size={14} className="text-orange-500"/>}{cam.name}</span>
                </button>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{cam.zoneName}</td>
              <td className="px-3 py-2 whitespace-nowrap"><span className={`px-1.5 py-0.5 rounded border text-[10px] ${statusBadge(cam.status)}`}>{cam.status}</span></td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">{cam.faceRatePerMin}</td>
              <td className="px-3 py-2 whitespace-nowrap">{new Date(cam.updatedAt).toLocaleTimeString()}</td>
              <td className="px-3 py-2 whitespace-nowrap space-x-2">
                <button onClick={()=>setModalCamera(cam)} className="text-orange-600 hover:underline">View</button>
                <button className="text-gray-600 hover:underline">Edit</button>
                <button className="text-red-600 hover:underline">Remove</button>
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
  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Camera size={16} className="text-orange-600"/> Cameras <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] border border-orange-200">{filtered.length}</span></h2>
        <div className="flex items-center gap-2 ml-auto">
          <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500">
            {zones.map(z => <option key={z} value={z}>{z==='all' ? 'All Zones' : z}</option>)}
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500">
            {['all','online','degraded','offline','unknown'].map(s => <option key={s} value={s}>{s==='all' ? 'All Statuses' : s}</option>)}
          </select>
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cameras" className="h-9 w-40 sm:w-56 pl-7 rounded-md border border-gray-300 bg-gray-100 focus:bg-white pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="flex gap-1 border border-gray-300 rounded-md overflow-hidden">
            <button onClick={()=>setView('grid')} className={`px-2 py-1 text-xs inline-flex items-center gap-1 ${view==='grid' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50'}`}><GridIcon size={14}/> Grid</button>
            <button onClick={()=>setView('list')} className={`px-2 py-1 text-xs inline-flex items-center gap-1 ${view==='list' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50'}`}><ListIcon size={14}/> List</button>
          </div>
        </div>
      </div>
      {error && renderError()}
      {loading ? renderLoadingCards() : (filtered.length === 0 ? renderEmpty() : (view==='grid' ? grid : list))}

      <Modal open={!!modalCamera} onClose={()=>setModalCamera(null)} title={modalCamera? modalCamera.name : ''} actions={[
        <button key="close" onClick={()=>setModalCamera(null)} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs hover:bg-gray-50">Close</button>
      ]}>
        <AnimatePresence mode="wait">
          {modalCamera && (
            <motion.div key={modalCamera.id} initial={{opacity:0, y:12}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-12}} className="space-y-4">
              <div className="aspect-video w-full rounded-md bg-gray-200 flex items-center justify-center text-gray-500 text-xs relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
                Live Preview Placeholder
              </div>
              <div className="h-24 rounded-md bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 flex items-center justify-center text-[11px] text-gray-500">Detection timeline (faces/person) coming soon</div>
              <div className="grid grid-cols-2 gap-4 text-[11px]">
                <div><span className="text-gray-500">Zone</span><div className="font-medium">{modalCamera.zoneName}</div></div>
                <div><span className="text-gray-500">Status</span><div className="font-medium capitalize">{modalCamera.status}</div></div>
                <div><span className="text-gray-500">Updated</span><div className="font-medium">{new Date(modalCamera.updatedAt).toLocaleTimeString()}</div></div>
                <div><span className="text-gray-500">Faces/min</span><div className="font-medium">{modalCamera.faceRatePerMin}</div></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </div>
  );
};

export default Cameras;
