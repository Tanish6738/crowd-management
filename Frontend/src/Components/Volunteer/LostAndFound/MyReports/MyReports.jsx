import React, { useMemo, useState, useEffect } from "react";
import { useUser } from '@clerk/clerk-react';
import {
  Clock,
  MapPin,
  Pencil,
  XCircle,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import { StatusBadge } from "../LostAndFound";
import Drawer from "../../../General/Drawer";
import { getRecordsByUser } from "../../../../Services/api";

/** @typedef {{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'missing'|'cancelled'; createdAt:string; reporterId:string; matchedWith?:string; resolvedAt?:string }} LostCase */

const relative = (iso) => {
  if (!iso) return "-";
  const ts = new Date(iso).getTime();
  if (isNaN(ts)) return "-";
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h";
  const da = Math.floor(h / 24);
  return da + "d";
};

const MyReports = ({ data: propData = [], loading: propLoading = false, onUpdate, onCancel }) => {
  const { user, isLoaded } = useUser();
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editPhotos, setEditPhotos] = useState([]);
  const [fetched, setFetched] = useState(null); // null until fetched
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [refetchToken, setRefetchToken] = useState(0);

  // Fetch user-specific records once Clerk user is available
  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;

    const mapRecord = (rec, idx) => {
      // rec may already be a direct lost object OR wrapper { source, data }
      let source = rec.source || (rec.where_lost ? 'lost_people' : (rec.location_found ? 'found_people' : 'unknown'));
      const data = rec.data || rec; // unify shape
      const isLost = source === 'lost_people';
      const faceId = data.face_id || data.match_id || `unknown-${idx}`;
      const rawStatus = data.status || 'pending';
      const status = rawStatus === 'pending' ? 'open' : (rawStatus === 'found' ? 'resolved' : rawStatus);
      const location = isLost ? (data.where_lost || 'Unknown') : (data.location_found || 'Unknown');
      const ageBit = (data.age !== undefined && data.age !== null && data.age !== '') ? ` (${data.age} yrs)` : '';
      const descLoc = isLost ? (data.where_lost || 'unspecified') : (data.location_found || 'unspecified');
      const description = data.name ? `${data.name}${ageBit} – ${isLost ? 'Lost at' : 'Found at'} ${descLoc}` : `${isLost ? 'Lost' : 'Found'} person ${faceId.slice(0,8)}`;
      const createdAt = data.upload_time || data.match_time || null;
      const photoUrls = data.face_blob ? [`data:image/jpeg;base64,${data.face_blob}`] : [];
      return {
        id: faceId,
        type: 'person',
        description,
        photoUrls,
        location,
        status,
        createdAt,
        reporterId: data.user_id || 'n/a',
        _source: source
      };
    };

    const load = async () => {
      setFetching(true); setError(null);
      try {
        const res = await getRecordsByUser(user.id);
        // New API shape: { records: [ { source, data } ] }
        let list = [];
        if (Array.isArray(res?.records)) {
          list = res.records
            .filter(r => ['lost_people','found_people'].includes(r.source))
            .map(mapRecord);
        } else {
          // Legacy fallback arrays
            const candidates = [res?.lost_people, res?.found_people].filter(Boolean);
            candidates.forEach(arr => {
              if (Array.isArray(arr)) arr.forEach((r,i)=> list.push(mapRecord(r, i)));
            });
        }
        if (!cancelled) setFetched(list);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load your reports');
      } finally { if (!cancelled) setFetching(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [isLoaded, user, refetchToken]);

  // Decide which dataset to present (fetched overrides prop)
  const dataset = fetched ?? propData;
  const loading = fetching || propLoading || !isLoaded;

  const sorted = useMemo(() => [...dataset].sort((a, b) => {
    const tb = new Date(b.createdAt || 0).getTime() || 0;
    const ta = new Date(a.createdAt || 0).getTime() || 0;
    return tb - ta;
  }), [dataset]);

  const startEdit = () => {
    if (!detail) return;
    setEditing(true);
    setEditDescription(detail.description);
    setEditPhotos([]);
  };
  const saveEdit = () => {
    if (!detail) return;
    const newDesc = editDescription.trim();
    // Optimistic local update
    setFetched(list => list ? list.map(r => r.id === detail.id ? { ...r, description: newDesc } : r) : list);
    onUpdate && onUpdate(detail.id, (old) => ({ ...old, description: newDesc }));
    setEditing(false);
  };
  const cancelReport = () => {
    if (!detail) return;
    setFetched(list => list ? list.map(r => r.id === detail.id ? { ...r, status: 'cancelled' } : r) : list);
    onCancel && onCancel(detail.id);
    setDetail(null);
  };

  return (
  <div aria-label="My lost reports" className="space-y-4 mk-text-primary">
  {error && (
    <div className="p-3 rounded-md bg-red-500/10 border border-red-500/40 text-[11px] text-red-300 flex items-center justify-between">
      <span>{error}</span>
      <button
  onClick={() => { setRefetchToken(t=>t+1); }}
        className="underline hover:text-red-200"
      >Retry</button>
    </div>
  )}
  <div className="hidden md:grid grid-cols-12 text-[11px] font-semibold mk-text-fainter px-3">
        <div className="col-span-2">Case ID</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-3">Status</div>
        <div className="col-span-3">Created</div>
        <div className="col-span-2 text-right pr-2">Location</div>
      </div>
      <div className="space-y-2 hidden md:block">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse"
            />
          ))}
        {!loading && sorted.length === 0 && (
          <div className="p-8 text-center text-xs mk-text-muted mk-surface-alt mk-border rounded-lg">
            No reports yet.
          </div>
        )}
        {!loading &&
          sorted.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setDetail(r);
              }}
              className={`grid grid-cols-12 items-center mk-border rounded-md px-3 py-2 text-[11px] cursor-pointer transition backdrop-blur-sm ${detail?.id === r.id ? "bg-orange-50 dark:bg-white/10 border-orange-400/60" : "mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border"}`}
            >
              <div
                className="col-span-2 font-mono truncate mk-text-fainter"
                title={r.id}
              >
                {r.id}
              </div>
              <div className="col-span-2 capitalize mk-text-primary">
                {r.type}
              </div>
              <div className="col-span-3">
                <StatusBadge value={r.status} />
              </div>
              <div className="col-span-3 flex items-center gap-1 mk-text-muted">
                <Clock size={12} className="mk-text-fainter" />
                {relative(r.createdAt)}
              </div>
              <div className="col-span-2 text-right font-medium mk-text-secondary">
                {r.location}
              </div>
            </div>
          ))}
      </div>
      <div className="md:hidden space-y-3">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg bg-gradient-to-r from-black/5 via-black/10 to-black/5 dark:from-white/5 dark:via-white/10 dark:to-white/5 animate-pulse"
            />
          ))}
        {!loading && sorted.length === 0 && (
          <div className="p-8 text-center text-xs mk-text-muted mk-surface-alt mk-border rounded-lg">
            No reports yet.
          </div>
        )}
        {!loading &&
          sorted.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetail(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setDetail(r);
              }}
              className={`mk-border rounded-lg p-3 flex flex-col gap-2 text-[11px] cursor-pointer backdrop-blur-sm transition ${detail?.id === r.id ? "border-orange-400/60 bg-orange-50 dark:bg-white/10" : "mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/10 hover:mk-border"}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[10px] mk-text-fainter">
                  {r.id}
                </span>
                <StatusBadge value={r.status} />
              </div>
              <div className="font-medium capitalize mk-text-primary">
                {r.type}
              </div>
              <div className="flex items-center gap-2 mk-text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} className="mk-text-fainter" />
                  {relative(r.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="mk-text-fainter" />
                  {r.location}
                </span>
              </div>
            </div>
          ))}
      </div>
      <Drawer
        open={!!detail}
        onClose={() => {
          setDetail(null);
          setEditing(false);
        }}
        title={detail ? (editing ? "Editing " : "Report ") + detail.id : ""}
      >
        {detail && (
          <div className="space-y-4 text-sm mk-text-secondary">
            {!editing && (
              <div className="text-xs mk-text-secondary whitespace-pre-wrap">
                {detail.description}
              </div>
            )}
            {editing && (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-md mk-border mk-surface-alt p-2 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="flex-1 h-9 rounded-md bg-green-600/80 hover:bg-green-600 text-white text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/60"
                  >
                    <Save size={14} /> Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 h-9 rounded-md mk-surface-alt hover:bg-orange-50 dark:hover:bg-white/20 mk-text-muted text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-[10px] mk-text-muted">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="mk-text-fainter" />
                {relative(detail.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} className="mk-text-fainter" />
                {detail.location}
              </span>
            </div>
            {detail.photoUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {detail.photoUrls.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt={`Report photo ${i + 1}`}
                    className="h-20 w-full object-cover rounded"
                  />
                ))}
              </div>
            )}
            {detail.status === "open" && !editing && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={startEdit}
                  className="flex-1 h-9 rounded-md bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={cancelReport}
                  className="flex-1 h-9 rounded-md bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                >
                  <XCircle size={14} /> Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default MyReports;
