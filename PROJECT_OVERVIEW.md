# DigiHall AI — Project Architecture & Complete Technical Overview

> **Note for AI Assistant**: This document is the single source of truth for the **DigiHall AI** project. Read this file to immediately understand the entire application's purpose, architecture, backend AI engines, frontend UI tabs, state management, business rules, API endpoints, and data schema.

---

## 1. Project Summary & Purpose

**DigiHall AI** is an automated, AI-powered **University Exam Hall Attendance, Identity Verification, and Continuous Anti-Proxy Surveillance System**. 

It eliminates proxy candidates, automates exam entry/exit logging, tracks student washroom breaks, audits continuous seat presence (distinguishing head-down writing from absence), and provides real-time multi-angle facial verification.

---

## 2. Tech Stack & Core Dependencies

### Backend (Python / FastAPI)
- **Framework**: `FastAPI` (Python 3.10+ / 3.13) with `Uvicorn` server (`http://127.0.0.1:8000`).
- **AI Face Detection**: **OpenCV YuNet** (`face_detection_yunet_2023mar.onnx`) with 5-point facial landmarks (right eye, left eye, nose tip, right mouth corner, left mouth corner).
- **AI Face Recognition**: **OpenCV SFace** (`face_recognition_sface_2021dec.onnx`) producing 128-D normalized embedding vectors with Cosine Similarity comparison (default threshold ~ `0.363`).
- **Posture & Pose Engine**: Pure geometric trigonometry on 5 YuNet facial landmarks (Pitch, Yaw, Roll, eye-to-nose vertical ratios) to detect head-down writing posture on exam desks without heavy neural nets.
- **Data Storage**: High-performance local JSON flat-file database with in-memory caching and snapshot image storage (`data/` directory).

### Frontend (Next.js / React / Tailwind)
- **Framework**: `Next.js 14` (App Router, Client-side React 18, `http://localhost:3000`).
- **Styling**: `Tailwind CSS 3`, custom dark glassmorphism theme (`#080e1a` base, `#0f172a` surfaces, emerald/cyan/indigo/rose accents).
- **Icons**: `lucide-react`.
- **Audio & TTS**: HTML5 Web Audio API (synthesized tone beeps) & Web Speech API (`speechSynthesis` for real-time automated voice announcements).
- **State Management**: React Context (`AppContext.jsx`) with live polling and seamless reactive updates.

---

## 3. Directory Structure & Key Files

