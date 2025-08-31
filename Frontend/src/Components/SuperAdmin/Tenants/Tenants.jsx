import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Modal from "../../General/Modal";
import Drawer from "../../General/Drawer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon,
  Filter,
  Users,
  Database,
  AlertTriangle,
  Clock,
  ServerCog,
  BarChart3,
  PieChart,
  Activity,
  Settings2,
  Gauge,
  Plus,
  PauseCircle,
  PlayCircle,
  Trash2,
  RefreshCcw,
  Layers,
  Camera as CameraIcon,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  X as XIcon,
  CheckCircle2,
} from "lucide-react";

// Type Reference (JSDoc for editor intellisense)
/**
 * @typedef {Object} Tenant
 * @property {string} id
 * @property {string} name
 * @property {"active"|"suspended"} status
 * @property {number} zones
 * @property {number} cameras
 * @property {{ total:number; admins:number; volunteers:number; pilgrims:number }} users
 * @property {number} storageGB
 * @property {number} alerts24h
 * @property {string} lastActivity // ISO timestamp
 * @property {{ framesDays:number; embeddingsDays:number; logsDays:number }} retention
 */

const statusBadge = (status) =>
  status === "active"
    ? "bg-green-500/15 text-green-300 border-green-400/30"
    : "bg-white/10 text-white/60 border-white/15";

const relativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  return d + "d ago";
};

const skeletonRows = (n = 6) =>
  Array.from({ length: n }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      <td colSpan={9} className="h-10">
        <div className="h-6 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
      </td>
    </tr>
  ));

const genSeedTenants = (count = 14) =>
  Array.from({ length: count }).map((_, i) => {
    const active = i % 5 !== 0;
    return {
      id: "tn" + (i + 1),
      name:
        [
          "MahaKumbh",
          "Riverbank Ops",
          "Transit Hub",
          "North Camp",
          "PilgrimAssist",
          "Logistics Core",
          "West Gate",
          "Central Ops",
        ][i % 8] +
        " " +
        (i + 1),
      status: active ? "active" : "suspended",
      zones: Math.floor(Math.random() * 15),
      cameras: Math.floor(Math.random() * 120),
      users: {
        total: 40 + Math.floor(Math.random() * 400),
        admins: 3 + (i % 4),
        volunteers: 10 + Math.floor(Math.random() * 100),
        pilgrims: 30 + Math.floor(Math.random() * 300),
      },
      storageGB: 50 + Math.floor(Math.random() * 900),
      alerts24h: Math.floor(Math.random() * 60),
      lastActivity: new Date(
        Date.now() - Math.random() * 36 * 3600000
      ).toISOString(),
      retention: { framesDays: 30, embeddingsDays: 14, logsDays: 60 },
    };
  });

