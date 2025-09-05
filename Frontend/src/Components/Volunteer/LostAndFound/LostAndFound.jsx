import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import LostReport from "./LostReport/LostReport";
import Founds from "./Found/Found";
import Matched from "./Matched/Matched";
import Missings from "./Missing/Missing";
import MyReports from "./MyReports/MyReports";
import Modal from "../../General/Modal";
import History from "./History/History";
import { getAllLost, getAllFound, getAllMatches } from "../../../Services/api";

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

  // Core datasets mapped from backend
  const [foundCases, setFoundCases] = useState(/** @type {LostCase[]} */ ([]));
  const [lostReports, setLostReports] = useState(/** @type {LostCase[]} */ ([]));
  const [matchedCases, setMatchedCases] = useState([]); // built from /get_all_matches
  // Activity log entries: { id, caseId, action, type, zone, date, status }
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data transformers ------------------------------------------------------
  const mapLost = useCallback((records) => {
    return (records || []).map(r => {
      // Backend status: pending | found
      // Local mapping: pending -> open, found -> resolved
      const statusMap = r.status === 'pending' ? 'open' : 'resolved';
      return {
        id: r.face_id,
        type: 'person',
        description: r.name ? `${r.name} (${r.age ?? 'Unknown'} yrs) – Last seen ${r.where_lost || 'unspecified'}` : `Lost person ${r.face_id.slice(0,8)}`,
        photoUrls: [], // API currently doesn't return image URLs in list
        location: r.where_lost || 'Unknown',
        status: statusMap,
        createdAt: r.upload_time,
        reporterId: r.user_id || 'n/a'
      };
    });
  }, []);

  const mapFound = useCallback((records) => {
    return (records || []).map(r => {
      const statusMap = r.status === 'found' ? 'resolved' : 'open';
      return {
        id: r.face_id,
        type: 'person',
        description: r.name ? `Found: ${r.name} (${r.age ?? 'Unknown'} yrs)` : `Found person ${r.face_id.slice(0,8)}`,
        photoUrls: [],
        location: r.location_found || 'Unknown',
        status: statusMap,
        createdAt: r.upload_time,
        reporterId: r.user_id || (r.reported_by?.name ? r.reported_by.name : 'n/a')
      };
    });
  }, []);

  const buildMatches = useCallback((matchRecords, lostList, foundList) => {
    const lostMap = Object.fromEntries(lostList.map(l => [l.id, l]));
    const foundMap = Object.fromEntries(foundList.map(f => [f.id, f]));
    return (matchRecords || []).map(m => {
      const lostCase = lostMap[m.lost_face_id];
      const foundCase = foundMap[m.found_face_id];
      if (!lostCase || !foundCase) return null;
      return {
        id: m.match_id,
        lostCase: {
          id: lostCase.id,
          type: 'person',
            description: lostCase.description,
            photoUrls: lostCase.photoUrls,
            location: lostCase.location,
            createdAt: lostCase.createdAt
        },
        foundCase: {
          id: foundCase.id,
          type: 'person',
          description: foundCase.description,
          photoUrls: foundCase.photoUrls,
          location: foundCase.location,
          reportedAt: foundCase.createdAt
        },
        confidence: null, // API doesn't provide similarity score here
        status: m.match_status || 'matched'
      };
    }).filter(Boolean);
  }, []);

  // Fetch real data -------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [lostRes, foundRes, matchesRes] = await Promise.all([
        getAllLost(),
        getAllFound(),
        getAllMatches().catch(()=>({ records: [] }))
      ]);
      const lostList = mapLost(lostRes.records || []);
      const foundList = mapFound(foundRes.records || []);
      const matchesList = buildMatches(matchesRes.records || [], lostList, foundList);
      setLostReports(lostList);
      setFoundCases(foundList);
      setMatchedCases(matchesList);
      // Basic derived activity log (initial snapshot)
      const initialActivity = [
        ...foundList.slice(0,5).map(f => ({ id:'act-found-'+f.id, caseId:f.id, action:'Found Logged', type:f.type, zone:f.location, date:f.createdAt, status:f.status })),
        ...lostList.slice(0,5).map(l => ({ id:'act-lost-'+l.id, caseId:l.id, action:'Lost Reported', type:l.type, zone:l.location, date:l.createdAt, status:l.status }))
      ].sort((a,b)=> new Date(b.date)-new Date(a.date));
      setActivity(initialActivity);
    } catch (e) {
      setError(e.message || 'Failed to load lost & found data');
    } finally {
      setLoading(false);
    }
  }, [mapLost, mapFound, buildMatches]);

  useEffect(() => { load(); }, [load]);

  // Optional polling every 90s for updates
  useEffect(() => {
    const iv = setInterval(() => { load(); }, 90000);
    return () => clearInterval(iv);
  }, [load]);

  // Derived sets -----------------------------------------------------------
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
