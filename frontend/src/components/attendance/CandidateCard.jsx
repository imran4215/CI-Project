"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import { SignatureModal } from "./SignatureModal";
import {
  UserCheck,
  Scan,
  AlertOctagon,
  Building2,
  ClockAlert,
  AlertCircle,
  AlertTriangle,
  MapPin,
  Armchair,
  CheckCircle2,
  LogIn,
  LogOut,
  Bath,
  DoorOpen,
  ShieldAlert,
  ArrowRightLeft,
  UserPlus,
  PenTool,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export function CandidateCard({
  detectedCandidate,
  onPunchCompleted,
  isLocked = false,
  onLockScanner,
  onResetScanner,
}) {
  const {
    activeRoomId,
    activeRoomName,
    examName,
    activeSchedule,
    washroomLimitMinutes,
    addToast,
    triggerAudio,
    triggerVoice,
    loadAllocations,
    loadAttendance,
    loadAlerts,
    loadWashroomActive,
    setActiveTab,
  } = useApp();

  const [loadingAction, setLoadingAction] = useState(false);
  const [isFaceManuallyVerified, setIsFaceManuallyVerified] = useState(false);
  const [signatureData, setSignatureData] = useState({ hasSignature: false, dataUrl: null });
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Sync manual verification with locked state
  useEffect(() => {
    if (!isLocked) {
      setIsFaceManuallyVerified(false);
    }
  }, [isLocked]);

  // Reset steps whenever detected candidate changes
  useEffect(() => {
    if (!isLocked) {
      setIsFaceManuallyVerified(false);
      setSignatureData({ hasSignature: false, dataUrl: null });
      setIsSignatureModalOpen(false);
    }
  }, [detectedCandidate?.id, isLocked]);

  // Execute Attendance Action (ENTRY, WASHROOM_OUT, WASHROOM_IN, EXIT)
  const handleAction = async (actionType, overrideAdmit = false, overrideSchedule = false) => {
    if (!detectedCandidate || loadingAction) return;

    if (actionType === "ENTRY" && !signatureData.hasSignature) {
      triggerAudio("warning");
      triggerVoice(`Digital signature required. Please sign using the graphics tablet.`);
      addToast("✍️ Digital signature required before confirming entry!", "warning");
      return;
    }

    setLoadingAction(true);
    try {
      const res = await api.executeAttendanceAction({
        candidate_id: detectedCandidate.id,
        action: actionType,
        active_room_id: activeRoomId,
        image: detectedCandidate.liveSnapshot,
        signature: actionType === "ENTRY" ? signatureData.dataUrl : undefined,
        exam_name: examName,
        hall_name: activeRoomName,
        override_admit: overrideAdmit,
        override_schedule: overrideSchedule,
      });

      if (actionType === "ENTRY") {
        triggerAudio("success");
        triggerVoice(`Entry and signature confirmed for ${detectedCandidate.name}. Welcome to the exam hall.`);
        addToast(`✅ Entry & Signature Confirmed: ${detectedCandidate.name} (${res.record?.entry_time})`, "success");
      } else if (actionType === "WASHROOM_OUT") {
        triggerAudio("warning");
        const limit = activeSchedule?.washroom_limit_minutes || washroomLimitMinutes || 10;
        triggerVoice(`Washroom break recorded for ${detectedCandidate.name}. Time limit is ${limit} minutes.`);
        addToast(`🚻 Washroom Break (Out): ${detectedCandidate.name} (${res.record?.washroom_out_time})`, "warning");
      } else if (actionType === "WASHROOM_IN") {
        const lastBreak = res.record?.last_break;
        if (lastBreak?.is_overtime) {
          triggerAudio("alert");
          triggerVoice(`Warning! Washroom time limit exceeded. Candidate ${detectedCandidate.name} returned ${lastBreak.overtime_minutes} minutes late.`);
          addToast(`⚠️ OVERTIME VIOLATION: ${detectedCandidate.name} spent ${lastBreak.duration_minutes}m (Limit: ${lastBreak.limit_minutes}m)!`, "error");
        } else {
          triggerAudio("success");
          triggerVoice(`Welcome back to the exam hall, ${detectedCandidate.name}.`);
          addToast(`🟢 Washroom Return (In): ${detectedCandidate.name} (${lastBreak?.duration_minutes || 0}m spent)`, "success");
        }
      } else if (actionType === "EXIT") {
        triggerAudio("warning");
        triggerVoice(`Exit confirmed for ${detectedCandidate.name}. Exam submitted.`);
        addToast(`🚪 Exit Confirmed: ${detectedCandidate.name} (${res.record?.exit_time})`, "warning");
      }

      await loadAttendance();
      await loadAlerts();
      await loadWashroomActive();
      if (onPunchCompleted) onPunchCompleted(detectedCandidate.name, actionType);
    } catch (err) {
      addToast(`Error: ${err.message}`, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Grant Special Clearance
  const handleSpecialClearance = async () => {
    if (!detectedCandidate) return;
    try {
      await api.clearAdmitCard({
        candidate_id: detectedCandidate.id,
        admit_status: "CLEARED",
        special_clearance_by: "Hall In-Charge",
        remarks: "Special Clearance Granted at Entrance",
      });
      addToast(`Special clearance granted to ${detectedCandidate.name}`, "success");
      await loadAllocations();
      await handleAction("ENTRY", true);
    } catch (e) {
      addToast(`Clearance failed: ${e.message}`, "error");
    }
  };

  // Log Proxy Security Alert
  const handleLogProxy = async () => {
    if (!detectedCandidate) return;
    try {
      await api.logProxyAlert({
        image: detectedCandidate.liveSnapshot,
        confidence: detectedCandidate.detConfidence || 0.9,
        notes: `Unregistered face at ${activeRoomName}`,
      });
      addToast("Security violation recorded in audit logs.", "warning");
      await loadAlerts();
    } catch (e) {
      addToast(`Failed to log alert: ${e.message}`, "error");
    }
  };

  // 1. Idle State
  if (!detectedCandidate) {
    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[460px] border-sky-500/20">
        <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-radar shadow-neon-cyan">
          <Scan className="w-8 h-8 text-cyber-cyan" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Waiting for Candidate</h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Candidate faces the camera. The system will verify identity, room allocation, department schedule, and washroom limits.
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-400">
          Scanning Live Feed...
        </div>
      </div>
    );
  }

  const { isRecognized, attStatus, name, rollId, department, confidencePercent, registeredPhoto, liveSnapshot, allocation, attendanceRecord } = detectedCandidate;

  // 2. Unauthorized / Proxy Alert State
  if (!isRecognized) {
    return (
      <div className="glass-panel p-6 flex flex-col gap-4 min-h-[460px] border-rose-500/40 bg-rose-950/20">
        <div className="flex items-center justify-between pb-3 border-b border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-sm">SECURITY ALERT</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/30 text-rose-300 border border-rose-500/50">
            UNAUTHORIZED FACE
          </span>
        </div>

        <div className="flex flex-col items-center text-center gap-3 my-auto">
          {liveSnapshot && (
            <img src={liveSnapshot} alt="Unregistered Face" className="w-28 h-28 rounded-xl object-cover border-2 border-rose-500/50 shadow-neon-rose" />
          )}
          <div>
            <h4 className="text-base font-extrabold text-white">Unregistered Face Detected</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              This face does not match any registered candidate in the university database.
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-rose-500/30">
          <button onClick={handleLogProxy} className="flex-1 py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition">
            <ShieldAlert className="w-4 h-4" /> Log Security Violation
          </button>
          <button onClick={() => setActiveTab("register")} className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition border border-slate-700">
            <UserPlus className="w-4 h-4" /> Register
          </button>
        </div>
      </div>
    );
  }

  // 1.5. Standby Mode (No Live Exam Running - Camera functions as normal camera)
  if (attStatus === "STANDBY_NO_EXAM" || detectedCandidate.isStandby) {
    return (
      <div className="glass-panel p-6 flex flex-col gap-4 min-h-[460px] border-emerald-500/30 bg-emerald-950/10">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400">
            <UserCheck className="w-5 h-5" />
            <h3 className="font-bold text-sm">STANDBY MODE • CAMERA LIVE</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            STANDBY
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 my-auto">
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered</span>
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
              {registeredPhoto ? (
                <img src={registeredPhoto} alt="Registered" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No Photo</div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-emerald-400">
            <ArrowRightLeft className="w-4 h-4" />
            <span className="text-[11px] font-extrabold font-mono">{confidencePercent || 96}%</span>
          </div>

          <div className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Camera</span>
            <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-emerald-400 shadow-neon-emerald bg-slate-950">
              {liveSnapshot && <img src={liveSnapshot} alt="Live" className="w-full h-full object-cover" />}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-black text-white">{name}</h3>
            <span className="text-xs font-mono font-bold text-emerald-400">ROLL: {rollId || "N/A"}</span>
          </div>
          <span className="text-xs text-slate-400">Department: {department || "N/A"}</span>
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            {detectedCandidate.remarks || "No active exam session right now. Face recognized successfully in normal camera mode."}
          </div>
        </div>
      </div>
    );
  }

  // 3. Wrong Room Alert
  if (attStatus === "WRONG_ROOM") {
    return (
      <div className="glass-panel p-6 flex flex-col gap-4 min-h-[460px] border-rose-500/40 bg-rose-950/20">
        <div className="flex items-center justify-between pb-3 border-b border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertOctagon className="w-5 h-5" />
            <h3 className="font-bold text-sm">WRONG EXAM ROOM</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/30 text-rose-300 border border-rose-500/50">
            WRONG ROOM
          </span>
        </div>

        <div className="flex flex-col gap-4 my-auto">
          <div className="flex items-center gap-3">
            {liveSnapshot && <img src={liveSnapshot} alt="Candidate" className="w-16 h-16 rounded-lg object-cover border border-rose-500/40" />}
            <div>
              <h4 className="text-base font-extrabold text-white">{name}</h4>
              <p className="text-xs font-mono text-slate-400">ROLL: {rollId || "N/A"}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-900/90 border border-rose-500/30 flex flex-col gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ALLOCATED EXAM HALL:</span>
            <div className="text-sm font-black text-rose-400">{detectedCandidate.allocatedRoomName || "Another Hall"}</div>
            <div className="text-xs font-mono text-amber-400">{detectedCandidate.allocatedSeat || "Seat Unassigned"}</div>
          </div>

          <p className="text-xs text-slate-400 italic text-center">
            ⚠️ Please instruct the candidate to proceed to their allocated room.
          </p>
        </div>
      </div>
    );
  }

  // 4. Wrong Department Alert
  if (attStatus === "WRONG_DEPARTMENT") {
    return (
      <div className="glass-panel p-6 flex flex-col gap-4 min-h-[460px] border-amber-500/40 bg-amber-950/20">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400">
            <Building2 className="w-5 h-5" />
            <h3 className="font-bold text-sm">DEPARTMENT NOT SCHEDULED</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/30 text-amber-300 border border-amber-500/50">
            WRONG DEPT
          </span>
        </div>

        <div className="flex flex-col gap-4 my-auto">
          <div className="flex items-center gap-3">
            {liveSnapshot && <img src={liveSnapshot} alt="Candidate" className="w-16 h-16 rounded-lg object-cover border border-amber-500/40" />}
            <div>
              <h4 className="text-base font-extrabold text-white">{name}</h4>
              <p className="text-xs font-mono text-slate-400">Dept: {detectedCandidate.candidateDepartment || department || "Unknown"}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-amber-500/30 flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">SCHEDULED DEPTS:</span>
              <strong className="text-cyan-400">{(detectedCandidate.allowedDepartments || []).join(", ") || "Other"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CANDIDATE DEPT:</span>
              <strong className="text-amber-400">{detectedCandidate.candidateDepartment || department}</strong>
            </div>
          </div>
        </div>

        <button onClick={() => handleAction("ENTRY", false, true)} className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition">
          <ShieldAlert className="w-4 h-4" /> Override & Allow Entry
        </button>
      </div>
    );
  }

  // 5. Outside Time / No Exam Today Alert
  if (attStatus === "NO_EXAM_TODAY" || attStatus === "EXAM_NOT_STARTED" || attStatus === "EXAM_ENDED" || attStatus === "OUTSIDE_EXAM_TIME") {
    return (
      <div className="glass-panel p-6 flex flex-col gap-4 min-h-[460px] border-amber-500/40 bg-amber-950/20">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400">
            <ClockAlert className="w-5 h-5" />
            <h3 className="font-bold text-sm">
              {attStatus === "NO_EXAM_TODAY"
                ? "NO EXAM SCHEDULED TODAY"
                : attStatus === "EXAM_NOT_STARTED"
                ? "EXAM NOT STARTED YET"
                : "EXAM TIME WINDOW CLOSED"}
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/30 text-amber-300 border border-amber-500/50">
            RESTRICTED
          </span>
        </div>

        <div className="flex flex-col items-center text-center gap-3 my-auto">
          {liveSnapshot && <img src={liveSnapshot} alt="Candidate" className="w-20 h-20 rounded-xl object-cover border border-amber-500/40" />}
          <div>
            <h4 className="text-base font-extrabold text-white">{name}</h4>
            <p className="text-xs text-amber-300 mt-2 font-mono p-2.5 rounded-lg bg-slate-900/90 border border-amber-500/30">
              {detectedCandidate.remarks || "No active exam scheduled for today in this hall. Entry is restricted."}
            </p>
          </div>
        </div>

        <button onClick={() => handleAction("ENTRY", false, true)} className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition">
          <ShieldAlert className="w-4 h-4" /> Grant Special Permission & Allow Entry
        </button>
      </div>
    );
  }

  // 6. Admit Card Pending Alert
  if (attStatus === "ADMIT_PENDING") {
    return (
      <div className="glass-panel p-6 flex flex-col gap-4 min-h-[460px] border-amber-500/40 bg-amber-950/20">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold text-sm">ADMIT CARD NOT CLEARED</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/30 text-amber-300 border border-amber-500/50">
            DUES PENDING
          </span>
        </div>

        <div className="flex flex-col gap-4 my-auto">
          <div className="flex items-center gap-3">
            {liveSnapshot && <img src={liveSnapshot} alt="Candidate" className="w-16 h-16 rounded-lg object-cover border border-amber-500/40" />}
            <div>
              <h4 className="text-base font-extrabold text-white">{name}</h4>
              <p className="text-xs font-mono text-slate-400">ROLL: {rollId}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-amber-500/30 text-xs text-amber-300">
            Reason: {detectedCandidate.remarks || "Tuition Fee / Dues Verification Pending"}
          </div>
        </div>

        <button onClick={handleSpecialClearance} className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition">
          <CheckCircle2 className="w-4 h-4" /> Grant Special Clearance & Check-In
        </button>
      </div>
    );
  }

  // 7. Active Candidate Profile (Cleared & Valid)
  const isOvertimeBreak = attendanceRecord?.last_break?.is_overtime;
  const washroomBreaksCount = attendanceRecord?.washroom_count || 0;

  return (
    <div className="glass-panel p-5 flex flex-col gap-4 min-h-[460px] border-sky-500/20">
      {/* Header Status */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-2 text-cyber-cyan">
          <UserCheck className="w-5 h-5" />
          <h3 className="font-bold text-sm text-white">Candidate Verified</h3>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${
            attStatus === "INSIDE"
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
              : attStatus === "WASHROOM"
              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
              : attStatus === "EXITED"
              ? "bg-purple-500/20 text-purple-400 border-purple-500/40"
              : "bg-slate-800 text-slate-300 border-slate-700"
          }`}
        >
          {attStatus === "INSIDE"
            ? "INSIDE HALL"
            : attStatus === "WASHROOM"
            ? "IN WASHROOM"
            : attStatus === "EXITED"
            ? "EXAM COMPLETED"
            : "NOT CHECKED IN"}
        </span>
      </div>

      {/* Washroom Overtime Alert Box if returning overtime */}
      {isOvertimeBreak && (
        <div className="p-3 rounded-lg bg-rose-500/15 border-2 border-rose-500 animate-violation flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <AlertOctagon className="w-4 h-4 animate-pulse" />
            <span>⚠️ WASHROOM TIME LIMIT EXCEEDED!</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono bg-slate-950/60 p-2 rounded">
            <span>Spent: <strong className="text-rose-400">{attendanceRecord.last_break.duration_minutes}m</strong></span>
            <span>Limit: <strong>{attendanceRecord.last_break.limit_minutes}m</strong></span>
            <span>Overtime: <strong className="text-rose-400">+{attendanceRecord.last_break.overtime_minutes}m</strong></span>
          </div>
        </div>
      )}

      {/* Side by Side Photos Comparison */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered</span>
          <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
            {registeredPhoto ? (
              <img src={registeredPhoto} alt="Registered" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">No Photo</div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-cyber-cyan">
          <ArrowRightLeft className="w-4 h-4" />
          <span className="text-[11px] font-extrabold font-mono">{confidencePercent || 96}%</span>
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Camera</span>
          <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-cyber-cyan shadow-neon-cyan bg-slate-950">
            {liveSnapshot && <img src={liveSnapshot} alt="Live" className="w-full h-full object-cover" />}
          </div>
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-black text-white">{name}</h3>
          <span className="text-xs font-mono font-bold text-cyan-400">ROLL: {rollId || "N/A"}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {allocation?.room_name || activeRoomName}
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-mono font-bold">
            <Armchair className="w-3 h-3" /> {allocation?.seat_number || "Seat A-01"}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Admit Cleared
          </span>
        </div>

        <span className="text-xs text-slate-400">Department: {department || "Computer Science & Eng."}</span>

        {/* Timeline Row */}
        <div className="grid grid-cols-3 gap-2 mt-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono">
          <div className={`flex flex-col ${attendanceRecord?.entry_time ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><LogIn className="w-3 h-3" /> Entry</span>
            <span>{attendanceRecord?.entry_time || "Pending"}</span>
          </div>

          <div className={`flex flex-col ${washroomBreaksCount > 0 || attStatus === "WASHROOM" ? "text-amber-400 font-bold" : "text-slate-500"}`}>
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><Bath className="w-3 h-3" /> Washroom</span>
            <span>{attStatus === "WASHROOM" ? `Out ${attendanceRecord?.washroom_out_time || "Now"}` : `${washroomBreaksCount} Breaks`}</span>
          </div>

          <div className={`flex flex-col ${attendanceRecord?.exit_time ? "text-purple-400 font-bold" : "text-slate-500"}`}>
            <span className="text-[10px] text-slate-400 flex items-center gap-1"><LogOut className="w-3 h-3" /> Exit</span>
            <span>{attendanceRecord?.exit_time || "Pending"}</span>
          </div>
        </div>
      </div>

      {/* Action Punch Buttons & 3-Step Verification for Entry */}
      <div className="mt-auto pt-3 border-t border-slate-700/60 flex flex-col gap-3">
        {(attStatus === "NOT_ENTERED" || attStatus === "ABSENT") && (
          <div className="flex flex-col gap-3">
            {/* 3-Step Progress Stepper */}
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
              {/* Step 1 Badge */}
              <div
                className={`flex items-center justify-center gap-1 p-1.5 rounded-lg border transition ${
                  isFaceManuallyVerified
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold"
                    : "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold animate-pulse"
                }`}
              >
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">1. {isFaceManuallyVerified ? "Face OK" : "Verify Face"}</span>
              </div>

              {/* Step 2 Badge */}
              <div
                className={`flex items-center justify-center gap-1 p-1.5 rounded-lg border transition ${
                  signatureData.hasSignature
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold"
                    : isFaceManuallyVerified
                    ? "bg-sky-500/15 border-sky-500/40 text-sky-300 font-bold animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <PenTool className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">2. {signatureData.hasSignature ? "Signed" : "Take Sign"}</span>
              </div>

              {/* Step 3 Badge */}
              <div
                className={`flex items-center justify-center gap-1 p-1.5 rounded-lg border transition ${
                  isFaceManuallyVerified && signatureData.hasSignature
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                <LogIn className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">3. Enter Exam</span>
              </div>
            </div>

            {/* Dynamic Step Buttons */}
            {!isFaceManuallyVerified && (
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => {
                  setIsFaceManuallyVerified(true);
                  onLockScanner?.(true);
                  triggerAudio("success");
                  triggerVoice(`Face identity verified for ${name}. Camera scanner locked. Please take digital signature.`);
                  addToast(`✅ Face Identity Verified: ${name} (Scanner Locked)`, "success");
                }}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition shadow-neon-cyan transform hover:-translate-y-0.5 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" /> 1. VERIFY FACE IDENTITY
              </button>
            )}

            {isFaceManuallyVerified && !signatureData.hasSignature && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-neon-cyan animate-pulse transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <PenTool className="w-5 h-5" /> 2. TAKE DIGITAL SIGNATURE (OPEN PAD)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFaceManuallyVerified(false);
                    setSignatureData({ hasSignature: false, dataUrl: null });
                    setIsSignatureModalOpen(false);
                    onLockScanner?.(false);
                    onResetScanner?.();
                    triggerAudio("warning");
                    addToast("🔄 Face verification reset. Camera unlocked.", "info");
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset / Re-Scan Face
                </button>
              </div>
            )}

            {isFaceManuallyVerified && signatureData.hasSignature && (
              <div className="flex flex-col gap-3">
                {/* Large Captured Signature Preview Card */}
                <div className="p-3.5 rounded-xl bg-slate-900/95 border-2 border-emerald-500/40 flex flex-col gap-2.5 shadow-lg animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Digital Signature Captured
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsSignatureModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition border border-slate-700 shadow-sm"
                      title="Change or re-draw signature"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> Re-Sign / Edit
                    </button>
                  </div>

                  {/* High visibility large signature display */}
                  <div className="w-full h-28 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center overflow-hidden p-2 shadow-inner relative">
                    <img
                      src={signatureData.dataUrl}
                      alt="Signature Preview"
                      className="w-full h-full object-contain filter brightness-125 drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                    />
                    <span className="absolute bottom-1.5 right-2.5 text-[9px] font-mono text-slate-500">
                      Huion H640P Digital Proof
                    </span>
                  </div>
                </div>

                {/* Final Enter Exam Button */}
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => handleAction("ENTRY")}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition shadow-neon-emerald transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <LogIn className="w-5 h-5" /> 3. ENTER EXAM HALL (CONFIRM CHECK-IN)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFaceManuallyVerified(false);
                    setSignatureData({ hasSignature: false, dataUrl: null });
                    setIsSignatureModalOpen(false);
                    onLockScanner?.(false);
                    onResetScanner?.();
                    triggerAudio("warning");
                    addToast("🔄 Face verification reset. Camera unlocked.", "info");
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[11px] font-mono flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3 h-3" /> Reset / Re-Scan Face
                </button>
              </div>
            )}
          </div>
        )}

        {attStatus === "INSIDE" && (
          <div className="flex gap-2">
            <button
              disabled={loadingAction}
              onClick={() => handleAction("WASHROOM_OUT")}
              className="flex-1 py-3 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Bath className="w-4 h-4" /> WASHROOM BREAK (OUT)
            </button>
            <button
              disabled={loadingAction}
              onClick={() => handleAction("EXIT")}
              className="flex-1 py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-neon-amber"
            >
              <LogOut className="w-4 h-4" /> SUBMIT EXAM & EXIT
            </button>
          </div>
        )}

        {attStatus === "WASHROOM" && (
          <button
            disabled={loadingAction}
            onClick={() => handleAction("WASHROOM_IN")}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-neon-emerald"
          >
            <DoorOpen className="w-5 h-5" /> RETURN FROM WASHROOM (IN)
          </button>
        )}

        {attStatus === "EXITED" && (
          <div className="w-full py-2.5 px-4 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400" /> Exam Completed & Successfully Exited
          </div>
        )}
      </div>

      {/* Centered Digital Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        candidateName={name}
        rollId={rollId}
        initialSignature={signatureData.dataUrl}
        onAcceptSignature={(dataUrl) => {
          setSignatureData({ hasSignature: true, dataUrl });
          triggerAudio("success");
          triggerVoice(`Signature accepted for ${name}. Ready to enter exam hall.`);
          addToast(`✍️ Signature captured successfully for ${name}!`, "success");
        }}
      />
    </div>
  );
}
