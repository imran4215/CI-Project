"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "../services/api";
import { playSound, speakVoice } from "../utils/audio";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Navigation
  const [activeTab, setActiveTab] = useState("attendance");

  // System Settings
  const [voiceAnnounce, setVoiceAnnounce] = useState(true);
  const [audioBeep, setAudioBeep] = useState(true);
  const [threshold, setThreshold] = useState(0.363);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [isMirrored, setIsMirrored] = useState(true);
  const [autoPunch, setAutoPunch] = useState(false);

  // Exam & Room Info
  const [examName, setExamName] = useState("Final Semester Examination 2026");
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState("room-202");
  const [activeRoomName, setActiveRoomName] = useState("Room 202 - CS & AI Lab");

  // Schedules & Timetable
  const [schedules, setSchedules] = useState([]);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [washroomLimitMinutes, setWashroomLimitMinutes] = useState(10);
  const [washroomActiveCandidates, setWashroomActiveCandidates] = useState([]);
  const washroomOvertimeWarningGiven = useRef({});

  // Active Recognition State
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [lastCandidateId, setLastCandidateId] = useState(null);
  const activeCandidateLockTime = useRef(0);
  const autoPunchTriggered = useRef(false);

  // Data Caches
  const [attendanceData, setAttendanceData] = useState({
    records: [],
    total_candidates: 0,
    present_inside: 0,
    in_washroom: 0,
    exited: 0,
    absent: 0,
    washroom_violations: 0,
  });
  const [allocations, setAllocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeSheetFilter, setActiveSheetFilter] = useState("ALL");
  const [selectedSheetRoom, setSelectedSheetRoom] = useState("");

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Play audio helper with context settings
  const triggerAudio = useCallback((type) => {
    playSound(type, audioBeep);
  }, [audioBeep]);

  const triggerVoice = useCallback((text, debounceKey = null, cooldownMs = 5000) => {
    speakVoice(text, debounceKey, cooldownMs, voiceAnnounce);
  }, [voiceAnnounce]);

  // Load Rooms
  const loadRooms = useCallback(async () => {
    try {
      const data = await api.getRooms();
      const loadedRooms = data.rooms || [];
      setRooms(loadedRooms);
      if (loadedRooms.length > 0) {
        if (!loadedRooms.find((r) => r.id === activeRoomId)) {
          setActiveRoomId(loadedRooms[0].id);
          setActiveRoomName(loadedRooms[0].name);
        } else {
          const curr = loadedRooms.find((r) => r.id === activeRoomId);
          if (curr) setActiveRoomName(curr.name);
        }
      }
    } catch (e) {
      console.error("Error loading rooms:", e);
    }
  }, [activeRoomId]);

  // Load Schedules
  const loadSchedules = useCallback(async () => {
    try {
      const data = await api.getSchedules();
      setSchedules(data.schedules || []);
    } catch (e) {
      console.error("Error loading schedules:", e);
    }
  }, []);

  // Load Allocations
  const loadAllocations = useCallback(async () => {
    try {
      const data = await api.getAllocations();
      setAllocations(data.allocations || []);
    } catch (e) {
      console.error("Error loading allocations:", e);
    }
  }, []);

  // Load Users (Candidate Bank)
  const loadUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers(data.users || []);
    } catch (e) {
      console.error("Error loading database users:", e);
    }
  }, []);

  // Load Alerts
  const loadAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data.alerts || []);
    } catch (e) {
      console.error("Error loading alerts:", e);
    }
  }, []);

  // Load Attendance Sheet
  const loadAttendance = useCallback(async () => {
    try {
      const data = await api.getAttendanceToday(selectedSheetRoom);
      setAttendanceData(data);
    } catch (e) {
      console.error("Error loading attendance:", e);
    }
  }, [selectedSheetRoom]);

  // Load Active Washroom
  const loadWashroomActive = useCallback(async () => {
    try {
      const data = await api.getActiveWashroom();
      setWashroomActiveCandidates(data.active_washroom_candidates || []);
    } catch (e) {
      console.error("Error loading washroom active:", e);
    }
  }, []);

  const [departments, setDepartments] = useState([]);

  // Load Departments & Courses
  const loadDepartments = useCallback(async () => {
    try {
      const data = await api.getDepartments();
      setDepartments(data.departments || []);
    } catch (e) {
      console.error("Error loading departments:", e);
    }
  }, []);

  // Initial Boot
  useEffect(() => {
    loadRooms();
    loadSchedules();
    loadDepartments();
    loadAllocations();
    loadUsers();
    loadAlerts();
    loadAttendance();
    loadWashroomActive();
  }, []);

  // Refresh Attendance & Washroom periodically
  useEffect(() => {
    const timer = setInterval(() => {
      loadWashroomActive();
    }, 2000);
    return () => clearInterval(timer);
  }, [loadWashroomActive]);

  const [isLiveExamActive, setIsLiveExamActive] = useState(false);

  // Helper to add/subtract minutes
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

  // Compute Active & Next Schedule for Active Room dynamically
  const evaluateActiveSchedule = useCallback(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const nowTimeStr = now.toTimeString().substring(0, 5);

    // Filter schedules relevant to this room or ALL halls
    const roomScheds = schedules.filter(
      (s) =>
        s.hall_ids?.includes(activeRoomId) ||
        s.hall_ids?.includes("ALL") ||
        !s.hall_ids ||
        s.hall_ids.length === 0
    );

    // 1. Today's schedules
    const todayScheds = roomScheds.filter((s) => s.date === todayStr);
    todayScheds.sort((a, b) => (a.start_time || "00:00").localeCompare(b.start_time || "00:00"));

    // Check if any schedule today is currently inside live window (start - 30m to end + 30m)
    for (const s of todayScheds) {
      const entryOpen = addMinutes(s.start_time || "09:00", -30);
      const exitClose = addMinutes(s.end_time || "12:00", 30);

      if (entryOpen <= nowTimeStr && nowTimeStr <= exitClose) {
        // LIVE EXAM ACTIVE!
        setActiveSchedule({
          ...s,
          is_live_active: true,
          entry_open_time: entryOpen,
          exit_close_time: exitClose,
        });
        setIsLiveExamActive(true);
        if (s.washroom_limit_minutes) setWashroomLimitMinutes(s.washroom_limit_minutes);
        if (s.title) setExamName(s.title);
        return;
      }
    }

    // 2. If NO exam is live right now: STANDBY MODE
    setIsLiveExamActive(false);

    // Look for next upcoming exam today
    const nextToday = todayScheds.find((s) => nowTimeStr < addMinutes(s.start_time || "09:00", -30));
    if (nextToday) {
      const entryOpen = addMinutes(nextToday.start_time || "09:00", -30);
      const exitClose = addMinutes(nextToday.end_time || "12:00", 30);
      setActiveSchedule({
        ...nextToday,
        is_live_active: false,
        entry_open_time: entryOpen,
        exit_close_time: exitClose,
      });
      if (nextToday.title) setExamName(nextToday.title);
      return;
    }

    // 3. Look for next future date schedule
    const futureScheds = roomScheds.filter((s) => s.date > todayStr);
    if (futureScheds.length > 0) {
      futureScheds.sort((a, b) =>
        (a.date + a.start_time).localeCompare(b.date + b.start_time)
      );
      const nextFut = futureScheds[0];
      const entryOpen = addMinutes(nextFut.start_time || "09:00", -30);
      const exitClose = addMinutes(nextFut.end_time || "12:00", 30);
      setActiveSchedule({
        ...nextFut,
        is_live_active: false,
        entry_open_time: entryOpen,
        exit_close_time: exitClose,
      });
      if (nextFut.title) setExamName(nextFut.title);
      return;
    }

    // 4. No schedules
    setActiveSchedule(null);
  }, [schedules, activeRoomId]);

  useEffect(() => {
    evaluateActiveSchedule();
    const interval = setInterval(evaluateActiveSchedule, 2000);
    return () => clearInterval(interval);
  }, [evaluateActiveSchedule]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        voiceAnnounce,
        setVoiceAnnounce,
        audioBeep,
        setAudioBeep,
        threshold,
        setThreshold,
        selectedDeviceId,
        setSelectedDeviceId,
        isMirrored,
        setIsMirrored,
        autoPunch,
        setAutoPunch,
        examName,
        setExamName,
        rooms,
        setRooms,
        activeRoomId,
        setActiveRoomId,
        activeRoomName,
        setActiveRoomName,
        schedules,
        activeSchedule,
        isLiveExamActive,
        washroomLimitMinutes,
        washroomActiveCandidates,
        activeCandidate,
        setActiveCandidate,
        lastCandidateId,
        setLastCandidateId,
        activeCandidateLockTime,
        autoPunchTriggered,
        attendanceData,
        allocations,
        users,
        alerts,
        activeSheetFilter,
        setActiveSheetFilter,
        selectedSheetRoom,
        setSelectedSheetRoom,
        toasts,
        addToast,
        triggerAudio,
        triggerVoice,
        departments,
        setDepartments,
        loadDepartments,
        loadRooms,
        loadSchedules,
        loadAllocations,
        loadUsers,
        loadAlerts,
        loadAttendance,
        loadWashroomActive,
        washroomOvertimeWarningGiven,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
