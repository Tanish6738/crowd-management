import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Layers, Map as MapIcon, TrendingUp, Users as UsersIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts';

// Contracts reference
// type ZoneOccupancy = { zoneId:string; name:string; occupancyPct:number; capacity:number; status:'normal'|'busy'|'critical'|'closed'; deltaPct:number; lastUpdated:string }
// type GateCount = { gateId:string; name:string; in:number; out:number; ts:string }

const statusColor = (s) => ({ normal:'bg-green-500', busy:'bg-yellow-400', critical:'bg-red-600', closed:'bg-gray-800' }[s] || 'bg-gray-400');

const CrowdAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zones, setZones] = useState([]); // ZoneOccupancy[]
  const [trend, setTrend] = useState([]); // occupancy history per selected/all
  const [gateCounts, setGateCounts] = useState([]); // GateCount[]
  const [zoneFilter, setZoneFilter] = useState('all');
  const [windowMins, setWindowMins] = useState(30); // 15 | 30 | 60
  const [layer, setLayer] = useState('zones'); // zones | gates

  // Initial fetch simulation ------------------------------------------------
  useEffect(() => {
    setLoading(true); setError(null);
    const to = setTimeout(() => {
      const now = Date.now();
      const seedZones = ['Gate A','Riverbank','Transit Hub','Food Court','North Camp','South Gate'].map((n,i)=>{
        const occ = 30 + Math.floor(Math.random()*70);
        let status = 'normal';
        if (occ >= 85) status='critical'; else if (occ >= 65) status='busy'; else if (occ <= 5) status='closed';
        return { zoneId:'z'+(i+1), name:n, occupancyPct:occ, capacity:100, status, deltaPct: (Math.random()*10 -5), lastUpdated:new Date().toISOString() };
      });
      const seedTrend = Array.from({ length: 30 }).map((_,i)=> ({
        minute: i, // ascending time index
        ...seedZones.reduce((acc,z)=> { acc[z.zoneId] = Math.max(0, Math.min(100, z.occupancyPct + (Math.sin((i/5)+parseInt(z.zoneId.slice(1))) * 8))); return acc; }, {})
      }));
      const seedGates = ['Gate A','Gate B','Gate C','Gate D'].map((g,i)=> ({ gateId:'g'+(i+1), name:g, in: 200 + Math.floor(Math.random()*120), out: 180 + Math.floor(Math.random()*110), ts: new Date(now - i*300000).toISOString() }));
      setZones(seedZones);
      setTrend(seedTrend);
      setGateCounts(seedGates);
      setLoading(false);
    }, 600);
    return () => clearTimeout(to);
  }, [windowMins]);

  // WebSocket simulation for zone occupancy updates ------------------------
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setZones(prev => prev.map(z => {
        const delta = (Math.random()*8)-4;
        const nextOcc = Math.max(0, Math.min(100, z.occupancyPct + delta));
        let status = 'normal';
        if (nextOcc >= 85) status='critical'; else if (nextOcc >= 65) status='busy'; else if (nextOcc <= 5) status='closed';
        return { ...z, occupancyPct: nextOcc, status, deltaPct: delta, lastUpdated: new Date().toISOString() };
      }));
      setTrend(prev => {
        const newest = { minute: prev.length ? prev[prev.length-1].minute + 1 : 0 };
        zones.forEach(z => { newest[z.zoneId] = z.occupancyPct; });
        const arr = [...prev, newest];
        return arr.slice(-30);
      });
    }, 10000);
    return () => clearInterval(iv);
  }, [loading, zones]);

  const zoneOptions = useMemo(() => ['all', ...zones.map(z=>z.zoneId)], [zones]);
  const selectedZone = zones.find(z => z.zoneId === zoneFilter);

  const lineData = useMemo(() => {
    if (!trend.length) return [];
    if (zoneFilter==='all') return trend.map(t => ({ minute: t.minute, ...zones.reduce((acc,z)=> { acc[z.name] = t[z.zoneId]; return acc; }, {}) }));
    return trend.map(t => ({ minute: t.minute, [selectedZone?.name || 'Zone']: t[zoneFilter] }));
  }, [trend, zoneFilter, zones, selectedZone]);

  const gateBarData = useMemo(() => gateCounts.map(gc => ({ name: gc.name, In: gc.in, Out: gc.out })), [gateCounts]);

  const loadingBars = <div className="space-y-2">{Array.from({length:6}).map((_,i)=>(<div key={i} className="h-10 rounded-md bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />))}</div>;
  const emptyState = <div className="p-6 text-sm text-gray-500 text-center border border-dashed border-gray-300 rounded-lg bg-white">No data available yet.</div>;
  const errorBanner = <div className="p-4 bg-red-50 text-red-700 text-sm flex items-center justify-between rounded border border-red-200">Error loading analytics <button onClick={()=>window.location.reload()} className="px-2 py-1 rounded bg-red-600 text-white text-xs">Retry</button></div>;

  return (
    <div className="space-y-8" aria-label="Crowd Analytics">
      <div className="flex flex-wrap gap-3 items-center">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Activity size={16} className="text-orange-600"/> Crowd Analytics</h2>
        <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500">
          {zoneOptions.map(z => <option key={z} value={z}>{z==='all' ? 'All Zones' : zones.find(x=>x.zoneId===z)?.name}</option>)}
        </select>
        <div className="flex gap-1 border border-gray-300 rounded-md overflow-hidden">
          {[15,30,60].map(w => <button key={w} onClick={()=>setWindowMins(w)} className={`px-2 py-1 text-xs ${windowMins===w ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50'}`}>{w}m</button>)}
        </div>
        <div className="flex gap-1 border border-gray-300 rounded-md overflow-hidden ml-auto">
          {['zones','gates'].map(l => <button key={l} onClick={()=>setLayer(l)} className={`px-2 py-1 text-xs capitalize inline-flex items-center gap-1 ${layer===l ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-orange-50'}`}>{l==='zones'? <Layers size={14}/> : <MapIcon size={14}/>}{l}</button>)}
        </div>
      </div>
      {error && errorBanner}
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1"><UsersIcon size={12}/> Zone Occupancy</h3>
            {loading ? loadingBars : zones.length===0 ? emptyState : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {zones.map(z => (
                    <motion.li key={z.zoneId} layout initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-6}} className="group">
                      <button className="w-full flex items-center gap-3 text-left p-2 rounded-md hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500" onClick={()=>setZoneFilter(z.zoneId)}>
                        <span className={`w-2.5 h-2.5 rounded-full ${statusColor(z.status)}`} aria-label={z.status} />
                        <span className="flex-1 text-xs font-medium text-gray-800 truncate">{z.name}</span>
                        <span className="text-xs tabular-nums font-semibold text-gray-700">{z.occupancyPct.toFixed(0)}%</span>
                        <span className={`text-[10px] font-medium ${z.deltaPct >=0 ? 'text-green-600' : 'text-red-600'}`}>{z.deltaPct >=0 ? '+' : ''}{z.deltaPct.toFixed(1)}%</span>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1"><MapIcon size={12}/> Heatmap Preview</h3>
            <div className="relative h-48 rounded-md overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[11px] text-gray-600">
              {layer==='zones' ? 'Zones Layer (placeholder)' : 'Gates Layer (placeholder)'}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-6 gap-1 p-1 opacity-70">
                {zones.map(z => (
                  <div key={z.zoneId} className={`rounded ${statusColor(z.status)} flex items-center justify-center text-[9px] text-white font-medium`}>{Math.round(z.occupancyPct)}%</div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-[260px]">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1"><TrendingUp size={12}/> Occupancy Trend</h3>
            {loading ? <div className="h-[180px] rounded-md bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" /> : lineData.length===0 ? emptyState : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="minute" hide tick={{ fontSize: 10 }} />
                  <YAxis domain={[0,100]} tick={{ fontSize: 10 }} />
                  <Tooltip wrapperClassName="text-xs" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {zoneFilter==='all' ? zones.map(z => <Line key={z.zoneId} type="monotone" dataKey={z.name} strokeWidth={2} stroke={z.status==='critical' ? '#dc2626' : z.status==='busy' ? '#f59e0b' : '#10b981'} dot={false} />)
                    : <Line type="monotone" dataKey={selectedZone?.name} stroke="#2563eb" strokeWidth={2} dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-[260px]">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1"><Layers size={12}/> Gate In / Out</h3>
            {loading ? <div className="h-[180px] rounded-md bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gateBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip wrapperClassName="text-xs" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="In" fill="#16a34a" radius={[4,4,0,0]} />
                  <Bar dataKey="Out" fill="#f97316" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrowdAnalytics;
