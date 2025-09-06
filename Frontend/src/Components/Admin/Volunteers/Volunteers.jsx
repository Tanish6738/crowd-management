import React, { useEffect, useState, useMemo } from 'react';
import dataFile from '../../../Data/data.json';
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

const statusStyles = {
  active:'bg-emerald-500/15 mk-text-secondary border-emerald-400/30',
  suspended:'bg-gray-500/15 mk-text-muted border-gray-400/30'
};

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

  // Load volunteers from data.json ----------------------------------------
  useEffect(() => {
    setLoading(true); setError(null);
    try {
      const emails = Array.isArray(dataFile?.volunteers) ? dataFile.volunteers : [];
      const unique = [...new Set(emails)];
      const mapName = (email) => {
        const base = email
          .split('@')[0]
          // collapse underscores / dots / hyphens
          .replace(/[._-]+/g, ' ');
        return base
          .split(' ')
          .filter(Boolean)
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ') || email;
      };
      const mapped = unique.map((email,i) => ({
        id: email,
        name: mapName(email),
        phone: '—',
        assignedZones: [],
        activeTasks: 0,
        status: 'active'
      }));
      setVols(mapped);
    } catch(e){
      setError('Failed to load volunteers');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const loadingRows = <tbody>{Array.from({length:8}).map((_,i)=>(<tr key={i}><td colSpan={7} className="h-10"><div className="h-6 rounded bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse" /></td></tr>))}</tbody>;
  const emptyRow = <tbody><tr><td colSpan={7} className="py-10 text-center text-sm mk-text-muted flex flex-col items-center gap-2">
    <UserX size={36} className="text-orange-400"/>
    <span>No volunteers match current filters.</span>
  </td></tr></tbody>;
  const errorBanner = <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-300 text-xs flex items-center justify-between rounded border border-red-500/30">Error loading volunteers <button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 text-white text-[10px] hover:bg-red-500">Retry</button></div>;

  const toggleZoneAssign = (z) => setAssignZones(prev => prev.includes(z) ? prev.filter(x=>x!==z) : [...prev, z]);
  const openAssign = (v) => { setDetail(v); setAssignZones(v.assignedZones); setAssignOpen(true); };
  const saveAssign = () => { setVols(prev => prev.map(v => v.id===detail.id ? { ...v, assignedZones: assignZones } : v)); setAssignOpen(false); };
  const toggleSuspend = (v) => setVols(prev => prev.map(x => x.id===v.id ? { ...x, status: x.status==='active' ? 'suspended':'active' } : x));

  return (
    <div className="space-y-6" aria-label="Volunteers">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Users size={18} className="text-orange-400"/> Volunteers</h2>
        <div className="hidden md:flex items-center gap-2 text-xs">
          <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">{['all',...zones].map(z => <option key={z} className="bg-gray-900">{z==='all'?'All Zones':z}</option>)}</select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">{['all','active','suspended'].map(s => <option key={s} className="bg-gray-900">{s==='all'?'All Statuses':s}</option>)}</select>
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name / phone" className="h-9 w-48 pl-7 pr-2 rounded-md border border-white/10 bg-white/5 text-xs text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          </div>
          <button onClick={()=>setDensity(d=>d==='compact'?'comfortable':'compact')} className="h-9 px-3 rounded-md border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 flex items-center gap-1 text-xs" aria-label="Toggle density">{density==='compact'?'Comfort':'Compact'}</button>
        </div>
        <div className="flex md:hidden ml-auto">
          <button onClick={()=>setShowFilters(f=>!f)} className={`h-9 px-3 rounded-md border text-xs flex items-center gap-1 transition ${showFilters? 'bg-orange-500 text-white border-orange-500':'bg-white/5 border-white/10 text-white/70'}`}><Filter size={14}/> Filters</button>
        </div>
      </div>

      {/* Mobile Filters */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="md:hidden bg-white/5 backdrop-blur rounded-lg border border-white/10 p-3 space-y-3 text-xs text-white/70">
            <div className="flex gap-2">
              <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="flex-1 h-8 rounded border border-white/10 bg-white/5 px-2">{['all',...zones].map(z => <option key={z} className="bg-gray-900">{z==='all'?'All Zones':z}</option>)}</select>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="flex-1 h-8 rounded border border-white/10 bg-white/5 px-2">{['all','active','suspended'].map(s => <option key={s} className="bg-gray-900">{s==='all'?'All Statuses':s}</option>)}</select>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-8 pl-7 pr-2 w-full rounded border border-white/10 bg-white/5 text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <button onClick={()=>setDensity(d=>d==='compact'?'comfortable':'compact')} className="h-8 px-2 rounded border border-white/10 bg-white/5 text-white/70 flex items-center gap-1 hover:bg-white/10">{density==='compact'?'Comfort':'Compact'}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px]">
        {[
          {label:'Active', value:counts.active, icon:UserCheck, color:'bg-emerald-500/15 mk-text-secondary border-emerald-400/30'},
          {label:'Suspended', value:counts.suspended, icon:UserX, color:'bg-gray-500/15 mk-text-muted border-gray-400/30'},
          {label:'Total', value:counts.total, icon:Users, color:'bg-orange-500/15 mk-text-secondary border-orange-400/30'},
          {label:'Active Tasks', value:counts.activeTasks, icon:Activity, color:'bg-blue-500/15 mk-text-secondary border-blue-400/30'},
        ].map(c => (
          <div key={c.label} className={`p-2 rounded-lg border flex items-center gap-2 ${c.color}`}>
            <c.icon size={16} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wide font-medium">{c.label}</div>
              <div className="text-sm font-semibold tabular-nums">{c.value}</div>
            </div>
          </div>
        ))}
      </div>
      {error && errorBanner}
      <div className="mk-surface-alt backdrop-blur rounded-lg mk-border shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[560px]">
          <table className="min-w-full text-xs">
            <thead className="mk-surface-alt mk-text-secondary sticky top-0">
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
                      className="even:mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/8"
                      layout
                    >
                      <td className={`px-3 ${rowPad} whitespace-nowrap font-medium mk-text-primary`}>{v.name}</td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap tabular-nums flex items-center gap-1`}><Phone size={12} className="mk-text-fainter"/> <span className="mk-text-secondary">{v.phone}</span></td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap mk-text-secondary`}>{v.assignedZones.join(', ')}</td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap tabular-nums mk-text-secondary`}>{v.activeTasks}</td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap`}><span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase ${statusStyles[v.status]}`}>{v.status}</span></td>
                      <td className={`px-3 ${rowPad} whitespace-nowrap flex items-center gap-2 text-[11px]`}> 
                        <button onClick={()=>openAssign(v)} className="mk-text-muted hover:text-orange-500 focus:outline-none" aria-label="Assign zones"><MapPin size={14}/></button>
                        <button onClick={()=>toggleSuspend(v)} className="mk-text-muted hover:text-orange-500 focus:outline-none" aria-label={v.status==='active'?'Suspend volunteer':'Activate volunteer'}>{v.status==='active'?<UserX size={14}/>:<UserCheck size={14}/>}</button>
                        <button onClick={()=>setDetail(v)} className="mk-text-muted hover:text-orange-500 focus:outline-none" aria-label="View details"><ListChecks size={14}/></button>
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
          <div className="space-y-5 text-[11px] mk-text-secondary">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="mk-text-fainter">Phone</span><div className="font-medium flex items-center gap-1 mk-text-primary"><Phone size={12} className="text-orange-400"/> {detail.phone}</div></div>
              <div><span className="mk-text-fainter">Status</span><div className="font-medium capitalize flex items-center gap-1 mk-text-primary">{detail.status==='active'?<UserCheck size={12} className="text-emerald-400"/>:<UserX size={12} className="text-gray-400"/>}{detail.status}</div></div>
              <div className="col-span-2"><span className="mk-text-fainter">Assigned Zones</span><div className="font-medium flex flex-wrap gap-1 mt-1">{detail.assignedZones.length? detail.assignedZones.map(z => <span key={z} className="px-1.5 py-0.5 rounded border text-[10px] bg-orange-500/15 mk-text-secondary border-orange-400/30">{z}</span>): <span className="mk-text-fainter">None</span>}</div></div>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide mk-text-primary mb-2 flex items-center gap-1"><ListChecks size={12} className="text-orange-400"/> Tasks</h4>
              <p className="mk-text-muted">Active tasks: {detail.activeTasks} (placeholder – integrate tasks list)</p>
            </div>
          </div>
        )}
      </Drawer>

      {/* Assign Zone Modal */}
      <Modal open={assignOpen} onClose={()=>setAssignOpen(false)} title="Assign Zones" actions={[
        <button key="cancel" onClick={()=>setAssignOpen(false)} className="px-3 py-1.5 rounded border mk-border mk-surface-alt text-xs mk-text-muted hover:bg-orange-50 dark:hover:bg-white/10">Cancel</button>,
        <button key="save" onClick={saveAssign} className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium flex items-center gap-1 hover:bg-orange-600"><CheckCircle2 size={14}/> Save</button>
      ]}>
        <div className="space-y-3 text-[11px] mk-text-secondary">
          <div className="flex flex-wrap gap-2">
            {zones.map(z => {
              const active = assignZones.includes(z);
              return (
                <button
                  key={z}
                  type="button"
                  onClick={()=>toggleZoneAssign(z)}
                  className={`px-2 py-1 rounded-full border text-[10px] flex items-center gap-1 transition ${active? 'bg-orange-500 text-white border-orange-500 shadow-sm':'mk-surface-alt mk-text-secondary mk-border hover:bg-orange-50 dark:hover:bg-white/10'}`}
                  aria-pressed={active}
                >
                  <MapPin size={12}/> {z}
                </button>
              );
            })}
          </div>
          <div className="text-[10px] mk-text-fainter">Select one or more zones to assign to this volunteer.</div>
        </div>
      </Modal>
    </div>
  );
};

export default Volunteers;
