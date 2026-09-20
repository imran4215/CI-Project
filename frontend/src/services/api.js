// Centralized API Service for FastAPI Backend
const API_BASE = "";

async function request(url, options = {}) {
  const defaultHeaders = { "Content-Type": "application/json" };
  const res = await fetch(url, {
    ...options,
    headers: options.body instanceof FormData ? undefined : { ...defaultHeaders, ...options.headers },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Rooms
  getRooms: () => request("/api/rooms"),
  createRoom: (roomData) => request("/api/rooms", { method: "POST", body: JSON.stringify(roomData) }),
  updateRoom: (roomId, roomData) => request(`/api/rooms/${roomId}`, { method: "PUT", body: JSON.stringify(roomData) }),
  deleteRoom: (roomId) => request(`/api/rooms/${roomId}`, { method: "DELETE" }),
  getRoomAllocations: (roomId) => request(`/api/rooms/${roomId}/allocations`),
  removeCandidateFromRoom: (roomId, candidateId) => request(`/api/rooms/${roomId}/allocations/${candidateId}`, { method: "DELETE" }),
  batchAllocateRoom: (roomId, assignments) => request(`/api/rooms/${roomId}/allocations`, { method: "POST", body: JSON.stringify({ assignments }) }),

  // Exam Schedules
  getSchedules: () => request("/api/schedules"),
  createSchedule: (scheduleData) => request("/api/schedules", { method: "POST", body: JSON.stringify(scheduleData) }),
  updateSchedule: (scheduleId, scheduleData) => request(`/api/schedules/${scheduleId}`, { method: "PUT", body: JSON.stringify(scheduleData) }),
  deleteSchedule: (scheduleId) => request(`/api/schedules/${scheduleId}`, { method: "DELETE" }),
  getActiveSchedule: (roomId) => request(`/api/schedules/active?room_id=${encodeURIComponent(roomId)}`),

  // Departments & Courses
  getDepartments: () => request("/api/departments"),
  createDepartment: (deptData) => request("/api/departments", { method: "POST", body: JSON.stringify(deptData) }),
  updateDepartment: (deptId, deptData) => request(`/api/departments/${deptId}`, { method: "PUT", body: JSON.stringify(deptData) }),
  deleteDepartment: (deptId) => request(`/api/departments/${deptId}`, { method: "DELETE" }),
  createCourse: (deptId, courseData) => request(`/api/departments/${deptId}/courses`, { method: "POST", body: JSON.stringify(courseData) }),
  updateCourse: (deptId, courseId, courseData) => request(`/api/departments/${deptId}/courses/${courseId}`, { method: "PUT", body: JSON.stringify(courseData) }),
  deleteCourse: (deptId, courseId) => request(`/api/departments/${deptId}/courses/${courseId}`, { method: "DELETE" }),
  enrollStudentsInCourse: (deptId, courseId, studentIds) => request(`/api/departments/${deptId}/courses/${courseId}/enroll`, { method: "POST", body: JSON.stringify({ student_ids: studentIds }) }),

  // Weekly Room Class Routines
  getRoutines: (params = {}) => {
    const q = new URLSearchParams();
    if (params.roomId && params.roomId !== "ALL") q.append("room_id", params.roomId);
    if (params.department && params.department !== "ALL") q.append("department", params.department);
    if (params.day && params.day !== "ALL") q.append("day", params.day);
    const qs = q.toString();
    return request(`/api/routines${qs ? `?${qs}` : ""}`);
  },
  createRoutine: (routineData) => request("/api/routines", { method: "POST", body: JSON.stringify(routineData) }),
  updateRoutine: (routineId, routineData) => request(`/api/routines/${routineId}`, { method: "PUT", body: JSON.stringify(routineData) }),
  deleteRoutine: (routineId) => request(`/api/routines/${routineId}`, { method: "DELETE" }),
  batchSaveRoutines: (routines) => request("/api/routines/batch", { method: "POST", body: JSON.stringify({ routines }) }),
  clearRoomRoutines: (roomId, day = "") => request(`/api/routines/room/${roomId}${day ? `?day=${encodeURIComponent(day)}` : ""}`, { method: "DELETE" }),

  // Allocations & Admit Cards
  getAllocations: () => request("/api/allocations"),
  saveAllocation: (allocData) => request("/api/allocations", { method: "POST", body: JSON.stringify(allocData) }),
  clearAdmitCard: (clearanceData) => request("/api/allocations/clear-admit", { method: "POST", body: JSON.stringify(clearanceData) }),
  getAdmitCard: (candidateId) => request(`/api/admit-card/${candidateId}`),

  // Attendance
  getAttendanceToday: (roomId = "", date = "") => {
    const q = new URLSearchParams();
    if (roomId && roomId !== "ALL") q.append("room_id", roomId);
    if (date) q.append("date", date);
    const qs = q.toString();
    return request(`/api/attendance${qs ? `?${qs}` : ""}`);
  },
  getAttendance: ({ roomId = "", date = "" } = {}) => {
    const q = new URLSearchParams();
    if (roomId && roomId !== "ALL") q.append("room_id", roomId);
    if (date) q.append("date", date);
    const qs = q.toString();
    return request(`/api/attendance${qs ? `?${qs}` : ""}`);
  },
  getClassroomAttendance: ({ roomId = "", date = "", courseCode = "", minDurationMins = 30 } = {}) => {
    const q = new URLSearchParams();
    if (roomId && roomId !== "ALL") q.append("room_id", roomId);
    if (date) q.append("date", date);
    if (courseCode && courseCode !== "ALL") q.append("course_code", courseCode);
    if (minDurationMins) q.append("min_duration_mins", minDurationMins);
    const qs = q.toString();
    return request(`/api/attendance/classroom${qs ? `?${qs}` : ""}`);
  },
  resetClassroomAttendance: ({ roomId = "", courseCode = "", date = "" } = {}) => {
    const q = new URLSearchParams();
    if (roomId && roomId !== "ALL") q.append("room_id", roomId);
    if (date) q.append("date", date);
    if (courseCode && courseCode !== "ALL") q.append("course_code", courseCode);
    const qs = q.toString();
    return request(`/api/attendance/classroom/reset${qs ? `?${qs}` : ""}`, { method: "POST" });
  },
  getStudentHistory: (candidateId) => request(`/api/students/${encodeURIComponent(candidateId)}/history`),
  executeAttendanceAction: (actionData) => request("/api/attendance/action", { method: "POST", body: JSON.stringify(actionData) }),
  updateAttendanceRecord: (candidateId, recordData) => request(`/api/attendance/records/${candidateId}`, { method: "PUT", body: JSON.stringify(recordData) }),
  deleteAttendanceRecord: (candidateId, dayKey = "") => request(`/api/attendance/records/${candidateId}${dayKey ? `?day_key=${encodeURIComponent(dayKey)}` : ""}`, { method: "DELETE" }),
  resetAttendanceSession: () => request("/api/attendance/reset", { method: "POST" }),
  getActiveWashroom: () => request("/api/attendance/washroom-active"),

  // Security Alerts & Proxy
  getAlerts: () => request("/api/attendance/alerts"),
  logProxyAlert: (alertData) => request("/api/attendance/log-proxy", { method: "POST", body: JSON.stringify(alertData) }),
  updateAlert: (alertId, alertData) => request(`/api/attendance/alerts/${alertId}`, { method: "PUT", body: JSON.stringify(alertData) }),
  deleteAlert: (alertId) => request(`/api/attendance/alerts/${alertId}`, { method: "DELETE" }),
  clearAllAlerts: () => request("/api/attendance/alerts", { method: "DELETE" }),

  // Candidates & Database
  getUsers: () => request("/api/users"),
  deleteUser: (userId) => request(`/api/users/${userId}`, { method: "DELETE" }),
  validateAngle: (angleData) => request("/api/validate-angle", { method: "POST", body: JSON.stringify(angleData) }),
  registerCandidate: (formData) => request("/api/register", { method: "POST", body: formData }),
  verifySignature: (candidateId, signatureB64, threshold = 0.60) =>
    request("/api/signature/verify", {
      method: "POST",
      body: JSON.stringify({
        candidate_id: candidateId,
        signature: signatureB64,
        threshold,
      }),
    }),

  // Live Frame Recognition
  recognizeFrame: (imageB64, threshold, activeRoomId) =>
    request("/api/recognize", {
      method: "POST",
      body: JSON.stringify({
        image: imageB64,
        threshold: threshold,
        active_room_id: activeRoomId,
      }),
    }),

  // RFID Smart Card Scanner & Hardware Engine
  getLatestRFID: (maxAge = null) =>
    request(`/api/rfid/latest${maxAge ? `?max_age=${encodeURIComponent(maxAge)}` : ""}`),
  scanRFID: (tag) =>
    request("/api/rfid/scan", { method: "POST", body: JSON.stringify({ tag }) }),
  lookupRFID: (rfidTag, activeRoomId = "") =>
    request(`/api/rfid/lookup/${encodeURIComponent(rfidTag)}${activeRoomId ? `?active_room_id=${encodeURIComponent(activeRoomId)}` : ""}`),
  getRFIDPorts: () => request("/api/rfid/ports"),
  updateRFIDConfig: (configData) =>
    request("/api/rfid/config", { method: "POST", body: JSON.stringify(configData) }),
  clearLatestRFID: () =>
    request("/api/rfid/clear", { method: "POST" }),

  // 3-Factor Biometric & RFID Verification (RFID + Face + Signature)
  verify3FactorEntry: (data) =>
    request("/api/attendance/verify-3factor", { method: "POST", body: JSON.stringify(data) }),

  // Continuous Exam Hall Surveillance & Active Presence Tracking
  processMonitoringFrame: (imageB64, threshold, activeRoomId) =>
    request("/api/monitoring/frame", {
      method: "POST",
      body: JSON.stringify({
        image: imageB64,
        threshold: threshold,
        active_room_id: activeRoomId,
      }),
    }),
  getMonitoringStatus: (roomId = "") =>
    request(`/api/monitoring/status${roomId ? `?room_id=${encodeURIComponent(roomId)}` : ""}`),
  getMonitoringConfig: () => request("/api/monitoring/config"),
  updateMonitoringConfig: (configData) =>
    request("/api/monitoring/config", { method: "POST", body: JSON.stringify(configData) }),

  // Automated Classroom Surveillance & Live Presence Tracking
  processClassroomFrame: (data) =>
    request("/api/classroom/frame", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getClassroomStatus: (roomId, courseCode) =>
    request(`/api/classroom/status?room_id=${encodeURIComponent(roomId)}&course_code=${encodeURIComponent(courseCode)}`),
  resetClassroomSession: (roomId, courseCode) =>
    request(`/api/classroom/reset?room_id=${encodeURIComponent(roomId)}&course_code=${encodeURIComponent(courseCode)}`, {
      method: "POST",
    }),
};
