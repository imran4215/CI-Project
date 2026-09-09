"use client";

import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { StatCard } from "../ui/StatCard";
import { AuditProofModal } from "./AuditProofModal";
import {
  ClipboardList,
  RefreshCw,
  Download,
  Trash2,
  Users,
  LogIn,
  Bath,
  LogOut,
  UserX,
  AlertOctagon,
  Search,
  ShieldCheck,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Edit2,
  X,
  Check,
  Footprints,
  History,
  Activity,
  Timer,
  Eye,
  PenTool,
} from "lucide-react";

export function AttendanceSheet() {
  const {
    attendanceData,
    rooms,
    selectedSheetRoom,
    setSelectedSheetRoom,
    activeSheetFilter,
    setActiveSheetFilter,
    loadAttendance,
    loadAllocations,
    addToast,
    users,
    triggerAudio,
  } = useApp();

  const [search, setSearch] = useState("");
  const [selectedAuditCandId, setSelectedAuditCandId] = useState(null);
  const [selectedHistoryCand, setSelectedHistoryCand] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  // Edit Attendance Record Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState("INSIDE");
  const [editEntryTime, setEditEntryTime] = useState("");
  const [editExitTime, setEditExitTime] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState("");
  const [editWashroomCount, setEditWashroomCount] = useState(0);
  const [editTotalWashroomMins, setEditTotalWashroomMins] = useState(0);
  const [editHasViolation, setEditHasViolation] = useState(false);
  const [editSeatNumber, setEditSeatNumber] = useState("");
  const [editRoomName, setEditRoomName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const filterPills = [
    { id: "ALL", label: `All (${attendanceData.records?.length || 0})` },
    { id: "INSIDE", label: `Inside (${attendanceData.present_inside || 0})` },
    { id: "WASHROOM", label: `Washroom (${attendanceData.in_washroom || 0})` },
    { id: "EXITED", label: `Exited (${attendanceData.exited || 0})` },
    { id: "ABSENT", label: `Absent (${attendanceData.absent || 0})` },
    { id: "VIOLATIONS", label: `Violations (${attendanceData.washroom_violations || 0})` },
  ];

  let records = attendanceData.records || [];
  if (activeSheetFilter === "VIOLATIONS") {
    records = records.filter((r) => r.has_washroom_violation);
  } else if (activeSheetFilter !== "ALL") {
    records = records.filter((r) => r.status === activeSheetFilter);
  }

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    records = records.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.roll_id?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.seat_number?.toLowerCase().includes(q) ||
        r.room_name?.toLowerCase().includes(q)
    );
  }

  const handleStartEdit = (rec) => {
    setEditingRecord(rec);
    setEditStatus(rec.status || "ABSENT");
    setEditEntryTime(rec.entry_time === "-" ? "" : rec.entry_time || "");
    setEditExitTime(rec.exit_time === "-" ? "" : rec.exit_time || "");
    setEditDurationMinutes(
      rec.duration_minutes !== null && rec.duration_minutes !== undefined
        ? rec.duration_minutes
        : ""
    );
    setEditWashroomCount(rec.washroom_count || 0);
    setEditTotalWashroomMins(rec.total_washroom_minutes || 0);
    setEditHasViolation(!!rec.has_washroom_violation);
    setEditSeatNumber(rec.seat_number || "Seat A-01");
    setEditRoomName(rec.room_name || "");
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsSavingEdit(true);
    try {
      const payload = {
        status: editStatus,
        entry_time:
          editEntryTime.trim() ||
          (editStatus === "ABSENT" ? "-" : new Date().toLocaleTimeString()),
        exit_time: editExitTime.trim() || "-",
        duration_minutes:
          editDurationMinutes !== "" ? Number(editDurationMinutes) : null,
        washroom_count: Number(editWashroomCount) || 0,
        total_washroom_minutes: Number(editTotalWashroomMins) || 0,
        has_washroom_violation: editHasViolation,
        seat_number: editSeatNumber.trim() || "Seat A-01",
        room_name: editRoomName.trim() || editingRecord.room_name || "General Hall",
      };

      await api.updateAttendanceRecord(editingRecord.candidate_id, payload);
      triggerAudio("success");
      addToast(`Updated attendance log for ${editingRecord.name}`, "success");
      setEditingRecord(null);
      await loadAttendance();
    } catch (err) {
      addToast(`Save error: ${err.message}`, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteRecord = async (rec) => {
    if (
      !confirm(
        `Are you sure you want to completely remove ${rec.name} (Roll: ${
          rec.roll_id || "N/A"
        }) from the master attendance sheet?`
      )
    ) {
      return;
    }
    try {
      await api.deleteAttendanceRecord(rec.candidate_id);
      triggerAudio("warning");
      addToast(`Attendance entry for ${rec.name} completely removed`, "warning");
      await Promise.all([loadAttendance(), loadAllocations?.()]);
    } catch (err) {
      addToast(`Delete error: ${err.message}`, "error");
    }
  };

  const handleResetSession = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all attendance sheet records? This will clear all entry/exit logs."
      )
    ) {
      return;
    }
    setIsResetting(true);
    try {
      await api.resetAttendanceSession();
      triggerAudio("warning");
      addToast("🧹 Attendance Sheet data wiped clean!", "warning");
      await loadAttendance();
    } catch (e) {
      addToast(`Reset error: ${e.message}`, "error");
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportCsv = () => {
    const param = selectedSheetRoom
      ? `?room_id=${encodeURIComponent(selectedSheetRoom)}`
      : "";
    window.location.href = `/api/attendance/export-csv${param}`;
    addToast("Exporting Attendance CSV...", "info");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Bar - Compact & Sleek */}
      <div className="glass-panel px-4 py-3 flex items-center justify-between flex-wrap gap-3 border-sky-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-neon-cyan flex-shrink-0">
            <ClipboardList className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Exam Attendance Master Sheet
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold">
                Live Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Synchronized gate entries, AI surveillance movement diaries, washroom breaks & biometric audit logs.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200">
            <Building className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedSheetRoom}
              onChange={(e) => setSelectedSheetRoom(e.target.value)}
              className="bg-transparent font-mono text-white text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="" className="bg-slate-900">All Exam Halls</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              loadAttendance();
              addToast("Attendance refreshed", "info");
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition border border-slate-700"
            title="Refresh Attendance Log"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 transition shadow-neon-emerald"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleResetSession}
            disabled={isResetting}
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1 transition"
            title="Clear all attendance sheet data"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards - Compact Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <StatCard icon={Users} title="Allocated" value={attendanceData.total_candidates} color="blue" />
        <StatCard icon={LogIn} title="Inside Hall" value={attendanceData.present_inside} color="emerald" />
        <StatCard icon={Bath} title="In Washroom" value={attendanceData.in_washroom} color="amber" />
        <StatCard icon={LogOut} title="Exited" value={attendanceData.exited} color="purple" />
        <StatCard icon={UserX} title="Absent" value={attendanceData.absent} color="rose" />
        <StatCard icon={AlertOctagon} title="Violations" value={attendanceData.washroom_violations} color="rose" />
      </div>

      {/* Main Sheet Container */}
      <div className="glass-panel p-3.5 flex flex-col gap-3 border-sky-500/20">
        {/* Search Bar & Filter Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-slate-800">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate by name, roll, hall, or seat..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyber-cyan"
            />
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {filterPills.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setActiveSheetFilter(pill.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                  activeSheetFilter === pill.id
                    ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                    : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Master Attendance Table - Compact & High-Density */}
        <div className="overflow-x-auto rounded-lg border border-slate-800/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="p-2.5 pl-3">Candidate</th>
                <th className="p-2.5">Hall & Seat</th>
                <th className="p-2.5">Gate Status</th>
                <th className="p-2.5">Gate Entry / Exit</th>
                <th className="p-2.5">Washroom</th>
                <th className="p-2.5">AI Surveillance / Movements</th>
                <th className="p-2.5 pr-3 text-right">Actions & Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-mono">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <ClipboardList className="w-8 h-8 text-slate-700" />
                      <p className="text-xs font-semibold text-slate-400">No attendance records found matching filters.</p>
                      <p className="text-[11px] text-slate-500">Scan candidate face at entrance to register entry.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const user = users.find((u) => u.id === rec.candidate_id);
                  const firstImg = user?.images ? Object.values(user.images)[0] : "";
                  const avatarUrl = firstImg ? `/api/${firstImg}` : "";

                  let statusTag = {
                    label: "ABSENT",
                    color: "bg-slate-900/80 text-slate-500 border-slate-800",
                  };
                  if (rec.status === "INSIDE") {
                    statusTag = {
                      label: "🟢 INSIDE",
                      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold",
                    };
                  } else if (rec.status === "WASHROOM") {
                    statusTag = {
                      label: "🚻 WASHROOM",
                      color: "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold animate-pulse",
                    };
                  } else if (rec.status === "EXITED") {
                    statusTag = {
                      label: "🚪 EXITED",
                      color: "bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold",
                    };
                  }

                  // Washroom summary
                  let washroomSummary = (
                    <span className="text-slate-600 font-mono text-[11px]">-</span>
                  );
                  if (rec.washroom_count > 0 || rec.status === "WASHROOM") {
                    washroomSummary = (
                      <div className="flex flex-col text-[11px] font-mono leading-tight">
                        <span className={`font-bold ${rec.has_washroom_violation ? "text-rose-400" : "text-amber-300"}`}>
                          {rec.washroom_count} Break(s) • {rec.total_washroom_minutes || 0}m
                        </span>
                        {rec.has_washroom_violation && (
                          <span className="text-[10px] text-rose-400 font-black tracking-wider">
                            ⚠️ OVERTIME
                          </span>
                        )}
                      </div>
                    );
                  }

                  // Surveillance movement history calculation
                  const movements = rec.movement_history || [];
                  const totalMovements = movements.length;
                  const totalAwaySec = movements.reduce(
                    (acc, ev) => acc + (Number(ev.duration_sec) || 0),
                    0
                  );
                  const awayFormatted =
                    totalAwaySec >= 60
                      ? `${Math.floor(totalAwaySec / 60)}m ${totalAwaySec % 60}s`
                      : `${totalAwaySec}s`;

                  const isCurrentlyAway = movements.some((m) => m.status === "AWAY");

                  return (
                    <tr
                      key={rec.candidate_id}
                      className="hover:bg-slate-900/50 transition duration-150"
                    >
                      {/* Candidate Avatar, Name, Roll & Dept */}
                      <td className="p-2.5 pl-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center flex-shrink-0">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={rec.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Users className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-white text-xs truncate max-w-[140px]">
                              {rec.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="font-mono text-cyan-400 font-bold">
                                {rec.roll_id || "N/A"}
                              </span>
                              <span>•</span>
                              <span className="truncate max-w-[90px]">
                                {rec.department || "General"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Hall & Seat */}
                      <td className="p-2.5 font-mono">
                        <div className="flex flex-col text-[11px] leading-tight">
                          <span className="text-slate-200 font-bold truncate max-w-[130px]">
                            {rec.room_name || rec.hall_name || "Exam Hall"}
                          </span>
                          <span className="text-amber-400 font-bold text-[10px]">
                            {rec.seat_number || "Seat A-01"}
                          </span>
                        </div>
                      </td>

                      {/* Gate Status Tag */}
                      <td className="p-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${statusTag.color}`}
                        >
                          {statusTag.label}
                        </span>
                      </td>

                      {/* Gate Entry & Exit Times */}
                      <td className="p-2.5 font-mono text-[11px]">
                        <div className="flex flex-col leading-tight">
                          <div className="flex items-center gap-1 text-emerald-400">
                            <LogIn className="w-3 h-3 text-emerald-400/70" />
                            <span className="font-bold">{rec.entry_time || "-"}</span>
                          </div>
                          {rec.signature_snapshot && (
                            <div className="flex items-center gap-1 text-sky-400 text-[10px] font-semibold mt-0.5">
                              <PenTool className="w-2.5 h-2.5 text-sky-400/80" />
                              <span>Signed</span>
                            </div>
                          )}
                          {rec.exit_time && rec.exit_time !== "-" ? (
                            <div className="flex items-center gap-1 text-purple-400 text-[10px]">
                              <LogOut className="w-3 h-3 text-purple-400/70" />
                              <span>{rec.exit_time}</span>
                              {rec.duration_minutes && (
                                <span className="text-slate-400">({rec.duration_minutes}m)</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500">Exit: -</span>
                          )}
                        </div>
                      </td>

                      {/* Washroom Breaks */}
                      <td className="p-2.5">{washroomSummary}</td>

                      {/* AI Surveillance & Movement History */}
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col text-[11px] font-mono leading-tight">
                            {totalMovements === 0 ? (
                              <span className="text-slate-500 text-[10px] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500/70" /> 0 Left Desk
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`font-bold flex items-center gap-1 text-[11px] ${
                                    isCurrentlyAway ? "text-rose-400 animate-pulse" : "text-amber-300"
                                  }`}
                                >
                                  <Footprints className="w-3 h-3" />
                                  {totalMovements} Left ({awayFormatted})
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {isCurrentlyAway ? "🔴 Away From Seat" : "🟢 Back At Desk"}
                                </span>
                              </>
                            )}
                          </div>

                          {/* History Diary Modal Trigger */}
                          <button
                            onClick={() => setSelectedHistoryCand(rec)}
                            className={`p-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition ${
                              totalMovements > 0
                                ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30"
                                : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"
                            }`}
                            title="View AI surveillance movement history diary"
                          >
                            <History className="w-3 h-3" />
                            <span>Logs ({totalMovements})</span>
                          </button>
                        </div>
                      </td>

                      {/* Actions & Proof */}
                      <td className="p-2.5 pr-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedAuditCandId(rec.candidate_id)}
                            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 hover:border-sky-500/40 text-[11px] font-bold flex items-center gap-1 transition"
                            title="View biometric photo proofs"
                          >
                            <ShieldCheck className="w-3 h-3 text-sky-400" />
                            <span className="hidden sm:inline">Proof</span>
                          </button>
                          <button
                            onClick={() => handleStartEdit(rec)}
                            className="p-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition"
                            title="Edit attendance data"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(rec)}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition"
                            title="Delete / Clear attendance record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate AI Movement History Modal */}
      {selectedHistoryCand && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl p-5 flex flex-col gap-4 border-amber-500/40 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Footprints className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Candidate AI Movement History
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Surveillance Diary
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Candidate: <strong className="text-white">{selectedHistoryCand.name}</strong> • Roll:{" "}
                    <span className="text-cyan-400 font-bold">{selectedHistoryCand.roll_id || "N/A"}</span> •{" "}
                    <span className="text-amber-300">{selectedHistoryCand.seat_number || "Seat A-01"}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryCand(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidate Summary Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Times Left Desk</span>
                <span className="text-base font-black text-amber-400 font-mono">
                  {selectedHistoryCand.movement_history?.length || 0} Times
                </span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Total Away Duration</span>
                <span className="text-base font-black text-cyan-400 font-mono">
                  {(() => {
                    const sec = (selectedHistoryCand.movement_history || []).reduce(
                      (acc, ev) => acc + (Number(ev.duration_sec) || 0),
                      0
                    );
                    return sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`;
                  })()}
                </span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Surveillance Status</span>
                <span className="text-xs font-bold font-mono mt-1">
                  {(selectedHistoryCand.movement_history || []).some((m) => m.status === "AWAY") ? (
                    <span className="text-rose-400 flex items-center gap-1">🔴 Currently Away</span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">🟢 At Desk</span>
                  )}
                </span>
              </div>
            </div>

            {/* Movement Events Log Table */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                Chronological In/Out Log
              </span>
              <div className="max-h-[260px] overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60">
                {!selectedHistoryCand.movement_history ||
                selectedHistoryCand.movement_history.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500/50" />
                    <span>No absences or desk departures recorded.</span>
                    <span className="text-[10px] text-slate-600">Candidate has been present at seat throughout.</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[10px] uppercase">
                        <th className="p-2 pl-3">#</th>
                        <th className="p-2">Left Desk (Out)</th>
                        <th className="p-2">Returned (In)</th>
                        <th className="p-2">Away Duration</th>
                        <th className="p-2 pr-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {selectedHistoryCand.movement_history.map((ev, idx) => {
                        const isAway = ev.status === "AWAY" || !ev.return_time;
                        return (
                          <tr key={ev.event_id || idx} className="hover:bg-slate-900/40">
                            <td className="p-2 pl-3 text-slate-500 font-bold">{idx + 1}</td>
                            <td className="p-2 text-rose-400 font-bold">{ev.out_time || "-"}</td>
                            <td className="p-2 text-emerald-400 font-bold">{ev.return_time || "Pending Return..."}</td>
                            <td className="p-2 text-cyan-300">{ev.duration_formatted || `${ev.duration_sec || 0}s`}</td>
                            <td className="p-2 pr-3 text-right">
                              {isAway ? (
                                <span className="px-2 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold animate-pulse">
                                  AWAY
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                                  RETURNED
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedHistoryCand(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Attendance Record Modal - Compact */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-5 flex flex-col gap-3.5 border-cyan-500/40 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Edit Attendance Record</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Candidate: <strong className="text-white">{editingRecord.name}</strong> (Roll: {editingRecord.roll_id || "N/A"})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 text-xs">
              {/* Status & Seat */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Attendance Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyber-cyan text-xs font-bold"
                  >
                    <option value="INSIDE" className="bg-slate-950 text-emerald-400 font-bold">🟢 INSIDE HALL</option>
                    <option value="WASHROOM" className="bg-slate-950 text-amber-400 font-bold">🚻 IN WASHROOM</option>
                    <option value="EXITED" className="bg-slate-950 text-purple-400 font-bold">🚪 EXITED</option>
                    <option value="ABSENT" className="bg-slate-950 text-slate-400 font-bold">⚪ ABSENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assigned Seat</label>
                  <input
                    type="text"
                    value={editSeatNumber}
                    onChange={(e) => setEditSeatNumber(e.target.value)}
                    placeholder="e.g. Seat A-01"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan text-xs"
                  />
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gate Entry Time</label>
                  <input
                    type="text"
                    value={editEntryTime}
                    onChange={(e) => setEditEntryTime(e.target.value)}
                    placeholder="e.g. 12:20:08 AM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Exit Time</label>
                  <input
                    type="text"
                    value={editExitTime}
                    onChange={(e) => setEditExitTime(e.target.value)}
                    placeholder="e.g. 01:15:20 PM or -"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan text-xs"
                  />
                </div>
              </div>

              {/* Washroom Info & Duration */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Exam Duration</label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={editDurationMinutes}
                    onChange={(e) => setEditDurationMinutes(e.target.value)}
                    placeholder="Mins"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Washroom Breaks</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={editWashroomCount}
                    onChange={(e) => setEditWashroomCount(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Washroom Mins</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    value={editTotalWashroomMins}
                    onChange={(e) => setEditTotalWashroomMins(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan text-xs"
                  />
                </div>
              </div>

              {/* Overtime Violation Checkbox */}
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-400" /> Washroom Overtime Violation
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Flag candidate as having exceeded permissible washroom duration.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={editHasViolation}
                  onChange={(e) => setEditHasViolation(e.target.checked)}
                  className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black flex items-center gap-1 transition shadow-neon-cyan disabled:opacity-50 text-xs"
                >
                  <Check className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Audit Snapshot Modal */}
      {selectedAuditCandId && (
        <AuditProofModal
          candidateId={selectedAuditCandId}
          onClose={() => setSelectedAuditCandId(null)}
        />
      )}
    </div>
  );
}
