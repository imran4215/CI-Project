"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { api } from "../../services/api";
import {
  UserPlus,
  Building,
  CalendarPlus,
  Camera,
  CheckCircle2,
  Circle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Upload,
  Layers,
  MapPin,
  Clock,
  BookOpen,
  Users,
  CheckSquare,
  Square,
  DoorOpen,
  Calendar,
  Sparkles,
  Check,
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
  FolderPlus,
  X,
  Lock,
  Zap,
  Search,
  Armchair,
  AlertTriangle,
  PenTool,
  RotateCcw,
  Tablet,
  Eye,
} from "lucide-react";
import { SignatureModal } from "../attendance/SignatureModal";

export function RegistrationHub() {
  const {
    rooms,
    users,
    departments,
    allocations,
    loadUsers,
    loadRooms,
    loadAllocations,
    loadSchedules,
    loadDepartments,
    addToast,
    selectedDeviceId,
    isMirrored,
    triggerAudio,
    triggerVoice,
    setActiveTab,
  } = useApp();

  // Active Sub-Tab: "student" | "hall" | "department" | "exam"
  const [subTab, setSubTab] = useState("student");

  // =========================================================================
  // 1. STUDENT REGISTER STATE
  // =========================================================================
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentDept, setStudentDept] = useState("Computer Science & Engineering");
  const [currentAngleIndex, setCurrentAngleIndex] = useState(0);
  const [capturedAngles, setCapturedAngles] = useState({});
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Digital Reference Signature State for Student Registration (Opens Centered Signature Modal)
  const [isRegSigModalOpen, setIsRegSigModalOpen] = useState(false);
  const [regSignaturePreview, setRegSignaturePreview] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // RFID Smart ID Card Attachment State
  const [studentRfidTag, setStudentRfidTag] = useState("");
  const [rfidDuplicateUser, setRfidDuplicateUser] = useState(null);
  const [isRfidHardwareConnected, setIsRfidHardwareConnected] = useState(false);
  const [customRfidInput, setCustomRfidInput] = useState("");
  const lastProcessedRfidEpoch = useRef(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Polling for live hardware RFID tag scans
  useEffect(() => {
    if (subTab !== "student") return;

    const intervalId = setInterval(async () => {
      try {
        const res = await api.getLatestRFID();
        setIsRfidHardwareConnected(!!res.is_connected);

        if (res && res.scanned && res.scan && res.scan.epoch > lastProcessedRfidEpoch.current) {
          lastProcessedRfidEpoch.current = res.scan.epoch;
          const tag = res.scan.tag;

          // Check duplicate RFID
          const existing = users.find((u) => u.rfid_tag && u.rfid_tag.toLowerCase() === tag.toLowerCase());
          if (existing) {
            setRfidDuplicateUser(existing);
            triggerAudio("warning");
            triggerVoice(`Warning! RFID tag already assigned to ${existing.name}`);
            addToast(`⚠️ RFID Card "${tag}" is already assigned to ${existing.name} (ID: ${existing.roll_id || "N/A"})!`, "error");
          } else {
            setRfidDuplicateUser(null);
            setStudentRfidTag(tag);
            triggerAudio("beep");
            triggerVoice("ID Card scanned and attached.");
            addToast(`💳 Student ID Card scanned & attached: ${tag}`, "success");
          }
        }
      } catch (e) {
        // silent polling catch
      }
    }, 800);

    return () => clearInterval(intervalId);
  }, [subTab, users, triggerAudio, triggerVoice, addToast]);

  const angles = [
    { key: "front", name: "Frontal", prompt: "Look straight directly into camera", icon: Circle },
    { key: "left", name: "Turn Left", prompt: "Turn head slightly to the left (~25°)", icon: ArrowLeft },
    { key: "right", name: "Turn Right", prompt: "Turn head slightly to the right (~25°)", icon: ArrowRight },
    { key: "up", name: "Tilt Up", prompt: "Tilt head slightly upwards (~15°)", icon: ArrowUp },
    { key: "down", name: "Tilt Down", prompt: "Tilt head slightly downwards (~15°)", icon: ArrowDown },
  ];

  const currentAngle = angles[currentAngleIndex];

  // Camera stream for Student Register
  useEffect(() => {
    if (subTab !== "student") return;

    async function startCamera() {
      try {
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { width: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (e) {
        console.error("Camera init error:", e);
      }
    }
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [subTab, selectedDeviceId]);

  const handleCapturePose = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const b64 = canvas.toDataURL("image/jpeg", 0.95);

    setCapturedAngles((prev) => ({ ...prev, [currentAngle.key]: b64 }));
    triggerAudio("beep");
    addToast(`Captured ${currentAngle.name} pose!`, "success");

    // Asynchronously validate against already registered faces in the database
    api.validateAngle({ image: b64, angle: currentAngle.key })
      .then((res) => {
        if (res && res.is_already_registered && res.matched_user) {
          setDuplicateWarning(res.matched_user);
          triggerAudio("warning");
          triggerVoice(`Warning! This person is already registered as ${res.matched_user.name}`);
          addToast(
            `⚠️ Duplicate Face: This person is already registered as "${res.matched_user.name}" (ID: ${res.matched_user.roll_id || "N/A"})!`,
            "error"
          );
        } else if (res && !res.is_already_registered) {
          setDuplicateWarning(null);
        }
      })
      .catch(() => {});

    if (currentAngleIndex < angles.length - 1) {
      setCurrentAngleIndex(currentAngleIndex + 1);
    }
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    if (!studentName.trim() || !studentRoll.trim()) {
      addToast("Please enter student name and ID / Roll number", "error");
      return;
    }
    if (Object.keys(capturedAngles).length < 1) {
      addToast("Please capture at least frontal face photo", "warning");
      return;
    }
    if (!regSignaturePreview) {
      triggerAudio("warning");
      addToast("✍️ Digital reference signature is required! Please click the button to take signature.", "warning");
      return;
    }
    if (!studentRfidTag) {
      triggerAudio("warning");
      triggerVoice("Student ID card required. Please scan or enter RFID tag.");
      addToast("💳 Official Student ID Card (RFID) is required! Please scan card.", "warning");
      return;
    }
    if (rfidDuplicateUser) {
      triggerAudio("warning");
      triggerVoice(`RFID Card already assigned to ${rfidDuplicateUser.name}`);
      addToast(`⚠️ RFID Card "${studentRfidTag}" is already assigned to ${rfidDuplicateUser.name}!`, "error");
      return;
    }
    if (duplicateWarning) {
      triggerAudio("warning");
      triggerVoice(`Registration rejected. This person is already registered as ${duplicateWarning.name}`);
      addToast(`⚠️ Registration rejected! This person is already registered as "${duplicateWarning.name}" (ID: ${duplicateWarning.roll_id || "N/A"}).`, "error");
      return;
    }

    setIsSubmittingStudent(true);
    try {
      const formData = new FormData();
      formData.append("name", studentName.trim());
      formData.append("roll_id", studentRoll.trim());
      formData.append("department", studentDept.trim());
      formData.append("rfid_tag", studentRfidTag.trim());

      for (const [k, b64] of Object.entries(capturedAngles)) {
        const res = await fetch(b64);
        const blob = await res.blob();
        formData.append(k, blob, `${k}.jpg`);
      }

      // Attach Mandatory Reference Digital Signature
      const sigRes = await fetch(regSignaturePreview);
      const sigBlob = await sigRes.blob();
      formData.append("signature", sigBlob, "signature.png");

      await api.registerCandidate(formData);
      triggerAudio("success");
      triggerVoice(`Student ${studentName} registered with ID ${studentRoll} and RFID Card.`);
      addToast(`🎓 Student "${studentName}" registered successfully with Face, Signature & RFID Card!`, "success");

      setStudentName("");
      setStudentRoll("");
      setStudentRfidTag("");
      setRfidDuplicateUser(null);
      setCustomRfidInput("");
      setCapturedAngles({});
      setCurrentAngleIndex(0);
      setRegSignaturePreview(null);
      setDuplicateWarning(null);
      await loadUsers();
    } catch (err) {
      triggerAudio("warning");
      triggerVoice("Registration failed. Please check candidate details.");
      addToast(`Student registration error: ${err.message}`, "error");
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // =========================================================================
  // 2. EXAM HALL REGISTER & IN-HALL STUDENT MANAGEMENT STATE
  // =========================================================================
  const [hallTower, setHallTower] = useState("");
  const [hallRoomNo, setHallRoomNo] = useState("");
  const [hallCapacity, setHallCapacity] = useState(40);
  const [isSubmittingHall, setIsSubmittingHall] = useState(false);
  const [editingHall, setEditingHall] = useState(null);

  // Hall Student Manager Modal State
  const [activeHallForStudents, setActiveHallForStudents] = useState(null);
  const [hallAllocations, setHallAllocations] = useState([]);
  const [isLoadingHallStudents, setIsLoadingHallStudents] = useState(false);
  const [hallStudentSearch, setHallStudentSearch] = useState("");
  const [showAddStudentDrawer, setShowAddStudentDrawer] = useState(false);
  const [hallAssignDept, setHallAssignDept] = useState("");
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState("");
  const [customSeatInput, setCustomSeatInput] = useState("");
  const [editingSeatCandidateId, setEditingSeatCandidateId] = useState(null);
  const [editSeatValue, setEditSeatValue] = useState("");

  const handleRegisterHall = async (e) => {
    e.preventDefault();
    if (!hallRoomNo.trim()) {
      addToast("Please enter Room number / Hall name", "error");
      return;
    }

    setIsSubmittingHall(true);
    try {
      const fullName = hallTower.trim()
        ? `${hallRoomNo.trim()} - ${hallTower.trim()}`
        : hallRoomNo.trim();

      await api.createRoom({
        name: fullName,
        building: hallTower.trim() || "Main Campus Building",
        capacity: Number(hallCapacity) || 40,
      });

      triggerAudio("success");
      addToast(`🏢 Exam Hall "${fullName}" registered with capacity ${hallCapacity}!`, "success");

      setHallTower("");
      setHallRoomNo("");
      setHallCapacity(40);
      await loadRooms();
      await loadAllocations();
    } catch (err) {
      addToast(`Hall registration error: ${err.message}`, "error");
    } finally {
      setIsSubmittingHall(false);
    }
  };

  const handleStartEditHall = (hall) => {
    setEditingHall(hall);
    setHallRoomNo(hall.name);
    setHallTower(hall.building || "");
    setHallCapacity(hall.capacity || 40);
  };

  const handleCancelEditHall = () => {
    setEditingHall(null);
    setHallRoomNo("");
    setHallTower("");
    setHallCapacity(40);
  };

  const handleSaveEditHall = async (e) => {
    e.preventDefault();
    if (!editingHall || !hallRoomNo.trim()) {
      addToast("Please enter Room number / Hall name", "error");
      return;
    }
    setIsSubmittingHall(true);
    try {
      await api.updateRoom(editingHall.id, {
        name: hallRoomNo.trim(),
        building: hallTower.trim() || "Main Campus Building",
        capacity: Number(hallCapacity) || 40,
      });
      triggerAudio("success");
      addToast(`Exam Hall "${hallRoomNo}" updated successfully!`, "success");
      handleCancelEditHall();
      await loadRooms();
      await loadAllocations();
    } catch (err) {
      addToast(`Error updating hall: ${err.message}`, "error");
    } finally {
      setIsSubmittingHall(false);
    }
  };

  const handleDeleteHall = async (hallId, hallName) => {
    if (!confirm(`Are you sure you want to delete exam hall "${hallName}"? Students allocated to this hall will be unassigned.`)) return;
    try {
      await api.deleteRoom(hallId);
      triggerAudio("warning");
      addToast(`Exam hall "${hallName}" deleted.`, "warning");
      if (editingHall?.id === hallId) handleCancelEditHall();
      if (activeHallForStudents?.id === hallId) setActiveHallForStudents(null);
      await loadRooms();
      await loadAllocations();
    } catch (err) {
      addToast(`Delete error: ${err.message}`, "error");
    }
  };

  const handleOpenHallStudents = async (hall) => {
    setActiveHallForStudents(hall);
    setIsLoadingHallStudents(true);
    setShowAddStudentDrawer(false);
    setHallAssignDept("");
    setSelectedStudentToAssign("");
    const currentCount = (allocations || []).filter((a) => a.room_id === hall.id).length;
    setCustomSeatInput(`Seat A-${currentCount + 1 < 10 ? "0" : ""}${currentCount + 1}`);
    try {
      const res = await api.getRoomAllocations(hall.id);
      setHallAllocations(res.allocations || []);
    } catch (err) {
      console.error(err);
      addToast("Failed to load hall students", "error");
    } finally {
      setIsLoadingHallStudents(false);
    }
  };

  const handleRemoveStudentFromHall = async (candidateId, candidateName) => {
    if (!activeHallForStudents) return;
    try {
      await api.removeCandidateFromRoom(activeHallForStudents.id, candidateId);
      triggerAudio("warning");
      addToast(`Removed ${candidateName} from ${activeHallForStudents.name}`, "warning");
      const res = await api.getRoomAllocations(activeHallForStudents.id);
      setHallAllocations(res.allocations || []);
      await loadAllocations();
    } catch (err) {
      addToast(`Error: ${err.message}`, "error");
    }
  };

  const handleSaveSeatNumber = async (candidateId) => {
    if (!activeHallForStudents || !editSeatValue.trim()) return;
    try {
      await api.saveAllocation({
        candidate_id: candidateId,
        room_id: activeHallForStudents.id,
        seat_number: editSeatValue.trim(),
      });
      addToast(`Updated seat to ${editSeatValue.trim()}`, "success");
      setEditingSeatCandidateId(null);
      const res = await api.getRoomAllocations(activeHallForStudents.id);
      setHallAllocations(res.allocations || []);
      await loadAllocations();
    } catch (err) {
      addToast(`Error updating seat: ${err.message}`, "error");
    }
  };

  const handleAssignStudentToHall = async () => {
    if (!activeHallForStudents || !selectedStudentToAssign) {
      addToast("Please select a student to assign", "error");
      return;
    }
    try {
      const stdObj = (users || []).find((u) => u.id === selectedStudentToAssign);
      const totalIdx = hallAllocations.length;
      const rowChar = String.fromCharCode(65 + Math.floor(totalIdx / 20));
      const colNum = (totalIdx % 20) + 1;
      const seatNum = `Seat ${rowChar}-${colNum < 10 ? "0" : ""}${colNum}`;

      await api.saveAllocation({
        candidate_id: selectedStudentToAssign,
        room_id: activeHallForStudents.id,
        seat_number: seatNum,
      });
      triggerAudio("success");
      addToast(`Assigned ${stdObj?.name || "Student"} to ${activeHallForStudents.name} (${seatNum})`, "success");
      setSelectedStudentToAssign("");
      const res = await api.getRoomAllocations(activeHallForStudents.id);
      setHallAllocations(res.allocations || []);
      await loadAllocations();
    } catch (err) {
      addToast(`Assignment error: ${err.message}`, "error");
    }
  };

  const handleAssignAllDeptStudentsToHall = async (deptCandidates) => {
    if (!activeHallForStudents || !deptCandidates || deptCandidates.length === 0) return;
    try {
      const existingCandidateIds = new Set(hallAllocations.map((a) => a.candidate_id));
      const candidatesToAdd = deptCandidates.filter((c) => !existingCandidateIds.has(c.id));
      if (candidatesToAdd.length === 0) {
        addToast("All students from this department are already assigned to this hall", "warning");
        return;
      }

      const startIndex = hallAllocations.length;
      const newAssignments = [
        ...hallAllocations.map((a) => ({
          candidate_id: a.candidate_id,
          seat_number: a.seat_number,
          admit_status: a.admit_status || "CLEARED",
        })),
        ...candidatesToAdd.map((c, idx) => {
          const totalIdx = startIndex + idx;
          const rowChar = String.fromCharCode(65 + Math.floor(totalIdx / 20));
          const colNum = (totalIdx % 20) + 1;
          const seatNum = `Seat ${rowChar}-${colNum < 10 ? "0" : ""}${colNum}`;
          return {
            candidate_id: c.id,
            seat_number: seatNum,
            admit_status: "CLEARED",
          };
        }),
      ];

      await api.batchAllocateRoom(activeHallForStudents.id, newAssignments);
      triggerAudio("success");
      addToast(`Added ${candidatesToAdd.length} students from ${hallAssignDept || "selected department"} to ${activeHallForStudents.name}!`, "success");
      const res = await api.getRoomAllocations(activeHallForStudents.id);
      setHallAllocations(res.allocations || []);
      await loadAllocations();
    } catch (err) {
      addToast(`Batch assign error: ${err.message}`, "error");
    }
  };

  const handleAutoNumberSeatsInHall = async () => {
    if (!activeHallForStudents || hallAllocations.length === 0) {
      addToast("No students in this hall to auto-number", "error");
      return;
    }
    try {
      const assignments = hallAllocations.map((alloc, idx) => ({
        candidate_id: alloc.candidate_id,
        seat_number: `Seat ${String.fromCharCode(65 + Math.floor(idx / 20))}-${(idx % 20) + 1 < 10 ? "0" : ""}${(idx % 20) + 1}`,
        admit_status: alloc.admit_status || "CLEARED",
      }));
      await api.batchAllocateRoom(activeHallForStudents.id, assignments);
      triggerAudio("success");
      addToast(`Auto-numbered ${assignments.length} seats in ${activeHallForStudents.name}!`, "success");
      const res = await api.getRoomAllocations(activeHallForStudents.id);
      setHallAllocations(res.allocations || []);
      await loadAllocations();
    } catch (err) {
      addToast(`Error auto-numbering seats: ${err.message}`, "error");
    }
  };

  const handleDeleteCandidateFromDb = async (candidateId, candidateName) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete candidate "${candidateName}" from the universal database?`)) return;
    try {
      await api.deleteUser(candidateId);
      triggerAudio("warning");
      addToast(`Permanently deleted candidate "${candidateName}"`, "warning");
      if (activeHallForStudents) {
        const res = await api.getRoomAllocations(activeHallForStudents.id);
        setHallAllocations(res.allocations || []);
      }
      await loadUsers();
      await loadAllocations();
    } catch (err) {
      addToast(`Delete error: ${err.message}`, "error");
    }
  };

  // =========================================================================
  // 3. DEPARTMENT & COURSE MANAGER STATE
  // =========================================================================
  const [deptNameInput, setDeptNameInput] = useState("");
  const [deptCodeInput, setDeptCodeInput] = useState("");
  const [isAddingDept, setIsAddingDept] = useState(false);

  // Edit Department Modal State
  const [editingDept, setEditingDept] = useState(null);
  const [editDeptName, setEditDeptName] = useState("");
  const [editDeptCode, setEditDeptCode] = useState("");

  // Add / Edit Course Modal State
  const [courseModalDept, setCourseModalDept] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseTitleInput, setCourseTitleInput] = useState("");
  const [courseCodeInput, setCourseCodeInput] = useState("");
  const [courseStudentsInput, setCourseStudentsInput] = useState([]);
  const [courseStudentSearch, setCourseStudentSearch] = useState("");

  // Enroll Students Modal State
  const [enrollModalContext, setEnrollModalContext] = useState(null);
  const [courseEnrolledIds, setCourseEnrolledIds] = useState([]);
  const [enrollDeptFilter, setEnrollDeptFilter] = useState("DEPT_ONLY"); // "DEPT_ONLY" | "ALL" | "ENROLLED"
  const [enrollSearchQuery, setEnrollSearchQuery] = useState("");
  const [enrollQuickStudentId, setEnrollQuickStudentId] = useState("");

  // Create Department
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!deptNameInput.trim()) {
      addToast("Please enter Department Name", "error");
      return;
    }

    setIsAddingDept(true);
    try {
      await api.createDepartment({
        name: deptNameInput.trim(),
        code: deptCodeInput.trim().toUpperCase(),
      });
      triggerAudio("success");
      addToast(`🏫 Department "${deptNameInput}" created!`, "success");
      setDeptNameInput("");
      setDeptCodeInput("");
      await loadDepartments();
    } catch (err) {
      addToast(`Error adding department: ${err.message}`, "error");
    } finally {
      setIsAddingDept(false);
    }
  };

  // Update Department
  const handleSaveEditDepartment = async () => {
    if (!editingDept) return;
    try {
      await api.updateDepartment(editingDept.id, {
        name: editDeptName.trim(),
        code: editDeptCode.trim().toUpperCase(),
      });
      addToast("Department updated", "success");
      setEditingDept(null);
      await loadDepartments();
    } catch (e) {
      addToast(`Update error: ${e.message}`, "error");
    }
  };

  // Delete Department
  const handleDeleteDepartment = async (deptId, name) => {
    if (!confirm(`Are you sure you want to delete department "${name}" and all courses under it?`)) return;
    try {
      await api.deleteDepartment(deptId);
      addToast(`Department "${name}" deleted`, "warning");
      await loadDepartments();
    } catch (e) {
      addToast(`Delete error: ${e.message}`, "error");
    }
  };

  // Save / Update Course
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseModalDept || !courseTitleInput.trim()) {
      addToast("Please enter Course Title", "error");
      return;
    }

    try {
      if (editingCourse) {
        await api.updateCourse(courseModalDept.id, editingCourse.id, {
          title: courseTitleInput.trim(),
          code: courseCodeInput.trim().toUpperCase(),
          enrolled_student_ids: courseStudentsInput,
        });
        addToast("Course updated successfully", "success");
      } else {
        await api.createCourse(courseModalDept.id, {
          title: courseTitleInput.trim(),
          code: courseCodeInput.trim().toUpperCase(),
          enrolled_student_ids: courseStudentsInput,
        });
        addToast(`Course "${courseTitleInput}" created with ${courseStudentsInput.length} enrolled students!`, "success");
      }
      setCourseModalDept(null);
      setEditingCourse(null);
      setCourseTitleInput("");
      setCourseCodeInput("");
      setCourseStudentsInput([]);
      setCourseStudentSearch("");
      await loadDepartments();
    } catch (err) {
      addToast(`Course save error: ${err.message}`, "error");
    }
  };

  // Delete Course
  const handleDeleteCourse = async (deptId, courseId, title) => {
    if (!confirm(`Delete course "${title}"?`)) return;
    try {
      await api.deleteCourse(deptId, courseId);
      addToast(`Course "${title}" deleted`, "warning");
      await loadDepartments();
    } catch (e) {
      addToast(`Delete error: ${e.message}`, "error");
    }
  };

  // Helper to match student department with dept name or code
  const isStudentInDept = (userDept, dept) => {
    if (!userDept || !dept) return false;
    const uD = userDept.toLowerCase().trim();
    const dN = (dept.name || "").toLowerCase().trim();
    const dC = (dept.code || "").toLowerCase().trim();
    return uD === dN || uD === dC || (dC && uD.includes(dC)) || (dN && dN.includes(uD));
  };

  // Open Enroll Modal
  const handleOpenEnrollModal = (dept, course) => {
    setEnrollModalContext({ dept, course });
    setCourseEnrolledIds(course.enrolled_student_ids || []);
    setEnrollDeptFilter("DEPT_ONLY");
    setEnrollSearchQuery("");
    setEnrollQuickStudentId("");
  };

  // Quick toggle a student in course enrollment
  const handleToggleCourseStudent = (studentId) => {
    if (courseEnrolledIds.includes(studentId)) {
      setCourseEnrolledIds(courseEnrolledIds.filter((id) => id !== studentId));
    } else {
      setCourseEnrolledIds([...courseEnrolledIds, studentId]);
    }
  };

  // Quick add student from dropdown
  const handleQuickAddStudentToCourse = () => {
    if (!enrollQuickStudentId) return;
    if (!courseEnrolledIds.includes(enrollQuickStudentId)) {
      setCourseEnrolledIds([...courseEnrolledIds, enrollQuickStudentId]);
      const userObj = users.find((u) => u.id === enrollQuickStudentId);
      addToast(`Added ${userObj?.name || "Student"} to course enrollment`, "info");
      setEnrollQuickStudentId("");
    }
  };

  // Select all students of this department
  const handleSelectAllDeptStudents = (dept) => {
    const deptStudents = users.filter((u) => isStudentInDept(u.department, dept));
    const newIds = Array.from(new Set([...courseEnrolledIds, ...deptStudents.map((u) => u.id)]));
    setCourseEnrolledIds(newIds);
    addToast(`Selected all ${deptStudents.length} students from ${dept.name}`, "info");
  };

  // Save Student Enrollment in Course
  const handleSaveCourseEnrollment = async () => {
    if (!enrollModalContext) return;
    const { dept, course } = enrollModalContext;
    try {
      await api.enrollStudentsInCourse(dept.id, course.id, courseEnrolledIds);
      triggerAudio("success");
      addToast(`Enrolled ${courseEnrolledIds.length} students in "${course.code} - ${course.title}"!`, "success");
      setEnrollModalContext(null);
      await loadDepartments();
    } catch (e) {
      addToast(`Enrollment error: ${e.message}`, "error");
    }
  };

  // =========================================================================
  // 4. EXAM CREATE & MULTI-HALL STUDENT RANGE ALLOCATION STATE
  // =========================================================================
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [examStartTime, setExamStartTime] = useState("09:00");
  const [examEndTime, setExamEndTime] = useState("12:00");
  const [examWashroomLimit, setExamWashroomLimit] = useState(10);
  const [selectedDeptForExam, setSelectedDeptForExam] = useState(departments[0]?.name || "Computer Science & Engineering");
  const [selectedCourseCode, setSelectedCourseCode] = useState("CSE-2101");
  const [examCustomTitle, setExamCustomTitle] = useState("Data Structures & Algorithms - Final");
  
  // Multi-hall states
  const [selectedHallIds, setSelectedHallIds] = useState(rooms.map((r) => r.id));
  const [activeHallForAllocation, setActiveHallForAllocation] = useState(rooms[0]?.id || "");
  const [hallStudentMap, setHallStudentMap] = useState({}); // { [hallId]: [student_ids] }
  const [studentClearanceMap, setStudentClearanceMap] = useState({}); // { [student_id]: "CLEARED" | "PENDING_DUES" | ... }
  const [rangeAssignCount, setRangeAssignCount] = useState(30);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);

  // Sync active hall if rooms load
  useEffect(() => {
    if (rooms.length > 0 && !activeHallForAllocation) {
      setActiveHallForAllocation(rooms[0].id);
    }
  }, [rooms, activeHallForAllocation]);

  // Synchronize department selection for exam create
  useEffect(() => {
    if (departments.length > 0 && !departments.find((d) => d.name === selectedDeptForExam)) {
      setSelectedDeptForExam(departments[0].name);
    }
  }, [departments, selectedDeptForExam]);

  // Current selected department object
  const currentDeptObj = useMemo(() => {
    return departments.find((d) => d.name === selectedDeptForExam) || departments[0];
  }, [departments, selectedDeptForExam]);

  // Current selected course object
  const currentCourseObj = useMemo(() => {
    return (currentDeptObj?.courses || []).find((c) => c.code === selectedCourseCode);
  }, [currentDeptObj, selectedCourseCode]);

  // Filter students: STRICTLY filter students who are enrolled in the selected course!
  const eligibleStudents = useMemo(() => {
    if (currentCourseObj) {
      const enrolledIds = currentCourseObj.enrolled_student_ids || [];
      return users.filter((u) => enrolledIds.includes(u.id));
    }
    return [];
  }, [users, currentCourseObj]);

  // Compute total enrolled student IDs across all halls
  const enrolledStudentIds = useMemo(() => {
    const all = new Set();
    Object.values(hallStudentMap).forEach((arr) => {
      if (Array.isArray(arr)) arr.forEach((id) => all.add(id));
    });
    return Array.from(all);
  }, [hallStudentMap]);

  // Compute unassigned eligible students
  const unassignedStudents = useMemo(() => {
    return eligibleStudents.filter((std) => !enrolledStudentIds.includes(std.id));
  }, [eligibleStudents, enrolledStudentIds]);

  // Handle setting student clearance status (CLEARED, PENDING_DUES, NO_ADMIT_CARD, BLOCKED)
  const handleSetStudentClearance = (stdId, status) => {
    setStudentClearanceMap((prev) => ({ ...prev, [stdId]: status }));
  };

  // Toggle hall selection in Step 3
  const handleToggleExamHall = (hallId) => {
    if (selectedHallIds.includes(hallId)) {
      const nextHalls = selectedHallIds.filter((h) => h !== hallId);
      setSelectedHallIds(nextHalls);
      const nextMap = { ...hallStudentMap };
      delete nextMap[hallId];
      setHallStudentMap(nextMap);
      if (activeHallForAllocation === hallId) {
        setActiveHallForAllocation(nextHalls[0] || "");
      }
    } else {
      setSelectedHallIds([...selectedHallIds, hallId]);
      if (!activeHallForAllocation) setActiveHallForAllocation(hallId);
    }
  };

  // Toggle student assignment for active hall
  const handleToggleStudentForActiveHall = (stdId) => {
    if (!activeHallForAllocation) {
      addToast("Please select an active exam hall first", "warning");
      return;
    }

    // Check if assigned to another hall
    const otherHallId = Object.keys(hallStudentMap).find(
      (hId) => hId !== activeHallForAllocation && (hallStudentMap[hId] || []).includes(stdId)
    );

    if (otherHallId) {
      const otherRoom = rooms.find((r) => r.id === otherHallId);
      addToast(
        `Student is locked in "${otherRoom?.name || otherHallId}". Unassign from that hall first.`,
        "warning"
      );
      return;
    }

    const currentList = hallStudentMap[activeHallForAllocation] || [];
    let updated;
    if (currentList.includes(stdId)) {
      updated = currentList.filter((x) => x !== stdId);
    } else {
      updated = [...currentList, stdId];
    }

    setHallStudentMap({
      ...hallStudentMap,
      [activeHallForAllocation]: updated,
    });
  };

  // Range Auto-Assign to active hall
  const handleAssignRangeToActiveHall = (count) => {
    if (!activeHallForAllocation) {
      addToast("Please select an active exam hall first", "warning");
      return;
    }
    const numToAssign = Math.min(count, unassignedStudents.length);
    if (numToAssign <= 0) {
      addToast("No unassigned students available to assign", "warning");
      return;
    }

    const idsToAssign = unassignedStudents.slice(0, numToAssign).map((s) => s.id);
    const existing = hallStudentMap[activeHallForAllocation] || [];
    const updated = Array.from(new Set([...existing, ...idsToAssign]));

    setHallStudentMap({
      ...hallStudentMap,
      [activeHallForAllocation]: updated,
    });

    const activeRoom = rooms.find((r) => r.id === activeHallForAllocation);
    addToast(
      `Assigned next ${numToAssign} unassigned students to "${activeRoom?.name || activeHallForAllocation}"!`,
      "success"
    );
  };

  // Clear assignments for active hall
  const handleClearActiveHallAssignments = () => {
    if (!activeHallForAllocation) return;
    setHallStudentMap({
      ...hallStudentMap,
      [activeHallForAllocation]: [],
    });
    const activeRoom = rooms.find((r) => r.id === activeHallForAllocation);
    addToast(`Cleared assignments for "${activeRoom?.name || activeHallForAllocation}"`, "info");
  };

  // When department changes in exam create
  const handleDeptChange = (deptName) => {
    setSelectedDeptForExam(deptName);
    const targetDept = departments.find((d) => d.name === deptName);
    const availableCourses = targetDept?.courses || [];
    if (availableCourses.length > 0) {
      setSelectedCourseCode(availableCourses[0].code);
      setExamCustomTitle(`${availableCourses[0].title} - Semester Final`);
    } else {
      setSelectedCourseCode("CRS-101");
      setExamCustomTitle(`${deptName} - Exam Session`);
    }
    setHallStudentMap({});
  };

  const handleCourseSelect = (course) => {
    setSelectedCourseCode(course.code);
    setExamCustomTitle(`${course.title} - Semester Final`);
    setHallStudentMap({});
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!examCustomTitle.trim()) {
      addToast("Please provide an Exam Subject / Course Title", "error");
      return;
    }
    if (selectedHallIds.length === 0) {
      addToast("Please select at least one assigned exam hall", "warning");
      return;
    }

    setIsSubmittingExam(true);
    try {
      await api.createSchedule({
        title: examCustomTitle.trim(),
        course_code: selectedCourseCode.trim(),
        date: examDate,
        start_time: examStartTime,
        end_time: examEndTime,
        departments: [selectedDeptForExam],
        hall_ids: selectedHallIds,
        washroom_limit_minutes: Number(examWashroomLimit) || 10,
        entry_grace_minutes: 30,
        enrolled_student_ids: enrolledStudentIds,
        student_clearance_map: studentClearanceMap,
        hall_student_map: hallStudentMap,
      });

      triggerAudio("success");
      addToast(`📝 Exam "${examCustomTitle}" created with ${enrolledStudentIds.length} candidates assigned to ${selectedHallIds.length} halls!`, "success");
      await loadSchedules();
      setActiveTab("schedules");
    } catch (err) {
      addToast(`Exam creation error: ${err.message}`, "error");
    } finally {
      setIsSubmittingExam(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Registration Selector Navigation Tabs */}
      <div className="glass-panel p-4 flex items-center justify-between flex-wrap gap-4 border-sky-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-neon-cyan">
            <Layers className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Registration & Setup Hub</h2>
            <p className="text-xs text-slate-400">
              Complete enrollment portal for Students, Exam Halls, Departments & Courses, and Exam Create.
            </p>
          </div>
        </div>

        {/* 4 Main Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 flex-wrap">
          <button
            onClick={() => setSubTab("student")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              subTab === "student"
                ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <UserPlus className="w-4 h-4" /> 1) Student Register
          </button>

          <button
            onClick={() => setSubTab("hall")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              subTab === "hall"
                ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Building className="w-4 h-4" /> 2) Exam Hall Register
          </button>

          <button
            onClick={() => setSubTab("department")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              subTab === "department"
                ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <BookOpen className="w-4 h-4" /> 3) Dept & Courses
          </button>

          <button
            onClick={() => setSubTab("exam")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              subTab === "exam"
                ? "bg-cyan-500 text-slate-950 shadow-neon-cyan"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <CalendarPlus className="w-4 h-4" /> 4) Exam Create & Enroll
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. STUDENT REGISTER VIEW                                                 */}
      {/* ========================================================================= */}
      {subTab === "student" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: 5-Angle Camera Studio (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden glass-panel border-2 border-sky-500/30 bg-slate-950 flex items-center justify-center shadow-2xl">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${isMirrored ? "-scale-x-100" : ""}`}
              />

              {/* Central Dotted Face Placement Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-15">
                <div className="relative w-44 h-60 sm:w-52 sm:h-68 rounded-[50%] border-2 border-dashed border-cyber-cyan/80 shadow-[0_0_20px_rgba(0,240,255,0.3)] flex flex-col items-center justify-between p-3 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-cyber-cyan shadow-neon-cyan mt-1" />
                  <div className="text-cyber-cyan font-mono text-lg opacity-60">+</div>
                  <div className="flex flex-col items-center gap-0.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-cyber-cyan shadow-neon-cyan" />
                  </div>
                  <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan" />
                  <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-cyber-cyan" />
                  <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-cyber-cyan" />
                  <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-cyber-cyan" />
                </div>
                <span className="mt-2 text-[10px] font-mono font-bold text-cyan-300 bg-slate-950/85 px-3 py-0.5 rounded-full border border-cyan-500/40 backdrop-blur-md">
                  📍 Position Face Inside Dotted Oval
                </span>
              </div>

              <div className="absolute top-4 inset-x-4 flex justify-between items-center z-20">
                <span className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700 text-xs font-mono font-bold text-cyan-400 backdrop-blur-md">
                  BIOMETRIC POSE {currentAngleIndex + 1}/5: {currentAngle.name.toUpperCase()}
                </span>
              </div>

              <div className="absolute bottom-4 inset-x-4 p-3 rounded-xl bg-slate-950/85 border border-slate-700/80 backdrop-blur-md flex items-center justify-between z-20">
                <span className="text-xs font-semibold text-slate-200">{currentAngle.prompt}</span>
                <button
                  type="button"
                  onClick={handleCapturePose}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-neon-cyan"
                >
                  <Camera className="w-4 h-4" /> Capture Angle
                </button>
              </div>
            </div>

            {/* Poses selector chips */}
            <div className="grid grid-cols-5 gap-2">
              {angles.map((ang, idx) => {
                const Icon = ang.icon;
                const isCaptured = !!capturedAngles[ang.key];
                const isCurrent = currentAngleIndex === idx;

                return (
                  <button
                    key={ang.key}
                    type="button"
                    onClick={() => setCurrentAngleIndex(idx)}
                    className={`p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition border ${
                      isCurrent
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyber-cyan shadow-neon-cyan"
                        : isCaptured
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : "bg-slate-900/60 border-slate-800 text-slate-500"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase">{ang.name}</span>
                    {isCaptured ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Student Information Form (5 cols) */}
          <div className="lg:col-span-5 glass-panel p-6 flex flex-col gap-4 border-sky-500/20">
            <div className="flex items-center gap-2 text-cyber-cyan pb-3 border-b border-slate-800">
              <UserPlus className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Student Biometric Enrollment</h3>
            </div>

            <form onSubmit={handleRegisterStudent} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Student Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Imran Hossain"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Student ID / Roll Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  placeholder="e.g. 2024-14-101"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Department <span className="text-rose-400">*</span>
                </label>
                {departments && departments.length > 0 ? (
                  <select
                    value={studentDept}
                    onChange={(e) => setStudentDept(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id || dept.name} value={dept.name}>
                        {dept.name} {dept.code ? `(${dept.code})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={studentDept}
                    onChange={(e) => setStudentDept(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering (CSE)</option>
                    <option value="Electrical & Electronic Engineering">Electrical & Electronic Engineering (EEE)</option>
                    <option value="Business Administration">Business Administration (BBA)</option>
                    <option value="Civil Engineering">Civil Engineering (CE)</option>
                    <option value="Mechanical Engineering">Mechanical Engineering (ME)</option>
                  </select>
                )}
              </div>

              {/* Photos Preview */}
              <div className="pt-1">
                <label className="block text-slate-400 font-semibold mb-2">Captured Facial Embeddings</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {angles.map((ang) => (
                    <div
                      key={ang.key}
                      className="w-full aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center"
                    >
                      {capturedAngles[ang.key] ? (
                        <img src={capturedAngles[ang.key]} alt={ang.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-slate-600 uppercase font-mono">{ang.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Biometric Digital Signature Registration Pad */}
              <div className="pt-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>Official Reference Signature</span>
                    <span className="text-rose-400 font-bold">*</span>
                    <span className="text-cyan-400 font-mono text-[10px]">(Huion H640P Pad / Mouse)</span>
                  </label>

                  {regSignaturePreview && (
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  )}
                </div>

                {!regSignaturePreview ? (
                  <button
                    type="button"
                    onClick={() => setIsRegSigModalOpen(true)}
                    className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-cyan-500/50 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 flex flex-col items-center justify-center gap-2 transition group cursor-pointer shadow-lg shadow-cyan-950/30"
                  >
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 group-hover:bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <PenTool className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold text-white group-hover:text-cyan-200 flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        Take Digital Signature (Open Pad)
                      </div>
                      <div className="text-[11px] font-mono text-cyan-400/80 mt-0.5">
                        Click to open centered digital signature capture pad
                      </div>
                    </div>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reference Signature Captured
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsRegSigModalOpen(true)}
                          className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Re-Sign / Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegSignaturePreview(null)}
                          className="px-2 py-1 rounded text-[11px] font-mono text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Clear
                        </button>
                      </div>
                    </div>

                    {/* Large High-Contrast Preview Display */}
                    <div className="h-28 w-full rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden p-2 shadow-inner">
                      <img
                        src={regSignaturePreview}
                        alt="Signature Preview"
                        className="max-h-full max-w-full object-contain filter brightness-125"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Centered Digital Signature Modal */}
              <SignatureModal
                isOpen={isRegSigModalOpen}
                onClose={() => setIsRegSigModalOpen(false)}
                candidateName={studentName || "New Candidate"}
                rollId={studentRoll || "Pending Registration"}
                initialSignature={regSignaturePreview}
                onAcceptSignature={(dataUrl) => {
                  setRegSignaturePreview(dataUrl);
                  setIsRegSigModalOpen(false);
                  addToast("✍️ Digital reference signature captured!", "success");
                }}
              />

              {/* 3. Official Student ID Card (RFID Smart Card) Attachment */}
              <div className="pt-1 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Tablet className="w-3.5 h-3.5 text-cyber-cyan" />
                    <span>Official Student ID Card (RFID)</span>
                    <span className="text-rose-400 font-bold">*</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {isRfidHardwareConnected ? (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Hardware Reader Online
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                        Serial Standby / Test Mode
                      </span>
                    )}

                    {studentRfidTag && !rfidDuplicateUser && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                        <CheckCircle2 className="w-3 h-3" /> Attached
                      </span>
                    )}
                  </div>
                </div>

                {!studentRfidTag ? (
                  <div className="p-3.5 rounded-xl border-2 border-dashed border-cyan-500/40 bg-cyan-950/20 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 animate-pulse">
                        <Tablet className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          Tap Student RFID ID Card on Reader
                        </span>
                        <span className="text-[11px] font-mono text-cyan-300/80">
                          Automatic detection active. Place card near Arduino EM-18 / RC522 scanner.
                        </span>
                      </div>
                    </div>

                    {/* Manual / Simulated RFID Tag Input */}
                    <div className="flex items-center gap-2 pt-2 border-t border-cyan-500/20">
                      <input
                        type="text"
                        value={customRfidInput}
                        onChange={(e) => setCustomRfidInput(e.target.value)}
                        placeholder="Or enter RFID Tag manually e.g. 0015122682"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyber-cyan"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (customRfidInput.trim()) {
                              api.scanRFID(customRfidInput.trim()).then((res) => {
                                const tag = customRfidInput.trim();
                                const existing = users.find((u) => u.rfid_tag && u.rfid_tag.toLowerCase() === tag.toLowerCase());
                                if (existing) {
                                  setRfidDuplicateUser(existing);
                                  addToast(`⚠️ RFID Card "${tag}" already assigned to ${existing.name}!`, "error");
                                } else {
                                  setRfidDuplicateUser(null);
                                  setStudentRfidTag(tag);
                                  addToast(`💳 RFID ID Card linked: ${tag}`, "success");
                                }
                              });
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customRfidInput.trim()) return;
                          const tag = customRfidInput.trim();
                          api.scanRFID(tag).then(() => {
                            const existing = users.find((u) => u.rfid_tag && u.rfid_tag.toLowerCase() === tag.toLowerCase());
                            if (existing) {
                              setRfidDuplicateUser(existing);
                              addToast(`⚠️ RFID Card "${tag}" already assigned to ${existing.name}!`, "error");
                            } else {
                              setRfidDuplicateUser(null);
                              setStudentRfidTag(tag);
                              addToast(`💳 RFID ID Card linked: ${tag}`, "success");
                            }
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
                      >
                        Link Card
                      </button>
                    </div>

                    {/* Quick Demo RFID presets */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                      <span className="text-slate-400">Quick Test Tap:</span>
                      {["0015122682", "0005036860", "0015169233", "0015199821"].map((demoTag) => (
                        <button
                          key={demoTag}
                          type="button"
                          onClick={() => {
                            api.scanRFID(demoTag);
                            setCustomRfidInput(demoTag);
                          }}
                          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition"
                        >
                          {demoTag}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex items-center justify-between shadow-lg shadow-emerald-950/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <Tablet className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ID Card Tag Linked
                        </span>
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          RFID UID: <strong className="text-emerald-300 tracking-wider">{studentRfidTag}</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStudentRfidTag("");
                        setRfidDuplicateUser(null);
                        setCustomRfidInput("");
                        addToast("RFID ID Card unlinked", "info");
                      }}
                      className="px-2.5 py-1 rounded text-[11px] font-mono text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Re-Scan
                    </button>
                  </div>
                )}

                {/* Duplicate RFID Warning Banner */}
                {rfidDuplicateUser && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 flex items-start gap-2.5 animate-pulse text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-rose-100 font-bold block">⚠️ RFID Card Conflict:</strong>
                      <span>
                        This card is already registered to candidate <strong>{rfidDuplicateUser.name}</strong> (Roll ID: {rfidDuplicateUser.roll_id || "N/A"}). Please scan a unique student ID card.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Duplicate Face Warning Banner */}
              {duplicateWarning && (
                <div className="p-3.5 rounded-xl bg-rose-950/70 border-2 border-rose-500/80 text-rose-200 flex items-start gap-3 shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-xs text-rose-100 flex items-center gap-1.5">
                      ⚠️ Person Already Registered!
                    </span>
                    <p className="text-[11px] leading-relaxed text-rose-200/90">
                      This face matches already registered candidate{" "}
                      <strong className="text-white font-bold underline">{duplicateWarning.name}</strong>{" "}
                      (ID / Roll: <span className="font-mono font-bold text-cyan-300">{duplicateWarning.roll_id || "N/A"}</span>, Dept: <span className="text-amber-300">{duplicateWarning.department || "N/A"}</span>) with <strong className="text-emerald-300">{duplicateWarning.confidence_percent}%</strong> similarity.
                    </p>
                    <span className="text-[10px] text-rose-300/80 italic mt-0.5">
                      Duplicate face registration is blocked to prevent proxy profiles.
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingStudent || !!duplicateWarning || !!rfidDuplicateUser}
                className={`mt-3 w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition shadow-neon-cyan cursor-pointer transform hover:-translate-y-0.5 ${
                  duplicateWarning || rfidDuplicateUser
                    ? "bg-rose-950 text-rose-400 border border-rose-800 cursor-not-allowed opacity-80"
                    : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                }`}
              >
                {duplicateWarning ? (
                  <>
                    <AlertTriangle className="w-4 h-4" /> Registration Blocked (Already Registered Face)
                  </>
                ) : rfidDuplicateUser ? (
                  <>
                    <AlertTriangle className="w-4 h-4" /> Registration Blocked (Duplicate RFID Card)
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Enroll Student Profile & Signature
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EXAM HALL REGISTER & MANAGER VIEW                                     */}
      {/* ========================================================================= */}
      {subTab === "hall" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: Hall Specifications (5 cols) */}
          <div className="lg:col-span-5 glass-panel p-6 flex flex-col gap-4 border-sky-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-cyber-cyan">
                {editingHall ? <Edit2 className="w-5 h-5 text-amber-400" /> : <Building className="w-5 h-5" />}
                <h3 className="font-bold text-sm text-white">
                  {editingHall ? "Edit Exam Hall Specifications" : "Register New Exam Hall / Room"}
                </h3>
              </div>
              {editingHall && (
                <button
                  type="button"
                  onClick={handleCancelEditHall}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={editingHall ? handleSaveEditHall : handleRegisterHall} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Tower / Building / Complex Name
                </label>
                <input
                  type="text"
                  value={hallTower}
                  onChange={(e) => setHallTower(e.target.value)}
                  placeholder="e.g. Academic Building 1, IT Complex, Science Tower"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Room Number & Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={hallRoomNo}
                  onChange={(e) => setHallRoomNo(e.target.value)}
                  placeholder="e.g. Room 101 - Main Auditorium, Room 202 - CS & AI Lab"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Seating Capacity (Max Students) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={hallCapacity}
                  onChange={(e) => setHallCapacity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono font-bold focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div className="flex gap-2 mt-2">
                {editingHall && (
                  <button
                    type="button"
                    onClick={handleCancelEditHall}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmittingHall}
                  className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition ${
                    editingHall
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-neon-amber"
                      : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-neon-cyan"
                  }`}
                >
                  {editingHall ? (
                    <>
                      <Check className="w-4 h-4" /> Update Exam Hall
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Save Exam Hall
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Existing Exam Halls Grid (7 cols) */}
          <div className="lg:col-span-7 glass-panel p-6 flex flex-col gap-4 border-sky-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-sm text-white">Registered Exam Halls ({rooms.length})</h3>
                <span className="text-xs text-slate-400">Total Capacity: <strong className="font-mono text-cyan-400">{rooms.reduce((a, b) => a + (b.capacity || 0), 0)} Seats</strong></span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">
                {(allocations || []).length} Total Allocated
              </span>
            </div>

            <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
              {rooms.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2 text-center">
                  <Building className="w-8 h-8 text-slate-600" />
                  <p className="text-xs">No exam halls registered yet.</p>
                </div>
              ) : (
                rooms.map((r) => {
                  const assignedStudents = (allocations || []).filter((a) => a.room_id === r.id);
                  const assignedCount = assignedStudents.length;
                  const capacity = r.capacity || 40;
                  const percent = Math.min(100, Math.round((assignedCount / capacity) * 100));
                  const isBeingEdited = editingHall?.id === r.id;

                  return (
                    <div
                      key={r.id}
                      className={`p-4 rounded-xl border flex flex-col gap-3 transition ${
                        isBeingEdited
                          ? "bg-amber-950/20 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                          : "glass-card border-slate-700/60 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <strong className="text-white text-sm font-bold flex items-center gap-2">
                            {r.name}
                            {isBeingEdited && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                EDITING
                              </span>
                            )}
                          </strong>
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {r.building || "Campus Complex"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {capacity} Seats
                          </span>
                        </div>
                      </div>

                      {/* Capacity & Occupancy Bar */}
                      <div className="flex flex-col gap-1 text-[11px] font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Allocated Students:</span>
                          <span className={`font-bold ${assignedCount > capacity ? "text-rose-400" : assignedCount > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                            {assignedCount} / {capacity} Seats ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              percent > 100
                                ? "bg-rose-500"
                                : percent > 80
                                ? "bg-amber-400"
                                : "bg-cyan-400"
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons Toolbar */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleOpenHallStudents(r)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-cyan-500/30 transition shadow-neon-cyan"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Manage Students ({assignedCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEditHall(r)}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
                          title="Edit Hall Details"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteHall(r.id, r.name)}
                          className="py-1.5 px-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1 border border-rose-500/30 transition"
                          title="Delete Exam Hall"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DEPARTMENT & COURSE MANAGER VIEW                                      */}
      {/* ========================================================================= */}
      {subTab === "department" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Add Department Form (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-6 flex flex-col gap-4 border-sky-500/20">
            <div className="flex items-center gap-2 text-cyber-cyan pb-3 border-b border-slate-800">
              <FolderPlus className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">Add New Department</h3>
            </div>

            <form onSubmit={handleAddDepartment} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Department Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deptNameInput}
                  onChange={(e) => setDeptNameInput(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Department Short Code
                </label>
                <input
                  type="text"
                  value={deptCodeInput}
                  onChange={(e) => setDeptCodeInput(e.target.value)}
                  placeholder="e.g. CSE, SWE, EEE, BBA"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono uppercase focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <button
                type="submit"
                disabled={isAddingDept}
                className="mt-2 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition shadow-neon-cyan"
              >
                <Plus className="w-4 h-4" /> Save Department
              </button>
            </form>
          </div>

          {/* Right: Departments & Courses Grid (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {departments.length === 0 ? (
              <div className="glass-panel p-8 text-center text-slate-500 font-mono text-xs">
                No departments created yet. Use the form on the left to add a department.
              </div>
            ) : (
              departments.map((dept) => (
                <div key={dept.id} className="glass-panel p-5 flex flex-col gap-4 border-slate-700/80">
                  {/* Dept Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-mono font-bold">
                        {dept.code}
                      </span>
                      <h3 className="font-bold text-base text-white">{dept.name}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingDept(dept);
                          setEditDeptName(dept.name);
                          setEditDeptCode(dept.code);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                        title="Edit Department"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 text-xs transition"
                        title="Delete Department"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setCourseModalDept(dept);
                          setEditingCourse(null);
                          setCourseTitleInput("");
                          setCourseCodeInput("");
                          setCourseStudentsInput([]);
                          setCourseStudentSearch("");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Course
                      </button>
                    </div>
                  </div>

                  {/* Courses List Under Dept */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(dept.courses || []).length === 0 ? (
                      <div className="col-span-full text-xs text-slate-500 font-mono py-2">
                        No courses added under this department yet. Click "+ Add Course".
                      </div>
                    ) : (
                      (dept.courses || []).map((crs) => (
                        <div key={crs.id} className="glass-card p-3.5 flex flex-col justify-between gap-3 border-slate-800">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-cyan-400 font-extrabold text-xs">{crs.code}</span>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                                {crs.enrolled_student_ids?.length || 0} Enrolled
                              </span>
                            </div>
                            <strong className="text-white text-xs mt-1 block">{crs.title}</strong>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                            <button
                              onClick={() => handleOpenEnrollModal(dept, crs)}
                              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 font-bold text-[11px] flex items-center gap-1 transition"
                            >
                              <GraduationCap className="w-3.5 h-3.5" /> Enroll Students
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setCourseModalDept(dept);
                                  setEditingCourse(crs);
                                  setCourseTitleInput(crs.title);
                                  setCourseCodeInput(crs.code);
                                  setCourseStudentsInput(crs.enrolled_student_ids || []);
                                  setCourseStudentSearch("");
                                }}
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCourse(dept.id, crs.id, crs.title)}
                                className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. EXAM CREATE & MULTI-HALL STUDENT RANGE ALLOCATION VIEW                 */}
      {/* ========================================================================= */}
      {subTab === "exam" && (
        <form onSubmit={handleCreateExam} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 cols: Exam Parameters, Dept, Course & Multi-Hall Selector */}
            <div className="lg:col-span-6 glass-panel p-6 flex flex-col gap-4 border-sky-500/20">
              <div className="flex items-center gap-2 text-cyber-cyan pb-3 border-b border-slate-800">
                <CalendarPlus className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">Exam Date, Time & Department Course</h3>
              </div>

              {/* Date & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Exam Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Time</label>
                  <input
                    type="time"
                    value={examStartTime}
                    onChange={(e) => setExamStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Time</label>
                  <input
                    type="time"
                    value={examEndTime}
                    onChange={(e) => setExamEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>

              {/* Washroom Limit */}
              <div className="text-xs">
                <label className="block text-slate-300 font-semibold mb-1">Washroom Break Time Limit (Minutes)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={examWashroomLimit}
                    onChange={(e) => setExamWashroomLimit(e.target.value)}
                    className="w-32 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold focus:outline-none focus:border-cyber-cyan"
                  />
                  <span className="text-slate-400 text-xs">Minutes Maximum Allowed</span>
                </div>
              </div>

              {/* Department Selection */}
              <div className="text-xs">
                <label className="block text-slate-300 font-semibold mb-1.5">
                  1) Select Academic Department <span className="text-rose-400">*</span>
                </label>
                <select
                  value={selectedDeptForExam}
                  onChange={(e) => handleDeptChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-semibold focus:outline-none focus:border-cyber-cyan text-xs"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name} ({dept.code})</option>
                  ))}
                </select>
              </div>

              {/* Department Courses Preloaded Options */}
              <div className="text-xs">
                <label className="block text-slate-300 font-semibold mb-1.5">
                  2) Select Course ({(currentDeptObj?.courses || []).length} Courses Available)
                </label>
                <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                  {(currentDeptObj?.courses || []).map((crs) => {
                    const isSelected = selectedCourseCode === crs.code;
                    return (
                      <button
                        key={crs.id || crs.code}
                        type="button"
                        onClick={() => handleCourseSelect(crs)}
                        className={`flex items-center justify-between p-2 rounded-md text-left transition border ${
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <span className="font-semibold text-xs">{crs.title}</span>
                        <span className="font-mono text-[11px] font-bold text-cyan-400">{crs.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Course Title & Code Field */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Exam Title</label>
                  <input
                    type="text"
                    required
                    value={examCustomTitle}
                    onChange={(e) => setExamCustomTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Course Code</label>
                  <input
                    type="text"
                    value={selectedCourseCode}
                    onChange={(e) => setSelectedCourseCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-cyber-cyan"
                  />
                </div>
              </div>

              {/* Multi-Hall Selection & Active Distribution Selector */}
              <div className="text-xs pt-1 flex flex-col gap-2">
                <label className="block text-slate-300 font-semibold">
                  3) Assign Exam Hall(s) & Click Hall to Distribute Students
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rooms.map((r) => {
                    const isHallSelected = selectedHallIds.includes(r.id);
                    const isActiveForAlloc = activeHallForAllocation === r.id;
                    const assignedCount = (hallStudentMap[r.id] || []).length;

                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          if (isHallSelected) {
                            setActiveHallForAllocation(r.id);
                          } else {
                            handleToggleExamHall(r.id);
                          }
                        }}
                        className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1.5 transition ${
                          isActiveForAlloc
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-neon-cyan"
                            : isHallSelected
                            ? "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600"
                            : "bg-slate-950/40 border-slate-800 text-slate-500 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isHallSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleExamHall(r.id);
                              }}
                              className="rounded accent-cyan-500"
                            />
                            <strong className="text-xs">{r.name}</strong>
                          </div>
                          {isActiveForAlloc && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950">
                              ACTIVE HALL
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                          <span>Capacity: {r.capacity} Seats</span>
                          <span className={`font-bold ${assignedCount > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                            Assigned: {assignedCount} / {r.capacity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 6 cols: Candidate Range Allocation & Locking List */}
            <div className="lg:col-span-6 glass-panel p-6 flex flex-col gap-4 border-sky-500/20">
              {/* Header with Active Hall Badge & Range Control */}
              <div className="flex flex-col gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      4) Student Range Allocation
                      {currentCourseObj?.enrolled_student_ids?.length > 0 && (
                        <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          {selectedCourseCode} ({currentCourseObj.enrolled_student_ids.length} Enrolled)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Total Assigned: <strong className="text-cyan-400 font-mono">{enrolledStudentIds.length}</strong> / {eligibleStudents.length} Students
                    </p>
                  </div>

                  {activeHallForAllocation && (
                    <div className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" />
                      Active: {rooms.find((r) => r.id === activeHallForAllocation)?.name || "Hall"}
                    </div>
                  )}
                </div>

                {/* Range Auto-Assign Controls */}
                {activeHallForAllocation && (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex-wrap text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-semibold">Range / Count:</span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={rangeAssignCount}
                        onChange={(e) => setRangeAssignCount(Number(e.target.value) || 1)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded p-1 text-white font-mono font-bold text-center focus:outline-none focus:border-cyber-cyan"
                      />
                      <button
                        type="button"
                        onClick={() => handleAssignRangeToActiveHall(rangeAssignCount)}
                        className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1 transition shadow-neon-cyan"
                      >
                        <Zap className="w-3.5 h-3.5" /> Assign Next {rangeAssignCount} Students
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearActiveHallAssignments}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] transition"
                    >
                      Clear Hall
                    </button>
                  </div>
                )}
              </div>

              {/* Students List with Lock Badge */}
              <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1">
                {eligibleStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <GraduationCap className="w-10 h-10 text-slate-600" />
                    <p className="text-xs font-semibold text-slate-400 max-w-xs">
                      No students are currently enrolled in course <strong className="text-cyan-400 font-mono">{selectedCourseCode}</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (currentDeptObj && currentCourseObj) {
                          handleOpenEnrollModal(currentDeptObj, currentCourseObj);
                        } else {
                          setSubTab("department");
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-2 transition shadow-neon-cyan"
                    >
                      <UserPlus className="w-4 h-4" /> Enroll Students in {selectedCourseCode}
                    </button>
                  </div>
                ) : (
                  eligibleStudents.map((std) => {
                    // Check which hall student is assigned to
                    const assignedHallId = Object.keys(hallStudentMap).find(
                      (hId) => (hallStudentMap[hId] || []).includes(std.id)
                    );

                    const isAssignedToActive = assignedHallId === activeHallForAllocation;
                    const isLockedInOther = assignedHallId && assignedHallId !== activeHallForAllocation;
                    const otherRoomName = isLockedInOther ? rooms.find((r) => r.id === assignedHallId)?.name : "";

                    const firstImg = std.images ? Object.values(std.images)[0] : "";
                    const avatarUrl = firstImg ? `/api/${firstImg}` : "";
                    const clearanceStatus = studentClearanceMap[std.id] || "CLEARED";

                    return (
                      <div
                        key={std.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                          isAssignedToActive
                            ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                            : isLockedInOther
                            ? "bg-slate-950/80 border-slate-800/80 text-slate-500 opacity-70"
                            : "bg-slate-900/60 border-slate-800 text-slate-400"
                        }`}
                      >
                        <div
                          onClick={() => !isLockedInOther && handleToggleStudentForActiveHall(std.id)}
                          className={`flex items-center gap-3 flex-1 ${isLockedInOther ? "cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <input
                            type="checkbox"
                            disabled={isLockedInOther}
                            checked={isAssignedToActive}
                            onChange={() => handleToggleStudentForActiveHall(std.id)}
                            className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                          />
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center flex-shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={std.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs ${isLockedInOther ? "text-slate-400 line-through" : "text-white"}`}>
                                {std.name}
                              </span>
                              {isLockedInOther && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[9px] font-mono text-slate-400 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5 text-amber-400" /> {otherRoomName || "Other Hall"}
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-cyan-400">ID: {std.roll_id || "N/A"}</span>
                          </div>
                        </div>

                        {/* Exam Allowance / Admit Clearance Status Dropdown */}
                        <div className="flex items-center gap-2">
                          <select
                            value={clearanceStatus}
                            onChange={(e) => handleSetStudentClearance(std.id, e.target.value)}
                            className={`text-[10px] font-mono font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer ${
                              clearanceStatus === "CLEARED"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : clearanceStatus === "NO_ADMIT_CARD"
                                ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                                : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                            }`}
                            title="Set Exam Allowance / Admit Card Clearance Status"
                          >
                            <option value="CLEARED" className="bg-slate-900 text-emerald-400">🟢 Allowed (Cleared)</option>
                            <option value="NO_ADMIT_CARD" className="bg-slate-900 text-orange-400">🟠 No Admit Card</option>
                            <option value="BLOCKED" className="bg-slate-900 text-rose-400">🔴 Blocked / Disqualified</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingExam}
                className="mt-auto w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition shadow-neon-cyan"
              >
                <Sparkles className="w-5 h-5 stroke-[2.5]" /> Create Exam & Finalize Timetable ({enrolledStudentIds.length} Enrolled)
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* MODALS: Edit Dept, Add/Edit Course, Enroll Students                      */}
      {/* ========================================================================= */}

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 flex flex-col gap-4 border-sky-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Edit Department</h3>
              <button onClick={() => setEditingDept(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Department Name</label>
                <input
                  type="text"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Department Code</label>
                <input
                  type="text"
                  value={editDeptCode}
                  onChange={(e) => setEditDeptCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono uppercase focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditDepartment}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Course Modal */}
      {courseModalDept && (() => {
        const deptStudents = users.filter((u) => isStudentInDept(u.department, courseModalDept));
        const otherDeptStudents = users.filter((u) => !isStudentInDept(u.department, courseModalDept));

        const sq = courseStudentSearch.toLowerCase().trim();
        const filteredDept = sq
          ? deptStudents.filter(
              (u) =>
                (u.name || "").toLowerCase().includes(sq) ||
                (u.roll_id || "").toLowerCase().includes(sq)
            )
          : deptStudents;
        const filteredOther = sq
          ? otherDeptStudents.filter(
              (u) =>
                (u.name || "").toLowerCase().includes(sq) ||
                (u.roll_id || "").toLowerCase().includes(sq) ||
                (u.department || "").toLowerCase().includes(sq)
            )
          : otherDeptStudents;

        const allDeptSelected =
          deptStudents.length > 0 &&
          deptStudents.every((u) => courseStudentsInput.includes(u.id));

        const toggleStudent = (id) => {
          setCourseStudentsInput((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          );
        };

        const toggleSelectAllDept = () => {
          if (allDeptSelected) {
            const deptIds = new Set(deptStudents.map((u) => u.id));
            setCourseStudentsInput((prev) => prev.filter((id) => !deptIds.has(id)));
          } else {
            const newSet = new Set([
              ...courseStudentsInput,
              ...deptStudents.map((u) => u.id),
            ]);
            setCourseStudentsInput(Array.from(newSet));
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-xl p-6 flex flex-col gap-4 border-sky-500/30 max-h-[92vh] overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-white">
                    {editingCourse ? "Edit Course" : "Add New Course"}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Department: <span className="text-cyan-400 font-semibold">{courseModalDept.name}</span> ({courseModalDept.code})
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCourseModalDept(null);
                    setEditingCourse(null);
                    setCourseStudentsInput([]);
                    setCourseStudentSearch("");
                  }}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCourse} className="flex flex-col gap-4 text-xs overflow-y-auto pr-1">
                {/* Course Title & Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Course Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={courseTitleInput}
                      onChange={(e) => setCourseTitleInput(e.target.value)}
                      placeholder="e.g. Data Structures & Algorithms"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyber-cyan text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Course Code</label>
                    <input
                      type="text"
                      value={courseCodeInput}
                      onChange={(e) => setCourseCodeInput(e.target.value)}
                      placeholder="e.g. CSE-2101"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono uppercase focus:outline-none focus:border-cyber-cyan text-xs"
                    />
                  </div>
                </div>

                {/* Enrolled Students Section */}
                <div className="glass-card p-3 rounded-xl border-slate-800 flex flex-col gap-2.5 bg-slate-900/60">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-xs">
                        Enroll Students ({courseStudentsInput.length} Selected)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {deptStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleSelectAllDept}
                          className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold transition"
                        >
                          {allDeptSelected ? `Deselect ${courseModalDept.code}` : `+ All ${courseModalDept.code} (${deptStudents.length})`}
                        </button>
                      )}
                      {courseStudentsInput.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCourseStudentsInput([])}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Student Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={courseStudentSearch}
                      onChange={(e) => setCourseStudentSearch(e.target.value)}
                      placeholder={`Search ${courseModalDept.code} students by name or roll...`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Scrollable Students List */}
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {/* 1. Department Students (Default Primary List) */}
                    <div className="text-[11px] font-mono text-slate-400 font-bold px-1 pt-1">
                      {courseModalDept.name} Students ({filteredDept.length})
                    </div>

                    {filteredDept.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 font-mono text-[11px] bg-slate-950/40 rounded-lg">
                        {deptStudents.length === 0
                          ? `No candidates registered under ${courseModalDept.name} yet.`
                          : "No department students match your search."}
                      </div>
                    ) : (
                      filteredDept.map((u) => {
                        const isSelected = courseStudentsInput.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => toggleStudent(u.id)}
                            className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? "bg-emerald-500/15 border-emerald-500/50 text-white"
                                : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-emerald-400 flex-shrink-0">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-600" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-xs truncate">{u.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  Roll: <span className="text-cyan-300 font-semibold">{u.roll_id || u.id}</span>
                                </div>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold flex-shrink-0">
                              {courseModalDept.code}
                            </span>
                          </div>
                        );
                      })
                    )}

                    {/* 2. Other Dept Students (if searched or selected) */}
                    {(filteredOther.length > 0 || sq) && (
                      <>
                        <div className="text-[11px] font-mono text-slate-500 font-bold px-1 pt-2 border-t border-slate-800">
                          Other Departments ({filteredOther.length})
                        </div>
                        {filteredOther.map((u) => {
                          const isSelected = courseStudentsInput.includes(u.id);
                          return (
                            <div
                              key={u.id}
                              onClick={() => toggleStudent(u.id)}
                              className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? "bg-emerald-500/15 border-emerald-500/50 text-white"
                                  : "bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-emerald-400 flex-shrink-0">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-600" />
                                  )}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-bold text-xs truncate">{u.name}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    Roll: <span className="text-slate-300">{u.roll_id || u.id}</span>
                                  </div>
                                </div>
                              </div>

                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono flex-shrink-0 truncate max-w-[120px]">
                                {u.department || "General"}
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCourseModalDept(null);
                      setEditingCourse(null);
                      setCourseStudentsInput([]);
                      setCourseStudentSearch("");
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 shadow-neon-cyan"
                  >
                    <Check className="w-4 h-4" />
                    {editingCourse ? "Update Course" : "Create Course"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Enroll Students in Course Modal */}
      {enrollModalContext && (() => {
        const { dept, course } = enrollModalContext;
        const deptStudents = users.filter((u) => isStudentInDept(u.department, dept));
        const otherDeptStudents = users.filter((u) => !isStudentInDept(u.department, dept));

        // Candidates to display based on filter tab & search query
        let candidatePool = [];
        if (enrollDeptFilter === "DEPT_ONLY") {
          candidatePool = deptStudents;
        } else if (enrollDeptFilter === "ENROLLED") {
          candidatePool = users.filter((u) => courseEnrolledIds.includes(u.id));
        } else {
          candidatePool = [...deptStudents, ...otherDeptStudents];
        }

        const sq = enrollSearchQuery.toLowerCase().trim();
        if (sq) {
          candidatePool = candidatePool.filter((u) =>
            (u.name || "").toLowerCase().includes(sq) ||
            (u.roll_id || "").toLowerCase().includes(sq) ||
            (u.department || "").toLowerCase().includes(sq)
          );
        }

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-2xl p-6 flex flex-col gap-4 border-sky-500/40 max-h-[90vh] shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <span>{course.code}</span>
                      <span className="text-slate-400 font-normal">•</span>
                      <span>{course.title}</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Department: <strong className="text-cyan-400">{dept.name} ({dept.code})</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {courseEnrolledIds.length} Enrolled
                  </span>
                  <button
                    onClick={() => setEnrollModalContext(null)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick Select from Dropdown (By Default Shows CSE / Dept Students) */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-white flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-cyber-cyan" /> Quick Add Student ({dept.code} by default):
                  </label>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {deptStudents.length} {dept.code} Students Registered
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={enrollQuickStudentId}
                    onChange={(e) => setEnrollQuickStudentId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyber-cyan"
                  >
                    <option value="">-- Select Student to Enroll ({dept.code} & Others) --</option>
                    <optgroup label={`🎓 ${dept.name} Students (${deptStudents.length})`}>
                      {deptStudents.map((u) => {
                        const isAlready = courseEnrolledIds.includes(u.id);
                        return (
                          <option key={u.id} value={u.id} disabled={isAlready}>
                            {u.name} (Roll: {u.roll_id || "N/A"}) {isAlready ? "— [Already Enrolled]" : `— [${u.department}]`}
                          </option>
                        );
                      })}
                    </optgroup>
                    {otherDeptStudents.length > 0 && (
                      <optgroup label="🌐 Other Departments">
                        {otherDeptStudents.map((u) => {
                          const isAlready = courseEnrolledIds.includes(u.id);
                          return (
                            <option key={u.id} value={u.id} disabled={isAlready}>
                              {u.name} (Roll: {u.roll_id || "N/A"}) - {u.department}{" "}
                              {isAlready ? "— [Already Enrolled]" : ""}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={handleQuickAddStudentToCourse}
                    disabled={!enrollQuickStudentId}
                    className="py-2 px-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition disabled:opacity-50 shadow-neon-cyan"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setEnrollDeptFilter("DEPT_ONLY")}
                    className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                      enrollDeptFilter === "DEPT_ONLY"
                        ? "bg-cyan-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>{dept.code} Students ({deptStudents.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnrollDeptFilter("ALL")}
                    className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                      enrollDeptFilter === "ALL"
                        ? "bg-cyan-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>All Candidates ({users.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnrollDeptFilter("ENROLLED")}
                    className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                      enrollDeptFilter === "ENROLLED"
                        ? "bg-emerald-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>Enrolled ({courseEnrolledIds.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllDeptStudents(dept)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition"
                    title={`Select all ${deptStudents.length} students of ${dept.code}`}
                  >
                    + Select All {dept.code}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCourseEnrolledIds([])}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 text-xs transition"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder={`Search ${enrollDeptFilter === "DEPT_ONLY" ? dept.code : "all"} students by name or roll number...`}
                  value={enrollSearchQuery}
                  onChange={(e) => setEnrollSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              {/* Candidate Selection List */}
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {candidatePool.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-2 text-center text-xs">
                    <Users className="w-6 h-6 text-slate-600" />
                    <span>No students found matching current filter or search criteria.</span>
                  </div>
                ) : (
                  candidatePool.map((std) => {
                    const isEnrolled = courseEnrolledIds.includes(std.id);
                    const isDeptMatch = isStudentInDept(std.department, dept);
                    const firstImg = std.images ? Object.values(std.images)[0] : "";
                    const avatarUrl = firstImg ? `/api/${firstImg}` : "";

                    return (
                      <div
                        key={std.id}
                        onClick={() => handleToggleCourseStudent(std.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                          isEnrolled
                            ? "bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isEnrolled}
                            onChange={() => handleToggleCourseStudent(std.id)}
                            className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                          />

                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center flex-shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={std.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-slate-500" />
                            )}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-white truncate">{std.name}</span>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                              <span className="text-cyan-400">ID: {std.roll_id || "N/A"}</span>
                              <span>•</span>
                              <span className={isDeptMatch ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                                {std.department || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Status Tag / Remove Button */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {isEnrolled ? (
                            <button
                              type="button"
                              onClick={() => handleToggleCourseStudent(std.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 transition"
                              title="Remove from Course"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleCourseStudent(std.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 text-[11px] font-bold flex items-center gap-1 border border-slate-700 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Enroll</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <span className="text-slate-400 font-mono">
                  Enrolled: <strong className="text-cyan-400">{courseEnrolledIds.length}</strong> / {users.length} Candidates
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEnrollModalContext(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCourseEnrollment}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow-neon-emerald"
                  >
                    <Check className="w-4 h-4" /> Save Course Enrollment ({courseEnrolledIds.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. IN-HALL STUDENT MANAGER MODAL                                         */}
      {/* ========================================================================= */}
      {activeHallForStudents && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl p-6 flex flex-col gap-4 border-sky-500/40 max-h-[88vh] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Building className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    {activeHallForStudents.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                    <span>{activeHallForStudents.building || "Campus Complex"}</span>
                    <span>•</span>
                    <span>Capacity: <strong className="text-amber-400">{activeHallForStudents.capacity} Seats</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                  hallAllocations.length > activeHallForStudents.capacity
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}>
                  {hallAllocations.length} / {activeHallForStudents.capacity} Assigned
                </span>
                <button
                  type="button"
                  onClick={() => setActiveHallForStudents(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Toolbar: Search, Add Student Drawer Toggle, Auto-Number */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search students in this hall by name, roll, or seat..."
                  value={hallStudentSearch}
                  onChange={(e) => setHallStudentSearch(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyber-cyan"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentDrawer(!showAddStudentDrawer)}
                  className="py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow-neon-cyan"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddStudentDrawer ? "Close Add Form" : "Add Student to Hall"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoNumberSeatsInHall}
                  disabled={hallAllocations.length === 0}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
                  title="Automatically assign sequential seat numbers (Seat A-01, Seat A-02...) to all students in this hall"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Auto-Number Seats</span>
                </button>
              </div>
            </div>

            {/* Add Student to Hall Drawer */}
            {showAddStudentDrawer && (() => {
              const currentDeptObj = departments.find(
                (d) =>
                  (d.name || "").toLowerCase() === (hallAssignDept || "").toLowerCase() ||
                  (d.code || "").toLowerCase() === (hallAssignDept || "").toLowerCase()
              );

              const availableDeptCandidates = !hallAssignDept
                ? []
                : hallAssignDept === "ALL"
                ? users
                : users.filter((u) =>
                    isStudentInDept(u.department, currentDeptObj || { name: hallAssignDept })
                  );

              const existingCandidateIds = new Set(hallAllocations.map((a) => a.candidate_id));
              const unassignedInDept = availableDeptCandidates.filter((c) => !existingCandidateIds.has(c.id));

              return (
                <div className="p-4 rounded-xl bg-slate-900/95 border border-cyan-500/40 flex flex-col gap-3 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-cyber-cyan" /> Add Student to {activeHallForStudents.name}
                    </span>
                    <span className="text-slate-400 text-[11px] font-mono">
                      {hallAssignDept
                        ? `${availableDeptCandidates.length} Students in Selected Dept`
                        : "Choose Department First"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Step 1: Department Selector */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        1. Select Department <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={hallAssignDept}
                        onChange={(e) => {
                          setHallAssignDept(e.target.value);
                          setSelectedStudentToAssign("");
                        }}
                        className="w-full bg-slate-950 border border-cyan-500/40 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyber-cyan"
                      >
                        <option value="">-- Choose Department First --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                        <option value="ALL">🌐 All Departments (Show Everyone)</option>
                      </select>
                    </div>

                    {/* Step 2: Student Selector (Filtered by Dept) */}
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        2. Choose Student <span className="text-rose-400">*</span>
                        {hallAssignDept && (
                          <span className="text-cyan-400 font-mono text-[10px] ml-1">
                            ({availableDeptCandidates.length} Found)
                          </span>
                        )}
                      </label>
                      <select
                        value={selectedStudentToAssign}
                        onChange={(e) => setSelectedStudentToAssign(e.target.value)}
                        disabled={!hallAssignDept}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-cyber-cyan disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {!hallAssignDept ? (
                          <option value="">-- Select Department in Step 1 First --</option>
                        ) : availableDeptCandidates.length === 0 ? (
                          <option value="">-- No students registered in this department --</option>
                        ) : (
                          <>
                            <option value="">-- Choose Student ({availableDeptCandidates.length}) --</option>
                            {availableDeptCandidates.map((u) => {
                              const currentAlloc = (allocations || []).find((a) => a.candidate_id === u.id);
                              const isInThisHall = currentAlloc?.room_id === activeHallForStudents.id;
                              return (
                                <option
                                  key={u.id}
                                  value={u.id}
                                  disabled={isInThisHall}
                                  className="bg-slate-900 text-white"
                                >
                                  {u.name} (Roll: {u.roll_id || "N/A"}) - {u.department || "N/A"}{" "}
                                  {isInThisHall
                                    ? "— (Already in this Hall)"
                                    : currentAlloc?.room_name
                                    ? `— [In ${currentAlloc.room_name}]`
                                    : "— [Unassigned]"}
                                </option>
                              );
                            })}
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80 flex-wrap">
                    <div>
                      {hallAssignDept && unassignedInDept.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleAssignAllDeptStudentsToHall(availableDeptCandidates)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-1.5"
                          title={`Add all ${unassignedInDept.length} unassigned students from ${hallAssignDept} into this hall with sequential seats`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>+ Add All {unassignedInDept.length} {currentDeptObj?.code || "Dept"} Students</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddStudentDrawer(false);
                          setHallAssignDept("");
                          setSelectedStudentToAssign("");
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAssignStudentToHall}
                        disabled={!selectedStudentToAssign}
                        className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition disabled:opacity-50 flex items-center gap-1.5 shadow-neon-cyan"
                      >
                        <Check className="w-3.5 h-3.5" /> Assign to {activeHallForStudents.name}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Students List in Current Hall */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[360px] pr-1">
              {isLoadingHallStudents ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Loading hall student registry...</span>
                </div>
              ) : hallAllocations.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2 text-center">
                  <Users className="w-8 h-8 text-slate-600" />
                  <p className="text-xs font-semibold text-slate-400">No students currently assigned to this hall.</p>
                  <p className="text-[11px] text-slate-500">
                    Click <strong>&quot;Add Student to Hall&quot;</strong> above to assign registered students and allocate seat numbers.
                  </p>
                </div>
              ) : (
                (() => {
                  const q = hallStudentSearch.toLowerCase().trim();
                  const filtered = hallAllocations.filter((a) => {
                    if (!q) return true;
                    return (
                      (a.user_name || a.name || "").toLowerCase().includes(q) ||
                      (a.user_roll || a.roll_id || "").toLowerCase().includes(q) ||
                      (a.user_dept || a.department || "").toLowerCase().includes(q) ||
                      (a.seat_number || "").toLowerCase().includes(q)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No students matching &quot;{hallStudentSearch}&quot; found in this hall.
                      </div>
                    );
                  }

                  return filtered.map((alloc) => {
                    const candId = alloc.candidate_id;
                    const candName = alloc.user_name || alloc.name || "Unknown Candidate";
                    const candRoll = alloc.user_roll || alloc.roll_id || "N/A";
                    const candDept = alloc.user_dept || alloc.department || "General";
                    const firstImg = alloc.images ? Object.values(alloc.images)[0] : "";
                    const avatarUrl = firstImg ? `/api/${firstImg}` : "";
                    const isEditingSeat = editingSeatCandidateId === candId;

                    return (
                      <div
                        key={candId}
                        className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        {/* Student Details */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center flex-shrink-0">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={candName} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-slate-500" />
                            )}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-white truncate">{candName}</span>
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                              <span className="text-cyan-400">ID: {candRoll}</span>
                              <span>•</span>
                              <span className="truncate">{candDept}</span>
                            </div>
                          </div>
                        </div>

                        {/* Seat Number (with Inline Editor) */}
                        <div className="flex items-center gap-2">
                          {isEditingSeat ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editSeatValue}
                                onChange={(e) => setEditSeatValue(e.target.value)}
                                className="w-24 bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-xs text-white font-mono font-bold focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveSeatNumber(candId)}
                                className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                                title="Save Seat Number"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSeatCandidateId(null)}
                                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30 flex items-center gap-1">
                                <Armchair className="w-3 h-3 text-cyan-400" />
                                {alloc.seat_number || "Unassigned"}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSeatCandidateId(candId);
                                  setEditSeatValue(alloc.seat_number || "Seat A-01");
                                }}
                                className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                                title="Edit Seat Number"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Actions: Remove from Hall & Delete Candidate */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveStudentFromHall(candId, candName)}
                            className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-[11px] font-semibold flex items-center gap-1 transition"
                            title={`Remove ${candName} from ${activeHallForStudents.name}`}
                          >
                            <DoorOpen className="w-3 h-3" />
                            <span>Remove</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCandidateFromDb(candId, candName)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition"
                            title={`Permanently delete ${candName} from database`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400 font-mono">
                {hallAllocations.length} Candidates Assigned • Hall Seating Cap: {activeHallForStudents.capacity}
              </span>
              <button
                type="button"
                onClick={() => setActiveHallForStudents(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
