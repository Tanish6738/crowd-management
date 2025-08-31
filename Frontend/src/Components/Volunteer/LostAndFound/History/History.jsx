import React, { useMemo, useState } from 'react';
import Drawer from '../../../General/Drawer';
import { Clock, Filter, MapPin } from 'lucide-react';
import { StatusBadge } from '../LostAndFound';

/* Activity entry: { id, caseId, action, type, zone, date, status } */

const relative = iso => { const d=Date.now()-new Date(iso).getTime(); const m=Math.floor(d/60000); if(m<1) return 'just now'; if(m<60) return m+'m'; const h=Math.floor(m/60); if(h<24) return h+'h'; const da=Math.floor(h/24); return da+'d'; };

const History = ({ data, loading }) => {
  const [detail, setDetail] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // '24h' | '7d' | ''

  const filtered = useMemo(()=>{
    let rows = data;
    if(actionFilter) rows = rows.filter(r => r.action===actionFilter);
    if(dateFilter){
      const now = Date.now();
      if(dateFilter==='24h') rows = rows.filter(r => now - new Date(r.date).getTime() <= 24*3600_000);
      if(dateFilter==='7d') rows = rows.filter(r => now - new Date(r.date).getTime() <= 7*24*3600_000);
    }
    return [...rows].sort((a,b)=> new Date(b.date)-new Date(a.date));
  }, [data, actionFilter, dateFilter]);

  return (
    <div className="space-y-4" aria-label="Activity history">
      <div className="flex flex-wrap gap-3 items-center text-[11px]">
        <div className="flex items-center gap-1 text-gray-600"><Filter size={14}/> Filters:</div>
        <select value={actionFilter} onChange={e=>setActionFilter(e.target.value)} className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11px] focus:ring-2 focus:ring-orange-500">
          <option value="">All Actions</option>
          <option value="Reported">Reported</option>
          <option value="Found Logged">Found Logged</option>
          <option value="Resolved">Resolved</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="h-8 rounded-md border border-gray-300 bg-white px-2 text-[11px] focus:ring-2 focus:ring-orange-500">
          <option value="">All Time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
        </select>
        {(actionFilter || dateFilter) && <button onClick={()=>{ setActionFilter(''); setDateFilter(''); }} className="text-[10px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200">Clear</button>}
      </div>

      <div className="hidden md:grid grid-cols-12 text-[11px] font-semibold text-gray-600 px-3">
        <div className="col-span-2">Case ID</div>
        <div className="col-span-2">Action</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Zone</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-2">Status</div>
      </div>
      <div className="space-y-2 hidden md:block">
        {loading && Array.from({length:6}).map((_,i)=>(<div key={i} className="h-10 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse"/>))}
        {!loading && filtered.length===0 && <div className="p-8 text-center text-xs text-gray-500 bg-white border rounded-lg">No activity.</div>}
        {!loading && filtered.map(r => (
          <div key={r.id} role="button" tabIndex={0} onClick={()=>setDetail(r)} onKeyDown={e=>{ if(e.key==='Enter') setDetail(r); }} className="grid grid-cols-12 items-center bg-white border border-gray-200 rounded-md px-3 py-2 text-[11px] hover:border-orange-400 cursor-pointer">
            <div className="col-span-2 font-mono truncate" title={r.caseId}>{r.caseId}</div>
            <div className="col-span-2">{r.action}</div>
            <div className="col-span-2 capitalize">{r.type}</div>
            <div className="col-span-2">{r.zone}</div>
            <div className="col-span-2 flex items-center gap-1"><Clock size={12} className="text-gray-400"/>{relative(r.date)}</div>
            <div className="col-span-2"><StatusBadge value={r.status} /></div>
          </div>
        ))}
      </div>

      {/* Mobile accordion style */}
      <div className="md:hidden space-y-3">
        {loading && Array.from({length:5}).map((_,i)=>(<div key={i} className="h-20 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse"/>))}
        {!loading && filtered.length===0 && <div className="p-8 text-center text-xs text-gray-500 bg-white border rounded-lg">No activity.</div>}
        {!loading && filtered.map(r => (
          <div key={r.id} role="button" tabIndex={0} onClick={()=>setDetail(r)} onKeyDown={e=>{ if(e.key==='Enter') setDetail(r); }} className="bg-white border border-gray-200 hover:border-orange-400 rounded-lg p-3 flex flex-col gap-2 text-[11px] cursor-pointer">
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-gray-500">{r.caseId}</span>
              <StatusBadge value={r.status} />
            </div>
            <div className="font-medium">{r.action}</div>
            <div className="flex flex-wrap gap-2 text-gray-600">
              <span className="inline-flex items-center gap-1 capitalize">{r.type}</span>
              <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-gray-400"/>{r.zone}</span>
              <span className="inline-flex items-center gap-1"><Clock size={12} className="text-gray-400"/>{relative(r.date)}</span>
            </div>
          </div>
        ))}
      </div>

  <Drawer open={!!detail} onClose={()=>setDetail(null)} title={detail? 'Activity '+detail.caseId:''}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1"><Clock size={12} className="text-gray-400"/>{relative(detail.date)}</span>
            </div>
            <div className="text-xs text-gray-700">Action: <span className="font-medium">{detail.action}</span></div>
            <div className="text-xs text-gray-700">Type: {detail.type}</div>
            <div className="text-xs text-gray-700">Zone: {detail.zone}</div>
            <div className="text-xs text-gray-700">Status: {detail.status}</div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default History;
