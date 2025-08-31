import React, { useEffect, useState, useMemo } from 'react';
import Modal from '../../General/Modal';
import Drawer from '../../General/Drawer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserX,
  Search as SearchIcon,
  Filter,
  MapPin,
  Phone,
  ListChecks,
  Activity,
  Plus,
  X as XIcon,
  CheckCircle2,
  UserCog
} from 'lucide-react';

// type Volunteer = { id:string; name:string; phone:string; assignedZones:string[]; activeTasks:number; status:'active'|'suspended' };

const statusStyles = { active:'bg-green-100 text-green-700 border-green-200', suspended:'bg-gray-100 text-gray-600 border-gray-200' };

const Volunteers = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vols, setVols] = useState([]);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignZones, setAssignZones] = useState([]);
  const [detail, setDetail] = useState(null);
  const [zones] = useState(['Gate A','Riverbank','Transit Hub','Food Court']);
  const [showFilters, setShowFilters] = useState(false); // mobile
  const [density, setDensity] = useState('comfortable'); // comfortable | compact
  const rowPad = density==='compact' ? 'py-1.5' : 'py-2';

  // Seed fetch ------------------------------------------------------------
  useEffect(() => {
    setLoading(true); setError(null);
    const t = setTimeout(() => {
      const seed = Array.from({length:24}).map((_,i)=> ({
        id:'v'+(i+1),
        name:'Volunteer '+(i+1),
        phone:'+1 555-010'+(i%10),
        assignedZones: [zones[i%zones.length]],
        activeTasks: Math.floor(Math.random()*4),
        status: i%11===0 ? 'suspended':'active'
      }));
      setVols(seed); setLoading(false);
    }, 650);
    return () => clearTimeout(t);
  }, [zones]);

  // Simulate task:new affecting activeTasks
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setVols(prev => prev.map(v => Math.random()<0.05 ? { ...v, activeTasks: v.activeTasks+1 } : v));
    }, 20000);
    return () => clearInterval(iv);
  }, [loading]);

  const filtered = useMemo(()=> vols.filter(v => (
    (zoneFilter==='all'||v.assignedZones.includes(zoneFilter)) &&
    (statusFilter==='all'||v.status===statusFilter) &&
    (v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search))
  )), [vols, zoneFilter, statusFilter, search]);

  const counts = useMemo(()=> ({
    total: vols.length,
    active: vols.filter(v=>v.status==='active').length,
    suspended: vols.filter(v=>v.status==='suspended').length,
    activeTasks: vols.reduce((a,v)=>a+v.activeTasks,0)
  }), [vols]);

  const loadingRows = <tbody>{Array.from({length:8}).map((_,i)=>(<tr key={i}><td colSpan={7} className="h-10"><div className="h-6 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" /></td></tr>))}</tbody>;
  const emptyRow = <tbody><tr><td colSpan={7} className="py-10 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
    <UserX size={36} className="text-orange-500"/>
    <span>No volunteers match current filters.</span>
  </td></tr></tbody>;
  const errorBanner = <div className="p-4 bg-red-50 text-red-700 text-xs flex items-center justify-between rounded border border-red-200">Error loading volunteers <button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 text-white text-[10px]">Retry</button></div>;

  const toggleZoneAssign = (z) => setAssignZones(prev => prev.includes(z) ? prev.filter(x=>x!==z) : [...prev, z]);
  const openAssign = (v) => { setDetail(v); setAssignZones(v.assignedZones); setAssignOpen(true); };
  const saveAssign = () => { setVols(prev => prev.map(v => v.id===detail.id ? { ...v, assignedZones: assignZones } : v)); setAssignOpen(false); };
  const toggleSuspend = (v) => setVols(prev => prev.map(x => x.id===v.id ? { ...x, status: x.status==='active' ? 'suspended':'active' } : x));

  return (
    <div className="space-y-6" aria-label="Volunteers">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Users size={18} className="text-orange-600"/> Volunteers</h2>
        <div className="hidden md:flex items-center gap-2 text-xs">
          <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 focus:outline-none focus:ring-2 focus:ring-orange-500">{['all',...zones].map(z => <option key={z}>{z==='all'?'All Zones':z}</option>)}</select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 focus:outline-none focus:ring-2 focus:ring-orange-500">{['all','active','suspended'].map(s => <option key={s}>{s==='all'?'All Statuses':s}</option>)}</select>
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name / phone" className="h-9 w-48 pl-7 pr-2 rounded-md border border-gray-300 bg-gray-100 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <button onClick={()=>setDensity(d=>d==='compact'?'comfortable':'compact')} className="h-9 px-3 rounded-md border border-gray-300 bg-white hover:bg-orange-50 flex items-center gap-1 text-xs" aria-label="Toggle density">{density==='compact'?'Comfort':'Compact'}</button>
        </div>
        <div className="flex md:hidden ml-auto">
          <button onClick={()=>setShowFilters(f=>!f)} className={`h-9 px-3 rounded-md border text-xs flex items-center gap-1 ${showFilters? 'bg-orange-500 text-white border-orange-500':'bg-white border-gray-300 text-gray-600'}`}><Filter size={14}/> Filters</button>
        </div>
      </div>

      {/* Mobile Filters */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="md:hidden bg-white rounded-lg border border-gray-200 p-3 space-y-3 text-xs">
            <div className="flex gap-2">
              <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="flex-1 h-8 rounded border border-gray-300 px-2">{['all',...zones].map(z => <option key={z}>{z==='all'?'All Zones':z}</option>)}</select>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="flex-1 h-8 rounded border border-gray-300 px-2">{['all','active','suspended'].map(s => <option key={s}>{s==='all'?'All Statuses':s}</option>)}</select>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-8 pl-7 pr-2 w-full rounded border border-gray-300 bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <button onClick={()=>setDensity(d=>d==='compact'?'comfortable':'compact')} className="h-8 px-2 rounded border border-gray-300 bg-white text-gray-600 flex items-center gap-1">{density==='compact'?'Comfort':'Compact'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
        {[
          {label:'Active', value:counts.active, icon:UserCheck, color:'bg-green-50 text-green-700 border-green-200'},
          {label:'Suspended', value:counts.suspended, icon:UserX, color:'bg-gray-50 text-gray-600 border-gray-200'},
          {label:'Total', value:counts.total, icon:Users, color:'bg-orange-50 text-orange-700 border-orange-200'},
          {label:'Active Tasks', value:counts.activeTasks, icon:Activity, color:'bg-blue-50 text-blue-700 border-blue-200'},
        ].map(c => (
          <div key={c.label} className={`p-2 rounded-lg border flex items-center gap-2 ${c.color}`}>
            <c.icon size={16}/>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide font-medium">{c.label}</div>
              <div className="text-sm font-semibold tabular-nums">{c.value}</div>
            </div>
          </div>
        ))}
      </div>
      {error && errorBanner}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[560px]">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100/80 text-gray-700 sticky top-0">
              <tr>{['Name','Phone','Assigned Zones','Active Tasks','Status','Actions'].map(h => <th key={h} className="px-3 py-2 font-medium text-[10px] uppercase tracking-wide text-left">{h}</th>)}</tr>
            </thead>
            {loading ? loadingRows : filtered.length===0 ? emptyRow : (
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map(v => (
                    <motion.tr
                      key={v.id}
                      initial={{opacity:0, y:8}}
                      animate={{opacity:1, y:0}}
                      exit={{opacity:0, y:-6}}
                      className="even:bg-gray-50 hover:bg-orange-50"
                      layout
                    >
                      <td className={`px-3 ${rowPad} whitespace-nowrap font-medium text-gray-800`}>{v.name}</td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap tabular-nums flex items-center gap-1`}><Phone size={12} className="text-gray-400"/> {v.phone}</td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap`}>{v.assignedZones.join(', ')}</td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap tabular-nums`}>{v.activeTasks}</td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap`}><span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase ${statusStyles[v.status]}`}>{v.status}</span></td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap flex items-center gap-2 text-[11px]`}> 
                        <button onClick={()=>openAssign(v)} className="text-gray-600 hover:text-orange-600 focus:outline-none" aria-label="Assign zones"><MapPin size={14}/></button>
                        <button onClick={()=>toggleSuspend(v)} className="text-gray-600 hover:text-orange-600 focus:outline-none" aria-label={v.status==='active'?'Suspend volunteer':'Activate volunteer'}>{v.status==='active'?<UserX size={14}/>:<UserCheck size={14}/>}</button>
                        <button onClick={()=>setDetail(v)} className="text-gray-600 hover:text-orange-600 focus:outline-none" aria-label="View details"><ListChecks size={14}/></button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <Drawer open={!!detail && !assignOpen} onClose={()=>setDetail(null)} title={detail ? detail.name : ''}>
        {detail && (
          <div className="space-y-5 text-[11px]">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-gray-500">Phone</span><div className="font-medium flex items-center gap-1"><Phone size={12} className="text-orange-600"/> {detail.phone}</div></div>
              <div><span className="text-gray-500">Status</span><div className="font-medium capitalize flex items-center gap-1">{detail.status==='active'?<UserCheck size={12} className="text-green-600"/>:<UserX size={12} className="text-gray-500"/>}{detail.status}</div></div>
              <div className="col-span-2"><span className="text-gray-500">Assigned Zones</span><div className="font-medium flex flex-wrap gap-1 mt-1">{detail.assignedZones.length? detail.assignedZones.map(z => <span key={z} className="px-1.5 py-0.5 rounded border text-[10px] bg-orange-50 text-orange-700 border-orange-200">{z}</span>): 'None'}</div></div>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-700 mb-2 flex items-center gap-1"><ListChecks size={12} className="text-orange-600"/> Tasks</h4>
              <p className="text-gray-600">Active tasks: {detail.activeTasks} (placeholder – integrate tasks list)</p>
            </div>
          </div>
        )}
      </Drawer>

      {/* Assign Zone Modal */}
      <Modal open={assignOpen} onClose={()=>setAssignOpen(false)} title="Assign Zones" actions={[
        <button key="cancel" onClick={()=>setAssignOpen(false)} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs">Cancel</button>,
        <button key="save" onClick={saveAssign} className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium flex items-center gap-1"><CheckCircle2 size={14}/> Save</button>
      ]}>
        <div className="space-y-3 text-[11px]">
          <div className="flex flex-wrap gap-2">
            {zones.map(z => {
              const active = assignZones.includes(z);
              return (
                <button
                  key={z}
                  type="button"
                  onClick={()=>toggleZoneAssign(z)}
                  className={`px-2 py-1 rounded-full border text-[10px] flex items-center gap-1 ${active? 'bg-orange-500 text-white border-orange-500 shadow-sm':'bg-gray-50 text-gray-600 border-gray-300 hover:bg-orange-50'}`}
                  aria-pressed={active}
                >
                  <MapPin size={12}/> {z}
                </button>
              );
            })}
          </div>
          <div className="text-[10px] text-gray-500">Select one or more zones to assign to this volunteer.</div>
        </div>
      </Modal>
    </div>
  );
};

export default Volunteers;
