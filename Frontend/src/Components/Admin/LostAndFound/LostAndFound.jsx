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
import { getAllLost, getAllMatches, getAllFound, searchFace, checkMatches, normalizePersonRecord } from '../../../Services/api';

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
  // Face search (enhanced)
  const [faceId, setFaceId] = useState('');
  const [faceResult, setFaceResult] = useState(null); // raw API response
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceError, setFaceError] = useState(null);
  const [showRaw, setShowRaw] = useState(false);
  // Face ID match lookup (check_matches)
  const [faceMatches, setFaceMatches] = useState([]); // array of match objects
  const [faceMatchesLoading, setFaceMatchesLoading] = useState(false);
  const [faceMatchesError, setFaceMatchesError] = useState(null);

  // Data Fetching ----------------------------------------------------------
  const transformLost = (lostRecords, matchMap) => {
    return lostRecords.map(rec => {
      // Derive component-specific status mapping
      const hasMatch = matchMap.has(rec.face_id);
      let uiStatus = 'open';
      if (hasMatch) uiStatus = 'matched';
      if (rec.status === 'found') uiStatus = 'closed';
      // Prefer backend-provided face blob; fallback to placeholder
      const photo = rec.face_blob ? `data:image/jpeg;base64,${rec.face_blob}` : 'https://via.placeholder.com/120x120.png?text=Lost';
      return {
        id: rec.face_id,
        person: {
          name: rec.name || 'Unknown',
          age: rec.age ?? '—',
          gender: (rec.gender || 'unknown').toLowerCase(),
          description: rec.where_lost ? `Last seen at ${rec.where_lost}` : 'No description'
        },
        photos: [ photo ],
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
      photos: [ rec.face_blob ? `data:image/jpeg;base64,${rec.face_blob}` : 'https://via.placeholder.com/120x120.png?text=Found' ],
      status: rec.status === 'found' ? 'closed' : 'open',
      lastUpdated: rec.upload_time,
      timeline: [ 'Logged', rec.status === 'found' && 'Closed' ].filter(Boolean)
    }));
  };

  const transformMatches = (records) => {
    return records.map(m => {
      // Attempt to derive embedded lost/found record blobs if backend includes them
      const lostRec = m.lost_record || m.lost_person || m.lost || {};
      const foundRec = m.found_record || m.found_person || m.found || {};
      const lostBlob = lostRec.face_blob || m.lost_face_blob;
      const foundBlob = foundRec.face_blob || m.found_face_blob;
      return {
        id: m.match_id,
        lostPersonName: lostRec.name || m.lost_person?.name || 'Unknown',
        score: m.similarity ?? m.score ?? null,
        threshold: m.threshold ?? null,
        lostPhotoUrl: lostBlob ? `data:image/jpeg;base64,${lostBlob}` : 'https://via.placeholder.com/150x150.png?text=Lost',
        foundFaceUrl: foundBlob ? `data:image/jpeg;base64,${foundBlob}` : 'https://via.placeholder.com/150x150.png?text=Found',
        status: m.match_status || m.status || 'pending_review'
      };
    });
  };

  // Progressive / staged fetching to improve perceived speed:
  // 1. Load lost reports first (primary tab default) – show immediately.
  // 2. Then fetch found reports & matches in background; update when ready.
  // 3. Cache layer in api.js dedupes duplicate calls (StrictMode, concurrent tabs).
  const fetchData = useCallback(async ({ force=false } = {}) => {
    setError(null);
    setLoading(true);
    try {
      const lostRes = await getAllLost(force ? { noCache: true } : undefined);
      // Show lost list ASAP
      setReports(cur => {
        const matchMap = new Map(); // temporarily empty until matches arrive
        return transformLost(lostRes.records || [], matchMap);
      });
    } catch (e) {
      setError(e.message || 'Failed to load lost records');
    } finally {
      setLoading(false);
    }
    // Fire & forget secondary fetches (found + matches); update independently
    Promise.allSettled([
      getAllFound(force ? { noCache: true } : undefined),
      getAllMatches(force ? { noCache: true } : undefined)
    ]).then(results => {
      const [foundRes, matchesRes] = results.map(r => r.status === 'fulfilled' ? r.value : null);
      if (matchesRes) {
        const matchMap = new Map();
        (matchesRes.records || []).forEach(m => { if (m.lost_face_id) matchMap.set(m.lost_face_id, true); });
        setMatches(transformMatches(matchesRes.records || []));
        // Re-map lost reports to include matched status without losing existing ordering
        setReports(prev => prev.map(r => ({ ...r, status: matchMap.has(r.id) && r.status==='open' ? 'matched' : r.status })));
      }
      if (foundRes) setFoundReports(transformFound(foundRes.records || []));
    });
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
          <button onClick={()=>fetchData({ force:true })} title="Refresh (bypass cache)" className="h-9 px-3 rounded-md border flex items-center gap-1 bg-white/5 border-white/10 text-white/70 hover:bg-white/10 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>
            Refresh
          </button>
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
        <div className="mk-surface-alt backdrop-blur border mk-border rounded-lg p-4 space-y-5 text-xs text-white/70" aria-label="Search by Face ID">
          <form onSubmit={async (e)=>{
            e.preventDefault();
            if(!faceId || faceLoading) return;
            setFaceLoading(true);
            setFaceError(null);
            setFaceResult(null);
            setFaceMatches([]);
            setFaceMatchesError(null);
            try {
              const id = faceId.trim();
              const res = await searchFace(id);
              setFaceResult(res);
              // Fire & forget matches fetch (only if record exists)
              if(!res?.not_found){
                setFaceMatchesLoading(true);
                try {
                  const matchRes = await checkMatches(id);
                  const matchesArr = matchRes.matches || matchRes.records || [];
                  setFaceMatches(matchesArr);
                } catch(err){
                  // 404 -> no matches; other -> error
                  if(err?.status === 404){
                    setFaceMatches([]);
                  } else {
                    setFaceMatchesError(err.message||'Failed to load matches');
                  }
                } finally {
                  setFaceMatchesLoading(false);
                }
              }
            } catch(e){
              setFaceError(e.message||'Search failed');
            } finally {
              setFaceLoading(false);
            }
          }} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <SearchIcon size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={faceId} onChange={e=>setFaceId(e.target.value)} placeholder="Enter face ID (UUID)" className="flex-1 h-9 rounded-md border border-white/10 bg-white/5 pl-7 pr-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-white/80 placeholder:text-white/40" />
            </div>
            <button type="submit" disabled={!faceId || faceLoading} className={`h-9 px-4 rounded-md text-xs font-semibold flex items-center gap-2 border transition ${faceId? 'bg-orange-500 text-white border-orange-500 hover:brightness-110':'bg-white/5 text-white/40 border-white/10'}`}>{faceLoading? 'Searching…':'Search'}</button>
            {faceResult && (
              <button type="button" onClick={()=>{ setFaceResult(null); setShowRaw(false); setFaceError(null); }} className="h-9 px-3 rounded-md border border-white/10 bg-white/5 text-white/60 text-[10px] hover:bg-white/10">Clear</button>
            )}
          </form>
          {faceError && <div className="p-2 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-[11px] flex items-center gap-2"><AlertCircle size={14}/> {faceError}</div>}
          {!faceError && faceResult && (
            <FaceResultPanel result={faceResult} showRaw={showRaw} onToggleRaw={()=>setShowRaw(r=>!r)} />
          )}
          {/* Face matches (from /check_matches) */}
          {faceResult && !faceResult.not_found && (
            <div className="space-y-3" aria-label="Face ID matches list">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide font-semibold text-white/60">
                <ListChecks size={14} className="text-orange-400" /> Matches
                {faceMatchesLoading && <span className="text-white/40 normal-case">Loading…</span>}
                {!faceMatchesLoading && !faceMatchesError && faceMatches.length===0 && <span className="text-white/40 normal-case">None</span>}
                {faceMatchesError && <span className="text-red-400 normal-case">{faceMatchesError}</span>}
              </div>
              {faceMatches.length>0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {faceMatches.map((m,i)=> <MatchCard key={m.match_id||i} match={m} />)}
                </div>
              )}
            </div>
          )}
          {!faceResult && !faceError && !faceLoading && <div className="text-white/40 text-[11px]">Enter a face ID to view existing lost/found record details.</div>}
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

// ---------------------------------------------------------------------------
// Face Search Result Panel (Admin) - reuses normalization + richer metadata
// ---------------------------------------------------------------------------
const FaceResultPanel = ({ result, showRaw, onToggleRaw }) => {
  if (!result) return null;
  if (result.not_found) {
    return (
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-[11px] text-amber-200 flex flex-col gap-2">
        <div className="font-semibold uppercase tracking-wide text-amber-300">Face ID Not Found</div>
        <div>No record exists for face_id <span className="font-mono">{result.face_id}</span> yet.</div>
        <button onClick={onToggleRaw} className="self-start mt-1 px-2 py-1 rounded border border-amber-500/40 text-[10px] hover:bg-amber-500/10">{showRaw? 'Hide Raw JSON':'Show Raw JSON'}</button>
        {showRaw && <pre className="w-full mt-2 max-h-56 overflow-auto text-[10px] p-3 rounded border border-amber-500/30 bg-black/30 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>}
      </div>
    );
  }
  const norm = normalizePersonRecord(result);
  const rec = result.record || result.data || result;
  const img = rec.face_blob ? `data:image/jpeg;base64,${rec.face_blob}` : null;
  const meta = [
    ['Name', rec.name],
    ['Gender', rec.gender],
    ['Age', rec.age],
    ['Relation', rec.relation_with_lost],
    ['Where Lost', rec.where_lost],
    ['Where Found', rec.where_found || rec.location_found],
    ['Reporter', rec.reporter_name],
    ['Status', rec.status],
    ['Uploaded', rec.upload_time ? formatDate(rec.upload_time) : null],
    ['Mobile', rec.contact_details?.mobile_no],
    ['Email', rec.contact_details?.email_id]
  ].filter(([,v]) => v !== undefined && v !== null && v !== '');
  return (
    <div className="space-y-4" aria-label="Face search result details">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/60">Record</span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono">{truncate(norm?.id || rec.face_id || 'unknown', 20)}</span>
        {norm && !norm.not_found && (
          <div className="flex flex-wrap gap-2 ml-2 text-[10px]">{
            [
              ['Case ID', truncate(norm.id,18)],
              ['Type', norm.type],
              ['Status', norm.status],
              ['Created', norm.createdAt ? formatDate(norm.createdAt) : '-'],
              ['Location', norm.location]
            ].map(([l,v]) => <InfoPill key={l} label={l} value={v} />)
          }</div>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={onToggleRaw} className="text-[10px] px-2 py-1 border border-white/10 rounded hover:bg-white/10 transition">{showRaw? 'Hide Raw':'Raw JSON'}</button>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <div className="relative w-full aspect-[4/5] rounded-md overflow-hidden border border-white/10 bg-black/30 flex items-center justify-center">
            {img ? <img src={img} alt="Face" className="object-cover w-full h-full" /> : <div className="text-[10px] text-white/40">No Image</div>}
          </div>
        </div>
        <div className="md:col-span-2 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {meta.map(([k,v]) => (
              <div key={k} className="space-y-0.5">
                <div className="text-[9px] uppercase tracking-wide text-white/40">{k}</div>
                <div className="text-[12px] font-medium break-words text-white/80">{String(v)}</div>
              </div>
            ))}
          </div>
          {rec.additional_info && (
            <div className="text-[11px] text-white/70"><span className="font-semibold">Notes: </span>{rec.additional_info}</div>
          )}
        </div>
      </div>
      {showRaw && (
        <pre className="max-h-72 overflow-auto text-[10px] p-3 rounded-md border border-white/10 bg-black/30 whitespace-pre-wrap leading-relaxed">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

// Small utility pills & helpers (duplicated locally to avoid cross-import churn)
const InfoPill = ({ label, value }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-white/5">
    <span className="uppercase text-[8px] tracking-wide text-white/40">{label}</span>
    <span className="font-mono text-[10px] text-white/80">{value}</span>
  </span>
);
function truncate(str='', n=24){ return str.length>n ? str.slice(0, n-4)+'…'+str.slice(-4) : str; }
function formatDate(str){ try { return new Date(str).toLocaleString(); } catch { return str; } }

// Match card for face search matches (check_matches)
const MatchCard = ({ match }) => {
  // Expected match shape (backend speculative): {
  //  match_id, lost_face_id, found_face_id, lost_record, found_record, similarity, threshold, status
  //  Each record may contain face_blob (base64)
  // }
  const lost = match.lost_record || match.lost || {};
  const found = match.found_record || match.found || {};
  const lostImg = lost.face_blob ? `data:image/jpeg;base64,${lost.face_blob}` : 'https://via.placeholder.com/120x160.png?text=Lost';
  const foundImg = found.face_blob ? `data:image/jpeg;base64,${found.face_blob}` : 'https://via.placeholder.com/120x160.png?text=Found';
  const score = match.similarity ?? match.score ?? null;
  const threshold = match.threshold ?? null;
  return (
    <div className="relative p-3 rounded-lg border border-white/10 bg-white/5 backdrop-blur flex flex-col gap-2 text-[10px] text-white/70">
      <div className="flex items-start gap-2">
        <div className="w-16 h-20 rounded overflow-hidden border border-white/10 bg-black/30">
          <img src={lostImg} alt="Lost" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="w-16 h-20 rounded overflow-hidden border border-white/10 bg-black/30">
          <img src={foundImg} alt="Found" className="w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="font-semibold text-white/80 truncate">{lost.name || match.lost_name || 'Unknown'}</div>
          {score !== null && <div className="text-white/60">Score {(score*100).toFixed(1)}%</div>}
          {threshold !== null && <div className="text-white/40">Threshold {(threshold*100).toFixed(0)}%</div>}
          <div className="flex flex-wrap gap-1">
            {match.status && <span className="px-1.5 py-0.5 rounded border border-orange-400/30 bg-orange-500/15 text-orange-300 uppercase tracking-wide text-[8px]">{String(match.status)}</span>}
            {match.match_id && <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 font-mono text-[8px]">{truncate(match.match_id,14)}</span>}
          </div>
        </div>
      </div>
      {score !== null && (
        <div className="h-1.5 rounded bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600" style={{width: Math.min(100,(score*100))+'%'}} />
        </div>
      )}
    </div>
  );
};