```
Face Detect & Monitoring/
├── PROJECT_OVERVIEW.md         <-- This complete technical overview
├── README.md                   <-- Brief project description
├── start.bat / dev.bat         <-- Windows 1-click startup scripts (starts FastAPI + Next.js)
├── main.py                     <-- Backend entrypoint with auto-browser launcher & Uvicorn
├── requirements.txt            <-- Python dependencies (fastapi, uvicorn, opencv-python, numpy)
│
├── backend/                    <-- FastAPI AI Backend
│   ├── app.py                  <-- REST API routes, request handlers, Pydantic schemas
│   ├── database.py             <-- FaceDatabase class, data loading/saving, business logic
│   ├── face_engine.py          <-- FaceEngine class, frame recognition, cache management
│   ├── models_manager.py       <-- Downloads & initializes YuNet & SFace ONNX models
│   └── posture_engine.py       <-- PostureEngine (Writing / Attentive / Looking Away detection)
│
├── frontend/                   <-- Next.js 14 Frontend Application
│   ├── package.json            <-- Frontend dependencies (next, react, lucide-react, tailwindcss)
│   ├── tailwind.config.js      <-- Tailwind configuration
│   └── src/
│       ├── app/
│       │   ├── layout.jsx      <-- Root layout with AppProvider & Toast container
│       │   ├── page.jsx        <-- Main app shell with dynamic tab rendering
│       │   └── globals.css     <-- Custom styles, glow effects, scrollbar styling
│       ├── context/
│       │   └── AppContext.jsx  <-- Global React state (rooms, active exam, audio, users, alerts)
│       ├── services/
│       │   └── api.js          <-- Fetch wrapper for all backend REST endpoints
│       ├── utils/
│       │   ├── audio.js        <-- Web Audio API sounds & Web Speech API TTS voice engine
│       │   └── faceDrawing.js  <-- HTML5 canvas bounding box, landmarks, HUD overlay renderer
│       └── components/
│           ├── layout/         <-- Header, NavTabs, SessionBanner
│           ├── attendance/     <-- AttendanceScanner, CandidateCard, RecentPunches, WashroomMonitor
│           ├── monitoring/     <-- ContinuousMonitor (AI Hall CCTV, seat tracking, thresholds)
│           ├── registration_hub/<-- RegistrationHub (Student Enroll, Room Setup, Exam Timetable)
│           ├── schedules/      <-- SchedulesManager, CreateScheduleModal
│           ├── sheet/          <-- AttendanceSheet (Live master sheet, CSV/Print export), AuditProofModal
│           ├── alerts/         <-- SecurityAlerts (Proxy alerts, filter pills, edit, single/all delete)
│           ├── database/       <-- CandidateBank (View registered candidates, multi-angle gallery)
│           ├── settings/       <-- SystemSettings (Voice, sound, thresholds, grace periods)
│           └── ui/             <-- StatCard, Toast
│
├── models/                     <-- ONNX deep learning models (auto-downloaded)
│   ├── face_detection_yunet_2023mar.onnx
│   └── face_recognition_sface_2021dec.onnx
│
└── data/                       <-- Database & Stored Artifacts
    ├── database.json           <-- Registered student profiles & multi-angle face embeddings
    ├── rooms.json              <-- Exam halls, capacities, default timings
    ├── schedules.json          <-- Exam subjects, allowed departments, active halls, timings
    ├── departments.json        <-- University departments & curriculum courses
    ├── allocations.json        <-- Seat & room allocation mappings for students
    ├── attendance.json         <-- Daily punches (Entry, Washroom Out/In, Exit, Presence history)
    ├── proxy_alerts.json       <-- Security breaches (Unregistered faces, delayed arrival, overtime)
    ├── faces/                  <-- Multi-angle enrollment photos partitioned by student ID
    └── attendance/             <-- Real-time audit photos partitioned by date and student ID
```

---

## 4. Frontend UI Modules & Navigation Tabs

The frontend UI is organized into 8 tabs managed by `activeTab` in `AppContext`:

| Tab Key | Tab Label | Primary Purpose | Key Components |
|---|---|---|---|
| `attendance` | **Live Gate Attendance** | Real-time entry/exit verification scanner with camera HUD, instant student card, manual punch controls, recent punches, and live washroom tracker. | `AttendanceScanner`, `CandidateCard`, `RecentPunches`, `WashroomMonitor` |
| `monitoring` | **Continuous Hall Monitor** | AI CCTV hall surveillance. Detects allocated students, monitors head-down writing vs. looking away, tracks gate-arrival threshold (e.g. 5 min) and seat absence threshold (e.g. 45 sec), records departure/return history logs, and triggers proxy alerts. | `ContinuousMonitor` |
| `registration_hub` | **Registration Hub** | Unified 3-in-1 management studio for Student Multi-Angle Enrollment, Exam Hall Room Creation, and Exam Timetable Scheduling. | `RegistrationHub` |
| `schedules` | **Exam Timetable** | View, activate, deactivate, or create exam timetables with subject codes, date/time ranges, and department restrictions. | `SchedulesManager`, `CreateScheduleModal` |
| `sheet` | **Master Attendance Sheet** | Comprehensive attendance table showing Roll, Name, Dept, Room, Seat, Status (`PRESENT`, `ABSENT`, `IN_WASHROOM`, `EXITED`), Entry/Exit times, Desk departure count, and photo proof lightbox. Includes CSV & Print export. | `AttendanceSheet`, `AuditProofModal` |
| `alerts` | **Security Violations & Proxy Logs** | Audit log for unregistered faces, seat absences, washroom overtimes, and late gate arrivals. Supports Search, Category Filter Pills, Modal Editing, Individual Deletion, and Clear-All Logs. | `SecurityAlerts` |
| `database` | **Candidate Bank** | Searchable database of all enrolled students with department breakdown, multi-angle face photo galleries, and delete actions. | `CandidateBank`, `PhotoGalleryModal` |
| `settings` | **System Settings** | Configuration for Face Recognition Threshold (default `0.363`), Audio Beeps, Voice Announcements, Camera Selection, and Mirroring. | `SystemSettings` |

