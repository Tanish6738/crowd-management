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
          <div key={r.id} role="button" tabIndex={0} onClick={()=>setDetail(r)} onKeyDown={e=>{ if(e.key==='Enter') setDetail(r); }} className={`grid grid-cols-12 items-center mk-border rounded-md px-3 py-2 text-[11px] cursor-pointer backdrop-blur-sm transition ${detail?.id===r.id? 'border-orange-400/60 bg-orange-50 dark:bg-white/10':'mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border'}`}>
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
          <div key={r.id} role="button" tabIndex={0} onClick={()=>setDetail(r)} onKeyDown={e=>{ if(e.key==='Enter') setDetail(r); }} className={`mk-border rounded-lg p-3 flex flex-col gap-2 text-[11px] cursor-pointer backdrop-blur-sm transition ${detail?.id===r.id? 'border-orange-400/60 bg-orange-50 dark:bg-white/10':'mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border'}`}>
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

  <Drawer open={!!detail} onClose={()=>setDetail(null)} title={detail? 'Activity '+detail.caseId:''}>
        {detail && (
          <div className="space-y-4 text-sm mk-text-secondary">
            <div className="flex flex-wrap gap-2 text-[10px] mk-text-muted">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1"><Clock size={12} className="mk-text-fainter"/>{relative(detail.date)}</span>
            </div>
            <div className="text-xs mk-text-secondary">Action: <span className="font-medium mk-text-primary">{detail.action}</span></div>
            <div className="text-xs mk-text-secondary">Type: {detail.type}</div>
            <div className="text-xs mk-text-secondary">Zone: {detail.zone}</div>
            <div className="text-xs mk-text-secondary">Status: {detail.status}</div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default History;
