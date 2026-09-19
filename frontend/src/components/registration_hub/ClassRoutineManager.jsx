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
  { id: "slot-1", label: "09:00 AM - 09:50 AM", displayLabel: "09:00 AM - 09:50 AM", start: "09:00", end: "09:50" },
  { id: "slot-2", label: "10:00 AM - 10:50 AM", displayLabel: "10:00 AM - 10:50 AM", start: "10:00", end: "10:50" },
  { id: "slot-3", label: "11:00 AM - 11:50 AM", displayLabel: "11:00 AM - 11:50 AM", start: "11:00", end: "11:50" },
  { id: "slot-4", label: "12:00 PM - 12:50 PM", displayLabel: "12:00 PM - 12:50 PM", start: "12:00", end: "12:50" },
  { id: "slot-5", label: "01:00 PM - 01:50 PM", displayLabel: "01:00 PM - 01:50 PM", start: "13:00", end: "13:50" },
  { id: "slot-6", label: "02:00 PM - 02:50 PM", displayLabel: "02:00 PM - 02:50 PM", start: "14:00", end: "14:50" },
  { id: "slot-7", label: "03:00 PM - 03:50 PM", displayLabel: "03:00 PM - 03:50 PM", start: "15:00", end: "15:50" },
  { id: "slot-8", label: "04:00 PM - 04:50 PM", displayLabel: "04:00 PM - 04:50 PM", start: "16:00", end: "16:50" },
];

