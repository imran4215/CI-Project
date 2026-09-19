import os
import base64
import time
from datetime import datetime, date
from typing import Dict, Any, List, Optional
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Response, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from .face_engine import FaceEngine
from .database import FaceDatabase, FACES_DIR, ATTENDANCE_DIR
from .signature_engine import SignatureEngine
from .rfid_engine import RFIDEngine

app = FastAPI(title="RFID & Face Attendance & Anti-Proxy System", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = FaceEngine()
db = FaceDatabase()
sig_engine = SignatureEngine()
rfid_engine = RFIDEngine()

def decode_base64_image(base64_str: str) -> Optional[np.ndarray]:
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"[-] Decode error: {e}")
        return None

def decode_base64_bytes(base64_str: str) -> Optional[bytes]:
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        return base64.b64decode(base64_str)
    except Exception:
        return None

# Pydantic models for API requests
class ValidateAngleRequest(BaseModel):
    image: str
    angle: str

class RegisterUserRequest(BaseModel):
    name: str
    roll_id: Optional[str] = ""
    department: Optional[str] = ""
    rfid_tag: Optional[str] = None
    angles: Dict[str, str]
    signature: Optional[str] = None  # Base64 digital reference signature

class RFIDScanRequest(BaseModel):
    tag: str

class RFIDConfigRequest(BaseModel):
    port: str
    baud_rate: Optional[int] = 9600

class Verify3FactorRequest(BaseModel):
    rfid_tag: str
    candidate_id: str
    signature: Optional[str] = None
    face_image: Optional[str] = None
    active_room_id: Optional[str] = None
    signature_threshold: Optional[float] = 0.50
    face_threshold: Optional[float] = 0.363

class VerifySignatureRequest(BaseModel):
    candidate_id: str
    signature: str  # Base64 live signature from tablet
    threshold: Optional[float] = 0.50

class RecognizeRequest(BaseModel):
    image: str
    threshold: Optional[float] = 0.363
    active_room_id: Optional[str] = None

class AttendanceActionRequest(BaseModel):
    candidate_id: str
    action: str  # "ENTRY", "EXIT", "WASHROOM_OUT", "WASHROOM_IN"
    active_room_id: Optional[str] = None
    image: Optional[str] = None
    signature: Optional[str] = None  # Base64 digital signature image (from graphics tablet / stylus / canvas)
    exam_name: Optional[str] = "Final Examination 2026"
    hall_name: Optional[str] = "Room 202 - CS & AI Lab"
    override_admit: Optional[bool] = False
    override_schedule: Optional[bool] = False

class CreateRoomRequest(BaseModel):
    name: str
    building: Optional[str] = ""
    capacity: Optional[int] = 40
    default_start_time: Optional[str] = "09:00"
    default_end_time: Optional[str] = "12:00"

class UpdateRoomRequest(BaseModel):
    name: Optional[str] = None
    building: Optional[str] = None
    capacity: Optional[int] = None
    default_start_time: Optional[str] = None
    default_end_time: Optional[str] = None

class BatchAllocateRoomRequest(BaseModel):
    assignments: List[Dict[str, Any]]

class CreateScheduleRequest(BaseModel):
    title: str
    course_code: Optional[str] = ""
    date: Optional[str] = ""
    start_time: Optional[str] = "09:00"
    end_time: Optional[str] = "12:00"
    departments: Optional[List[str]] = ["ALL"]
    hall_ids: Optional[List[str]] = []
    washroom_limit_minutes: Optional[int] = 10
    entry_grace_minutes: Optional[int] = 30
    enrolled_student_ids: Optional[List[str]] = []
    student_clearance_map: Optional[Dict[str, str]] = {}
    hall_student_map: Optional[Dict[str, List[str]]] = {}

class UpdateScheduleRequest(BaseModel):
    title: Optional[str] = None
    course_code: Optional[str] = None
    date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    departments: Optional[List[str]] = None
    hall_ids: Optional[List[str]] = None
    washroom_limit_minutes: Optional[int] = None
    entry_grace_minutes: Optional[int] = None
    status: Optional[str] = None

class AllocateCandidateRequest(BaseModel):
    candidate_id: str
    room_id: str
    seat_number: Optional[str] = "Seat A-01"
    admit_status: Optional[str] = "CLEARED"  # "CLEARED", "PENDING_DUES", "BLOCKED"
    remarks: Optional[str] = ""

class ClearAdmitRequest(BaseModel):
    candidate_id: str
    admit_status: str = "CLEARED"
    special_clearance_by: Optional[str] = "Hall In-Charge"
    remarks: Optional[str] = "Special Permission Granted"

class UpdateAttendanceRecordRequest(BaseModel):
    status: Optional[str] = None
    entry_time: Optional[str] = None
    exit_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    washroom_count: Optional[int] = None
    total_washroom_minutes: Optional[int] = None
    has_washroom_violation: Optional[bool] = None
    seat_number: Optional[str] = None
    room_name: Optional[str] = None
    day_key: Optional[str] = None

class ProxyAlertRequest(BaseModel):
    image: Optional[str] = None
    confidence: Optional[float] = 0.0
    notes: Optional[str] = "Unregistered face detected."

