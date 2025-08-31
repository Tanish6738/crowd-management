import React from "react";
import { Clock } from "lucide-react";

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}
  >
    {children}
  </div>
);
const StatCard = ({ label, value }) => (
  <Card className="p-4 flex flex-col gap-1">
    <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
      {label}
    </span>
    <span className="text-lg font-semibold text-gray-800">{value}</span>
  </Card>
);

const Home = ({ stats, recent }) => {
  return (
    <div className="space-y-6" aria-label="Home overview">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Reports" value={stats.total} />
        <StatCard label="Open Cases" value={stats.open} />
        <StatCard label="Resolved" value={stats.resolved} />
      </div>
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Recent Activity
        </h3>
        <Card className="divide-y divide-gray-100">
          {recent.length === 0 && (
            <div className="p-4 text-xs text-gray-500">No recent activity.</div>
          )}
          {recent.map((a, i) => (
            <div key={i} className="p-3 text-xs flex items-center gap-2">
              <Clock size={12} className="text-gray-400" />
              <span className="flex-1 text-gray-700">{a.label}</span>
              <span className="text-[10px] text-gray-500">{a.time}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};
export default Home;
