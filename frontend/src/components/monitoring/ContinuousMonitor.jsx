"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { drawFaceDetections } from "../../utils/faceDrawing";
import {
  Camera,
  RefreshCw,
  Eye,
  Edit3,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Sliders,
  Bell,
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
} from "lucide-react";

export function ContinuousMonitor() {
  const {
    activeRoomId,
    activeRoomName,
    threshold,
    isMirrored,
    selectedDeviceId,
    triggerAudio,
    triggerVoice,
    addToast,
    loadAlerts,
    loadAttendance,
    isLiveExamActive,
    activeSchedule,
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

  // Continuous monitoring metrics from backend
  const [monitoringData, setMonitoringData] = useState({
    total_candidates_inside: 0,
    present_active_count: 0,
    writing_head_down_count: 0,
    missing_count: 0,
    in_washroom_count: 0,
    unrecognized_faces_in_frame: 0,
    roster: [],
  });

  // Selected candidate for Movement / Absence History diary view
  const [selectedHistoryCandidate, setSelectedHistoryCandidate] = useState(null);

  // Absence Timeout & Sensitivity Settings
  const [absenceThresholdSec, setAbsenceThresholdSec] = useState(45);
  const [gateArrivalThresholdSec, setGateArrivalThresholdSec] = useState(300);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Missing candidates debounce tracker for voice
  const missingAnnouncedRef = useRef({});
  const fpsTracker = useRef({ count: 0, lastTime: performance.now() });

  // Load initial monitoring config
  useEffect(() => {
    api.getMonitoringConfig()
      .then((res) => {
        if (res.config?.absence_threshold_sec) {
          setAbsenceThresholdSec(res.config.absence_threshold_sec);
        }
        if (res.config?.gate_arrival_threshold_sec) {
          setGateArrivalThresholdSec(res.config.gate_arrival_threshold_sec);
        }
      })
      .catch((e) => console.warn("Error loading monitoring config:", e));
  }, []);

  // Save updated config
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await api.updateMonitoringConfig({
        absence_threshold_sec: Number(absenceThresholdSec),
        gate_arrival_threshold_sec: Number(gateArrivalThresholdSec),
        grace_period_sec: Math.max(8, Math.round(Number(absenceThresholdSec) * 0.25)),
      });
      addToast(
        `Updated: Gate Arrival = ${Math.round(gateArrivalThresholdSec / 60)}m, Desk Absence = ${absenceThresholdSec}s`,
        "success"
      );
      setShowConfigModal(false);
    } catch (e) {
      addToast(e.message || "Failed to update configuration", "error");
    } finally {
      setIsSavingConfig(false);
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
      setCameraError(err.message || "Failed to access exam hall camera feed");
      setIsCameraActive(false);
    }
  }, [selectedDeviceId]);

  // Process Continuous Monitoring Frame
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

      // Call Continuous Monitoring API
      const result = await api.processMonitoringFrame(b64Image, threshold, activeRoomId);
      const faces = result.faces || [];
      const latency = Math.round(performance.now() - startTime);

      setInferenceTime(latency);
      setFaceCount(faces.length);

      if (result.monitoring) {
        setMonitoringData(result.monitoring);

        // Check for new missing alerts to trigger Voice and Sound Alarm
        if (result.monitoring.new_alerts && result.monitoring.new_alerts.length > 0) {
          result.monitoring.new_alerts.forEach((alert) => {
            if (alert.type === "MISSING_CANDIDATE") {
              const candId = alert.candidate_id;
              const now = Date.now();
              const lastAnnounced = missingAnnouncedRef.current[candId] || 0;

              // Announce voice alert with cooldown
              if (now - lastAnnounced > 25000) {
                missingAnnouncedRef.current[candId] = now;
                triggerAudio("alert");
                if (voiceAlertsEnabled) {
                  triggerVoice(
                    `Security Alert! Candidate ${alert.name} has been missing from allocated seat for over ${absenceThresholdSec} seconds.`,
                    `missing-${candId}`,
                    15000
                  );
                }
                addToast(alert.message, "error");
                loadAlerts();
              }
            }
          });
        }
      }

      // Draw AI HUD overlays with Writing / Attentive posture flags
      drawFaceDetections(
        canvas,
        faces,
        isMirrored,
        captureCanvas.width,
        captureCanvas.height,
        true // isMonitoringMode
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
      console.warn("Monitoring loop error:", err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [activeRoomId, threshold, isMirrored, triggerAudio, triggerVoice, voiceAlertsEnabled, absenceThresholdSec, addToast, loadAlerts]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera]);

  useEffect(() => {
    let intervalId;
    if (isCameraActive) {
      // Run continuous exam surveillance at ~4 FPS
      intervalId = setInterval(processFrame, 250);
    }
    return () => clearInterval(intervalId);
  }, [isCameraActive, processFrame]);

  // Handle instant supervisor action on candidate (Washroom / Exit)
  const handleCandidateAction = async (candId, actionType, candName) => {
    try {
      await api.executeAttendanceAction({
        candidate_id: candId,
        action: actionType,
        active_room_id: activeRoomId,
      });
      addToast(`Marked ${actionType} for ${candName}`, "success");
      loadAttendance();
    } catch (e) {
      addToast(e.message || "Failed to update attendance action", "error");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* STANDBY NOTICE BANNER */}
      {!isLiveExamActive && (
        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-emerald-300 flex items-center gap-2">
                Camera in Standby Mode (Normal Feed)
                <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/40">
                  ALERTS MUTED
                </span>
              </span>
              <p className="text-[11px] text-slate-300">
                {activeSchedule
                  ? `Next Scheduled: "${activeSchedule.course_title}" (${activeSchedule.exam_date} ${activeSchedule.start_time}). Surveillance will automatically engage 30 minutes before exam time.`
                  : "No active exam scheduled right now. Camera functions normally with recognition only; security alarms and proxy penalties are disabled."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP SURVEILLANCE KPI BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Checked In */}
        <div className="glass-card p-3 flex flex-col gap-1 border-l-4 border-l-sky-500">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            Total Inside
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-sky-400">
              {monitoringData.total_candidates_inside}
            </span>
            <span className="text-[10px] text-slate-500">Students</span>
          </div>
        </div>

        {/* Present Active */}
        <div className="glass-card p-3 flex flex-col gap-1 border-l-4 border-l-emerald-500">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            Present Active
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {monitoringData.present_active_count}
            </span>
            <span className="text-[10px] text-emerald-500/80">In Seat</span>
          </div>
        </div>

        {/* Writing / Head Down at Desk */}
        <div className="glass-card p-3 flex flex-col gap-1 border-l-4 border-l-cyber-cyan bg-cyan-950/20">
          <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-cyber-cyan" />
            Writing (Head Down)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-cyber-cyan">
              {monitoringData.writing_head_down_count}
            </span>
            <span className="text-[10px] text-cyan-400/80">On Paper</span>
          </div>
        </div>

        {/* Missing / Left Hall Alert */}
        <div className={`glass-card p-3 flex flex-col gap-1 border-l-4 ${
          monitoringData.missing_count > 0 ? "border-l-rose-500 bg-rose-950/30 animate-pulse" : "border-l-slate-700"
        }`}>
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className={`w-3.5 h-3.5 ${monitoringData.missing_count > 0 ? "text-rose-400" : "text-slate-500"}`} />
            Missing Alerts
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-bold font-mono ${monitoringData.missing_count > 0 ? "text-rose-400 font-black" : "text-slate-400"}`}>
              {monitoringData.missing_count}
            </span>
            <span className="text-[10px] text-slate-500">&gt;{absenceThresholdSec}s away</span>
          </div>
        </div>

        {/* In Washroom */}
        <div className="glass-card p-3 flex flex-col gap-1 border-l-4 border-l-amber-500">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            In Washroom
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {monitoringData.in_washroom_count}
            </span>
            <span className="text-[10px] text-amber-500/80">On Break</span>
          </div>
        </div>

        {/* Controls & Sensitivity Button */}
        <div className="glass-card p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Surveillance Config</span>
            <button
              onClick={() => setVoiceAlertsEnabled(!voiceAlertsEnabled)}
              title={voiceAlertsEnabled ? "Voice Alerts On" : "Voice Alerts Off"}
              className={`p-1 rounded ${voiceAlertsEnabled ? "text-cyber-cyan bg-cyan-950/40" : "text-slate-500 bg-slate-800"}`}
            >
              {voiceAlertsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 transition border border-slate-700 hover:border-cyan-500/40"
            title="Configure Gate Arrival and Desk Absence Timeout Thresholds"
          >
            <Sliders className="w-3.5 h-3.5 text-cyber-cyan flex-shrink-0" />
            <span className="truncate">Gate: {Math.round(gateArrivalThresholdSec / 60)}m • Desk: {absenceThresholdSec}s</span>
          </button>
        </div>
      </div>

      {/* 2. DUAL PANEL: LIVE SURVEILLANCE FEED & CANDIDATE PRESENCE ROSTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT 7 COLS: LIVE CAMERA & HUD */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden glass-panel border-2 border-cyan-500/40 bg-slate-950 flex items-center justify-center shadow-2xl">
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

            {/* Cyan Surveillance HUD Scanner Grid */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-black/40" />

            {/* Camera Status Overlay */}
            {!isCameraActive && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
                <Camera className="w-12 h-12 text-slate-500 animate-bounce" />
                <h3 className="text-base font-bold text-white">Connecting Surveillance Camera Feed</h3>
                {cameraError ? (
                  <p className="text-xs text-rose-400 font-mono max-w-sm">{cameraError}</p>
                ) : (
                  <p className="text-xs text-slate-400">Initializing Exam Hall AI Detection Grid...</p>
                )}
                <button
                  onClick={startCamera}
                  className="mt-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:bg-cyan-400 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reconnect Feed
                </button>
              </div>
            )}

            {/* Top Viewport Header Tag */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/85 border border-cyan-500/50 text-[11px] font-mono text-slate-200 backdrop-blur-md">
              {isLiveExamActive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="font-bold text-rose-400">CONTINUOUS SURVEILLANCE</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-emerald-400">STANDBY • NORMAL CAMERA FEED</span>
                </>
              )}
              <span className="text-slate-500">•</span>
              <span className="text-cyan-400 font-semibold">{activeRoomName || "Exam Hall"}</span>
            </div>

            {/* Writing Detection Badge Indicator on Feed */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-700 text-[11px] font-mono text-cyan-300 backdrop-blur-md">
              <Edit3 className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Head-Down Writing AI: <strong className="text-emerald-400 font-bold">{isLiveExamActive ? "ON" : "STANDBY"}</strong></span>
            </div>
          </div>

          {/* Telemetry Bar Under Video */}
          <div className="w-full glass-card px-4 py-2 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyber-blue" />
              <span className="text-slate-400">Surveillance FPS:</span>
              <span className="font-bold text-sky-400">{fps}</span>
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

        {/* RIGHT 5 COLS: CANDIDATE PRESENCE & INTEGRITY ROSTER */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="glass-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyber-cyan" />
                <h3 className="text-sm font-bold text-white">Live Candidate Presence Registry</h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {monitoringData.roster.length} Checked In
              </span>
            </div>

            {/* Roster List */}
            <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
              {monitoringData.roster.length === 0 ? (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center gap-2 text-slate-500">
                  <UserCheck className="w-8 h-8 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">No candidates currently punched inside.</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    When students punch <strong className="text-emerald-400">ENTRY</strong> at the entrance, their real-time desk presence and writing status will be tracked here.
                  </p>
                </div>
              ) : (
                monitoringData.roster.map((cand) => {
                  const isMissing = cand.monitoring_status === "MISSING";
                  const isReturning = cand.monitoring_status === "RETURNING" || cand.is_verifying_return;
                  const isWriting = cand.monitoring_status === "WRITING" || cand.is_writing;
                  const isGrace = cand.monitoring_status === "GRACE_PERIOD";
                  const isWashroom = cand.monitoring_status === "WASHROOM";
                  const isExited = cand.monitoring_status === "EXITED";

                  let cardBorder = "border-slate-800 bg-slate-900/40";
                  let statusBadge = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
                  let statusText = "🟢 Present & Attentive";

                  if (isMissing) {
                    cardBorder = "border-rose-500/80 bg-rose-950/30 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse";
                    statusBadge = "bg-rose-500/30 text-rose-300 border-rose-500/80 font-bold";
                    statusText = `🚨 MISSING (${cand.last_seen_seconds_ago}s)`;
                  } else if (isReturning) {
                    cardBorder = "border-emerald-500/80 bg-emerald-950/20 shadow-[0_0_12px_rgba(16,185,129,0.25)] animate-pulse";
                    statusBadge = "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold";
                    statusText = `🟢 Verifying Return (${Math.round(cand.stable_seen_sec || 0)}s/5s)`;
                  } else if (isWriting) {
                    cardBorder = "border-sky-500/40 bg-sky-950/20";
                    statusBadge = "bg-sky-500/20 text-sky-300 border-sky-500/40";
                    statusText = "✍️ Writing (Head Down)";
                  } else if (isGrace) {
                    cardBorder = "border-amber-500/40 bg-amber-950/20";
                    statusBadge = "bg-amber-500/20 text-amber-300 border-amber-500/40";
                    statusText = `⏳ Away (${cand.last_seen_seconds_ago}s)`;
                  } else if (isWashroom) {
                    cardBorder = "border-purple-500/40 bg-purple-950/20";
                    statusBadge = "bg-purple-500/20 text-purple-300 border-purple-500/40";
                    statusText = "🚻 In Washroom";
                  } else if (isExited) {
                    cardBorder = "border-slate-800 opacity-60";
                    statusBadge = "bg-slate-800 text-slate-400 border-slate-700";
                    statusText = "🚪 Exited";
                  }

                  return (
                    <div
                      key={cand.candidate_id}
                      className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${cardBorder}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-white flex items-center gap-1.5">
                            {cand.name}
                            {isMissing && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 inline" />}
                          </span>
                          <span className="text-[11px] font-mono text-cyan-400">
                            ID: {cand.roll_id || "N/A"} • {cand.seat_number}
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge}`}>
                          {statusText}
                        </span>
                      </div>

                      {/* Presence Metrics Bar */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center gap-1">
                          <span>Presence:</span>
                          <strong className={cand.presence_percent > 70 ? "text-emerald-400" : "text-amber-400"}>
                            {cand.presence_percent}%
                          </strong>
                        </div>

                        <div className="flex items-center gap-1">
                          <span>Writing Rate:</span>
                          <strong className="text-cyan-400">{cand.writing_percent}%</strong>
                        </div>

                        <div className="flex items-center gap-1">
                          <span>Last Seen:</span>
                          <span className="text-slate-300">
                            {isReturning ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                                Verifying ({Math.round(cand.stable_seen_sec || 0)}s/5s)
                              </span>
                            ) : cand.last_seen_seconds_ago === 0 ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                Live
                              </span>
                            ) : (
                              `${cand.last_seen_seconds_ago}s ago`
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Movement History Summary & Diary Button */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Footprints className="w-3 h-3 text-cyan-400" />
                          <span>
                            Absences:{" "}
                            <strong
                              className={
                                cand.missing_events_count > 0
                                  ? "text-amber-400 font-bold"
                                  : "text-emerald-400"
                              }
                            >
                              {cand.missing_events_count || 0} event(s)
                            </strong>
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedHistoryCandidate(cand)}
                          className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 transition"
                          title="View In/Out Movement History Log"
                        >
                          <History className="w-3 h-3" /> Movement History (
                          {cand.movement_history?.length || 0})
                        </button>
                      </div>

                      {/* Quick Supervisor Actions if Missing or Active */}
                      {isMissing && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleCandidateAction(cand.candidate_id, "WASHROOM_OUT", cand.name)}
                            className="flex-1 py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] flex items-center justify-center gap-1 border border-amber-500/40"
                          >
                            <Clock className="w-3 h-3" /> Mark Washroom Break
                          </button>
                          <button
                            onClick={() => handleCandidateAction(cand.candidate_id, "EXIT", cand.name)}
                            className="flex-1 py-1 px-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold text-[10px] flex items-center justify-center gap-1 border border-purple-500/40"
                          >
                            <UserX className="w-3 h-3" /> Mark Exit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CANDIDATE MOVEMENT & ABSENCE TIMELINE MODAL */}
      {selectedHistoryCandidate && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 border border-cyan-500/40 flex flex-col gap-4 shadow-2xl max-h-[88vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Footprints className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span>{selectedHistoryCandidate.name}</span>
                    <span className="text-cyan-400 font-mono text-xs">
                      (ID: {selectedHistoryCandidate.roll_id || "N/A"})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Hall: <strong className="text-slate-300">{selectedHistoryCandidate.room_name}</strong> • Seat:{" "}
                    <strong className="text-amber-400">{selectedHistoryCandidate.seat_number}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHistoryCandidate(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary KPI Pills */}
            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-400 text-[11px]">Total Left Desk</span>
                <span
                  className={`text-lg font-bold ${
                    selectedHistoryCandidate.movement_history?.length > 0
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {selectedHistoryCandidate.movement_history?.length || 0} Times
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-400 text-[11px]">Total Away Time</span>
                <span className="text-lg font-bold text-cyan-400">
                  {Math.round((selectedHistoryCandidate.total_away_seconds || 0) / 60)}m (
                  {selectedHistoryCandidate.total_away_seconds || 0}s)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-0.5">
                <span className="text-slate-400 text-[11px]">Current Status</span>
                <span className="text-sm font-bold text-white truncate">
                  {selectedHistoryCandidate.monitoring_status === "MISSING"
                    ? "🚨 Away from Seat"
                    : selectedHistoryCandidate.monitoring_status === "WRITING"
                    ? "✍️ Writing"
                    : "🟢 At Desk"}
                </span>
              </div>
            </div>

            {/* Movements Table / Timeline */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[340px] pr-1">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Desk In / Out Movement Diary (Daily Session)
              </span>

              {!selectedHistoryCandidate.movement_history ||
              selectedHistoryCandidate.movement_history.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center gap-2 text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-300">
                    Perfect Continuous Presence!
                  </span>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Candidate has continuously stayed seated at their allocated desk throughout the
                    monitored exam window with 0 unrecorded absences.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-mono text-[11px] uppercase">
                        <th className="p-2.5"># Event</th>
                        <th className="p-2.5">Left Desk (Out Time)</th>
                        <th className="p-2.5">Returned to Desk</th>
                        <th className="p-2.5">Away Duration</th>
                        <th className="p-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/60 font-mono text-[11px]">
                      {selectedHistoryCandidate.movement_history.map((ev, idx) => {
                        const isOngoing = ev.status === "AWAY" || !ev.return_time;
                        return (
                          <tr
                            key={ev.event_id || idx}
                            className={isOngoing ? "bg-rose-950/20" : "hover:bg-slate-900/40"}
                          >
                            <td className="p-2.5 font-bold text-slate-400">#{idx + 1}</td>
                            <td className="p-2.5 text-rose-400 font-bold">{ev.out_time || "-"}</td>
                            <td className="p-2.5">
                              {isOngoing ? (
                                <span className="text-amber-400 font-bold animate-pulse">
                                  🚨 Currently Away...
                                </span>
                              ) : (
                                <span className="text-emerald-400 font-bold">{ev.return_time}</span>
                              )}
                            </td>
                            <td className="p-2.5 text-cyan-300 font-bold">
                              {ev.duration_formatted || `${ev.duration_sec || 0}s`}
                            </td>
                            <td className="p-2.5 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isOngoing
                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse"
                                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                }`}
                              >
                                {isOngoing ? "OUT OF SEAT" : "RETURNED"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedHistoryCandidate(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-5 border border-cyan-500/40 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Surveillance & Absence Thresholds</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Configure multi-stage absence detection rules</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              {/* Threshold 1: Gate-to-Desk Initial Arrival Window */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-[11px] font-mono border border-amber-500/40">
                      1
                    </span>
                    <span className="font-bold text-white text-xs">1st Entry: Gate-to-Desk Arrival Window</span>
                  </div>
                  <span className="text-amber-400 font-mono font-bold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                    {Math.floor(gateArrivalThresholdSec / 60)} Mins ({gateArrivalThresholdSec}s)
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  পরীক্ষার্থী গেটে এন্ট্রি নেওয়ার পর হলে প্রবেশ করে সিটে বসার জন্য নির্ধারিত সময়। এই সময়ের মধ্যে ক্যামেরায় না আসলে <strong>Delayed Arrival / Missing</strong> রেকর্ড হবে।
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="60"
                    max="900"
                    step="30"
                    value={gateArrivalThresholdSec}
                    onChange={(e) => setGateArrivalThresholdSec(Number(e.target.value))}
                    className="flex-1 accent-amber-400 cursor-pointer"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={Math.round(gateArrivalThresholdSec / 60)}
                      onChange={(e) => setGateArrivalThresholdSec(Math.max(60, Number(e.target.value) * 60))}
                      className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-mono text-white text-xs"
                    />
                    <span className="text-[11px] text-slate-400">Min</span>
                  </div>
                </div>
              </div>

              {/* Threshold 2: Subsequent Desk Departure Timeout */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-[11px] font-mono border border-cyan-500/40">
                      2
                    </span>
                    <span className="font-bold text-white text-xs">Seated Candidate: Desk Absence Timeout</span>
                  </div>
                  <span className="text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/30">
                    {absenceThresholdSec} Seconds
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  একবার ডেস্কে উপস্থিত হওয়ার পর পরীক্ষা চলাকালীন সিট ছাড়লে কত সেকেন্ডের বেশি অনুপস্থিত থাকলে আউট-টাইম রেকর্ড ও সিকিউরিটি অ্যালার্ট ট্রিগার হবে।
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="15"
                    max="180"
                    step="5"
                    value={absenceThresholdSec}
                    onChange={(e) => setAbsenceThresholdSec(Number(e.target.value))}
                    className="flex-1 accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={absenceThresholdSec}
                      onChange={(e) => setAbsenceThresholdSec(Math.max(10, Number(e.target.value)))}
                      className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-mono text-white text-xs"
                    />
                    <span className="text-[11px] text-slate-400">Sec</span>
                  </div>
                </div>
              </div>

              {/* Head Down Tolerance & Grace buffer info */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Head-Down Writing AI Tolerance</span>
                  <span className="text-[11px] text-slate-400">
                    খাতায় লেখার সময় মাথা নিচু থাকলে স্বয়ংক্রিয়ভাবে শনাক্ত করে উপস্থিতি চালু রাখে।
                  </span>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-neon-cyan disabled:opacity-50"
              >
                {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Save Thresholds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
