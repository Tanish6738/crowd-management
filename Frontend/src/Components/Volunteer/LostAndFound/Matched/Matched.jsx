import React, { useCallback, useEffect, useMemo, useState } from "react";
import Drawer from "../../../General/Drawer";
import { CheckCircle2, XCircle, Clock, MapPin, Activity } from "lucide-react";
import { StatusBadge } from "../LostAndFound";

/** @typedef {{ id:string; lostCase:{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; createdAt:string }; foundCase:{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; reportedAt:string }; confidence?:number; status:'matched'|'confirmed'|'rejected' }} MatchedCase */

const relative = (iso) => {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  const da = Math.floor(h / 24);
  return da + "d";
};

const confidenceColor = (v) => {
  if (v == null) return "bg-gray-200";
  if (v >= 0.85) return "bg-green-500";
  if (v >= 0.6) return "bg-amber-500";
  return "bg-red-500";
};

const Matched = ({ loading: externalLoading, data: externalData }) => {
  const [matches, setMatches] = useState(
    /** @type {MatchedCase[]} */ (externalData || [])
  );
  const [loading, setLoading] = useState(
    !externalData?.length && !!externalLoading
  );
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(/** @type {MatchedCase|null} */ (null));
  const [actionBusy, setActionBusy] = useState(false);

  // Sync if parent updates data prop
  useEffect(() => {
    if (externalData) setMatches(externalData);
  }, [externalData]);
  useEffect(() => {
    setLoading(!!externalLoading);
  }, [externalLoading]);

  const fetchMatched = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const now = Date.now();
      const seed = [
        {
          id: "m1",
          status: "matched",
          confidence: 0.82,
          lostCase: {
            id: "lr1",
            type: "person",
            description: "Missing child Sam wearing blue shirt.",
            photoUrls: [],
            location: "Zone 1",
            createdAt: new Date(now - 7200_000).toISOString(),
          },
          foundCase: {
            id: "fd2",
            type: "person",
            description: "Young child waiting near info booth.",
            photoUrls: [],
            location: "Zone 2",
            reportedAt: new Date(now - 3600_000).toISOString(),
          },
        },
        {
          id: "m2",
          status: "matched",
          confidence: 0.91,
          lostCase: {
            id: "lr2",
            type: "item",
            description: "Black backpack with laptop inside.",
            photoUrls: [],
            location: "Zone 5",
            createdAt: new Date(now - 5400_000).toISOString(),
          },
          foundCase: {
            id: "fd3",
            type: "item",
            description: "Black backpack found near food court.",
            photoUrls: [],
            location: "Zone 4",
            reportedAt: new Date(now - 4000_000).toISOString(),
          },
        },
      ];
      setMatches(seed);
    } catch (e) {
      setError("Failed to load matched cases.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!externalData) fetchMatched();
  }, [externalData, fetchMatched]);

  // Simulated WS events: lost:matched (new), lost:resolved (remove if confirmed)
  useEffect(() => {
    if (loading) return;
    const ivNew = setInterval(() => {
      setMatches((ms) => [
        {
          id: "m" + Date.now(),
          status: "matched",
          confidence: Math.random(),
          lostCase: {
            id: "lrAuto" + Date.now(),
            type: Math.random() > 0.5 ? "person" : "item",
            description: "Auto lost case pending review.",
            photoUrls: [],
            location: "Zone " + (Math.floor(Math.random() * 8) + 1),
            createdAt: new Date(
              Date.now() - Math.floor(Math.random() * 7200_000)
            ).toISOString(),
          },
          foundCase: {
            id: "fdAuto" + Date.now(),
            type: Math.random() > 0.5 ? "person" : "item",
            description: "Auto found case candidate.",
            photoUrls: [],
            location: "Zone " + (Math.floor(Math.random() * 8) + 1),
            reportedAt: new Date().toISOString(),
          },
        },
        ...ms,
      ]);
    }, 180000);
    const ivResolved = setInterval(() => {
      setMatches((ms) =>
        ms.filter((m) => !(m.status === "confirmed" && Math.random() < 0.05))
      );
    }, 300000);
    return () => {
      clearInterval(ivNew);
      clearInterval(ivResolved);
    };
  }, [loading]);

  const confirmMatch = async (mc) => {
    setActionBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setMatches((ms) =>
        ms.map((m) => (m.id === mc.id ? { ...m, status: "confirmed" } : m))
      );
      setDetail((d) =>
        d && d.id === mc.id ? { ...d, status: "confirmed" } : d
      );
    } finally {
      setActionBusy(false);
    }
  };
  const rejectMatch = async (mc) => {
    setActionBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setMatches((ms) =>
        ms.map((m) => (m.id === mc.id ? { ...m, status: "rejected" } : m))
      );
      setDetail((d) =>
        d && d.id === mc.id ? { ...d, status: "rejected" } : d
      );
    } finally {
      setActionBusy(false);
    }
  };

  const sorted = useMemo(
    () =>
      [...matches].sort((a, b) => (b.confidence || 0) - (a.confidence || 0)),
    [matches]
  );

  return (
    <div
      className="flex flex-col md:grid md:grid-cols-5 md:gap-5 text-white/90"
      aria-label="Matched cases"
    >
      <div className="md:col-span-2 space-y-3 mb-4 md:mb-0">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse"
            />
          ))}
        {!loading && error && (
          <div className="p-3 rounded-md bg-red-500/15 border border-red-400/30 text-xs flex justify-between items-center text-red-300">
            <span>{error}</span>
            <button
              onClick={fetchMatched}
              className="underline hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && sorted.length === 0 && (
          <div className="p-10 text-center text-sm text-white/50 bg-white/5 border border-white/10 rounded-lg">
            No matches to review right now.
          </div>
        )}
        {!loading &&
          !error &&
          sorted.map((m) => (
            <div
              key={m.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(m)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setDetail(m);
              }}
              className={`border rounded-lg p-3 flex flex-col gap-3 cursor-pointer backdrop-blur-sm transition ${detail?.id === m.id ? "border-orange-400/60 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"}`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 text-[11px]">
                  <StatusBadge
                    value={m.status === "matched" ? "matched" : m.status}
                  />
                  {m.confidence != null && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-white/60">
                        {Math.round(m.confidence * 100)}%
                      </span>
                      <div className="h-2 w-14 rounded bg-white/10 overflow-hidden">
                        <div
                          className={`h-full ${confidenceColor(m.confidence)} transition-all`}
                          style={{
                            width: `${Math.round(m.confidence * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-white/40">
                  {m.id}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <div className="h-14 w-14 rounded-md bg-white/10 flex items-center justify-center overflow-hidden text-white/40 text-[10px]">
                    {m.lostCase?.photoUrls?.length ? (
                      <img
                        src={m.lostCase.photoUrls[0]}
                        alt="lost thumbnail"
                        className="h-full w-full object-cover"
                      />
                    ) : m.lostCase?.type === "person" ? (
                      "PERSON"
                    ) : (
                      "ITEM"
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="text-[11px] font-medium line-clamp-3 text-white/80">
                      {m.lostCase?.description || "—"}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/55">
                      <MapPin size={12} />
                      {m.lostCase?.location || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-14 w-14 rounded-md bg-white/10 flex items-center justify-center overflow-hidden text-white/40 text-[10px]">
                    {m.foundCase?.photoUrls?.length ? (
                      <img
                        src={m.foundCase.photoUrls[0]}
                        alt="found thumbnail"
                        className="h-full w-full object-cover"
                      />
                    ) : m.foundCase?.type === "person" ? (
                      "PERSON"
                    ) : (
                      "ITEM"
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <p className="text-[11px] font-medium line-clamp-3 text-white/80">
                      {m.foundCase?.description || "—"}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-white/55">
                      <MapPin size={12} />
                      {m.foundCase?.location || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
      <div className="hidden md:block md:col-span-3">
        {detail ? (
          <div
            className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm h-full p-5 flex flex-col"
            aria-label="Match detail panel"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="space-y-1 flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-white leading-snug">
                  Match Review
                </h2>
                <div className="flex flex-wrap gap-3 text-[11px] text-white/60 items-center">
                  <StatusBadge value={detail.status} />
                  {detail.confidence != null && (
                    <span className="flex items-center gap-2">
                      <Activity size={14} className="text-white/40" />{" "}
                      <span>
                        {Math.round(detail.confidence * 100)}% confidence
                      </span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} className="text-white/40" />
                    {relative(detail.lostCase.createdAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="text-white/40 hover:text-white/70 text-sm px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-5 flex-1 overflow-auto pr-1">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/70">
                  Lost Report
                </h3>
                {detail.lostCase?.photoUrls?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {detail.lostCase.photoUrls.map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt={`Lost photo ${i + 1}`}
                        className="h-20 w-full object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-white/75 whitespace-pre-wrap leading-relaxed">
                  {detail.lostCase?.description || "—"}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] text-white/55">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-white/40" />
                    {detail.lostCase?.location || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} className="text-white/40" />
                    {detail.lostCase?.createdAt
                      ? relative(detail.lostCase.createdAt)
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/70">
                  Found Report
                </h3>
                {detail.foundCase?.photoUrls?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {detail.foundCase.photoUrls.map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt={`Found photo ${i + 1}`}
                        className="h-20 w-full object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-white/75 whitespace-pre-wrap leading-relaxed">
                  {detail.foundCase?.description || "—"}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] text-white/55">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-white/40" />
                    {detail.foundCase?.location || "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} className="text-white/40" />
                    {detail.foundCase?.reportedAt
                      ? relative(detail.foundCase.reportedAt)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {detail.status === "matched" && (
                <div className="flex gap-2">
                  <button
                    disabled={actionBusy}
                    onClick={() => confirmMatch(detail)}
                    className="flex-1 h-10 rounded-md bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} /> Confirm Match
                  </button>
                  <button
                    disabled={actionBusy}
                    onClick={() => rejectMatch(detail)}
                    className="flex-1 h-10 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-60"
                  >
                    <XCircle size={16} /> Reject Match
                  </button>
                </div>
              )}
              {detail.status === "confirmed" && (
                <div className="text-[11px] text-green-400 font-medium">
                  Match confirmed.
                </div>
              )}
              {detail.status === "rejected" && (
                <div className="text-[11px] text-red-400 font-medium">
                  Match rejected.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full border border-dashed border-white/15 rounded-lg flex items-center justify-center text-xs text-white/50">
            Select a match to review
          </div>
        )}
      </div>
      <Drawer
        open={!!detail && window.innerWidth < 768}
        onClose={() => setDetail(null)}
        title={detail ? "Match " + detail.id : ""}
      >
        {detail && (
          <div className="space-y-5 text-sm text-white/80">
            <div className="flex flex-wrap gap-2 text-[11px] text-white/60 items-center">
              <StatusBadge value={detail.status} />
              {detail.confidence != null && (
                <span className="inline-flex items-center gap-1">
                  <Activity size={14} className="text-white/40" />
                  {Math.round(detail.confidence * 100)}%
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-white/40" />
                {relative(detail.lostCase.createdAt)}
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-white/70 mb-2">
                  Lost Report
                </h3>
                {detail.lostCase?.photoUrls?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {detail.lostCase.photoUrls.map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt={`Lost photo ${i + 1}`}
                        className="h-16 w-full object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <p className="text-[11px] leading-relaxed text-white/75">
                  {detail.lostCase?.description || "—"}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] text-white/55 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-white/40" />
                    {detail.lostCase.location}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white/70 mb-2">
                  Found Report
                </h3>
                {detail.foundCase?.photoUrls?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {detail.foundCase.photoUrls.map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt={`Found photo ${i + 1}`}
                        className="h-16 w-full object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <p className="text-[11px] leading-relaxed text-white/75">
                  {detail.foundCase?.description || "—"}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] text-white/55 mt-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-white/40" />
                    {detail.foundCase.location}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {detail.status === "matched" && (
                <div className="flex gap-2">
                  <button
                    disabled={actionBusy}
                    onClick={() => confirmMatch(detail)}
                    className="flex-1 h-10 rounded-md bg-green-600/80 hover:bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60 disabled:opacity-60"
                  >
                    <CheckCircle2 size={16} /> Confirm Match
                  </button>
                  <button
                    disabled={actionBusy}
                    onClick={() => rejectMatch(detail)}
                    className="flex-1 h-10 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-60"
                  >
                    <XCircle size={16} /> Reject Match
                  </button>
                </div>
              )}
              {detail.status === "confirmed" && (
                <div className="text-[11px] text-green-400 font-medium">
                  Match confirmed.
                </div>
              )}
              {detail.status === "rejected" && (
                <div className="text-[11px] text-red-400 font-medium">
                  Match rejected.
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Matched;
