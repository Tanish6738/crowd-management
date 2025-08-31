import React, { useMemo, useState } from "react";
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

/** @typedef {{ id:string; type:'person'|'item'; description:string; photoUrls:string[]; location:string; status:'open'|'matched'|'resolved'|'missing'|'cancelled'; createdAt:string; reporterId:string; matchedWith?:string; resolvedAt?:string }} LostCase */

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

const MyReports = ({ data, loading, onUpdate, onCancel }) => {
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editPhotos, setEditPhotos] = useState([]);

  const sorted = useMemo(
    () =>
      [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [data]
  );

  const startEdit = () => {
    if (!detail) return;
    setEditing(true);
    setEditDescription(detail.description);
    setEditPhotos([]);
  };
  const saveEdit = () => {
    if (!detail) return;
    onUpdate &&
      onUpdate(detail.id, (old) => ({
        ...old,
        description: editDescription.trim(),
      }));
    setEditing(false);
  };
  const cancelReport = () => {
    if (!detail) return;
    onCancel && onCancel(detail.id);
    setDetail(null);
  };

  return (
    <div aria-label="My lost reports" className="space-y-4 text-white/85">
      <div className="hidden md:grid grid-cols-12 text-[11px] font-semibold text-white/55 px-3">
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
              className="h-12 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse"
            />
          ))}
        {!loading && sorted.length === 0 && (
          <div className="p-8 text-center text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg">
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
              className={`grid grid-cols-12 items-center border rounded-md px-3 py-2 text-[11px] cursor-pointer transition backdrop-blur-sm ${detail?.id === r.id ? "bg-white/10 border-orange-400/60" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"}`}
            >
              <div
                className="col-span-2 font-mono truncate text-white/55"
                title={r.id}
              >
                {r.id}
              </div>
              <div className="col-span-2 capitalize text-white/80">
                {r.type}
              </div>
              <div className="col-span-3">
                <StatusBadge value={r.status} />
              </div>
              <div className="col-span-3 flex items-center gap-1 text-white/60">
                <Clock size={12} className="text-white/40" />
                {relative(r.createdAt)}
              </div>
              <div className="col-span-2 text-right font-medium text-white/75">
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
              className="h-24 rounded-lg bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse"
            />
          ))}
        {!loading && sorted.length === 0 && (
          <div className="p-8 text-center text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg">
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
              className={`border rounded-lg p-3 flex flex-col gap-2 text-[11px] cursor-pointer backdrop-blur-sm transition ${detail?.id === r.id ? "border-orange-400/60 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[10px] text-white/45">
                  {r.id}
                </span>
                <StatusBadge value={r.status} />
              </div>
              <div className="font-medium capitalize text-white/85">
                {r.type}
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} className="text-white/40" />
                  {relative(r.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="text-white/40" />
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
          <div className="space-y-4 text-sm text-white/80">
            {!editing && (
              <div className="text-xs text-white/75 whitespace-pre-wrap">
                {detail.description}
              </div>
            )}
            {editing && (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 p-2 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60"
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
                    className="flex-1 h-9 rounded-md bg-white/10 hover:bg-white/20 text-white/70 text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-[10px] text-white/60">
              <StatusBadge value={detail.status} />
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-white/40" />
                {relative(detail.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} className="text-white/40" />
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