const Tenants = () => {
  // Data & Fetch -----------------------------------------------------------
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // List UI State ----------------------------------------------------------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all"); // all | recent | stale
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showFilters, setShowFilters] = useState(false); // mobile

  // Drawer / Modals --------------------------------------------------------
  const [activeTenant, setActiveTenant] = useState(null); // selected tenant object
  const [drawerTab, setDrawerTab] = useState("overview");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pendingSuspend, setPendingSuspend] = useState(null);

  // Create form ------------------------------------------------------------
  const [form, setForm] = useState({
    name: "",
    email: "",
    framesDays: 30,
    embeddingsDays: 14,
    logsDays: 60,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Lazy detail loading simulation ----------------------------------------
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailUsage, setDetailUsage] = useState(null); // charts data

  useEffect(() => {
    // Simulated fetch
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      try {
        setTenants(genSeedTenants());
        setLoading(false);
      } catch (e) {
        setError("Failed to load tenants");
        setLoading(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, []);

  // Simulated WebSocket events updating a random tenant every 25s ----------
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setTenants((prev) =>
        prev.map((t) =>
          Math.random() < 0.07
            ? {
                ...t,
                alerts24h: t.alerts24h + Math.floor(Math.random() * 3),
                storageGB: t.storageGB + Math.floor(Math.random() * 2),
                lastActivity: new Date().toISOString(),
              }
            : t
        )
      );
    }, 25000);
    return () => clearInterval(iv);
  }, [loading]);

  // Virtualization (simple) -----------------------------------------------
  const bigData = tenants.length > 100; // if needed we slice visible rows by page already; virtualization minimal improvement here

  // Derived / Filters ------------------------------------------------------
  const filtered = useMemo(
    () =>
      tenants.filter((t) => {
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        if (activityFilter !== "all") {
          const mins =
            (Date.now() - new Date(t.lastActivity).getTime()) / 60000;
          if (activityFilter === "recent" && mins > 60) return false; // last hour
          if (activityFilter === "stale" && mins <= 60) return false;
        }
        if (search.trim()) {
          const s = search.toLowerCase();
          if (!t.name.toLowerCase().includes(s)) return false;
        }
        return true;
      }),
    [tenants, statusFilter, activityFilter, search]
  );

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const { key, dir } = sort;
        let av = a[key];
        let bv = b[key];
        if (key === "lastActivity") {
          av = new Date(a.lastActivity).getTime();
          bv = new Date(b.lastActivity).getTime();
        }
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
        if (av < bv) return dir === "asc" ? -1 : 1;
        if (av > bv) return dir === "asc" ? 1 : -1;
        return 0;
      }),
    [filtered, sort]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Actions ----------------------------------------------------------------
  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  const openDrawer = (t) => {
    setActiveTenant(t);
    setDrawerTab("overview");
    setDetailUsage(null);
    setDetailLoading(true);
    // simulate lazy fetch for charts
    setTimeout(() => {
      setDetailUsage({
        alertsSeverity: ["low", "medium", "high", "critical"].map((s) => ({
          severity: s,
          count: Math.floor(Math.random() * 40) + 5,
        })),
        embeddings: Array.from({ length: 14 }).map((_, i) => ({
          idx: i,
          value: 800 + Math.floor(Math.random() * 900),
        })),
        activeUsersTrend: Array.from({ length: 10 }).map((_, i) => ({
          day: "D" + (i + 1),
          users: 20 + Math.floor(Math.random() * 40),
        })),
      });
      setDetailLoading(false);
    }, 600);
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const newTenant = {
        id: "tn" + Date.now(),
        name: form.name.trim(),
        status: "active",
        zones: 0,
        cameras: 0,
        users: { total: 1, admins: 1, volunteers: 0, pilgrims: 0 },
        storageGB: 0,
        alerts24h: 0,
        lastActivity: new Date().toISOString(),
        retention: {
          framesDays: form.framesDays,
          embeddingsDays: form.embeddingsDays,
          logsDays: form.logsDays,
        },
      };
      setTenants((t) => [newTenant, ...t]);
      setSubmitting(false);
      setCreateOpen(false);
      setForm({
        name: "",
        email: "",
        framesDays: 30,
        embeddingsDays: 14,
        logsDays: 60,
        notes: "",
      });
      // TODO: integrate POST /api/v1/tenants & send invite
    }, 800);
  };

  const suspendTenant = (t) => {
    setTenants((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? { ...x, status: x.status === "active" ? "suspended" : "active" }
          : x
      )
    );
    setPendingSuspend(null);
    if (activeTenant && activeTenant.id === t.id)
      setActiveTenant((a) => ({
        ...a,
        status: a.status === "active" ? "suspended" : "active",
      }));
    // TODO: POST /api/v1/tenants/:id/suspend
  };

  const deleteTenant = (t) => {
    setTenants((prev) => prev.filter((x) => x.id !== t.id));
    setDeleteTarget(null);
    if (activeTenant && activeTenant.id === t.id) setActiveTenant(null);
    // TODO: DELETE /api/v1/tenants/:id
  };

  const updateRetention = (field, val) => {
    setActiveTenant((at) =>
      at ? { ...at, retention: { ...at.retention, [field]: Number(val) } } : at
    );
    setTenants((prev) =>
      prev.map((t) =>
        activeTenant && t.id === activeTenant.id
          ? { ...t, retention: { ...t.retention, [field]: Number(val) } }
          : t
      )
    );
    // TODO: persist via PATCH
  };

  // Drawer Tabs ------------------------------------------------------------
  const drawerTabs = [
    { key: "overview", label: "Overview", icon: Layers },
    { key: "config", label: "Config", icon: Settings2 },
    { key: "usage", label: "Usage", icon: BarChart3 },
    { key: "retention", label: "Retention", icon: ServerCog },
  ];

  const renderDrawerBody = () => {
    if (!activeTenant) return null;
    if (drawerTab === "overview")
      return (
        <div className="space-y-5 text-[11px]">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-2 rounded border bg-gray-50">
              <div className="text-gray-500">Zones</div>
              <div className="font-semibold text-sm">{activeTenant.zones}</div>
            </div>
            <div className="p-2 rounded border bg-gray-50">
              <div className="text-gray-500">Cameras</div>
              <div className="font-semibold text-sm">
                {activeTenant.cameras}
              </div>
            </div>
            <div className="p-2 rounded border bg-gray-50">
              <div className="text-gray-500">Users</div>
              <div className="font-semibold text-sm">
                {activeTenant.users.total}
              </div>
            </div>
            <div className="p-2 rounded border bg-gray-50">
              <div className="text-gray-500">Storage</div>
              <div className="font-semibold text-sm">
                {activeTenant.storageGB} GB
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-600 leading-relaxed">
            Tenant <strong>{activeTenant.name}</strong> last active{" "}
            {relativeTime(activeTenant.lastActivity)}. Status reflects ability
            to ingest events and allow user logins.
          </div>
        </div>
      );
    if (drawerTab === "config")
      return (
        <div className="space-y-4 text-[11px]">
          <div className="p-3 rounded border bg-white">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
              <Settings2 size={12} className="text-orange-600" /> Policies
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-gray-600">
              <li>Default alert severity thresholds (placeholder)</li>
              <li>Access control: RBAC enforced</li>
              <li>Geo-fencing enabled</li>
            </ul>
          </div>
          <div className="p-3 rounded border bg-white">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
              <Activity size={12} className="text-orange-600" /> Health
            </h4>
            <div className="flex flex-wrap gap-3 text-[10px]">
              <span className="px-2 py-1 rounded bg-green-50 border border-green-200 text-green-700">
                API: OK
              </span>
              <span className="px-2 py-1 rounded bg-green-50 border border-green-200 text-green-700">
                WebSocket: OK
              </span>
              <span className="px-2 py-1 rounded bg-orange-50 border border-orange-200 text-orange-700">
                Alerts Spike
              </span>
            </div>
          </div>
        </div>
      );
    if (drawerTab === "usage")
      return (
        <div className="space-y-5 text-[11px]">
          {detailLoading && (
            <div className="h-40 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
          )}
          {!detailLoading && detailUsage && (
            <>
              <div className="p-3 rounded border bg-white">
                <h4 className="text-[10px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                  <PieChart size={12} className="text-orange-600" /> Alerts
                  Severity (7d)
                </h4>
                <ul className="grid grid-cols-2 gap-2">
                  {detailUsage.alertsSeverity.map((a) => (
                    <li
                      key={a.severity}
                      className="flex items-center justify-between text-gray-700"
                    >
                      <span className="capitalize">{a.severity}</span>
                      <span className="font-semibold tabular-nums">
                        {a.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3 rounded border bg-white">
                <h4 className="text-[10px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                  <BarChart3 size={12} className="text-orange-600" />{" "}
                  Embeddings/sec
                </h4>
                <div className="flex gap-1 items-end h-28">
                  {detailUsage.embeddings.map((p) => (
                    <div
                      key={p.idx}
                      className="flex-1 bg-orange-200 rounded"
                      style={{ height: (p.value / 2000) * 100 + "%" }}
                      title={p.value}
                    />
                  ))}
                </div>
              </div>
              <div className="p-3 rounded border bg-white">
                <h4 className="text-[10px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Users size={12} className="text-orange-600" /> Active Users
                  Trend
                </h4>
                <div className="flex gap-1 items-end h-24">
                  {detailUsage.activeUsersTrend.map((p) => (
                    <div
                      key={p.day}
                      className="flex-1 bg-blue-200 rounded"
                      style={{ height: (p.users / 80) * 100 + "%" }}
                      title={p.users}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      );
    if (drawerTab === "retention")
      return (
        <div className="space-y-5 text-[11px]">
          <div className="space-y-3">
            {["framesDays", "embeddingsDays", "logsDays"].map((k) => (
              <div key={k} className="flex items-center gap-4">
                <label className="w-32 capitalize text-gray-600">
                  {k.replace("Days", "").replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  type="range"
                  min={1}
                  max={120}
                  value={activeTenant.retention[k]}
                  onChange={(e) => updateRetention(k, e.target.value)}
                  className="flex-1 accent-orange-600"
                />
                <span className="w-12 text-right font-medium tabular-nums">
                  {activeTenant.retention[k]}d
                </span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 leading-snug">
            Retention overrides apply only to this tenant. Adjust carefully;
            lowering values can reduce storage cost.
          </p>
        </div>
      );
  };

  // Renderers --------------------------------------------------------------
  const headerCell = (label, key, sortable = true) => (
    <th
      key={key}
      scope="col"
      onClick={() => sortable && toggleSort(key)}
      className={`px-3 py-2 font-medium text-[10px] uppercase tracking-wide text-left select-none cursor-${sortable ? "pointer" : "default"} group`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sort.key === key && (
          <span className="text-orange-600">
            {sort.dir === "asc" ? "▲" : "▼"}
          </span>
        )}
      </span>
    </th>
  );

  const tableBody = () => {
    if (loading) return <tbody>{skeletonRows(7)}</tbody>;
    if (error)
      return (
        <tbody>
          <tr>
            <td colSpan={9} className="p-6 text-center text-sm text-red-400">
              {error}{" "}
              <button
                onClick={() => window.location.reload()}
                className="ml-2 text-[var(--mk-accent)] underline"
              >
                Retry
              </button>
            </td>
          </tr>
        </tbody>
      );
    if (!filtered.length)
      return (
        <tbody>
          <tr>
            <td
              colSpan={9}
              className="p-10 text-center text-sm text-white/60 flex flex-col items-center gap-3"
            >
              <ServerCog size={40} className="text-[var(--mk-accent)]" />
              No tenants created yet.
              <button
                onClick={() => setCreateOpen(true)}
                className="px-3 py-1.5 rounded bg-[var(--mk-accent)] text-[#09121f] text-xs font-medium"
              >
                Create Tenant
              </button>
            </td>
          </tr>
        </tbody>
      );
    return (
      <tbody>
        <AnimatePresence initial={false}>
          {pageRows.map((t) => (
            <motion.tr
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="even:bg-white/5 hover:bg-[var(--mk-muted)]/40 cursor-pointer transition-colors"
              onClick={() => openDrawer(t)}
            >
              <td className="px-3 py-2 whitespace-nowrap font-medium">
                {t.name}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className={`px-1.5 py-0.5 rounded border text-[10px] uppercase ${statusBadge(t.status)}`}
                >
                  {t.status}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                {t.zones}
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                {t.cameras}
              </td>
              <td
                className="px-3 py-2 whitespace-nowrap tabular-nums"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative group inline-flex items-center gap-1">
                  {t.users.total}
                  <span className="hidden group-hover:block absolute top-full left-0 mt-1 text-[10px] bg-black/80 backdrop-blur text-white rounded px-2 py-1 shadow z-10 whitespace-nowrap">
                    A:{t.users.admins} V:{t.users.volunteers} P:
                    {t.users.pilgrims}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                {t.storageGB}
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                {t.alerts24h}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-white/70">
                {relativeTime(t.lastActivity)}
              </td>
              <td
                className="px-3 py-2 whitespace-nowrap"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex gap-2 text-white/60">
                  <button
                    onClick={() => openDrawer(t)}
                    className="hover:text-[var(--mk-accent)] text-[11px]"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setPendingSuspend(t)}
                    className="hover:text-[var(--mk-accent)] text-[11px]"
                  >
                    {t.status === "active" ? "Suspend" : "Resume"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    className="hover:text-red-400 text-[11px]"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </AnimatePresence>
      </tbody>
    );
  };

  // Pagination -------------------------------------------------------------
  const pagination = (
    <div className="flex items-center gap-3 text-[11px] px-2 py-2 border-t border-white/10 bg-white/5">
      <div>
        Page{" "}
        <span className="font-semibold text-[var(--mk-accent)]">
          {currentPage}
        </span>{" "}
        / {totalPages}
      </div>
      <div className="flex gap-1 ml-auto">
        <button
          disabled={currentPage === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className={`h-7 w-7 flex items-center justify-center rounded border border-white/10 text-white/70 ${currentPage === 1 ? "opacity-40" : "hover:bg-[var(--mk-muted)]/40"}`}
          aria-label="Prev page"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className={`h-7 w-7 flex items-center justify-center rounded border border-white/10 text-white/70 ${currentPage === totalPages ? "opacity-40" : "hover:bg-[var(--mk-muted)]/40"}`}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  // KPI Summary ------------------------------------------------------------
  const kpis = useMemo(
    () => ({
      total: tenants.length,
      active: tenants.filter((t) => t.status === "active").length,
      suspended: tenants.filter((t) => t.status === "suspended").length,
      storage: tenants.reduce((a, t) => a + t.storageGB, 0),
      alerts: tenants.reduce((a, t) => a + t.alerts24h, 0),
    }),
    [tenants]
  );

  const kpiTiles = (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[11px]">
      {[
        {
          label: "Active",
          value: kpis.active,
          icon: CheckCircle2,
          style:
            "from-green-500/25 via-green-500/10 to-transparent text-green-300",
        },
        {
          label: "Suspended",
          value: kpis.suspended,
          icon: PauseCircle,
          style: "from-white/15 via-white/5 to-transparent text-white/60",
        },
        {
          label: "Tenants",
          value: kpis.total,
          icon: Layers,
          style:
            "from-[var(--mk-accent)]/25 via-[var(--mk-accent)]/10 to-transparent text-[var(--mk-accent-strong)]",
        },
        {
          label: "Storage GB",
          value: kpis.storage,
          icon: Database,
          style:
            "from-blue-500/25 via-blue-500/10 to-transparent text-blue-300",
        },
        {
          label: "Alerts 24h",
          value: kpis.alerts,
          icon: AlertTriangle,
          style: "from-red-500/25 via-red-500/10 to-transparent text-red-300",
        },
      ].map((c) => (
        <div
          key={c.label}
          className={`p-2 rounded-lg border border-white/10 flex items-center gap-2 bg-gradient-to-br ${c.style}`}
        >
          <c.icon size={16} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide font-medium text-white/70">
              {c.label}
            </div>
            <div className="text-sm font-semibold tabular-nums">{c.value}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 mk-text-primary" aria-label="Tenants Management">
      {/* Header Row */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Layers size={18} className="text-[var(--mk-accent)]" /> Tenants
        </h2>
        <div className="hidden md:flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md bg-[var(--mk-surface-2)] border border-white/10 px-2 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
          >
            {["all", "active", "suspended"].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Statuses" : s}
              </option>
            ))}
          </select>
          <select
            value={activityFilter}
            onChange={(e) => {
              setActivityFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md bg-[var(--mk-surface-2)] border border-white/10 px-2 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
          >
            {["all", "recent", "stale"].map((s) => (
              <option key={s} value={s}>
                {s === "all"
                  ? "All Activity"
                  : s === "recent"
                    ? "Active < 1h"
                    : "Stale > 1h"}
              </option>
            ))}
          </select>
          <div className="relative">
            <SearchIcon
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search tenants"
              className="h-9 w-48 pl-7 pr-2 rounded-md bg-[var(--mk-surface-2)] border border-white/10 text-xs placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
            />
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="h-9 px-3 rounded-md bg-[var(--mk-accent)] text-[#09121f] font-medium flex items-center gap-1 shadow hover:brightness-110 transition"
          >
            <Plus size={14} /> Create
          </button>
        </div>
        <div className="flex md:hidden ml-auto gap-2">
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`h-9 px-3 rounded-md border text-xs flex items-center gap-1 transition ${showFilters ? "bg-[var(--mk-accent)] text-[#09121f] border-[var(--mk-accent)]" : "bg-[var(--mk-surface-2)] border-white/10 text-white/70 hover:bg-[var(--mk-muted)]"}`}
          >
            <Filter size={14} /> Filters
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="h-9 px-3 rounded-md bg-[var(--mk-accent)] text-[#09121f] text-xs font-medium flex items-center gap-1 shadow hover:brightness-110"
          >
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {/* Mobile Filters */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden mk-panel rounded-xl p-3 space-y-3 text-xs"
          >
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 h-8 rounded bg-[var(--mk-surface-2)] border border-white/10 px-2"
              >
                {["all", "active", "suspended"].map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Statuses" : s}
                  </option>
                ))}
              </select>
              <select
                value={activityFilter}
                onChange={(e) => {
                  setActivityFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 h-8 rounded bg-[var(--mk-surface-2)] border border-white/10 px-2"
              >
                {["all", "recent", "stale"].map((s) => (
                  <option key={s} value={s}>
                    {s === "all"
                      ? "All Activity"
                      : s === "recent"
                        ? "Active < 1h"
                        : "Stale > 1h"}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <SearchIcon
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30"
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search"
                className="h-8 w-full pl-7 pr-2 rounded bg-[var(--mk-surface-2)] border border-white/10 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {kpiTiles}

      {/* Table */}
      <div className="mk-panel rounded-xl border border-white/10 shadow-lg overflow-hidden">
        <div className="overflow-auto max-h-[560px]">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10 bg-white/5 backdrop-blur text-[var(--mk-text-secondary)]">
              <tr>
                {headerCell("Name", "name")}
                {headerCell("Status", "status")}
                {
                  headerCell(
                    "Zones",
                    "#zones"
                  ) /* use custom key for stable sort mapping */
                }
                {headerCell("Cameras", "cameras")}
                {headerCell("Users", "users.total")}
                {headerCell("Storage", "storageGB")}
                {headerCell("Alerts 24h", "alerts24h")}
                {headerCell("Last Activity", "lastActivity")}
                <th className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-left">
                  Actions
                </th>
              </tr>
            </thead>
            {tableBody()}
          </table>
        </div>
        {pagination}
      </div>

      {/* Create Tenant Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Tenant"
        actions={[
          <button
            key="cancel"
            disabled={submitting}
            onClick={() => setCreateOpen(false)}
            className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs"
          >
            Cancel
          </button>,
          <button
            key="create"
            disabled={submitting || !form.name || !form.email}
            onClick={handleCreate}
            className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-60"
          >
            {submitting ? (
              <RefreshCcw size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}{" "}
            Create
          </button>,
        ]}
      >
        <form onSubmit={handleCreate} className="space-y-4 text-[11px]">
          <div>
            <label className="block mb-1 font-medium">Tenant Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full h-8 rounded border border-gray-300 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">
              Initial Admin Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
              className="w-full h-8 rounded border border-gray-300 px-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-medium">Frames (d)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={form.framesDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, framesDays: Number(e.target.value) }))
                }
                className="w-full h-8 rounded border border-gray-300 px-2"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Embeddings (d)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={form.embeddingsDays}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    embeddingsDays: Number(e.target.value),
                  }))
                }
                className="w-full h-8 rounded border border-gray-300 px-2"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Logs (d)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={form.logsDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, logsDays: Number(e.target.value) }))
                }
                className="w-full h-8 rounded border border-gray-300 px-2"
              />
            </div>
          </div>
          <div>
            <label className="block mb-1 font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
              className="w-full rounded border border-gray-300 px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <p className="text-[10px] text-gray-500">
            Upon creation an invite email is sent automatically to the initial
            admin.
          </p>
        </form>
      </Modal>

      {/* Suspend / Resume Confirmation */}
      <Modal
        open={!!pendingSuspend}
        onClose={() => setPendingSuspend(null)}
        title={
          pendingSuspend
            ? pendingSuspend.status === "active"
              ? "Suspend Tenant"
              : "Resume Tenant"
            : ""
        }
        actions={
          pendingSuspend
            ? [
                <button
                  key="cancel"
                  onClick={() => setPendingSuspend(null)}
                  className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs"
                >
                  Cancel
                </button>,
                <button
                  key="ok"
                  onClick={() => suspendTenant(pendingSuspend)}
                  className={`px-3 py-1.5 rounded text-xs font-medium text-white ${pendingSuspend.status === "active" ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}
                >
                  {pendingSuspend.status === "active" ? "Suspend" : "Resume"}
                </button>,
              ]
            : []
        }
      >
        {pendingSuspend && (
          <div className="text-[11px] text-gray-700 space-y-3">
            <p>
              {pendingSuspend.status === "active"
                ? "Suspending will block new logins and ingestion but retains data."
                : "Resuming re-enables access & ingestion."}
            </p>
            <p className="text-gray-500">
              Tenant: <strong>{pendingSuspend.name}</strong>
            </p>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? "Delete Tenant" : ""}
        actions={
          deleteTarget
            ? [
                <button
                  key="cancel"
                  onClick={() => setDeleteTarget(null)}
                  className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs"
                >
                  Cancel
                </button>,
                <button
                  key="del"
                  onClick={() => deleteTenant(deleteTarget)}
                  className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                >
                  Delete
                </button>,
              ]
            : []
        }
      >
        {deleteTarget && (
          <div className="space-y-3 text-[11px] text-gray-700">
            <p>
              This is a hard delete. All resources & stored data for{" "}
              <strong>{deleteTarget.name}</strong> will be removed and cannot be
              recovered.
            </p>
            <p className="text-red-600 font-medium">
              Proceed only if you have exported required data.
            </p>
          </div>
        )}
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        open={!!activeTenant}
        onClose={() => setActiveTenant(null)}
        title={activeTenant ? activeTenant.name : ""}
      >
        {activeTenant && (
          <div className="space-y-5 text-xs">
            {/* Tabs */}
            <div
              role="tablist"
              aria-label="Tenant detail sections"
              className="flex flex-wrap gap-2"
            >
              {drawerTabs.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={drawerTab === t.key}
                  onClick={() => setDrawerTab(t.key)}
                  className={`px-3 py-1.5 rounded-md border flex items-center gap-1 text-[11px] ${drawerTab === t.key ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-white border-gray-300 text-gray-600 hover:bg-orange-50"}`}
                >
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>
            <div className="border-t pt-4">{renderDrawerBody()}</div>
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setPendingSuspend(activeTenant)}
                className="px-3 py-1.5 rounded border border-gray-300 text-[11px] hover:bg-orange-50 flex items-center gap-1"
              >
                {activeTenant.status === "active" ? (
                  <PauseCircle size={14} />
                ) : (
                  <PlayCircle size={14} />
                )}{" "}
                {activeTenant.status === "active" ? "Suspend" : "Resume"}
              </button>
              <button
                onClick={() => setDeleteTarget(activeTenant)}
                className="px-3 py-1.5 rounded border border-red-300 text-[11px] hover:bg-red-50 flex items-center gap-1 text-red-600"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Tenants;

/*
Usage in SuperAdminDashboard.jsx (after creating this file):

import Tenants from './Tenants/Tenants';
...
// Inside tab rendering logic: { activeTab==='tenants' && <Tenants /> }

*/
