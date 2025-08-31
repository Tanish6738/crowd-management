import React, { useMemo, useState } from 'react';
import { Clock, MapPin, Pencil, XCircle, Save, Image as ImageIcon } from 'lucide-react';
import { StatusBadge } from '../LostAndFound';
import Drawer from '../../../General/Drawer';

/** @typedef {{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'missing'|'cancelled'; createdAt:string; reporterId:string; matchedWith?:string; resolvedAt?:string }} LostCase */

const relative = iso => { const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; const da=Math.floor(h/24); return da+'d'; };

const MyReports = ({ data, loading, onUpdate, onCancel }) => {
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editPhotos, setEditPhotos] = useState([]);

  const sorted = useMemo(()=>[...data].sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)), [data]);

  const startEdit = () => {
    if(!detail) return; setEditing(true); setEditDescription(detail.description); setEditPhotos([]);
  };
  const saveEdit = () => {
    if(!detail) return; onUpdate && onUpdate(detail.id, old => ({ ...old, description: editDescription.trim() })); setEditing(false);
  };
  const cancelReport = () => { if(!detail) return; onCancel && onCancel(detail.id); setDetail(null); };

  return (
    <div aria-label="My lost reports" className="space-y-4">
      <div className="hidden md:grid grid-cols-12 text-[11px] font-semibold text-gray-600 px-3">{/* header */}
        <div className="col-span-2">Case ID</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-3">Status</div>
        <div className="col-span-3">Created</div>
        <div className="col-span-2 text-right pr-2">Location</div>
      </div>
      <div className="space-y-2 hidden md:block">
        {loading && Array.from({length:4}).map((_,i)=>(<div key={i} className="h-12 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse"/>))}
        {!loading && sorted.length===0 && <div className="p-8 text-center text-xs text-gray-500 bg-white border rounded-lg">No reports yet.</div>}
        {!loading && sorted.map(r => (
          <div key={r.id} role="button" tabIndex={0} onClick={()=>setDetail(r)} onKeyDown={e=>{ if(e.key==='Enter') setDetail(r); }} className="grid grid-cols-12 items-center bg-white border border-gray-200 rounded-md px-3 py-2 text-[11px] hover:border-orange-400 cursor-pointer">
            <div className="col-span-2 font-mono truncate" title={r.id}>{r.id}</div>
            <div className="col-span-2 capitalize">{r.type}</div>
            <div className="col-span-3"><StatusBadge value={r.status} /></div>
            <div className="col-span-3 flex items-center gap-1"><Clock size={12} className="text-gray-400"/>{relative(r.createdAt)}</div>
            <div className="col-span-2 text-right font-medium text-gray-700">{r.location}</div>
          </div>
        ))}
      </div>
      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading && Array.from({length:4}).map((_,i)=>(<div key={i} className="h-24 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse"/>))}
        {!loading && sorted.length===0 && <div className="p-8 text-center text-xs text-gray-500 bg-white border rounded-lg">No reports yet.</div>}
        {!loading && sorted.map(r => (
          <div key={r.id} role="button" tabIndex={0} onClick={()=>setDetail(r)} onKeyDown={e=>{ if(e.key==='Enter') setDetail(r); }} className="bg-white border border-gray-200 hover:border-orange-400 rounded-lg p-3 flex flex-col gap-2 text-[11px] cursor-pointer">
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-gray-500">{r.id}</span>
              <StatusBadge value={r.status} />
            </div>
            <div className="font-medium capitalize">{r.type}</div>
            <div className="flex items-center gap-2 text-gray-600">
              <span className="inline-flex items-center gap-1"><Clock size={12} className="text-gray-400"/>{relative(r.createdAt)}</span>
              <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-gray-400"/>{r.location}</span>
            </div>
          </div>
        ))}
      </div>
  <Drawer open={!!detail} onClose={()=>{ setDetail(null); setEditing(false); }} title={detail? (editing? 'Editing ':'Report ')+detail.id:''}>
        {detail && (
          <div className="space-y-4 text-sm">
            {!editing && <div className="text-xs text-gray-700 whitespace-pre-wrap">{detail.description}</div>}
            {editing && (
              <div className="space-y-2">
                <textarea rows={4} value={editDescription} onChange={e=>setEditDescription(e.target.value)} className="w-full rounded-md border border-gray-300 p-2 resize-none focus:ring-2 focus:ring-orange-500 focus:outline-none" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex-1 h-9 rounded-md bg-green-600 text-white text-xs font-medium flex items-center justify-center gap-2"><Save size={14}/> Save</button>
                  <button onClick={()=>setEditing(false)} className="flex-1 h-9 rounded-md bg-gray-200 text-gray-700 text-xs font-medium">Cancel</button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1"><Clock size={12} className="text-gray-400"/>{relative(detail.createdAt)}</span>
              <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-gray-400"/>{detail.location}</span>
            </div>
            {detail.photoUrls.length>0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.photoUrls.map((p,i)=>(<img key={i} src={p} alt={`Report photo ${i+1}`} className="h-20 w-full object-cover rounded" />))}
              </div>
            )}
            {detail.status==='open' && !editing && (
              <div className="flex gap-2 pt-2">
                <button onClick={startEdit} className="flex-1 h-9 rounded-md bg-blue-600 text-white text-xs font-medium flex items-center justify-center gap-2"><Pencil size={14}/> Edit</button>
                <button onClick={cancelReport} className="flex-1 h-9 rounded-md bg-red-600 text-white text-xs font-medium flex items-center justify-center gap-2"><XCircle size={14}/> Cancel</button>
              </div>
            )}
          </div>
        )}
      </Drawer>
      {/* Desktop side detail if desired future */}
    </div>
  );
};

export default MyReports;
