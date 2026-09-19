"use client";

import React from "react";
import { useApp } from "../../context/AppContext";
import { MapPin, Calendar, Clock, PlayCircle, Lock } from "lucide-react";

export function SessionBanner() {
  const {
    rooms,
    activeRoomId,
    setActiveRoomId,
    setActiveRoomName,
    activeRoomName,
    examName,
    setExamName,
    activeSchedule,
    attendanceData,
    addToast,
  } = useApp();

  const currentRoom = rooms.find((r) => r.id === activeRoomId);
  const presentCount = (attendanceData.records || []).filter(
    (r) => r.room_id === activeRoomId && r.status === "INSIDE"
  ).length;

  const now = new Date();
  const nowTimeStr = now.toTimeString().substring(0, 5);

  const addMinutes = (timeStr, mins) => {
    if (!timeStr) return "";
    try {
      const [h, m] = timeStr.split(":").map(Number);
      const total = Math.max(0, Math.min(1439, h * 60 + m + mins));
      const nh = String(Math.floor(total / 60)).padStart(2, "0");
      const nm = String(total % 60).padStart(2, "0");
      return `${nh}:${nm}`;
    } catch {
      return timeStr;
    }
  };

  const entryOpenTime = activeSchedule ? addMinutes(activeSchedule.start_time, -30) : "08:30";
  const exitCloseTime = activeSchedule ? addMinutes(activeSchedule.end_time, 30) : "12:30";

  let statusBadge = { label: "NO SCHEDULE", color: "bg-slate-800 text-slate-400 border-slate-700" };
  if (activeSchedule) {
    if (nowTimeStr < entryOpenTime) {
      statusBadge = { label: `ENTRY OPENS ${entryOpenTime}`, color: "bg-sky-500/20 text-sky-400 border-sky-500/40" };
    } else if (entryOpenTime <= nowTimeStr && nowTimeStr < activeSchedule.start_time) {
      statusBadge = { label: `ENTRY OPEN (STARTS ${activeSchedule.start_time})`, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" };
    } else if (activeSchedule.start_time <= nowTimeStr && nowTimeStr <= activeSchedule.end_time) {
      statusBadge = { label: "EXAM RUNNING", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" };
    } else if (activeSchedule.end_time < nowTimeStr && nowTimeStr <= exitCloseTime) {
      statusBadge = { label: `EXIT WINDOW (AUTO-EXIT ${exitCloseTime})`, color: "bg-amber-500/20 text-amber-400 border-amber-500/40" };
    } else {
      statusBadge = { label: "EXAM ENDED (AUTO-EXITED)", color: "bg-rose-500/20 text-rose-400 border-rose-500/40" };
    }
  }

  const handleRoomChange = (e) => {
    const rId = e.target.value;
    setActiveRoomId(rId);
    const r = rooms.find((x) => x.id === rId);
    if (r) {
      setActiveRoomName(r.name);
      addToast(`Switched active scanner room to: ${r.name}`, "info");
    }
  };

  return (
    <div className="w-full glass-panel px-5 py-3.5 mb-5 flex items-center justify-between flex-wrap gap-4 border-sky-500/20">
      {/* Left: Room Selector & Exam Subject */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyber-cyan" />
          <select
            value={activeRoomId}
            onChange={handleRoomChange}
            className="bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyber-cyan font-mono"
          >
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Cap: {r.capacity})
              </option>
            ))}
          </select>
        </div>

        <div className="h-6 w-px bg-slate-700/60 hidden sm:block"></div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            placeholder="Exam Subject / Course Title..."
            className="bg-transparent border-b border-dashed border-slate-600 hover:border-slate-400 focus:border-cyber-cyan text-sm font-bold text-white px-1 py-0.5 focus:outline-none min-w-[220px]"
          />
        </div>
      </div>

      {/* Middle: Live Schedule Time Range & Status Pill */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-700/60 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-cyber-amber" />
          <span className="text-slate-300">
            {activeSchedule ? `${activeSchedule.start_time} - ${activeSchedule.end_time}` : "09:00 - 12:00"}
          </span>
          <span className="text-[11px] text-slate-500">
            (Entry: {entryOpenTime} • Auto-Exit: {exitCloseTime})
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
            {statusBadge.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Presence:</span>
          <span className="font-bold text-cyber-emerald">
            {presentCount} / {currentRoom?.capacity || 40}
          </span>
        </div>
      </div>
    </div>
  );
}