---

## 5. Core Business Logic & State Machines

### 1. Student Verification & Gate Attendance
- When a student faces the Gate camera:
  - YuNet detects face and SFace computes cosine distance against cached database embeddings.
  - Verification checks:
    1. **Identity**: Match score $\ge$ threshold (e.g., $0.363$).
    2. **Exam Schedule**: Is an exam active right now? Is today the scheduled date?
    3. **Department Clearance**: Is the student's department included in the active schedule's `departments`?
    4. **Room Allocation**: Is the student assigned to this specific room? If not $ightarrow$ `WRONG_ROOM` alert with voice guidance.
    5. **Admit Card Status**: Is admit cleared or pending?
- Actions: `ENTRY`, `WASHROOM_OUT`, `WASHROOM_IN`, `EXIT`. Proof snapshots are automatically stored in `data/attendance/YYYY-MM-DD/{student_id}/`.

### 2. Continuous Hall Surveillance & Presence Rules
- **Live Active Only**: When an exam is live in the selected hall, continuous monitoring activates. When exam ends or in standby, it acts as a silent camera without false alarms.
- **Selective Tracking**: Only monitors students who have checked in at the gate (`ENTRY`) and are allocated to this hall.
- **Two-Tier Threshold Tracking**:
  - **Tier 1 (Gate Arrival Threshold)**: After gate entry, candidate must reach the hall surveillance camera within $X$ minutes (default: 5 minutes / 300s, customizable in UI). If not seen $ightarrow$ flagged as missing / late arrival.
  - **Tier 2 (Absence Threshold)**: Once detected in hall, if absent from camera frame for more than $Y$ seconds (default: 45s, customizable in UI) while not officially in washroom $ightarrow$ marked absent, timestamp logged to student's history file.
  - **Return Event**: When the student returns, the return time is logged, calculating total time absent.
- **Exit Handling**: Once a student punches `EXIT`, monitoring stops tracking them.
- **Writing Posture Detection**: Analyzes 5 facial landmarks. If vertical eye-to-nose ratio $>0.62$ or box ratio compressed $ightarrow$ classified as `WRITING (Head Down)` and marked active on desk.

### 3. Washroom Monitoring
- Student punches `WASHROOM_OUT` $ightarrow$ Status changes to `IN_WASHROOM`.
- Live stopwatch runs in `WashroomMonitor`.
- If duration exceeds limit (default: 10 mins) $ightarrow$ Marked as `OVERTIME`, warning voice triggers, and security breach alert is logged.
- Student returns and punches `WASHROOM_IN` $ightarrow$ Status restored to `PRESENT`.

---

## 6. REST API Reference (FastAPI)

### Face Recognition & Gate Attendance
- `POST /api/recognize` — Detects and recognizes faces in base64 frame.
- `POST /api/attendance/action` — Records punch (`ENTRY`, `EXIT`, `WASHROOM_OUT`, `WASHROOM_IN`).
- `GET /api/attendance/today` — Retrieves today's attendance summary & records.
- `DELETE /api/attendance/records/{record_id}` — Deletes single attendance record.
- `GET /api/attendance/export/csv` — Generates downloadable CSV attendance report.
- `GET /api/candidate/status/{candidate_id}` — Returns student allocation, admit, and current status.

### Continuous Monitoring
- `POST /api/monitoring/frame` — Processes surveillance camera frame, evaluates presence & writing posture.
- `GET /api/monitoring/status?room_id={id}` — Returns live surveillance state for all allocated candidates.
- `GET /api/monitoring/config` — Fetches current monitoring thresholds.
- `POST /api/monitoring/config` — Updates `absence_threshold_sec`, `gate_arrival_threshold_sec`, `grace_period_sec`.

