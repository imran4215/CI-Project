"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Tablet,
  Check,
  X,
  Radio,
  CreditCard,
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
    users,
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

  // 3-Factor Entrance Steps:
  // Step 1: Face Detection & Confirmation
  // Step 2: Digital Signature Match (>=50%)
  // Step 3: RFID Smart ID Card Scan (Matches Candidate)
  const [isFaceStepPassed, setIsFaceStepPassed] = useState(false);
  const [isSignatureStepPassed, setIsSignatureStepPassed] = useState(false);
  const [isRfidStepPassed, setIsRfidStepPassed] = useState(false);
  const [lockedCandidate, setLockedCandidate] = useState(null);

  const [scannedRfidTag, setScannedRfidTag] = useState("");
  const [manualRfidInput, setManualRfidInput] = useState("");
  const [isRfidHardwareConnected, setIsRfidHardwareConnected] = useState(false);

  const [signatureData, setSignatureData] = useState({
    hasSignature: false,
    dataUrl: null,
    matchResult: null,
    isOverridden: false,
  });
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  const lastProcessedRfidEpoch = useRef(Date.now() / 1000);

  // Active candidate: use locked candidate once face is confirmed, otherwise live detected candidate
  const activeCandidate = isFaceStepPassed && lockedCandidate ? lockedCandidate : detectedCandidate;

  // Reset entire 3-factor verification flow
  const handleResetVerification = useCallback(() => {
    setIsFaceStepPassed(false);
    setIsSignatureStepPassed(false);
    setIsRfidStepPassed(false);
    setLockedCandidate(null);
    setScannedRfidTag("");
    setManualRfidInput("");
    setSignatureData({ hasSignature: false, dataUrl: null, matchResult: null, isOverridden: false });
    setIsSignatureModalOpen(false);
    lastProcessedRfidEpoch.current = Date.now() / 1000;
    api.clearLatestRFID().catch(() => {});
    onLockScanner?.(false);
    onResetScanner?.();
    triggerAudio("warning");
    addToast("🔄 Entrance verification reset. Ready for next candidate.", "info");
  }, [onLockScanner, onResetScanner, triggerAudio, addToast]);

  // Reset all steps automatically when active exam room changes
  useEffect(() => {
    setIsFaceStepPassed(false);
    setIsSignatureStepPassed(false);
    setIsRfidStepPassed(false);
    setLockedCandidate(null);
    setScannedRfidTag("");
    setManualRfidInput("");
    setSignatureData({ hasSignature: false, dataUrl: null, matchResult: null, isOverridden: false });
    setIsSignatureModalOpen(false);
    lastProcessedRfidEpoch.current = Date.now() / 1000;
    api.clearLatestRFID().catch(() => {});
    onLockScanner?.(false);
  }, [activeRoomId, onLockScanner]);

  // Handle Step 1: Confirm Face (Manual user click / Enter)
  const handleConfirmFace = useCallback(() => {
    if (!detectedCandidate || !detectedCandidate.id) {
      addToast("⚠️ No candidate face recognized in camera feed.", "warning");
      return;
    }

    // Lock detected candidate
    setLockedCandidate(detectedCandidate);
    setIsFaceStepPassed(true);
    setIsSignatureStepPassed(false);
    setIsRfidStepPassed(false);
    setScannedRfidTag("");
    lastProcessedRfidEpoch.current = Date.now() / 1000;
    api.clearLatestRFID().catch(() => {});
    onLockScanner?.(true);

    triggerAudio("success");
    triggerVoice(`Face identity verified for ${detectedCandidate.name}. Please sign on the tablet.`);
    addToast(`✅ Step 1 Passed: Face Verified for ${detectedCandidate.name}! Opening Signature Pad...`, "success");

    // Automatically open signature pad
    setIsSignatureModalOpen(true);
  }, [detectedCandidate, onLockScanner, triggerAudio, triggerVoice, addToast]);

  // Handle Step 2: Digital Signature Callback
  const handleAcceptSignature = useCallback(
    (dataUrl, matchRes) => {
      const cand = activeCandidate || detectedCandidate;
      const isMatch = matchRes ? matchRes.is_match && matchRes.similarity_score >= 50.0 : true;

      setSignatureData({
        hasSignature: true,
        dataUrl,
        matchResult: matchRes,
        isOverridden: false,
      });

      if (isMatch) {
        setIsSignatureStepPassed(true);
        setIsRfidStepPassed(false);
        setScannedRfidTag("");
        // Reset RFID epoch to NOW so only cards tapped after this moment are processed
        lastProcessedRfidEpoch.current = Date.now() / 1000;
        api.clearLatestRFID().catch(() => {});

        triggerAudio("success");
        triggerVoice(`Signature verified for ${cand?.name || "candidate"}. Please tap student ID card.`);
        addToast(
          `✅ Step 2 Passed: Signature Verified (${matchRes?.similarity_score || 100}% match) for ${cand?.name}! Please tap RFID ID Card.`,
          "success"
        );
      } else {
        setIsSignatureStepPassed(false);
        triggerAudio("alert");
        triggerVoice(`Signature mismatch for ${cand?.name}. Match score is below 50 percent.`);
        addToast(
          `❌ Signature Mismatch: Live signature did NOT match reference for ${cand?.name}! (Match: ${matchRes?.similarity_score}%, Required: 50%+)`,
          "error"
        );
      }
    },
    [activeCandidate, detectedCandidate, triggerAudio, triggerVoice, addToast]
  );

  // Handle Step 3: RFID Smart ID Card Scan
  const handleRfidScanned = useCallback(
    (tag) => {
      if (!tag || !tag.trim()) return;
      const cleanTag = tag.trim();
      const cand = activeCandidate || detectedCandidate;

      if (!cand || !cand.id) {
        addToast("⚠️ Please verify candidate Face (Step 1) and Signature (Step 2) first.", "warning");
        return;
      }

      setScannedRfidTag(cleanTag);

      // Check if scanned tag belongs to the SAME candidate
      const candUser = users.find((u) => u.id === cand.id);
      const expectedTag = candUser?.rfid_tag || cand.rfidTag || cand.rfid_tag;

      // Find which candidate owns this scanned tag
      const cardOwner = users.find((u) => u.rfid_tag === cleanTag);

      if (expectedTag && expectedTag === cleanTag) {
        // MATCH: Exact same candidate's card!
        setIsRfidStepPassed(true);
        triggerAudio("success");
        triggerVoice(`ID card verified for ${cand.name}. All 3 verification factors complete.`);
        addToast(`✅ Step 3 Passed: RFID ID Card Verified for ${cand.name} (Tag: ${cleanTag})!`, "success");
      } else if (!expectedTag && cardOwner && cardOwner.id === cand.id) {
        // Tag matches candidate profile
        setIsRfidStepPassed(true);
        triggerAudio("success");
        triggerVoice(`ID card verified for ${cand.name}.`);
        addToast(`✅ Step 3 Passed: RFID ID Card Verified for ${cand.name} (Tag: ${cleanTag})!`, "success");
      } else {
        // MISMATCH!
        setIsRfidStepPassed(false);
        triggerAudio("alert");
        const ownerName = cardOwner ? cardOwner.name : "Unregistered Tag";
        triggerVoice("Security Alert! ID card does not match the candidate.");
        addToast(
          `❌ RFID Mismatch: Scanned ID Card (${cleanTag} - ${ownerName}) does NOT belong to ${cand.name}!`,
          "error"
        );

        // Auto log proxy violation
        api.logProxyAlert({
          image: cand.liveSnapshot,
          confidence: 0.95,
          notes: `🚨 RFID Card Mismatch at Entrance: Scanned card (${cleanTag} - ${ownerName}) does not match Candidate (${cand.name} - ${cand.rollId || cand.roll_id}).`,
        }).catch(() => {});
      }
    },
    [activeCandidate, detectedCandidate, users, triggerAudio, triggerVoice, addToast]
  );

  // Poll for hardware RFID scans when on Step 3
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const res = await api.getLatestRFID();
        setIsRfidHardwareConnected(!!res.is_connected);

        // Only process live RFID hardware scan if we are on Step 3 (Face & Signature passed, RFID pending)
        if (
          isFaceStepPassed &&
          (isSignatureStepPassed || signatureData.isOverridden) &&
          !isRfidStepPassed &&
          res &&
          res.scanned &&
          res.scan &&
          res.scan.epoch > lastProcessedRfidEpoch.current
        ) {
          lastProcessedRfidEpoch.current = res.scan.epoch;
          handleRfidScanned(res.scan.tag);
        }
      } catch (e) {
        // silent polling catch
      }
    }, 750);

    return () => clearInterval(intervalId);
  }, [isFaceStepPassed, isSignatureStepPassed, isRfidStepPassed, signatureData.isOverridden, handleRfidScanned]);

  // Execute Attendance Action (ENTRY, WASHROOM_OUT, WASHROOM_IN, EXIT)
  const handleAction = async (actionType, overrideAdmit = false, overrideSchedule = false) => {
    const cand = activeCandidate || detectedCandidate;
    if (!cand || loadingAction) return;

    if (actionType === "ENTRY") {
      if (!isFaceStepPassed) {
        addToast("⚠️ Please confirm Face Verification (Step 1) first!", "warning");
        return;
      }
      if (!signatureData.hasSignature && !signatureData.isOverridden) {
        addToast("✍️ Digital signature required (Step 2) before confirming entry!", "warning");
        return;
      }
      if (!isRfidStepPassed) {
        addToast("💳 Please scan the candidate's RFID ID Card (Step 3) before entry!", "warning");
        return;
      }
    }

    setLoadingAction(true);
    try {
      const res = await api.executeAttendanceAction({
        candidate_id: cand.id,
        action: actionType,
        active_room_id: activeRoomId,
        image: cand.liveSnapshot || detectedCandidate?.liveSnapshot,
        signature: actionType === "ENTRY" ? signatureData.dataUrl : undefined,
        exam_name: examName,
        hall_name: activeRoomName,
        override_admit: overrideAdmit,
        override_schedule: overrideSchedule,
      });

      if (actionType === "ENTRY") {
        triggerAudio("success");
        triggerVoice(`Entry and signature confirmed for ${cand.name}. Welcome to the exam hall.`);
        addToast(`🎉 3-Factor Entry Confirmed: ${cand.name} (${res.record?.entry_time})`, "success");
      } else if (actionType === "WASHROOM_OUT") {
        triggerAudio("warning");
        const limit = activeSchedule?.washroom_limit_minutes || washroomLimitMinutes || 10;
        triggerVoice(`Washroom break recorded for ${cand.name}. Time limit is ${limit} minutes.`);
        addToast(`🚻 Washroom Break (Out): ${cand.name} (${res.record?.washroom_out_time})`, "warning");
      } else if (actionType === "WASHROOM_IN") {
        const lastBreak = res.record?.last_break;
        if (lastBreak?.is_overtime) {
          triggerAudio("alert");
          triggerVoice(`Warning! Washroom time limit exceeded. Candidate ${cand.name} returned ${lastBreak.overtime_minutes} minutes late.`);
          addToast(`⚠️ OVERTIME VIOLATION: ${cand.name} spent ${lastBreak.duration_minutes}m (Limit: ${lastBreak.limit_minutes}m)!`, "error");
        } else {
          triggerAudio("success");
          triggerVoice(`Welcome back to the exam hall, ${cand.name}.`);
          addToast(`🟢 Washroom Return (In): ${cand.name} (${lastBreak?.duration_minutes || 0}m spent)`, "success");
        }
      } else if (actionType === "EXIT") {
        triggerAudio("warning");
        triggerVoice(`Exit confirmed for ${cand.name}. Exam submitted.`);
        addToast(`🚪 Exit Confirmed: ${cand.name} (${res.record?.exit_time})`, "warning");
      }

      await loadAttendance();
      await loadAlerts();
      await loadWashroomActive();
      if (onPunchCompleted) onPunchCompleted(cand.name, actionType);

      // Reset verification steps for next student
      setIsFaceStepPassed(false);
      setIsSignatureStepPassed(false);
      setIsRfidStepPassed(false);
      setLockedCandidate(null);
      setScannedRfidTag("");
      setManualRfidInput("");
      setSignatureData({ hasSignature: false, dataUrl: null, matchResult: null, isOverridden: false });
      lastProcessedRfidEpoch.current = Date.now() / 1000;
      api.clearLatestRFID().catch(() => {});
      onLockScanner?.(false);
    } catch (err) {
      addToast(`Error: ${err.message}`, "error");
    } finally {
      setLoadingAction(false);
    }
  };

  // Grant Special Clearance
  const handleSpecialClearance = async () => {
    const cand = activeCandidate || detectedCandidate;
    if (!cand) return;
    try {
      await api.clearAdmitCard({
        candidate_id: cand.id,
        admit_status: "CLEARED",
        special_clearance_by: "Hall In-Charge",
        remarks: "Special Clearance Granted at Entrance",
      });
      addToast(`Special clearance granted to ${cand.name}`, "success");
      await loadAllocations();
      await handleAction("ENTRY", true);
    } catch (e) {
      addToast(`Clearance failed: ${e.message}`, "error");
    }
  };

  // Log Proxy Security Alert
  const handleLogProxy = async () => {
    const cand = activeCandidate || detectedCandidate;
    if (!cand) return;
    try {
      await api.logProxyAlert({
        image: cand.liveSnapshot,
        confidence: cand.detConfidence || 0.9,
        notes: `Unregistered face at ${activeRoomName}`,
      });
      addToast("Security violation recorded in audit logs.", "warning");
      await loadAlerts();
    } catch (e) {
      addToast(`Failed to log alert: ${e.message}`, "error");
    }
  };

  // 1. Idle State (No Candidate in Frame)
  if (!activeCandidate) {
    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[460px] border-sky-500/20">
        <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-radar shadow-neon-cyan">
          <Scan className="w-8 h-8 text-cyber-cyan" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">3-Factor Exam Entrance Active</h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Step 1: Face Biometric Auto-Detect &bull; Step 2: Digital Signature Match &bull; Step 3: RFID ID Card Scan.
          </p>
        </div>

        {/* RFID Hardware Live Status */}
        <div className="w-full max-w-sm p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2.5 text-left">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <Radio className={`w-4 h-4 ${isRfidHardwareConnected ? "text-emerald-400 animate-pulse" : "text-amber-400"}`} />
              <span>RFID Scanner: {isRfidHardwareConnected ? "USB Reader Online" : "Listening (Auto/Manual)"}</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isRfidHardwareConnected ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
              {isRfidHardwareConnected ? "READY" : "STANDBY"}
            </span>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-400">
          Waiting for Candidate Face in Camera...
        </div>
      </div>
    );
  }

  const { isRecognized, attStatus, name, rollId, department, confidencePercent, registeredPhoto, liveSnapshot, allocation, attendanceRecord } = activeCandidate;

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
  if (attStatus === "STANDBY_NO_EXAM" || activeCandidate?.isStandby) {
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
            {activeCandidate?.remarks || "No active exam session right now. Face recognized successfully in normal camera mode."}
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
            <div className="text-sm font-black text-rose-400">{activeCandidate?.allocatedRoomName || "Another Hall"}</div>
            <div className="text-xs font-mono text-amber-400">{activeCandidate?.allocatedSeat || "Seat Unassigned"}</div>
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
              <p className="text-xs font-mono text-slate-400">Dept: {activeCandidate?.candidateDepartment || department || "Unknown"}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/90 border border-amber-500/30 flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">SCHEDULED DEPTS:</span>
              <strong className="text-cyan-400">{(activeCandidate?.allowedDepartments || []).join(", ") || "Other"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CANDIDATE DEPT:</span>
              <strong className="text-amber-400">{activeCandidate?.candidateDepartment || department}</strong>
            </div>
          </div>
        </div>

        <button onClick={() => handleAction("ENTRY", false, true)} className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer">
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
              {activeCandidate?.remarks || "No active exam scheduled for today in this hall. Entry is restricted."}
            </p>
          </div>
        </div>

        <button onClick={() => handleAction("ENTRY", false, true)} className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer">
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
            Reason: {activeCandidate?.remarks || "Tuition Fee / Dues Verification Pending"}
          </div>
        </div>

        <button onClick={handleSpecialClearance} className="w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer">
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
              {/* Step 1 Badge: Face Biometric */}
              <div
                className={`flex items-center justify-center gap-1 p-1.5 rounded-lg border transition ${
                  isFaceStepPassed
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold"
                    : "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold animate-pulse"
                }`}
              >
                {isFaceStepPassed ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <Scan className="w-3 h-3 flex-shrink-0" />}
                <span className="truncate">1. {isFaceStepPassed ? "Face OK" : "Face Detect"}</span>
              </div>

              {/* Step 2 Badge: Digital Signature */}
              <div
                className={`flex items-center justify-center gap-1 p-1.5 rounded-lg border transition ${
                  isSignatureStepPassed || signatureData.isOverridden
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 font-bold"
                    : isFaceStepPassed
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {isSignatureStepPassed || signatureData.isOverridden ? (
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <PenTool className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="truncate">
                  2. {isSignatureStepPassed || signatureData.isOverridden ? "Sign OK" : "Take Sign"}
                </span>
              </div>

              {/* Step 3 Badge: RFID ID Card */}
              <div
                className={`flex items-center justify-center gap-1 p-1.5 rounded-lg border transition ${
                  isRfidStepPassed
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                    : isFaceStepPassed && (isSignatureStepPassed || signatureData.isOverridden)
                    ? "bg-sky-500/15 border-sky-500/40 text-sky-300 font-bold animate-pulse"
                    : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
              >
                {isRfidStepPassed ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <CreditCard className="w-3 h-3 flex-shrink-0" />}
                <span className="truncate">3. {isRfidStepPassed ? "Card OK" : "Scan Card"}</span>
              </div>
            </div>

            {/* STEP 1 UI: Candidate face is detected in camera, user manually clicks or enters to proceed */}
            {!isFaceStepPassed && (
              <div className="p-3.5 rounded-xl bg-slate-900/95 border-2 border-cyan-500/40 flex flex-col gap-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Scan className="w-4 h-4 text-cyber-cyan animate-pulse" />
                    Step 1: Face Biometric Detected ({name})
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    RECOGNIZED
                  </span>
                </div>

                <p className="text-[11px] text-slate-300">
                  Candidate <strong>{name}</strong> detected with {confidencePercent || 96}% confidence. Click below to lock and proceed to signature.
                </p>

                <button
                  type="button"
                  onClick={handleConfirmFace}
                  className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition shadow-neon-cyan transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> 1. CONFIRM FACE & PROCEED TO SIGNATURE ➔
                </button>
              </div>
            )}

            {/* STEP 2 UI: Face is confirmed, prompt / open Digital Signature pad */}
            {isFaceStepPassed && !isSignatureStepPassed && !signatureData.isOverridden && (
              <div className="p-3.5 rounded-xl bg-slate-900/95 border-2 border-amber-500/40 flex flex-col gap-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-amber-400 animate-pulse" />
                    Step 2: Digital Signature Required ({name})
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                    STEP 2
                  </span>
                </div>

                <p className="text-[11px] text-slate-300">
                  Candidate must sign on the graphics tablet / canvas to match registered signature (≥50% threshold).
                </p>

                {/* If signature failed match */}
                {signatureData.matchResult && !signatureData.matchResult.is_match && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-300">
                      <span>⚠️ Signature Mismatch: {signatureData.matchResult.similarity_score}%</span>
                      <span>Min: 50%</span>
                    </div>
                    <p className="text-[10px] text-rose-200">
                      Signature similarity did not reach the 50% threshold. Candidate may re-sign or Invigilator can grant override approval.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsSignatureModalOpen(true)}
                        className="flex-1 py-1.5 px-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Re-Sign on Pad
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSignatureData((prev) => ({ ...prev, isOverridden: true }));
                          setIsSignatureStepPassed(true);
                          addToast("Invigilator granted manual signature approval", "success");
                        }}
                        className="flex-1 py-1.5 px-2 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition cursor-pointer"
                      >
                        Invigilator Override
                      </button>
                    </div>
                  </div>
                )}

                {(!signatureData.matchResult || signatureData.matchResult.is_match) && (
                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition shadow-neon-amber transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <PenTool className="w-4 h-4" /> 2. TAKE DIGITAL SIGNATURE (OPEN PAD)
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetVerification}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Cancel / Reset Verification
                </button>
              </div>
            )}

            {/* STEP 3 UI: Face & Signature passed, waiting for RFID Smart ID Card scan */}
            {isFaceStepPassed && (isSignatureStepPassed || signatureData.isOverridden) && !isRfidStepPassed && (
              <div className="p-3.5 rounded-xl bg-slate-900/95 border-2 border-sky-500/40 flex flex-col gap-2.5 shadow-lg animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-cyan-400 animate-pulse" />
                    Step 3: Tap Candidate RFID Smart ID Card
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold">
                    SCAN CARD
                  </span>
                </div>

                <p className="text-[11px] text-slate-300">
                  Tap student ID card on the RFID reader. Card holder must match candidate <strong>{name}</strong>.
                </p>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Tap card on reader or enter tag..."
                    value={manualRfidInput}
                    onChange={(e) => setManualRfidInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && manualRfidInput.trim()) {
                        handleRfidScanned(manualRfidInput.trim());
                        setManualRfidInput("");
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (manualRfidInput.trim()) {
                        handleRfidScanned(manualRfidInput.trim());
                        setManualRfidInput("");
                      } else if (activeCandidate?.rfidTag || activeCandidate?.rfid_tag) {
                        handleRfidScanned(activeCandidate.rfidTag || activeCandidate.rfid_tag);
                      }
                    }}
                    className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer"
                  >
                    Verify Card
                  </button>
                </div>

                {/* Quick tap registered card button */}
                {activeCandidate?.rfidTag && (
                  <button
                    type="button"
                    onClick={() => handleRfidScanned(activeCandidate.rfidTag)}
                    className="w-full py-1.5 px-2 rounded bg-slate-800 hover:bg-cyan-950/60 border border-slate-700 text-[11px] font-mono text-cyan-300 transition cursor-pointer"
                  >
                    Tap Registered Card for {name} ({activeCandidate.rfidTag})
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetVerification}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Verification
                </button>
              </div>
            )}

            {/* ALL 3 STEPS COMPLETE: Ready to Mark Entry Attendance */}
            {isFaceStepPassed && (isSignatureStepPassed || signatureData.isOverridden) && isRfidStepPassed && (
              <div className="flex flex-col gap-3 animate-in fade-in">
                <div className="p-3 rounded-xl bg-emerald-950/30 border-2 border-emerald-500/50 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ALL 3 FACTORS VERIFIED (FACE + SIGNATURE + RFID)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                    <div className="text-emerald-400">1. Face: ✅ {name}</div>
                    <div className="text-emerald-400">2. Sign: ✅ {signatureData.isOverridden ? "Override" : `${signatureData.matchResult?.similarity_score || 100}%`}</div>
                    <div className="text-emerald-400">3. RFID: ✅ {scannedRfidTag}</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={() => handleAction("ENTRY")}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition shadow-neon-emerald transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <LogIn className="w-5 h-5" /> 🎉 CONFIRM 3-FACTOR EXAM ENTRY
                </button>

                <button
                  type="button"
                  onClick={handleResetVerification}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[11px] font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Entrance Verification
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
              className="flex-1 py-3 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Bath className="w-4 h-4" /> WASHROOM BREAK (OUT)
            </button>
            <button
              disabled={loadingAction}
              onClick={() => handleAction("EXIT")}
              className="flex-1 py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-neon-amber cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> SUBMIT EXAM & EXIT
            </button>
          </div>
        )}

        {attStatus === "WASHROOM" && (
          <button
            disabled={loadingAction}
            onClick={() => handleAction("WASHROOM_IN")}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-neon-emerald cursor-pointer"
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
        candidateId={activeCandidate?.id || detectedCandidate?.id}
        candidateName={name}
        rollId={rollId}
        registeredSignatureUrl={activeCandidate?.registeredSignature || activeCandidate?.registered_signature || detectedCandidate?.registered_signature || detectedCandidate?.registeredSignature}
        initialSignature={signatureData.dataUrl}
        onAcceptSignature={handleAcceptSignature}
      />
    </div>
  );
}
