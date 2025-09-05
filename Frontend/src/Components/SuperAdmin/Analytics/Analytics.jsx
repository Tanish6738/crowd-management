import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import MetricCard from "../../General/MetricCard";
import ChartCard from "../../General/ChartCard";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  AlertTriangle,
  Activity,
  Users,
  HardDrive,
  Gauge,
  Filter,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (JSDoc for editor intellisense)
/** @typedef {{ tenants:number; activeUsers24h:number; camerasOnlinePct:number; alerts24h:number; embeddingsPerSec:number; }} AnalyticsSummary */
/** @typedef {{ date:string; low:number; medium:number; high:number; critical:number; }} AlertTrend */
/** @typedef {{ ts:string; embeddingsPerSec:number; matchesPerSec:number; }} ThroughputPoint */
/** @typedef {{ tenant:string; users:number; alerts24h:number; cameras:number; storageGB:number; lastActivity:string; }} TenantUsage */
/** @typedef {{ month:string; admins:number; volunteers:number; pilgrims:number; }} UserGrowth */

// Utility ------------------------------------------------------------------
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const dateDaysAgo = (d) => {
  const dt = new Date(Date.now() - d * 86400000);
  return dt.toISOString().slice(0, 10);
};
const monthsBack = (n) => {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(dt.toISOString().slice(0, 7));
  }
  return out;
};

