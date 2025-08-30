import React from 'react';

const statusColor = (status) => {
  switch (status) {
    case 'Active': return 'bg-green-500';
    case 'Warning': return 'bg-orange-400';
    case 'Suspended': return 'bg-red-600';
    case 'Critical': return 'bg-red-700';
    default: return 'bg-gray-400';
  }
};

const StatusDot = ({ status, label }) => (
  <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs">
    <span className={`w-2.5 h-2.5 rounded-full ${statusColor(status)} ring-2 ring-white`} aria-hidden="true" />
    <span className="hidden md:inline text-gray-700">{label || status}</span>
    <span className="md:hidden uppercase font-medium text-gray-600">{(label || status).slice(0,3)}</span>
  </span>
);

export default StatusDot;