export const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ClassRoutineManager() {
  const { rooms, departments, routines, loadRoutines, addToast, triggerAudio } = useApp();

  // Selected Filter Room & Department
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedDeptName, setSelectedDeptName] = useState("");
  const [selectedDayTab, setSelectedDayTab] = useState("ALL"); // "ALL" or specific day
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamic Time Slots State (initialized with standard 50-min slots)
  const [timeSlots, setTimeSlots] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("digihall_routine_time_slots");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return STANDARD_TIME_SLOTS;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("digihall_routine_time_slots", JSON.stringify(timeSlots));
      } catch (e) {}
    }
  }, [timeSlots]);

  // Modal / Drawer Form State for Creating or Editing a Slot
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState(null);

  // Add New Time Slot Column Modal State (Standardized Picker)
  const [isAddTimeModalOpen, setIsAddTimeModalOpen] = useState(false);
  const [startHour, setStartHour] = useState("03");
  const [startMinute, setStartMinute] = useState("00");
  const [startAmPm, setStartAmPm] = useState("PM");
  const [endHour, setEndHour] = useState("03");
  const [endMinute, setEndMinute] = useState("50");
  const [endAmPm, setEndAmPm] = useState("PM");

  // Convert 12h time strings to standard 24h format (e.g. "03", "50", "PM" => "15:50")
  const to24Hour = (hStr, mStr, ampm) => {
    let h = parseInt(hStr, 10) || 0;
    if (ampm === "PM" && h !== 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(mStr).padStart(2, "0")}`;
  };

  // Convert 24h total minutes to 12h components
  const from24HourMinutes = (totalMinutes) => {
    const norm = ((totalMinutes % 1440) + 1440) % 1440;
    const h24 = Math.floor(norm / 60);
    const m = norm % 60;
    const ampm = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return {
      hour: String(h12).padStart(2, "0"),
      minute: String(m).padStart(2, "0"),
      ampm,
    };
  };

  // Quick apply duration (+50m, +60m, +90m, +120m) from Start Time
  const applyDuration = (mins) => {
    let h = parseInt(startHour, 10) || 0;
    if (startAmPm === "PM" && h !== 12) h += 12;
    if (startAmPm === "AM" && h === 12) h = 0;
    const m = parseInt(startMinute, 10) || 0;
    const startTotal = h * 60 + m;
    const endTotal = startTotal + mins;
    const res = from24HourMinutes(endTotal);
    setEndHour(res.hour);
    setEndMinute(res.minute);
    setEndAmPm(res.ampm);
  };

  // Quick apply preset start & end time
  const applyPresetTime = (sH, sM, sAP, eH, eM, eAP) => {
    setStartHour(sH);
    setStartMinute(sM);
    setStartAmPm(sAP);
    setEndHour(eH);
    setEndMinute(eM);
    setEndAmPm(eAP);
  };

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

  // Handler for adding a new time slot column
  const handleAddNewTimeSlot = (e) => {
    e?.preventDefault();
    const formattedSlot = `${startHour}:${startMinute} ${startAmPm} - ${endHour}:${endMinute} ${endAmPm}`;
    const start24 = to24Hour(startHour, startMinute, startAmPm);
    const end24 = to24Hour(endHour, endMinute, endAmPm);

    if (start24 === end24) {
      addToast("Start time and End time cannot be identical.", "error");
      return;
    }

    if (timeSlots.some((s) => s.label === formattedSlot)) {
      addToast(`Time slot "${formattedSlot}" already exists in the routine!`, "error");
      return;
    }

    const newSlot = {
      id: `slot-${Date.now()}`,
      label: formattedSlot,
      displayLabel: formattedSlot,
      start: start24,
      end: end24,
    };

    setTimeSlots((prev) => {
      const updated = [...prev, newSlot];
      return updated.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    });

    addToast(`✅ Added ${formattedSlot} to weekly timetable!`, "success");
    setIsAddTimeModalOpen(false);
  };

  // Handler for deleting a time slot column
  const handleDeleteTimeSlot = (slotId, slotLabel) => {
    if (timeSlots.length <= 1) {
      addToast("You must keep at least one time slot column.", "error");
      return;
    }
    if (!confirm(`Are you sure you want to delete time slot column "${slotLabel}" from the timetable?`)) {
      return;
    }
    setTimeSlots((prev) => prev.filter((s) => s.id !== slotId));
    addToast(`🗑️ Deleted time slot column "${slotLabel}"`, "info");
  };

  // Open modal for new slot
  const openNewSlotModal = (presetDay = "Sunday", presetSlot = "09:00 - 09:50") => {
    setEditingSlotId(null);
    setFormRoomId(selectedRoomId || (rooms[0]?.id ?? "room-101"));
    setFormDeptName(selectedDeptName || (departments[0]?.name ?? "Computer Science & Engineering"));
    setFormDay(presetDay);
    setFormSlotPreset(presetSlot);

    const slotObj = timeSlots.find((s) => s.label === presetSlot);
    if (slotObj) {
      setIsCustomTime(false);
      setFormStartTime(slotObj.start);
      setFormEndTime(slotObj.end);
    } else {
      setIsCustomTime(true);
      setFormStartTime(presetSlot.split("-")[0]?.trim() || "09:00");
      setFormEndTime(presetSlot.split("-")[1]?.trim() || "09:50");
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

    const matchedPreset = timeSlots.find((s) => s.label === slot.time_slot);
    if (matchedPreset) {
      setFormSlotPreset(slot.time_slot);
      setIsCustomTime(false);
      setFormStartTime(matchedPreset.start);
      setFormEndTime(matchedPreset.end);
    } else {
      setFormSlotPreset(slot.time_slot || "09:00 - 09:50");
      setIsCustomTime(false);
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
    if (!routines || !selectedRoomId) return null;
    const norm = (s) => (s || "").replace(/\s*(AM|PM)\s*/gi, "").trim();
    return routines.find(
      (r) =>
        r.room_id === selectedRoomId &&
        r.day?.toLowerCase() === day.toLowerCase() &&
        (r.time_slot === timeSlotLabel || norm(r.time_slot) === norm(timeSlotLabel))
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

        {/* Matrix Table with Smooth Horizontal Scroll */}
        <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/70 shadow-inner max-w-full custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-300">
                <th className="p-2.5 font-bold uppercase tracking-wider border-r border-slate-800 w-28 min-w-[110px] max-w-[120px] bg-slate-900 sticky left-0 z-20 shadow-md">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-[11px] font-black">Day / Time</span>
                      <span className="text-[9px] text-cyan-400 font-mono">({timeSlots.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddTimeModalOpen(true);
                      }}
                      className="px-1.5 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-[10px] font-mono tracking-wide flex items-center justify-center gap-1 shadow-neon-cyan transition hover:scale-[1.02]"
                      title="Add new time slot column"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Add Time
                    </button>
                  </div>
                </th>
                {timeSlots.map((slot) => (
                  <th key={slot.id} className="py-2.5 px-1.5 text-center border-r border-slate-800 font-bold relative group w-28 min-w-[108px] max-w-[120px] whitespace-nowrap bg-slate-900/60">
                    <div className="text-cyan-300 font-bold text-[10px] font-mono tracking-tighter whitespace-nowrap">
                      {slot.displayLabel || slot.label}
                    </div>

                    {/* Delete time slot column button on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTimeSlot(slot.id, slot.displayLabel || slot.label);
                      }}
                      title={`Delete time slot "${slot.displayLabel || slot.label}"`}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-slate-800/90 hover:bg-rose-600 text-slate-400 hover:text-white transition shadow"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
              {(selectedDayTab === "ALL" ? DAYS_OF_WEEK : [selectedDayTab]).map((day) => (
                <tr key={day} className="hover:bg-slate-900/40 transition">
                  {/* Day Header Row (Sticky on Left) */}
                  <td className="p-2.5 font-bold text-white uppercase tracking-wider bg-slate-900/90 border-r border-slate-800 sticky left-0 z-10 flex flex-col justify-center w-28 min-w-[110px] max-w-[120px] shadow-md">
                    <div className="flex items-center gap-1 text-sky-400 text-xs">
                      <CalendarDays className="w-3.5 h-3.5" /> {day}
                    </div>
                  </td>

                  {/* Dynamic Time Slot Columns */}
                  {timeSlots.map((slot) => {
                    const slotData = getSlotForCell(day, slot.label);

                    if (!slotData) {
                      return (
                        <td key={slot.id} className="p-1 border-r border-slate-800 text-center align-top h-20 w-28 min-w-[108px] max-w-[120px]">
                          <button
                            onClick={() => openNewSlotModal(day, slot.label)}
                            className="w-full h-full min-h-[58px] rounded-lg border border-dashed border-slate-800/80 hover:border-cyan-500/60 hover:bg-cyan-500/5 transition flex flex-col items-center justify-center gap-0.5 text-slate-600 hover:text-cyan-400 group p-1"
                            title={`Add class for ${day} at ${slot.label}`}
                          >
                            <Plus className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:scale-110 transition" />
                            <span className="text-[9px] font-mono opacity-60 group-hover:opacity-100">Assign</span>
                          </button>
                        </td>
                      );
                    }

                    if (slotData.is_gap) {
                      return (
                        <td key={slot.id} className="p-1 border-r border-slate-800 align-top h-20 w-28 min-w-[108px] max-w-[120px]">
                          <div className="relative group w-full h-full min-h-[58px] rounded-lg bg-amber-500/10 border border-amber-500/30 p-1.5 flex flex-col justify-between overflow-hidden shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-amber-400 flex items-center gap-0.5">
                                <Coffee className="w-2.5 h-2.5" /> BREAK
                              </span>
                              <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                                <button
                                  onClick={() => openEditSlotModal(slotData)}
                                  className="p-0.5 rounded bg-slate-900/90 hover:bg-cyan-500 text-slate-400 hover:text-slate-950 transition"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(slotData.id, slotData.day, slotData.time_slot)}
                                  className="p-0.5 rounded bg-slate-900/90 hover:bg-rose-500 text-slate-400 hover:text-white transition"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                            <div className="text-[9.5px] font-bold text-slate-200 line-clamp-1 leading-tight">
                              {slotData.course_name || "No Class"}
                            </div>
                            <div className="text-[8px] text-amber-300/70 font-mono">Recess</div>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={slot.id} className="p-1 border-r border-slate-800 align-top h-20 w-28 min-w-[108px] max-w-[120px]">
                        <div className="relative group w-full h-full min-h-[58px] rounded-lg bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 p-1.5 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-neon-cyan transition">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-cyan-300 font-mono truncate max-w-[70px]">
                              {slotData.course_code}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                              <button
                                onClick={() => openEditSlotModal(slotData)}
                                className="p-0.5 rounded bg-slate-800 hover:bg-cyan-500 text-slate-300 hover:text-slate-950 transition"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSlot(slotData.id, slotData.day, slotData.time_slot)}
                                className="p-0.5 rounded bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white transition"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[9.5px] font-bold text-white line-clamp-1 leading-tight" title={slotData.course_name}>
                            {slotData.course_name}
                          </div>

                          <div className="flex items-center justify-between text-[8.5px] text-slate-400 font-mono leading-none">
                            <span className="truncate max-w-[55px]" title={slotData.instructor || "Faculty"}>
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

                {/* 4. Time Slot (Fixed) */}
                <div className="flex flex-col gap-1 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Time Slot:
                  </span>
                  <div className="text-xs font-black text-amber-300 font-mono truncate">
                    {timeSlots.find((s) => s.label === formSlotPreset)?.displayLabel || formSlotPreset}
                  </div>
                  <span className="text-[10px] text-amber-400/80 font-mono">
                    Time Slot • Fixed
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

      {/* 4. Add New Time Slot Column Modal (Standardized Time Selector) */}
      {isAddTimeModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 flex flex-col gap-4 border-2 border-cyan-500/50 bg-slate-950/95 shadow-2xl rounded-2xl relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyber-cyan shadow-neon-cyan">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Add Standard Time Slot</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Structured period selector for timetable & AI surveillance clock matching</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTimeModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewTimeSlot} className="flex flex-col gap-4">
              {/* Start Time Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Start Time (12-Hour):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Hour */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">Hour</span>
                    <select
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono font-bold outline-none focus:border-cyan-400 transition"
                    >
                      {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Minute */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">Minute</span>
                    <select
                      value={startMinute}
                      onChange={(e) => setStartMinute(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono font-bold outline-none focus:border-cyan-400 transition"
                    >
                      {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AM / PM Toggle */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">AM / PM</span>
                    <div className="grid grid-cols-2 gap-1 h-full">
                      <button
                        type="button"
                        onClick={() => setStartAmPm("AM")}
                        className={`rounded-xl text-xs font-black font-mono transition py-2 ${
                          startAmPm === "AM"
                            ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                            : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartAmPm("PM")}
                        className={`rounded-xl text-xs font-black font-mono transition py-2 ${
                          startAmPm === "PM"
                            ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                            : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Duration Calculator (Auto sets End Time) */}
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-[10px] text-amber-300 font-mono font-bold flex items-center gap-1 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Quick Duration Calc (Auto-sets End Time):
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyDuration(50)}
                    className="px-2 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-black transition hover:scale-[1.02] text-center"
                  >
                    ⚡ +50 Min (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDuration(60)}
                    className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold transition hover:scale-[1.02] text-center"
                  >
                    +60 Min (1 Hr)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDuration(90)}
                    className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold transition hover:scale-[1.02] text-center"
                  >
                    +90 Min (1.5 Hr Lab)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyDuration(120)}
                    className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold transition hover:scale-[1.02] text-center"
                  >
                    +120 Min (2 Hr Lab)
                  </button>
                </div>
              </div>

              {/* End Time Picker */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-sky-300 font-mono flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> End Time (12-Hour):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Hour */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">Hour</span>
                    <select
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono font-bold outline-none focus:border-cyan-400 transition"
                    >
                      {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Minute */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">Minute</span>
                    <select
                      value={endMinute}
                      onChange={(e) => setEndMinute(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono font-bold outline-none focus:border-cyan-400 transition"
                    >
                      {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AM / PM Toggle */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 font-mono">AM / PM</span>
                    <div className="grid grid-cols-2 gap-1 h-full">
                      <button
                        type="button"
                        onClick={() => setEndAmPm("AM")}
                        className={`rounded-xl text-xs font-black font-mono transition py-2 ${
                          endAmPm === "AM"
                            ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                            : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndAmPm("PM")}
                        className={`rounded-xl text-xs font-black font-mono transition py-2 ${
                          endAmPm === "PM"
                            ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                            : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Card & Real-Time Sync Tag */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/30 flex flex-col gap-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-cyan-400" /> Formatted Slot Output
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Surveillance Sync Ready
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-cyan-300 font-mono tracking-tight">
                      {startHour}:{startMinute} {startAmPm} - {endHour}:{endMinute} {endAmPm}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      24h Clock: {to24Hour(startHour, startMinute, startAmPm)} - {to24Hour(endHour, endMinute, endAmPm)}
                    </span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-300 font-bold">
                    {(() => {
                      const s24 = to24Hour(startHour, startMinute, startAmPm);
                      const e24 = to24Hour(endHour, endMinute, endAmPm);
                      const [sh, sm] = s24.split(":").map(Number);
                      const [eh, em] = e24.split(":").map(Number);
                      const sTotal = sh * 60 + sm;
                      const eTotal = eh * 60 + em;
                      const diff = eTotal >= sTotal ? eTotal - sTotal : 1440 - sTotal + eTotal;
                      return `${diff} Min Duration`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Quick Standard Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "08:00 AM - 08:50 AM", sH: "08", sM: "00", sAP: "AM", eH: "08", eM: "50", eAP: "AM" },
                    { label: "09:00 AM - 09:50 AM", sH: "09", sM: "00", sAP: "AM", eH: "09", eM: "50", eAP: "AM" },
                    { label: "10:00 AM - 10:50 AM", sH: "10", sM: "00", sAP: "AM", eH: "10", eM: "50", eAP: "AM" },
                    { label: "11:00 AM - 11:50 AM", sH: "11", sM: "00", sAP: "AM", eH: "11", eM: "50", eAP: "AM" },
                    { label: "12:00 PM - 12:50 PM", sH: "12", sM: "00", sAP: "PM", eH: "12", eM: "50", eAP: "PM" },
                    { label: "01:00 PM - 01:50 PM", sH: "01", sM: "00", sAP: "PM", eH: "01", eM: "50", eAP: "PM" },
                    { label: "02:00 PM - 02:50 PM", sH: "02", sM: "00", sAP: "PM", eH: "02", eM: "50", eAP: "PM" },
                    { label: "03:00 PM - 03:50 PM", sH: "03", sM: "00", sAP: "PM", eH: "03", eM: "50", eAP: "PM" },
                    { label: "04:00 PM - 04:50 PM", sH: "04", sM: "00", sAP: "PM", eH: "04", eM: "50", eAP: "PM" },
                    { label: "05:00 PM - 05:50 PM", sH: "05", sM: "00", sAP: "PM", eH: "05", eM: "50", eAP: "PM" },
                    { label: "06:00 PM - 06:50 PM", sH: "06", sM: "00", sAP: "PM", eH: "06", eM: "50", eAP: "PM" },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPresetTime(p.sH, p.sM, p.sAP, p.eH, p.eM, p.eAP)}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition font-bold"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddTimeModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-neon-cyan"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add to Routine Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
