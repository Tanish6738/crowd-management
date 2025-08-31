import React, { useEffect, useState, useMemo } from 'react';
import Modal from '../../General/Modal';
import Drawer from '../../General/Drawer';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  ClipboardList,
  Search as SearchIcon,
  Filter,
  MapPin,
  User as UserIcon,
  CheckCircle2,
  Play,
  X as XIcon,
  Clock,
  Plus,
  ListChecks,
  Inbox
} from 'lucide-react';

// type Task = { id:string; title:string; zoneName:string; volunteerName:string; status:'pending'|'in_progress'|'done'|'cancelled'; createdAt:string; ackAt?:string; doneAt?:string; evidenceCount?:number };

const statusStyles = {
  pending: 'bg-orange-500/15 text-orange-300 border-orange-400/30',
  in_progress: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
  done: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  cancelled: 'bg-gray-500/15 text-gray-300 border-gray-400/30'
};

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [volFilter, setVolFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [detailTask, setDetailTask] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title:'', zone:'Gate A', volunteer:'Volunteer 1', notes:'' });
  const [view, setView] = useState('grid'); // grid | list
  const [showFilters, setShowFilters] = useState(false);

  // Fetch simulation -------------------------------------------------------
  useEffect(() => {
    setLoading(true); setError(null);
    const t = setTimeout(() => {
      const seed = Array.from({length:18}).map((_,i)=> ({
        id:'t'+(i+1),
        title:'Patrol Zone '+(['A','B','C','D','E'][i%5]),
        zoneName:['Gate A','Riverbank','Transit Hub','Food Court'][i%4],
        volunteerName:['Volunteer 1','Volunteer 2','Volunteer 3'][i%3],
        status:['pending','in_progress','done','pending','cancelled'][i%5],
        createdAt:new Date(Date.now()-i*3600000).toISOString(),
        ackAt: i%5>1 ? new Date(Date.now() - (i*3600000) + 600000).toISOString() : undefined,
        doneAt: ['done'].includes(['pending','in_progress','done','pending','cancelled'][i%5]) ? new Date(Date.now() - (i*3600000) + 7200000).toISOString() : undefined,
        evidenceCount: i%4===0 ? Math.floor(Math.random()*5) : 0,
      }));
      setTasks(seed); setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // WebSocket simulation for updates --------------------------------------
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setTasks(prev => prev.map(tsk => Math.random()<0.05 && tsk.status==='pending' ? { ...tsk, status:'in_progress', ackAt:new Date().toISOString() } : tsk));
    }, 15000);
    return () => clearInterval(iv);
  }, [loading]);

  const zones = useMemo(()=> ['all', ...Array.from(new Set(tasks.map(t=>t.zoneName)))], [tasks]);
  const volunteers = useMemo(()=> ['all', ...Array.from(new Set(tasks.map(t=>t.volunteerName)))], [tasks]);

  const filtered = tasks.filter(t => (
    (statusFilter==='all'||t.status===statusFilter) &&
    (zoneFilter==='all'||t.zoneName===zoneFilter) &&
    (volFilter==='all'||t.volunteerName===volFilter) &&
    (search.trim()==='' || t.title.toLowerCase().includes(search.toLowerCase()) || t.zoneName.toLowerCase().includes(search.toLowerCase()))
  ));

  // Summary counts --------------------------------------------------------
  const counts = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t=>t.status==='pending').length,
    in_progress: tasks.filter(t=>t.status==='in_progress').length,
    done: tasks.filter(t=>t.status==='done').length,
    cancelled: tasks.filter(t=>t.status==='cancelled').length,
  }), [tasks]);

  const loadingCards = (
    <div className="grid [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {Array.from({length:8}).map((_,i)=>(<div key={i} className="h-40 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse"/>))}
    </div>
  );
  const emptyState = (
    <div className="p-10 text-sm text-white/60 text-center border border-dashed border-white/15 rounded-lg bg-white/5 backdrop-blur flex flex-col items-center gap-3">
      <Inbox className="text-orange-400" size={36} />
      <p>No tasks match your filters.</p>
      <button onClick={()=>setCreateOpen(true)} className="px-3 py-1.5 rounded-md bg-orange-500 text-white text-xs font-medium flex items-center gap-1 hover:bg-orange-600"><Plus size={14}/> Create Task</button>
    </div>
  );
  const errorBanner = <div className="p-4 bg-red-500/10 text-red-300 text-sm flex items-center justify-between rounded border border-red-500/30">Error loading tasks <button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-500">Retry</button></div>;

  const cardGrid = (
    <LayoutGroup>
      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] gap-4">
        <AnimatePresence initial={false}>
          {filtered.map(t => (
            <motion.button
              key={t.id}
              layout
              initial={{opacity:0, y:16}}
              animate={{opacity:1, y:0}}
              exit={{opacity:0, y:-10}}
              whileHover={{y:-4}}
              whileTap={{scale:0.97}}
              onClick={()=>setDetailTask(t)}
              className="relative bg-white/5 backdrop-blur border border-white/10 rounded-lg p-3 flex flex-col gap-2 text-left shadow-sm hover:bg-white/7 hover:border-orange-400/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              aria-label={`Open task ${t.title}`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white/90 truncate flex items-center gap-1"><ClipboardList size={14} className="text-orange-400"/> {t.title}</div>
                  <div className="text-[11px] text-white/60 flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 flex items-center gap-1 text-white/70"><MapPin size={11}/> {t.zoneName}</span>
                    <span className="flex items-center gap-1 text-white/60"><UserIcon size={11}/> {t.volunteerName}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded border text-[10px] uppercase whitespace-nowrap ${statusStyles[t.status]}`}>{t.status.replace('_',' ')}</span>
              </div>
              <div className="mt-auto flex items-center justify-between text-[10px] text-white/50">
                <span className="inline-flex items-center gap-1"><Clock size={11}/> {new Date(t.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                {t.evidenceCount ? <span className="text-orange-300 font-medium">Ev: {t.evidenceCount}</span> : null}
              </div>
              <motion.span layoutId={`bar-${t.id}`} className="absolute left-0 top-0 h-full w-0.5 rounded-r bg-gradient-to-b from-orange-400 to-orange-600" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );

  const tableList = (
    <div className="overflow-x-auto border border-white/10 rounded-lg bg-white/5 backdrop-blur shadow-sm">
      <table className="min-w-full text-xs">
        <thead className="bg-white/5 text-white/70 sticky top-0">
          <tr>
            {['Task','Zone','Volunteer','Status','Created','Evidence'].map(h => (
              <th key={h} className="px-3 py-2 font-medium text-[10px] uppercase tracking-wide text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {filtered.map(t => (
              <motion.tr
                key={t.id}
                initial={{opacity:0, y:8}}
                animate={{opacity:1, y:0}}
                exit={{opacity:0, y:-6}}
                className="even:bg-white/5 hover:bg-white/8 cursor-pointer"
                onClick={()=>setDetailTask(t)}
              >
                <td className="px-3 py-2 whitespace-nowrap font-medium text-white/85">{t.title}</td>
                <td className="px-3 py-2 whitespace-nowrap text-white/70">{t.zoneName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-white/70">{t.volunteerName}</td>
                <td className="px-3 py-2 whitespace-nowrap"><span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase ${statusStyles[t.status]}`}>{t.status.replace('_',' ')}</span></td>
                <td className="px-3 py-2 whitespace-nowrap text-white/60">{new Date(t.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                <td className="px-3 py-2 whitespace-nowrap text-white/60">{t.evidenceCount || '-'}</td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );

  // Create task submit -----------------------------------------------------
  const submitTask = (e) => {
    e.preventDefault();
    const newTask = {
      id:'t'+Date.now(),
      title:form.title,
      zoneName:form.zone,
      volunteerName:form.volunteer,
      status:'pending',
      createdAt:new Date().toISOString(),
      evidenceCount:0,
    };
    setTasks(t => [newTask, ...t]);
    setCreateOpen(false);
    setForm({ title:'', zone:'Gate A', volunteer:'Volunteer 1', notes:'' });
  };

  const updateTaskStatus = (taskId, next) => {
    setTasks(prev => prev.map(t => t.id===taskId ? { ...t, status:next, doneAt: next==='done'? new Date().toISOString() : t.doneAt, ackAt: next==='in_progress' ? new Date().toISOString() : t.ackAt } : t));
  };

  return (
    <div className="space-y-6" aria-label="Tasks">
      {/* Header & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2"><ListChecks size={18} className="text-orange-400"/> Tasks <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 text-[10px] border border-orange-400/30">{counts.total}</span></h2>
        <div className="hidden md:flex gap-2 text-xs">
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            {['all','pending','in_progress','done','cancelled'].map(s => <option key={s} value={s} className="bg-gray-900">{s==='all' ? 'All Statuses' : s.replace('_',' ')}</option>)}
          </select>
          <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            {zones.map(z => <option key={z} value={z} className="bg-gray-900">{z==='all' ? 'All Zones' : z}</option>)}
          </select>
            <select value={volFilter} onChange={e=>setVolFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            {volunteers.map(v => <option key={v} value={v} className="bg-gray-900">{v==='all' ? 'All Volunteers' : v}</option>)}
          </select>
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-9 w-40 sm:w-56 pl-7 pr-2 rounded-md border border-white/10 bg-white/5 text-xs text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          </div>
        </div>
        <div className="flex md:hidden ml-auto">
          <button onClick={()=>setShowFilters(s=>!s)} className={`h-9 px-3 rounded-md border text-xs flex items-center gap-1 transition ${showFilters? 'bg-orange-500 text-white border-orange-500':'bg-white/5 border-white/10 text-white/70'}`}><Filter size={14}/> Filters</button>
        </div>
        <div className="flex gap-2 ml-auto">
          <div className="flex gap-1 border border-white/10 rounded-md overflow-hidden text-xs bg-white/5">
            <button onClick={()=>setView('grid')} className={`px-2 py-1 transition ${view==='grid'? 'bg-orange-500 text-white':'text-white/70 hover:bg-white/10'}`}>Grid</button>
            <button onClick={()=>setView('list')} className={`px-2 py-1 transition ${view==='list'? 'bg-orange-500 text-white':'text-white/70 hover:bg-white/10'}`}>List</button>
          </div>
          <button onClick={()=>setCreateOpen(true)} className="px-3 py-1.5 rounded-md bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 flex items-center gap-1"><Plus size={14}/> <span className="hidden sm:inline">Create Task</span></button>
        </div>
      </div>

      {/* Mobile Filters */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="md:hidden bg-white/5 backdrop-blur rounded-lg border border-white/10 p-3 space-y-3 text-xs text-white/70">
            <div className="flex gap-2">
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="flex-1 h-8 rounded border border-white/10 bg-white/5 px-2">
                {['all','pending','in_progress','done','cancelled'].map(s => <option key={s} value={s} className="bg-gray-900">{s==='all' ? 'All Statuses' : s.replace('_',' ')}</option>)}
              </select>
              <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="flex-1 h-8 rounded border border-white/10 bg-white/5 px-2">
                {zones.map(z => <option key={z} value={z} className="bg-gray-900">{z==='all' ? 'All Zones' : z}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <select value={volFilter} onChange={e=>setVolFilter(e.target.value)} className="flex-1 h-8 rounded border border-white/10 bg-white/5 px-2">
                {volunteers.map(v => <option key={v} value={v} className="bg-gray-900">{v==='all' ? 'All Volunteers' : v}</option>)}
              </select>
              <div className="relative flex-1">
                <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-8 w-full pl-7 pr-2 rounded border border-white/10 bg-white/5 text-white/80 placeholder:text-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Summary */}
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
        {[
      {k:'pending', label:'Pending', color:'bg-orange-500/15 text-orange-300 border-orange-400/30', val:counts.pending},
      {k:'in_progress', label:'In Progress', color:'bg-blue-500/15 text-blue-300 border-blue-400/30', val:counts.in_progress},
      {k:'done', label:'Done', color:'bg-emerald-500/15 text-emerald-300 border-emerald-400/30', val:counts.done},
      {k:'cancelled', label:'Cancelled', color:'bg-gray-500/15 text-gray-300 border-gray-400/30', val:counts.cancelled},
      {k:'total', label:'Total', color:'bg-white/5 text-white/70 border-white/10', val:counts.total},
        ].map(c => (
      <button key={c.k} onClick={()=> c.k!=='total' && setStatusFilter(c.k)} className={`p-2 rounded-lg border flex flex-col items-start gap-1 text-left transition ${c.color} ${statusFilter===c.k? 'ring-2 ring-orange-500/50':''}`} aria-label={`${c.label} count`}>
            <span className="text-[10px] uppercase tracking-wide font-medium">{c.label}</span>
            <span className="text-sm font-semibold tabular-nums">{c.val}</span>
          </button>
        ))}
      </div>

      {error && errorBanner}
      {loading ? loadingCards : (filtered.length===0 ? emptyState : (view==='grid' ? cardGrid : tableList))}

      {/* Detail Drawer */}
      <Drawer open={!!detailTask} onClose={()=>setDetailTask(null)} title={detailTask ? detailTask.title : ''}>
        {detailTask && (
          <div className="space-y-5 text-[11px] text-white/70">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-white/50">Zone</span><div className="font-medium text-white/80">{detailTask.zoneName}</div></div>
              <div><span className="text-white/50">Volunteer</span><div className="font-medium text-white/80">{detailTask.volunteerName}</div></div>
              <div><span className="text-white/50">Status</span><div className="font-medium uppercase text-white/80">{detailTask.status.replace('_',' ')}</div></div>
              <div><span className="text-white/50">Created</span><div className="font-medium text-white/80">{new Date(detailTask.createdAt).toLocaleTimeString()}</div></div>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-white/80 mb-2 uppercase tracking-wide">Timeline</h4>
              <ol className="list-disc pl-4 space-y-1 text-white/60">
                <li>Created: {new Date(detailTask.createdAt).toLocaleTimeString()}</li>
                {detailTask.ackAt && <li>Acknowledged: {new Date(detailTask.ackAt).toLocaleTimeString()}</li>}
                {detailTask.doneAt && <li>Done: {new Date(detailTask.doneAt).toLocaleTimeString()}</li>}
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              {detailTask.status!=='in_progress' && detailTask.status!=='done' && <button onClick={()=>updateTaskStatus(detailTask.id,'in_progress')} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-500 flex items-center gap-1"><Play size={14}/> Start</button>}
              {detailTask.status!=='done' && <button onClick={()=>updateTaskStatus(detailTask.id,'done')} className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-500 flex items-center gap-1"><CheckCircle2 size={14}/> Done</button>}
              {detailTask.status!=='cancelled' && <button onClick={()=>updateTaskStatus(detailTask.id,'cancelled')} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs hover:bg-red-500 flex items-center gap-1"><XIcon size={14}/> Cancel</button>}
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Task Modal */}
      <Modal open={createOpen} onClose={()=>setCreateOpen(false)} title="Create Task" actions={[
        <button key="cancel" onClick={()=>setCreateOpen(false)} className="px-3 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10">Cancel</button>,
        <button key="save" onClick={submitTask} className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium hover:bg-orange-600 flex items-center gap-1"><Plus size={14}/> Create</button>
      ]}>
        <form onSubmit={submitTask} className="space-y-4 text-[11px] text-white/70">
          <div>
            <label className="block font-medium mb-1 text-white/80">Title</label>
            <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="w-full h-8 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-white/40" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block font-medium mb-1 text-white/80">Zone</label>
              <select value={form.zone} onChange={e=>setForm(f=>({...f,zone:e.target.value}))} className="w-full h-8 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                {zones.filter(z=>z!=='all').map(z => <option key={z} className="bg-gray-900">{z}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block font-medium mb-1 text-white/80">Volunteer</label>
              <select value={form.volunteer} onChange={e=>setForm(f=>({...f,volunteer:e.target.value}))} className="w-full h-8 rounded-md border border-white/10 bg-white/5 px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50">
                {volunteers.filter(v=>v!=='all').map(v => <option key={v} className="bg-gray-900">{v}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block font-medium mb-1 text-white/80">Notes</label>
              <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 h-20 resize-none text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-white/40" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tasks;
