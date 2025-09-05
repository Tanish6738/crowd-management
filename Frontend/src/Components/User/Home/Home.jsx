import React from "react";
import { Clock } from "lucide-react";

const Card = ({ children, className = "" }) => (
  <div className={`mk-card mk-surface-alt backdrop-blur-sm shadow-sm ${className}`}>{children}</div>
);
const StatCard = ({ label, value }) => (
  <Card className="p-4 flex flex-col gap-1">
  <span className="text-[11px] uppercase tracking-wide mk-text-faint font-semibold">{label}</span>
  <span className="text-lg font-semibold mk-text-primary">{value}</span>
  </Card>
);

const Home = ({ stats, recent }) => {
  return (
  <div className="space-y-6 mk-text-secondary" aria-label="Home overview">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Reports" value={stats.total} />
        <StatCard label="Open Cases" value={stats.open} />
        <StatCard label="Resolved" value={stats.resolved} />
      </div>
      <div className="space-y-3">
        <h3 className="text-xs font-semibold mk-text-faint uppercase tracking-wide">Recent Activity</h3>
        <Card className="divide-y divide-white/5">
          {recent.length === 0 && (
            <div className="p-4 text-xs mk-text-faint">No recent activity.</div>
          )}
          {recent.map((a, i) => (
            <div key={i} className="p-3 text-xs flex items-center gap-2 mk-hover-row rounded-md transition">
              <Clock size={12} className="mk-text-fainter" />
              <span className="flex-1 mk-text-faint">{a.label}</span>
              <span className="text-[10px] mk-text-fainter">{a.time}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};
export default Home;