### Security Alerts & Proxy Logs
- `GET /api/attendance/alerts` — Retrieves all recorded proxy/security violation logs.
- `PUT /api/attendance/alerts/{alert_id}` — Updates alert note, confidence, or timestamp.
- `DELETE /api/attendance/alerts/{alert_id}` — Deletes specific alert log.
- `DELETE /api/attendance/alerts` — Clears all alert logs.

### Enrollment & Database
- `POST /api/register/validate-angle` — Validates single angle face image before enrollment.
- `POST /api/register/user` — Enrolls new student with multi-angle images & embedding vectors.
- `GET /api/users` — Lists all registered candidates.
- `DELETE /api/users/{user_id}` — Deletes student and multi-angle face data.
- `GET /api/faces/{user_id}/{filename}` — Serves registered face images.

### Rooms & Schedules
- `GET /api/rooms` / `POST /api/rooms` / `PUT /api/rooms/{id}` / `DELETE /api/rooms/{id}` — Manage exam halls.
- `GET /api/schedules` / `POST /api/schedules` / `PUT /api/schedules/{id}` / `DELETE /api/schedules/{id}` — Manage exam timetable schedules.
- `POST /api/schedules/{id}/activate` / `deactivate` — Toggle active exam session.
- `GET /api/allocations` / `POST /api/allocations/batch` — Manage candidate room/seat allocations.
- `GET /api/departments` — University departments and course catalog.

---

## 7. Data Models & JSON Schemas

### `data/database.json`
```json
{
  "users": {
    "<user_id>": {
      "id": "05402b91-xxxx",
      "name": "Imran Hossain",
      "roll_id": "202314117",
      "department": "Computer Science & Engineering",
      "admit_status": "CLEARED",
      "images": {
        "center": "faces/05402b91-xxxx/center.jpg",
        "left": "faces/05402b91-xxxx/left.jpg",
        "right": "faces/05402b91-xxxx/right.jpg"
      },
      "embeddings": [
        [0.021, -0.045, 0.128]
      ],
      "created_at": "2026-08-27T10:00:00"
    }
  }
}
```

### `data/attendance.json`
```json
{
  "<user_id>": {
    "user_id": "05402b91-xxxx",
    "name": "Imran Hossain",
    "roll_id": "202314117",
    "department": "Computer Science & Engineering",
    "room_id": "room-101",
    "room_name": "Room 101 - Main Auditorium",
    "seat": "A-12",
    "status": "PRESENT",
    "entry_time": "09:05:12 AM",
    "exit_time": null,
    "washroom_out_time": null,
    "washroom_duration_minutes": 0,
    "proof_image": "attendance/2026-09-10/05402b91/entry_1787804345.jpg",
    "history": [
      {
        "type": "ABSENCE_EVENT",
        "left_at": "09:40:15 AM",
        "returned_at": "09:42:00 AM",
        "duration_sec": 105,
        "note": "Left seat during exam"
      }
    ]
  }
}
```

### `data/proxy_alerts.json`
```json
[
  {
    "id": "baadefa6-xxxx",
    "type": "UNREGISTERED FACE",
    "candidate_name": "Unknown Person",
    "roll_id": "N/A",
    "room_name": "Room 101",
    "timestamp": "09:20:10 AM",
    "confidence": 42.0,
    "notes": "Unregistered person detected at entrance during active exam.",
    "snapshot": "attendance/2026-09-10/alerts/proxy_baadefa6_1787782759.jpg"
  }
]
```

---

## 8. How to Run the Application

1. **Quick Start (Windows)**:
   - Double-click `start.bat` (or run `dev.bat`).
   - This automatically starts the FastAPI backend on port `8000`, starts Next.js frontend on port `3000`, and opens `http://localhost:3000` in your default browser.

2. **Manual Start**:
   - **Backend**:
     ```bash
     python main.py
     ```
   - **Frontend**:
     ```bash
     cd frontend
     npm run dev
     ```

3. **Compilation & Verification**:
   - **Python Check**: `python -m py_compile backend/app.py backend/database.py backend/face_engine.py`
   - **Frontend Build**: `cd frontend && npm run build`
