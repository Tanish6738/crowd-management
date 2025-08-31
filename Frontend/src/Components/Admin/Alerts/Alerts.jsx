import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  AlertTriangle,
  Users,
  CameraOff,
  Siren,
  Search,
  Check,
  X,
  UserPlus,
  Filter,
  ClipboardCheck,
  Clock,
  MapPin,
  Info,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Trash2,
  BadgeCheck,
  Ban,
  Settings2,
  NotebookPen,
} from "lucide-react";

// Alert type contract reference (see spec)
// type Alert = { id:string; type:'overcrowding'|'lost_person_match'|'camera_offline'|'incident'|'sos'; severity:'low'|'medium'|'high'|'critical'; zoneName:string; ts:string; status:'new'|'ack'|'resolved'|'dismissed'; assignees:string[] };

// Design tokens -----------------------------------------------------------
const severityStyles = {
  low: "bg-emerald-400",
  medium: "bg-amber-400",
  high: "bg-orange-500",
  critical: "bg-red-600 animate-pulse",
};
const severityBgSoft = {
  low: "bg-emerald-50 text-emerald-600 border-emerald-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  high: "bg-orange-50 text-orange-600 border-orange-200",
  critical: "bg-red-50 text-red-600 border-red-200",
};
const statusBadgeStyles = {
  new: "bg-orange-100/80 text-orange-700 border-orange-200",
  ack: "bg-blue-100/80 text-blue-700 border-blue-200",
  resolved: "bg-green-100/80 text-green-700 border-green-200",
  dismissed: "bg-gray-100/80 text-gray-600 border-gray-200",
};

