"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import {
  Clock,
  Building,
  BookOpen,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Coffee,
  GraduationCap,
  Sparkles,
  Save,
  X,
  RotateCcw,
  Copy,
  Layers,
  ChevronRight,
  UserCheck,
  CalendarDays,
  Grid,
  Info,
} from "lucide-react";

export const STANDARD_TIME_SLOTS = [
  { id: "slot-1", label: "09:00 - 09:50", displayLabel: "09:00 AM - 09:50 AM", start: "09:00", end: "09:50", period: "Period 1 (Morning)" },
  { id: "slot-2", label: "10:00 - 10:50", displayLabel: "10:00 AM - 10:50 AM", start: "10:00", end: "10:50", period: "Period 2 (Morning)" },
  { id: "slot-3", label: "11:00 - 11:50", displayLabel: "11:00 AM - 11:50 AM", start: "11:00", end: "11:50", period: "Period 3 (Morning)" },
  { id: "slot-4", label: "12:00 - 12:50", displayLabel: "12:00 PM - 12:50 PM", start: "12:00", end: "12:50", period: "Period 4 (Noon)" },
  { id: "slot-5", label: "01:00 - 01:50", displayLabel: "01:00 PM - 01:50 PM", start: "13:00", end: "13:50", period: "Period 5 (Lunch / Prayer)" },
  { id: "slot-6", label: "02:00 - 02:50", displayLabel: "02:00 PM - 02:50 PM", start: "14:00", end: "14:50", period: "Period 6 (Afternoon)" },
  { id: "slot-7", label: "03:00 - 03:50", displayLabel: "03:00 PM - 03:50 PM", start: "15:00", end: "15:50", period: "Period 7 (Afternoon)" },
  { id: "slot-8", label: "04:00 - 04:50", displayLabel: "04:00 PM - 04:50 PM", start: "16:00", end: "16:50", period: "Period 8 (Late Afternoon)" },
];

