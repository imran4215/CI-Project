// Canvas Face Overlay Drawing Utility with Posture & Head-Down Writing Support
export function drawFaceDetections(
  canvas,
  faces,
  isMirrored = true,
  frameWidth = 640,
  frameHeight = 480,
  isMonitoringMode = false
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!faces || faces.length === 0) return;

  // Scale factors between processing frame (e.g. 640x480) and display canvas (e.g. 1280x720)
  const scaleX = canvas.width / (frameWidth || 640);
  const scaleY = canvas.height / (frameHeight || 480);

  faces.forEach((face) => {
    if (!face.bbox || face.bbox.length < 4) return;

    let [origX, origY, origW, origH] = face.bbox;

    // Scale coordinates to canvas resolution
    let w = origW * scaleX;
    let h = origH * scaleY;
    let x = origX * scaleX;
    let y = origY * scaleY;

    // Mirror horizontal position when camera feed is mirrored
    if (isMirrored) {
      x = canvas.width - x - w;
    }

    const isRecognized = face.is_recognized;
    const attStatus = face.attendance_status;
    const isWriting = face.is_writing || face.posture === "WRITING";
    const posture = face.posture || "ATTENTIVE";

    let primaryColor = "#00f0ff"; // Cyan default
    let glowColor = "rgba(0, 240, 255, 0.5)";

    // Line 1: Student Name
    let badgeName = face.name || "Unknown Candidate";
    // Line 2: ID / Roll
    let badgeId = isRecognized ? `ID: ${face.roll_id || face.allocation?.roll_id || "N/A"}` : "Unregistered Face";
    // Line 3: Allocated Room & Seat
    let roomName = face.allocated_room_name || face.allocation?.room_name || "General Hall";
    let seatNo = face.allocated_seat || face.allocation?.seat_number || "";
    let badgeRoom = `Room: ${roomName}${seatNo ? ` (${seatNo})` : ""}`;
    // Line 4: Posture Label
    let badgePosture = isWriting ? "✍️ WRITING (HEAD DOWN)" : (posture === "LOOKING_AWAY" ? "↔️ LOOKING AWAY" : "👀 ATTENTIVE");

    if (attStatus === "STANDBY_NO_EXAM" || face.is_standby) {
      primaryColor = isRecognized ? "#00f0ff" : "#94a3b8"; // Slate / Cyan
      glowColor = isRecognized ? "rgba(0, 240, 255, 0.4)" : "rgba(148, 163, 184, 0.4)";
      badgeName = isRecognized ? face.name : "📷 Live Person";
      badgeId = isRecognized ? `ID: ${face.roll_id || "N/A"}` : "Standby Camera Preview";
      badgeRoom = "Normal Camera Feed";
      badgePosture = "📷 Standby Mode";
    } else if (!isRecognized) {
      primaryColor = "#f43f5e"; // Rose
      glowColor = "rgba(244, 63, 94, 0.5)";
      badgeName = "⚠️ UNREGISTERED FACE";
      badgeId = "Not in Database";
      badgeRoom = "Access Restricted";
      badgePosture = "⚠️ Unauthorized in Hall";
    } else if (attStatus === "WRONG_ROOM") {
      primaryColor = "#f43f5e";
      glowColor = "rgba(244, 63, 94, 0.6)";
      badgeName = `❌ ${face.name} (WRONG ROOM)`;
      badgeId = `ID: ${face.roll_id || "N/A"}`;
      badgeRoom = `Allocated: ${face.allocated_room_name || "Other Hall"}`;
    } else if (attStatus === "WRONG_DEPARTMENT") {
      primaryColor = "#f59e0b";
      glowColor = "rgba(245, 158, 11, 0.6)";
      badgeName = `⚠️ ${face.name} (DEPT MISMATCH)`;
      badgeId = `ID: ${face.roll_id || "N/A"}`;
      badgeRoom = `Dept: ${face.candidate_department || "Other"}`;
    } else if (attStatus === "ADMIT_PENDING") {
      primaryColor = "#f59e0b";
      glowColor = "rgba(245, 158, 11, 0.6)";
      badgeName = `⚠️ ${face.name} (ADMIT PENDING)`;
      badgeId = `ID: ${face.roll_id || "N/A"}`;
      badgeRoom = `Room: ${roomName} • Check Clearance`;
    } else if (attStatus === "WASHROOM") {
      primaryColor = "#f59e0b";
      glowColor = "rgba(245, 158, 11, 0.6)";
      badgeName = `🚻 ${face.name} (IN WASHROOM)`;
      badgeId = `ID: ${face.roll_id || "N/A"}`;
      badgeRoom = `Room: ${roomName}`;
    } else if (isWriting) {
      // Writing with head bowed down
      primaryColor = "#38bdf8"; // Sky Blue
      glowColor = "rgba(56, 189, 248, 0.6)";
      badgeName = `✍️ ${face.name} (WRITING)`;
      badgeId = `ID: ${face.roll_id || "N/A"}`;
      badgeRoom = `Room: ${roomName}${seatNo ? ` • ${seatNo}` : ""}`;
      badgePosture = "✍️ Active Writing (Head Down)";
    } else if (attStatus === "INSIDE") {
      primaryColor = "#10b981"; // Emerald
      glowColor = "rgba(16, 185, 129, 0.5)";
      badgeName = `✅ ${face.name} (PRESENT)`;
      badgeId = `ID: ${face.roll_id || "N/A"}`;
      badgeRoom = `Room: ${roomName}${seatNo ? ` • Seat: ${seatNo}` : ""}`;
    } else if (attStatus === "EXITED") {
      primaryColor = "#a855f7"; // Purple
      glowColor = "rgba(168, 85, 247, 0.5)";
      badgeName = `🚪 ${face.name} (EXITED)`;
      badgeId = `ID: ${face.roll_id || "N/A"}`;
      badgeRoom = `Room: ${roomName}`;
    }

    ctx.save();

    // 1. Draw glowing corner brackets on face bounding box
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 14;

    const cornerLen = Math.min(24, w * 0.28, h * 0.28);

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerLen, y);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + cornerLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(x, y + h - cornerLen);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + cornerLen, y + h);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(x + w - cornerLen, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - cornerLen);
    ctx.stroke();

    // Subtle box boundary
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // 2. Draw HUD Info Card directly attached to face box
    const cardW = Math.max(200, w);
    const cardH = isRecognized ? 68 : 46;
    const cardY = y > cardH + 12 ? y - cardH - 8 : y + h + 8;
    const cardX = Math.max(10, Math.min(x, canvas.width - cardW - 10));

    // Semi-transparent background panel
    ctx.fillStyle = "rgba(6, 11, 22, 0.94)";
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 8);
    ctx.fill();
    ctx.stroke();

    // Left accent status bar
    ctx.fillStyle = primaryColor;
    ctx.fillRect(cardX + 2, cardY + 6, 4, cardH - 12);

    // Line 1: Student Name
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 12px "Outfit", system-ui, sans-serif';
    ctx.fillText(badgeName, cardX + 12, cardY + 17);

    // Line 2: Student Roll ID
    ctx.fillStyle = primaryColor;
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(badgeId, cardX + 12, cardY + 32);

    // Line 3: Allocated Room & Seat
    if (isRecognized) {
      ctx.fillStyle = "#94a3b8"; // Slate-400
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText(badgeRoom, cardX + 12, cardY + 46);

      // Line 4: Posture status (Writing vs Attentive)
      ctx.fillStyle = isWriting ? "#38bdf8" : "#10b981";
      ctx.font = 'bold 10px "Outfit", system-ui, sans-serif';
      ctx.fillText(badgePosture, cardX + 12, cardY + 60);
    }

    ctx.restore();
  });
}
