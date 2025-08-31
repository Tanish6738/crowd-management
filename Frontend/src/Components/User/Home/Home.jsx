import React from "react";
import { Clock } from "lucide-react";

const Card = ({ children, className = "" }) => (
  <div className={`rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm shadow-sm ${className}`}>{children}</div>
);
const StatCard = ({ label, value }) => (
  <Card className="p-4 flex flex-col gap-1">
    <span className="text-[11px] uppercase tracking-wide text-white/50 font-semibold">{label}</span>
    <span className="text-lg font-semibold text-white">{value}</span>
  </Card>
);

const Home = ({ stats, recent }) => {
  return (
  <div className="space-y-6 text-white/90" aria-label="Home overview">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Reports" value={stats.total} />
        <StatCard label="Open Cases" value={stats.open} />
        <StatCard label="Resolved" value={stats.resolved} />
      </div>
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wide">Recent Activity</h3>
        <Card className="divide-y divide-white/5">
          {recent.length === 0 && (
            <div className="p-4 text-xs text-white/50">No recent activity.</div>
          )}
          {recent.map((a, i) => (
            <div key={i} className="p-3 text-xs flex items-center gap-2 hover:bg-white/5 rounded-md transition">
              <Clock size={12} className="text-white/40" />
              <span className="flex-1 text-white/80">{a.label}</span>
              <span className="text-[10px] text-white/50">{a.time}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};
export default Home;
