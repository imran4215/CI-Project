"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { Header } from "../components/layout/Header";
import { NavTabs } from "../components/layout/NavTabs";
import { SessionBanner } from "../components/layout/SessionBanner";
import { AttendanceScanner } from "../components/attendance/AttendanceScanner";
import { CandidateCard } from "../components/attendance/CandidateCard";
import { RecentPunches } from "../components/attendance/RecentPunches";
import { ContinuousMonitor } from "../components/monitoring/ContinuousMonitor";
import { RegistrationHub } from "../components/registration_hub/RegistrationHub";
import { SchedulesManager } from "../components/schedules/SchedulesManager";
import { AttendanceSheet } from "../components/sheet/AttendanceSheet";
import { SecurityAlerts } from "../components/alerts/SecurityAlerts";
import { CandidateBank } from "../components/database/CandidateBank";
import { SystemSettings } from "../components/settings/SystemSettings";

export default function Home() {
  const {
    activeTab,
    users,
    activeRoomId,
    triggerVoice,
    triggerAudio,
    isLiveExamActive,
  } = useApp();

  const [detectedCandidate, setDetectedCandidate] = useState(null);
  const [recentPunches, setRecentPunches] = useState([]);
  const [isScannerLocked, setIsScannerLocked] = useState(false);

  // Reset scanner lock and candidate state whenever the exam room is switched
  useEffect(() => {
    setIsScannerLocked(false);
    setDetectedCandidate(null);
  }, [activeRoomId]);

  // Callback when scanner detects faces in video frame
  const handleCandidateDetected = useCallback(
    (faces, videoElement) => {
      if (isScannerLocked) return;

      if (!faces || faces.length === 0) {
        setDetectedCandidate(null);
        return;
      }

      const primary = faces[0];

      let liveSnapshotB64 = "";
      if (videoElement) {
        try {
          const vw = videoElement.videoWidth || 640;
          const vh = videoElement.videoHeight || 480;

          if (primary.bbox && primary.bbox.length >= 4) {
            const scaleX = vw / 640;
            const scaleY = vh / 480;

            const [bx, by, bw, bh] = primary.bbox;
            const scaledX = bx * scaleX;
            const scaledY = by * scaleY;
            const scaledW = bw * scaleX;
            const scaledH = bh * scaleY;

            const padTop = scaledH * 0.45;
            const padBottom = scaledH * 1.4;
            const padSide = scaledW * 0.5;

            const sx = Math.max(0, scaledX - padSide);
            const sy = Math.max(0, scaledY - padTop);
            const sw = Math.min(vw - sx, scaledW + padSide * 2);
            const sh = Math.min(vh - sy, scaledH + padTop + padBottom);

            const thumb = document.createElement("canvas");
            thumb.width = 360;
            thumb.height = 440;
            const tCtx = thumb.getContext("2d");
            tCtx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, 360, 440);
            liveSnapshotB64 = thumb.toDataURL("image/jpeg", 0.9);
          } else {
            const thumb = document.createElement("canvas");
            thumb.width = 640;
            thumb.height = Math.round((vh / vw) * 640) || 480;
            const tCtx = thumb.getContext("2d");
            tCtx.drawImage(videoElement, 0, 0, thumb.width, thumb.height);
            liveSnapshotB64 = thumb.toDataURL("image/jpeg", 0.9);
          }
        } catch (e) {
          console.error("Snapshot capture error:", e);
        }
      }

      const user = users.find((u) => u.id === primary.user_id);
      const regPhotoPath = user?.images ? Object.values(user.images)[0] : null;

      const candidateObj = {
        id: primary.user_id,
        name: primary.name,
        rollId: primary.roll_id,
        department: primary.department,
        candidateDepartment: primary.candidate_department,
        allowedDepartments: primary.allowed_departments,
        isRecognized: primary.is_recognized,
        attStatus: primary.attendance_status,
        confidencePercent: primary.confidence_percent,
        detConfidence: primary.det_confidence,
        remarks: primary.remarks,
        allocatedRoomName: primary.allocated_room_name,
        allocatedSeat: primary.allocated_seat,
        allocation: primary.allocation,
        attendanceRecord: primary.attendance_record,
        liveSnapshot: liveSnapshotB64,
        registeredPhoto: regPhotoPath ? `/api/${regPhotoPath}` : null,
        registeredSignature: primary.registered_signature || (user?.signature ? `/api/${user.signature}` : null),
        registered_signature: primary.registered_signature || (user?.signature ? `/api/${user.signature}` : null),
      };

      setDetectedCandidate(candidateObj);

      // Only trigger exam-time alarms if an exam is currently LIVE ACTIVE
      if (!isLiveExamActive) {
        return; // Standby / Normal camera mode: no alarm sounds or proxy alerts
      }

      if (!primary.is_recognized) {
        triggerAudio("alert");
        triggerVoice("Warning: Unregistered person detected at entrance.", "proxy-alert", 8000);
      } else if (primary.attendance_status === "WRONG_ROOM") {
        triggerAudio("warning");
        triggerVoice(
          `Wrong room alert. Candidate ${primary.name}, your allocated room is ${primary.allocated_room_name || "another hall"}.`,
          `wrong-room-${primary.user_id}`,
          7000
        );
      } else if (primary.attendance_status === "WRONG_DEPARTMENT") {
        triggerAudio("warning");
        triggerVoice(
          `Department alert. Candidate ${primary.name}, today's exam in this hall is scheduled for another department.`,
          `wrong-dept-${primary.user_id}`,
          7000
        );
      } else if (primary.attendance_status === "ADMIT_PENDING") {
        triggerAudio("warning");
        triggerVoice(
          `Admit clearance pending for ${primary.name}. Entry is restricted.`,
          `admit-pending-${primary.user_id}`,
          7000
        );
      }
    },
    [users, triggerAudio, triggerVoice, isLiveExamActive, isScannerLocked]
  );

  const handlePunchCompleted = (candName, punchType) => {
    const timeStr = new Date().toLocaleTimeString();
    setRecentPunches((prev) => [{ name: candName, type: punchType, time: timeStr }, ...prev.slice(0, 8)]);
    setDetectedCandidate(null);
    setIsScannerLocked(false);
  };

  return (
    <main className="w-full flex flex-col">
      <Header />
      <NavTabs />

      {/* TAB 1: LIVE ATTENDANCE & VERIFICATION HUD */}
      {activeTab === "attendance" && (
        <div className="flex flex-col">
          <SessionBanner />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <AttendanceScanner
                onCandidateDetected={handleCandidateDetected}
                isPaused={isScannerLocked}
                onUnlockScanner={() => {
                  setIsScannerLocked(false);
                  setDetectedCandidate(null);
                }}
              />
              <RecentPunches punches={recentPunches} />
            </div>

            <div className="lg:col-span-5">
              <CandidateCard
                detectedCandidate={detectedCandidate}
                onPunchCompleted={handlePunchCompleted}
                isLocked={isScannerLocked}
                onLockScanner={setIsScannerLocked}
                onResetScanner={() => {
                  setIsScannerLocked(false);
                  setDetectedCandidate(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTINUOUS EXAM HALL SURVEILLANCE & WRITING DETECTOR */}
      {activeTab === "monitoring" && (
        <div className="flex flex-col">
          <ContinuousMonitor />
        </div>
      )}

      {/* TAB 3: UNIFIED REGISTRATION HUB (Student, Hall, Exam Create) */}
      {(activeTab === "registration_hub" || activeTab === "register") && <RegistrationHub />}

      {/* TAB 3: EXAM TIMETABLE & SCHEDULES */}
      {activeTab === "schedules" && <SchedulesManager />}

      {/* TAB 4: MASTER ATTENDANCE SHEET */}
      {activeTab === "sheet" && <AttendanceSheet />}

      {/* TAB 6: SECURITY ALERTS & PROXY LOGS */}
      {activeTab === "alerts" && <SecurityAlerts />}

      {/* TAB 7: CANDIDATE BANK (DATABASE) */}
      {activeTab === "database" && <CandidateBank />}

      {/* TAB 8: SYSTEM SETTINGS */}
      {activeTab === "settings" && <SystemSettings />}
    </main>
  );
}
