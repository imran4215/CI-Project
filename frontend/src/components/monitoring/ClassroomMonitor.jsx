"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { drawClassroomFaceDetections } from "../../utils/faceDrawing";
import {
  Camera,
  RefreshCw,
  Eye,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Sliders,
  Clock,
  UserCheck,
  UserX,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  Maximize2,
  History,
  Footprints,
  X,
  FileText,
  BookOpen,
  Calendar,
  Building2,
  GraduationCap,
  Users,
  RotateCcw,
  Sparkles,
  ArrowRightCircle,
  HelpCircle
} from "lucide-react";

export function ClassroomMonitor() {
  const {
    threshold,
    isMirrored,
    selectedDeviceId,
    triggerAudio,
    triggerVoice,
    addToast,
  } = useApp();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);

  const [fps, setFps] = useState(0);
  const [inferenceTime, setInferenceTime] = useState(0);
  const [faceCount, setFaceCount] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // Real-Time System Clock (Ticks every second)
  const [currentClockTime, setCurrentClockTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClockTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's Day of Week name (e.g. "Sunday", "Monday")
  const currentDayName = useMemo(() => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return dayNames[currentClockTime.getDay()] || "Sunday";
  }, [currentClockTime]);

  // Rooms, Departments, Routines State
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [routines, setRoutines] = useState([]);
  const [manualSelectedRoutineId, setManualSelectedRoutineId] = useState(""); // User manual override if chosen

  // Classroom Session Data from Backend
  const [classroomData, setClassroomData] = useState({
    total_enrolled: 0,
    present_count: 0,
    stepped_out_count: 0,
    absent_count: 0,
    guest_count: 0,
    roster: [],
    event_logs: [],
  });

  // Selected candidate for Movement / Absence History diary view
  const [selectedHistoryCandidate, setSelectedHistoryCandidate] = useState(null);

  // Absence Timeout & Sensitivity Settings
  const [absenceThresholdSec, setAbsenceThresholdSec] = useState(45);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState("ALL"); // ALL, PRESENT, STEPPED_OUT, ABSENT

  const fpsTracker = useRef({ count: 0, lastTime: performance.now() });

  // Fetch Rooms on Mount
  useEffect(() => {
    api.getRooms().then((res) => {
      const rmList = res.rooms || [];
      setRooms(rmList);
      if (rmList.length > 0 && !selectedRoomId) {
        setSelectedRoomId(rmList[0].id);
      }
    }).catch((e) => console.warn("Error fetching rooms:", e));
  }, []);

  // Fetch All Routines for Selected Room
  const loadRoutinesForRoom = useCallback(async () => {
    if (!selectedRoomId) return;
    try {
      const res = await api.getRoutines({ roomId: selectedRoomId });
      const rts = res.routines || [];
      setRoutines(rts);
    } catch (e) {
      console.warn("Error fetching routines for room:", e);
    }
  }, [selectedRoomId]);

  useEffect(() => {
    loadRoutinesForRoom();
  }, [loadRoutinesForRoom]);

  // Helper to parse time string (e.g. "09:00", "01:00 PM", "14:30") to total minutes from midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const str = timeStr.trim().toUpperCase();
    const isPm = str.includes("PM");
    const isAm = str.includes("AM");
    const cleanStr = str.replace(/(AM|PM)/g, "").trim();
    const parts = cleanStr.split(":");
    if (parts.length < 2) return null;
    let hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(mins)) return null;
    if (isPm && hours < 12) hours += 12;
    if (isAm && hours === 12) hours = 0;
    return hours * 60 + mins;
  };

  // Helper to parse routine time range into start and end minutes
  const parseSlotRange = (slotStr, routineObj) => {
    if (routineObj?.start_time && routineObj?.end_time) {
      const s = parseTimeToMinutes(routineObj.start_time);
      const e = parseTimeToMinutes(routineObj.end_time);
      if (s !== null && e !== null) return { startMins: s, endMins: e };
    }
    if (!slotStr) return null;
    const parts = slotStr.split("-");
    if (parts.length !== 2) return null;
    const s = parseTimeToMinutes(parts[0]);
    const e = parseTimeToMinutes(parts[1]);
    if (s === null || e === null) return null;
    return { startMins: s, endMins: e };
  };

  // Real-Time Routine Auto-Matcher (Matches today's day & current clock minutes)
  const matchedRealTimeRoutine = useMemo(() => {
    if (!routines || routines.length === 0) return null;

    const nowH = currentClockTime.getHours();
    const nowM = currentClockTime.getMinutes();
    const nowTotalMins = nowH * 60 + nowM;

    // Filter routines for today's weekday
    const todayRoutines = routines.filter(
      (r) => (r.day || "").toLowerCase() === currentDayName.toLowerCase()
    );

    for (const r of todayRoutines) {
      const range = parseSlotRange(r.time_slot, r);
      if (range) {
        if (nowTotalMins >= range.startMins && nowTotalMins <= range.endMins) {
          return r;
        }
      }
    }
    return null;
  }, [routines, currentClockTime, currentDayName]);

  // Next upcoming routine today for this room if currently between classes
  const upcomingRoutine = useMemo(() => {
    if (matchedRealTimeRoutine) return null;
    if (!routines || routines.length === 0) return null;

    const nowH = currentClockTime.getHours();
    const nowM = currentClockTime.getMinutes();
    const nowTotalMins = nowH * 60 + nowM;

    const todayRoutines = routines.filter(
      (r) => (r.day || "").toLowerCase() === currentDayName.toLowerCase() && !r.is_gap
    );

    let nextR = null;
    let minDiff = Infinity;

    for (const r of todayRoutines) {
      const range = parseSlotRange(r.time_slot, r);
      if (range && range.startMins > nowTotalMins) {
        const diff = range.startMins - nowTotalMins;
        if (diff < minDiff) {
          minDiff = diff;
          nextR = r;
        }
      }
    }
    return nextR;
  }, [routines, matchedRealTimeRoutine, currentClockTime, currentDayName]);

  // Active Effective Routine (Manual override if selected, otherwise automatic real-time matched routine, or first room routine)
  const activeEffectiveRoutine = useMemo(() => {
    if (manualSelectedRoutineId) {
      const manual = routines.find((r) => r.id === manualSelectedRoutineId);
      if (manual) return manual;
    }
    if (matchedRealTimeRoutine) return matchedRealTimeRoutine;
    if (upcomingRoutine) return upcomingRoutine;
    return routines.find((r) => !r.is_gap) || routines[0] || null;
  }, [manualSelectedRoutineId, matchedRealTimeRoutine, upcomingRoutine, routines]);

  // Active Course Identifiers
  const activeCourseCode = activeEffectiveRoutine?.course_code || "CSE-311";
  const activeCourseName = activeEffectiveRoutine?.course_name || "Academic Class";
  const activeTimeSlot = activeEffectiveRoutine?.time_slot || "09:00 AM - 09:50 AM";
  const isClassCurrentlyLive = !!matchedRealTimeRoutine && !matchedRealTimeRoutine.is_gap;
  const isGapOrBreak = !!matchedRealTimeRoutine?.is_gap;

  // Fetch classroom session status from backend
  const fetchClassroomStatus = useCallback(async () => {
    if (!selectedRoomId || !activeCourseCode) return;
    try {
      const res = await api.getClassroomStatus(selectedRoomId, activeCourseCode);
      if (res.success && res.is_active) {
        setClassroomData({
          total_enrolled: res.total_enrolled || 0,
          present_count: res.present_count || 0,
          stepped_out_count: res.stepped_out_count || 0,
          absent_count: res.absent_count || 0,
          guest_count: 0,
          roster: res.roster || [],
          event_logs: res.event_logs || [],
        });
      }
    } catch (e) {
      console.warn("Error fetching classroom status:", e);
    }
  }, [selectedRoomId, activeCourseCode]);

  useEffect(() => {
    fetchClassroomStatus();
  }, [fetchClassroomStatus]);

  // Reset current classroom session (Fresh testing count)
  const handleResetSession = async () => {
    try {
      await api.resetClassroomSession(selectedRoomId, activeCourseCode);
      setClassroomData({
        total_enrolled: 0,
        present_count: 0,
        stepped_out_count: 0,
        absent_count: 0,
        guest_count: 0,
        roster: [],
        event_logs: [],
      });
      addToast(`🔄 Attendance reset to 0 for ${activeCourseCode}! Ready for fresh detection.`, "success");
      fetchClassroomStatus();
    } catch (e) {
      addToast("Failed to reset session", "error");
    }
  };

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError("");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsCameraActive(true);
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(err.message || "Failed to access classroom camera feed");
      setIsCameraActive(false);
    }
  }, [selectedDeviceId]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Process live video frame loop (Smooth ~4 FPS with offscreen snapshot)
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessingRef.current) return;
    if (videoRef.current.readyState < 2) return;

    isProcessingRef.current = true;
    const startTime = performance.now();

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      // Snapshot to offscreen canvas
      const captureCanvas = document.createElement("canvas");
      captureCanvas.width = 640;
      captureCanvas.height = Math.round((video.videoHeight / video.videoWidth) * 640) || 480;
      const ctx = captureCanvas.getContext("2d");
      ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
      const b64Image = captureCanvas.toDataURL("image/jpeg", 0.7);

      // Call Classroom Monitoring API
      const result = await api.processClassroomFrame({
        image: b64Image,
        room_id: selectedRoomId || "room-101",
        department: activeEffectiveRoutine?.department || "ALL",
        course_code: activeCourseCode,
        course_name: activeCourseName,
        day: currentDayName,
        time_slot: activeTimeSlot,
        absence_threshold_sec: absenceThresholdSec,
        threshold: threshold || 0.45,
      });

      const faces = result.faces || [];
      const latency = Math.round(performance.now() - startTime);

      setInferenceTime(latency);
      setFaceCount(faces.length);

      if (result.classroom) {
        setClassroomData({
          total_enrolled: result.classroom.total_enrolled || 0,
          present_count: result.classroom.present_count || 0,
          stepped_out_count: result.classroom.stepped_out_count || 0,
          absent_count: result.classroom.absent_count || 0,
          guest_count: result.classroom.guest_count || 0,
          roster: result.classroom.roster || [],
          event_logs: result.classroom.event_logs || [],
        });
      }

      // Draw high-FPS Cyber HUD overlays
      drawClassroomFaceDetections(
        canvas,
        faces,
        isMirrored,
        captureCanvas.width,
        captureCanvas.height
      );

      // Telemetry FPS
      fpsTracker.current.count++;
      const now = performance.now();
      if (now - fpsTracker.current.lastTime >= 1000) {
        setFps(Math.round((fpsTracker.current.count * 1000) / (now - fpsTracker.current.lastTime)));
        fpsTracker.current.count = 0;
        fpsTracker.current.lastTime = now;
      }
    } catch (err) {
      console.warn("Classroom monitoring loop error:", err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [
    selectedRoomId,
    activeEffectiveRoutine,
    activeCourseCode,
    activeCourseName,
    currentDayName,
    activeTimeSlot,
    absenceThresholdSec,
    threshold,
    isMirrored,
  ]);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  // Run steady loop
  useEffect(() => {
    let intervalId;
    if (isCameraActive) {
      intervalId = setInterval(processFrame, 250);
    }
    return () => clearInterval(intervalId);
  }, [isCameraActive, processFrame]);

  // Filtered Roster
  const filteredRoster = classroomData.roster.filter((candidate) => {
    const matchesSearch =
      candidate.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
      candidate.roll_id?.toLowerCase().includes(filterSearch.toLowerCase()) ||
      candidate.department?.toLowerCase().includes(filterSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (rosterFilter === "ALL") return true;
    return candidate.status === rosterFilter;
  });

  const selectedRoomObj = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="flex flex-col gap-4">
      {/* 0. CLASSROOM SELECTOR & REAL-TIME ROUTINE SYNC BAR */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/40 border border-indigo-500/30 shadow-xl flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
        {/* Left: Classroom Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-neon-indigo flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider flex items-center gap-1">
              Select Monitored Classroom:
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value);
                  setManualSelectedRoutineId("");
                }}
                className="bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs text-white font-bold font-mono outline-none focus:border-cyan-400 transition cursor-pointer shadow-inner pr-8"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white font-mono">
                    {r.name} {r.capacity ? `(${r.capacity} Seats)` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Center: Live Clock & Real-Time Routine Status Badge */}
        <div className="flex flex-col items-start">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-bold bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {currentDayName}, {currentClockTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>

            {isClassCurrentlyLive ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Class: {activeCourseCode} • {activeTimeSlot}
              </span>
            ) : isGapOrBreak ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                ☕ Recess / Free Interval • {activeTimeSlot}
              </span>
            ) : upcomingRoutine ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                ⏳ Next Up: {upcomingRoutine.course_code} ({upcomingRoutine.time_slot})
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700">
                ⚪ Camera Standby
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono mt-1 truncate max-w-md">
            {activeEffectiveRoutine ? (
              <span>
                <strong className="text-white font-semibold">{activeCourseName}</strong>
                {activeEffectiveRoutine.instructor ? ` • Instructor: ${activeEffectiveRoutine.instructor}` : ""}
                {activeEffectiveRoutine.section ? ` (${activeEffectiveRoutine.section})` : ""}
              </span>
            ) : (
              "No routine slots configured for this room yet."
            )}
          </div>
        </div>

        {/* Right: Quick Routine Slot Selector / Override */}
        <div className="flex items-center gap-2">
          {routines.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs">
              <span className="text-[10px] text-slate-400 font-mono hidden md:inline">Slot:</span>
              <select
                value={activeEffectiveRoutine?.id || ""}
                onChange={(e) => setManualSelectedRoutineId(e.target.value)}
                className="bg-transparent text-indigo-300 font-bold font-mono outline-none text-xs cursor-pointer max-w-[170px] truncate"
                title="Manually override or pick class slot"
              >
                {matchedRealTimeRoutine && (
                  <option value={matchedRealTimeRoutine.id} className="bg-slate-900 text-emerald-300 font-bold">
                    ⚡ Auto Live: {matchedRealTimeRoutine.time_slot} ({matchedRealTimeRoutine.course_code})
                  </option>
                )}
                {routines.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.day} • {r.time_slot} • {r.course_code}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 1. TOP SURVEILLANCE KPI BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Enrolled In Class */}
        <div className="glass-card p-3 flex flex-col gap-1 border-l-4 border-l-indigo-500">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Enrolled In Class
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-indigo-400">
              {classroomData.total_enrolled}
            </span>
            <span className="text-[10px] text-slate-500">Students</span>
          </div>
        </div>

        {/* Present (In Seat) */}
        <div className="glass-card p-3 flex flex-col gap-1 border-l-4 border-l-emerald-500">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            Present (In Seat)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {classroomData.present_count}
            </span>
            <span className="text-[10px] text-emerald-500/80">Active</span>
          </div>
        </div>

        {/* Stepped Out */}
        <div className={`glass-card p-3 flex flex-col gap-1 border-l-4 ${
          classroomData.stepped_out_count > 0 ? "border-l-amber-500 bg-amber-950/20 animate-pulse" : "border-l-slate-700"
        }`}>
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-amber-400" />
            Stepped Out
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {classroomData.stepped_out_count}
            </span>
            <span className="text-[10px] text-amber-500/80">&gt;{absenceThresholdSec}s away</span>
          </div>
        </div>

        {/* Absent / Not In */}
        <div className="glass-card p-3 flex flex-col gap-1 border-l-4 border-l-rose-500">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            Absent / Not In
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-rose-400">
              {classroomData.absent_count}
            </span>
            <span className="text-[10px] text-slate-500">Missing</span>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="glass-card p-3 flex flex-col gap-1 border-l-4 border-l-cyan-500">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Attendance Rate
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-cyan-300">
              {classroomData.total_enrolled > 0
                ? `${Math.round(((classroomData.present_count + classroomData.stepped_out_count) / classroomData.total_enrolled) * 100)}%`
                : "0%"}
            </span>
            <span className="text-[10px] text-cyan-500/80">{activeCourseCode}</span>
          </div>
        </div>

        {/* Surveillance Settings & Reset */}
        <div className="glass-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Class Config</span>
            <button
              onClick={handleResetSession}
              title="Reset class session attendance"
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition border border-slate-700 hover:border-indigo-500/40"
            title="Configure Classroom Absence Timeout and Sensitivity"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span className="truncate">Absence: {absenceThresholdSec}s</span>
          </button>
        </div>
      </div>

      {/* 2. DUAL PANEL: LIVE SURVEILLANCE FEED & STUDENT PRESENCE ROSTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT 7 COLS: LIVE CAMERA & HUD */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden glass-panel border-2 border-indigo-500/40 bg-slate-950 flex items-center justify-center shadow-2xl">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${isMirrored ? "-scale-x-100" : ""}`}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

            {/* Indigo Surveillance HUD Scanner Grid */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-black/40" />

            {/* Camera Status Overlay */}
            {!isCameraActive && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
                <Camera className="w-12 h-12 text-slate-500 animate-bounce" />
                <h3 className="text-base font-bold text-white">Connecting Classroom Surveillance Camera</h3>
                {cameraError ? (
                  <p className="text-xs text-rose-400 font-mono max-w-sm">{cameraError}</p>
                ) : (
                  <p className="text-xs text-slate-400">Initializing Classroom AI Face Recognition & Attendance Grid...</p>
                )}
                <button
                  onClick={startCamera}
                  className="mt-2 px-4 py-2 rounded-lg bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 hover:bg-indigo-400 transition shadow-neon-indigo"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Start Classroom Camera
                </button>
              </div>
            )}

            {/* Top Viewport Header Tag */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/85 border border-indigo-500/50 text-[11px] font-mono text-slate-200 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-emerald-400">CLASSROOM SURVEILLANCE</span>
              <span className="text-slate-500">•</span>
              <span className="text-indigo-300 font-semibold">{selectedRoomObj?.name || "Room 101"}</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 font-semibold">{activeCourseCode}</span>
            </div>

            {/* Auto Attendance Mode Badge */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-700 text-[11px] font-mono text-indigo-300 backdrop-blur-md">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Auto-Attendance: <strong className="text-emerald-400 font-bold">ACTIVE</strong></span>
            </div>
          </div>

          {/* Telemetry Bar Under Video */}
          <div className="w-full glass-card px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Surveillance FPS:</span>
              <span className="font-bold text-indigo-400">{fps}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Latency:</span>
              <span className="font-bold text-emerald-400">{inferenceTime} ms</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Faces in View:</span>
              <span className="font-bold text-amber-400">{faceCount}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Absence Rule:</span>
              <span className="font-bold text-rose-400">&gt;{absenceThresholdSec}s</span>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: STUDENT PRESENCE REGISTRY & LIVE EVENT DIARY */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="glass-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Live Student Presence Registry
                  </h3>
                  <span className="text-[11px] text-indigo-300 font-mono font-bold">
                    {activeCourseCode} • {activeCourseName}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSession}
                  className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold transition flex items-center gap-1.5 shadow-sm hover:scale-[1.02]"
                  title="Reset attendance session count (Fresh Count for Testing)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  Reset Count
                </button>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold">
                    {filteredRoster.length} Students
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {selectedRoomObj?.name || "Room"}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  {["ALL", "PRESENT", "STEPPED_OUT", "ABSENT"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setRosterFilter(tab)}
                      className={`px-2 py-0.5 rounded font-bold transition ${
                        rosterFilter === tab
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab === "ALL" ? "All" : tab === "PRESENT" ? "In Seat" : tab === "STEPPED_OUT" ? "Away" : "Absent"}
                    </button>
                  ))}
                </div>

                <span className="text-[10px] font-mono text-indigo-400">
                  {activeTimeSlot}
                </span>
              </div>

              <input
                type="text"
                placeholder="Search student name or roll..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Student Presence List */}
            <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredRoster.length === 0 ? (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-2 text-slate-500">
                  <Users className="w-8 h-8 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">No students detected in this filter.</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Students detected by the classroom camera will automatically appear here with real-time presence status.
                  </p>
                </div>
              ) : (
                filteredRoster.map((candidate) => {
                  const isPresent = candidate.status === "PRESENT";
                  const isSteppedOut = candidate.status === "STEPPED_OUT";
                  const isAbsent = candidate.status === "ABSENT";

                  return (
                    <div
                      key={candidate.id}
                      onClick={() => setSelectedHistoryCandidate(candidate)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 hover:translate-x-0.5 ${
                        isPresent
                          ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60"
                          : isSteppedOut
                          ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60 animate-pulse"
                          : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isPresent
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : isSteppedOut
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {candidate.name?.substring(0, 2).toUpperCase() || "ST"}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            {candidate.name}
                            {candidate.roll_id && (
                              <span className="text-[10px] font-mono text-slate-400">
                                #{candidate.roll_id}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            {isPresent && (
                              <span className="text-emerald-400 font-medium">
                                In at {candidate.first_detected_time} ({Math.round((candidate.in_class_seconds || 0) / 60)}m in class)
                              </span>
                            )}
                            {isSteppedOut && (
                              <span className="text-amber-400 font-medium">
                                Left at {candidate.stepped_out_time} (Away: {candidate.stepped_out_duration_sec || 0}s)
                              </span>
                            )}
                            {isAbsent && (
                              <span className="text-slate-500">Not detected yet</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                            isPresent
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : isSteppedOut
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {candidate.status}
                        </span>
                        <span className="text-[9px] text-indigo-400 hover:underline mt-1 flex items-center gap-0.5">
                          <History className="w-2.5 h-2.5" /> Log
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. CANDIDATE MOVEMENT HISTORY MODAL */}
      {selectedHistoryCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-sm">
                  {selectedHistoryCandidate.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    {selectedHistoryCandidate.name}
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        selectedHistoryCandidate.status === "PRESENT"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : selectedHistoryCandidate.status === "STEPPED_OUT"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      }`}
                    >
                      {selectedHistoryCandidate.status}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Roll: #{selectedHistoryCandidate.roll_id || "N/A"} • {selectedHistoryCandidate.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryCandidate(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">First In-Class Entry</span>
                  <span className="font-bold text-emerald-400 font-mono text-xs">
                    {selectedHistoryCandidate.first_detected_time || "Not yet"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Total In-Class Time</span>
                  <span className="font-bold text-indigo-400 font-mono text-xs">
                    {Math.round((selectedHistoryCandidate.in_class_seconds || 0) / 60)} Minutes
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-amber-400" />
                  Presence & Stepped-Out Timeline
                </h4>

                {(!selectedHistoryCandidate.movement_history || selectedHistoryCandidate.movement_history.length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No movement events logged for this student yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedHistoryCandidate.movement_history.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.type === "entry"
                                ? "bg-emerald-400"
                                : item.type === "out"
                                ? "bg-amber-400"
                                : "bg-cyan-400"
                            }`}
                          />
                          <span className="text-slate-200">{item.label}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{item.time}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedHistoryCandidate(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Close Diary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SENSITIVITY & ABSENCE CONFIG MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Classroom Absence Sensitivity
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Stepped-Out Departure Timeout
                  </label>
                  <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                    {absenceThresholdSec} Seconds
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="180"
                  step="5"
                  value={absenceThresholdSec}
                  onChange={(e) => setAbsenceThresholdSec(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  How many seconds a student can be away from camera before status turns to &apos;STEPPED_OUT&apos;.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-neon-indigo"
              >
                Apply Sensitivity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
