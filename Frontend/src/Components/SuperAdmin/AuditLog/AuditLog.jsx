import React, { useEffect, useMemo, useState } from "react";
import Drawer from "../../General/Drawer";
import Modal from "../../General/Modal";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTree,
  Filter,
  Search,
  Download,
  Info,
  RefreshCcw,
  XCircle,
} from "lucide-react";

/**
 * @typedef {Object} AuditLog
 * @property {string} id
 * @property {string} ts
 * @property {string} actor
 * @property {string} role
 * @property {string} tenant
 * @property {string} action
 * @property {string} entity
 * @property {'success'|'failure'} result
 * @property {string} ip
 * @property {string} userAgent
 * @property {any} [payload]
 */

const seedAudit = (n = 120) =>
  Array.from({ length: n }).map((_, i) => ({
    id: "al" + (i + 1),
    ts: new Date(Date.now() - (i * 3600_000) / 2).toISOString(),
    actor: ["Priya", "Arjun", "System", "Rahul", "Fatima"][i % 5],
    role: ["superadmin", "admin", "system", "admin", "admin"][i % 5],
    tenant: ["Kumbh Core", "Riverbank Ops", "Transit Hub", "North Camp"][i % 4],
    action: [
      "CREATE_TENANT",
      "UPDATE_POLICY",
      "DELETE_MODEL",
      "DEPLOY_MODEL",
      "LOGIN",
    ][i % 5],
    entity: ["Tenant", "Policy", "Model", "Model", "User"][i % 5],
    result: i % 17 === 0 ? "failure" : "success",
    ip: "10.4.3." + (10 + (i % 50)),
    userAgent: "Mozilla/5.0",
    payload: { sample: true, idx: i },
  }));

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState({ key: "ts", dir: "desc" });
  const [page, setPage] = useState(1);
  const pageSize = 40;
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);

  // fetch simulation
  useEffect(() => {
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      try {
        setLogs(seedAudit());
        setLoading(false);
      } catch (e) {
        setError("Failed to load audit logs");
        setLoading(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // WS append simulation every 50s
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setLogs((prev) => [
        {
          id: "al" + Date.now(),
          ts: new Date().toISOString(),
          actor: "System",
          role: "system",
          tenant: "Kumbh Core",
          action: "HEALTH_PING",
          entity: "System",
          result: "success",
          ip: "127.0.0.1",
          userAgent: "system",
          payload: { heartbeat: true },
        },
        ...prev,
      ]);
    }, 50000);
    return () => clearInterval(iv);
  }, [loading]);

  const relative = (iso) => {
    const d = Date.now() - new Date(iso).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    const da = Math.floor(h / 24);
    return da + "d ago";
  };

  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  const filtered = useMemo(
    () =>
      logs.filter((l) => {
        if (tenantFilter !== "all" && l.tenant !== tenantFilter) return false;
        if (userFilter !== "all" && l.actor !== userFilter) return false;
        if (actionFilter !== "all" && l.action !== actionFilter) return false;
        if (dateFrom && new Date(l.ts) < new Date(dateFrom)) return false;
        if (dateTo && new Date(l.ts) > new Date(dateTo + "T23:59:59"))
          return false;
        if (search.trim()) {
          const s = search.toLowerCase();
          if (
            ![l.actor, l.action, l.entity, l.tenant, l.role].some((v) =>
              v.toLowerCase().includes(s)
            )
          )
            return false;
        }
        return true;
      }),
    [logs, tenantFilter, userFilter, actionFilter, dateFrom, dateTo, search]
  );

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        let av = a[sort.key];
        let bv = b[sort.key];
        if (sort.key === "ts") {
          av = new Date(a.ts).getTime();
          bv = new Date(b.ts).getTime();
        }
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
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

  const skeletonRows = () =>
    Array.from({ length: 10 }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td colSpan={9} className="h-8">
          <div className="h-5 rounded bg-gradient-to-r from-[rgba(255,255,255,0.08)] via-[rgba(255,255,255,0.16)] to-[rgba(255,255,255,0.08)]" />
        </td>
      </tr>
    ));

  const headerCell = (label, key, sortable = true) => (
    <th
      key={key}
      onClick={() => sortable && toggleSort(key)}
      className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[1.3px] cursor-${sortable ? "pointer" : "default"} select-none mk-text-secondary/80`}
    >
      {label}{" "}
      {sort.key === key && (
        <span className="text-[var(--mk-accent)]">
          {sort.dir === "asc" ? "▲" : "▼"}
        </span>
      )}
    </th>
  );

  const tableBody = () => {
    if (loading) return <tbody>{skeletonRows()}</tbody>;
    if (error)
      return (
        <tbody>
          <tr>
            <td
              colSpan={9}
              className="p-6 text-center text-sm text-[var(--mk-danger)]"
            >
              {error}{" "}
              <button
                onClick={() => window.location.reload()}
                className="underline ml-1 hover:text-[var(--mk-text-primary)]"
              >
                Retry
              </button>
            </td>
          </tr>
        </tbody>
      );
    if (!sorted.length)
      return (
        <tbody>
          <tr>
            <td colSpan={9} className="p-10 text-center text-sm mk-text-muted">
              No audit events found.
            </td>
          </tr>
        </tbody>
      );
    return (
      <tbody>
        <AnimatePresence initial={false}>
          {pageRows.map((l) => (
            <motion.tr
              key={l.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="even:bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,143,42,0.12)] cursor-pointer"
              onClick={() => setDetail(l)}
            >
              <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                {relative(l.ts)}
              </td>
              <td className="px-3 py-2">{l.actor}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.08)] text-[10px] uppercase border border-[rgba(255,255,255,0.16)] mk-text-secondary/90 tracking-wide">
                  {l.role}
                </span>
              </td>
              <td className="px-3 py-2">{l.tenant}</td>
              <td className="px-3 py-2 text-[11px]">{l.action}</td>
              <td className="px-3 py-2 mk-text-secondary">{l.entity}</td>
              <td className="px-3 py-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase border tracking-wide ${l.result === "success" ? "bg-[rgba(55,178,77,0.15)] text-[var(--mk-success)] border-[rgba(55,178,77,0.35)]" : "bg-[rgba(255,92,108,0.18)] text-[var(--mk-danger)] border-[rgba(255,92,108,0.45)]"}`}
                >
                  {l.result}
                </span>
              </td>
              <td className="px-3 py-2 mk-text-muted">{l.ip}</td>
              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setDetail(l)}
                  className="text-[var(--mk-accent)] hover:underline text-[11px]"
                >
                  View
                </button>
              </td>
            </motion.tr>
          ))}
        </AnimatePresence>
      </tbody>
    );
  };

  const tenantsList = useMemo(
    () => Array.from(new Set(logs.map((l) => l.tenant))),
    [logs]
  );
  const usersList = useMemo(
    () => Array.from(new Set(logs.map((l) => l.actor))),
    [logs]
  );
  const actionsList = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))),
    [logs]
  );

  const exportLogs = () => {
    setExporting(true);
    setTimeout(() => {
      const csv = ["id,ts,actor,role,tenant,action,entity,result,ip"];
      sorted.forEach((l) =>
        csv.push(
          [
            l.id,
            l.ts,
            l.actor,
            l.role,
            l.tenant,
            l.action,
            l.entity,
            l.result,
            l.ip,
          ].join(",")
        )
      );
      const blob = new Blob([csv.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit_logs.csv";
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 800);
  };

  const pagination = (
    <div className="flex items-center gap-3 px-3 py-2 border-t mk-divider text-[11px] mk-text-muted bg-[rgba(255,255,255,0.03)]">
      <div>
        Page{" "}
        <span className="font-semibold mk-text-secondary">{currentPage}</span> /{" "}
        {totalPages}
      </div>
      <div className="flex gap-1 ml-auto">
        <button
          disabled={currentPage === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className={`h-7 w-7 flex items-center justify-center rounded-md mk-btn-tab ${currentPage === 1 ? "opacity-40 pointer-events-none" : ""}`}
        >
          &lt;
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className={`h-7 w-7 flex items-center justify-center rounded-md mk-btn-tab ${currentPage === totalPages ? "opacity-40 pointer-events-none" : ""}`}
        >
          &gt;
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 mk-text-secondary" aria-label="Audit Logs">
      <div className="flex flex-wrap items-center gap-3 mk-panel p-4 rounded-xl">
        <h2 className="text-sm font-semibold mk-text-primary flex items-center gap-2 tracking-wide">
          <ListTree size={18} className="text-[var(--mk-accent)]" /> Audit Logs
        </h2>
        <div className="hidden md:flex gap-2 ml-auto text-xs items-center">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
          />
          <select
            value={tenantFilter}
            onChange={(e) => {
              setTenantFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
          >
            <option value="all">All Tenants</option>
            {tenantsList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
          >
            <option value="all">All Users</option>
            {usersList.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
          >
            <option value="all">All Actions</option>
            {actionsList.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 mk-text-muted"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="h-9 w-52 pl-7 pr-2 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] focus:bg-[rgba(255,255,255,0.12)] text-xs focus:outline-none focus:border-[var(--mk-accent)]"
            />
          </div>
          <button
            onClick={exportLogs}
            disabled={exporting}
            className="h-9 px-3 rounded-full bg-[var(--mk-accent)] hover:bg-[var(--mk-accent-strong)] text-[#09121f] font-semibold flex items-center gap-1 disabled:opacity-60 shadow-[0_4px_14px_-4px_rgba(255,143,42,0.6)]"
          >
            <Download size={14} />
            {exporting ? "Exporting..." : "Export"}
          </button>
        </div>
        <div className="flex md:hidden gap-2 ml-auto">
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`h-9 px-3 rounded-full text-xs flex items-center gap-1 mk-btn-tab ${showFilters ? "mk-btn-tab-active" : ""}`}
          >
            <Filter size={14} /> Filters
          </button>
          <button
            onClick={exportLogs}
            disabled={exporting}
            className="h-9 px-3 rounded-full bg-[var(--mk-accent)] text-[#09121f] text-xs font-semibold flex items-center gap-1 shadow-[0_4px_14px_-4px_rgba(255,143,42,0.6)]"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden mk-panel rounded-xl p-3 space-y-3 text-xs"
          >
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={tenantFilter}
                onChange={(e) => {
                  setTenantFilter(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
              >
                <option value="all">Tenants</option>
                {tenantsList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setPage(1);
                }}
                className="h-8 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
              >
                <option value="all">Users</option>
                {usersList.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 h-8 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] px-2 focus:outline-none focus:border-[var(--mk-accent)]"
              >
                <option value="all">Actions</option>
                {actionsList.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 mk-text-muted"
                />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search"
                  className="h-8 w-full pl-7 pr-2 rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] focus:bg-[rgba(255,255,255,0.12)] focus:outline-none focus:border-[var(--mk-accent)]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mk-panel rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="min-w-full text-xs">
            <thead className="bg-[rgba(255,255,255,0.05)] backdrop-blur text-[var(--mk-text-secondary)] sticky top-0 z-10">
              <tr>
                {headerCell("Time", "ts")}
                {headerCell("Actor", "actor")}
                {headerCell("Role", "role")}
                {headerCell("Tenant", "tenant")}
                {headerCell("Action", "action")}
                {headerCell("Entity", "entity")}
                {headerCell("Result", "result")}
                {headerCell("IP", "ip")}
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[1.3px] text-left mk-text-secondary/80">
                  Actions
                </th>
              </tr>
            </thead>
            {tableBody()}
          </table>
        </div>
        {pagination}
      </div>

      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? detail.action + " · " + detail.actor : ""}
      >
        {detail && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-500">Time</div>
                <div className="font-medium">{relative(detail.ts)}</div>
              </div>
              <div>
                <div className="text-gray-500">Result</div>
                <div className="font-medium capitalize">{detail.result}</div>
              </div>
              <div>
                <div className="text-gray-500">IP</div>
                <div className="font-medium">{detail.ip}</div>
              </div>
              <div>
                <div className="text-gray-500">User Agent</div>
                <div className="font-medium text-[10px] break-all">
                  {detail.userAgent}
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 mb-2">
                Payload
              </h4>
              <pre className="bg-gray-100 rounded p-2 text-[10px] overflow-auto max-h-48">
                {JSON.stringify(detail.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLogs;

/* Integration:
import AuditLogs from './AuditLog/AuditLog';
// Sidebar tab key 'audit' should render: { activeTab==='audit' && <AuditLogs /> }
*/
