import React, { useMemo, useState } from 'react';
import Drawer from '../../../General/Drawer';
import { Clock, Filter, MapPin, Image as ImageIcon, FileJson } from 'lucide-react';
import { StatusBadge } from '../LostAndFound';
import { searchFace, normalizePersonRecord } from '../../../../Services/api';

/* Activity entry: { id, caseId, action, type, zone, date, status } */

const relative = iso => { if(!iso) return '-'; const t=new Date(iso).getTime(); if(isNaN(t)) return '-'; const d=Date.now()-t; const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; const da=Math.floor(h/24); return da+'d'; };

// History assumes parent composes activity entries derived from API lists (lost, found, matches)
// API endpoints used upstream: /get_all_lost, /get_all_found, /get_all_matches
const History = ({ data = [], loading = false }) => {
  const [detail, setDetail] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // '24h' | '7d' | ''
  const [enrichedMap, setEnrichedMap] = useState({}); // caseId -> normalized
  const [enriching, setEnriching] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const filtered = useMemo(()=>{
    const safe = Array.isArray(data) ? data : [];
    let rows = safe;
    if(actionFilter) rows = rows.filter(r => r.action===actionFilter);
    if(dateFilter){
      const now = Date.now();
      if(dateFilter==='24h') rows = rows.filter(r => now - new Date(r.date).getTime() <= 24*3600_000);
      if(dateFilter==='7d') rows = rows.filter(r => now - new Date(r.date).getTime() <= 7*24*3600_000);
    }
    return [...rows].sort((a,b)=> new Date(b.date)-new Date(a.date));
  }, [data, actionFilter, dateFilter]);

  const handleSelect = (row) => {
    setDetail(row);
    if(row.caseId && !enrichedMap[row.caseId]){
      setEnriching(true);
      searchFace(row.caseId)
        .then(res => {
          const norm = normalizePersonRecord(res);
          if(norm && !norm.not_found){
            setEnrichedMap(m => ({...m, [row.caseId]: norm}));
          }
        })
        .finally(()=> setEnriching(false));
    }
  };

  return (
  <div className="space-y-4 mk-text-primary" aria-label="Activity history">
      <div className="flex flex-wrap gap-3 items-center text-[11px]">
        <div className="flex items-center gap-1 mk-text-secondary"><Filter size={14} className="text-orange-400"/> Filters:</div>
  <select value={actionFilter} onChange={e=>setActionFilter(e.target.value)} className="h-8 rounded-md mk-border mk-surface-alt px-2 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 mk-text-primary">
          <option value="">All Actions</option>
          <option value="Reported">Reported</option>
          <option value="Found Logged">Found Logged</option>
          <option value="Resolved">Resolved</option>
          <option value="Cancelled">Cancelled</option>
        </select>
  <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="h-8 rounded-md mk-border mk-surface-alt px-2 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 mk-text-primary">
          <option value="">All Time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
        </select>
  {(actionFilter || dateFilter) && <button onClick={()=>{ setActionFilter(''); setDateFilter(''); }} className="text-[10px] px-2 py-1 rounded-md mk-surface-alt hover:mk-surface bg-white/20 mk-text-secondary">Clear</button>}
      </div>

  <div className="hidden md:grid grid-cols-12 text-[11px] font-semibold mk-text-muted px-3">
        <div className="col-span-2">Case ID</div>
        <div className="col-span-2">Action</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Zone</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-2">Status</div>
      </div>
      <div className="space-y-2 hidden md:block">
        {loading && Array.from({length:6}).map((_,i)=>(<div key={i} className="h-10 rounded bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse"/>))}
        {!loading && filtered.length===0 && <div className="p-8 text-center text-xs mk-text-muted mk-surface-alt mk-border rounded-lg">No activity.</div>}
        {!loading && filtered.map(r => (
          <div key={r.id || r.caseId} role="button" tabIndex={0} onClick={()=>handleSelect(r)} onKeyDown={e=>{ if(e.key==='Enter') handleSelect(r); }} className={`grid grid-cols-12 items-center mk-border rounded-md px-3 py-2 text-[11px] cursor-pointer backdrop-blur-sm transition ${detail?.id===r.id? 'border-orange-400/60 bg-orange-50 dark:bg-white/10':'mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border'}`}>
            <div className="col-span-2 font-mono truncate mk-text-fainter" title={r.caseId}>{r.caseId}</div>
            <div className="col-span-2 mk-text-secondary">{r.action}</div>
            <div className="col-span-2 capitalize mk-text-secondary">{r.type}</div>
            <div className="col-span-2 mk-text-secondary">{r.zone}</div>
            <div className="col-span-2 flex items-center gap-1 mk-text-muted"><Clock size={12} className="mk-text-fainter"/>{relative(r.date)}</div>
            <div className="col-span-2"><StatusBadge value={r.status} /></div>
          </div>
        ))}
      </div>

      {/* Mobile accordion style */}
      <div className="md:hidden space-y-3">
        {loading && Array.from({length:5}).map((_,i)=>(<div key={i} className="h-20 rounded-lg bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse"/>))}
        {!loading && filtered.length===0 && <div className="p-8 text-center text-xs mk-text-muted mk-surface-alt mk-border rounded-lg">No activity.</div>}
        {!loading && filtered.map(r => (
          <div key={r.id || r.caseId} role="button" tabIndex={0} onClick={()=>handleSelect(r)} onKeyDown={e=>{ if(e.key==='Enter') handleSelect(r); }} className={`mk-border rounded-lg p-3 flex flex-col gap-2 text-[11px] cursor-pointer backdrop-blur-sm transition ${detail?.id===r.id? 'border-orange-400/60 bg-orange-50 dark:bg-white/10':'mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border'}`}>
            <div className="flex justify-between">
              <span className="font-mono text-[10px] mk-text-fainter">{r.caseId}</span>
              <StatusBadge value={r.status} />
            </div>
            <div className="font-medium mk-text-secondary">{r.action}</div>
            <div className="flex flex-wrap gap-2 mk-text-muted">
              <span className="inline-flex items-center gap-1 capitalize">{r.type}</span>
              <span className="inline-flex items-center gap-1"><MapPin size={12} className="mk-text-fainter"/>{r.zone}</span>
              <span className="inline-flex items-center gap-1"><Clock size={12} className="mk-text-fainter"/>{relative(r.date)}</span>
            </div>
          </div>
        ))}
      </div>

      <Drawer open={!!detail} onClose={()=>{ setDetail(null); setShowRaw(false); }} title={detail? 'Activity '+detail.caseId:''}>
        {detail && (
          <div className="space-y-4 text-sm mk-text-secondary">
            <div className="flex flex-wrap gap-2 text-[10px] mk-text-muted items-center">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1"><Clock size={12} className="mk-text-fainter"/>{relative(detail.date)}</span>
              {enriching && <span className="text-[9px]">Loading…</span>}
              {enrichedMap[detail.caseId] && !enrichedMap[detail.caseId].not_found && (
                <button onClick={()=>setShowRaw(s=>!s)} className="ml-auto text-[10px] px-2 py-0.5 mk-border rounded flex items-center gap-1 hover:bg-white/5"><FileJson size={12}/>{showRaw? 'Hide':'Raw'}</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <InfoRow label="Action" value={detail.action} />
              <InfoRow label="Type" value={detail.type} />
              <InfoRow label="Zone" value={detail.zone || '—'} />
              <InfoRow label="Status" value={detail.status} />
              {enrichedMap[detail.caseId] && !enrichedMap[detail.caseId].not_found && (
                <>
                  <InfoRow label="Name" value={enrichedMap[detail.caseId].name} />
                  {enrichedMap[detail.caseId].age !== undefined && <InfoRow label="Age" value={enrichedMap[detail.caseId].age} />}
                  <InfoRow label="Created" value={enrichedMap[detail.caseId].createdAt ? new Date(enrichedMap[detail.caseId].createdAt).toLocaleString() : '—'} />
                  <InfoRow label="Location" value={enrichedMap[detail.caseId].location || 'Unknown'} />
                  <InfoRow label="Source" value={enrichedMap[detail.caseId].source} />
                </>
              )}
            </div>
            {enrichedMap[detail.caseId]?.raw?.record?.face_blob && (
              <div className="w-40 aspect-[4/5] rounded-md overflow-hidden mk-border">
                <img src={`data:image/jpeg;base64,${enrichedMap[detail.caseId].raw.record.face_blob}`} alt="Face" className="w-full h-full object-cover" />
              </div>
            )}
            {!enrichedMap[detail.caseId] && !enriching && (
              <button onClick={()=>{ setEnriching(true); searchFace(detail.caseId).then(res=>{ const norm=normalizePersonRecord(res); if(norm && !norm.not_found) setEnrichedMap(m=>({...m,[detail.caseId]:norm})); }).finally(()=>setEnriching(false)); }} className="h-8 px-3 rounded-md mk-border mk-surface-alt text-[11px] hover:bg-orange-50 dark:hover:bg-white/10">Fetch Details</button>
            )}
            {enrichedMap[detail.caseId]?.not_found && (
              <div className="text-[10px] mk-text-muted flex items-center gap-2"><ImageIcon size={14} className="mk-text-fainter"/> No face record found for this ID.</div>
            )}
            {showRaw && enrichedMap[detail.caseId] && (
              <pre className="max-h-60 overflow-auto text-[10px] p-2 rounded mk-border mk-surface-alt whitespace-pre-wrap leading-relaxed">{JSON.stringify(enrichedMap[detail.caseId].raw, null, 2)}</pre>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="space-y-0.5">
    <div className="text-[9px] uppercase tracking-wide mk-text-muted">{label}</div>
    <div className="text-[11px] font-medium break-words">{String(value)}</div>
  </div>
);

export default History;