const TYPE_META = {
  overcrowding: {
    label: "Overcrowding",
    icon: Users,
    color: "text-orange-600",
  },
  lost_person_match: {
    label: "Lost Person Match",
    icon: Search,
    color: "text-indigo-600",
  },
  camera_offline: {
    label: "Camera Offline",
    icon: CameraOff,
    color: "text-gray-600",
  },
  incident: {
    label: "Incident",
    icon: AlertTriangle,
    color: "text-red-600",
  },
  sos: { label: "SOS", icon: Siren, color: "text-rose-600" },
};

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "overcrowding", label: "Overcrowding" },
  { value: "lost_person_match", label: "Lost Person Match" },
  { value: "camera_offline", label: "Camera Offline" },
  { value: "incident", label: "Incident" },
  { value: "sos", label: "SOS" },
];
const SEVERITY_OPTIONS = [
  { value: "all", label: "All Severities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

// Utility -----------------------------------------------------------------
const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  return h + "h";
};

// Virtualized list row height constant
const ROW_HEIGHT = 60; // px including padding/divider

// Props:
// fullPage?: boolean (full management page when true; otherwise compact panel mode)
// onActiveCountChange?: (n:number) => void (panel mode)
const Alerts = ({ onActiveCountChange, fullPage = false }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]); // active + unresolved states (new/ack)
  const [history, setHistory] = useState([]); // resolved / dismissed (panel-only or page archived)
  const [tab, setTab] = useState("active"); // reserved for future (history / analytics)
  // Page mode specific state ----------------------------------------------
  const [zoneFilter, setZoneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("2h");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detail, setDetail] = useState(null); // full detail drawer
  const [resolutionNote, setResolutionNote] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [collapsedSeverity, setCollapsedSeverity] = useState({}); // severity => bool
  const [autoScroll, setAutoScroll] = useState(true); // panel mode autoscroll
  const pageSize = 10;
  const latestIdRef = useRef(null);

  // Simulated fetch -------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      const seed = Array.from({ length: fullPage ? 70 : 34 }).map((_, i) => ({
        id: "a" + (i + 1),
        type: ["overcrowding", "camera_offline", "incident", "sos", "lost_person_match"][i % 5],
        severity: ["low", "medium", "high", "critical"][i % 4],
        zoneName: ["Transit Hub", "Gate A", "Riverbank", "Food Court", "North Camp", "South Gate"][i % 6],
        ts: new Date(Date.now() - i * 120000).toISOString(),
        status: i % 11 === 0 ? "ack" : "new",
        assignees: [],
        payload: { source: "seed", metrics: { people: Math.floor(Math.random() * 300) } },
        notes: "",
      }));
      setAlerts(seed);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [fullPage]);

  // WebSocket simulation ---------------------------------------------------
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      const fresh = {
        id: "a" + Date.now(),
        type: ["overcrowding", "incident", "sos"][Math.floor(Math.random() * 3)],
        severity: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)],
        zoneName: ["Gate A", "Riverbank", "Transit Hub", "South Gate"][Math.floor(Math.random() * 4)],
        ts: new Date().toISOString(),
        status: "new",
        assignees: [],
        payload: { live: true },
        notes: "",
      };
      latestIdRef.current = fresh.id;
      setAlerts((prev) => [fresh, ...prev].slice(0, fullPage ? 400 : 200));
      if (!fullPage && autoScroll && panelScrollRef.current) {
        panelScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 14000);
    return () => clearInterval(interval);
  }, [loading, fullPage, autoScroll]);

  // Inform parent of active count -----------------------------------------
  useEffect(() => {
    onActiveCountChange?.(alerts.length);
  }, [alerts, onActiveCountChange]);

  // Filters ----------------------------------------------------------------
  const normalizedQuery = query.trim().toLowerCase();
  const baseFiltered = useMemo(
    () =>
      (fullPage ? [...alerts, ...history] : alerts).filter((a) => {
        const matchesQuery = !normalizedQuery
          || a.id.toLowerCase().includes(normalizedQuery)
          || a.zoneName.toLowerCase().includes(normalizedQuery)
          || (TYPE_META[a.type]?.label || a.type).toLowerCase().includes(normalizedQuery);
        return (
          matchesQuery &&
          (typeFilter === "all" || a.type === typeFilter) &&
          (sevFilter === "all" || a.severity === sevFilter) &&
          (statusFilter === "all" || !fullPage || a.status === statusFilter) &&
          (zoneFilter === "all" || !fullPage || a.zoneName === zoneFilter)
        );
      }),
    [alerts, history, typeFilter, sevFilter, statusFilter, zoneFilter, fullPage, normalizedQuery]
  );
  const filteredActive = fullPage ? baseFiltered : baseFiltered; // same set; panel interprets as active list
  const filteredHistory = useMemo(
    () =>
      history.filter(
        (a) =>
          (typeFilter === "all" || a.type === typeFilter) &&
          (sevFilter === "all" || a.severity === sevFilter) &&
          (zoneFilter === "all" || !fullPage || a.zoneName === zoneFilter)
      ),
    [history, typeFilter, sevFilter, zoneFilter, fullPage]
  );

  // Actions ----------------------------------------------------------------
  const ackAlert = (id) =>
    setAlerts((a) =>
      a.map((al) => (al.id === id ? { ...al, status: "ack" } : al))
    );
  const resolveAlert = (id) =>
    setAlerts((a) => {
      const target = a.find((al) => al.id === id);
      if (!target) return a;
      setHistory((h) => [
        {
          ...target,
          status: "resolved",
          ts: new Date().toISOString(),
          notes: resolutionNote,
        },
        ...h,
      ]);
      if (detail?.id === id) setDetail(null);
      return a.filter((al) => al.id !== id);
    });
  const dismissAlert = (id) => setAlerts((a) => a.filter((al) => al.id !== id));
  const assignAlert = (id) =>
    setAlerts((a) =>
      a.map((al) =>
        al.id === id
          ? {
              ...al,
              assignees: [...new Set([...al.assignees, "volunteer1"])],
              status: al.status === "new" ? "ack" : al.status,
            }
          : al
      )
    );
  const bulk = (action) => {
    selectedIds.forEach((id) => {
      if (action === "ack") ackAlert(id);
      else if (action === "resolve") resolveAlert(id);
      else if (action === "dismiss") dismissAlert(id);
    });
    setSelectedIds(new Set());
  };
  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selectAllFiltered = () =>
    setSelectedIds(new Set(filteredActive.map((a) => a.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // Virtualization logic ---------------------------------------------------
  const scrollRef = useRef(null);
  const panelScrollRef = scrollRef; // alias for clarity above
  const [scrollTop, setScrollTop] = useState(0);
  const onScroll = useCallback(() => {
    if (!scrollRef.current) return;
    setScrollTop(scrollRef.current.scrollTop);
  }, []);
  const total = filteredActive.length;
  const viewportH = 480; // desired viewport height
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 4); // overscan
  const endIndex = Math.min(
    total,
    Math.ceil((scrollTop + viewportH) / ROW_HEIGHT) + 4
  );
  const visibleItems = filteredActive.slice(startIndex, endIndex);
  const padTop = startIndex * ROW_HEIGHT;
  const padBottom = (total - endIndex) * ROW_HEIGHT;

  // History pagination -----------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const pageItems = filteredHistory.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Row component ----------------------------------------------------------
  const Row = ({ alert }) => {
    const meta = TYPE_META[alert.type] || {};
    const Icon = meta.icon || Info;
    const isNewlyInserted = latestIdRef.current === alert.id;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        tabIndex={0}
        className={`group focus:outline-none focus:ring-2 focus:ring-orange-500/60 rounded-md px-3 py-2 pr-2 flex flex-col gap-1 hover:bg-orange-50 text-xs border relative ${isNewlyInserted ? "ring-1 ring-orange-400/70 bg-orange-50/60" : "border-transparent"}`}
        style={{ height: ROW_HEIGHT - 8 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full ${severityStyles[alert.severity]} ring-1 ring-white shadow`} aria-label={`Severity ${alert.severity}`}
          />
          <Icon size={14} className={`${meta.color} shrink-0`} />
          <span className="font-semibold text-gray-800 truncate">
            {meta.label || alert.type.replace(/_/g, " ")}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-500">
            <Clock size={12} /> {timeAgo(alert.ts)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-600">
          <span className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 flex items-center gap-1">
            <MapPin size={12} /> {alert.zoneName}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border ${statusBadgeStyles[alert.status]} capitalize`}
          >
            {alert.status}
          </span>
          {alert.assignees.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
              <Users size={12} /> {alert.assignees.length}
            </span>
          )}
          <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition">
            {alert.status !== "ack" && alert.status !== "resolved" && (
              <button
                onClick={() => ackAlert(alert.id)}
                className="p-1 rounded hover:bg-orange-100 text-orange-600"
                aria-label="Acknowledge"
              >
                <Check size={14} />
              </button>
            )}
            <button
              onClick={() => assignAlert(alert.id)}
              className="p-1 rounded hover:bg-blue-100 text-blue-600"
              aria-label="Assign"
            >
              <UserPlus size={14} />
            </button>
            <button
              onClick={() => resolveAlert(alert.id)}
              className="p-1 rounded hover:bg-green-100 text-green-600"
              aria-label="Resolve"
            >
              <ClipboardCheck size={14} />
            </button>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <motion.div
          layoutId={`bar-${alert.id}`}
          className={`absolute left-0 top-0 h-full w-0.5 rounded-r ${severityStyles[alert.severity]}`}
        />
      </motion.div>
    );
  };

  // States -----------------------------------------------------------------
  const renderLoading = () => (
    <div className="space-y-2 p-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[52px] rounded-md bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50"
        />
      ))}
    </div>
  );
  const renderEmpty = (msg) => (
    <div className="p-6 flex flex-col items-center justify-center text-center text-sm text-gray-500 gap-2">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-50 to-rose-50 border border-orange-100 flex items-center justify-center text-orange-500">
        <AlertTriangle size={26} />
      </div>
      <p>{msg}</p>
    </div>
  );
  const renderError = () => (
    <div className="p-4 bg-red-50 text-red-700 text-sm flex items-center justify-between">
      <span>Error loading alerts.</span>
      <button
        onClick={() => {
          setError(null);
          setLoading(true);
          setTimeout(() => setLoading(false), 600);
        }}
        className="px-2 py-1 rounded bg-red-600 text-white text-xs"
      >
        Retry
      </button>
    </div>
  );
  // PANEL MODE ------------------------------------------------------------
  if (!fullPage) {
    return (
      <div className="flex flex-col h-full bg-white/60 backdrop-blur rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-gray-200 flex items-center gap-2 text-xs font-medium bg-white/70 backdrop-blur">
          <div className="flex items-center gap-2 font-semibold text-gray-800">
            <Siren size={16} className="text-orange-600" />
            <span>Active Alerts</span>
            <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-medium border border-orange-200">
              {alerts.length}
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            <div className="relative">
              <Filter size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 pl-7 pr-2 rounded-md border border-gray-300 bg-white/70 backdrop-blur text-[11px] focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={sevFilter}
              onChange={(e) => setSevFilter(e.target.value)}
              className="h-8 rounded-md border border-gray-300 bg-white/70 backdrop-blur px-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {SEVERITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setAutoScroll((s) => !s)}
              className={`h-8 px-2 rounded-md border text-[11px] flex items-center gap-1 transition ${autoScroll ? "bg-orange-500 border-orange-600 text-white" : "bg-white/70 border-gray-300 text-gray-600 hover:bg-orange-50"}`}
              title="Toggle auto scroll on new alerts"
            >
              <Sparkles size={14} /> {autoScroll ? "Auto" : "Manual"}
            </button>
          </div>
        </div>
        {error && renderError()}
        {loading ? (
          renderLoading()
        ) : filteredActive.length === 0 ? (
          renderEmpty("No alerts right now.")
        ) : (
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto scroll-smooth"
            style={{ maxHeight: 480 }}
          >
            <div style={{ height: padTop }} />
            <LayoutGroup>
              <AnimatePresence mode="popLayout" initial={false}>
                {visibleItems.map((a) => (
                  <Row key={a.id} alert={a} />
                ))}
              </AnimatePresence>
            </LayoutGroup>
            <div style={{ height: padBottom }} />
          </div>
        )}
      </div>
    );
  }

  // PAGE MODE -------------------------------------------------------------
  const tableRows = loading ? (
    Array.from({ length: 10 }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td colSpan={8} className="h-8">
          <div className="h-5 rounded bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50" />
        </td>
      </tr>
    ))
  ) : filteredActive.length === 0 ? (
    <tr>
      <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
        No alerts recorded for this filter.
      </td>
    </tr>
  ) : (
    <AnimatePresence initial={false}>
      {filteredActive.map((a) => {
        const meta = TYPE_META[a.type] || {}; const Icon = meta.icon || Info;
        return (
          <motion.tr
            key={a.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="even:bg-gray-50/60 hover:bg-orange-50 transition-colors"
          >
            <td className="px-2 py-2">
              <input
                type="checkbox"
                checked={selectedIds.has(a.id)}
                onChange={() => toggleSelect(a.id)}
                aria-label={`Select alert ${a.id}`}
              />
            </td>
            <td className="px-2 py-2 whitespace-nowrap tabular-nums text-[11px]">
              {timeAgo(a.ts)}
            </td>
            <td className="px-2 py-2 whitespace-nowrap text-xs capitalize flex items-center gap-1">
              <Icon size={14} className={meta.color} />
              {meta.label || a.type.replace(/_/g, " ")}
            </td>
            <td className="px-2 py-2 whitespace-nowrap text-xs">{a.zoneName}</td>
            <td className="px-2 py-2">
              <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${severityBgSoft[a.severity]}`}>
                <span className={`w-2 h-2 rounded-full ${severityStyles[a.severity].split(" ")[0]}`} /> {a.severity}
              </span>
            </td>
            <td className="px-2 py-2">
              <motion.span
                layout
                className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide ${statusBadgeStyles[a.status]}`}
              >
                {a.status}
              </motion.span>
            </td>
            <td className="px-2 py-2 text-[11px]">
              {a.assignees.length ? a.assignees.join(",") : "-"}
            </td>
            <td className="px-2 py-2 text-[11px] flex gap-1">
              {a.status !== "ack" && a.status !== "resolved" && (
                <button
                  onClick={() => ackAlert(a.id)}
                  className="p-1 rounded hover:bg-orange-100 text-orange-600"
                  title="Acknowledge"
                >
                  <Check size={14} />
                </button>
              )}
              <button
                onClick={() => assignAlert(a.id)}
                className="p-1 rounded hover:bg-blue-100 text-blue-600"
                title="Assign"
              >
                <UserPlus size={14} />
              </button>
              <button
                onClick={() => {
                  setDetail(a); setResolutionNote(a.notes || "");
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-600"
                title="View Details"
              >
                <Info size={14} />
              </button>
              <button
                onClick={() => dismissAlert(a.id)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </td>
          </motion.tr>
        );
      })}
    </AnimatePresence>
  );

  return (
    <div className="space-y-6" aria-label="Alerts Management">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Siren size={18} className="text-orange-600" /> Alerts
          <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-medium border border-orange-200">
            {filteredActive.length}
          </span>
        </h2>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search (id, type, zone)"
            className="h-9 pl-7 pr-2 rounded-md border border-gray-300 bg-white/70 focus:bg-white text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 w-48"
            aria-label="Search alerts"
          />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500">
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500">
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500">
          {["all", "Gate A", "Riverbank", "Transit Hub", "Food Court", "North Camp", "South Gate"].map((z) => (
            <option key={z} value={z}>{z === "all" ? "All Zones" : z}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500">
          {["all", "new", "ack", "resolved", "dismissed"].map((s) => (
            <option key={s} value={s}>{s === "all" ? "All Statuses" : s}</option>
          ))}
        </select>
        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="h-9 rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 ml-auto">
          {["1h", "2h", "6h", "24h"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="bg-white/80 backdrop-blur rounded-lg border border-gray-200 shadow-sm overflow-hidden ring-1 ring-white">
        <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-3 text-xs bg-gradient-to-r from-gray-50 to-white">
          {selectedIds.size > 0 ? (
            <>
              <span className="font-medium text-gray-700">{selectedIds.size} selected</span>
              <button onClick={() => bulk("ack")} className="px-2 py-1 rounded bg-blue-600 text-white flex items-center gap-1"><BadgeCheck size={14} /> Ack</button>
              <button onClick={() => bulk("resolve")} className="px-2 py-1 rounded bg-green-600 text-white flex items-center gap-1"><ClipboardCheck size={14} /> Resolve</button>
              <button onClick={() => bulk("dismiss")} className="px-2 py-1 rounded bg-gray-600 text-white flex items-center gap-1"><Trash2 size={14} /> Dismiss</button>
              <button onClick={clearSelection} className="ml-auto text-gray-500 hover:text-gray-700">Clear</button>
            </>
          ) : (
            <span className="text-gray-500">{filteredActive.length} alerts</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setSelectedIds(new Set(filteredActive.map(a => a.id)))} disabled={!filteredActive.length} className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-orange-50 disabled:opacity-40">Select All</button>
            {selectedIds.size > 0 && (
              <button onClick={clearSelection} className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50">Clear</button>
            )}
          </div>
        </div>
        <div className="overflow-auto max-h-[540px]">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100/80 text-gray-700 sticky top-0 z-10">
              <tr>
                {["", "Time", "Type", "Zone", "Severity", "Status", "Assignees", "Actions"].map((h) => (
                  <th key={h} className="px-2 py-2 font-medium text-[10px] uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <motion.tbody layout>{tableRows}</motion.tbody>
          </table>
        </div>
      </div>
      <AnimatePresence>
        {detail && (
          <motion.div key="drawer" className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="flex-1 bg-black/40" onClick={() => setDetail(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 280, damping: 28 }} className="relative w-full sm:w-[540px] max-w-full h-full bg-white shadow-xl border-l border-gray-200 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Siren size={16} className="text-orange-600" /> Alert Detail</h3>
                <button onClick={() => setDetail(null)} className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500" aria-label="Close detail"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-[11px]">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-gray-500">Type</span><div className="font-medium capitalize flex items-center gap-1 mt-0.5">{TYPE_META[detail.type]?.label || detail.type.replace(/_/g, " ")}</div></div>
                  <div><span className="text-gray-500">Zone</span><div className="font-medium mt-0.5">{detail.zoneName}</div></div>
                  <div><span className="text-gray-500">Severity</span><div className="font-medium capitalize mt-0.5 flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${severityStyles[detail.severity]} ring-1 ring-white`} />{detail.severity}</div></div>
                  <div><span className="text-gray-500">Status</span><div className="font-medium capitalize mt-0.5 flex items-center gap-2"><span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase ${statusBadgeStyles[detail.status]}`}>{detail.status}</span></div></div>
                  <div><span className="text-gray-500">Time</span><div className="font-medium mt-0.5 flex items-center gap-1"><Clock size={12} /> {new Date(detail.ts).toLocaleTimeString()}</div></div>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-700 mb-1 flex items-center gap-1"><Info size={12} /> Payload</h4>
                  <pre className="bg-gray-900 text-gray-100 rounded-md p-3 overflow-x-auto text-[10px]">{JSON.stringify(detail.payload, null, 2)}</pre>
                </div>
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-700 mb-1 flex items-center gap-1"><NotebookPen size={12} /> Resolution Notes</h4>
                  <textarea value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} className="w-full h-28 rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" placeholder="Add notes for resolution..." />
                </div>
              </div>
              <div className="border-t border-gray-200 p-4 flex items-center gap-2 bg-gray-50/60">
                {detail.status !== "ack" && detail.status !== "resolved" && (
                  <button onClick={() => ackAlert(detail.id)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs flex items-center gap-1"><Check size={14} /> Ack</button>
                )}
                {detail.status !== "resolved" && (
                  <button onClick={() => resolveAlert(detail.id)} className="px-3 py-1.5 rounded bg-green-600 text-white text-xs flex items-center gap-1"><ClipboardCheck size={14} /> Resolve</button>
                )}
                <button onClick={() => dismissAlert(detail.id)} className="px-3 py-1.5 rounded bg-gray-600 text-white text-xs flex items-center gap-1"><Ban size={14} /> Dismiss</button>
                <button onClick={() => setDetail(null)} className="ml-auto px-3 py-1.5 rounded border border-gray-300 bg-white text-xs flex items-center gap-1">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Alerts;
