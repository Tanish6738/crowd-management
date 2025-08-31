import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../../General/Modal";
import Drawer from "../../General/Drawer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users as UsersIcon,
  Search,
  Filter,
  UserPlus,
  Mail,
  Shield,
  Building2,
  Clock,
  RefreshCcw,
  PauseCircle,
  PlayCircle,
  KeyRound,
  XCircle,
  CheckCircle2,
} from "lucide-react";

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {'superadmin'|'admin'|'volunteer'|'pilgrim'} role
 * @property {string} tenantName
 * @property {'active'|'suspended'} status
 * @property {string} lastLogin
 */

const seedUsers = (n = 58) =>
  Array.from({ length: n }).map((_, i) => {
    const roles = ["admin", "volunteer", "pilgrim"];
    const role = i % 17 === 0 ? "superadmin" : roles[i % roles.length];
    const tn = ["Kumbh Core", "Riverbank Ops", "Transit Hub", "North Camp"][
      i % 4
    ];
    const status = i % 13 === 0 ? "suspended" : "active";
    return {
      id: "u" + (i + 1),
      name:
        ["Arjun", "Priya", "Rahul", "Fatima", "Ishan", "Neha", "Zara", "Kabir"][
          i % 8
        ] +
        " " +
        ["Mehta", "Singh", "Verma", "Khan", "Patel", "Rao"][i % 6],
      email: "user" + (i + 1) + "@example.com",
      role,
      tenantName: tn,
      status,
      lastLogin: new Date(
        Date.now() - Math.random() * 72 * 3600000
      ).toISOString(),
      phone: "+91 98" + ("" + Math.floor(10000000 + Math.random() * 89999999)),
      activity: Array.from({ length: Math.min(10, 3 + (i % 10)) }).map(
        (__, j) => new Date(Date.now() - (j + 1) * 3600_000).toISOString()
      ),
      actions: Array.from({ length: 5 }).map((__, j) => ({
        at: new Date(Date.now() - (j + 1) * 7200_000).toISOString(),
        type: ["LOGIN", "RESET_PW", "SUSPEND", "INVITE", "UPDATE"][j % 5],
      })),
    };
  });

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [detailUser, setDetailUser] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    tenant: "",
    role: "admin",
  });
  const [inviting, setInviting] = useState(false);
  const [pendingSuspend, setPendingSuspend] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  // fetch simulation
  useEffect(() => {
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      try {
        setUsers(seedUsers());
        setLoading(false);
      } catch (e) {
        setError("Failed to load users");
        setLoading(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, []);

  // WebSocket simulation: random login update every 30s
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setUsers((prev) =>
        prev.map((u) =>
          Math.random() < 0.05
            ? { ...u, lastLogin: new Date().toISOString() }
            : u
        )
      );
    }, 30000);
    return () => clearInterval(iv);
  }, [loading]);

  const toggleSort = (key) =>
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (tenantFilter !== "all" && u.tenantName !== tenantFilter)
          return false;
        if (roleFilter !== "all" && u.role !== roleFilter) return false;
        if (statusFilter !== "all" && u.status !== statusFilter) return false;
        if (search.trim()) {
          const s = search.toLowerCase();
          if (
            !u.name.toLowerCase().includes(s) &&
            !u.email.toLowerCase().includes(s)
          )
            return false;
        }
        return true;
      }),
    [users, tenantFilter, roleFilter, statusFilter, search]
  );

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        let av = a[sort.key];
        let bv = b[sort.key];
        if (sort.key === "lastLogin") {
          av = new Date(a.lastLogin).getTime();
          bv = new Date(b.lastLogin).getTime();
        }
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
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

  const inviteSubmit = (e) => {
    e.preventDefault();
    setInviting(true);
    setTimeout(() => {
      setUsers((u) => [
        {
          id: "u" + Date.now(),
          name: "Pending Admin",
          email: inviteForm.email,
          role: "admin",
          tenantName: inviteForm.tenant || "Kumbh Core",
          status: "active",
          lastLogin: new Date().toISOString(),
          phone: "",
          activity: [],
          actions: [],
        },
        ...u,
      ]);
      setInviting(false);
      setInviteOpen(false);
      setInviteForm({ email: "", tenant: "", role: "admin" });
    }, 900);
  };

  const suspendUser = (user) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? { ...u, status: u.status === "active" ? "suspended" : "active" }
          : u
      )
    );
    setPendingSuspend(null);
    if (detailUser && detailUser.id === user.id)
      setDetailUser((d) => ({
        ...d,
        status: d.status === "active" ? "suspended" : "active",
      }));
  };
  const resetPassword = (user) => {
    setResetUser(null); /* simulate */
  };

  const headerCell = (label, key, sortable = true) => (
    <th
      key={key}
      onClick={() => sortable && toggleSort(key)}
      className={`px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide cursor-${sortable ? "pointer" : "default"} select-none`}
    >
      {label}{" "}
      {sort.key === key && (
        <span className="text-orange-600">
          {sort.dir === "asc" ? "▲" : "▼"}
        </span>
      )}
    </th>
  );

  const skeletonRows = () =>
    Array.from({ length: 8 }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td colSpan={8} className="h-9">
          <div className="h-5 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5" />
        </td>
      </tr>
    ));

  const tableBody = () => {
    if (loading) return <tbody>{skeletonRows()}</tbody>;
    if (error)
      return (
        <tbody>
          <tr>
            <td colSpan={8} className="p-6 text-center text-sm text-red-400">
              {error}{" "}
              <button
                onClick={() => window.location.reload()}
                className="underline ml-1 text-[var(--mk-accent)]"
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
            <td colSpan={8} className="p-10 text-center text-sm text-white/50">
              No users found.
            </td>
          </tr>
        </tbody>
      );
    return (
      <tbody>
        <AnimatePresence initial={false}>
          {pageRows.map((u) => (
            <motion.tr
              key={u.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="even:bg-white/5 hover:bg-[var(--mk-muted)]/40 cursor-pointer transition"
              onClick={() => setDetailUser(u)}
            >
              <td className="px-3 py-2 whitespace-nowrap font-medium">
                {u.name}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-white/70">
                {u.email}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase border backdrop-blur ${u.role === "superadmin" ? "bg-purple-500/20 text-purple-300 border-purple-400/30" : u.role === "admin" ? "bg-[var(--mk-accent)]/15 text-[var(--mk-accent-strong)] border-[var(--mk-accent)]/30" : u.role === "volunteer" ? "bg-blue-500/20 text-blue-300 border-blue-400/30" : "bg-green-500/20 text-green-300 border-green-400/30"}`}
                >
                  {u.role}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-white/70">
                {u.tenantName}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase border ${u.status === "active" ? "bg-green-500/15 text-green-300 border-green-400/30" : "bg-white/10 text-white/60 border-white/15"}`}
                >
                  {u.status}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap tabular-nums text-white/70">
                {relative(u.lastLogin)}
              </td>
              <td
                className="px-3 py-2 whitespace-nowrap"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex gap-2 text-[11px]">
                  <button
                    onClick={() => setDetailUser(u)}
                    className="text-[var(--mk-accent)] hover:underline"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setResetUser(u)}
                    className="text-white/60 hover:text-white/90 hover:underline"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setPendingSuspend(u)}
                    className="text-white/60 hover:text-white/90 hover:underline"
                  >
                    {u.status === "active" ? "Suspend" : "Resume"}
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </AnimatePresence>
      </tbody>
    );
  };

  const pagination = (
    <div className="flex items-center gap-3 px-3 py-2 border-t border-white/10 bg-white/5 text-[11px]">
      <div>
        Page <span className="font-semibold">{currentPage}</span> / {totalPages}
      </div>
      <div className="flex gap-1 ml-auto">
        <button
          disabled={currentPage === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className={`h-7 w-7 flex items-center justify-center rounded border border-white/10 text-white/70 ${currentPage === 1 ? "opacity-40" : "hover:bg-[var(--mk-muted)]/50"}`}
        >
          &lt;
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className={`h-7 w-7 flex items-center justify-center rounded border border-white/10 text-white/70 ${currentPage === totalPages ? "opacity-40" : "hover:bg-[var(--mk-muted)]/50"}`}
        >
          &gt;
        </button>
      </div>
    </div>
  );

  const tenantsList = useMemo(
    () => Array.from(new Set(users.map((u) => u.tenantName))),
    [users]
  );

  const kpis = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      suspended: users.filter((u) => u.status === "suspended").length,
    }),
    [users]
  );

  const kpiTiles = (
    <div className="grid sm:grid-cols-3 gap-3 text-[11px]">
      {[
        {
          label: "Total Users",
          value: kpis.total,
          color:
            "from-[var(--mk-accent)]/25 via-[var(--mk-accent)]/10 to-transparent text-[var(--mk-accent-strong)]",
        },
        {
          label: "Admins",
          value: kpis.admins,
          color:
            "from-purple-500/30 via-purple-500/10 to-transparent text-purple-300",
        },
        {
          label: "Suspended",
          value: kpis.suspended,
          color: "from-white/20 via-white/5 to-transparent text-white/60",
        },
      ].map((k) => (
        <div
          key={k.label}
          className={`p-2 rounded-lg border border-white/10 flex items-center gap-2 bg-gradient-to-br ${k.color}`}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide font-medium text-white/70">
              {k.label}
            </div>
            <div className="text-sm font-semibold tabular-nums">{k.value}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 mk-text-primary" aria-label="Users Management">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-2 mk-text-primary">
          <UsersIcon size={18} className="text-[var(--mk-accent)]" /> Users
        </h2>
        <div className="hidden md:flex items-center gap-2 text-xs ml-auto">
          <select
            value={tenantFilter}
            onChange={(e) => {
              setTenantFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md px-2 bg-[var(--mk-surface-2)] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
          >
            <option value="all">All Tenants</option>
            {tenantsList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md px-2 bg-[var(--mk-surface-2)] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
          >
            {["all", "superadmin", "admin", "volunteer", "pilgrim"].map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All Roles" : r}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md px-2 bg-[var(--mk-surface-2)] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
          >
            {["all", "active", "suspended"].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Statuses" : s}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search users"
              className="h-9 w-56 pl-7 pr-2 rounded-md bg-[var(--mk-surface-2)] border border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)] placeholder:text-white/30"
            />
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="h-9 px-3 rounded-md bg-[var(--mk-accent)] text-[#09121f] font-medium flex items-center gap-1 shadow hover:brightness-110 transition"
          >
            <UserPlus size={14} /> Invite Admin
          </button>
        </div>
        <div className="flex md:hidden gap-2 ml-auto">
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`h-9 px-3 rounded-md border text-xs flex items-center gap-1 transition ${showFilters ? "bg-[var(--mk-accent)] text-[#09121f] border-[var(--mk-accent)]" : "bg-[var(--mk-surface-2)] border-white/10 text-white/70 hover:bg-[var(--mk-muted)]"}`}
          >
            <Filter size={14} /> Filters
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="h-9 px-3 rounded-md bg-[var(--mk-accent)] text-[#09121f] text-xs font-medium flex items-center gap-1 shadow hover:brightness-110"
          >
            <UserPlus size={14} /> Invite
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden mk-panel p-3 space-y-3 text-xs rounded-xl"
          >
            <div className="flex gap-2">
              <select
                value={tenantFilter}
                onChange={(e) => {
                  setTenantFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 h-8 rounded bg-[var(--mk-surface-2)] border border-white/10 px-2 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
              >
                <option value="all">All Tenants</option>
                {tenantsList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 h-8 rounded bg-[var(--mk-surface-2)] border border-white/10 px-2 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
              >
                {["all", "superadmin", "admin", "volunteer", "pilgrim"].map(
                  (r) => (
                    <option key={r} value={r}>
                      {r === "all" ? "All Roles" : r}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 h-8 rounded bg-[var(--mk-surface-2)] border border-white/10 px-2 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)]"
              >
                {["all", "active", "suspended"].map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Statuses" : s}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <Search
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
                  className="h-8 w-full pl-7 pr-2 rounded bg-[var(--mk-surface-2)] border border-white/10 focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)] placeholder:text-white/30"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {kpiTiles}

      <div className="mk-panel rounded-xl border border-white/5 shadow-lg overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 z-10 bg-white/5 backdrop-blur text-[var(--mk-text-secondary)]">
              <tr>
                {headerCell("Name", "name")}
                {headerCell("Email", "email")}
                {headerCell("Role", "role")}
                {headerCell("Tenant", "tenantName")}
                {headerCell("Status", "status")}
                {headerCell("Last Login", "lastLogin")}
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

      {/* Invite Admin Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite New Admin"
        actions={[
          <button
            key="cancel"
            disabled={inviting}
            onClick={() => setInviteOpen(false)}
            className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs"
          >
            Cancel
          </button>,
          <button
            key="send"
            disabled={inviting || !inviteForm.email}
            onClick={inviteSubmit}
            className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-60"
          >
            {inviting ? (
              <RefreshCcw size={14} className="animate-spin" />
            ) : (
              <Mail size={14} />
            )}{" "}
            Send Invite
          </button>,
        ]}
      >
        <form onSubmit={inviteSubmit} className="space-y-5 text-sm">
          <div>
            <label className="block text-xs font-medium mb-1">Email</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, email: e.target.value }))
              }
              required
              className="w-full h-8 rounded border border-gray-300 px-2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Assign Tenant
            </label>
            <select
              value={inviteForm.tenant}
              onChange={(e) =>
                setInviteForm((f) => ({ ...f, tenant: e.target.value }))
              }
              className="w-full h-8 rounded border border-gray-300 px-2"
            >
              <option value="">Select...</option>
              {tenantsList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-gray-500">
            An invite email with activation instructions will be sent.
          </p>
        </form>
      </Modal>

      {/* Suspend / Resume Modal */}
      <Modal
        open={!!pendingSuspend}
        onClose={() => setPendingSuspend(null)}
        title={
          pendingSuspend
            ? pendingSuspend.status === "active"
              ? "Suspend User"
              : "Resume User"
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
                  key="go"
                  onClick={() => suspendUser(pendingSuspend)}
                  className={`px-3 py-1.5 rounded text-white text-xs font-medium ${pendingSuspend.status === "active" ? "bg-orange-500 hover:bg-orange-600" : "bg-green-600 hover:bg-green-700"}`}
                >
                  {pendingSuspend.status === "active" ? "Suspend" : "Resume"}
                </button>,
              ]
            : []
        }
      >
        {pendingSuspend && (
          <p className="text-[11px] text-gray-600">
            {pendingSuspend.status === "active"
              ? "Suspending prevents logins but retains data."
              : "Resuming restores normal access."}
          </p>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={!!resetUser}
        onClose={() => setResetUser(null)}
        title={resetUser ? "Reset Password" : ""}
        actions={
          resetUser
            ? [
                <button
                  key="cancel"
                  onClick={() => setResetUser(null)}
                  className="px-3 py-1.5 rounded border border-gray-300 bg-white text-xs"
                >
                  Cancel
                </button>,
                <button
                  key="ok"
                  onClick={() => resetPassword(resetUser)}
                  className="px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium"
                >
                  Send Reset Link
                </button>,
              ]
            : []
        }
      >
        {resetUser && (
          <p className="text-[11px] text-gray-600">
            Send password reset email to <strong>{resetUser.email}</strong>?
          </p>
        )}
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        title={detailUser ? detailUser.name : ""}
      >
        {detailUser && (
          <div className="space-y-6 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-gray-500">Email</div>
                <div className="font-medium break-all">{detailUser.email}</div>
              </div>
              <div>
                <div className="text-gray-500">Tenant</div>
                <div className="font-medium">{detailUser.tenantName}</div>
              </div>
              <div>
                <div className="text-gray-500">Role</div>
                <div className="font-medium capitalize">{detailUser.role}</div>
              </div>
              <div>
                <div className="text-gray-500">Status</div>
                <div className="font-medium capitalize">
                  {detailUser.status}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Last Login</div>
                <div className="font-medium">
                  {relative(detailUser.lastLogin)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Phone</div>
                <div className="font-medium">{detailUser.phone || "—"}</div>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold tracking-wide uppercase text-gray-600 mb-2">
                Recent Logins
              </h4>
              <ul className="space-y-1 max-h-32 overflow-auto pr-1">
                {detailUser.activity.slice(0, 10).map((a, i) => (
                  <li key={i} className="text-gray-600 flex justify-between">
                    <span>Login</span>
                    <span className="tabular-nums">{relative(a)}</span>
                  </li>
                ))}
                {!detailUser.activity.length && (
                  <li className="text-gray-400">No logins.</li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-semibold tracking-wide uppercase text-gray-600 mb-2">
                Recent Actions
              </h4>
              <ul className="space-y-1 max-h-32 overflow-auto pr-1">
                {detailUser.actions.slice(0, 5).map((a, i) => (
                  <li key={i} className="text-gray-600 flex justify-between">
                    <span>{a.type}</span>
                    <span className="tabular-nums">{relative(a.at)}</span>
                  </li>
                ))}
                {!detailUser.actions.length && (
                  <li className="text-gray-400">No actions.</li>
                )}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => setResetUser(detailUser)}
                className="px-3 py-1.5 rounded border border-gray-300 text-[11px] hover:bg-orange-50 flex items-center gap-1"
              >
                <KeyRound size={14} /> Reset PW
              </button>
              <button
                onClick={() => setPendingSuspend(detailUser)}
                className="px-3 py-1.5 rounded border border-gray-300 text-[11px] hover:bg-orange-50 flex items-center gap-1"
              >
                {detailUser.status === "active" ? (
                  <PauseCircle size={14} />
                ) : (
                  <PlayCircle size={14} />
                )}{" "}
                {detailUser.status === "active" ? "Suspend" : "Resume"}
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Users;

/* Integration:
import Users from './Users/Users';
// In SuperAdminDashboard tabs include { key:'users', label:'Users' }
// Render when active: { activeTab==='users' && <Users /> }
*/
