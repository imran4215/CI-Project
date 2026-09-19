"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
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

  // Rooms, Departments, Routines State
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("Computer Science & Engineering (CSE)");
  const [daysOfWeek] = useState(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [routines, setRoutines] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [customCourseCode, setCustomCourseCode] = useState("");
  const [customCourseName, setCustomCourseName] = useState("");

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
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState("ALL"); // ALL, PRESENT, STEPPED_OUT, ABSENT

  const fpsTracker = useRef({ count: 0, lastTime: performance.now() });

  // Auto-detect current day of week on mount
  useEffect(() => {
    const todayIndex = new Date().getDay();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (dayNames[todayIndex]) {
      setSelectedDay(dayNames[todayIndex]);
    }
  }, []);

  // Fetch Rooms & Departments
  useEffect(() => {
    api.getRooms().then((res) => {
      const rmList = res.rooms || [];
      setRooms(rmList);
      if (rmList.length > 0 && !selectedRoomId) {
        setSelectedRoomId(rmList[0].id);
      }
    }).catch((e) => console.warn("Error fetching rooms:", e));

    api.getDepartments().then((res) => {
      const dList = res.departments || [];
      setDepartments(dList);
      if (dList.length > 0 && !selectedDept) {
        setSelectedDept(dList[0].name);
      }
    }).catch((e) => console.warn("Error fetching depts:", e));
  }, []);

  // Fetch Routines for Selected Room & Day
  const loadRoutinesForSlot = useCallback(async () => {
    if (!selectedRoomId) return;
    try {
      const res = await api.getRoutines({ roomId: selectedRoomId, department: selectedDept, day: selectedDay });
      const rts = (res.routines || []).filter((r) => !r.is_gap);
      setRoutines(rts);
      if (rts.length > 0) {
        setSelectedRoutine(rts[0]);
        setCustomCourseCode(rts[0].course_code || "");
        setCustomCourseName(rts[0].course_name || "");
      } else {
        setSelectedRoutine(null);
        // Fallback default
        setCustomCourseCode("CSE-311");
        setCustomCourseName("Artificial Intelligence");
      }
    } catch (e) {
      console.warn("Error fetching routines:", e);
    }
  }, [selectedRoomId, selectedDept, selectedDay]);

  useEffect(() => {
    loadRoutinesForSlot();
  }, [loadRoutinesForSlot]);

  // Active active course identifiers
  const activeCourseCode = selectedRoutine ? selectedRoutine.course_code : (customCourseCode || "CSE-311");
  const activeCourseName = selectedRoutine ? selectedRoutine.course_name : (customCourseName || "Artificial Intelligence");
  const activeTimeSlot = selectedRoutine ? selectedRoutine.time_slot : "09:00 - 09:50";

  // Fetch initial classroom status
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

  // Reset current classroom session
  const handleResetSession = async () => {
    if (!confirm(`Are you sure you want to reset attendance for ${activeCourseCode} in this room?`)) return;
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
      addToast(`Classroom attendance session reset for ${activeCourseCode}`, "success");
      fetchClassroomStatus();
    } catch (e) {
      addToast("Failed to reset session", "error");
    }
  };

  // Camera start / stop
  const startCamera = async () => {
    try {
      setCameraError("");
      const constraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(err.message || "Failed to start camera. Check permissions.");
      setIsCameraActive(false);
    }
  };

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

  // Process live video frame loop
  useEffect(() => {
    let animationFrameId;

    const processLoop = async () => {
      if (
        !isCameraActive ||
        !videoRef.current ||
        !canvasRef.current ||
        videoRef.current.readyState < 2 ||
        isProcessingRef.current
      ) {
        animationFrameId = requestAnimationFrame(processLoop);
        return;
      }

      isProcessingRef.current = true;
      const startTime = performance.now();

      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageB64 = canvas.toDataURL("image/jpeg", 0.72);

        // Send frame to classroom surveillance endpoint
        const res = await api.processClassroomFrame({
          image: imageB64,
          room_id: selectedRoomId || "default_room",
          department: selectedDept || "Computer Science & Engineering (CSE)",
          course_code: activeCourseCode,
          course_name: activeCourseName,
          day: selectedDay,
          time_slot: activeTimeSlot,
          absence_threshold_sec: absenceThresholdSec,
          threshold: threshold || 0.363,
        });

        const elapsed = Math.round(performance.now() - startTime);
        setInferenceTime(elapsed);

        // Calculate FPS
        const now = performance.now();
        fpsTracker.current.count++;
        if (now - fpsTracker.current.lastTime >= 1000) {
          setFps(fpsTracker.current.count);
          fpsTracker.current.count = 0;
          fpsTracker.current.lastTime = now;
        }

        if (res.success && res.classroom) {
          setClassroomData({
            total_enrolled: res.classroom.total_enrolled || 0,
            present_count: res.classroom.present_count || 0,
            stepped_out_count: res.classroom.stepped_out_count || 0,
            absent_count: res.classroom.absent_count || 0,
            guest_count: res.classroom.guest_count || 0,
            roster: res.classroom.roster || [],
            event_logs: res.classroom.event_logs || [],
          });
          setFaceCount(res.faces_count || 0);

          // Draw custom Classroom Overlays
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (res.faces && res.faces.length > 0) {
            res.faces.forEach((face) => {
              const bbox = face.bbox;
              if (!bbox) return;

              let x = bbox[0];
              const y = bbox[1];
              const w = bbox[2] - bbox[0];
              const h = bbox[3] - bbox[1];

              if (isMirrored) {
                x = canvas.width - bbox[2];
              }

              const isEnrolled = face.is_enrolled;
              const isRecognized = face.is_recognized;
              const candName = face.name || "Student";
              const rollId = face.roll_id || "";

              let strokeColor = "#ef4444"; // Red (Unrecognized)
              let badgeBg = "rgba(239, 68, 68, 0.9)";
              let statusLabel = "UNREGISTERED";

              if (isRecognized && isEnrolled) {
                strokeColor = "#10b981"; // Emerald
                badgeBg = "rgba(16, 185, 129, 0.9)";
                statusLabel = "PRESENT (ENROLLED)";
              } else if (isRecognized && !isEnrolled) {
                strokeColor = "#f59e0b"; // Amber
                badgeBg = "rgba(245, 158, 11, 0.9)";
                statusLabel = "GUEST / OTHER DEPT";
              }

              // Bounding box
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, 8);
              ctx.stroke();

              // Top Name tag
              ctx.fillStyle = badgeBg;
              const tagText = isRecognized ? `${candName} ${rollId ? `(${rollId})` : ""}` : "UNKNOWN FACE";
              ctx.font = "bold 13px Inter, sans-serif";
              const textMetrics = ctx.measureText(tagText);
              const tagHeight = 22;
              const tagWidth = textMetrics.width + 16;

              ctx.beginPath();
              ctx.roundRect(x, y - tagHeight - 4 < 0 ? y : y - tagHeight - 4, tagWidth, tagHeight, 4);
              ctx.fill();

              ctx.fillStyle = "#ffffff";
              ctx.fillText(tagText, x + 8, (y - tagHeight - 4 < 0 ? y : y - tagHeight - 4) + 15);

              // Bottom Status tag
              ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
              ctx.font = "bold 11px Inter, sans-serif";
              const statusMetrics = ctx.measureText(statusLabel);
              const statusTagWidth = statusMetrics.width + 12;

              ctx.beginPath();
              ctx.roundRect(x, y + h + 4, statusTagWidth, 18, 4);
              ctx.fill();

              ctx.fillStyle = strokeColor;
              ctx.fillText(statusLabel, x + 6, y + h + 17);
            });
          }
        }
      } catch (err) {
        console.warn("Classroom frame processing error:", err);
      } finally {
        isProcessingRef.current = false;
        animationFrameId = requestAnimationFrame(processLoop);
      }
    };

    if (isCameraActive) {
      animationFrameId = requestAnimationFrame(processLoop);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [
    isCameraActive,
    selectedRoomId,
    selectedDept,
    activeCourseCode,
    activeCourseName,
    selectedDay,
    activeTimeSlot,
    absenceThresholdSec,
    threshold,
    isMirrored,
  ]);

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
    <div className="flex flex-col gap-4 p-4 min-h-[calc(100vh-140px)] bg-slate-950 text-slate-100 animate-fadeIn">
      {/* 1. TOP HEADER: Active Classroom Surveillance Session Config Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 border border-indigo-500/20 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-neon-indigo">
            <GraduationCap className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                Classroom AI Surveillance
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  Auto-Attendance
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Pure AI Camera Detection & Presence Monitoring</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-300 font-semibold">No Card Punch Required</span>
            </p>
          </div>
        </div>

        {/* Room, Dept, Day & Routine Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Room Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer pr-2"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer pr-2 max-w-[150px] truncate"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Departments</option>
              {departments.map((d) => (
                <option key={d.id || d.name} value={d.name} className="bg-slate-900 text-white">
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Day Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer pr-2"
            >
              {daysOfWeek.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-white">
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Active Routine Time Slot Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs shadow-inner">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            {routines.length > 0 ? (
              <select
                value={selectedRoutine?.id || ""}
                onChange={(e) => {
                  const match = routines.find((r) => r.id === e.target.value);
                  if (match) {
                    setSelectedRoutine(match);
                    setCustomCourseCode(match.course_code || "");
                    setCustomCourseName(match.course_name || "");
                  }
                }}
                className="bg-transparent text-indigo-200 font-bold outline-none cursor-pointer pr-2 max-w-[180px] truncate"
              >
                {routines.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                    {r.time_slot}: {r.course_code} - {r.course_name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Course Code"
                  value={customCourseCode}
                  onChange={(e) => setCustomCourseCode(e.target.value)}
                  className="bg-transparent text-indigo-300 font-bold w-20 outline-none text-xs"
                />
              </div>
            )}
          </div>

          {/* Reset Session Button */}
          <button
            onClick={handleResetSession}
            title="Reset today's class attendance session"
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => setShowConfigModal(true)}
            title="Absence & Detection Sensitivity"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. STATS SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Enrolled In Class</div>
              <div className="text-xl font-black text-white">{classroomData.total_enrolled}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
            {activeCourseCode}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-neon-green">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Present (In Seat)</div>
              <div className="text-xl font-black text-emerald-400">{classroomData.present_count}</div>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Footprints className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Stepped Out</div>
              <div className="text-xl font-black text-amber-400">{classroomData.stepped_out_count}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            &gt;{absenceThresholdSec}s away
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <UserX className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Absent / Not In</div>
              <div className="text-xl font-black text-rose-400">{classroomData.absent_count}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            {classroomData.total_enrolled > 0
              ? `${Math.round(((classroomData.present_count + classroomData.stepped_out_count) / classroomData.total_enrolled) * 100)}% Attend`
              : "0%"}
          </span>
        </div>
      </div>

      {/* 3. MAIN 3-COLUMN LAYOUT: Roster (Left) | Camera View (Center) | Live Events (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* LEFT COLUMN: ENROLLED STUDENT ROSTER (4 cols) */}
        <div className="lg:col-span-4 flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800/80 p-3.5 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                Enrolled Class Roster
              </h3>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {filteredRoster.length}
              </span>
            </div>

            {/* Status Filter Tabs */}
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
                  {tab === "ALL" ? "All" : tab === "PRESENT" ? "In" : tab === "STEPPED_OUT" ? "Out" : "Abs"}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="pt-2.5 pb-2">
            <input
              type="text"
              placeholder="Search enrolled student name or roll..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[520px]">
            {filteredRoster.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <Users className="w-8 h-8 opacity-40 text-slate-400" />
                <p>No enrolled students found for this course/filter.</p>
                <p className="text-[10px] text-slate-600">Assign students in Course Manager or pick another course.</p>
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

        {/* CENTER COLUMN: LIVE AI CAMERA STREAM & DETECTION CANVAS (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800/80 p-3.5 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-400" />
                Live Room Camera
              </h3>
              {isCameraActive && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {fps} FPS
              </span>
              <span className="text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {inferenceTime}ms
              </span>
              <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/30">
                {faceCount} Faces
              </span>
            </div>
          </div>

          {/* Camera Viewport */}
          <div className="relative flex-1 min-h-[360px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 my-2.5 flex items-center justify-center">
            {cameraError && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-slate-950/90 text-center">
                <AlertTriangle className="w-10 h-10 text-rose-500 mb-2" />
                <p className="text-sm font-bold text-white mb-1">Camera Initialization Error</p>
                <p className="text-xs text-rose-400 max-w-sm mb-4">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" /> Retry Access
                </button>
              </div>
            )}

            {!isCameraActive && !cameraError && (
              <div className="flex flex-col items-center justify-center text-center p-6 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-neon-indigo">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Classroom AI Vision Inactive</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Start live camera feed to automatically track enrolled student presence and absence duration.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs transition shadow-neon-indigo flex items-center gap-2 mt-1"
                >
                  <Camera className="w-4 h-4" /> Start Surveillance
                </button>
              </div>
            )}

            {/* Video & Canvas Stream */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${
                isMirrored ? "scale-x-[-1]" : ""
              } ${isCameraActive ? "opacity-100" : "opacity-0"}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full pointer-events-none ${
                isCameraActive ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Floating Top Indicator when camera is live */}
            {isCameraActive && (
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[10px] font-bold text-slate-200 flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {selectedRoomObj?.name || "Auditorium / Hall"} • {activeCourseCode}
                </div>
              </div>
            )}
          </div>

          {/* Camera Controls Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {isCameraActive ? (
                <button
                  onClick={stopCamera}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <Camera className="w-3.5 h-3.5" /> Stop Camera
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <Camera className="w-3.5 h-3.5" /> Start Camera
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Enrolled
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-1.5" /> Guest
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block ml-1.5" /> Unknown
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE MOVEMENT & ATTENDANCE EVENT DIARY (3 cols) */}
        <div className="lg:col-span-3 flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800/80 p-3.5 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-400" />
                Live Event Diary
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {classroomData.event_logs.length} Events
            </span>
          </div>

          <p className="text-[10px] text-slate-400 mt-2 mb-2">
            Real-time automated logging of entries, stepped-out durations, and returns during this class.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[520px]">
            {classroomData.event_logs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <Footprints className="w-8 h-8 opacity-40 text-slate-400" />
                <p>No presence events logged yet.</p>
                <p className="text-[10px] text-slate-600">Events appear when students enter or leave the camera view.</p>
              </div>
            ) : (
              classroomData.event_logs.map((ev, index) => {
                const isEntry = ev.type === "entry" || ev.event === "CLASS_ENTRY";
                const isOut = ev.type === "out" || ev.event === "STEPPED_OUT";
                const isReturn = ev.type === "return" || ev.event === "RETURNED";

                return (
                  <div
                    key={ev.id || index}
                    className={`p-2 rounded-xl border text-xs flex flex-col gap-1 transition ${
                      isEntry
                        ? "bg-emerald-950/20 border-emerald-500/20"
                        : isOut
                        ? "bg-amber-950/20 border-amber-500/20"
                        : "bg-indigo-950/20 border-indigo-500/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          isEntry
                            ? "bg-emerald-500/20 text-emerald-300"
                            : isOut
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-indigo-500/20 text-indigo-300"
                        }`}
                      >
                        {ev.event || ev.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{ev.time}</span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium leading-snug">
                      {ev.label || `${ev.name} ${ev.event}`}
                    </p>
                  </div>
                );
              })
            )}
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