class UpdateAlertRequest(BaseModel):
    notes: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: Optional[str] = None

class CreateDeptRequest(BaseModel):
    name: str
    code: Optional[str] = ""

class UpdateDeptRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None

class CreateCourseRequest(BaseModel):
    title: str
    code: Optional[str] = ""
    enrolled_student_ids: Optional[List[str]] = []

class UpdateCourseRequest(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    enrolled_student_ids: Optional[List[str]] = None

class EnrollCourseRequest(BaseModel):
    student_ids: List[str] = []

class CreateClassRoutineRequest(BaseModel):
    room_id: str
    department: str
    day: str
    time_slot: str
    start_time: Optional[str] = ""
    end_time: Optional[str] = ""
    is_gap: Optional[bool] = False
    course_code: Optional[str] = ""
    course_name: Optional[str] = ""
    instructor: Optional[str] = ""
    section: Optional[str] = ""
    semester: Optional[str] = ""
    remarks: Optional[str] = ""

class UpdateClassRoutineRequest(BaseModel):
    room_id: Optional[str] = None
    department: Optional[str] = None
    day: Optional[str] = None
    time_slot: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_gap: Optional[bool] = None
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    instructor: Optional[str] = None
    section: Optional[str] = None
    semester: Optional[str] = None
    remarks: Optional[str] = None

class BatchClassRoutineRequest(BaseModel):
    routines: List[Dict[str, Any]]

class MonitoringFrameRequest(BaseModel):
    image: str
    active_room_id: Optional[str] = None
    threshold: Optional[float] = 0.363

class ClassroomFrameRequest(BaseModel):
    image: str
    room_id: str
    department: Optional[str] = "Computer Science & Engineering (CSE)"
    course_code: str
    course_name: Optional[str] = "Class"
    day: Optional[str] = None
    time_slot: Optional[str] = None
    absence_threshold_sec: Optional[int] = 45
    threshold: Optional[float] = 0.363

class UpdateMonitoringConfigRequest(BaseModel):
    absence_threshold_sec: Optional[int] = None
    gate_arrival_threshold_sec: Optional[int] = None
    grace_period_sec: Optional[int] = None
    auto_alert_voice: Optional[bool] = None

# =============================================================================
# 1. Face Registration & Universal Profile Bank
# =============================================================================
@app.post("/api/validate-angle")
async def validate_angle(req: ValidateAngleRequest):
    img = decode_base64_image(req.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    res = engine.validate_and_extract_face(img, min_confidence=0.55)
    matched_user = None
    if res.get("success") and res.get("embedding") is not None:
        matched_user = engine.find_matching_registered_user(res["embedding"])

    res_clean = {
        "success": res["success"],
        "message": res["message"],
        "confidence": res.get("confidence", 0.0),
        "bbox": res.get("bbox"),
        "landmarks": res.get("landmarks"),
        "angle": req.angle,
        "is_already_registered": matched_user is not None,
        "matched_user": matched_user
    }
    return res_clean

@app.post("/api/register")
async def register_user(request: Request):
    content_type = request.headers.get("content-type", "")

    name = ""
    roll_id = ""
    department = ""
    rfid_tag = ""
    angles_bytes = {}
    signature_bytes = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        name = str(form.get("name", "")).strip()
        roll_id = str(form.get("roll_id", "")).strip()
        department = str(form.get("department", "")).strip()
        rfid_tag = str(form.get("rfid_tag", "")).strip()

        for key, value in form.items():
            if key == "signature":
                if hasattr(value, "read"):
                    sig_b = await value.read()
                    if sig_b:
                        signature_bytes = sig_b
                elif isinstance(value, str) and value.strip():
                    signature_bytes = decode_base64_bytes(value)
            elif key not in ["name", "roll_id", "department", "rfid_tag"] and hasattr(value, "read"):
                img_bytes = await value.read()
                if img_bytes:
                    angles_bytes[key] = img_bytes
    else:
        body = await request.json()
        name = str(body.get("name", "")).strip()
        roll_id = str(body.get("roll_id", "")).strip()
        department = str(body.get("department", "")).strip()
        rfid_tag = str(body.get("rfid_tag", "")).strip()
        raw_angles = body.get("angles", {})

        for angle_name, b64_img in raw_angles.items():
            b_bytes = decode_base64_bytes(b64_img)
            if b_bytes:
                angles_bytes[angle_name] = b_bytes

        raw_sig = body.get("signature")
        if raw_sig:
            signature_bytes = decode_base64_bytes(raw_sig)

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    if not angles_bytes:
        raise HTTPException(status_code=400, detail="At least 1 clear face photo is required")

    if not signature_bytes or len(signature_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Official digital reference signature is required for candidate enrollment."
        )

    # 1. Check if Roll ID is already assigned to another candidate
    if roll_id:
        existing_roll = db.find_user_by_roll(roll_id)
        if existing_roll:
            raise HTTPException(
                status_code=400,
                detail=f"⚠️ Student ID / Roll '{roll_id}' is already registered for '{existing_roll['name']}' ({existing_roll.get('department', 'General')})."
            )

    # 2. Check if RFID Card Tag is already assigned to another candidate
    if rfid_tag:
        existing_rfid = db.find_user_by_rfid(rfid_tag)
        if existing_rfid:
            raise HTTPException(
                status_code=400,
                detail=f"⚠️ RFID Card Tag '{rfid_tag}' is already registered to '{existing_rfid['name']}' (ID: {existing_rfid.get('roll_id', 'N/A')})."
            )

    saved_images_bytes = {}
    saved_embeddings = {}

    for angle_name, img_bytes in angles_bytes.items():
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            continue

        val = engine.validate_and_extract_face(img, min_confidence=0.45)
        if val["success"] and val["embedding"] is not None:
            # 3. Check if this face matches any already registered candidate
            matched_user = engine.find_matching_registered_user(val["embedding"])
            if matched_user:
                raise HTTPException(
                    status_code=400,
                    detail=f"⚠️ This person's face is already registered as '{matched_user['name']}' (Roll ID: {matched_user['roll_id'] or 'N/A'}, Dept: {matched_user['department'] or 'General'}) with {matched_user['confidence_percent']}% biometric match."
                )
            saved_images_bytes[angle_name] = img_bytes
            saved_embeddings[angle_name] = val["embedding"]

    if len(saved_embeddings) == 0:
        raise HTTPException(
            status_code=400,
            detail="Could not detect a clear face in photo. Please ensure proper lighting and look towards the camera."
        )

    user_record = db.add_user(
        name=name,
        roll_id=roll_id,
        department=department,
        rfid_tag=rfid_tag,
        angle_images=saved_images_bytes,
        angle_embeddings=saved_embeddings,
        signature_bytes=signature_bytes
    )

    engine.reload_cache()

    return {
        "success": True,
        "message": f"Successfully registered candidate {name} to the universal database with RFID Tag: {rfid_tag or 'None'}.",
        "user": user_record
    }

# =============================================================================
# 1.2. RFID Smart Card Scanner & Hardware Engine API
# =============================================================================
@app.get("/api/rfid/latest")
def get_latest_rfid(max_age: Optional[float] = Query(None, description="Max age in seconds for scan recency")):
    scan = rfid_engine.get_latest_scan(max_age_seconds=max_age)
    if scan:
        user = db.find_user_by_rfid(scan["tag"])
        reg_photo = list(user.get("images", {}).values())[0] if user and user.get("images") else None
        return {
            "scanned": True,
            "scan": scan,
            "is_registered": user is not None,
            "user": user,
            "registered_photo": f"/api/{reg_photo}" if reg_photo else None,
            "is_connected": rfid_engine.is_connected()
        }
    return {
        "scanned": False,
        "scan": None,
        "is_connected": rfid_engine.is_connected(),
        "port": rfid_engine.com_port
    }

@app.post("/api/rfid/scan")
def trigger_rfid_scan(req: RFIDScanRequest):
    scan = rfid_engine.manual_scan(req.tag)
    user = db.find_user_by_rfid(scan["tag"])
    reg_photo = list(user.get("images", {}).values())[0] if user and user.get("images") else None
    return {
        "success": True,
        "scan": scan,
        "is_registered": user is not None,
        "user": user,
        "registered_photo": f"/api/{reg_photo}" if reg_photo else None
    }

@app.get("/api/rfid/lookup/{rfid_tag}")
def lookup_rfid_candidate(rfid_tag: str, active_room_id: Optional[str] = None):
    clean_tag = rfid_tag.strip()
    user = db.find_user_by_rfid(clean_tag)
    if not user:
        return {
            "success": False,
            "registered": False,
            "message": f"RFID Tag '{clean_tag}' is not registered in the university system.",
            "candidate": None
        }

    status_info = db.get_candidate_status(user["id"], active_room_id=active_room_id)
    reg_photo = list(user.get("images", {}).values())[0] if user.get("images") else None
    reg_sig = db.get_candidate_signature_path(user["id"])

    return {
        "success": True,
        "registered": True,
        "candidate": user,
        "status_info": status_info,
        "registered_photo": f"/api/{reg_photo}" if reg_photo else None,
        "registered_signature": f"/api/{reg_sig}" if reg_sig else None
    }

@app.get("/api/rfid/ports")
def get_rfid_ports():
    return {
        "ports": rfid_engine.list_ports(),
        "current_port": rfid_engine.com_port,
        "baud_rate": rfid_engine.baud_rate,
        "is_connected": rfid_engine.is_connected()
    }

@app.post("/api/rfid/config")
def set_rfid_config(req: RFIDConfigRequest):
    res = rfid_engine.configure(port=req.port, baud_rate=req.baud_rate or 9600)
    return res

@app.post("/api/rfid/clear")
def clear_rfid_scan():
    rfid_engine.clear_latest_scan()
    return {"success": True}

# =============================================================================
# 1.3. 3-Factor Biometric & RFID Verification (RFID + Face + Signature)
# =============================================================================
@app.post("/api/attendance/verify-3factor")
def verify_three_factor_entry(req: Verify3FactorRequest):
    """
    Validates complete 3-Factor Exam Entrance:
    1. RFID Card matches registered candidate C.
    2. candidate_id matches C.
    3. Face image matches C (if face_image provided).
    4. Digital signature matches C's reference signature (>= 50%).
    """
    # Factor 1: RFID Match
    rfid_user = db.find_user_by_rfid(req.rfid_tag)
    if not rfid_user:
        raise HTTPException(
            status_code=400,
            detail=f"❌ RFID Mismatch: Tag '{req.rfid_tag}' is not registered in the system."
        )

    if rfid_user["id"] != req.candidate_id:
        cand_user = db.get_user(req.candidate_id)
        cand_name = cand_user["name"] if cand_user else req.candidate_id
        raise HTTPException(
            status_code=400,
            detail=f"❌ Identity Mismatch: Scanned RFID card belongs to '{rfid_user['name']}' (ID: {rfid_user.get('roll_id', 'N/A')}), but selected candidate is '{cand_name}'!"
        )

    # Factor 2: Face Recognition Match (if live face snapshot provided)
    face_score = 1.0
    if req.face_image:
        face_img = decode_base64_image(req.face_image)
        if face_img is not None:
            face_val = engine.validate_and_extract_face(face_img, min_confidence=0.45)
            if face_val["success"] and face_val.get("embedding") is not None:
                matched_user = engine.find_matching_registered_user(face_val["embedding"], threshold=req.face_threshold or 0.363)
                if not matched_user or matched_user["user_id"] != rfid_user["id"]:
                    detected_name = matched_user["name"] if matched_user else "Unknown Person"
                    # Log security proxy alert
                    db.log_proxy_alert(
                        snapshot_bytes=decode_base64_bytes(req.face_image) or b"",
                        confidence=0.95,
                        notes=f"🚨 3-Factor Biometric Mismatch: Face '{detected_name}' does not match RFID Card holder '{rfid_user['name']}' ({rfid_user.get('roll_id', '')})."
                    )
                    raise HTTPException(
                        status_code=400,
                        detail=f"❌ Biometric Face Mismatch: Detected face ({detected_name}) does NOT match RFID Card holder '{rfid_user['name']}' ({rfid_user.get('roll_id', 'N/A')})!"
                    )

    # Factor 3: Signature Verification
    sig_result = None
    if req.signature:
        reg_bytes = db.get_candidate_signature_bytes(rfid_user["id"])
        sig_bytes = decode_base64_bytes(req.signature)
        if not sig_bytes:
            raise HTTPException(status_code=400, detail="❌ Signature data is missing or invalid.")
        
        sig_result = sig_engine.verify_signature(
            candidate_id=rfid_user["id"],
            live_bytes=sig_bytes,
            registered_bytes=reg_bytes,
            threshold=req.signature_threshold or 0.50
        )

        if not sig_result["verified"]:
            raise HTTPException(
                status_code=400,
                detail=f"❌ Digital Signature Mismatch: Match score is {sig_result['similarity_percent']}% (Minimum {int(sig_result['threshold']*100)}% required). Please sign again carefully."
            )

    return {
        "success": True,
        "verified": True,
        "candidate": rfid_user,
        "rfid_tag": req.rfid_tag,
        "signature_verification": sig_result,
        "message": f"✅ All 3 Factors (RFID + Face + Signature) verified successfully for {rfid_user['name']}!"
    }

# =============================================================================
# 1.5. Biometric Digital Signature Matcher & Verification
# =============================================================================
@app.post("/api/signature/verify")
async def verify_signature(req: VerifySignatureRequest):
    user = db.get_user(req.candidate_id)
    if not user:
        raise HTTPException(status_code=404, detail="Candidate not found")

    live_bytes = decode_base64_bytes(req.signature)
    if not live_bytes:
        raise HTTPException(status_code=400, detail="Invalid live signature data")

    reg_bytes = db.get_candidate_signature_bytes(req.candidate_id)
    result = sig_engine.compare_signatures(
        registered_bytes=reg_bytes,
        live_bytes=live_bytes,
        threshold=req.threshold or 0.50
    )

    reg_path = db.get_candidate_signature_path(req.candidate_id)
    result["registered_signature_url"] = f"/api/{reg_path}" if reg_path else None
    result["candidate_id"] = req.candidate_id
    result["candidate_name"] = user.get("name", "")
    return result

# =============================================================================
# 2. Real-Time Room-Aware Recognition
# =============================================================================
@app.post("/api/recognize")
async def recognize(req: RecognizeRequest):
    img = decode_base64_image(req.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    results = engine.recognize_frame(img, threshold=req.threshold)

    # Evaluate Room Allocation, Schedule, Admit Card Status & Registered Signature for each detected face
    for face in results:
        if face["is_recognized"] and face.get("user_id"):
            status_info = db.get_candidate_status(face["user_id"], active_room_id=req.active_room_id)
            face["attendance_status"] = status_info["status"]
            face["allocation"] = status_info.get("allocation")
            face["admit_status"] = status_info.get("admit_status", "CLEARED")
            face["allocated_room_name"] = status_info.get("allocated_room_name")
            face["allocated_seat"] = status_info.get("allocated_seat")
            face["active_room_name"] = status_info.get("active_room_name")
            face["remarks"] = status_info.get("remarks", "")
            face["attendance_record"] = status_info.get("record")
            face["schedule"] = status_info.get("schedule")
            face["allowed_departments"] = status_info.get("allowed_departments")
            face["candidate_department"] = status_info.get("candidate_department")
            face["schedule_end_time"] = status_info.get("schedule_end_time")
            
            sig_path = db.get_candidate_signature_path(face["user_id"])
            face["registered_signature"] = f"/api/{sig_path}" if sig_path else None
        else:
            face["attendance_status"] = "UNREGISTERED"
            face["allocation"] = None
            face["attendance_record"] = None
            face["schedule"] = None
            face["registered_signature"] = None

    return {
        "success": True,
        "faces_count": len(results),
        "faces": results
    }

# =============================================================================
# 3. Room & Schedule Management
# =============================================================================
@app.get("/api/rooms")
async def get_rooms():
    rooms = db.get_rooms()
    return {"rooms": rooms, "total": len(rooms)}

@app.post("/api/rooms")
async def add_room(req: CreateRoomRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Room name is required")
    room = db.add_room(
        name=req.name,
        building=req.building or "",
        capacity=req.capacity or 40,
        default_start_time=req.default_start_time or "09:00",
        default_end_time=req.default_end_time or "12:00"
    )
    return {"success": True, "room": room}

@app.delete("/api/rooms/{room_id}")
async def delete_room(room_id: str):
    db.delete_room(room_id)
    return {"success": True, "message": "Room deleted successfully"}

@app.put("/api/rooms/{room_id}")
async def update_room(room_id: str, req: UpdateRoomRequest):
    room = db.update_room(
        room_id=room_id,
        name=req.name,
        building=req.building,
        capacity=req.capacity,
        default_start_time=req.default_start_time,
        default_end_time=req.default_end_time
    )
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"success": True, "room": room}

@app.get("/api/rooms/{room_id}/allocations")
async def get_room_allocations(room_id: str):
    allocations = db.get_room_allocations(room_id)
    return {"allocations": allocations, "total": len(allocations)}

@app.delete("/api/rooms/{room_id}/allocations/{candidate_id}")
async def remove_candidate_from_room(room_id: str, candidate_id: str):
    success = db.remove_candidate_from_room(room_id, candidate_id)
    if not success:
        raise HTTPException(status_code=404, detail="Candidate is not assigned to this room")
    return {"success": True, "message": "Candidate removed from room successfully"}

@app.post("/api/rooms/{room_id}/allocations")
async def batch_allocate_to_room(room_id: str, req: BatchAllocateRoomRequest):
    allocs = db.batch_allocate_room(room_id, req.assignments)
    return {"success": True, "allocations": allocs, "total": len(allocs)}

# Exam Schedules & Timetables API
@app.get("/api/schedules")
async def get_schedules():
    scheds = db.get_schedules()
    return {"schedules": scheds, "total": len(scheds)}

@app.post("/api/schedules")
async def add_schedule(req: CreateScheduleRequest):
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Schedule title is required")
    sched = db.add_schedule(
        title=req.title,
        course_code=req.course_code or "",
        date_str=req.date or "",
        start_time=req.start_time or "09:00",
        end_time=req.end_time or "12:00",
        departments=req.departments or ["ALL"],
        hall_ids=req.hall_ids or [],
        washroom_limit_minutes=req.washroom_limit_minutes or 10,
        entry_grace_minutes=req.entry_grace_minutes or 30,
        enrolled_student_ids=req.enrolled_student_ids or [],
        student_clearance_map=req.student_clearance_map or {},
        hall_student_map=req.hall_student_map or {}
    )
    return {"success": True, "schedule": sched}

@app.put("/api/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, req: UpdateScheduleRequest):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    sched = db.update_schedule(schedule_id, updates)
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"success": True, "schedule": sched}

@app.delete("/api/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    db.delete_schedule(schedule_id)
    return {"success": True, "message": "Schedule deleted successfully"}

@app.get("/api/schedules/active")
async def get_active_schedule(room_id: str = Query(...)):
    sched = db.get_active_schedule_for_room(room_id)
    return {"active_schedule": sched}

# =============================================================================
# 3.5 Department & Course Management Endpoints
# =============================================================================
@app.get("/api/departments")
async def get_departments():
    depts = db.get_departments()
    return {"departments": depts, "total": len(depts)}

@app.post("/api/departments")
async def create_department(req: CreateDeptRequest):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Department name is required")
    dept = db.add_department(name=req.name, code=req.code)
    return {"success": True, "department": dept}

@app.put("/api/departments/{dept_id}")
async def update_department(dept_id: str, req: UpdateDeptRequest):
    dept = db.update_department(dept_id, name=req.name, code=req.code)
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"success": True, "department": dept}

@app.delete("/api/departments/{dept_id}")
async def delete_department(dept_id: str):
    success = db.delete_department(dept_id)
    if not success:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"success": True, "message": "Department deleted successfully"}

@app.post("/api/departments/{dept_id}/courses")
async def create_course(dept_id: str, req: CreateCourseRequest):
    if not req.title.strip():
        raise HTTPException(status_code=400, detail="Course title is required")
    course = db.add_course(
        dept_id,
        title=req.title,
        code=req.code,
        enrolled_student_ids=req.enrolled_student_ids or []
    )
    if not course:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"success": True, "course": course}

@app.put("/api/departments/{dept_id}/courses/{course_id}")
async def update_course(dept_id: str, course_id: str, req: UpdateCourseRequest):
    course = db.update_course(
        dept_id,
        course_id,
        title=req.title,
        code=req.code,
        enrolled_student_ids=req.enrolled_student_ids
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course or Department not found")
    return {"success": True, "course": course}

@app.delete("/api/departments/{dept_id}/courses/{course_id}")
async def delete_course(dept_id: str, course_id: str):
    success = db.delete_course(dept_id, course_id)
    if not success:
        raise HTTPException(status_code=404, detail="Course or Department not found")
    return {"success": True, "message": "Course deleted successfully"}

@app.post("/api/departments/{dept_id}/courses/{course_id}/enroll")
async def enroll_students(dept_id: str, course_id: str, req: EnrollCourseRequest):
    course = db.enroll_students_in_course(dept_id, course_id, req.student_ids)
    if not course:
        raise HTTPException(status_code=404, detail="Course or Department not found")
    return {"success": True, "course": course}

# =============================================================================
# 3.6. Weekly Room Class Routines
# =============================================================================
@app.get("/api/routines")
async def get_routines(
    room_id: Optional[str] = None,
    department: Optional[str] = None,
    day: Optional[str] = None
):
    routines = db.get_class_routines(room_id=room_id, department=department, day=day)
    return {"routines": routines, "total": len(routines)}

@app.post("/api/routines")
async def create_routine(req: CreateClassRoutineRequest):
    routine = db.add_class_routine(
        room_id=req.room_id,
        department=req.department,
        day=req.day,
        time_slot=req.time_slot,
        start_time=req.start_time or "",
        end_time=req.end_time or "",
        is_gap=bool(req.is_gap),
        course_code=req.course_code or "",
        course_name=req.course_name or "",
        instructor=req.instructor or "",
        section=req.section or "",
        semester=req.semester or "",
        remarks=req.remarks or ""
    )
    return {"success": True, "routine": routine}

@app.put("/api/routines/{routine_id}")
async def update_routine(routine_id: str, req: UpdateClassRoutineRequest):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    routine = db.update_class_routine(routine_id, updates)
    if not routine:
        raise HTTPException(status_code=404, detail="Routine slot not found")
    return {"success": True, "routine": routine}

@app.delete("/api/routines/{routine_id}")
async def delete_routine(routine_id: str):
    db.delete_class_routine(routine_id)
    return {"success": True, "message": "Routine slot deleted successfully"}

@app.post("/api/routines/batch")
async def batch_save_routines(req: BatchClassRoutineRequest):
    routines = db.batch_save_class_routines(req.routines)
    return {"success": True, "routines": routines, "total": len(routines)}

@app.delete("/api/routines/room/{room_id}")
async def clear_room_routines(room_id: str, day: Optional[str] = None):
    db.clear_room_routines(room_id, day=day)
    return {"success": True, "message": f"Routines cleared for room {room_id}"}

# =============================================================================
# 4. Seating Allocation & Admit Card Clearance
# =============================================================================
@app.get("/api/allocations")
async def get_allocations():
    allocs = db.get_all_allocations()
    return {"allocations": allocs, "total": len(allocs)}

@app.post("/api/allocations")
async def allocate_candidate(req: AllocateCandidateRequest):
    try:
        alloc = db.allocate_candidate(
            candidate_id=req.candidate_id,
            room_id=req.room_id,
            seat_number=req.seat_number or "Seat A-01",
            admit_status=req.admit_status or "CLEARED",
            remarks=req.remarks or ""
        )
        return {"success": True, "allocation": alloc}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/allocations/clear-admit")
async def clear_admit_card(req: ClearAdmitRequest):
    try:
        alloc = db.update_admit_clearance(
            candidate_id=req.candidate_id,
            admit_status=req.admit_status,
            special_clearance_by=req.special_clearance_by,
            remarks=req.remarks
        )
        return {"success": True, "message": "Admit clearance updated successfully", "allocation": alloc}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/admit-card/{candidate_id}")
async def get_admit_card(candidate_id: str):
    user = db.get_user(candidate_id)
    if not user:
        raise HTTPException(status_code=404, detail="Candidate not found")

    alloc = db.get_candidate_allocation(candidate_id)
    first_img = list(user.get("images", {}).values())[0] if user.get("images") else None

    return {
        "candidate_id": user["id"],
        "name": user["name"],
        "roll_id": user.get("roll_id", "N/A"),
        "department": user.get("department", "Computer Science"),
        "photo": f"/api/{first_img}" if first_img else None,
        "exam_name": "Final Semester Examination 2026",
        "room_name": alloc.get("room_name") if alloc else "Main Hall",
        "seat_number": alloc.get("seat_number") if alloc else "Seat A-01",
        "admit_status": alloc.get("admit_status") if alloc else "CLEARED",
        "remarks": alloc.get("remarks") if alloc else "Regular Examination",
        "issue_date": date.today().isoformat()
    }

# =============================================================================
# 5. Room-Aware Attendance Actions & Reports
# =============================================================================
@app.post("/api/attendance/action")
@app.post("/api/attendance/action/")
async def mark_attendance_action(req: AttendanceActionRequest):
    snap_bytes = decode_base64_bytes(req.image) if req.image else None
    sig_bytes = decode_base64_bytes(req.signature) if req.signature else None

    try:
        record = db.mark_attendance(
            candidate_id=req.candidate_id,
            action=req.action,
            active_room_id=req.active_room_id,
            snapshot_bytes=snap_bytes,
            signature_bytes=sig_bytes,
            exam_name=req.exam_name,
            hall_name=req.hall_name,
            override_admit=req.override_admit,
            override_schedule=req.override_schedule
        )
        return {
            "success": True,
            "message": f"Successfully marked {req.action} for {record['name']}",
            "record": record
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/attendance/today")
async def get_today_attendance(room_id: Optional[str] = Query(None)):
    data = db.get_today_attendance(room_id=room_id)
    return data

@app.get("/api/attendance/status/{candidate_id}")
async def get_candidate_attendance_status(candidate_id: str, room_id: Optional[str] = Query(None)):
    info = db.get_candidate_status(candidate_id, active_room_id=room_id)
    return info

@app.get("/api/attendance/washroom-active")
async def get_active_washroom_candidates(room_id: Optional[str] = Query(None)):
    data = db.get_today_attendance(room_id=room_id)
    active_washroom = [r for r in data["records"] if r.get("status") == "WASHROOM"]
    return {
        "active_washroom_candidates": active_washroom,
        "count": len(active_washroom)
    }

@app.post("/api/attendance/log-proxy")
async def log_proxy_attempt(req: ProxyAlertRequest):
    snap_bytes = decode_base64_bytes(req.image) if req.image else None
    alert = db.log_proxy_alert(
        snapshot_bytes=snap_bytes,
        confidence=req.confidence,
        notes=req.notes
    )
    return {"success": True, "alert": alert}

@app.get("/api/attendance/alerts")
async def get_proxy_alerts():
    alerts = db.get_proxy_alerts()
    return {"alerts": alerts, "total": len(alerts)}

@app.put("/api/attendance/alerts/{alert_id}")
async def update_proxy_alert(alert_id: str, req: UpdateAlertRequest):
    updates = req.model_dump(exclude_unset=True)
    al = db.update_alert(alert_id, updates)
    if not al:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True, "alert": al}

@app.delete("/api/attendance/alerts/{alert_id}")
async def delete_proxy_alert(alert_id: str):
    deleted = db.delete_alert(alert_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"success": True, "message": "Alert deleted"}

@app.delete("/api/attendance/alerts")
async def clear_all_proxy_alerts():
    db.clear_all_alerts()
    return {"success": True, "message": "All security alerts have been cleared"}

@app.post("/api/attendance/reset")
async def reset_attendance():
    db.reset_today_attendance()
    return {"success": True, "message": "Today's attendance sheet has been reset."}

@app.put("/api/attendance/records/{candidate_id}")
async def update_attendance_record(candidate_id: str, req: UpdateAttendanceRecordRequest):
    try:
        updates = req.model_dump(exclude_unset=True)
        day_key = updates.pop("day_key", None)
        rec = db.update_attendance_record(candidate_id, updates, day_key=day_key)
        return {
            "success": True,
            "message": f"Updated attendance record for {rec.get('name', 'candidate')}",
            "record": rec
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/attendance/records/{candidate_id}")
async def delete_attendance_record(candidate_id: str, day_key: Optional[str] = Query(None)):
    try:
        deleted = db.delete_attendance_record(candidate_id, day_key=day_key)
        return {
            "success": True,
            "deleted": deleted,
            "message": "Attendance record cleared for this candidate."
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/attendance/export-csv")
async def export_attendance_csv(room_id: Optional[str] = Query(None)):
    csv_data = db.export_attendance_csv(room_id=room_id)
    filename = f"Exam_Attendance_{db._get_today_key()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/attendance/snapshots/{date_str}/{candidate_id}/{filename}")
async def get_attendance_snapshot(date_str: str, candidate_id: str, filename: str):
    file_path = os.path.join(ATTENDANCE_DIR, date_str, candidate_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return FileResponse(file_path)

@app.get("/api/attendance/snapshots/{date_str}/alerts/{filename}")
async def get_alert_snapshot(date_str: str, filename: str):
    file_path = os.path.join(ATTENDANCE_DIR, date_str, "alerts", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Alert snapshot not found")
    return FileResponse(file_path)

# =============================================================================
# 6. Candidate Directory & Stats
# =============================================================================
@app.get("/api/users")
async def get_users():
    users = db.get_users()
    users.sort(key=lambda u: u.get("created_at", ""), reverse=True)
    return {"users": users, "total": len(users)}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str):
    success = db.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    engine.reload_cache()
    return {"success": True, "message": "Candidate deleted successfully"}

@app.get("/api/faces/{user_id}/{filename}")
async def get_face_image(user_id: str, filename: str):
    file_path = os.path.join(FACES_DIR, user_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@app.get("/api/stats")
async def get_stats():
    users = db.get_users()
    att = db.get_today_attendance()
    return {
        "total_candidates": len(users),
        "total_rooms": len(db.get_rooms()),
        "total_schedules": len(db.get_schedules()),
        "present_inside": att["present_inside"],
        "in_washroom": att.get("in_washroom", 0),
        "exited": att["exited"],
        "absent": att["absent"],
        "washroom_violations": att.get("washroom_violations", 0),
        "alerts_count": len(db.get_proxy_alerts())
    }

# =============================================================================
# 7. Continuous Exam Hall Surveillance & Active Presence Monitoring
# =============================================================================
@app.post("/api/monitoring/frame")
async def process_monitoring_frame(req: MonitoringFrameRequest):
    img = decode_base64_image(req.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    # Detect faces and posture (including head-down writing detection)
    results = engine.recognize_frame(img, threshold=req.threshold, score_threshold=0.42)

    # Attach candidate allocation and attendance statuses
    for face in results:
        if face["is_recognized"] and face.get("user_id"):
            status_info = db.get_candidate_status(face["user_id"], active_room_id=req.active_room_id)
            face["attendance_status"] = status_info["status"]
            face["allocation"] = status_info.get("allocation")
            face["admit_status"] = status_info.get("admit_status", "CLEARED")
            face["allocated_room_name"] = status_info.get("allocated_room_name")
            face["allocated_seat"] = status_info.get("allocated_seat")
            face["active_room_name"] = status_info.get("active_room_name")
            face["remarks"] = status_info.get("remarks", "")
            face["attendance_record"] = status_info.get("record")
            face["schedule"] = status_info.get("schedule")
            face["allowed_departments"] = status_info.get("allowed_departments")
            face["candidate_department"] = status_info.get("candidate_department")
        else:
            face["attendance_status"] = "UNREGISTERED"
            face["allocation"] = None
            face["attendance_record"] = None

    # Update continuous presence registry and detect missing candidates / writing posture
    snap_bytes = decode_base64_bytes(req.image)
    presence_summary = db.update_continuous_presence(
        active_room_id=req.active_room_id,
        detected_faces=results,
        snapshot_bytes=snap_bytes
    )

    return {
        "success": True,
        "faces_count": len(results),
        "faces": results,
        "monitoring": presence_summary
    }

@app.get("/api/monitoring/status")
async def get_monitoring_status(room_id: Optional[str] = Query(None)):
    status_data = db.get_continuous_monitoring_status(active_room_id=room_id)
    return status_data

@app.get("/api/monitoring/config")
async def get_monitoring_config():
    cfg = db.get_monitoring_config()
    return {"success": True, "config": cfg}

@app.post("/api/monitoring/config")
async def update_monitoring_config(req: UpdateMonitoringConfigRequest):
    try:
        cfg = db.update_monitoring_config(
            absence_threshold_sec=req.absence_threshold_sec,
            gate_arrival_threshold_sec=req.gate_arrival_threshold_sec,
            grace_period_sec=req.grace_period_sec,
            auto_alert_voice=req.auto_alert_voice
        )
        return {"success": True, "config": cfg}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update config: {str(e)}")

# =============================================================================
# 8. Classroom Surveillance & Live Class Attendance Monitoring
# =============================================================================
@app.post("/api/classroom/frame")
async def process_classroom_frame(req: ClassroomFrameRequest):
    img = decode_base64_image(req.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    results = engine.recognize_frame(img, threshold=req.threshold, score_threshold=0.42)

    presence_summary = db.update_classroom_surveillance(
        room_id=req.room_id,
        department=req.department or "ALL",
        course_code=req.course_code,
        course_name=req.course_name or req.course_code,
        detected_faces=results,
        absence_threshold_sec=req.absence_threshold_sec or 45,
        day=req.day,
        time_slot=req.time_slot
    )

    return {
        "success": True,
        "faces_count": len(results),
        "faces": results,
        "classroom": presence_summary
    }

@app.get("/api/classroom/status")
async def get_classroom_status(room_id: str = Query(...), course_code: str = Query(...)):
    status_data = db.get_classroom_session_status(room_id=room_id, course_code=course_code)
    return status_data

@app.post("/api/classroom/reset")
async def reset_classroom_session(room_id: str = Query(...), course_code: str = Query(...)):
    success = db.reset_classroom_session(room_id=room_id, course_code=course_code)
    return {"success": success, "message": "Classroom session reset successfully"}

# Root endpoint
@app.get("/")
async def root():
    return {
        "status": "online",
        "system": "DigiHall AI Backend Engine",
        "version": "3.0.0",
        "docs_url": "/docs",
        "frontend_dev_url": "http://localhost:3000"
    }

