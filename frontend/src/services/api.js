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

  // Allocations & Admit Cards
  getAllocations: () => request("/api/allocations"),
  saveAllocation: (allocData) => request("/api/allocations", { method: "POST", body: JSON.stringify(allocData) }),
  clearAdmitCard: (clearanceData) => request("/api/allocations/clear-admit", { method: "POST", body: JSON.stringify(clearanceData) }),
  getAdmitCard: (candidateId) => request(`/api/admit-card/${candidateId}`),

  // Attendance
  getAttendanceToday: (roomId = "") => request(`/api/attendance/today${roomId ? `?room_id=${encodeURIComponent(roomId)}` : ""}`),
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
  registerCandidate: (formData) => request("/api/register", { method: "POST", body: formData }),

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
};
