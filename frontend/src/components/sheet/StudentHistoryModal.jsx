"use client";

import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import {
  X,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  LogIn,
  Footprints,
  BookOpen,
  GraduationCap,
  Shield,
  Building,
  Timer,
  Activity,
  History,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

export function StudentHistoryModal({ candidateId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, CLASSROOM, EXAM
  const [expandedSessions, setExpandedSessions] = useState({});

  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);
    setError(null);
    api.getStudentHistory(candidateId)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Error loading student history:", err);
        setError(err.message || "Failed to load student history");
      })
      .finally(() => setLoading(false));
  }, [candidateId]);

  const toggleExpand = (key) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!candidateId) return null;

  const student = data?.student || {};
  const stats = data?.statistics || {};
  const classroomHistory = data?.classroom_history || [];
  const examHistory = data?.exam_history || [];

  // Combine and sort chronological timeline
  const combinedHistory = [
    ...classroomHistory.map((c) => ({ ...c, type: "CLASSROOM" })),
    ...examHistory.map((e) => ({ ...e, type: "EXAM" })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  let filteredList = combinedHistory;
  if (activeTab === "CLASSROOM") {
    filteredList = combinedHistory.filter((h) => h.type === "CLASSROOM");
  } else if (activeTab === "EXAM") {
    filteredList = combinedHistory.filter((h) => h.type === "EXAM");
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="glass-panel w-full max-w-4xl max-h-[92vh] flex flex-col border-cyan-500/40 shadow-2xl overflow-hidden rounded-2xl bg-slate-950/90 text-white">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-slate-950">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-cyan-500/50 bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-neon-cyan">
              {student.photo ? (
                <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-cyan-400" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide truncate">
                  {student.name || "Student Profile"}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  Roll: {student.roll_id || "N/A"}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 truncate">
                <span>{student.department || "General"}</span>
                <span>•</span>
                <span className="text-amber-300 font-mono">{student.allocated_room || "Room Unassigned"} ({student.allocated_seat || "No Seat"})</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-cyan-400 font-mono">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading complete attendance & movement history...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 font-mono">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
            
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">Class Attendance</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-black text-cyan-400 font-mono">{stats.classroom_attendance_rate || 100}%</span>
                  <span className="text-[10px] text-slate-400">({stats.classes_present || 0}/{stats.total_classroom_sessions || 0})</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">Total In-Class Time</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-emerald-400 font-mono">{stats.total_class_hours || 0}</span>
                  <span className="text-xs text-emerald-300 font-mono">Hrs ({stats.total_class_minutes || 0}m)</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">Desk Departures</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-amber-400 font-mono">{stats.total_departures_count || 0}</span>
                  <span className="text-xs text-amber-300">Times</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-purple-500/20 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">Total Away Duration</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-base font-black text-purple-300 font-mono">{stats.total_away_formatted || "0s"}</span>
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab("ALL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === "ALL"
                      ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  All Timeline ({combinedHistory.length})
                </button>

                <button
                  onClick={() => setActiveTab("CLASSROOM")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === "CLASSROOM"
                      ? "bg-indigo-600 text-white shadow-neon-indigo"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  Classroom AI ({classroomHistory.length})
                </button>

                <button
                  onClick={() => setActiveTab("EXAM")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === "EXAM"
                      ? "bg-emerald-600 text-white shadow-neon-emerald"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Exam Hall ({examHistory.length})
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-mono">
                Showing {filteredList.length} recorded session(s)
              </span>
            </div>

            {/* Timeline Session Cards */}
            <div className="flex flex-col gap-3">
              {filteredList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
                  No attendance activity found for the selected filter.
                </div>
              ) : (
                filteredList.map((item, idx) => {
                  const isClassroom = item.type === "CLASSROOM";
                  const cardKey = isClassroom ? item.session_key || `c-${idx}` : `e-${item.date}-${idx}`;
                  const isExpanded = !!expandedSessions[cardKey];
                  const movements = item.movement_history || [];

                  let statusBadge = {
                    bg: "bg-slate-800 text-slate-400 border-slate-700",
                    label: item.status || "ABSENT",
                  };
                  if (item.status === "PRESENT" || item.status === "INSIDE") {
                    statusBadge = {
                      bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                      label: isClassroom ? "🟢 PRESENT" : "🟢 INSIDE HALL",
                    };
                  } else if (item.status === "STEPPED_OUT") {
                    statusBadge = {
                      bg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                      label: "🟡 STEPPED OUT",
                    };
                  } else if (item.status === "EXITED") {
                    statusBadge = {
                      bg: "bg-purple-500/20 text-purple-400 border-purple-500/40",
                      label: "🚪 EXITED",
                    };
                  }

                  return (
                    <div
                      key={cardKey}
                      className="rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition overflow-hidden"
                    >
                      {/* Card Header Row */}
                      <div className="p-3.5 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isClassroom
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {isClassroom ? <GraduationCap className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs sm:text-sm">
                                {isClassroom ? item.course_code : item.title}
                              </span>
                              {isClassroom && item.course_name && (
                                <span className="text-slate-400 text-xs hidden sm:inline">• {item.course_name}</span>
                              )}
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${statusBadge.bg}`}>
                                {statusBadge.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-cyan-400" />
                                {item.date} {item.day ? `(${item.day})` : ""}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-slate-300">
                                <Clock className="w-3 h-3 text-amber-400" />
                                {item.time_slot || "Scheduled Session"}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-indigo-300">
                                <Building className="w-3 h-3 text-indigo-400" />
                                {item.room_name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Timing & Duration Badges */}
                        <div className="flex items-center gap-3">
                          {isClassroom ? (
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-400">In-Class Time</span>
                                <span className="font-bold text-emerald-400">{item.in_class_formatted || "0s"}</span>
                              </div>
                              {item.stepped_out_count > 0 && (
                                <div className="flex flex-col items-end pl-2 border-l border-slate-800">
                                  <span className="text-[10px] text-slate-400">Away Time</span>
                                  <span className="font-bold text-amber-300">{item.away_formatted || "0s"}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-400">Entry / Exit</span>
                                <span className="text-slate-200">
                                  {item.entry_time || "-"} → {item.exit_time || "-"}
                                </span>
                              </div>
                            </div>
                          )}

                          {movements.length > 0 && (
                            <button
                              onClick={() => toggleExpand(cardKey)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 transition"
                            >
                              <Footprints className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-[11px] font-mono">{movements.length} Logs</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable Movement Events Table */}
                      {isExpanded && movements.length > 0 && (
                        <div className="p-3 bg-slate-950/70 border-t border-slate-800/80">
                          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider mb-2 block">
                            Detailed AI Movement & Stepped-Out Chronology
                          </span>
                          <div className="overflow-x-auto rounded-lg border border-slate-800">
                            <table className="w-full text-left text-xs font-mono border-collapse">
                              <thead>
                                <tr className="bg-slate-900/90 text-[10px] text-slate-400 uppercase border-b border-slate-800">
                                  <th className="p-2 pl-3">#</th>
                                  <th className="p-2">Event Time</th>
                                  <th className="p-2">Action / Movement</th>
                                  <th className="p-2">Away Duration</th>
                                  <th className="p-2 pr-3 text-right">Event Type</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 text-[11px]">
                                {movements.map((ev, mIdx) => (
                                  <tr key={ev.id || mIdx} className="hover:bg-slate-900/40">
                                    <td className="p-2 pl-3 text-slate-500">{mIdx + 1}</td>
                                    <td className="p-2 text-cyan-300 font-bold">{ev.time || ev.timestamp || "-"}</td>
                                    <td className="p-2 text-slate-200">{ev.label || ev.event || "Movement"}</td>
                                    <td className="p-2 text-amber-300">
                                      {ev.duration_sec ? `${ev.duration_sec}s` : ev.duration_formatted || "-"}
                                    </td>
                                    <td className="p-2 pr-3 text-right">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          ev.type === "out"
                                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                                            : ev.type === "return"
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                            : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                                        }`}
                                      >
                                        {ev.event || ev.type || "LOG"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            DigiHall Automated AI Attendance Diary
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close History Profile
          </button>
        </div>
      </div>
    </div>
  );
}
