import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  LogOut,
  Image as ImageIcon,
  AlertCircle,
  Home as HomeIcon,
  FileText,
  Bell,
  Search,
  User as UserIcon,
} from "lucide-react";
import Drawer from "../General/Drawer";
import Modal from "../General/Modal";
import { StatusBadge as VolunteerStatusBadge } from "../Volunteer/LostAndFound/LostAndFound";
import Home from "./Home/Home";
import MyReports from "./MyReports/MyReports";
import FoundMatches from "./FoundMatches/FoundMatches";
import Alerts from "./Alerts/Alerts";
import Profile from "./Profile/Profile";

/** Fallback local StatusBadge if volunteer export path changes */
const statusStyles = {
  open: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  matched: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  resolved: "bg-green-500/15 text-green-300 border-green-400/30",
  cancelled: "bg-white/10 text-white/55 border-white/15",
};
const StatusBadge = ({ value }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${statusStyles[value] || "bg-gray-100 text-gray-600 border-gray-200"}`}
  >
    {value}
  </span>
);

/** @typedef { { id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'cancelled'; createdAt:string; matchedWith?:string; resolvedAt?:string } } UserReport */
/** @typedef { { id:string; message:string; type:'report_update'|'system'|'match'; ts:string; read:boolean } } UserAlert */
/** @typedef { { id:string; lost:UserReport; found:{ id:string; description:string; photoUrls:string[]; location:string; createdAt:string }; confidence:number; status:'pending'|'confirmed'|'rejected' } } UserMatch */

const rel = (iso) => {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  const da = Math.floor(h / 24);
  return da + "d";
};

const TabButton = ({ active, onClick, children }) => (
  <button
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={`px-3 py-1.5 rounded-md text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 transition ${active ? "bg-orange-600 text-white shadow" : "text-white/60 hover:bg-white/10"}`}
  >
    {children}
  </button>
);

// Card/StatCard now housed in child modules where needed

const UserDashboard = ({ userId = "user123", onLogout }) => {
  // Active tab key (home|reports|matches|alerts|profile)
  const [tab, setTab] = useState("home");
  const [reports, setReports] = useState(/** @type {UserReport[]} */ ([]));
  const [matches, setMatches] = useState(/** @type {UserMatch[]} */ ([]));
  const [alerts, setAlerts] = useState(/** @type {UserAlert[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [detailReport, setDetailReport] = useState(null);
  const [detailMatch, setDetailMatch] = useState(null);
  const [profile, setProfile] = useState({
    name: "John Doe",
    email: "john@example.com",
    phone: "+1 555 0100",
    password: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  // Report form state
  const [formType, setFormType] = useState("item");
  const [formDesc, setFormDesc] = useState("");
  const [formLocation, setFormLocation] = useState("Zone 1");
  const [formPhotos, setFormPhotos] = useState([]);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Initial load simulation (would call real APIs)
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const now = Date.now();
      const baseReports = [
        {
          id: "r1",
          type: "item",
          description: "Black wallet with RFID blocking.",
          photoUrls: [],
          location: "Zone 2",
          status: "open",
          createdAt: new Date(now - 3600_000).toISOString(),
        },
        {
          id: "r2",
          type: "person",
          description: "Missing child wearing red cap.",
          photoUrls: [],
          location: "Zone 5",
          status: "matched",
          createdAt: new Date(now - 7200_000).toISOString(),
          matchedWith: "f77",
        },
        {
          id: "r3",
          type: "item",
          description: "Blue water bottle with stickers.",
          photoUrls: [],
          location: "Zone 1",
          status: "resolved",
          createdAt: new Date(now - 86400_000).toISOString(),
          resolvedAt: new Date(now - 86000_000).toISOString(),
        },
      ];
      const baseMatches = [
        {
          id: "m1",
          lost: baseReports[1],
          found: {
            id: "f77",
            description: "Child found near food court wearing red cap.",
            photoUrls: [],
            location: "Zone 4",
            createdAt: new Date(now - 4000_000).toISOString(),
          },
          confidence: 0.82,
          status: "pending",
        },
      ];
      const baseAlerts = [
        {
          id: "al1",
          message: "Your report r2 has a potential match.",
          type: "match",
          ts: new Date(now - 3500_000).toISOString(),
          read: false,
        },
        {
          id: "al2",
          message: "System maintenance tonight 11PM.",
          type: "system",
          ts: new Date(now - 10 * 3600_000).toISOString(),
          read: true,
        },
      ];
      setReports(baseReports);
      setMatches(baseMatches);
      setAlerts(baseAlerts);
    } catch (e) {
      setError("Failed to load user data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Simulated realtime events
  useEffect(() => {
    if (loading) return;
    const ivMatch = setInterval(() => {
      // occasionally push a new match referencing an open report
      const open = reports.find((r) => r.status === "open");
      if (!open) return;
      const mid = "m" + Date.now();
      const match = {
        id: mid,
        lost: open,
        found: {
          id: "f" + Date.now(),
          description: "Found " + open.type + " possibly yours",
          photoUrls: [],
          location: "Zone " + (Math.floor(Math.random() * 6) + 1),
          createdAt: new Date().toISOString(),
        },
        confidence: 0.7 + Math.random() * 0.2,
        status: "pending",
      };
      setMatches((m) => [match, ...m]);
      setAlerts((a) => [
        {
          id: "al" + Date.now(),
          message: `New match for report ${open.id}.`,
          type: "match",
          ts: new Date().toISOString(),
          read: false,
        },
        ...a,
      ]);
    }, 150000);
    const ivAlert = setInterval(() => {
      setAlerts((a) => [
        {
          id: "al" + Date.now(),
          message: "System broadcast update.",
          type: "system",
          ts: new Date().toISOString(),
          read: false,
        },
        ...a,
      ]);
    }, 300000);
    return () => {
      clearInterval(ivMatch);
      clearInterval(ivAlert);
    };
  }, [loading, reports]);

  // Derived
  const totalReports = reports.length;
  const openReports = reports.filter((r) => r.status === "open").length;
  const resolvedReports = reports.filter((r) => r.status === "resolved").length;
  const recentActivity = useMemo(() => {
    const act = [];
    reports.forEach((r) =>
      act.push({ ts: r.createdAt, label: `Report ${r.id} created` })
    );
    matches.forEach((m) =>
      act.push({
        ts: m.found.createdAt,
        label: `Match candidate for ${m.lost.id}`,
      })
    );
    alerts.forEach((al) => act.push({ ts: al.ts, label: al.message }));
    return act.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 5);
  }, [reports, matches, alerts]);

  const filteredReports = useMemo(() => {
    let list = reports;
    if (filterStatus) list = list.filter((r) => r.status === filterStatus);
    return [...list].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [reports, filterStatus]);

  const startReport = () => {
    setShowReportModal(true);
    setFormType("item");
    setFormDesc("");
    setFormLocation("Zone 1");
    setFormPhotos([]);
  };
  const submitReport = async () => {
    setFormSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      const rep = {
        id: "r" + Date.now(),
        type: formType,
        description: formDesc.trim() || "(no description)",
        photoUrls: formPhotos,
        location: formLocation,
        status: "open",
        createdAt: new Date().toISOString(),
      };
      setReports((r) => [rep, ...r]);
      setAlerts((a) => [
        {
          id: "al" + Date.now(),
          message: `Your report ${rep.id} submitted.`,
          type: "report_update",
          ts: new Date().toISOString(),
          read: false,
        },
        ...a,
      ]);
      setShowReportModal(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const cancelReport = (id) => {
    setReports((rs) =>
      rs.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r))
    );
    setAlerts((a) => [
      {
        id: "al" + Date.now(),
        message: `Report ${id} cancelled.`,
        type: "report_update",
        ts: new Date().toISOString(),
        read: false,
      },
      ...a,
    ]);
    setDetailReport(null);
  };

  const confirmMatch = (id) => {
    setMatches((ms) =>
      ms.map((m) => (m.id === id ? { ...m, status: "confirmed" } : m))
    );
    // underlying report resolved
    setReports((rs) =>
      rs.map((r) =>
        matches.find((m) => m.id === id)?.lost.id === r.id
          ? { ...r, status: "resolved", resolvedAt: new Date().toISOString() }
          : r
      )
    );
    setAlerts((a) => [
      {
        id: "al" + Date.now(),
        message: `You confirmed a match.`,
        type: "report_update",
        ts: new Date().toISOString(),
        read: false,
      },
      ...a,
    ]);
    setDetailMatch(null);
  };
  const rejectMatch = (id) => {
    setMatches((ms) =>
      ms.map((m) => (m.id === id ? { ...m, status: "rejected" } : m))
    );
    setAlerts((a) => [
      {
        id: "al" + Date.now(),
        message: `You rejected a match.`,
        type: "report_update",
        ts: new Date().toISOString(),
        read: false,
      },
      ...a,
    ]);
    setDetailMatch(null);
  };

  const unreadAlerts = alerts.filter((a) => !a.read).length;
  const markAlertRead = (id) =>
    setAlerts((as) => as.map((a) => (a.id === id ? { ...a, read: true } : a)));
  const markAllAlertsRead = () =>
    setAlerts((as) => as.map((a) => (a.read ? a : { ...a, read: true })));

  const saveProfile = async () => {
    setProfileSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setProfileSaving(false);
    setAlerts((a) => [
      {
        id: "al" + Date.now(),
        message: "Profile updated successfully.",
        type: "system",
        ts: new Date().toISOString(),
        read: false,
      },
      ...a,
    ]);
  };

  const ActiveStatusBadge = VolunteerStatusBadge || StatusBadge;

  // Tab metadata for navigation (mobile + desktop)
  const tabs = [
    { key: "home", label: "Home", icon: HomeIcon },
    { key: "reports", label: "Reports", icon: FileText },
    { key: "matches", label: "Matches", icon: Search },
    { key: "alerts", label: "Alerts", icon: Bell, badge: unreadAlerts },
    { key: "profile", label: "Profile", icon: UserIcon },
  ];

  const content = {
    home: (
      <Home
        stats={{
          total: totalReports,
          open: openReports,
          resolved: resolvedReports,
        }}
        recent={recentActivity.map((r) => ({
          label: r.label,
          time: rel(r.ts),
        }))}
      />
    ),
    reports: (
      <MyReports
        reports={reports}
        loading={loading}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
        onCancel={cancelReport}
      />
    ),
    matches: (
      <FoundMatches
        matches={matches}
        loading={loading}
        onConfirm={confirmMatch}
        onReject={rejectMatch}
      />
    ),
    alerts: (
      <Alerts
        alerts={alerts}
        onMarkRead={markAlertRead}
        onMarkAll={markAllAlertsRead}
        unread={alerts.filter((a) => !a.read).length}
      />
    ),
    profile: (
      <Profile
        profile={profile}
        onChange={setProfile}
        onSave={saveProfile}
        saving={profileSaving}
        onLogout={onLogout}
      />
    ),
  }[tab];

  return (
    <div
      className="min-h-dvh flex flex-col lg:flex-row bg-[#0b111b] text-white/90 lg:max-w-7xl lg:mx-auto lg:border-x lg:border-white/10"
      aria-label="User dashboard"
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 border-r border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white flex items-center justify-center font-semibold text-lg shadow-inner">
            {profile.name.slice(0, 1)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white truncate">
              {profile.name}
            </span>
            <span className="text-[11px] text-white/50">User Portal</span>
          </div>
        </div>
        <nav
          className="flex-1 overflow-y-auto py-4 text-sm text-white/80"
          role="tablist"
        >
          <ul className="space-y-0.5 px-3">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <li key={t.key}>
                  <button
                    onClick={() => setTab(t.key)}
                    role="tab"
                    aria-selected={active}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${active ? "bg-orange-600 text-white shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    <span className="flex-1 truncate text-[13px] font-medium">
                      {t.label}
                    </span>
                    {t.badge ? (
                      <span className="inline-flex items-center justify-center h-5 min-w-[1.1rem] px-1 rounded-full bg-red-600/80 text-white text-[10px] font-semibold shadow">
                        {t.badge}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-white/10 flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-2 rounded-md bg-white/5 border border-white/10">
              <div className="text-xs font-semibold text-white">
                {totalReports}
              </div>
              <div className="text-[10px] text-white/50">Total</div>
            </div>
            <div className="p-2 rounded-md bg-white/5 border border-white/10">
              <div className="text-xs font-semibold text-orange-400">
                {openReports}
              </div>
              <div className="text-[10px] text-white/50">Open</div>
            </div>
            <div className="p-2 rounded-md bg-white/5 border border-white/10">
              <div className="text-xs font-semibold text-green-400">
                {resolvedReports}
              </div>
              <div className="text-[10px] text-white/50">Resolved</div>
            </div>
          </div>
          <button
            onClick={startReport}
            className="h-10 w-full rounded-md bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            <Plus size={16} /> Report Lost
          </button>
          <button
            onClick={() => onLogout?.()}
            className="h-10 w-full rounded-md bg-white/10 hover:bg-white/20 text-white/70 text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Right side content */}
      <div className="flex-1 flex flex-col min-h-dvh">
        {/* Mobile Header */}
        <header className="px-4 py-3 bg-white/5 backdrop-blur-sm border-b border-white/10 flex items-center gap-3 lg:hidden">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => setTab("profile")}
              className="h-11 w-11 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white flex items-center justify-center font-semibold text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 shadow-inner"
              aria-label="Profile"
            >
              {profile.name.slice(0, 1)}
            </button>
            <div className="flex flex-col truncate">
              <span className="text-sm font-semibold text-white truncate">
                {profile.name}
              </span>
              <span className="text-[11px] text-white/50">User Portal</span>
            </div>
          </div>
          <button
            onClick={startReport}
            className="h-10 px-3 rounded-md bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-xs font-semibold flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Report</span>
          </button>
        </header>

        {/* Error */}
        {error && (
          <div className="m-3 p-3 bg-red-500/15 border border-red-400/30 rounded-md text-xs text-red-300 flex items-center gap-2">
            <AlertCircle size={14} className="text-red-300" /> {error}
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3" id="user-main">
          {content}
        </main>

        {/* Bottom Navigation (mobile) */}
        <nav
          className="fixed bottom-0 inset-x-0 z-20 bg-white/5 backdrop-blur-sm border-t border-white/10 shadow-sm flex lg:hidden text-white/70"
          role="tablist"
          aria-label="User navigation"
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 ${active ? "text-orange-400" : "text-white/50"} hover:text-orange-300`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                <span>{t.label}</span>
                <span
                  aria-hidden="true"
                  className={`h-0.5 w-8 rounded-full mt-0.5 transition-colors ${active ? "bg-orange-500" : "bg-transparent"}`}
                />
                {t.badge ? (
                  <span className="absolute top-1.5 right-5 h-4 min-w-[1rem] px-1 rounded-full bg-red-600/80 text-white text-[9px] leading-4 font-semibold">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Report Lost Modal */}
      <Modal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="New Lost Report"
      >
        <div className="space-y-4 text-sm text-white/80">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-white/60">
              Type
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              >
                <option value="item">Item</option>
                <option value="person">Person</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-white/60">
              Location
              <select
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                className="h-9 rounded-md border border-white/10 bg-white/5 px-2 text-sm text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              >
                {[
                  "Zone 1",
                  "Zone 2",
                  "Zone 3",
                  "Zone 4",
                  "Zone 5",
                  "Zone 6",
                ].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-white/60">
            Description
            <textarea
              rows={4}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm resize-none text-white/80 placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              placeholder="Describe the lost item/person, last seen details..."
            />
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-white/60 font-medium">
              Photos{" "}
              <span className="font-normal text-white/40">(URLs for now)</span>
            </div>
            <div className="space-y-2">
              {formPhotos.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={p}
                    onChange={(e) =>
                      setFormPhotos((arr) =>
                        arr.map((v, idx) => (idx === i ? e.target.value : v))
                      )
                    }
                    className="flex-1 h-9 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/80 placeholder-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                  />
                  <button
                    onClick={() =>
                      setFormPhotos((arr) => arr.filter((_, idx) => idx !== i))
                    }
                    className="h-8 px-2 rounded-md bg-white/10 hover:bg-white/20 text-white/70 text-[10px] font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={() => setFormPhotos((p) => [...p, ""])}
                className="h-8 px-3 rounded-md bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-medium flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
              >
                <ImageIcon size={14} /> Add Photo URL
              </button>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              disabled={formSubmitting}
              onClick={submitReport}
              className={`flex-1 h-9 rounded-md text-xs font-semibold flex items-center justify-center gap-2 ${formSubmitting ? "bg-white/10 text-white/40" : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white"}`}
            >
              {formSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Plus size={14} /> Submit Report
                </>
              )}
            </button>
            <button
              onClick={() => setShowReportModal(false)}
              className="h-9 px-4 rounded-md bg-white/10 hover:bg-white/20 text-white/70 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserDashboard;
