"use client";

import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { StatCard } from "../ui/StatCard";
import { CreateScheduleModal } from "./CreateScheduleModal";
import {
  CalendarClock,
  PlusCircle,
  Calendar,
  PlayCircle,
  DoorOpen,
  Building,
  Scan,
  Trash2,
  Edit2,
  X,
  Check,
} from "lucide-react";

export function SchedulesManager() {
  const {
    schedules,
    rooms,
    loadSchedules,
    setActiveRoomId,
    setActiveRoomName,
    setExamName,
    setActiveTab,
    addToast,
    triggerAudio,
  } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Edit Schedule Modal State
  const [editingSched, setEditingSched] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCourseCode, setEditCourseCode] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editWashroomLimit, setEditWashroomLimit] = useState(10);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const nowTimeStr = now.toTimeString().substring(0, 5);

  const activeTodayCount = schedules.filter((s) => s.date === todayStr).length;
  const allHalls = new Set();
  const allDepts = new Set();
  schedules.forEach((s) => {
    (s.hall_ids || []).forEach((h) => allHalls.add(h));
    (s.departments || []).forEach((d) => allDepts.add(d));
  });

  const handleDelete = async (id, title) => {
    if (!confirm(`Are you sure you want to delete exam schedule "${title}"?`)) return;
    try {
      await api.deleteSchedule(id);
      addToast("Schedule deleted successfully", "warning");
      await loadSchedules();
    } catch (e) {
      addToast(`Delete failed: ${e.message}`, "error");
    }
  };

  const handleOpenEditModal = (sched) => {
    setEditingSched(sched);
    setEditTitle(sched.title || "");
    setEditCourseCode(sched.course_code || "");
    setEditDate(sched.date || todayStr);
    setEditStartTime(sched.start_time || "09:00");
    setEditEndTime(sched.end_time || "12:00");
    setEditWashroomLimit(sched.washroom_limit_minutes || 10);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingSched) return;
    if (!editTitle.trim() || !editDate.trim()) {
      addToast("Please enter Exam Title and Date", "error");
      return;
    }

    setIsSavingEdit(true);
    try {
      await api.updateSchedule(editingSched.id, {
        title: editTitle.trim(),
        course_code: editCourseCode.trim(),
        date: editDate.trim(),
        start_time: editStartTime.trim(),
        end_time: editEndTime.trim(),
        washroom_limit_minutes: Number(editWashroomLimit) || 10,
      });

      triggerAudio("success");
      addToast(`📝 Schedule "${editTitle}" updated successfully!`, "success");
      setEditingSched(null);
      await loadSchedules();
    } catch (err) {
      addToast(`Update error: ${err.message}`, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleLaunchScanner = (hallId, schedTitle) => {
    if (hallId) {
      setActiveRoomId(hallId);
      const r = rooms.find((x) => x.id === hallId);
      if (r) setActiveRoomName(r.name);
    }
    if (schedTitle) {
      setExamName(schedTitle);
    }
    setActiveTab("attendance");
    addToast(`Launched attendance scanner for: ${schedTitle}`, "success");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="glass-panel p-6 flex items-center justify-between flex-wrap gap-4 border-sky-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Department Exam Timetable & Hall Allocations</h2>
            <p className="text-xs text-slate-400">
              Set fixed exam dates, times, allowed departments, and assign multiple halls with custom washroom time limits.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow-neon-cyan"
        >
          <PlusCircle className="w-4 h-4" /> Create Exam Schedule
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Calendar} title="Total Scheduled" value={schedules.length} color="blue" />
        <StatCard icon={PlayCircle} title="Active Today" value={activeTodayCount} color="emerald" />
        <StatCard icon={DoorOpen} title="Covered Halls" value={allHalls.size} color="amber" />
        <StatCard icon={Building} title="Departments" value={allDepts.size} color="purple" />
      </div>

      {/* Schedules Table */}
      <div className="glass-panel p-6 overflow-hidden border-sky-500/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-950/40 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Course & Title</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Time Window</th>
                <th className="p-3.5">Allowed Dept(s)</th>
                <th className="p-3.5">Assigned Hall(s)</th>
                <th className="p-3.5">Washroom Limit</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 font-mono">
                    No exam schedules created yet. Click "Create Exam Schedule" to add timetables.
                  </td>
                </tr>
              ) : (
                schedules.map((sched) => {
                  let statusTag = { label: "UPCOMING", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" };
                  if (sched.date === todayStr) {
                    if (sched.start_time <= nowTimeStr && nowTimeStr <= sched.end_time) {
                      statusTag = { label: "RUNNING NOW", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold" };
                    } else if (nowTimeStr < sched.start_time) {
                      statusTag = { label: `TODAY (${sched.start_time})`, color: "bg-sky-500/20 text-sky-400 border-sky-500/40" };
                    } else {
                      statusTag = { label: "COMPLETED", color: "bg-slate-800 text-slate-400 border-slate-700" };
                    }
                  } else if (sched.date < todayStr) {
                    statusTag = { label: "PAST EXAM", color: "bg-slate-800 text-slate-500 border-slate-700" };
                  }

                  const firstHallId = sched.hall_ids && sched.hall_ids.length > 0 ? sched.hall_ids[0] : "";

                  return (
                    <tr key={sched.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${statusTag.color}`}>
                          {statusTag.label}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-col">
                          <strong className="text-white text-sm">{sched.title}</strong>
                          <span className="font-mono text-cyan-400 text-[11px]">{sched.course_code || "CODE-N/A"}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-200">{sched.date}</td>
                      <td className="p-3.5 font-mono text-amber-400 font-bold">
                        {sched.start_time} - {sched.end_time}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(sched.departments || ["ALL"]).map((d, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                d === "ALL"
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  : "bg-sky-500/15 text-sky-400 border-sky-500/30"
                              }`}
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(sched.hall_ids || []).map((hId) => {
                            const r = rooms.find((x) => x.id === hId);
                            const rName = r ? r.name : hId;
                            return (
                              <button
                                key={hId}
                                onClick={() => handleLaunchScanner(hId, sched.title)}
                                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition"
                              >
                                {rName}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-black text-rose-400">
                        {sched.washroom_limit_minutes || 10} Mins
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleLaunchScanner(firstHallId, sched.title)}
                            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyber-cyan border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <Scan className="w-3.5 h-3.5" /> Scan
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(sched)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                            title="Edit Exam Date, Time & Title"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(sched.id, sched.title)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Create Modal */}
      {isCreateModalOpen && <CreateScheduleModal onClose={() => setIsCreateModalOpen(false)} />}

      {/* Edit Schedule Modal */}
      {editingSched && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 flex flex-col gap-4 border-sky-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyan-400">
                <Edit2 className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Edit Exam Schedule & Timetable</h3>
              </div>
              <button onClick={() => setEditingSched(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Exam Subject / Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Course Code</label>
                  <input
                    type="text"
                    value={editCourseCode}
                    onChange={(e) => setEditCourseCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Exam Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Washroom Time Limit (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={editWashroomLimit}
                  onChange={(e) => setEditWashroomLimit(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSched(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-neon-cyan"
                >
                  <Check className="w-4 h-4" /> Save Schedule Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
