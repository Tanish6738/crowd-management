import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Drawer from '../../../General/Drawer';
import { Flag, CheckCircle2, XCircle, Clock, MapPin, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../LostAndFound';
import { getAllFound } from '../../../../Services/api';

/** @typedef {{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'missing'|'cancelled'; createdAt:string; reporterId:string; matchedWith?:string; resolvedAt?:string }} LostCase */

const relative = iso => { const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; const da=Math.floor(h/24); return da+'d'; };

const Found = ({ data = [], loading: parentLoading, onUpdate, onResolve }) => {
  const [internal, setInternal] = useState([]);
  const [loading, setLoading] = useState(parentLoading);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  // Fetch found list if parent hasn't provided data
  const fetchFound = useCallback(async () => {
    if (data.length) return; // parent-controlled
    setLoading(true); setError(null);
    try {
      const res = await getAllFound();
      const mapped = (res.records || []).map(r => ({
        id: r.face_id,
        type: 'person',
        description: r.name ? `Found: ${r.name} (${r.age ?? 'Unknown'} yrs)` : `Found person ${r.face_id?.slice(0,8)}`,
        photoUrls: [], // list endpoint does not currently include image blobs/URLs
        location: r.location_found || 'Unknown',
        status: r.status === 'found' ? 'resolved' : 'open',
        createdAt: r.upload_time || new Date().toISOString(),
        reporterId: r.user_id || (r.reported_by?.name || 'n/a')
      }));
      setInternal(mapped);
    } catch (e) {
      setError(e.message || 'Failed to load found cases');
    } finally { setLoading(false); }
  }, [data]);

  useEffect(() => { fetchFound(); }, [fetchFound]);

  const source = data.length ? data : internal;
  const sorted = useMemo(()=>[...source].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)), [source]);

  // Local only actions (no backend mutation endpoints documented yet)
  const confirm = (c) => onUpdate && onUpdate(c.id, old => ({ ...old, status:'matched' }));
  const reject = (c) => onUpdate && onUpdate(c.id, old => ({ ...old, status:'open', matchedWith: undefined }));
  const resolve = (c) => { onResolve && onResolve(c.id); };

  return (
  <div className="flex flex-col md:grid md:grid-cols-5 md:gap-5 mk-text-primary" aria-label="Found cases list">
      <div className="md:col-span-2 space-y-3 mb-4 md:mb-0">
        {!data.length && (
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide mk-text-muted">Found Cases</h3>
            <button onClick={fetchFound} disabled={loading} className="h-7 px-2 rounded-md mk-border mk-surface-alt text-[10px] flex items-center gap-1 disabled:opacity-50 hover:bg-orange-50 dark:hover:bg-white/10"><RefreshCw size={12}/> Refresh</button>
          </div>
        )}
        {error && <div className="p-3 text-[11px] rounded-md bg-red-500/10 border border-red-500/40 text-red-300 flex justify-between"><span>{error}</span><button onClick={fetchFound} className="underline">Retry</button></div>}
        {loading && Array.from({length:4}).map((_,i)=>(<div key={i} className="h-24 rounded-lg bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse"/>))}
        {!loading && !error && sorted.length===0 && <div className="p-10 text-center text-sm mk-text-muted mk-surface-alt mk-border rounded-lg">No found cases.</div>}
        {sorted.map(c => (
          <div key={c.id} role="button" tabIndex={0} onClick={()=>setDetail(c)} onKeyDown={e=>{ if(e.key==='Enter') setDetail(c); }} className={`mk-border rounded-lg p-3 flex gap-3 items-center cursor-pointer backdrop-blur-sm transition ${detail?.id===c.id? 'border-orange-400/60 bg-orange-50 dark:bg-white/10':'mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border'}`}>
            <div className="h-14 w-14 rounded-md mk-surface-alt flex items-center justify-center overflow-hidden mk-text-fainter text-[10px] font-medium mk-border">
              {c.photoUrls.length? <img src={c.photoUrls[0]} alt={c.type+' thumbnail'} className="h-full w-full object-cover"/> : c.type==='person'? 'PERSON':'ITEM'}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold mk-text-primary leading-tight line-clamp-2">{c.description}</h3>
                <StatusBadge value={c.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] mk-text-muted">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{c.location}</span>
                <span className="flex items-center gap-1"><Clock size={12} className="mk-text-fainter"/>{relative(c.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block md:col-span-3">
        {detail ? (
          <div className="rounded-lg mk-border mk-surface-alt backdrop-blur-sm h-full p-5 flex flex-col" aria-label="Found case detail">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h2 className="text-sm font-semibold mk-text-primary leading-snug">{detail.type==='person'? 'Person':'Item'} Found</h2>
                <div className="flex flex-wrap gap-2 text-[11px] mk-text-muted">
                  <StatusBadge value={detail.status} />
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{detail.location}</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="mk-text-fainter"/>{relative(detail.createdAt)}</span>
                </div>
              </div>
              <button onClick={()=>setDetail(null)} className="mk-text-fainter hover:mk-text-primary text-sm px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60">✕</button>
            </div>
            <div className="text-xs leading-relaxed mk-text-secondary mb-4 whitespace-pre-wrap flex-1">{detail.description}</div>
            {detail.photoUrls.length>0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {detail.photoUrls.map((p,i)=>(<img key={i} src={p} alt={`Found photo ${i+1}`} className="h-20 w-full object-cover rounded" />))}
              </div>
            )}
            <div className="space-y-3">
              {detail.status==='matched' && (
                <div className="flex gap-2">
                  <button onClick={()=>confirm(detail)} className="flex-1 h-10 rounded-md bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Confirm</button>
                  <button onClick={()=>reject(detail)} className="flex-1 h-10 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 flex items-center justify-center gap-2"><XCircle size={16}/> Reject</button>
                </div>
              )}
              {detail.status!=='resolved' && (
                <button onClick={()=>resolve(detail)} className="h-10 rounded-md w-full bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 flex items-center justify-center gap-2"><Flag size={16}/> Mark Resolved</button>
              )}
              {detail.status==='resolved' && <div className="text-[11px] text-green-300 font-medium">Case resolved.</div>}
            </div>
          </div>
        ) : (
          <div className="h-full border border-dashed mk-border rounded-lg flex items-center justify-center text-xs mk-text-muted">Select a found case</div>
        )}
      </div>
      <Drawer open={!!detail && window.innerWidth<768} onClose={()=>setDetail(null)} title={detail? (detail.type==='person'? 'Person':'Item')+' Found':''}>
        {detail && (
          <div className="space-y-4 text-sm mk-text-secondary">
            <div className="flex flex-wrap gap-2 text-[11px] mk-text-muted">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{detail.location}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="mk-text-fainter"/>{relative(detail.createdAt)}</span>
            </div>
            <div className="text-xs leading-relaxed mk-text-secondary whitespace-pre-wrap">{detail.description}</div>
            {detail.photoUrls.length>0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.photoUrls.map((p,i)=>(<img key={i} src={p} alt={`Found photo ${i+1}`} className="h-20 w-full object-cover rounded" />))}
              </div>
            )}
            <div className="space-y-3 pt-2">
              {detail.status==='matched' && (
                <div className="flex gap-2">
                  <button onClick={()=>confirm(detail)} className="flex-1 h-10 rounded-md bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-2"> <CheckCircle2 size={16}/> Confirm</button>
                  <button onClick={()=>reject(detail)} className="flex-1 h-10 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium flex items-center justify-center gap-2"> <XCircle size={16}/> Reject</button>
                </div>
              )}
              {detail.status!=='resolved' && (
                <button onClick={()=>resolve(detail)} className="h-10 rounded-md w-full bg-blue-600/80 hover:bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-2"><Flag size={16}/> Mark Resolved</button>
              )}
              {detail.status==='resolved' && <div className="text-[11px] text-green-300 font-medium">Case resolved.</div>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Found;
