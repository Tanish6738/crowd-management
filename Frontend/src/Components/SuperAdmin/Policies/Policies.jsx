import React, { useEffect, useMemo, useState } from "react";
import Modal from "../../General/Modal";
import Drawer from "../../General/Drawer";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  RefreshCcw,
  Settings2,
  SlidersHorizontal,
  Database,
  AlertTriangle,
  Clock,
  Scale,
  Layers,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Edit3,
  ListTree,
} from "lucide-react";

/**
 * @typedef {Object} GlobalPolicy
 * @property {string} id
 * @property {{ framesDays:number; embeddingsDays:number; logsDays:number }} retention
 * @property {{ normalPct:number; busyPct:number; criticalPct:number }} thresholds
 * @property {string} updatedBy
 * @property {string} updatedAt // ISO
 */

const defaultPolicy = /** @type {GlobalPolicy} */ ({
  id: "global",
  retention: { framesDays: 30, embeddingsDays: 14, logsDays: 60 },
  thresholds: { normalPct: 40, busyPct: 70, criticalPct: 90 },
  updatedBy: "system",
  updatedAt: new Date().toISOString(),
});

const skeletonCard = (key) => (
  <div
    key={key}
    className="p-4 rounded-lg border border-white/10 bg-white/5 animate-pulse space-y-3"
  >
    <div className="h-4 w-32 bg-white/10 rounded" />
    <div className="h-6 w-20 bg-white/10 rounded" />
  </div>
);

