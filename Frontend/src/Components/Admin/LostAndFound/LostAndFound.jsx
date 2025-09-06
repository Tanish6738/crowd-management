import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { getAllLost, getAllMatches, getAllFound, searchFace } from '../../../Services/api';

// Contracts reference
// LostReport, Match (pending review)

// Theme aware status badge styles
const statusStyles = {
  open:'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-400/30',
  matched:'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-400/30',
  closed:'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/30'
};

const LostAndFound = () => {
  // Tabs: lost | found | matches | search
  const [tab, setTab] = useState('lost');
  const [reports, setReports] = useState([]); // transformed lost people records
  const [foundReports, setFoundReports] = useState([]); // transformed found people records
  const [matches, setMatches] = useState([]); // transformed match records
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('24h');
  const [selectedReport, setSelectedReport] = useState(null);
  const [matchModal, setMatchModal] = useState(null);
  const [showFilters, setShowFilters] = useState(false); // mobile
  const [view, setView] = useState('grid'); // future toggle (grid/list) currently only grid
  // Face search
  const [faceId, setFaceId] = useState('');
  const [faceResult, setFaceResult] = useState(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceError, setFaceError] = useState(null);

  // Data Fetching ----------------------------------------------------------
  const transformLost = (lostRecords, matchMap) => {
    return lostRecords.map(rec => {
      // Derive component-specific status mapping
      const hasMatch = matchMap.has(rec.face_id);
      let uiStatus = 'open';
      if (hasMatch) uiStatus = 'matched';
      if (rec.status === 'found') uiStatus = 'closed';
      return {
        id: rec.face_id,
        person: {
          name: rec.name || 'Unknown',
          age: rec.age ?? '—',
          gender: (rec.gender || 'unknown').toLowerCase(),
          description: rec.where_lost ? `Last seen at ${rec.where_lost}` : 'No description'
        },
        photos: [ 'https://via.placeholder.com/120x120.png?text=Lost' ], // Placeholder (API currently doesn't supply images)
        status: uiStatus,
        lastUpdated: rec.upload_time,
        timeline: [
          'Reported',
          hasMatch && 'Match Found',
          rec.status === 'found' && 'Marked Found'
        ].filter(Boolean)
      };
    });
  };

  const transformFound = (foundRecords) => {
    return foundRecords.map(rec => ({
      id: rec.face_id,
      person: {
        name: rec.name || 'Unknown',
        age: rec.age ?? '—',
        gender: (rec.gender || 'unknown').toLowerCase(),
        description: rec.where_found ? `Found at ${rec.where_found}` : 'No description'
      },
      photos: [ 'https://via.placeholder.com/120x120.png?text=Found' ],
      status: rec.status === 'found' ? 'closed' : 'open',
      lastUpdated: rec.upload_time,
      timeline: [ 'Logged', rec.status === 'found' && 'Closed' ].filter(Boolean)
    }));
  };

  const transformMatches = (records) => {
    return records.map(m => ({
      id: m.match_id,
      lostPersonName: m.lost_person?.name || 'Unknown',
      score: null, // similarity not provided by API
      threshold: null,
      lostPhotoUrl: 'https://via.placeholder.com/150x150.png?text=Lost',
      foundFaceUrl: 'https://via.placeholder.com/150x150.png?text=Found',
      status: m.match_status || 'pending_review'
    }));
  };

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [lostRes, foundRes, matchesRes] = await Promise.all([
        getAllLost(),
        getAllFound(),
        getAllMatches()
      ]);
      const matchMap = new Map();
      (matchesRes.records || []).forEach(m => { if (m.lost_face_id) matchMap.set(m.lost_face_id, true); });
      setMatches(transformMatches(matchesRes.records || []));
      setReports(transformLost(lostRes.records || [], matchMap));
      setFoundReports(transformFound(foundRes.records || []));
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Optional lightweight polling for updates every 60s
  useEffect(() => {
    const iv = setInterval(() => { fetchData(); }, 60000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // Filters ----------------------------------------------------------------
  const filteredReports = useMemo(()=> reports.filter(r => (
    (statusFilter==='all'||r.status===statusFilter) && (
      r.person.name.toLowerCase().includes(search.toLowerCase()) ||
      r.person.description.toLowerCase().includes(search.toLowerCase())
    )
  )), [reports, statusFilter, search]);
  const filteredFound = useMemo(()=> foundReports.filter(r => (
    (statusFilter==='all'||r.status===statusFilter) && (
      r.person.name.toLowerCase().includes(search.toLowerCase()) ||
      r.person.description.toLowerCase().includes(search.toLowerCase())
    )
  )), [foundReports, statusFilter, search]);

  const filteredMatches = useMemo(()=> matches.filter(m => (
    search.trim()==='' || m.lostPersonName.toLowerCase().includes(search.toLowerCase())
  )), [matches, search]);

  const counts = useMemo(()=> ({
    lostTotal: reports.length,
    lostOpen: reports.filter(r=>r.status==='open').length,
    lostMatched: reports.filter(r=>r.status==='matched').length,
    lostClosed: reports.filter(r=>r.status==='closed').length,
    foundTotal: foundReports.length,
    foundOpen: foundReports.filter(r=>r.status==='open').length,
    foundClosed: foundReports.filter(r=>r.status==='closed').length,
    pendingMatches: matches.filter(m=>m.status==='pending_review').length
  }), [reports, foundReports, matches]);

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

  const foundCards = (
    <LayoutGroup>
      <div className="grid [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))] gap-4">
        <AnimatePresence initial={false}>
          {filteredFound.map(r => (
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
              aria-label={`Open found report for ${r.person.name}`}
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
                  {m.score !== null && (
                    <div className="text-[11px] text-gray-600 dark:text-white/60">Similarity: {(m.score*100).toFixed(1)}%</div>
                  )}
                  {m.threshold !== null && (
                    <div className="text-[10px] text-gray-500 dark:text-white/50">Threshold: {(m.threshold*100).toFixed(0)}%</div>
                  )}
                  {m.score === null && (
                    <div className="text-[10px] text-gray-500 dark:text-white/50">Match record</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] mt-auto">
                <span className="px-2 py-0.5 rounded border bg-orange-500/15 text-orange-300 border-orange-400/30 capitalize">{m.status.replace('_',' ')}</span>
                {m.score !== null && <span className="ml-auto text-white/50">Score {(m.score*100).toFixed(0)}%</span>}
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
          <button onClick={()=>setTab('lost')} className={`px-3 py-1.5 rounded-md border flex items-center gap-1 transition ${tab==='lost' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}><Users size={14}/> Lost ({counts.lostTotal})</button>
          <button onClick={()=>setTab('found')} className={`px-3 py-1.5 rounded-md border flex items-center gap-1 transition ${tab==='found' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}><Inbox size={14}/> Found ({counts.foundTotal})</button>
          <button onClick={()=>setTab('matches')} className={`px-3 py-1.5 rounded-md border flex items-center gap-1 transition ${tab==='matches' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}><ListChecks size={14}/> Matches <span className="text-[10px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-400/30">{counts.pendingMatches}</span></button>
          <button onClick={()=>setTab('search')} className={`px-3 py-1.5 rounded-md border flex items-center gap-1 transition ${tab==='search' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}><SearchIcon size={14}/> Search Face</button>
        </div>
        <div className="hidden md:flex items-center gap-2 ml-auto text-xs">
          {['lost','found'].includes(tab) && (
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-white/5 backdrop-blur px-2 text-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500">
              {['all','open','matched','closed'].map(s=> <option key={s} className="bg-gray-900" value={s}>{s==='all'?'All Statuses':s}</option>)}
            </select>
          )}
          <div className="relative">
            <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tab==='matches'? 'Search lost person':'Search name / desc'} className="h-9 w-40 sm:w-56 pl-7 pr-2 rounded-md border border-white/10 bg-white/5 text-xs text-white/80 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
      {tab==='lost' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
          {[
            {k:'open', label:'Open', val:counts.lostOpen, style:'bg-orange-500/15 text-orange-300 border-orange-400/30'},
            {k:'matched', label:'Matched', val:counts.lostMatched, style:'bg-blue-500/15 text-blue-300 border-blue-400/30'},
            {k:'closed', label:'Closed', val:counts.lostClosed, style:'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'},
            {k:'lostTotal', label:'Total', val:counts.lostTotal, style:'bg-white/5 text-white/70 border-white/10'},
            {k:'pendingMatches', label:'Pending Matches', val:counts.pendingMatches, style:'bg-orange-500/10 text-orange-300 border-orange-400/30'},
          ].map(c => (
            <button key={c.k} onClick={()=> ['open','matched','closed'].includes(c.k) && setStatusFilter(c.k)} className={`p-2 rounded-lg border flex flex-col items-start gap-1 text-left transition ${c.style} ${statusFilter===c.k? 'ring-2 ring-orange-500/50':''}`} aria-label={`${c.label} count`}>
              <span className="text-[10px] uppercase tracking-wide font-medium">{c.label}</span>
              <span className="text-sm font-semibold tabular-nums">{c.val}</span>
            </button>
          ))}
        </div>
      )}
      {tab==='found' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          {[
            {k:'open', label:'Open', val:counts.foundOpen, style:'bg-orange-500/15 text-orange-300 border-orange-400/30'},
            {k:'closed', label:'Closed', val:counts.foundClosed, style:'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'},
            {k:'foundTotal', label:'Total', val:counts.foundTotal, style:'bg-white/5 text-white/70 border-white/10'},
            {k:'pendingMatches', label:'Pending Matches', val:counts.pendingMatches, style:'bg-orange-500/10 text-orange-300 border-orange-400/30'},
          ].map(c => (
            <button key={c.k} onClick={()=> ['open','closed'].includes(c.k) && setStatusFilter(c.k)} className={`p-2 rounded-lg border flex flex-col items-start gap-1 text-left transition ${c.style} ${statusFilter===c.k? 'ring-2 ring-orange-500/50':''}`} aria-label={`${c.label} count`}>
              <span className="text-[10px] uppercase tracking-wide font-medium">{c.label}</span>
              <span className="text-sm font-semibold tabular-nums">{c.val}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-300 text-sm flex items-center justify-between rounded border border-red-500/30">
          <span>Error loading data: {error}</span>
          <button onClick={fetchData} className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-500">Retry</button>
        </div>
      )}
      {tab==='search' && (
        <div className="mk-surface-alt backdrop-blur border mk-border rounded-lg p-4 space-y-4 text-xs text-white/70">
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={faceId} onChange={e=>setFaceId(e.target.value)} placeholder="Enter face ID" className="flex-1 h-9 rounded-md border border-white/10 bg-white/5 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-white/80 placeholder:text-white/40" />
            <button disabled={!faceId || faceLoading} onClick={async ()=>{
              setFaceLoading(true); setFaceError(null); setFaceResult(null);
              try { const res = await searchFace(faceId.trim()); setFaceResult(res); }
              catch(e){ setFaceError(e.message||'Search failed'); }
              finally { setFaceLoading(false); }
            }} className={`h-9 px-4 rounded-md text-xs font-semibold flex items-center gap-2 border transition ${faceId? 'bg-orange-500 text-white border-orange-500 hover:brightness-110':'bg-white/5 text-white/40 border-white/10'}`}>{faceLoading? 'Searching…':'Search'}</button>
          </div>
          {faceError && <div className="p-2 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-[11px] flex items-center gap-2"><AlertCircle size={14}/> {faceError}</div>}
          {faceResult && (
            <pre className="max-h-80 overflow-auto text-[10px] bg-black/30 border border-white/10 rounded p-3 text-white/70 whitespace-pre-wrap">{JSON.stringify(faceResult, null, 2)}</pre>
          )}
          {!faceResult && !faceError && !faceLoading && <div className="text-white/40 text-[11px]">Enter a face ID to view potential matches.</div>}
        </div>
      )}
      {tab!=='search' && (
        loading ? loadingCards : (
          tab==='lost' ? (filteredReports.length===0 ? emptyState : reportCards)
          : tab==='found' ? (filteredFound.length===0 ? <div className="p-10 text-sm text-white/60 text-center border border-dashed border-white/15 rounded-lg bg-white/5 backdrop-blur flex flex-col gap-3 items-center"><Inbox size={40} className="text-orange-400"/>No found reports.</div> : foundCards)
          : (filteredMatches.length===0 ? <div className="p-10 text-sm text-white/60 text-center border border-dashed border-white/15 rounded-lg bg-white/5 backdrop-blur flex flex-col gap-3 items-center"><Inbox size={40} className="text-orange-400"/>No match records.</div> : matchCards)
        )
      )}

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
      <Modal open={!!matchModal} onClose={()=>setMatchModal(null)} title={matchModal ? 'Match: '+matchModal.lostPersonName : ''} actions={[
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
              {matchModal.score !== null && (
                <>
                  <div><span className="text-white/50">Similarity Score:</span> {(matchModal.score*100).toFixed(1)}%</div>
                  <div><span className="text-white/50">Threshold:</span> {(matchModal.threshold*100).toFixed(0)}%</div>
                  <div className="h-2 rounded bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-400 to-orange-600" style={{ width: Math.min(100, matchModal.score*100)+'%' }} /></div>
                </>
              )}
              {matchModal.score === null && (
                <div className="text-white/50 italic">No similarity metrics provided by API.</div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LostAndFound;
