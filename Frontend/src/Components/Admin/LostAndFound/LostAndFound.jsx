import React, { useEffect, useState, useMemo } from 'react';
import Modal from '../../General/Modal';
import Drawer from '../../General/Drawer';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Search as SearchIcon,
  Filter,
  UserSearch,
  Users,
  Image as ImageIcon,
  Clock,
  PackageSearch,
  Inbox,
  ListChecks,
  CheckCircle2,
  X as XIcon,
  Sparkles,
  Plus,
  AlertCircle
} from 'lucide-react';

// Contracts reference
// LostReport, Match (pending review)

// Theme aware status badge styles
const statusStyles = {
  open:'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-400/30',
  matched:'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-400/30',
  closed:'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/30'
};

const LostAndFound = () => {
  const [tab, setTab] = useState('reports'); // reports | matches
  const [reports, setReports] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('24h');
  const [selectedReport, setSelectedReport] = useState(null);
  const [matchModal, setMatchModal] = useState(null);
  const [showFilters, setShowFilters] = useState(false); // mobile
  const [view, setView] = useState('grid'); // future toggle (grid/list) currently only grid

  // Fetch simulated --------------------------------------------------------
  useEffect(() => {
    setLoading(true); setError(null);
    setTimeout(() => {
      const repSeed = Array.from({ length: 12 }).map((_,i)=> ({
        id:'r'+(i+1),
        person:{ name:'Person '+(i+1), age: 10 + i, gender:['male','female','other'][i%3], description:'Wearing color '+['red','blue','green','white'][i%4] },
        photos:['https://via.placeholder.com/120x120.png?text=P'+(i+1)],
        status:['open','matched','closed'][i%3],
        lastUpdated:new Date(Date.now()-i*3600000).toISOString(),
        timeline:[ 'Reported', 'Photos Added', i%3!==0 && 'Match Found', i%3===2 && 'Closed' ].filter(Boolean)
      }));
      const matchSeed = Array.from({ length: 5 }).map((_,i)=> ({
        id:'m'+(i+1),
        lostPersonName:'Person '+(i+2),
        score: 0.65 + (i*0.05),
        threshold:0.75,
        lostPhotoUrl:'https://via.placeholder.com/150x150.png?text=Lost'+(i+1),
        foundFaceUrl:'https://via.placeholder.com/150x150.png?text=Found'+(i+1),
        status:'pending_review'
      }));
      setReports(repSeed); setMatches(matchSeed); setLoading(false);
    }, 600);
  }, []);

  // WS simulation for new matches -----------------------------------------
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setMatches(prev => [{
        id:'m'+Date.now(),
        lostPersonName:'Person '+Math.ceil(Math.random()*20),
        score: 0.5 + Math.random()*0.5,
        threshold:0.75,
        lostPhotoUrl:'https://via.placeholder.com/150x150.png?text=Lost',
        foundFaceUrl:'https://via.placeholder.com/150x150.png?text=Found',
        status:'pending_review'
      }, ...prev]);
    }, 30000);
    return () => clearInterval(iv);
  }, [loading]);

  // Filters ----------------------------------------------------------------
  const filteredReports = useMemo(()=> reports.filter(r => (
    (statusFilter==='all'||r.status===statusFilter) && (
      r.person.name.toLowerCase().includes(search.toLowerCase()) ||
      r.person.description.toLowerCase().includes(search.toLowerCase())
    )
  )), [reports, statusFilter, search]);

  const filteredMatches = useMemo(()=> matches.filter(m => (
    search.trim()==='' || m.lostPersonName.toLowerCase().includes(search.toLowerCase())
  )), [matches, search]);

  const counts = useMemo(()=> ({
    total: reports.length,
    open: reports.filter(r=>r.status==='open').length,
    matched: reports.filter(r=>r.status==='matched').length,
    closed: reports.filter(r=>r.status==='closed').length,
    pendingMatches: matches.filter(m=>m.status==='pending_review').length
  }), [reports, matches]);

  // States rendering helpers ----------------------------------------------
  const loadingCards = <div className="grid [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))] gap-4">{Array.from({length:8}).map((_,i)=>(<div key={i} className="h-48 rounded-lg bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse"/>))}</div>;
  const emptyState = <div className="p-10 text-sm mk-text-muted text-center border border-dashed mk-border rounded-lg mk-surface-alt backdrop-blur flex flex-col gap-3 items-center"><PackageSearch size={40} className="text-orange-600 dark:text-orange-400"/>No lost reports found.</div>;
  const errorBanner = <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-300 text-sm flex items-center justify-between rounded border border-red-500/30">Error loading data <button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-500">Retry</button></div>;

  // Cards ------------------------------------------------------------------
  const reportCards = (
    <LayoutGroup>
      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))] gap-4">
        <AnimatePresence initial={false}>
          {filteredReports.map(r => (
            <motion.button
              key={r.id}
              layout
              initial={{opacity:0, y:16}}
              animate={{opacity:1, y:0}}
              exit={{opacity:0, y:-10}}
              whileHover={{y:-4}}
              whileTap={{scale:0.97}}
              onClick={()=>setSelectedReport(r)}
              className="relative mk-surface-alt backdrop-blur border mk-border rounded-lg p-3 flex flex-col gap-2 text-left shadow-sm hover:border-orange-400/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 hover:bg-black/5 dark:hover:bg-white/7"
              aria-label={`Open lost report for ${r.person.name}`}
            >
              <div className="flex items-start gap-2">
                <div className="relative">
                  <img src={r.photos[0]} alt={r.person.name+' photo'} className="w-16 h-16 rounded object-cover" loading="lazy" />
                  <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow border border-gray-200"><ImageIcon size={12} className="text-orange-600"/></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 dark:text-white/90 truncate flex items-center gap-1"><UserSearch size={14} className="text-orange-600 dark:text-orange-400"/> {r.person.name}</div>
                  <div className="text-[11px] text-gray-600 dark:text-white/60">{r.person.age} yrs • {r.person.gender}</div>
                  <div className="text-[11px] text-gray-500 dark:text-white/50 line-clamp-2">{r.person.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] mt-auto">
                <span className={`px-2 py-0.5 rounded border uppercase ${statusStyles[r.status]}`}>{r.status}</span>
                <span className="ml-auto text-gray-500 dark:text-white/50 inline-flex items-center gap-1"><Clock size={11}/> {new Date(r.lastUpdated).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
              <motion.span layoutId={`bar-${r.id}`} className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-r" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );

  const matchCards = (
    <LayoutGroup>
      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))] gap-4">
        <AnimatePresence initial={false}>
          {filteredMatches.map(m => (
            <motion.button
              key={m.id}
              layout
              initial={{opacity:0, y:16}}
              animate={{opacity:1, y:0}}
              exit={{opacity:0, y:-10}}
              whileHover={{y:-4}}
              whileTap={{scale:0.97}}
              onClick={()=>setMatchModal(m)}
              className="relative mk-surface-alt backdrop-blur border mk-border rounded-lg p-3 flex flex-col gap-2 text-left shadow-sm hover:border-orange-400/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 hover:bg-black/5 dark:hover:bg-white/7"
              aria-label={`Open match review for ${m.lostPersonName}`}
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <img src={m.lostPhotoUrl} alt={m.lostPersonName+' lost'} className="w-16 h-16 rounded object-cover" loading="lazy" />
                  <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow border border-gray-200"><UserSearch size={12} className="text-orange-600"/></span>
                </div>
                <div className="relative">
                  <img src={m.foundFaceUrl} alt={m.lostPersonName+' found'} className="w-16 h-16 rounded object-cover" loading="lazy" />
                  <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow border border-gray-200"><Sparkles size={12} className="text-orange-600"/></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-800 dark:text-white/90 truncate">{m.lostPersonName}</div>
                  <div className="text-[11px] text-gray-600 dark:text-white/60">Similarity: {(m.score*100).toFixed(1)}%</div>
                  <div className="text-[10px] text-gray-500 dark:text-white/50">Threshold: {(m.threshold*100).toFixed(0)}%</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] mt-auto">
                <span className="px-2 py-0.5 rounded border bg-orange-500/15 text-orange-300 border-orange-400/30">Pending</span>
                <span className="ml-auto text-white/50">Score {(m.score*100).toFixed(0)}%</span>
              </div>
              <motion.span layoutId={`bar-${m.id}`} className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-orange-400 to-orange-600 rounded-r" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );

  return (
    <div className="space-y-6" aria-label="Lost and Found">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2"><UserSearch size={18} className="text-orange-400"/> Lost & Found</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <button onClick={()=>setTab('reports')} className={`px-3 py-1.5 rounded-md border flex items-center gap-1 transition ${tab==='reports' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}><Users size={14}/> Reports</button>
          <button onClick={()=>setTab('matches')} className={`px-3 py-1.5 rounded-md border flex items-center gap-1 transition ${tab==='matches' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}><ListChecks size={14}/> Matches <span className="text-[10px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-400/30">{counts.pendingMatches}</span></button>
        </div>
        <div className="hidden md:flex items-center gap-2 ml-auto text-xs">
          {tab==='reports' && (
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 backdrop-blur px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500">
              {['all','open','matched','closed'].map(s=> <option key={s} className="bg-gray-900" value={s}>{s==='all'?'All Statuses':s}</option>)}
            </select>
          )}
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==='reports'? 'Search name / desc':'Search name'} className="h-9 w-40 sm:w-56 pl-7 pr-2 rounded-md border border-white/10 bg-white/5 text-xs text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <select value={dateRange} onChange={e=>setDateRange(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 backdrop-blur px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500">
            {['24h','48h','7d','30d'].map(r => <option key={r} className="bg-gray-900" value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex md:hidden ml-auto">
          <button onClick={()=>setShowFilters(f=>!f)} className={`h-9 px-3 rounded-md border text-xs flex items-center gap-1 transition ${showFilters? 'bg-orange-500 text-white border-orange-500':'bg-white/5 border-white/10 text-white/70'}`}><Filter size={14}/> Filters</button>
        </div>
      </div>

      {/* Mobile Filters */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="md:hidden bg-white/5 backdrop-blur rounded-lg border border-white/10 p-3 space-y-3 text-xs text-white/70">
            {tab==='reports' && (
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-white/5 text-white/80 px-2">{['all','open','matched','closed'].map(s=> <option key={s} className="bg-gray-900" value={s}>{s==='all'?'All Statuses':s}</option>)}</select>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="h-8 w-full pl-7 pr-2 rounded border border-white/10 bg-white/5 text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <select value={dateRange} onChange={e=>setDateRange(e.target.value)} className="h-8 rounded border border-white/10 bg-white/5 text-white/80 px-2">{['24h','48h','7d','30d'].map(r=> <option key={r} className="bg-gray-900" value={r}>{r}</option>)}</select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Summary (reports) */}
      {tab==='reports' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
          {[
            {k:'open', label:'Open', val:counts.open, style:'bg-orange-500/15 text-orange-300 border-orange-400/30'},
            {k:'matched', label:'Matched', val:counts.matched, style:'bg-blue-500/15 text-blue-300 border-blue-400/30'},
            {k:'closed', label:'Closed', val:counts.closed, style:'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'},
            {k:'total', label:'Total', val:counts.total, style:'bg-white/5 text-white/70 border-white/10'},
            {k:'pendingMatches', label:'Pending Matches', val:counts.pendingMatches, style:'bg-orange-500/10 text-orange-300 border-orange-400/30'},
          ].map(c => (
            <button key={c.k} onClick={()=> ['open','matched','closed'].includes(c.k) && setStatusFilter(c.k)} className={`p-2 rounded-lg border flex flex-col items-start gap-1 text-left transition ${c.style} ${statusFilter===c.k? 'ring-2 ring-orange-500/50':''}`} aria-label={`${c.label} count`}>
              <span className="text-[10px] uppercase tracking-wide font-medium">{c.label}</span>
              <span className="text-sm font-semibold tabular-nums">{c.val}</span>
            </button>
          ))}
        </div>
      )}

      {error && errorBanner}
  {loading ? loadingCards : (tab==='reports' ? (filteredReports.length===0 ? emptyState : reportCards) : (filteredMatches.length===0 ? <div className="p-10 text-sm text-white/60 text-center border border-dashed border-white/15 rounded-lg bg-white/5 backdrop-blur flex flex-col gap-3 items-center"><Inbox size={40} className="text-orange-400"/>No matches pending.</div> : matchCards))}

      {/* Report Detail Drawer */}
      <Drawer open={!!selectedReport} onClose={()=>setSelectedReport(null)} title={selectedReport ? selectedReport.person.name : ''}>
        {selectedReport && (
          <div className="space-y-5 text-[11px] text-white/70">
            <div className="flex gap-3 flex-wrap">
              {selectedReport.photos.map(p => <img key={p} src={p} alt="report photo" className="w-24 h-24 rounded object-cover border border-white/10" />)}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-white/50">Age</span><div className="font-medium text-white/80">{selectedReport.person.age}</div></div>
              <div><span className="text-white/50">Gender</span><div className="font-medium capitalize text-white/80">{selectedReport.person.gender}</div></div>
              <div className="col-span-2"><span className="text-white/50">Description</span><div className="font-medium leading-snug text-white/80">{selectedReport.person.description}</div></div>
              <div className="col-span-2"><span className="text-white/50">Status</span><div className={`inline-flex items-center px-2 py-0.5 rounded border mt-1 text-[10px] uppercase ${statusStyles[selectedReport.status]}`}>{selectedReport.status}</div></div>
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-white/80 mb-2 uppercase tracking-wide">Timeline</h4>
              <ol className="text-[11px] list-disc pl-4 space-y-1 text-white/60">
                {selectedReport.timeline.map((t,i)=>(<li key={i}>{t}</li>))}
              </ol>
            </div>
          </div>
        )}
      </Drawer>

      {/* Match Review Modal */}
      <Modal open={!!matchModal} onClose={()=>setMatchModal(null)} title={matchModal ? 'Review Match: '+matchModal.lostPersonName : ''} actions={[
        <button key="reject" onClick={()=>{ setMatches(m=>m.map(mm=>mm.id===matchModal.id?{...mm,status:'rejected'}:mm)); setMatchModal(null); }} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs hover:bg-red-700 flex items-center gap-1"><XIcon size={14}/> Reject</button>,
        <button key="confirm" onClick={()=>{ setMatches(m=>m.map(mm=>mm.id===matchModal.id?{...mm,status:'confirmed'}:mm)); setMatchModal(null); }} className="px-3 py-1.5 rounded bg-green-600 text-white text-xs hover:bg-green-700 flex items-center gap-1"><CheckCircle2 size={14}/> Confirm</button>,
        <button key="close" onClick={()=>setMatchModal(null)} className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs hover:bg-gray-50">Close</button>
      ]}>
        {matchModal && (
          <div className="grid sm:grid-cols-2 gap-4 text-[11px] text-white/70">
            <div className="space-y-2">
              <img src={matchModal.lostPhotoUrl} alt="Lost Person" className="w-full rounded object-cover border border-white/10" />
              <div className="text-white/60 flex items-center gap-1"><UserSearch size={12} className="text-orange-400"/> Lost Person</div>
            </div>
            <div className="space-y-2">
              <img src={matchModal.foundFaceUrl} alt="Found Face" className="w-full rounded object-cover border border-white/10" />
              <div className="text-white/60 flex items-center gap-1"><Sparkles size={12} className="text-orange-400"/> Found Face</div>
            </div>
            <div className="col-span-2 text-white/70 space-y-1">
              <div><span className="text-white/50">Similarity Score:</span> {(matchModal.score*100).toFixed(1)}%</div>
              <div><span className="text-white/50">Threshold:</span> {(matchModal.threshold*100).toFixed(0)}%</div>
              <div className="h-2 rounded bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-400 to-orange-600" style={{ width: Math.min(100, matchModal.score*100)+'%' }} /></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LostAndFound;
