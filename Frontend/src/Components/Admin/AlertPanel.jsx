import React, { useState } from 'react';

const severityColor = (s) => ({ Low: 'bg-gray-400', Medium: 'bg-yellow-500', High: 'bg-orange-500', Critical: 'bg-red-600' }[s] || 'bg-gray-300');

const AlertPanel = ({ activeAlerts, historyAlerts, onAck, onResolve }) => {
  const [tab, setTab] = useState('active');
  const list = tab === 'active' ? activeAlerts : historyAlerts;
  return (
    <aside className="flex flex-col h-full border-l border-gray-200 bg-white sm:w-80 md:w-96">
      <div className="px-4 pt-3 pb-2 border-b border-gray-200 flex gap-2 text-xs font-medium">
        <button onClick={() => setTab('active')} className={`px-3 py-1.5 rounded-md border ${tab==='active' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50'}`}>Active ({activeAlerts.length})</button>
        <button onClick={() => setTab('history')} className={`px-3 py-1.5 rounded-md border ${tab==='history' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50'}`}>History ({historyAlerts.length})</button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 text-xs">
        {list.length === 0 && <div className="p-4 text-gray-500">No alerts.</div>}
        {list.map(a => (
          <div key={a.id} className="p-3 flex flex-col gap-1 hover:bg-orange-50 transition">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${severityColor(a.severity)}`} aria-label={a.severity} />
              <span className="font-semibold text-gray-800 truncate">{a.type}</span>
              <span className="ml-auto text-[10px] text-gray-500">{a.timeAgo}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <span className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200">{a.zone}</span>
              {a.status && <span className="px-1.5 py-0.5 rounded bg-orange-100 border border-orange-200 text-orange-700">{a.status}</span>}
              <div className="ml-auto flex gap-2">
                {tab === 'active' && (
                  <>
                    <button onClick={() => onAck(a.id)} className="text-orange-600 hover:underline" aria-label="Acknowledge alert">Ack</button>
                    <button onClick={() => onResolve(a.id)} className="text-gray-600 hover:underline" aria-label="Resolve alert">Resolve</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default AlertPanel;
