import React, { useEffect, useMemo, useState } from 'react';
import Drawer from '../../../General/Drawer';
import { Flag, CheckCircle2, XCircle, Clock, MapPin } from 'lucide-react';
import { StatusBadge } from '../LostAndFound';

/** @typedef {{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'missing'|'cancelled'; createdAt:string; reporterId:string; matchedWith?:string; resolvedAt?:string }} LostCase */

const relative = iso => { const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; const da=Math.floor(h/24); return da+'d'; };

const Found = ({ data, loading, onUpdate, onResolve }) => {
  const [detail, setDetail] = useState(null);
  const sorted = useMemo(()=>[...data].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)), [data]);

  const confirm = (c) => onUpdate && onUpdate(c.id, old => ({ ...old, status:'matched' }));
  const reject = (c) => onUpdate && onUpdate(c.id, old => ({ ...old, status:'open', matchedWith: undefined }));
  const resolve = (c) => { onResolve && onResolve(c.id); };

  return (
    <div className="flex flex-col md:grid md:grid-cols-5 md:gap-5 text-white/90" aria-label="Found cases list">
      <div className="md:col-span-2 space-y-3 mb-4 md:mb-0">
        {loading && Array.from({length:4}).map((_,i)=>(<div key={i} className="h-24 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse"/>))}
        {!loading && sorted.length===0 && <div className="p-10 text-center text-sm text-white/50 bg-white/5 border border-white/10 rounded-lg">No found cases.</div>}
        {sorted.map(c => (
          <div key={c.id} role="button" tabIndex={0} onClick={()=>setDetail(c)} onKeyDown={e=>{ if(e.key==='Enter') setDetail(c); }} className={`border rounded-lg p-3 flex gap-3 items-center cursor-pointer backdrop-blur-sm transition ${detail?.id===c.id? 'border-orange-400/60 bg-white/10':'border-white/10 bg-white/5 hover:bg-white/10'}`}>
            <div className="h-14 w-14 rounded-md bg-white/5 flex items-center justify-center overflow-hidden text-white/40 text-[10px] font-medium border border-white/10">
              {c.photoUrls.length? <img src={c.photoUrls[0]} alt={c.type+' thumbnail'} className="h-full w-full object-cover"/> : c.type==='person'? 'PERSON':'ITEM'}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">{c.description}</h3>
                <StatusBadge value={c.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{c.location}</span>
                <span className="flex items-center gap-1"><Clock size={12} className="text-white/40"/>{relative(c.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block md:col-span-3">
        {detail ? (
          <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm h-full p-5 flex flex-col" aria-label="Found case detail">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-white leading-snug">{detail.type==='person'? 'Person':'Item'} Found</h2>
                <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
                  <StatusBadge value={detail.status} />
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{detail.location}</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="text-white/40"/>{relative(detail.createdAt)}</span>
                </div>
              </div>
              <button onClick={()=>setDetail(null)} className="text-white/40 hover:text-white/70 text-sm px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60">✕</button>
            </div>
            <div className="text-xs leading-relaxed text-white/75 mb-4 whitespace-pre-wrap flex-1">{detail.description}</div>
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
          <div className="h-full border border-dashed border-white/15 rounded-lg flex items-center justify-center text-xs text-white/50">Select a found case</div>
        )}
      </div>
      <Drawer open={!!detail && window.innerWidth<768} onClose={()=>setDetail(null)} title={detail? (detail.type==='person'? 'Person':'Item')+' Found':''}>
        {detail && (
          <div className="space-y-4 text-sm text-white/80">
            <div className="flex flex-wrap gap-2 text-[11px] text-white/60">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 font-medium"><MapPin size={12}/>{detail.location}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="text-white/40"/>{relative(detail.createdAt)}</span>
            </div>
            <div className="text-xs leading-relaxed text-white/75 whitespace-pre-wrap">{detail.description}</div>
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