export const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ClassRoutineManager() {
  const { rooms, departments, routines, loadRoutines, addToast, triggerAudio } = useApp();

  // Selected Filter Room & Department
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedDeptName, setSelectedDeptName] = useState("");
  const [selectedDayTab, setSelectedDayTab] = useState("ALL"); // "ALL" or specific day
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Drawer Form State for Creating or Editing a Slot
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);

  // Form Fields
  const [formRoomId, setFormRoomId] = useState("");
  const [formDeptName, setFormDeptName] = useState("");
  const [formDay, setFormDay] = useState("Sunday");
  const [formSlotPreset, setFormSlotPreset] = useState("09:00 - 09:50");
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("09:50");

  const [isGap, setIsGap] = useState(false); // True = Break / No Class
  const [formCourseCode, setFormCourseCode] = useState("");
  const [formCourseName, setFormCourseName] = useState("");
  const [formInstructor, setFormInstructor] = useState("");
  const [formSection, setFormSection] = useState("Section A");
  const [formSemester, setFormSemester] = useState("1st");
  const [formRemarks, setFormRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-set default room & dept when loaded
  useEffect(() => {
    if (rooms && rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (departments && departments.length > 0 && !selectedDeptName) {
      setSelectedDeptName(departments[0].name);
    }
  }, [departments, selectedDeptName]);

  // Active room object
  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId) || rooms[0] || null;
  }, [rooms, selectedRoomId]);

  // Active department object
  const currentDept = useMemo(() => {
    return departments.find((d) => d.name === (formDeptName || selectedDeptName)) || departments[0] || null;
  }, [departments, formDeptName, selectedDeptName]);

  // Filtered routines for current selection
  const roomRoutines = useMemo(() => {
    if (!routines) return [];
    return routines.filter((r) => {
      const matchRoom = selectedRoomId ? r.room_id === selectedRoomId : true;
      const matchDay = selectedDayTab !== "ALL" ? r.day?.toLowerCase() === selectedDayTab.toLowerCase() : true;
      const matchSearch = searchQuery
        ? (r.course_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.course_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.instructor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.department || "").toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchRoom && matchDay && matchSearch;
    });
  }, [routines, selectedRoomId, selectedDayTab, searchQuery]);

  // Open modal for new slot
  const openNewSlotModal = (presetDay = "Sunday", presetSlot = "09:00 - 09:50") => {
    setEditingSlotId(null);
    setFormRoomId(selectedRoomId || (rooms[0]?.id ?? "room-101"));
    setFormDeptName(selectedDeptName || (departments[0]?.name ?? "Computer Science & Engineering"));
    setFormDay(presetDay);
    setFormSlotPreset(presetSlot);

    const slotObj = STANDARD_TIME_SLOTS.find((s) => s.label === presetSlot);
    if (slotObj) {
      setIsCustomTime(false);
      setFormStartTime(slotObj.start);
      setFormEndTime(slotObj.end);
    } else {
      setIsCustomTime(true);
      setFormStartTime("09:00");
      setFormEndTime("09:50");
    }

    setIsGap(false);
    // Pre-fill first course if available
    const deptObj = departments.find((d) => d.name === (selectedDeptName || departments[0]?.name));
    if (deptObj && deptObj.courses && deptObj.courses.length > 0) {
      setFormCourseCode(deptObj.courses[0].code);
      setFormCourseName(deptObj.courses[0].title);
    } else {
      setFormCourseCode("CSE-1101");
      setFormCourseName("Structured Programming Language");
    }

    setFormInstructor("");
    setFormSection("Section A");
    setFormSemester("1st");
    setFormRemarks("");
    setIsModalOpen(true);
  };

  // Open modal for editing existing slot
  const openEditSlotModal = (slot) => {
    setEditingSlotId(slot.id);
    setFormRoomId(slot.room_id || selectedRoomId);
    setFormDeptName(slot.department || selectedDeptName);
    setFormDay(slot.day || "Sunday");

    const matchedPreset = STANDARD_TIME_SLOTS.find((s) => s.label === slot.time_slot);
    if (matchedPreset) {
      setFormSlotPreset(slot.time_slot);
      setIsCustomTime(false);
      setFormStartTime(matchedPreset.start);
      setFormEndTime(matchedPreset.end);
    } else {
      setFormSlotPreset("CUSTOM");
      setIsCustomTime(true);
      setFormStartTime(slot.start_time || "09:00");
      setFormEndTime(slot.end_time || "09:50");
    }

    setIsGap(!!slot.is_gap);
    setFormCourseCode(slot.course_code || "");
    setFormCourseName(slot.course_name || "");
    setFormInstructor(slot.instructor || "");
    setFormSection(slot.section || "Section A");
    setFormSemester(slot.semester || "1st");
    setFormRemarks(slot.remarks || "");
    setIsModalOpen(true);
  };

  // Handle slot preset change
  const handlePresetChange = (presetValue) => {
    setFormSlotPreset(presetValue);
    if (presetValue === "CUSTOM") {
      setIsCustomTime(true);
    } else {
      setIsCustomTime(false);
      const matched = STANDARD_TIME_SLOTS.find((s) => s.label === presetValue);
      if (matched) {
        setFormStartTime(matched.start);
        setFormEndTime(matched.end);
      }
    }
  };

  // Handle course selection change from dropdown
  const handleCourseSelection = (courseCode) => {
    setFormCourseCode(courseCode);
    const deptObj = departments.find((d) => d.name === formDeptName);
    if (deptObj && deptObj.courses) {
      const crs = deptObj.courses.find((c) => c.code === courseCode);
      if (crs) {
        setFormCourseName(crs.title);
      }
    }
  };

  // Save slot handler
  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!formRoomId) {
      addToast("Please select an exam hall/room.", "error");
      return;
    }

    setIsSubmitting(true);
    const slotLabel = isCustomTime ? `${formStartTime} - ${formEndTime}` : formSlotPreset;

    const payload = {
      room_id: formRoomId,
      department: formDeptName,
      day: formDay,
      time_slot: slotLabel,
      start_time: formStartTime,
      end_time: formEndTime,
      is_gap: isGap,
      course_code: isGap ? "GAP" : (formCourseCode || "CRS-101"),
      course_name: isGap ? (formRemarks || "Break / No Class") : (formCourseName || "Class Lecture"),
      instructor: isGap ? "" : formInstructor,
      section: isGap ? "" : formSection,
      semester: isGap ? "" : formSemester,
      remarks: formRemarks,
    };

    try {
      if (editingSlotId) {
        await api.updateRoutine(editingSlotId, payload);
        addToast(`✅ Class routine updated for ${formDay} (${slotLabel})!`, "success");
      } else {
        await api.createRoutine(payload);
        addToast(`✅ Class routine slot added for ${formDay} (${slotLabel})!`, "success");
      }

      triggerAudio?.("beep");
      await loadRoutines();
      setIsModalOpen(false);
    } catch (err) {
      addToast(`Error saving routine slot: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete slot handler
  const handleDeleteSlot = async (routineId, day, time) => {
    if (!confirm(`Are you sure you want to remove the routine slot for ${day} (${time})?`)) {
      return;
    }
    try {
      await api.deleteRoutine(routineId);
      addToast(`🗑️ Routine slot deleted.`, "info");
      await loadRoutines();
    } catch (err) {
      addToast(`Error deleting routine: ${err.message}`, "error");
    }
  };

  // Clear all routines for selected room
  const handleClearRoomRoutines = async () => {
    const roomName = currentRoom?.name || selectedRoomId;
    if (!confirm(`Are you sure you want to clear ALL weekly class routines for ${roomName}?`)) {
      return;
    }
    try {
      await api.clearRoomRoutines(selectedRoomId);
      addToast(`🧹 Cleared all class routines for ${roomName}`, "info");
      await loadRoutines();
    } catch (err) {
      addToast(`Error clearing room routines: ${err.message}`, "error");
    }
  };

  // Quick populate 50-min template for current room
  const handleGenerateDefaultSchedule = async () => {
    if (!selectedRoomId) return;
    const roomName = currentRoom?.name || selectedRoomId;
    const deptName = selectedDeptName || (departments[0]?.name ?? "Computer Science & Engineering");

    if (!confirm(`Generate standard 50-minute weekly schedule (Sun-Thu, 9:00 AM - 4:50 PM with 10-min gaps) for ${roomName}?`)) {
      return;
    }

    const newSlots = [];
    const targetDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const deptObj = departments.find((d) => d.name === deptName) || departments[0];
    const courses = deptObj?.courses || [];

    targetDays.forEach((day, dIdx) => {
      STANDARD_TIME_SLOTS.forEach((slot, sIdx) => {
        // Period 5 (1:00-1:50 PM) is standard Lunch & Prayer Break
        const isLunchGap = sIdx === 4;
        const crs = courses[(dIdx + sIdx) % Math.max(courses.length, 1)];

        newSlots.push({
          room_id: selectedRoomId,
          department: deptName,
          day: day,
          time_slot: slot.label,
          start_time: slot.start,
          end_time: slot.end,
          is_gap: isLunchGap,
          course_code: isLunchGap ? "GAP" : (crs?.code || "CSE-2101"),
          course_name: isLunchGap ? "Lunch & Prayer Break" : (crs?.title || "Class Lecture"),
          instructor: isLunchGap ? "" : "Faculty In-Charge",
          section: "Section A",
          semester: "3rd",
          remarks: isLunchGap ? "1 Hour Recess" : `${roomName} Lecture`,
        });
      });
    });

    try {
      await api.batchSaveRoutines(newSlots);
      addToast(`🎉 Generated 50-min weekly schedule for ${roomName}!`, "success");
      triggerAudio?.("success");
      await loadRoutines();
    } catch (err) {
      addToast(`Error generating schedule: ${err.message}`, "error");
    }
  };

  // Find slot for matrix cell
  const getSlotForCell = (day, timeSlotLabel) => {
    return routines.find(
      (r) =>
        r.room_id === selectedRoomId &&
        r.day?.toLowerCase() === day.toLowerCase() &&
        r.time_slot === timeSlotLabel
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Controls & Room/Dept Selection Panel */}
      <div className="glass-panel p-5 border-sky-500/30 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-600 flex items-center justify-center text-slate-950 font-black shadow-neon-cyan flex-shrink-0">
              <Clock className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                Room-Wise Weekly Class Routine Setup
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  50-Min Periods + 10-Min Gaps
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure room-specific weekly class routines, course allocations, period timings, and recess breaks.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleGenerateDefaultSchedule}
              className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold font-mono flex items-center gap-2 transition shadow-sm hover:shadow-neon-cyan"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" /> Auto-Generate 50-Min Template
            </button>

            <button
              onClick={() => openNewSlotModal("Sunday", "09:00 - 09:50")}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-mono flex items-center gap-2 transition shadow-neon-cyan"
            >
              <Plus className="w-4 h-4" /> Add Routine Slot
            </button>

            <button
              onClick={handleClearRoomRoutines}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-bold font-mono flex items-center gap-1.5 transition"
              title="Clear all routine slots for this room"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Room
            </button>
          </div>
        </div>

        {/* Room, Department & Day Filter Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Room Selector */}
          <div className="md:col-span-4 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
              <Building className="w-4 h-4 text-cyan-400" /> Select Exam Hall / Classroom:
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.building || "Campus"} - Cap: {r.capacity} Seats)
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter Selector */}
          <div className="md:col-span-5 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
              <BookOpen className="w-4 h-4 text-sky-400" /> Default Department / Faculty:
            </label>
            <select
              value={selectedDeptName}
              onChange={(e) => setSelectedDeptName(e.target.value)}
              className="bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.code} - {d.courses?.length || 0} Courses Available)
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="md:col-span-3 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-mono">
              <Info className="w-4 h-4 text-slate-400" /> Filter Routine:
            </label>
            <input
              type="text"
              placeholder="Search course, teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Days of Week Tab Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800/80 pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedDayTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedDayTab === "ALL"
                ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
            }`}
          >
            <Grid className="w-3.5 h-3.5" /> Full Weekly Matrix (All Days)
          </button>

          {DAYS_OF_WEEK.map((day) => {
            const countForDay = routines.filter(
              (r) => r.room_id === selectedRoomId && r.day?.toLowerCase() === day.toLowerCase()
            ).length;

            return (
              <button
                key={day}
                onClick={() => setSelectedDayTab(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedDayTab === day
                    ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                    : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" /> {day}
                {countForDay > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedDayTab === day ? "bg-slate-950 text-cyan-300" : "bg-cyan-500/20 text-cyan-400"
                    }`}
                  >
                    {countForDay}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive Weekly Matrix View */}
      <div className="glass-panel p-5 border-sky-500/30 flex flex-col gap-4 overflow-x-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
              {currentRoom?.name || "Room Routine"} — Weekly Master Timetable
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-neon-cyan" /> Academic Class
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> Recess / Break (Gap)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> Empty Period
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/70 shadow-inner">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-300">
                <th className="p-3.5 font-bold uppercase tracking-wider border-r border-slate-800 w-28 bg-slate-900/90 sticky left-0 z-10">
                  Day / Time
                </th>
                {STANDARD_TIME_SLOTS.map((slot) => (
                  <th key={slot.id} className="p-3 text-center border-r border-slate-800 font-bold">
                    <div className="text-cyan-300 font-extrabold text-[12px]">{slot.displayLabel || slot.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{slot.period}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
              {(selectedDayTab === "ALL" ? DAYS_OF_WEEK : [selectedDayTab]).map((day) => (
                <tr key={day} className="hover:bg-slate-900/40 transition">
                  {/* Day Header Row */}
                  <td className="p-3.5 font-bold text-white uppercase tracking-wider bg-slate-900/80 border-r border-slate-800 sticky left-0 z-10 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-sky-400">
                      <CalendarDays className="w-3.5 h-3.5" /> {day}
                    </div>
                  </td>

                  {/* 8 Period Columns */}
                  {STANDARD_TIME_SLOTS.map((slot) => {
                    const slotData = getSlotForCell(day, slot.label);

                    if (!slotData) {
                      return (
                        <td key={slot.id} className="p-2 border-r border-slate-800 text-center align-top h-24">
                          <button
                            onClick={() => openNewSlotModal(day, slot.label)}
                            className="w-full h-full min-h-[76px] rounded-lg border border-dashed border-slate-800/80 hover:border-cyan-500/60 hover:bg-cyan-500/5 transition flex flex-col items-center justify-center gap-1 text-slate-600 hover:text-cyan-400 group p-1"
                            title={`Add class for ${day} at ${slot.label}`}
                          >
                            <Plus className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition" />
                            <span className="text-[10px] font-mono opacity-60 group-hover:opacity-100">Assign</span>
                          </button>
                        </td>
                      );
                    }

                    if (slotData.is_gap) {
                      return (
                        <td key={slot.id} className="p-2 border-r border-slate-800 align-top h-24">
                          <div className="relative group w-full h-full min-h-[76px] rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_12px_rgba(245,158,11,0.05)]">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                <Coffee className="w-3 h-3" /> BREAK
                              </span>
                              <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                                <button
                                  onClick={() => openEditSlotModal(slotData)}
                                  className="p-1 rounded bg-slate-900/90 hover:bg-cyan-500 text-slate-400 hover:text-slate-950 transition"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(slotData.id, slotData.day, slotData.time_slot)}
                                  className="p-1 rounded bg-slate-900/90 hover:bg-rose-500 text-slate-400 hover:text-white transition"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] font-bold text-slate-200 line-clamp-1">
                              {slotData.course_name || "No Class / Recess"}
                            </div>
                            <div className="text-[9px] text-amber-300/80 font-mono">10-min interval included</div>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={slot.id} className="p-2 border-r border-slate-800 align-top h-24">
                        <div className="relative group w-full h-full min-h-[76px] rounded-lg bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 p-2 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-neon-cyan transition">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-cyan-300 font-mono">
                              {slotData.course_code}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                              <button
                                onClick={() => openEditSlotModal(slotData)}
                                className="p-1 rounded bg-slate-800 hover:bg-cyan-500 text-slate-300 hover:text-slate-950 transition"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slotData.id, slotData.day, slotData.time_slot)}
                                className="p-1 rounded bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white transition"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] font-bold text-white line-clamp-1" title={slotData.course_name}>
                            {slotData.course_name}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span className="truncate max-w-[80px]" title={slotData.instructor || "Faculty"}>
                              {slotData.instructor || "Faculty"}
                            </span>
                            <span className="text-slate-500">{slotData.section || "Sec A"}</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Slot Creation & Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-xl p-6 flex flex-col gap-4 border-2 border-cyan-500/50 bg-slate-950/95 shadow-2xl rounded-2xl relative my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyber-cyan shadow-neon-cyan flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    {editingSlotId ? "Edit Routine Slot" : "Configure Class Routine Slot"}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Room: <strong>{rooms.find((r) => r.id === formRoomId)?.name || formRoomId}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="flex flex-col gap-4">
              {/* Fixed / Read-Only Context Information Cards (Locked As Requested) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
                {/* 1. Classroom / Hall (Fixed) */}
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-cyan-400" /> Classroom / Hall:
                  </span>
                  <div className="text-xs font-black text-white font-mono truncate" title={rooms.find((r) => r.id === formRoomId)?.name || formRoomId}>
                    {rooms.find((r) => r.id === formRoomId)?.name || formRoomId}
                  </div>
                  <span className="text-[10px] text-cyan-400/80 font-mono">
                    Cap: {rooms.find((r) => r.id === formRoomId)?.capacity || 60} Seats • Fixed
                  </span>
                </div>

                {/* 2. Department / Program (Fixed) */}
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-sky-400" /> Department / Program:
                  </span>
                  <div className="text-xs font-black text-sky-300 font-mono truncate" title={formDeptName}>
                    {formDeptName}
                  </div>
                  <span className="text-[10px] text-sky-400/80 font-mono">
                    {departments.find((d) => d.name === formDeptName)?.code || "Dept"} • Fixed
                  </span>
                </div>

                {/* 3. Day of Week (Fixed) */}
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Day of Week:
                  </span>
                  <div className="text-xs font-black text-emerald-300 font-mono">
                    {formDay}
                  </div>
                  <span className="text-[10px] text-emerald-400/80 font-mono">Weekly Slot • Fixed</span>
                </div>

                {/* 4. 50-Min Standard Time Slot (Editable with AM/PM) */}
                <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/40 hover:border-amber-400 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> 50-Min Standard Time Slot:
                    </span>
                    <span className="text-[9px] font-mono text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                      Editable (AM/PM)
                    </span>
                  </div>

                  <select
                    value={isCustomTime ? "CUSTOM" : formSlotPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="bg-slate-900 border border-slate-700 hover:border-amber-400 focus:border-amber-400 text-xs font-black text-amber-300 font-mono rounded-lg px-2.5 py-1.5 outline-none cursor-pointer w-full transition"
                  >
                    {STANDARD_TIME_SLOTS.map((s) => (
                      <option key={s.id} value={s.label} className="bg-slate-900 text-white font-mono">
                        {s.displayLabel || s.label} — {s.period}
                      </option>
                    ))}
                    <option value="CUSTOM" className="bg-slate-900 text-cyan-300 font-mono">
                      ⚙️ Custom Time Slot (Manual AM / PM)
                    </option>
                  </select>

                  {/* Custom Start & End Time Inputs if CUSTOM is chosen */}
                  {isCustomTime && (
                    <div className="grid grid-cols-2 gap-2 mt-1 pt-1.5 border-t border-slate-800 animate-fadeIn">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-mono">Start Time (e.g. 04:00 PM):</span>
                        <input
                          type="text"
                          value={formStartTime}
                          onChange={(e) => setFormStartTime(e.target.value)}
                          placeholder="04:00 PM"
                          className="bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded px-2 py-1 outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-mono">End Time (e.g. 04:50 PM):</span>
                        <input
                          type="text"
                          value={formEndTime}
                          onChange={(e) => setFormEndTime(e.target.value)}
                          placeholder="04:50 PM"
                          className="bg-slate-900 border border-slate-700 text-white text-xs font-mono rounded px-2 py-1 outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] text-amber-400/80 font-mono">
                    {isCustomTime
                      ? `Custom Time: ${formStartTime} - ${formEndTime}`
                      : `Selected Period: ${STANDARD_TIME_SLOTS.find((s) => s.label === formSlotPreset)?.displayLabel || formSlotPreset}`}
                  </span>
                </div>
              </div>

              {/* Slot Type Toggle: Class vs Break / Gap */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-300 font-mono">Slot Purpose / Type:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGap(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 border transition ${
                      !isGap
                        ? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-neon-cyan"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" /> Academic Class / Lab
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsGap(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold font-mono flex items-center justify-center gap-2 border transition ${
                      isGap
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    <Coffee className="w-4 h-4" /> Break / Recess (Gap)
                  </button>
                </div>
              </div>

              {/* Conditional: Class Fields */}
              {!isGap ? (
                <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  {/* Select Course from Department */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-300 font-mono">Course Code & Title:</label>
                    {currentDept && currentDept.courses && currentDept.courses.length > 0 ? (
                      <select
                        value={formCourseCode}
                        onChange={(e) => handleCourseSelection(e.target.value)}
                        className="bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                      >
                        {currentDept.courses.map((crs) => (
                          <option key={crs.id || crs.code} value={crs.code}>
                            {crs.code} — {crs.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. CSE-2101"
                        value={formCourseCode}
                        onChange={(e) => setFormCourseCode(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                        required
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[11px] font-mono text-slate-400">Faculty / Teacher Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Tariq Rahman"
                        value={formInstructor}
                        onChange={(e) => setFormInstructor(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-mono text-slate-400">Section / Batch:</label>
                      <input
                        type="text"
                        placeholder="e.g. Sec A"
                        value={formSection}
                        onChange={(e) => setFormSection(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Break / Gap Custom Label */
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
                  <label className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                    <Coffee className="w-4 h-4" /> Break / Recess Label:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10 Min Interval, Lunch & Prayer Break, Free Period"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    className="bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <p className="text-[11px] text-slate-400 font-mono">
                    This period will be designated as a non-class interval on the master weekly board.
                  </p>
                </div>
              )}

              {/* Form Action Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold font-mono transition border border-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs font-mono transition shadow-neon-cyan flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> {editingSlotId ? "Update Routine Slot" : "Save Routine Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