// Skeleton components -------------------------------------------------------
const SkeletonBar = ({ className = "" }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 rounded ${className}`}
  />
);
const LoadingState = () => (
  <div className="space-y-6" aria-label="Loading analytics">
    <div className="grid md:grid-cols-5 gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonBar key={i} className="h-24" />
      ))}
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonBar key={i} className="h-[300px]" />
      ))}
    </div>
    <SkeletonBar className="h-80" />
  </div>
);

// Main Component -----------------------------------------------------------
const Analytics = () => {
  // Filters
  const [dateRange, setDateRange] = useState("24h"); // 24h | 7d | 30d
  const [tenantFilter, setTenantFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Data state
  const [summary, setSummary] = useState(
    /** @type {AnalyticsSummary|null} */ (null)
  );
  const [alertsTrend, setAlertsTrend] = useState(
    /** @type {AlertTrend[]} */ ([])
  );
  const [throughput, setThroughput] = useState(
    /** @type {ThroughputPoint[]} */ ([])
  );
  const [tenantUsage, setTenantUsage] = useState(
    /** @type {TenantUsage[]} */ ([])
  );
  const [userGrowth, setUserGrowth] = useState(
    /** @type {UserGrowth[]} */ ([])
  );

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ key: "alerts24h", dir: "desc" });

  // Virtualization for tenant table
  const tableContainerRef = useRef(null);
  const rowHeight = 44; // px
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = () => {
    if (!tableContainerRef.current) return;
    setScrollTop(tableContainerRef.current.scrollTop);
  };

  // Fetch simulation -------------------------------------------------------
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate network concurrency
      await new Promise((r) => setTimeout(r, 650));
      // Summary
      const summaryData = {
        tenants: 24,
        activeUsers24h: randomInt(320, 410),
        camerasOnlinePct: 92 + Math.random() * 4,
        alerts24h: randomInt(180, 240),
        embeddingsPerSec: randomInt(1400, 1900),
      };
      // Alerts Trend (7 days always for stacked chart context)
      const alertsTrendData = Array.from({ length: 7 }).map((_, i) => ({
        date: dateDaysAgo(6 - i),
        low: randomInt(40, 70),
        medium: randomInt(20, 40),
        high: randomInt(8, 18),
        critical: randomInt(1, 6),
      }));
      // Throughput series (points depend on dateRange)
      const points = dateRange === "24h" ? 24 : dateRange === "7d" ? 7 : 30;
      const throughputData = Array.from({ length: points }).map((_, i) => ({
        ts:
          dateRange === "24h"
            ? `${i.toString().padStart(2, "0")}:00`
            : dateDaysAgo(points - 1 - i),
        embeddingsPerSec: randomInt(1200, 1900),
        matchesPerSec: randomInt(45, 110),
      }));
      // Tenant usage list
      const tenants = [
        "Kumbh Core",
        "Riverbank Ops",
        "North Camp",
        "Transit Hub",
        "Gate Control",
        "Pilgrim Aid",
        "Lost&Found",
        "Food Dist",
        "Medical Ops",
        "Shelter Grid",
        "South Camp",
        "West Camp",
      ];
      const usageData = tenants.map((t) => ({
        tenant: t,
        users: randomInt(20, 160),
        alerts24h: randomInt(2, 45),
        cameras: randomInt(10, 85),
        storageGB: randomInt(50, 800),
        lastActivity: randomInt(1, 59) + "m ago",
      }));
      // User growth over months
      const months = monthsBack(dateRange === "30d" ? 6 : 4);
      const growthData = months.map((m) => ({
        month: m,
        admins: randomInt(10, 30),
        volunteers: randomInt(50, 120),
        pilgrims: randomInt(400, 900),
      }));
      setSummary(summaryData);
      setAlertsTrend(alertsTrendData);
      setThroughput(throughputData);
      setTenantUsage(usageData);
      setUserGrowth(growthData);
      setLoading(false);
    } catch (e) {
      setError("Failed to load analytics.");
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Real-time simulation (WS patching)
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setSummary((s) =>
        s
          ? {
              ...s,
              embeddingsPerSec: Math.max(
                900,
                Math.round(s.embeddingsPerSec + randomInt(-60, 60))
              ),
              alerts24h: Math.max(0, s.alerts24h + randomInt(-5, 5)),
            }
          : s
      );
      setThroughput((tp) =>
        tp.length
          ? [
              ...tp.slice(1),
              {
                ...tp[tp.length - 1],
                embeddingsPerSec: randomInt(1200, 1900),
                matchesPerSec: randomInt(40, 110),
              },
            ]
          : tp
      );
    }, 30000); // 30s
    return () => clearInterval(iv);
  }, [loading]);

  // Derived / filtered -----------------------------------------------------
  const sortedUsage = useMemo(() => {
    const arr = [...tenantUsage];
    arr.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [tenantUsage, sort]);

  const tenantOptions = useMemo(
    () => ["all", ...tenantUsage.map((t) => t.tenant)],
    [tenantUsage]
  );
  const roleOptions = ["all", "admins", "volunteers", "pilgrims"];

  const filteredGrowth = useMemo(() => {
    if (roleFilter === "all") return userGrowth;
    return userGrowth.map((g) => ({
      month: g.month,
      [roleFilter]: g[roleFilter],
    }));
  }, [roleFilter, userGrowth]);

  // Virtualized rows calculations
  const totalRows = sortedUsage.length;
  const containerHeight = 440;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 4);
  const endIndex = Math.min(
    totalRows,
    startIndex + Math.ceil(containerHeight / rowHeight) + 8
  );
  const visibleRows = sortedUsage.slice(startIndex, endIndex);
  const offsetY = startIndex * rowHeight;

  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );

  // Render helpers ---------------------------------------------------------
  const metricCards = summary
    ? [
        { title: "Total Tenants", value: summary.tenants, icon: Activity },
        {
          title: "Active Users (24h)",
          value: summary.activeUsers24h,
          icon: Users,
        },
        {
          title: "Cameras Online %",
          value: summary.camerasOnlinePct.toFixed(1) + "%",
          icon: Gauge,
        },
        {
          title: "Alerts Triggered (24h)",
          value: summary.alerts24h,
          icon: AlertTriangle,
        },
        {
          title: "Embeddings/sec",
          value: summary.embeddingsPerSec,
          icon: HardDrive,
        },
      ]
    : [];

  const empty = !loading && !error && (!summary || !tenantUsage.length);

  return (
    <div
      className="space-y-8 mk-text-secondary"
      aria-label="Platform Analytics"
    >
      {/* Filters Row */}
  <div className="flex flex-wrap gap-2 items-center text-xs mk-panel p-3 sm:p-4 rounded-xl border border-transparent">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold mk-text-primary flex items-center gap-1 tracking-wide">
            <Filter size={14} className="text-[var(--mk-accent)]" />
            Filters:
          </span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-8 mk-subtle px-2 focus:outline-none focus:border-[var(--mk-accent)] bg-transparent"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
          <select
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="h-8 mk-subtle px-2 focus:outline-none focus:border-[var(--mk-accent)] bg-transparent"
          >
            {tenantOptions.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All Tenants" : t}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 mk-subtle px-2 focus:outline-none focus:border-[var(--mk-accent)] bg-transparent"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All Roles" : r}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchAll}
          className="ml-auto h-8 px-3 rounded-full bg-[var(--mk-accent)] hover:bg-[var(--mk-accent-strong)] text-[#09121f] font-semibold flex items-center gap-1 shadow-[0_4px_14px_-4px_rgba(255,143,42,0.6)] focus:outline-none focus-visible:shadow-[var(--mk-focus-ring)]"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Loading / Error / Empty States */}
      {loading && <LoadingState />}
      {!loading && error && (
        <div className="p-4 rounded-md bg-[rgba(255,92,108,0.15)] border border-[var(--mk-danger)]/40 text-sm text-[var(--mk-danger)] flex justify-between items-center mk-panel">
          <span>{error}</span>
          <button
            onClick={fetchAll}
            className="underline hover:text-[var(--mk-text-primary)]"
          >
            Retry
          </button>
        </div>
      )}
      {empty && (
        <div className="p-10 text-center text-sm mk-text-muted border rounded-lg mk-panel">
          No analytics data for this period.
        </div>
      )}

      {/* Metric Cards */}
      {!loading && !error && !empty && (
        <div className="grid gap-3 md:grid-cols-5 sm:grid-cols-3 grid-cols-2">
          {metricCards.map((m) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MetricCard title={m.title} value={m.value} icon={m.icon} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Charts */}
      {!loading && !error && !empty && (
        <div className="grid xl:grid-cols-2 gap-6">
          <ChartCard
            title="Alerts by Severity"
            description="Last 7 days"
            aria-label="Alerts by Severity stacked bar"
            className="h-[320px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={alertsTrend}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mk-muted)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip wrapperClassName="text-xs" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="low"
                  stackId="a"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="medium" stackId="a" fill="#f59e0b" />
                <Bar dataKey="high" stackId="a" fill="#dc2626" />
                <Bar dataKey="critical" stackId="a" fill="#7f1d1d" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard
            title="System Throughput"
            description="Embeddings & Matches"
            aria-label="System Throughput"
            className="h-[320px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={throughput}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mk-muted)" />
                <XAxis dataKey="ts" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip wrapperClassName="text-xs" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="embeddingsPerSec"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="matchesPerSec"
                  stroke="#f97316"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard
            title="Tenant Usage Leaderboard"
            description="Top tenants"
            aria-label="Tenant usage leaderboard"
            className="h-[320px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...tenantUsage]
                  .sort((a, b) => b.alerts24h - a.alerts24h)
                  .slice(0, 6)}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mk-muted)" />
                <XAxis dataKey="tenant" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip wrapperClassName="text-xs" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="cameras" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="alerts24h" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="users" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard
            title="User Growth"
            description="Role trends"
            aria-label="User growth by role"
            className="h-[320px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredGrowth}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--mk-muted)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip wrapperClassName="text-xs" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {roleFilter === "all" && (
                  <Line
                    type="monotone"
                    dataKey="admins"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                )}
                {roleFilter === "all" && (
                  <Line
                    type="monotone"
                    dataKey="volunteers"
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                )}
                {roleFilter === "all" && (
                  <Line
                    type="monotone"
                    dataKey="pilgrims"
                    stroke="#f97316"
                    strokeWidth={2}
                  />
                )}
                {roleFilter !== "all" && (
                  <Line
                    type="monotone"
                    dataKey={roleFilter}
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Tenant Comparison Table */}
      {!loading && !error && !empty && (
        <div
          className="mk-panel rounded-xl"
          aria-label="Tenant comparison table"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b mk-divider">
            <h3 className="text-sm font-semibold mk-text-primary tracking-wide">
              Tenant Comparison
            </h3>
            <div className="text-[11px] mk-text-muted">
              Sorted by {sort.key} {sort.dir}
            </div>
          </div>
          <div
            ref={tableContainerRef}
            onScroll={handleScroll}
            style={{ maxHeight: containerHeight }}
            className="overflow-auto relative"
          >
            <table className="min-w-full text-xs mk-table-zebra">
              <thead className="sticky top-0 bg-[rgba(255,255,255,0.05)] backdrop-blur z-10 mk-text-muted">
                <tr>
                  {[
                    "tenant",
                    "users",
                    "alerts24h",
                    "cameras",
                    "storageGB",
                    "lastActivity",
                  ].map((col) => (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      className="px-3 py-2 text-left cursor-pointer select-none font-semibold text-[10px] uppercase tracking-[1.3px] mk-text-secondary/80"
                    >
                      {col === "tenant"
                        ? "Tenant"
                        : col === "users"
                          ? "Active Users"
                          : col === "alerts24h"
                            ? "Alerts (24h)"
                            : col === "cameras"
                              ? "Cameras"
                              : col === "storageGB"
                                ? "Storage (GB)"
                                : "Last Activity"}
                      {sort.key === col && (
                        <span className="ml-1 text-[var(--mk-accent)]">
                          {sort.dir === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ position: "relative" }}>
                <tr style={{ height: offsetY }} aria-hidden="true">
                  <td colSpan={6} className="p-0" />
                </tr>
                {visibleRows.map((r) => (
                  <tr
                    key={r.tenant}
                    className="mk-row-hover-accent transition-colors"
                  >
                    <td className="px-3 py-2 font-medium mk-text-secondary">
                      {r.tenant}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{r.users}</td>
                    <td className="px-3 py-2 tabular-nums">{r.alerts24h}</td>
                    <td className="px-3 py-2 tabular-nums">{r.cameras}</td>
                    <td className="px-3 py-2 tabular-nums">{r.storageGB}</td>
                    <td className="px-3 py-2 mk-text-muted">
                      {r.lastActivity}
                    </td>
                  </tr>
                ))}
                <tr
                  style={{ height: (totalRows - endIndex) * rowHeight }}
                  aria-hidden="true"
                >
                  <td colSpan={6} className="p-0" />
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-[11px] mk-text-muted flex justify-between border-t mk-divider">
            <span>
              Total Tenants:{" "}
              <span className="mk-text-secondary font-semibold">
                {totalRows}
              </span>
            </span>
            <span>
              Showing {startIndex + 1}-{endIndex}
            </span>
          </div>
        </div>
      )}

      {/* Accessibility alt text / numeric summary */}
      {!loading && !error && !empty && (
        <div
          className="text-[11px] mk-text-muted space-y-2"
          aria-label="Analytics summary description"
        >
          <p>
            Embeddings throughput currently averaging{" "}
            <span className="mk-text-secondary font-semibold">
              {summary.embeddingsPerSec}
            </span>{" "}
            per second with{" "}
            <span className="mk-text-secondary font-semibold">
              {summary.alerts24h}
            </span>{" "}
            alerts generated in the last 24 hours across{" "}
            <span className="mk-text-secondary font-semibold">
              {summary.tenants}
            </span>{" "}
            tenants.
          </p>
        </div>
      )}
    </div>
  );
};

export default Analytics;

/* Integration Notes:
In SuperAdminDashboard.jsx:
  import Analytics from './Analytics/Analytics';
  Ensure sidebar includes { key:'analytics', label:'Analytics' } (already present) and render:
    {activeTab==='analytics' && <Analytics />}
Remove old inline analytics code to avoid duplication.
*/
