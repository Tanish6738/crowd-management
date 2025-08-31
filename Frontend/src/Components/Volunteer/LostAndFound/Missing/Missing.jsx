import React, { useMemo, useState } from 'react';
import Drawer from '../../../General/Drawer';
import { Clock, MapPin, Flag, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../LostAndFound';

/** @typedef {{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'missing'|'cancelled'; createdAt:string; reporterId:string; matchedWith?:string; resolvedAt?:string }} LostCase */

const relative = iso => { const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; const da=Math.floor(h/24); return da+'d'; };

const Missings = ({ data, loading, onMarkFound }) => {
  const [detail, setDetail] = useState(null);
  const sorted = useMemo(()=>[...data].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)), [data]);

  return (
    <div className="flex flex-col md:grid md:grid-cols-5 md:gap-5" aria-label="Missing cases">
      <div className="md:col-span-2 space-y-3 mb-4 md:mb-0">
        {loading && Array.from({length:4}).map((_,i)=>(<div key={i} className="h-24 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse"/>))}
        {!loading && sorted.length===0 && <div className="p-10 text-center text-sm text-gray-500 bg-white border rounded-lg">No missing cases.</div>}
        {sorted.map(c => (
          <div key={c.id} role="button" tabIndex={0} onClick={()=>setDetail(c)} onKeyDown={e=>{ if(e.key==='Enter') setDetail(c); }} className="bg-white border border-gray-200 hover:border-orange-400 rounded-lg p-3 flex gap-3 items-center shadow-sm cursor-pointer">
            <div className="h-14 w-14 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden text-gray-400 text-[10px] font-medium">
              {c.photoUrls.length? <img src={c.photoUrls[0]} alt={c.type+' thumbnail'} className="h-full w-full object-cover"/> : c.type==='person'? 'PERSON':'ITEM'}
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{c.description}</h3>
                <StatusBadge value={c.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium">Missing</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium"><MapPin size={12}/>{c.location}</span>
                <span className="flex items-center gap-1"><Clock size={12} className="text-gray-400"/>{relative(c.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block md:col-span-3">
        {detail ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full p-5 flex flex-col" aria-label="Missing case detail">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-800 leading-snug">Missing {detail.type==='person'? 'Person':'Item'}</h2>
                <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
                  <StatusBadge value={detail.status} />
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium"><MapPin size={12}/>{detail.location}</span>
                  <span className="flex items-center gap-1"><Clock size={12} className="text-gray-400"/>{relative(detail.createdAt)}</span>
                </div>
              </div>
              <button onClick={()=>setDetail(null)} className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-orange-500">✕</button>
            </div>
            <div className="text-xs leading-relaxed text-gray-700 mb-4 whitespace-pre-wrap flex-1">{detail.description}</div>
            {detail.photoUrls.length>0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {detail.photoUrls.map((p,i)=>(<img key={i} src={p} alt={`Missing photo ${i+1}`} className="h-20 w-full object-cover rounded" />))}
              </div>
            )}
            <div className="space-y-3">
              {detail.status==='missing' && (
                <button onClick={()=>{ onMarkFound && onMarkFound(detail.id); setDetail(null); }} className="h-10 rounded-md w-full bg-green-600 text-white text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Mark Found</button>
              )}
              {detail.status==='resolved' && <div className="text-[11px] text-green-600 font-medium">Resolved.</div>}
            </div>
          </div>
        ) : (
          <div className="h-full border border-dashed rounded-lg flex items-center justify-center text-xs text-gray-500">Select a missing case</div>
        )}
      </div>
      <Drawer open={!!detail && window.innerWidth<768} onClose={()=>setDetail(null)} title={detail? 'Missing '+(detail.type==='person'? 'Person':'Item'):''}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium"><MapPin size={12}/>{detail.location}</span>
              <span className="flex items-center gap-1"><Clock size={12} className="text-gray-400"/>{relative(detail.createdAt)}</span>
            </div>
            <div className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{detail.description}</div>
            {detail.photoUrls.length>0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.photoUrls.map((p,i)=>(<img key={i} src={p} alt={`Missing photo ${i+1}`} className="h-20 w-full object-cover rounded" />))}
              </div>
            )}
            <div className="space-y-3 pt-2">
              {detail.status==='missing' && (
                <button onClick={()=>{ onMarkFound && onMarkFound(detail.id); setDetail(null); }} className="h-10 rounded-md w-full bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-2"><CheckCircle2 size={16}/> Mark Found</button>
              )}
              {detail.status==='resolved' && <div className="text-[11px] text-green-600 font-medium">Resolved.</div>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Missings;
