"use client";

import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { X, CalendarPlus, Check } from "lucide-react";

export function CreateScheduleModal({ onClose }) {
  const { rooms, loadSchedules, addToast } = useApp();

  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [washroomLimit, setWashroomLimit] = useState(10);
  const [selectedDepts, setSelectedDepts] = useState(["ALL"]);
  const [selectedHalls, setSelectedHalls] = useState(rooms.map((r) => r.id));
  const [saving, setSaving] = useState(false);

  const deptsList = [
    { value: "ALL", label: "All Departments" },
    { value: "Computer Science & Engineering", label: "CSE / Computer Science" },
    { value: "Electrical & Electronic Engineering", label: "EEE / Electrical" },
    { value: "Business Administration", label: "BBA / Business" },
    { value: "Civil Engineering", label: "Civil Engineering" },
    { value: "Software Engineering", label: "Software Engineering" },
  ];

  const handleDeptToggle = (val) => {
    if (val === "ALL") {
      setSelectedDepts(["ALL"]);
      return;
    }
    const filtered = selectedDepts.filter((d) => d !== "ALL");
    if (filtered.includes(val)) {
      const next = filtered.filter((d) => d !== val);
      setSelectedDepts(next.length === 0 ? ["ALL"] : next);
    } else {
      setSelectedDepts([...filtered, val]);
    }
  };

  const handleHallToggle = (id) => {
    if (selectedHalls.includes(id)) {
      setSelectedHalls(selectedHalls.filter((h) => h !== id));
    } else {
      setSelectedHalls([...selectedHalls, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast("Please enter exam title", "error");
      return;
    }

    setSaving(true);
    try {
      await api.createSchedule({
        title: title.trim(),
        course_code: courseCode.trim(),
        date,
        start_time: startTime,
        end_time: endTime,
        departments: selectedDepts,
        hall_ids: selectedHalls.length > 0 ? selectedHalls : rooms.map((r) => r.id),
        washroom_limit_minutes: Number(washroomLimit) || 10,
        entry_grace_minutes: 30,
      });

      addToast(`Exam schedule "${title}" created!`, "success");
      await loadSchedules();
      onClose();
    } catch (err) {
      addToast(`Failed to create schedule: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-xl p-6 flex flex-col gap-5 border-sky-500/30 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2.5 text-cyber-cyan">
            <CalendarPlus className="w-5 h-5" />
            <h3 className="font-bold text-base text-white">Create Exam Schedule & Timetable</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Exam Subject / Course Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms - Midterm"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. CSE-2101"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Exam Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Washroom Limit (Mins)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={washroomLimit}
                onChange={(e) => setWashroomLimit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
              />
            </div>
          </div>

          {/* Department Selection Checkboxes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Allowed Department(s)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              {deptsList.map((d) => (
                <label key={d.value} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={selectedDepts.includes(d.value)}
                    onChange={() => handleDeptToggle(d.value)}
                    className="rounded accent-cyan-500"
                  />
                  <span>{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Exam Halls Multi-Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Assigned Exam Hall(s)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              {rooms.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={selectedHalls.includes(r.id)}
                    onChange={() => handleHallToggle(r.id)}
                    className="rounded accent-cyan-500"
                  />
                  <span>{r.name} ({r.capacity} seats)</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-2 transition shadow-neon-cyan"
            >
              <Check className="w-4 h-4" /> Save Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
