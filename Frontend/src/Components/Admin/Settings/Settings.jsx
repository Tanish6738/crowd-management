import React, { useEffect, useState, useMemo } from 'react';
import Modal from '../../General/Modal';
import Drawer from '../../General/Drawer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  DoorOpen,
  Wrench,
  Camera as CameraIcon,
  SlidersHorizontal,
  UserCog,
  Plus,
  Pencil,
  Trash2,
  Search as SearchIcon,
  Layers3,
  Gauge,
  Settings2
} from 'lucide-react';

// Contracts
// type Zone = { id:string; name:string; capacity:number };
// type Gate = { id:string; name:string; zoneId:string };
// type Service = { id:string; name:string; type:string; zoneId:string };
// type CameraConfig = { id:string; name:string; zoneId:string; rtspUrl:string; status:string };

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zones, setZones] = useState([]);
  const [gates, setGates] = useState([]);
  const [services, setServices] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [section, setSection] = useState('zones');
  const [thresholds, setThresholds] = useState({ normal:60, busy:80, critical:90 });
  const [editEntity, setEditEntity] = useState(null); // entity object
  const [editType, setEditType] = useState(null); // zone|gate|service|camera
  const [form, setForm] = useState({});
  const [search, setSearch] = useState('');
  const [showMobileTabs, setShowMobileTabs] = useState(false);

  // Simulated fetch ------------------------------------------------------
  useEffect(() => {
    setLoading(true); setError(null);
    const t = setTimeout(() => {
      const z = ['Gate A','Riverbank','Transit Hub','Food Court'].map((n,i)=>({ id:'z'+(i+1), name:n, capacity: 100 + i*50 }));
      const g = ['GA-1','RB-1','TH-1','FC-1','GA-2'].map((n,i)=>({ id:'g'+(i+1), name:n, zoneId:z[i%z.length].id }));
      const s = ['Washroom A','Health Desk 1','Camp Alpha','Camp Beta'].map((n,i)=>({ id:'s'+(i+1), name:n, type:['washroom','health','camp','camp'][i], zoneId:z[i%z.length].id }));
      const c = ['Cam Gate A','Cam River 1','Cam Transit 2','Cam Food'].map((n,i)=>({ id:'c'+(i+1), name:n, zoneId:z[i%z.length].id, rtspUrl:'rtsp://example/'+n.replace(/\s+/g,'').toLowerCase(), status:'online' }));
      setZones(z); setGates(g); setServices(s); setCameras(c); setLoading(false);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const openEdit = (type, entity=null) => {
    setEditType(type);
    setEditEntity(entity);
    if (type==='zone') setForm(entity ? { name:entity.name, capacity:entity.capacity } : { name:'', capacity:100 });
    if (type==='gate') setForm(entity ? { name:entity.name, zoneId:entity.zoneId } : { name:'', zoneId: zones[0]?.id });
    if (type==='service') setForm(entity ? { name:entity.name, type:entity.type, zoneId:entity.zoneId } : { name:'', type:'washroom', zoneId: zones[0]?.id });
    if (type==='camera') setForm(entity ? { name:entity.name, rtspUrl:entity.rtspUrl, zoneId:entity.zoneId } : { name:'', rtspUrl:'', zoneId: zones[0]?.id });
  };
  const closeEdit = () => { setEditEntity(null); setEditType(null); setForm({}); };

  const saveEntity = (e) => {
    e.preventDefault();
    if (editType==='zone') {
      if (editEntity) setZones(z => z.map(z0 => z0.id===editEntity.id ? { ...z0, name:form.name, capacity:Number(form.capacity) } : z0));
      else setZones(z => [...z, { id:'z'+Date.now(), name:form.name, capacity:Number(form.capacity) }]);
    }
    if (editType==='gate') {
      if (editEntity) setGates(g => g.map(g0 => g0.id===editEntity.id ? { ...g0, name:form.name, zoneId:form.zoneId } : g0));
      else setGates(g => [...g, { id:'g'+Date.now(), name:form.name, zoneId:form.zoneId }]);
    }
    if (editType==='service') {
      if (editEntity) setServices(s => s.map(s0 => s0.id===editEntity.id ? { ...s0, name:form.name, type:form.type, zoneId:form.zoneId } : s0));
      else setServices(s => [...s, { id:'s'+Date.now(), name:form.name, type:form.type, zoneId:form.zoneId }]);
    }
    if (editType==='camera') {
      if (editEntity) setCameras(c => c.map(c0 => c0.id===editEntity.id ? { ...c0, name:form.name, rtspUrl:form.rtspUrl, zoneId:form.zoneId } : c0));
      else setCameras(c => [...c, { id:'c'+Date.now(), name:form.name, rtspUrl:form.rtspUrl, zoneId:form.zoneId, status:'online' }]);
    }
    closeEdit();
  };

  const removeEntity = (type, id) => {
    if (!window.confirm('Delete this '+type+'?')) return;
    if (type==='zone') setZones(z => z.filter(i=>i.id!==id));
    if (type==='gate') setGates(g => g.filter(i=>i.id!==id));
    if (type==='service') setServices(s => s.filter(i=>i.id!==id));
    if (type==='camera') setCameras(c => c.filter(i=>i.id!==id));
  };

  const loadingList = <div className="space-y-2">{Array.from({length:6}).map((_,i)=>(<div key={i} className="h-10 rounded bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse" />))}</div>;
  const emptyState = <div className="p-6 text-xs mk-text-muted text-center border border-dashed mk-border rounded mk-surface-alt backdrop-blur-sm">No zones configured yet.</div>;
  const errorBanner = <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-300 text-xs flex items-center justify-between rounded border border-red-500/30">Error loading settings <button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 text-white/90 text-[10px] hover:bg-red-500">Retry</button></div>;

  const sectionTabs = [
    { key:'zones', label:'Zones & Gates', icon:Layers3, count: zones.length + gates.length },
    { key:'services', label:'Services', icon:Wrench, count: services.length },
    { key:'cameras', label:'Cameras', icon:CameraIcon, count: cameras.length },
    { key:'policies', label:'Policies', icon:SlidersHorizontal },
    { key:'account', label:'Account', icon:UserCog },
  ];

  const filteredZones = zones.filter(z => search==='' || z.name.toLowerCase().includes(search.toLowerCase()));
  const filteredGates = gates.filter(g => search==='' || g.name.toLowerCase().includes(search.toLowerCase()));
  const filteredServices = services.filter(s => search==='' || s.name.toLowerCase().includes(search.toLowerCase()))
  const filteredCameras = cameras.filter(c => search==='' || c.name.toLowerCase().includes(search.toLowerCase()));

  const zoneGateView = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button onClick={()=>openEdit('zone')} className="px-3 py-1.5 rounded bg-orange-500 text-white font-medium hover:bg-orange-600 flex items-center gap-1"><Plus size={14}/> Zone</button>
        <button onClick={()=>openEdit('gate')} className="px-3 py-1.5 rounded bg-orange-500 text-white font-medium hover:bg-orange-600 flex items-center gap-1"><Plus size={14}/> Gate</button>
        <div className="relative ml-auto">
          <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 mk-text-muted"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-8 pl-7 pr-2 rounded border mk-border mk-surface-alt focus:bg-orange-50 dark:focus:bg-white/10 mk-text-primary placeholder:mk-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="mk-surface-alt mk-border rounded-lg p-4 shadow-sm backdrop-blur-sm">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide mk-text-primary mb-3 flex items-center gap-1"><Layers3 size={14} className="text-orange-500"/> Zones</h3>
          {loading ? loadingList : filteredZones.length===0 ? emptyState : (
            <ul className="space-y-2 text-xs">
              <AnimatePresence initial={false}>
                {filteredZones.map(z => (
                  <motion.li
                    key={z.id}
                    initial={{opacity:0, y:8}}
                    animate={{opacity:1, y:0}}
                    exit={{opacity:0, y:-6}}
                    className="flex items-center gap-3 p-2 rounded mk-border mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 focus-within:bg-orange-50 dark:focus-within:bg-white/10"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium mk-text-primary truncate flex items-center gap-1"><MapPin size={12} className="text-orange-500"/> {z.name}</div>
                      <div className="text-[10px] mk-text-muted">Capacity: {z.capacity}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>openEdit('zone', z)} className="mk-text-muted hover:text-orange-500" aria-label="Edit zone"><Pencil size={14}/></button>
                      <button onClick={()=>removeEntity('zone', z.id)} className="mk-text-fainter hover:text-red-500" aria-label="Delete zone"><Trash2 size={14}/></button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
        <div className="mk-surface-alt mk-border rounded-lg p-4 shadow-sm backdrop-blur-sm">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide mk-text-primary mb-3 flex items-center gap-1"><DoorOpen size={14} className="text-orange-500"/> Gates</h3>
          {loading ? loadingList : (
            <ul className="space-y-2 text-xs">
              <AnimatePresence initial={false}>
                {filteredGates.map(g => (
                  <motion.li
                    key={g.id}
                    initial={{opacity:0, y:8}}
                    animate={{opacity:1, y:0}}
                    exit={{opacity:0, y:-6}}
                    className="flex items-center gap-3 p-2 rounded mk-border mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium mk-text-primary truncate">{g.name}</div>
                      <div className="text-[10px] mk-text-muted">Zone: {zones.find(z=>z.id===g.zoneId)?.name}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>openEdit('gate', g)} className="mk-text-muted hover:text-orange-500" aria-label="Edit gate"><Pencil size={14}/></button>
                      <button onClick={()=>removeEntity('gate', g.id)} className="mk-text-fainter hover:text-red-500" aria-label="Delete gate"><Trash2 size={14}/></button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const servicesView = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <button onClick={()=>openEdit('service')} className="px-3 py-1.5 rounded bg-orange-500 text-white font-medium hover:bg-orange-600 flex items-center gap-1"><Plus size={14}/> Service</button>
        <div className="relative ml-auto">
          <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 mk-text-muted"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-8 pl-7 pr-2 rounded border mk-border mk-surface-alt focus:bg-orange-50 dark:focus:bg-white/10 mk-text-primary placeholder:mk-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
      </div>
      <div className="mk-surface-alt mk-border rounded-lg p-4 shadow-sm backdrop-blur-sm">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide mk-text-primary mb-3 flex items-center gap-1"><Wrench size={14} className="text-orange-500"/> Services</h3>
        {loading ? loadingList : (
          <ul className="space-y-2 text-xs">
            <AnimatePresence initial={false}>
              {filteredServices.map(s => (
                <motion.li
                  key={s.id}
                  initial={{opacity:0, y:8}}
                  animate={{opacity:1, y:0}}
                  exit={{opacity:0, y:-6}}
                  className="flex items-center gap-3 p-2 rounded mk-border mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium mk-text-primary truncate flex items-center gap-1"><Gauge size={12} className="text-orange-500"/> {s.name}</div>
                    <div className="text-[10px] mk-text-muted">Type: {s.type} · Zone: {zones.find(z=>z.id===s.zoneId)?.name}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>openEdit('service', s)} className="mk-text-muted hover:text-orange-500" aria-label="Edit service"><Pencil size={14}/></button>
                    <button onClick={()=>removeEntity('service', s.id)} className="mk-text-fainter hover:text-red-500" aria-label="Delete service"><Trash2 size={14}/></button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );

  const camerasView = (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        <button onClick={()=>openEdit('camera')} className="px-3 py-1.5 rounded bg-orange-500 text-white font-medium hover:bg-orange-600 flex items-center gap-1"><Plus size={14}/> Camera</button>
        <div className="relative ml-auto">
          <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 mk-text-muted"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-8 pl-7 pr-2 rounded border mk-border mk-surface-alt focus:bg-orange-50 dark:focus:bg-white/10 mk-text-primary placeholder:mk-text-muted focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
      </div>
      <div className="mk-surface-alt mk-border rounded-lg p-4 shadow-sm backdrop-blur-sm">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide mk-text-primary mb-3 flex items-center gap-1"><CameraIcon size={14} className="text-orange-500"/> Cameras</h3>
        {loading ? loadingList : (
          <ul className="space-y-2 text-xs">
            <AnimatePresence initial={false}>
              {filteredCameras.map(c => (
                <motion.li
                  key={c.id}
                  initial={{opacity:0, y:8}}
                  animate={{opacity:1, y:0}}
                  exit={{opacity:0, y:-6}}
                  className="flex items-center gap-3 p-2 rounded mk-border mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium mk-text-primary truncate flex items-center gap-1"><CameraIcon size={12} className="text-orange-500"/> {c.name}</div>
                    <div className="text-[10px] mk-text-muted">Zone: {zones.find(z=>z.id===c.zoneId)?.name}</div>
                    <div className="text-[10px] mk-text-fainter truncate">{c.rtspUrl}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>openEdit('camera', c)} className="mk-text-muted hover:text-orange-500" aria-label="Edit camera"><Pencil size={14}/></button>
                    <button onClick={()=>removeEntity('camera', c.id)} className="mk-text-fainter hover:text-red-500" aria-label="Delete camera"><Trash2 size={14}/></button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );

  const policiesView = (
    <div className="space-y-6">
      <div className="mk-surface-alt mk-border rounded-lg p-4 shadow-sm backdrop-blur-sm">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide mk-text-primary mb-4 flex items-center gap-1"><SlidersHorizontal size={14} className="text-orange-500"/> Crowd Thresholds</h3>
        <div className="space-y-4 text-xs">
          {['normal','busy','critical'].map(k => (
            <div key={k} className="flex items-center gap-4">
              <label className="w-20 capitalize mk-text-muted">{k}</label>
              <input type="range" min={0} max={100} value={thresholds[k]} onChange={e=>setThresholds(t=>({...t,[k]:Number(e.target.value)}))} className="flex-1 accent-orange-500" />
              <span className="w-10 tabular-nums text-right font-medium mk-text-primary">{thresholds[k]}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mk-surface-alt mk-border rounded-lg p-4 shadow-sm backdrop-blur-sm">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide mk-text-primary mb-2 flex items-center gap-1"><Settings2 size={14} className="text-orange-500"/> Retention</h3>
        <p className="text-[11px] mk-text-muted">Lost & Found retention: <span className="font-medium mk-text-primary">30 days</span> (placeholder)</p>
      </div>
    </div>
  );

  const accountView = (
    <div className="space-y-6">
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 shadow-sm text-xs space-y-4 backdrop-blur-sm">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-white/80 flex items-center gap-1"><UserCog size={14} className="text-orange-500"/> Admin Profile</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium text-white/70">Name</label>
            <input defaultValue="Admin User" className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400" />
          </div>
          <div>
            <label className="block mb-1 font-medium text-white/70">Email</label>
            <input defaultValue="admin@example.com" className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium hover:bg-orange-600">Update</button>
          <button className="px-3 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10">Reset Password</button>
          <button className="px-3 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10">Toggle MFA</button>
        </div>
      </div>
    </div>
  );

  const view = section==='zones'? zoneGateView : section==='services'? servicesView : section==='cameras'? camerasView : section==='policies'? policiesView : accountView;

  return (
    <div className="space-y-6 text-white/90" aria-label="Settings">
      <div className="flex flex-wrap gap-2 text-xs items-center">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Settings2 size={18} className="text-orange-500"/> Settings</h2>
        <div className="hidden md:flex flex-wrap gap-2">
          {sectionTabs.map(t => (
            <button key={t.key} onClick={()=>setSection(t.key)} className={`relative px-3 py-1.5 rounded-md border flex items-center gap-1 transition-colors ${section===t.key ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}`} aria-current={section===t.key? 'page':undefined}>
              <t.icon size={14} className={section===t.key? '':'text-white/60'} /> {t.label}
              {typeof t.count==='number' && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] border ${section===t.key? 'bg-white/15 text-white border-white/20':'bg-white/5 text-white/60 border-white/10'}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="md:hidden ml-auto">
          <button onClick={()=>setShowMobileTabs(s=>!s)} className={`h-9 px-3 rounded-md border flex items-center gap-1 ${showMobileTabs? 'bg-orange-500 text-white border-orange-500':'bg-white/5 border-white/10 text-white/70'} hover:bg-white/10`}><Settings2 size={14}/> Sections</button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {showMobileTabs && (
          <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="md:hidden bg-white/5 rounded-lg border border-white/10 p-3 flex flex-wrap gap-2 backdrop-blur-sm">
            {sectionTabs.map(t => (
              <button key={t.key} onClick={()=>{setSection(t.key); setShowMobileTabs(false);}} className={`relative px-3 py-1.5 rounded-md border flex items-center gap-1 text-xs transition-colors ${section===t.key ? 'bg-orange-500 text-white border-orange-500' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'}`} aria-current={section===t.key? 'page':undefined}>
                <t.icon size={14}/> {t.label}
                {typeof t.count==='number' && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] border ${section===t.key? 'bg-white/15 text-white border-white/20':'bg-white/5 text-white/60 border-white/10'}`}>{t.count}</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {error && errorBanner}
      {view}

      {/* Edit Modal */}
      <Modal open={!!editType} onClose={closeEdit} title={editEntity? 'Edit '+editType : 'Add '+editType} actions={[
        <button key="cancel" onClick={closeEdit} className="px-3 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10">Cancel</button>,
        <button key="save" onClick={saveEntity} className="px-3 py-1.5 rounded bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium flex items-center gap-1"><Plus size={14}/> Save</button>
      ]}>
        {editType && (
          <form onSubmit={saveEntity} className="space-y-4 text-[11px] text-white/80">
            {editType==='zone' && (
              <>
                <div>
                  <label className="block mb-1 font-medium">Name</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Capacity</label>
                  <input type="number" min={0} value={form.capacity} onChange={e=>setForm(f=>({...f,capacity:e.target.value}))} required className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400" />
                </div>
              </>
            )}
            {editType==='gate' && (
              <>
                <div>
                  <label className="block mb-1 font-medium">Name</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Zone</label>
                  <select value={form.zoneId} onChange={e=>setForm(f=>({...f,zoneId:e.target.value}))} className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50">{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select>
                </div>
              </>
            )}
            {editType==='service' && (
              <>
                <div>
                  <label className="block mb-1 font-medium">Name</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-medium">Type</label>
                    <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50">{['washroom','camp','health'].map(t => <option key={t}>{t}</option>)}</select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium">Zone</label>
                    <select value={form.zoneId} onChange={e=>setForm(f=>({...f,zoneId:e.target.value}))} className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50">{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select>
                  </div>
                </div>
              </>
            )}
            {editType==='camera' && (
              <>
                <div>
                  <label className="block mb-1 font-medium">Name</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">RTSP URL</label>
                  <input value={form.rtspUrl} onChange={e=>setForm(f=>({...f,rtspUrl:e.target.value}))} required className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-400" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Zone</label>
                  <select value={form.zoneId} onChange={e=>setForm(f=>({...f,zoneId:e.target.value}))} className="w-full h-8 rounded border border-white/15 bg-white/5 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500/50">{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Settings;
