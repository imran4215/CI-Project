"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { StatCard } from "../ui/StatCard";
import { AuditProofModal } from "./AuditProofModal";
import { StudentHistoryModal } from "./StudentHistoryModal";
import {
  ClipboardList,
  RefreshCw,
  Download,
  Trash2,
  Users,
  LogIn,
  LogOut,
  UserX,
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
  GraduationCap,
  Shield,
  BookOpen,
  ChevronRight,
  AlertTriangle,
  UserCheck,
} from "lucide-react";

export function AttendanceSheet() {
  const {
    rooms,
    users,
    triggerAudio,
    addToast,
    loadAllocations,
  } = useApp();

  // Mode: EXAM (Exam Hall Attendance) vs CLASSROOM (Classroom AI Surveillance)
  const [activeMode, setActiveMode] = useState("EXAM");

  // Date selection (Defaults strictly to today's date YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Minimum In-Class Duration requirement (Default: 30 minutes)
  const [minAttendanceMins, setMinAttendanceMins] = useState(30);

  // Room selection
  const [selectedRoom, setSelectedRoom] = useState("");

  // Search & Filter
  const [search, setSearch] = useState("");
  const [activeSheetFilter, setActiveSheetFilter] = useState("ALL"); // ALL, INSIDE/PRESENT, EXITED/STEPPED_OUT, ABSENT

  // Exam Hall Attendance Data
  const [examData, setExamData] = useState({
    total_candidates: 0,
    present_inside: 0,
    in_washroom: 0,
    exited: 0,
    absent: 0,
    records: [],
  });

  // Classroom AI Attendance Data
  const [classroomData, setClassroomData] = useState({
    total_classes: 0,
    total_enrolled: 0,
    present_count: 0,
    stepped_out_count: 0,
    absent_count: 0,
    classes: [],
  });

  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modals
  const [selectedStudentHistoryId, setSelectedStudentHistoryId] = useState(null);
  const [selectedAuditCandId, setSelectedAuditCandId] = useState(null);
  const [isResetting, setIsResetting] = useState(false);

  // Edit Record Modal
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState("INSIDE");
  const [editEntryTime, setEditEntryTime] = useState("");
  const [editExitTime, setEditExitTime] = useState("");
  const [editDurationMinutes, setEditDurationMinutes] = useState("");
  const [editSeatNumber, setEditSeatNumber] = useState("");
  const [editRoomName, setEditRoomName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Fetch Exam Hall Attendance
  const loadExamAttendance = useCallback(async () => {
    try {
      const res = await api.getAttendance({ roomId: selectedRoom, date: selectedDate });
      setExamData(res || { total_candidates: 0, present_inside: 0, in_washroom: 0, exited: 0, absent: 0, records: [] });
    } catch (e) {
      console.error("Error loading exam attendance:", e);
    }
  }, [selectedRoom, selectedDate]);

  // Fetch Classroom AI Attendance
  const loadClassroomAttendance = useCallback(async () => {
    try {
      const res = await api.getClassroomAttendance({
        roomId: selectedRoom,
        date: selectedDate,
        minDurationMins: minAttendanceMins,
      });
      setClassroomData(res || { total_classes: 0, total_enrolled: 0, present_count: 0, stepped_out_count: 0, absent_count: 0, classes: [] });
    } catch (e) {
      console.error("Error loading classroom attendance:", e);
    }
  }, [selectedRoom, selectedDate, minAttendanceMins]);

  // Initial & Reactive Load
  const refreshAll = useCallback(async () => {
    setLoading(true);
    if (activeMode === "EXAM") {
      await loadExamAttendance();
    } else {
      await loadClassroomAttendance();
    }
    setLoading(false);
  }, [activeMode, loadExamAttendance, loadClassroomAttendance]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Handle Edit
  const handleStartEdit = (rec) => {
    setEditingRecord(rec);
    setEditStatus(rec.status || "ABSENT");
    setEditEntryTime(rec.entry_time === "-" ? "" : rec.entry_time || "");
    setEditExitTime(rec.exit_time === "-" ? "" : rec.exit_time || "");
    setEditDurationMinutes(
      rec.duration_minutes !== null && rec.duration_minutes !== undefined ? rec.duration_minutes : ""
    );
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
        entry_time: editEntryTime.trim() || (editStatus === "ABSENT" ? "-" : new Date().toLocaleTimeString()),
        exit_time: editExitTime.trim() || "-",
        duration_minutes: editDurationMinutes !== "" ? Number(editDurationMinutes) : null,
        seat_number: editSeatNumber.trim() || "Seat A-01",
        room_name: editRoomName.trim() || editingRecord.room_name || "General Hall",
        day_key: selectedDate,
      };

      await api.updateAttendanceRecord(editingRecord.candidate_id, payload);
      triggerAudio("success");
      addToast(`Updated attendance log for ${editingRecord.name}`, "success");
      setEditingRecord(null);
      await loadExamAttendance();
    } catch (err) {
      addToast(`Save error: ${err.message}`, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteRecord = async (rec) => {
    if (!confirm(`Are you sure you want to remove ${rec.name} from the attendance sheet for ${selectedDate}?`)) {
      return;
    }
    try {
      await api.deleteAttendanceRecord(rec.candidate_id, selectedDate);
      triggerAudio("warning");
      addToast(`Attendance entry for ${rec.name} removed`, "warning");
      await loadExamAttendance();
    } catch (err) {
      addToast(`Delete error: ${err.message}`, "error");
    }
  };

  const handleResetSession = async () => {
    if (!confirm(`Are you sure you want to wipe attendance records for ${selectedDate}?`)) return;
    setIsResetting(true);
    try {
      if (activeMode === "EXAM") {
        await api.resetAttendanceSession();
        addToast("Exam attendance records reset", "warning");
        await loadExamAttendance();
      } else {
        await api.resetClassroomAttendance({ roomId: selectedRoom, date: selectedDate });
        addToast("Classroom attendance records reset", "warning");
        await loadClassroomAttendance();
      }
      triggerAudio("warning");
    } catch (e) {
      addToast(`Reset error: ${e.message}`, "error");
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportCsv = () => {
    const param = selectedRoom ? `?room_id=${encodeURIComponent(selectedRoom)}` : "";
    window.location.href = `/api/attendance/export-csv${param}`;
    addToast("Exporting Attendance CSV...", "info");
  };

  // Filter exam records
  let examRecords = examData.records || [];
  if (activeSheetFilter !== "ALL") {
    examRecords = examRecords.filter((r) => r.status === activeSheetFilter);
  }
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    examRecords = examRecords.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.roll_id?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q) ||
        r.seat_number?.toLowerCase().includes(q) ||
        r.room_name?.toLowerCase().includes(q)
    );
  }

  // Active classroom class
  const classList = classroomData.classes || [];
  const activeClass = classList[selectedClassIndex] || classList[0] || null;

  let classRoster = activeClass?.roster || [];
  if (activeSheetFilter !== "ALL") {
    classRoster = classRoster.filter((r) => r.status === activeSheetFilter);
  }
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    classRoster = classRoster.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.roll_id?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top Main Mode Switcher Bar */}
      <div className="glass-panel p-2.5 flex items-center justify-between flex-wrap gap-3 border-cyan-500/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveMode("EXAM");
              setActiveSheetFilter("ALL");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition duration-200 ${
              activeMode === "EXAM"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-neon-cyan"
                : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <Shield className="w-4 h-4 stroke-[2.5]" />
            <span>Exam Hall Attendance</span>
          </button>

          <button
            onClick={() => {
              setActiveMode("CLASSROOM");
              setActiveSheetFilter("ALL");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition duration-200 ${
              activeMode === "CLASSROOM"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-neon-indigo"
                : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <GraduationCap className="w-4 h-4 stroke-[2.5]" />
            <span>Classroom AI Surveillance</span>
          </button>
        </div>

        {/* Date & Room Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-mono text-white text-xs focus:outline-none cursor-pointer"
            />
            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[10px] text-cyan-400 hover:underline font-bold ml-1"
                title="Reset to today"
              >
                Today
              </button>
            )}
          </div>

          {/* Room Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200">
            <Building className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="bg-transparent font-mono text-white text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="" className="bg-slate-900">
                {activeMode === "EXAM" ? "All Exam Halls" : "All Classrooms"}
              </option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900">
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Min In-Class Duration Filter for Classroom Mode */}
          {activeMode === "CLASSROOM" && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-slate-400 font-mono">Min Presence:</span>
              <select
                value={minAttendanceMins}
                onChange={(e) => setMinAttendanceMins(Number(e.target.value))}
                className="bg-transparent font-mono text-amber-300 font-bold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value={10} className="bg-slate-900">10 Mins</option>
                <option value={15} className="bg-slate-900">15 Mins</option>
                <option value={20} className="bg-slate-900">20 Mins</option>
                <option value={25} className="bg-slate-900">25 Mins</option>
                <option value={30} className="bg-slate-900">30 Mins (Default)</option>
                <option value={35} className="bg-slate-900">35 Mins</option>
                <option value={40} className="bg-slate-900">40 Mins</option>
                <option value={45} className="bg-slate-900">45 Mins</option>
              </select>
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={refreshAll}
            disabled={loading}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition border border-slate-700"
            title="Refresh Attendance Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export CSV */}
          {activeMode === "EXAM" && (
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 transition shadow-neon-emerald"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Clear Session */}
          <button
            onClick={handleResetSession}
            disabled={isResetting}
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1 transition"
            title="Clear attendance records for this date"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: EXAM HALL ATTENDANCE */}
      {/* ========================================================================= */}
      {activeMode === "EXAM" && (
        <div className="flex flex-col gap-4">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users} title="Allocated Candidates" value={examData.total_candidates} color="blue" />
            <StatCard icon={LogIn} title="Inside Hall" value={examData.present_inside} color="emerald" />
            <StatCard icon={LogOut} title="Exited / Submitted" value={examData.exited} color="purple" />
            <StatCard icon={UserX} title="Absent Candidates" value={examData.absent} color="rose" />
          </div>

          {/* Main Table Container */}
          <div className="glass-panel p-3.5 flex flex-col gap-3 border-cyan-500/20">
            {/* Search & Filter Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-slate-800">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by candidate name, roll, hall, or seat..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { id: "ALL", label: `All (${examData.records?.length || 0})` },
                  { id: "INSIDE", label: `Inside (${examData.present_inside || 0})` },
                  { id: "EXITED", label: `Exited (${examData.exited || 0})` },
                  { id: "ABSENT", label: `Absent (${examData.absent || 0})` },
                ].map((pill) => (
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

            {/* Exam Attendance Roster Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-800/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="p-2.5 pl-3">Candidate</th>
                    <th className="p-2.5">Hall & Seat</th>
                    <th className="p-2.5">Gate Status</th>
                    <th className="p-2.5">Gate Entry / Exit</th>
                    <th className="p-2.5">AI Surveillance / Desk Logs</th>
                    <th className="p-2.5 pr-3 text-right">Actions & History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                  {examRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <ClipboardList className="w-8 h-8 text-slate-700" />
                          <p className="text-xs font-semibold text-slate-400">No exam attendance records found for {selectedDate}.</p>
                          <p className="text-[11px] text-slate-500">Scan candidate face at entrance to register entry.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    examRecords.map((rec) => {
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
                      } else if (rec.status === "EXITED") {
                        statusTag = {
                          label: "🚪 EXITED",
                          color: "bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold",
                        };
                      }

                      const movements = rec.movement_history || [];
                      const totalMovements = movements.length;
                      const totalAwaySec = movements.reduce((acc, ev) => acc + (Number(ev.duration_sec) || 0), 0);
                      const awayFormatted =
                        totalAwaySec >= 60 ? `${Math.floor(totalAwaySec / 60)}m ${totalAwaySec % 60}s` : `${totalAwaySec}s`;

                      return (
                        <tr key={rec.candidate_id} className="hover:bg-slate-900/50 transition duration-150">
                          {/* Candidate Avatar, Name, Roll & Dept */}
                          <td className="p-2.5 pl-3">
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => setSelectedStudentHistoryId(rec.candidate_id)}
                                className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center flex-shrink-0 hover:border-cyan-400 transition"
                                title="Click to view student master history profile"
                              >
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={rec.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Users className="w-3.5 h-3.5 text-slate-500" />
                                )}
                              </button>
                              <div className="flex flex-col min-w-0">
                                <button
                                  onClick={() => setSelectedStudentHistoryId(rec.candidate_id)}
                                  className="font-bold text-white text-xs text-left hover:text-cyan-300 transition truncate max-w-[140px]"
                                >
                                  {rec.name}
                                </button>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <span className="font-mono text-cyan-400 font-bold">{rec.roll_id || "N/A"}</span>
                                  <span>•</span>
                                  <span className="truncate max-w-[90px]">{rec.department || "General"}</span>
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

                          {/* Gate Status */}
                          <td className="p-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${statusTag.color}`}>
                              {statusTag.label}
                            </span>
                          </td>

                          {/* Entry / Exit Times */}
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
                                  {rec.duration_minutes && <span className="text-slate-400">({rec.duration_minutes}m)</span>}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500">Exit: -</span>
                              )}
                            </div>
                          </td>

                          {/* AI Surveillance / Movements */}
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col text-[11px] font-mono leading-tight">
                                {totalMovements === 0 ? (
                                  <span className="text-slate-500 text-[10px] flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500/70" /> 0 Left Desk
                                  </span>
                                ) : (
                                  <span className="text-amber-300 font-bold flex items-center gap-1 text-[11px]">
                                    <Footprints className="w-3 h-3" />
                                    {totalMovements} Left ({awayFormatted})
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => setSelectedStudentHistoryId(rec.candidate_id)}
                                className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition"
                                title="View student master history timeline"
                              >
                                <History className="w-3 h-3" />
                                <span>Timeline</span>
                              </button>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-2.5 pr-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedStudentHistoryId(rec.candidate_id)}
                                className="px-2 py-1 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1 transition"
                                title="Open full student history profile"
                              >
                                <UserCheck className="w-3 h-3 text-indigo-400" />
                                <span className="hidden sm:inline">History</span>
                              </button>

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
                                title="Edit attendance record"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => handleDeleteRecord(rec)}
                                className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition"
                                title="Delete record"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: CLASSROOM AI SURVEILLANCE ATTENDANCE */}
      {/* ========================================================================= */}
      {activeMode === "CLASSROOM" && (
        <div className="flex flex-col gap-4">
          {/* Summary KPI Cards for Classroom Mode */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={BookOpen} title="Total Classes" value={classroomData.total_classes} color="blue" />
            <StatCard icon={Users} title="Total Enrolled" value={classroomData.total_enrolled} color="indigo" />
            <StatCard icon={LogIn} title="Students Present" value={classroomData.present_count} color="emerald" />
            <StatCard icon={Footprints} title="Stepped Out / Away" value={classroomData.stepped_out_count} color="amber" />
          </div>

          {/* Classes Selector Tabs of that Day */}
          {classList.length === 0 ? (
            <div className="glass-panel p-8 text-center text-slate-500 font-mono text-xs border border-slate-800">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-slate-400 font-bold text-sm">No scheduled classes found for {selectedDate}.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Please check the Class Routine Manager in Registration Hub or select a room with scheduled routines.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Horizontal Class Selector Pills */}
              <div className="glass-panel p-2 flex items-center gap-2 overflow-x-auto border-indigo-500/30">
                <span className="text-[11px] font-mono text-slate-400 font-bold px-2 uppercase flex-shrink-0">
                  Daily Classes:
                </span>
                {classList.map((cls, idx) => {
                  const isSelected = selectedClassIndex === idx;
                  if (cls.is_gap) {
                    return (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-500 text-xs font-mono flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Clock className="w-3 h-3 text-amber-500/60" />
                        <span>{cls.time_slot}: {cls.title}</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedClassIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 ${
                        isSelected
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-neon-indigo border border-indigo-400/50"
                          : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-300" />
                      <div className="flex flex-col text-left">
                        <span className="font-mono font-bold">{cls.course_code}</span>
                        <span className="text-[10px] text-slate-300 opacity-80">{cls.time_slot}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded font-bold ml-1">
                        {cls.present_count}/{cls.total_enrolled}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Class Details & Student Roster */}
              {activeClass && !activeClass.is_gap && (
                <div className="glass-panel p-4 flex flex-col gap-3.5 border-indigo-500/20">
                  {/* Class Header Banner */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-white">{activeClass.course_code} • {activeClass.course_name}</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                            {activeClass.department}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Instructor: <strong className="text-slate-200">{activeClass.instructor || "Faculty"}</strong></span>
                          <span>•</span>
                          <span>Slot: <strong className="text-amber-300">{activeClass.time_slot}</strong></span>
                          <span>•</span>
                          <span>Room: <strong className="text-indigo-300">{activeClass.room_name}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                        Present: {activeClass.present_count}
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                        Stepped Out: {activeClass.stepped_out_count}
                      </div>
                      <div className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
                        Absent: {activeClass.absent_count}
                      </div>
                    </div>
                  </div>

                  {/* Filter & Search for Active Class */}
                  <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search student by name, roll, or department..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      {[
                        { id: "ALL", label: `All (${activeClass.roster?.length || 0})` },
                        { id: "PRESENT", label: `Present (${activeClass.present_count || 0})` },
                        { id: "STEPPED_OUT", label: `Stepped Out (${activeClass.stepped_out_count || 0})` },
                        { id: "ABSENT", label: `Absent (${activeClass.absent_count || 0})` },
                      ].map((pill) => (
                        <button
                          key={pill.id}
                          onClick={() => setActiveSheetFilter(pill.id)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                            activeSheetFilter === pill.id
                              ? "bg-indigo-600 text-white shadow-neon-indigo"
                              : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800"
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Class Roster High Density Table */}
                  <div className="overflow-x-auto rounded-lg border border-slate-800/80">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-[10px] uppercase">
                          <th className="p-2.5 pl-3">Student</th>
                          <th className="p-2.5">Live Status</th>
                          <th className="p-2.5">First Detected / Entry</th>
                          <th className="p-2.5">In-Class Duration</th>
                          <th className="p-2.5">Stepped Out / Away Time</th>
                          <th className="p-2.5 pr-3 text-right">Student History Profile</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                        {classRoster.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                              No students found in this course roster matching filter.
                            </td>
                          </tr>
                        ) : (
                          classRoster.map((stu) => {
                            const inClassMins = Math.round((stu.in_class_seconds || 0) / 60);
                            const isQualified = inClassMins >= minAttendanceMins;

                            let statusBadge = {
                              bg: "bg-slate-800 text-slate-400 border-slate-700",
                              label: "🔴 ABSENT",
                            };

                            if (stu.status === "PRESENT" && isQualified) {
                              statusBadge = {
                                bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                                label: "🟢 PRESENT",
                              };
                            } else if (stu.status === "PRESENT" && !isQualified) {
                              statusBadge = {
                                bg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
                                label: `🔴 ABSENT (<${minAttendanceMins}m)`,
                              };
                            } else if (stu.status === "STEPPED_OUT" && isQualified) {
                              statusBadge = {
                                bg: "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse",
                                label: "🟡 STEPPED OUT",
                              };
                            } else if (stu.status === "STEPPED_OUT" && !isQualified) {
                              statusBadge = {
                                bg: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
                                label: `🔴 ABSENT (<${minAttendanceMins}m)`,
                              };
                            }

                            return (
                              <tr key={stu.candidate_id} className="hover:bg-slate-900/50 transition">
                                <td className="p-2.5 pl-3">
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      onClick={() => setSelectedStudentHistoryId(stu.candidate_id)}
                                      className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center flex-shrink-0 hover:border-indigo-400 transition"
                                      title="Click to view student master history profile"
                                    >
                                      {stu.avatar ? (
                                        <img src={stu.avatar} alt={stu.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <Users className="w-3.5 h-3.5 text-slate-500" />
                                      )}
                                    </button>
                                    <div className="flex flex-col min-w-0">
                                      <button
                                        onClick={() => setSelectedStudentHistoryId(stu.candidate_id)}
                                        className="font-bold text-white text-xs text-left hover:text-indigo-300 transition truncate max-w-[140px]"
                                      >
                                        {stu.name}
                                      </button>
                                      <span className="text-[10px] text-cyan-400 font-bold">
                                        Roll: {stu.roll_id || "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.bg}`}>
                                    {statusBadge.label}
                                  </span>
                                </td>

                                <td className="p-2.5 text-slate-300 text-[11px]">
                                  {stu.first_detected_time || stu.entry_time || "-"}
                                </td>

                                <td className="p-2.5 text-[11px]">
                                  {isQualified ? (
                                    <div className="flex flex-col">
                                      <span className="text-emerald-400 font-bold">{stu.in_class_formatted || "0m"}</span>
                                      <span className="text-[9px] text-emerald-400/80 font-mono">✅ Qualified (≥{minAttendanceMins}m)</span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col">
                                      <span className="text-amber-300 font-bold">{stu.in_class_formatted || "0m"}</span>
                                      <span className="text-[9px] text-rose-400 font-mono">⚠️ Below {minAttendanceMins}m required</span>
                                    </div>
                                  )}
                                </td>

                                <td className="p-2.5 text-[11px]">
                                  {stu.stepped_out_duration_sec > 0 || (stu.movement_history && stu.movement_history.length > 0) ? (
                                    <div className="flex items-center gap-1.5 text-amber-300">
                                      <Footprints className="w-3.5 h-3.5" />
                                      <span>
                                        {stu.movement_history?.length || 1} left ({stu.away_formatted || "0s"})
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 text-[10px]">0 departures</span>
                                  )}
                                </td>

                                <td className="p-2.5 pr-3 text-right">
                                  <button
                                    onClick={() => setSelectedStudentHistoryId(stu.candidate_id)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1 ml-auto transition shadow-neon-indigo"
                                  >
                                    <History className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>History Profile</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT MASTER ATTENDANCE & MOVEMENT HISTORY MODAL */}
      {/* ========================================================================= */}
      {selectedStudentHistoryId && (
        <StudentHistoryModal
          candidateId={selectedStudentHistoryId}
          onClose={() => setSelectedStudentHistoryId(null)}
        />
      )}

      {/* Proof Audit Snapshot Modal */}
      {selectedAuditCandId && (
        <AuditProofModal
          candidateId={selectedAuditCandId}
          onClose={() => setSelectedAuditCandId(null)}
        />
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-5 flex flex-col gap-3.5 border-cyan-500/40 shadow-2xl">
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
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 text-xs font-bold"
                  >
                    <option value="INSIDE" className="bg-slate-950 text-emerald-400 font-bold">🟢 INSIDE</option>
                    <option value="EXITED" className="bg-slate-950 text-purple-400 font-bold">🚪 EXITED</option>
                    <option value="ABSENT" className="bg-slate-950 text-slate-400 font-bold">⚪ ABSENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Seat Number</label>
                  <input
                    type="text"
                    value={editSeatNumber}
                    onChange={(e) => setEditSeatNumber(e.target.value)}
                    placeholder="e.g. Seat A-01"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Entry Time</label>
                  <input
                    type="text"
                    value={editEntryTime}
                    onChange={(e) => setEditEntryTime(e.target.value)}
                    placeholder="e.g. 09:02:15 AM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Exit Time</label>
                  <input
                    type="text"
                    value={editExitTime}
                    onChange={(e) => setEditExitTime(e.target.value)}
                    placeholder="e.g. 11:30:00 AM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>
              </div>

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
    </div>
  );
}
