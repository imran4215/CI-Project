"use client";

import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import {
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  Clock,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  UserX,
  AlertOctagon,
  Eye,
  X,
  Check,
  Calendar,
  Layers,
  Sparkles,
  Sliders,
} from "lucide-react";

export function SecurityAlerts() {
  const { alerts, loadAlerts, addToast, triggerAudio } = useApp();

  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [lightboxImg, setLightboxImg] = useState(null);

  // Edit Alert Modal State
  const [editingAlert, setEditingAlert] = useState(null);
  const [editNotes, setEditNotes] = useState("");
  const [editConfidence, setEditConfidence] = useState(90);
  const [editTimestamp, setEditTimestamp] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Filters calculation
  let filteredAlerts = alerts || [];

  if (selectedFilter === "UNREGISTERED") {
    filteredAlerts = filteredAlerts.filter(
      (a) =>
        a.notes?.toLowerCase().includes("unregistered") ||
        a.notes?.toLowerCase().includes("unknown")
    );
  } else if (selectedFilter === "MISSING") {
    filteredAlerts = filteredAlerts.filter(
      (a) =>
        a.notes?.toLowerCase().includes("missing") ||
        a.notes?.toLowerCase().includes("delayed") ||
        a.notes?.toLowerCase().includes("absence")
    );
  } else if (selectedFilter === "OVERTIME") {
    filteredAlerts = filteredAlerts.filter(
      (a) =>
        a.notes?.toLowerCase().includes("overtime") ||
        a.notes?.toLowerCase().includes("washroom")
    );
  }

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filteredAlerts = filteredAlerts.filter(
      (a) =>
        a.notes?.toLowerCase().includes(q) ||
        a.timestamp?.toLowerCase().includes(q) ||
        a.date?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q)
    );
  }

  const handleStartEdit = (al) => {
    setEditingAlert(al);
    setEditNotes(al.notes || "");
    setEditConfidence(Math.round((al.confidence || 0.9) * 100));
    setEditTimestamp(al.timestamp || new Date().toLocaleTimeString());
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAlert) return;
    setIsSavingEdit(true);
    try {
      await api.updateAlert(editingAlert.id, {
        notes: editNotes.trim() || "Security incident logged",
        confidence: Number(editConfidence) / 100,
        timestamp: editTimestamp.trim() || editingAlert.timestamp,
      });
      triggerAudio("success");
      addToast("Security violation log updated", "success");
      setEditingAlert(null);
      await loadAlerts();
    } catch (err) {
      addToast(`Save error: ${err.message}`, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSingleAlert = async (alertId) => {
    if (!confirm("Are you sure you want to delete this violation record?")) return;
    try {
      await api.deleteAlert(alertId);
      triggerAudio("warning");
      addToast("Violation record deleted", "warning");
      await loadAlerts();
    } catch (err) {
      addToast(`Delete error: ${err.message}`, "error");
    }
  };

  const handleClearAllAlerts = async () => {
    if (
      !confirm(
        "⚠️ Are you sure you want to DELETE ALL security violation and proxy logs? This action cannot be undone."
      )
    ) {
      return;
    }
    setIsClearingAll(true);
    try {
      await api.clearAllAlerts();
      triggerAudio("warning");
      addToast("🧹 All security violation logs have been cleared clean!", "warning");
      await loadAlerts();
    } catch (err) {
      addToast(`Clear error: ${err.message}`, "error");
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header Bar */}
      <div className="glass-panel p-4 flex items-center justify-between flex-wrap gap-3 border-rose-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0 shadow-neon-rose">
            <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Security Violations & Proxy Logs
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
                {alerts.length} Total Logs
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Auditing biometric proxy attempts, unregistered hall intrusions & absence threshold violations.
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              loadAlerts();
              addToast("Security logs refreshed", "info");
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>

          {alerts.length > 0 && (
            <button
              onClick={handleClearAllAlerts}
              disabled={isClearingAll}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
              title="Delete all violation logs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Clear All Logs ({alerts.length})
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: Search and Filter Pills */}
      <div className="glass-panel p-3.5 flex items-center justify-between flex-wrap gap-2.5 border-rose-500/20">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-rose-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search violation by notes, student name, time, or ID..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-400"
          />
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: "ALL", label: `All Logs (${alerts.length})` },
            {
              id: "UNREGISTERED",
              label: `Unregistered Faces (${
                alerts.filter(
                  (a) =>
                    a.notes?.toLowerCase().includes("unregistered") ||
                    a.notes?.toLowerCase().includes("unknown")
                ).length
              })`,
            },
            {
              id: "MISSING",
              label: `Absence & Missing (${
                alerts.filter(
                  (a) =>
                    a.notes?.toLowerCase().includes("missing") ||
                    a.notes?.toLowerCase().includes("delayed") ||
                    a.notes?.toLowerCase().includes("absence")
                ).length
              })`,
            },
            {
              id: "OVERTIME",
              label: `Washroom Overtime (${
                alerts.filter(
                  (a) =>
                    a.notes?.toLowerCase().includes("overtime") ||
                    a.notes?.toLowerCase().includes("washroom")
                ).length
              })`,
            },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedFilter(pill.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                selectedFilter === pill.id
                  ? "bg-rose-500 text-slate-950 shadow-neon-rose font-black"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Grid */}
      {filteredAlerts.length === 0 ? (
        <div className="glass-panel p-12 flex flex-col items-center justify-center text-center gap-2.5 border-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 text-emerald-400/60" />
          <h3 className="text-base font-bold text-white">Zero Security Violations</h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {search || selectedFilter !== "ALL"
              ? "No security violation records match your current filter or search criteria."
              : "No unauthorized proxy attempts, unregistered faces, or overtime violations recorded."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredAlerts.map((al, idx) => {
            const isMissing =
              al.notes?.toLowerCase().includes("missing") ||
              al.notes?.toLowerCase().includes("delayed") ||
              al.notes?.toLowerCase().includes("absence");
            const isWashroom =
              al.notes?.toLowerCase().includes("washroom") ||
              al.notes?.toLowerCase().includes("overtime");
            const isUnregistered =
              al.notes?.toLowerCase().includes("unregistered") ||
              al.notes?.toLowerCase().includes("unknown");

            let badgeTag = {
              label: "SECURITY VIOLATION",
              color: "bg-rose-500/20 text-rose-400 border-rose-500/40",
            };
            if (isMissing) {
              badgeTag = {
                label: "SEAT ABSENCE / MISSING",
                color: "bg-amber-500/20 text-amber-300 border-amber-500/40",
              };
            } else if (isWashroom) {
              badgeTag = {
                label: "WASHROOM OVERTIME",
                color: "bg-purple-500/20 text-purple-300 border-purple-500/40",
              };
            } else if (isUnregistered) {
              badgeTag = {
                label: "UNREGISTERED FACE",
                color: "bg-rose-500/20 text-rose-400 border-rose-500/40",
              };
            }

            return (
              <div
                key={al.id || idx}
                className="glass-card p-3.5 flex flex-col justify-between gap-3 border-rose-500/30 hover:border-rose-500/60 transition duration-150"
              >
                <div className="flex flex-col gap-2.5">
                  {/* Top Bar: Badge & Timestamp */}
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeTag.color}`}
                    >
                      {badgeTag.label}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{al.timestamp || "-"}</span>
                    </div>
                  </div>

                  {/* Violation Snapshot with Preview Button */}
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center group">
                    {al.snapshot ? (
                      <>
                        <img
                          src={`/api/${al.snapshot}`}
                          alt="Violation Snapshot"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <button
                          onClick={() => setLightboxImg(`/api/${al.snapshot}`)}
                          className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 text-white text-xs font-bold transition backdrop-blur-xs cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-cyan-400" /> View Full Snapshot
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-slate-600 font-mono text-xs">
                        <ShieldAlert className="w-6 h-6 text-slate-700" />
                        <span>No Snapshot Logged</span>
                      </div>
                    )}
                  </div>

                  {/* Incident Notes & Confidence */}
                  <div className="flex flex-col gap-1 text-xs">
                    <p className="text-white font-semibold leading-snug">
                      {al.notes || "Security flag triggered"}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-cyan-400">
                        <Sparkles className="w-3 h-3" />
                        Confidence: {Math.round((al.confidence || 0.9) * 100)}%
                      </span>
                      {al.date && <span className="text-slate-500">{al.date}</span>}
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions: Edit & Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-600">ID: {al.id || idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(al)}
                      className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1 transition"
                      title="Edit violation log notes"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSingleAlert(al.id)}
                      className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition"
                      title="Delete this violation log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Alert Record Modal */}
      {editingAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-5 flex flex-col gap-3.5 border-rose-500/40 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Edit Security Log</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Alert ID: <strong className="text-white">{editingAlert.id}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAlert(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 text-xs">
              {/* Incident Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Incident Description / Notes <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Unregistered face detected or candidate left desk..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-400 text-xs leading-relaxed"
                  required
                />
              </div>

              {/* Confidence & Timestamp */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Confidence (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editConfidence}
                    onChange={(e) => setEditConfidence(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-rose-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Logged Timestamp</label>
                  <input
                    type="text"
                    value={editTimestamp}
                    onChange={(e) => setEditTimestamp(e.target.value)}
                    placeholder="e.g. 10:15:30 AM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-rose-400 text-xs"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAlert(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-black flex items-center gap-1 transition shadow-neon-rose disabled:opacity-50 text-xs"
                >
                  <Check className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Snapshot Fullscreen Lightbox Modal */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel p-3 max-w-2xl w-full border-rose-500/40 flex flex-col gap-3 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-sm text-white flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-rose-400" /> Biometric Violation Photo Evidence
              </span>
              <button
                onClick={() => setLightboxImg(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
              <img src={lightboxImg} alt="Evidence" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

