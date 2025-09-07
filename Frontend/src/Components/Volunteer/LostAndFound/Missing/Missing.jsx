import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Drawer from '../../../General/Drawer';
import { Clock, MapPin, CheckCircle2, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../LostAndFound';
import { getAllLost, searchFace, normalizePersonRecord } from '../../../../Services/api';

/** @typedef {{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'missing'|'cancelled'; createdAt:string; reporterId:string; matchedWith?:string; resolvedAt?:string }} LostCase */

const relative = iso => { if(!iso) return '-'; const t=new Date(iso).getTime(); if(isNaN(t)) return '-'; const d=Date.now()-t; const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; const da=Math.floor(h/24); return da+'d'; };

const Missings = ({ data = [], loading: parentLoading, onMarkFound }) => {
  const [internal, setInternal] = useState([]);
  const [loading, setLoading] = useState(parentLoading);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichedMap, setEnrichedMap] = useState({});

  // Fetch lost list if parent passes empty (graceful fallback)
  const fetchLost = useCallback(async () => {
    if (data.length) return; // parent controlled
    setLoading(true); setError(null);
    try {
      const res = await getAllLost();
      // Map API status (pending|found) to local (missing|resolved)
      const mapped = (res.records||[]).map(r => ({
        id: r.face_id,
        type: 'person',
        description: r.name ? `${r.name} (${r.age ?? 'Unknown'} yrs) – Last seen ${r.where_lost || 'unspecified'}` : `Lost person ${r.face_id?.slice(0,8)}`,
        photoUrls: [],
        location: r.where_lost || 'Unknown',
        status: r.status === 'found' ? 'resolved' : 'missing',
        createdAt: r.upload_time || null,
        reporterId: r.user_id || 'n/a'
      })).filter(x => x.status === 'missing');
      setInternal(mapped);
    } catch (e) {
      setError(e.message || 'Failed to load missing cases');
    } finally { setLoading(false); }
  }, [data]);

  useEffect(() => { fetchLost(); }, [fetchLost]);

  const source = data.length ? data.filter(x => x.status === 'missing') : internal;
  const sorted = useMemo(()=>[...source].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)), [source]);

  return (
  <div className="flex flex-col md:grid md:grid-cols-5 md:gap-5 mk-text-primary" aria-label="Missing cases">
      <div className="md:col-span-2 space-y-3 mb-4 md:mb-0">
        {!data.length && (
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide mk-text-muted">Missing Cases</h3>
            <button onClick={fetchLost} disabled={loading} className="h-7 px-2 rounded-md mk-border mk-surface-alt text-[10px] flex items-center gap-1 disabled:opacity-50 hover:bg-orange-50 dark:hover:bg-white/10"><RefreshCw size={12}/> Refresh</button>
          </div>
        )}
        {error && <div className="p-3 text-[11px] rounded-md bg-red-500/10 border border-red-500/40 text-red-300 flex justify-between"><span>{error}</span><button onClick={fetchLost} className="underline">Retry</button></div>}
        {loading && Array.from({length:4}).map((_,i)=>(<div key={i} className="h-24 rounded-lg bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse"/>))}
        {!loading && sorted.length===0 && <div className="p-10 text-center text-sm mk-text-muted mk-surface-alt mk-border rounded-lg">No missing cases.</div>}
        {sorted.map(c => (
          <div key={c.id} role="button" tabIndex={0} onClick={()=>{
            setDetail(c);
            if(!enrichedMap[c.id]){
              setEnriching(true);
              searchFace(c.id).then(res=>{
                const norm = normalizePersonRecord(res);
                if(norm && !norm.not_found){
                  setEnrichedMap(m=>({...m, [c.id]: norm}));
                }
              }).catch(()=>{}).finally(()=>setEnriching(false));
            }
          }} onKeyDown={e=>{ if(e.key==='Enter') setDetail(c); }} className={`mk-border rounded-lg p-3 flex gap-3 items-center cursor-pointer backdrop-blur-sm transition ${detail?.id===c.id? 'border-orange-400/60 bg-orange-50 dark:bg-white/10':'mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border'}`}>
            <div className="h-14 w-14 rounded-md mk-surface-alt flex items-center justify-center overflow-hidden mk-text-fainter text-[10px] font-medium mk-border">
              {enrichedMap[c.id]?.raw?.record?.face_blob ? (
                <img src={`data:image/jpeg;base64,${enrichedMap[c.id].raw.record.face_blob}`} alt="Face" className="h-full w-full object-cover" />
              ) : c.photoUrls.length? <img src={c.photoUrls[0]} alt={c.type+' thumbnail'} className="h-full w-full object-cover"/> : c.type==='person'? 'PERSON':'ITEM'}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold mk-text-primary leading-tight line-clamp-2">{enrichedMap[c.id]?.name ? `${enrichedMap[c.id].name}${enrichedMap[c.id].age? ' ('+enrichedMap[c.id].age+' yrs)':''}` : c.description}</h3>
                <StatusBadge value={c.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] mk-text-muted">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 font-medium">Missing</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{enrichedMap[c.id]?.location || c.location}</span>
                <span className="flex items-center gap-1"><Clock size={12} className="text-white/40"/>{relative(enrichedMap[c.id]?.createdAt || c.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block md:col-span-3">
        {detail ? (
          <div className="rounded-lg mk-border mk-surface-alt backdrop-blur-sm h-full p-5 flex flex-col" aria-label="Missing case detail">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h2 className="text-sm font-semibold mk-text-primary leading-snug">Missing {enrichedMap[detail.id]?.name || (detail.type==='person'? 'Person':'Item')}</h2>
                <div className="flex flex-wrap gap-2 text-[11px] mk-text-muted">
                  <StatusBadge value={detail.status} />
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{enrichedMap[detail.id]?.location || detail.location}</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="text-white/40"/>{relative(enrichedMap[detail.id]?.createdAt || detail.createdAt)}</span>
                  {enriching && <span className="text-[10px]">Loading…</span>}
                </div>
              </div>
              <button onClick={()=>setDetail(null)} className="text-white/40 hover:text-white/70 text-sm px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60">✕</button>
            </div>
            {enrichedMap[detail.id]?.raw?.record?.face_blob && (
              <div className="mb-4 w-40 aspect-[4/5] rounded-md overflow-hidden mk-border">
                <img src={`data:image/jpeg;base64,${enrichedMap[detail.id].raw.record.face_blob}`} alt="Face" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="text-xs leading-relaxed mk-text-secondary mb-4 whitespace-pre-wrap flex-1">{enrichedMap[detail.id]?.name ? `Last seen at ${enrichedMap[detail.id].location}` : detail.description}</div>
            {detail.photoUrls.length>0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {detail.photoUrls.map((p,i)=>(<img key={i} src={p} alt={`Missing photo ${i+1}`} className="h-20 w-full object-cover rounded" />))}
              </div>
            )}
            <div className="space-y-3">
              {detail.status==='missing' && (
                <button onClick={()=>{ onMarkFound && onMarkFound(detail.id); setDetail(null); }} className="h-10 rounded-md w-full bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Mark Found</button>
              )}
              {detail.status==='resolved' && <div className="text-[11px] text-green-300 font-medium">Resolved.</div>}
            </div>
          </div>
        ) : (
          <div className="h-full border border-dashed mk-border rounded-lg flex items-center justify-center text-xs mk-text-muted">Select a missing case</div>
        )}
      </div>
      <Drawer open={!!detail && window.innerWidth<768} onClose={()=>setDetail(null)} title={detail? 'Missing '+(enrichedMap[detail.id]?.name || (detail.type==='person'? 'Person':'Item')):''}>
        {detail && (
          <div className="space-y-4 text-sm mk-text-secondary">
            <div className="flex flex-wrap gap-2 text-[11px] mk-text-muted">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{enrichedMap[detail.id]?.location || detail.location}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="text-white/40"/>{relative(enrichedMap[detail.id]?.createdAt || detail.createdAt)}</span>
              {enriching && <span className="text-[10px]">Loading…</span>}
            </div>
            {enrichedMap[detail.id]?.raw?.record?.face_blob && (
              <div className="w-32 aspect-[4/5] rounded-md overflow-hidden mk-border">
                <img src={`data:image/jpeg;base64,${enrichedMap[detail.id].raw.record.face_blob}`} alt="Face" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="text-xs leading-relaxed text-white/75 whitespace-pre-wrap">{enrichedMap[detail.id]?.name ? `Last seen at ${enrichedMap[detail.id].location}` : detail.description}</div>
            {detail.photoUrls.length>0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.photoUrls.map((p,i)=>(<img key={i} src={p} alt={`Missing photo ${i+1}`} className="h-20 w-full object-cover rounded" />))}
              </div>
            )}
            <div className="space-y-3 pt-2">
              {detail.status==='missing' && (
                <button onClick={()=>{ onMarkFound && onMarkFound(detail.id); setDetail(null); }} className="h-10 rounded-md w-full bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Mark Found</button>
              )}
              {detail.status==='resolved' && <div className="text-[11px] text-green-300 font-medium">Resolved.</div>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Missings;
