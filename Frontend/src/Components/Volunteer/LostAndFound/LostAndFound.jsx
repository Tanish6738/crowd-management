import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import LostReport from "./LostReport/LostReport";
import Founds from "./Found/Found";
import Matched from "./Matched/Matched";
import Missings from "./Missing/Missing";
import MyReports from "./MyReports/MyReports";
import Modal from "../../General/Modal";
import History from "./History/History";

/** Shared Data Contract */
/** @typedef {{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'missing'|'cancelled'; createdAt:string; reporterId:string; matchedWith?:string; resolvedAt?:string }} LostCase */

// Simple status style map (dark theme tinted)
const badgeStyles = {
  open: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  matched: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  resolved: "bg-green-500/15 text-green-300 border-green-400/30",
  missing: "bg-pink-500/15 text-pink-300 border-pink-400/30",
  cancelled: "bg-white/10 text-white/55 border-white/15",
};

export const StatusBadge = ({ value }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${badgeStyles[value] || "bg-gray-100 text-gray-600 border-gray-200"}`}
  >
    {value}
  </span>
);

const LostAndFound = ({ volunteerId = "vol123" }) => {
  const [tab, setTab] = useState("founds"); // founds default
  const [showLostReportModal, setShowLostReportModal] = useState(false);

  // Core datasets
  const [foundCases, setFoundCases] = useState(/** @type {LostCase[]} */ ([]));
  const [lostReports, setLostReports] = useState(
    /** @type {LostCase[]} */ ([])
  );
  // Activity log entries: { id, caseId, action, type, zone, date, status }
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial load simulation
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 500));
      const now = Date.now();
      setFoundCases([
        {
          id: "fd1",
          type: "item",
          description: "Black backpack with red stripes.",
          photoUrls: [],
          location: "Zone 4",
          status: "open",
          createdAt: new Date(now - 3600_000).toISOString(),
          reporterId: "r1",
        },
        {
          id: "fd2",
          type: "person",
          description: "Young child (~6) waiting near info booth.",
          photoUrls: [],
          location: "Zone 2",
          status: "matched",
          createdAt: new Date(now - 7200_000).toISOString(),
          reporterId: "r2",
          matchedWith: "lr1",
        },
      ]);
      setLostReports([
        {
          id: "lr1",
          type: "person",
          description: "Missing child named Sam wearing blue shirt.",
          photoUrls: [],
          location: "Zone 1",
          status: "matched",
          createdAt: new Date(now - 7500_000).toISOString(),
          reporterId: volunteerId,
          matchedWith: "fd2",
        },
      ]);
      setActivity([
        { id: 'a1', caseId: 'fd1', action: 'Found Logged', type: 'item', zone: 'Zone 4', date: new Date(now-3600_000).toISOString(), status: 'open' },
        { id: 'a2', caseId: 'hxPrev', action: 'Resolved', type: 'item', zone: 'Zone 3', date: new Date(now-25*3600_000).toISOString(), status: 'resolved' }
      ]);
    } catch (e) {
      setError("Failed to load lost & found data.");
    } finally {
      setLoading(false);
    }
  }, [volunteerId]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time simulated events (found:new, lost:new)
  useEffect(() => {
    if (loading) return;
    const ivFound = setInterval(() => {
      setFoundCases((c) => [
        {
          id: "fd" + Date.now(),
          type: Math.random() > 0.5 ? "person" : "item",
          description: "Auto found case pending review.",
          photoUrls: [],
          location: "Zone " + (Math.floor(Math.random() * 8) + 1),
          status: "open",
          createdAt: new Date().toISOString(),
          reporterId: "sys",
        },
        ...c,
      ]);
    }, 120000);
    const ivLost = setInterval(() => {
      setLostReports((c) => [
        {
          id: "lr" + Date.now(),
          type: Math.random() > 0.5 ? "person" : "item",
          description: "Auto lost report awaiting validation.",
          photoUrls: [],
          location: "Zone " + (Math.floor(Math.random() * 8) + 1),
          status: "open",
          createdAt: new Date().toISOString(),
          reporterId: "guest",
        },
        ...c,
      ]);
    }, 180000);
    return () => {
      clearInterval(ivFound);
      clearInterval(ivLost);
    };
  }, [loading]);

  // Derived sets
  // Build MatchedCase objects from paired lostReports + foundCases where status === 'matched'.
  // Simple heuristic pairing by matchedWith field if present.
  const matchedCases = useMemo(() => {
    const lostIndexed = Object.fromEntries(lostReports.filter(l=>l.status==='matched').map(l=>[l.id,l]));
    const list = [];
    foundCases.forEach(f => {
      if(f.status==='matched') {
        // try to find related lost by matchedWith or by description fuzzy (simplified)
        const related = f.matchedWith && lostIndexed[f.matchedWith] ? lostIndexed[f.matchedWith] : Object.values(lostIndexed).find(l=> l.type===f.type && l.description.slice(0,20)===f.description.slice(0,20));
        if(related) {
          list.push({
            id: 'match-'+related.id+'-'+f.id,
            lostCase: {
              id: related.id,
              type: related.type,
              description: related.description,
              photoUrls: related.photoUrls||[],
              location: related.location,
              createdAt: related.createdAt
            },
            foundCase: {
              id: f.id,
              type: f.type,
              description: f.description,
              photoUrls: f.photoUrls||[],
              location: f.location,
              reportedAt: f.createdAt
            },
            confidence: 0.8,
            status: 'matched'
          });
        }
      }
    });
    return list;
  }, [foundCases, lostReports]);
  const missingCases = useMemo(
    () => lostReports.filter((c) => c.status === "missing"),
    [lostReports]
  );

  // Handlers passed to children
  const addActivity = (caseId, action, type, zone, status) => {
    setActivity(a => [{ id:'act'+Date.now()+Math.random().toString(16).slice(2), caseId, action, type, zone, date:new Date().toISOString(), status }, ...a]);
  };
  const addLostReport = (report) => {
    setLostReports((r) => [report, ...r]);
    addActivity(report.id, 'Reported', report.type, report.location, report.status);
  };
  const updateFound = (id, updater) =>
    setFoundCases((cs) => cs.map((c) => (c.id === id ? updater(c) : c)));
  const resolveFound = (id) =>
    setFoundCases((cs) => cs.filter((c) => c.id !== id));

  const updateReport = (id, updater) =>
    setLostReports(rs => rs.map(r => r.id===id ? updater(r): r));
  const cancelReport = (id) => {
    setLostReports(rs => rs.map(r => r.id===id ? { ...r, status:'cancelled'}: r));
    addActivity(id, 'Cancelled', 'item', '-', 'cancelled');
  };
  const markMissingFound = (id) => {
    setLostReports(rs => rs.map(r => r.id===id ? { ...r, status:'resolved', resolvedAt:new Date().toISOString() }: r));
    addActivity(id, 'Resolved', 'person', '-', 'resolved');
  };

  const tabs = [
    { key: "founds", label: "Founds" },
    { key: "lostReport", label: "Lost Report" },
    { key: "myReports", label: "My Reports" },
    { key: "matched", label: "Matched" },
    { key: "missings", label: "Missings" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="space-y-5 mk-text-primary" aria-label="Lost and Found module">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold mk-text-primary">Lost & Found</h2>
        <div
          role="tablist"
          aria-label="Lost & Found tabs"
          className="flex flex-wrap gap-1 text-xs rounded-md mk-border mk-surface-alt backdrop-blur-sm p-1"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => {
                setTab(t.key);
                if (t.key === "lostReport") setShowLostReportModal(true);
              }}
              className={`px-3 py-1.5 rounded-md font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 transition ${tab === t.key ? "bg-gradient-to-r from-[var(--mk-accent)] to-[var(--mk-accent-strong)] text-[#081321] shadow" : "mk-text-muted hover:bg-orange-50 dark:hover:bg-white/10"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setShowLostReportModal(true);
            setTab("lostReport");
          }}
          className="ml-auto h-9 px-4 rounded-md bg-gradient-to-r from-[var(--mk-accent)] to-[var(--mk-accent-strong)] text-[#081321] flex items-center gap-2 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 shadow hover:brightness-110"
        >
          <Plus size={14} /> Report Lost
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-500/10 border border-red-500/40 text-xs flex justify-between items-center text-red-300">
          <span>{error}</span>
          <button onClick={load} className="underline hover:text-red-200">Retry</button>
        </div>
      )}

      {/* Founds */}
      {tab === "founds" && (
        <Founds
          loading={loading}
          data={foundCases}
          onUpdate={updateFound}
          onResolve={resolveFound}
        />
      )}

      {/* Lost Report form is modal driven; also allow inline for desktop if desired */}
      <Modal
        open={showLostReportModal}
        onClose={() => {
          setShowLostReportModal(false);
          if (tab === "lostReport") setTab("founds");
        }}
        title="New Lost Report"
      >
        <LostReport
          volunteerId={volunteerId}
          onCreated={(r) => {
            addLostReport(r);
            setShowLostReportModal(false);
            setTab("myReports");
          }}
        />
      </Modal>

      {tab === "myReports" && (
        <MyReports
          data={lostReports.filter((r) => r.reporterId === volunteerId)}
          loading={loading}
          onUpdate={updateReport}
          onCancel={cancelReport}
        />
      )}
      {tab === "matched" && <Matched data={matchedCases} loading={loading} />}
      {tab === "missings" && <Missings data={missingCases} loading={loading} onMarkFound={markMissingFound} />}
      {tab === "history" && <History data={activity} loading={loading} />}
    </div>
  );
};

export default LostAndFound;