const Policies = () => {
  const [policy, setPolicy] = useState(null); // GlobalPolicy | null
  const [overrides, setOverrides] = useState([]); // tenant overrides summary
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(defaultPolicy);
  const [saving, setSaving] = useState(false);
  const [tenantDrawer, setTenantDrawer] = useState(null);

  // Simulated fetch
  useEffect(() => {
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      try {
        setPolicy(defaultPolicy);
        setOverrides([
          {
            tenant: "Riverbank Ops",
            retention: true,
            thresholds: false,
            updatedAt: new Date(Date.now() - 3600_000).toISOString(),
            updatedBy: "priya",
          },
          {
            tenant: "Transit Hub",
            retention: false,
            thresholds: true,
            updatedAt: new Date(Date.now() - 7200_000).toISOString(),
            updatedBy: "arjun",
          },
        ]);
        setAudit([
          {
            id: "a1",
            by: "priya",
            when: new Date(Date.now() - 3600_000).toISOString(),
            action: "UPDATE_RETENTION",
            detail: "framesDays 21→30",
          },
          {
            id: "a2",
            by: "arjun",
            when: new Date(Date.now() - 7200_000).toISOString(),
            action: "UPDATE_THRESHOLDS",
            detail: "busyPct 65→70",
          },
        ]);
        setLoading(false);
      } catch (e) {
        setError("Failed to load policies");
        setLoading(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, []);

  // Simulated WebSocket updates every 45s
  useEffect(() => {
    if (!policy) return;
    const iv = setInterval(() => {
      // pretend threshold drift check - no actual change
    }, 45000);
    return () => clearInterval(iv);
  }, [policy]);

  const openEditor = () => {
    setForm(policy || defaultPolicy);
    setEditOpen(true);
  };

  const resetDefaults = () => {
    setForm(defaultPolicy);
  };

  const handleSave = (e) => {
    e?.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setPolicy(form);
      setAudit((a) => [
        {
          id: "a" + (a.length + 1),
          by: "you",
          when: new Date().toISOString(),
          action: "UPDATE_GLOBAL",
          detail: "Saved global policies",
        },
        ...a,
      ]);
      setEditOpen(false);
      setSaving(false);
      // TODO POST /api/v1/policies/global
    }, 900);
  };

  const relative = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    const d = Math.floor(h / 24);
    return d + "d ago";
  };

  const thresholdRangesValid =
    form.thresholds.normalPct < form.thresholds.busyPct &&
    form.thresholds.busyPct < form.thresholds.criticalPct;

  const retentionCards = () => (
    <div className="grid md:grid-cols-3 gap-4">
      {["framesDays", "embeddingsDays", "logsDays"].map((k) => (
        <div
          key={k}
          className="p-4 rounded-lg border border-white/10 bg-white/5 flex flex-col gap-3"
        >
          <div className="text-xs font-semibold text-white/60 uppercase tracking-wide">
            {k.replace("Days", "").replace(/([A-Z])/g, " $1")} (days)
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={180}
              value={policy.retention[k]}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  retention: { ...p.retention, [k]: Number(e.target.value) },
                }))
              }
              className="flex-1 accent-orange-500"
            />
            <div className="w-12 text-right tabular-nums text-sm font-medium text-white">
              {policy.retention[k]}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const thresholdsCard = () => (
    <div className="p-4 rounded-lg border border-white/10 bg-white/5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wide">
        <SlidersHorizontal size={14} className="text-orange-400" /> Crowd
        Thresholds (%)
      </div>
      <div className="space-y-3 text-sm">
        {["normalPct", "busyPct", "criticalPct"].map((k) => (
          <div key={k} className="flex items-center gap-3">
            <label className="w-28 capitalize text-xs text-white/50">
              {k.replace("Pct", "")}
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={policy.thresholds[k]}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  thresholds: { ...p.thresholds, [k]: Number(e.target.value) },
                }))
              }
              className="h-8 w-20 rounded border border-white/10 bg-white/5 px-2 text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            />
            <input
              type="range"
              min={1}
              max={100}
              value={policy.thresholds[k]}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  thresholds: { ...p.thresholds, [k]: Number(e.target.value) },
                }))
              }
              className="flex-1 accent-orange-500"
            />
          </div>
        ))}
        {!thresholdRangesValid && (
          <div className="text-xs text-red-400">
            Ordering must be: normal &lt; busy &lt; critical.
          </div>
        )}
        <div className="text-[11px] text-white/50">
          Normal (&lt; {policy.thresholds.normalPct}%) · Busy (
          {policy.thresholds.normalPct}–{policy.thresholds.busyPct}%) · Critical
          (&gt; {policy.thresholds.busyPct}%)
        </div>
      </div>
    </div>
  );

  const overridesTable = () => (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <table className="min-w-full text-xs">
        <thead className="bg-white/5 backdrop-blur text-white/60 text-[11px] uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Tenant</th>
            <th className="px-3 py-2 text-left font-medium">
              Retention Override
            </th>
            <th className="px-3 py-2 text-left font-medium">
              Threshold Override
            </th>
            <th className="px-3 py-2 text-left font-medium">Last Modified</th>
            <th className="px-3 py-2 text-left font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="text-white/80">
          {overrides.map((o) => (
            <tr
              key={o.tenant}
              className="even:bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
            >
              <td className="px-3 py-2 font-medium text-white">{o.tenant}</td>
              <td className="px-3 py-2">
                {o.retention ? (
                  <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 text-[11px]">
                    Yes
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-[11px]">
                    No
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {o.thresholds ? (
                  <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 text-[11px]">
                    Yes
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-[11px]">
                    No
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-white/60 tabular-nums">
                {relative(o.updatedAt)}
              </td>
              <td className="px-3 py-2">
                <button
                  onClick={() => setTenantDrawer(o)}
                  className="text-orange-400 hover:underline text-[11px] flex items-center gap-1"
                >
                  View <ExternalLink size={12} />
                </button>
              </td>
            </tr>
          ))}
          {!overrides.length && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-6 text-center text-white/50 text-sm"
              >
                No overrides.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const auditList = () => (
    <div className="rounded-lg border border-white/10 bg-white/5 max-h-72 overflow-auto">
      <ul className="divide-y divide-white/5 text-[11px]">
        {audit.map((a) => (
          <li key={a.id} className="px-3 py-2 flex items-start gap-3">
            <span className="mt-0.5 text-white/30">•</span>
            <div className="flex-1">
              <div className="font-medium text-white/90">{a.action}</div>
              <div className="text-white/60">{a.detail}</div>
              <div className="text-[10px] text-white/40">
                {a.by} · {relative(a.when)}
              </div>
            </div>
          </li>
        ))}
        {!audit.length && (
          <li className="px-4 py-6 text-center text-white/50">
            No audit entries.
          </li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="space-y-8" aria-label="Global Policies">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck size={18} className="text-orange-400" /> Global Policies
        </h2>
        {!loading && !error && policy && (
          <button
            onClick={openEditor}
            className="ml-auto px-3 h-9 rounded-md bg-orange-500/90 hover:bg-orange-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <Edit3 size={14} /> Edit Policies
          </button>
        )}
      </div>

      {loading && (
        <div className="grid md:grid-cols-3 gap-4">
          {["a", "b", "c", "d"].map(skeletonCard)}
        </div>
      )}
      {error && (
        <div className="p-4 rounded border border-red-500/40 bg-red-500/10 text-sm text-red-300 flex items-center gap-3">
          <XCircle size={18} /> {error}
          <button
            onClick={() => window.location.reload()}
            className="ml-auto px-3 py-1.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-xs"
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && !policy && (
        <div className="p-6 rounded-lg border-2 border-dashed border-white/20 text-center text-sm text-white/70 flex flex-col items-center gap-4">
          <ShieldCheck size={40} className="text-orange-400" />
          <div>No global policies defined yet.</div>
          <button
            onClick={openEditor}
            className="px-4 py-2 rounded-md bg-orange-500/90 hover:bg-orange-500 text-white text-xs font-medium"
          >
            Set Defaults
          </button>
        </div>
      )}

      {!loading && !error && policy && (
        <div className="space-y-10">
          <section className="space-y-5" aria-labelledby="retention-heading">
            <h3
              id="retention-heading"
              className="text-xs font-semibold text-white/60 tracking-wide uppercase flex items-center gap-2"
            >
              <Database size={14} className="text-orange-400" /> Retention
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {["framesDays", "embeddingsDays", "logsDays"].map((k) => (
                <div
                  key={k}
                  className="p-4 rounded-lg border border-white/10 bg-white/5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-white/60 uppercase tracking-wide">
                      {k.replace("Days", "").replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-white/90">
                      {policy.retention[k]}d
                    </span>
                  </div>
                  <div className="h-2 rounded bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: (policy.retention[k] / 180) * 100 + "%" }}
                    />
                  </div>
                  <div className="text-[10px] text-white/40">
                    Storage retention horizon.
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5" aria-labelledby="thresholds-heading">
            <h3
              id="thresholds-heading"
              className="text-xs font-semibold text-white/60 tracking-wide uppercase flex items-center gap-2"
            >
              <AlertTriangle size={14} className="text-orange-400" /> Crowd
              Thresholds
            </h3>
            <div className="p-4 rounded-lg border border-white/10 bg-white/5 grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-xs text-white/50 uppercase tracking-wide">
                  Normal (&lt;{policy.thresholds.normalPct}%)
                </div>
                <div className="h-2 bg-green-500/30 rounded" />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-white/50 uppercase tracking-wide">
                  Busy ({policy.thresholds.normalPct}–
                  {policy.thresholds.busyPct}%)
                </div>
                <div className="h-2 bg-orange-500/40 rounded" />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-white/50 uppercase tracking-wide">
                  Critical (&gt;{policy.thresholds.busyPct}%)
                </div>
                <div className="h-2 bg-red-500/40 rounded" />
              </div>
            </div>
          </section>

          <section className="space-y-5" aria-labelledby="overrides-heading">
            <div className="flex items-center gap-2">
              <h3
                id="overrides-heading"
                className="text-xs font-semibold text-white/60 tracking-wide uppercase flex items-center gap-2"
              >
                <Layers size={14} className="text-orange-400" /> Tenant
                Overrides
              </h3>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-[10px]">
                {overrides.length}
              </span>
            </div>
            {overridesTable()}
          </section>

          <section className="space-y-4" aria-labelledby="audit-heading">
            <h3
              id="audit-heading"
              className="text-xs font-semibold text-white/60 tracking-wide uppercase flex items-center gap-2"
            >
              <ListTree size={14} className="text-orange-400" /> Audit Trail
            </h3>
            {auditList()}
          </section>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Global Policies"
        actions={[
          <button
            key="reset"
            onClick={resetDefaults}
            type="button"
            className="px-3 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10"
          >
            Reset to Default
          </button>,
          <button
            key="save"
            onClick={handleSave}
            disabled={!thresholdRangesValid || saving}
            className="px-3 py-1.5 rounded bg-orange-500/90 hover:bg-orange-500 text-white text-xs font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCcw size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}{" "}
            Save
          </button>,
        ]}
      >
        <form onSubmit={handleSave} className="space-y-8 text-sm">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
              <Database size={14} className="text-orange-400" /> Retention Days
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              {["framesDays", "embeddingsDays", "logsDays"].map((k) => (
                <div key={k} className="space-y-2">
                  <label className="text-xs text-white/50 uppercase tracking-wide flex justify-between">
                    <span>
                      {k.replace("Days", "").replace(/([A-Z])/g, " $1")}
                    </span>
                    <span className="tabular-nums text-white/80">
                      {form.retention[k]}d
                    </span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.retention[k]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        retention: {
                          ...f.retention,
                          [k]: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full h-8 rounded border border-white/10 bg-white/5 px-2 text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                  />
                  <input
                    type="range"
                    min={1}
                    max={365}
                    value={form.retention[k]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        retention: {
                          ...f.retention,
                          [k]: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-orange-500"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-orange-400" /> Crowd
              Thresholds (%)
            </h4>
            {["normalPct", "busyPct", "criticalPct"].map((k) => (
              <div key={k} className="flex items-center gap-4">
                <label className="w-24 capitalize text-xs text-white/50">
                  {k.replace("Pct", "")}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.thresholds[k]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      thresholds: {
                        ...f.thresholds,
                        [k]: Number(e.target.value),
                      },
                    }))
                  }
                  className="h-8 w-20 rounded border border-white/10 bg-white/5 px-2 text-white/90 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                />
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={form.thresholds[k]}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      thresholds: {
                        ...f.thresholds,
                        [k]: Number(e.target.value),
                      },
                    }))
                  }
                  className="flex-1 accent-orange-500"
                />
              </div>
            ))}
            {!thresholdRangesValid && (
              <div className="text-xs text-red-400">
                Ordering must be: normal &lt; busy &lt; critical.
              </div>
            )}
          </div>
          <p className="text-[11px] text-white/50">
            Saving updates global defaults and notifies tenants (policy:update).
          </p>
        </form>
      </Modal>

      {/* Tenant Drawer (override detail placeholder) */}
      <Drawer
        open={!!tenantDrawer}
        onClose={() => setTenantDrawer(null)}
        title={tenantDrawer ? tenantDrawer.tenant : ""}
      >
        {tenantDrawer && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-white/50">Retention Override</div>
                <div className="font-medium text-white/90">
                  {tenantDrawer.retention ? "Yes" : "No"}
                </div>
              </div>
              <div>
                <div className="text-white/50">Threshold Override</div>
                <div className="font-medium text-white/90">
                  {tenantDrawer.thresholds ? "Yes" : "No"}
                </div>
              </div>
              <div>
                <div className="text-white/50">Updated</div>
                <div className="font-medium text-white/90">
                  {relative(tenantDrawer.updatedAt)}
                </div>
              </div>
              <div>
                <div className="text-white/50">By</div>
                <div className="font-medium text-white/90">
                  {tenantDrawer.updatedBy}
                </div>
              </div>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              Future enhancement: show diff versus global defaults & allow
              clearing overrides.
            </p>
            <button className="px-3 py-1.5 rounded border border-white/10 text-xs text-white/80 hover:bg-white/10">
              Open Tenant Detail
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Policies;

/* Integration:
import Policies from './Policies/Policies';
// In SuperAdminDashboard sidebar tabs include { key:'policies', label:'Policies' }
// Render when active: { activeTab==='policies' && <Policies /> }
*/
