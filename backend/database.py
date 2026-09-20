import os
import json
import uuid
import shutil
import csv
import io
from datetime import datetime, date
from typing import List, Dict, Any, Optional
import numpy as np

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
FACES_DIR = os.path.join(DATA_DIR, "faces")
ATTENDANCE_DIR = os.path.join(DATA_DIR, "attendance")
DB_FILE = os.path.join(DATA_DIR, "database.json")
ROOMS_FILE = os.path.join(DATA_DIR, "rooms.json")
SCHEDULES_FILE = os.path.join(DATA_DIR, "schedules.json")
DEPARTMENTS_FILE = os.path.join(DATA_DIR, "departments.json")
ALLOCATIONS_FILE = os.path.join(DATA_DIR, "allocations.json")
ATTENDANCE_FILE = os.path.join(DATA_DIR, "attendance.json")
ALERTS_FILE = os.path.join(DATA_DIR, "proxy_alerts.json")
CLASS_ROUTINES_FILE = os.path.join(DATA_DIR, "class_routines.json")
CLASSROOM_ATTENDANCE_FILE = os.path.join(DATA_DIR, "classroom_attendance.json")

os.makedirs(FACES_DIR, exist_ok=True)
os.makedirs(ATTENDANCE_DIR, exist_ok=True)

ENTRY_PRE_EXAM_MINUTES = 30   # Attendance entry starts 30 mins before exam
EXIT_POST_EXAM_MINUTES = 30   # Auto-exit triggered 30 mins after exam ends

def add_minutes_to_time_str(time_str: str, minutes: int) -> str:
    """Adds (or subtracts if negative) minutes to a 'HH:MM' time string."""
    try:
        parts = time_str.strip().split(":")
        h = int(parts[0])
        m = int(parts[1])
        total_m = h * 60 + m + minutes
        total_m = max(0, min(1439, total_m))
        new_h = total_m // 60
        new_m = total_m % 60
        return f"{new_h:02d}:{new_m:02d}"
    except Exception:
        return time_str

DEFAULT_DEPARTMENTS = [
    {
        "id": "dept-cse",
        "name": "Computer Science & Engineering",
        "code": "CSE",
        "courses": [
            {"id": "crs-cse-1", "code": "CSE-1101", "title": "Structured Programming Language", "enrolled_student_ids": []},
            {"id": "crs-cse-2", "code": "CSE-2101", "title": "Data Structures & Algorithms", "enrolled_student_ids": []},
            {"id": "crs-cse-3", "code": "CSE-3101", "title": "Database Management Systems", "enrolled_student_ids": []},
            {"id": "crs-cse-4", "code": "CSE-4101", "title": "Artificial Intelligence & Neural Networks", "enrolled_student_ids": []}
        ]
    },
    {
        "id": "dept-swe",
        "name": "Software Engineering",
        "code": "SWE",
        "courses": [
            {"id": "crs-swe-1", "code": "SWE-1101", "title": "Introduction to Software Engineering", "enrolled_student_ids": []},
            {"id": "crs-swe-2", "code": "SWE-2101", "title": "Software Requirements & Architecture", "enrolled_student_ids": []},
            {"id": "crs-swe-3", "code": "SWE-3101", "title": "Full-Stack Web & Cloud Development", "enrolled_student_ids": []}
        ]
    },
    {
        "id": "dept-eee",
        "name": "Electrical & Electronic Engineering",
        "code": "EEE",
        "courses": [
            {"id": "crs-eee-1", "code": "EEE-1101", "title": "Basic Electrical Circuit Analysis", "enrolled_student_ids": []},
            {"id": "crs-eee-2", "code": "EEE-2101", "title": "Electronic Devices & Analog Circuits", "enrolled_student_ids": []}
        ]
    },
    {
        "id": "dept-bba",
        "name": "Business Administration",
        "code": "BBA",
        "courses": [
            {"id": "crs-bba-1", "code": "BBA-1101", "title": "Principles of Management", "enrolled_student_ids": []},
            {"id": "crs-bba-2", "code": "BBA-2101", "title": "Financial & Managerial Accounting", "enrolled_student_ids": []}
        ]
    },
    {
        "id": "dept-ce",
        "name": "Civil Engineering",
        "code": "CE",
        "courses": [
            {"id": "crs-ce-1", "code": "CE-1101", "title": "Engineering Mechanics & Graphics", "enrolled_student_ids": []},
            {"id": "crs-ce-2", "code": "CE-2101", "title": "Mechanics of Solids & Structural Analysis", "enrolled_student_ids": []}
        ]
    }
]

DEFAULT_ROOMS = [
    {"id": "room-101", "name": "Room 101 - Main Auditorium", "building": "Academic Building 1", "capacity": 60, "default_start_time": "09:00", "default_end_time": "12:00"},
    {"id": "room-202", "name": "Room 202 - CS & AI Lab", "building": "IT Complex", "capacity": 40, "default_start_time": "10:00", "default_end_time": "13:00"},
    {"id": "room-304", "name": "Room 304 - EEE Complex", "building": "Engineering Hall", "capacity": 45, "default_start_time": "14:00", "default_end_time": "17:00"},
    {"id": "room-405", "name": "Room 405 - Science Hall", "building": "Science Tower", "capacity": 50, "default_start_time": "09:00", "default_end_time": "12:00"}
]

def get_default_schedules():
    today_str = date.today().isoformat()
    return [
        {
            "id": "sched-001",
            "title": "Final Semester Examination 2026",
            "course_code": "CSE-401",
            "date": today_str,
            "start_time": "08:00",
            "end_time": "18:00",
            "departments": ["Computer Science & Engineering", "Computer Science", "CSE", "Information Technology", "ALL"],
            "hall_ids": ["room-101", "room-202", "room-304", "room-405"],
            "washroom_limit_minutes": 10,
            "entry_grace_minutes": 60,
            "status": "ACTIVE",
            "created_at": datetime.now().isoformat()
        }
    ]

def get_default_class_routines():
    return [
        # Room 101 - Sunday
        {"id": "rt-101-sun-0", "room_id": "room-101", "department": "Computer Science & Engineering", "day": "Sunday", "time_slot": "05:30 AM - 06:50 AM", "start_time": "05:30", "end_time": "06:50", "is_gap": False, "course_code": "CSE-1101", "course_name": "Structured Programming Language", "instructor": "Tanvir Ahmed", "section": "Section A", "semester": "1st", "remarks": "Early Lecture Hall 101"},
        {"id": "rt-101-sun-1", "room_id": "room-101", "department": "Computer Science & Engineering", "day": "Sunday", "time_slot": "09:00 AM - 09:50 AM", "start_time": "09:00", "end_time": "09:50", "is_gap": False, "course_code": "CSE-2101", "course_name": "Data Structures & Algorithms", "instructor": "Dr. Tariq Rahman", "section": "Section A", "semester": "3rd", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-sun-2", "room_id": "room-101", "department": "Computer Science & Engineering", "day": "Sunday", "time_slot": "10:00 AM - 10:50 AM", "start_time": "10:00", "end_time": "10:50", "is_gap": False, "course_code": "CSE-3101", "course_name": "Database Management Systems", "instructor": "Prof. Mahmudul Hasan", "section": "Section B", "semester": "5th", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-sun-3", "room_id": "room-101", "department": "Computer Science & Engineering", "day": "Sunday", "time_slot": "11:00 AM - 11:50 AM", "start_time": "11:00", "end_time": "11:50", "is_gap": False, "course_code": "CSE-4101", "course_name": "Artificial Intelligence & Neural Networks", "instructor": "Dr. A. K. Azad", "section": "Section A", "semester": "7th", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-sun-4", "room_id": "room-101", "department": "Software Engineering", "day": "Sunday", "time_slot": "12:00 PM - 12:50 PM", "start_time": "12:00", "end_time": "12:50", "is_gap": False, "course_code": "SWE-1101", "course_name": "Introduction to Software Engineering", "instructor": "Farhana Sultana", "section": "Section A", "semester": "1st", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-sun-5", "room_id": "room-101", "department": "ALL", "day": "Sunday", "time_slot": "01:00 PM - 01:50 PM", "start_time": "13:00", "end_time": "13:50", "is_gap": True, "course_code": "GAP", "course_name": "Lunch & Prayer Break", "instructor": "", "section": "", "semester": "", "remarks": "1 Hour Break"},
        {"id": "rt-101-sun-6", "room_id": "room-101", "department": "Computer Science & Engineering", "day": "Sunday", "time_slot": "02:00 PM - 02:50 PM", "start_time": "14:00", "end_time": "14:50", "is_gap": False, "course_code": "CSE-1101", "course_name": "Structured Programming Language", "instructor": "Tanvir Ahmed", "section": "Section C", "semester": "1st", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-sun-7", "room_id": "room-101", "department": "Electrical & Electronic Engineering", "day": "Sunday", "time_slot": "03:00 PM - 03:50 PM", "start_time": "15:00", "end_time": "15:50", "is_gap": False, "course_code": "EEE-1101", "course_name": "Basic Electrical Circuit Analysis", "instructor": "Engr. Rezaul Karim", "section": "Section A", "semester": "2nd", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-sun-8", "room_id": "room-101", "department": "ALL", "day": "Sunday", "time_slot": "04:00 PM - 04:50 PM", "start_time": "16:00", "end_time": "16:50", "is_gap": True, "course_code": "GAP", "course_name": "Free Period / Discussion", "instructor": "", "section": "", "semester": "", "remarks": "No Class"},

        # Room 101 - Monday
        {"id": "rt-101-mon-1", "room_id": "room-101", "department": "Software Engineering", "day": "Monday", "time_slot": "09:00 AM - 09:50 AM", "start_time": "09:00", "end_time": "09:50", "is_gap": False, "course_code": "SWE-2101", "course_name": "Software Requirements & Architecture", "instructor": "S. M. Farhad", "section": "Section A", "semester": "3rd", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-mon-2", "room_id": "room-101", "department": "Software Engineering", "day": "Monday", "time_slot": "10:00 AM - 10:50 AM", "start_time": "10:00", "end_time": "10:50", "is_gap": False, "course_code": "SWE-3101", "course_name": "Full-Stack Web & Cloud Development", "instructor": "Nadia Islam", "section": "Section B", "semester": "5th", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-mon-3", "room_id": "room-101", "department": "Computer Science & Engineering", "day": "Monday", "time_slot": "11:00 AM - 11:50 AM", "start_time": "11:00", "end_time": "11:50", "is_gap": False, "course_code": "CSE-1101", "course_name": "Structured Programming Language", "instructor": "Tanvir Ahmed", "section": "Section A", "semester": "1st", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-mon-4", "room_id": "room-101", "department": "Business Administration", "day": "Monday", "time_slot": "12:00 PM - 12:50 PM", "start_time": "12:00", "end_time": "12:50", "is_gap": False, "course_code": "BBA-1101", "course_name": "Principles of Management", "instructor": "Dr. Sabrina Noor", "section": "Section A", "semester": "1st", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-mon-5", "room_id": "room-101", "department": "ALL", "day": "Monday", "time_slot": "01:00 PM - 01:50 PM", "start_time": "13:00", "end_time": "13:50", "is_gap": True, "course_code": "GAP", "course_name": "Lunch & Prayer Break", "instructor": "", "section": "", "semester": "", "remarks": "1 Hour Break"},
        {"id": "rt-101-mon-6", "room_id": "room-101", "department": "Computer Science & Engineering", "day": "Monday", "time_slot": "02:00 PM - 02:50 PM", "start_time": "14:00", "end_time": "14:50", "is_gap": False, "course_code": "CSE-2101", "course_name": "Data Structures & Algorithms", "instructor": "Dr. Tariq Rahman", "section": "Section B", "semester": "3rd", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-mon-7", "room_id": "room-101", "department": "Electrical & Electronic Engineering", "day": "Monday", "time_slot": "03:00 PM - 03:50 PM", "start_time": "15:00", "end_time": "15:50", "is_gap": False, "course_code": "EEE-2101", "course_name": "Electronic Devices & Analog Circuits", "instructor": "Dr. Kazi Moinul", "section": "Section A", "semester": "3rd", "remarks": "Lecture Hall 101"},
        {"id": "rt-101-mon-8", "room_id": "room-101", "department": "Computer Science & Engineering", "day": "Monday", "time_slot": "04:00 PM - 04:50 PM", "start_time": "16:00", "end_time": "16:50", "is_gap": False, "course_code": "CSE-4101", "course_name": "Artificial Intelligence & Neural Networks", "instructor": "Dr. A. K. Azad", "section": "Section B", "semester": "7th", "remarks": "Lecture Hall 101"},

        # Room 202 - Sunday
        {"id": "rt-202-sun-1", "room_id": "room-202", "department": "Computer Science & Engineering", "day": "Sunday", "time_slot": "09:00 AM - 09:50 AM", "start_time": "09:00", "end_time": "09:50", "is_gap": False, "course_code": "CSE-4101", "course_name": "Artificial Intelligence & Neural Networks Lab", "instructor": "Dr. A. K. Azad", "section": "Section A", "semester": "7th", "remarks": "CS & AI Lab"},
        {"id": "rt-202-sun-2", "room_id": "room-202", "department": "Computer Science & Engineering", "day": "Sunday", "time_slot": "10:00 AM - 10:50 AM", "start_time": "10:00", "end_time": "10:50", "is_gap": False, "course_code": "CSE-4101", "course_name": "Artificial Intelligence & Neural Networks Lab", "instructor": "Dr. A. K. Azad", "section": "Section A", "semester": "7th", "remarks": "CS & AI Lab"},
        {"id": "rt-202-sun-3", "room_id": "room-202", "department": "ALL", "day": "Sunday", "time_slot": "11:00 AM - 11:50 AM", "start_time": "11:00", "end_time": "11:50", "is_gap": True, "course_code": "GAP", "course_name": "Lab Maintenance & System Calibration", "instructor": "", "section": "", "semester": "", "remarks": "System Check"},
        {"id": "rt-202-sun-4", "room_id": "room-202", "department": "Computer Science & Engineering", "day": "Sunday", "time_slot": "12:00 PM - 12:50 PM", "start_time": "12:00", "end_time": "12:50", "is_gap": False, "course_code": "CSE-3101", "course_name": "Database Management Systems Lab", "instructor": "Prof. Mahmudul Hasan", "section": "Section A", "semester": "5th", "remarks": "CS & AI Lab"},
        {"id": "rt-202-sun-5", "room_id": "room-202", "department": "ALL", "day": "Sunday", "time_slot": "01:00 PM - 01:50 PM", "start_time": "13:00", "end_time": "13:50", "is_gap": True, "course_code": "GAP", "course_name": "Lunch & Prayer Break", "instructor": "", "section": "", "semester": "", "remarks": "Break"},
        {"id": "rt-202-sun-6", "room_id": "room-202", "department": "Software Engineering", "day": "Sunday", "time_slot": "02:00 PM - 02:50 PM", "start_time": "14:00", "end_time": "14:50", "is_gap": False, "course_code": "SWE-3101", "course_name": "Full-Stack Web & Cloud Development Lab", "instructor": "Nadia Islam", "section": "Section A", "semester": "5th", "remarks": "CS & AI Lab"},
        {"id": "rt-202-sun-7", "room_id": "room-202", "department": "Software Engineering", "day": "Sunday", "time_slot": "03:00 PM - 03:50 PM", "start_time": "15:00", "end_time": "15:50", "is_gap": False, "course_code": "SWE-3101", "course_name": "Full-Stack Web & Cloud Development Lab", "instructor": "Nadia Islam", "section": "Section A", "semester": "5th", "remarks": "CS & AI Lab"},
        {"id": "rt-202-sun-8", "room_id": "room-202", "department": "ALL", "day": "Sunday", "time_slot": "04:00 PM - 04:50 PM", "start_time": "16:00", "end_time": "16:50", "is_gap": True, "course_code": "GAP", "course_name": "Open Lab Session", "instructor": "", "section": "", "semester": "", "remarks": "Open Practice"},

        # Room 202 - Monday
        {"id": "rt-202-mon-1", "room_id": "room-202", "department": "Computer Science & Engineering", "day": "Monday", "time_slot": "09:00 AM - 09:50 AM", "start_time": "09:00", "end_time": "09:50", "is_gap": False, "course_code": "CSE-2101", "course_name": "Data Structures & Algorithms Lab", "instructor": "Dr. Tariq Rahman", "section": "Section A", "semester": "3rd", "remarks": "CS & AI Lab"},
        {"id": "rt-202-mon-2", "room_id": "room-202", "department": "Computer Science & Engineering", "day": "Monday", "time_slot": "10:00 AM - 10:50 AM", "start_time": "10:00", "end_time": "10:50", "is_gap": False, "course_code": "CSE-2101", "course_name": "Data Structures & Algorithms Lab", "instructor": "Dr. Tariq Rahman", "section": "Section A", "semester": "3rd", "remarks": "CS & AI Lab"},
        {"id": "rt-202-mon-3", "room_id": "room-202", "department": "Computer Science & Engineering", "day": "Monday", "time_slot": "11:00 AM - 11:50 AM", "start_time": "11:00", "end_time": "11:50", "is_gap": False, "course_code": "CSE-1101", "course_name": "Structured Programming Lab", "instructor": "Tanvir Ahmed", "section": "Section B", "semester": "1st", "remarks": "CS & AI Lab"},
        {"id": "rt-202-mon-4", "room_id": "room-202", "department": "Computer Science & Engineering", "day": "Monday", "time_slot": "12:00 PM - 12:50 PM", "start_time": "12:00", "end_time": "12:50", "is_gap": False, "course_code": "CSE-1101", "course_name": "Structured Programming Lab", "instructor": "Tanvir Ahmed", "section": "Section B", "semester": "1st", "remarks": "CS & AI Lab"},
        {"id": "rt-202-mon-5", "room_id": "room-202", "department": "ALL", "day": "Monday", "time_slot": "01:00 PM - 01:50 PM", "start_time": "13:00", "end_time": "13:50", "is_gap": True, "course_code": "GAP", "course_name": "Lunch & Prayer Break", "instructor": "", "section": "", "semester": "", "remarks": "Break"},
        {"id": "rt-202-mon-6", "room_id": "room-202", "department": "Software Engineering", "day": "Monday", "time_slot": "02:00 PM - 02:50 PM", "start_time": "14:00", "end_time": "14:50", "is_gap": False, "course_code": "SWE-2101", "course_name": "Software Requirements & Architecture Lab", "instructor": "S. M. Farhad", "section": "Section B", "semester": "3rd", "remarks": "CS & AI Lab"},
        {"id": "rt-202-mon-7", "room_id": "room-202", "department": "Software Engineering", "day": "Monday", "time_slot": "03:00 PM - 03:50 PM", "start_time": "15:00", "end_time": "15:50", "is_gap": False, "course_code": "SWE-2101", "course_name": "Software Requirements & Architecture Lab", "instructor": "S. M. Farhad", "section": "Section B", "semester": "3rd", "remarks": "CS & AI Lab"},
        {"id": "rt-202-mon-8", "room_id": "room-202", "department": "ALL", "day": "Monday", "time_slot": "04:00 PM - 04:50 PM", "start_time": "16:00", "end_time": "16:50", "is_gap": True, "course_code": "GAP", "course_name": "Lab Wrap-up & Backup", "instructor": "", "section": "", "semester": "", "remarks": "Maintenance"},

        # Room 304 - Sunday
        {"id": "rt-304-sun-1", "room_id": "room-304", "department": "Electrical & Electronic Engineering", "day": "Sunday", "time_slot": "09:00 AM - 09:50 AM", "start_time": "09:00", "end_time": "09:50", "is_gap": False, "course_code": "EEE-1101", "course_name": "Basic Electrical Circuit Analysis", "instructor": "Engr. Rezaul Karim", "section": "Section B", "semester": "2nd", "remarks": "EEE Complex"},
        {"id": "rt-304-sun-2", "room_id": "room-304", "department": "Electrical & Electronic Engineering", "day": "Sunday", "time_slot": "10:00 AM - 10:50 AM", "start_time": "10:00", "end_time": "10:50", "is_gap": False, "course_code": "EEE-1101", "course_name": "Electrical Circuit Simulation Lab", "instructor": "Engr. Rezaul Karim", "section": "Section B", "semester": "2nd", "remarks": "EEE Complex"},
        {"id": "rt-304-sun-3", "room_id": "room-304", "department": "Electrical & Electronic Engineering", "day": "Sunday", "time_slot": "11:00 AM - 11:50 AM", "start_time": "11:00", "end_time": "11:50", "is_gap": False, "course_code": "EEE-2101", "course_name": "Electronic Devices & Analog Circuits", "instructor": "Dr. Kazi Moinul", "section": "Section A", "semester": "3rd", "remarks": "EEE Complex"},
        {"id": "rt-304-sun-4", "room_id": "room-304", "department": "ALL", "day": "Sunday", "time_slot": "12:00 PM - 12:50 PM", "start_time": "12:00", "end_time": "12:50", "is_gap": True, "course_code": "GAP", "course_name": "Circuit Board Setup Break", "instructor": "", "section": "", "semester": "", "remarks": "Technical Setup"},
        {"id": "rt-304-sun-5", "room_id": "room-304", "department": "ALL", "day": "Sunday", "time_slot": "01:00 PM - 01:50 PM", "start_time": "13:00", "end_time": "13:50", "is_gap": True, "course_code": "GAP", "course_name": "Lunch & Prayer Break", "instructor": "", "section": "", "semester": "", "remarks": "Break"},
        {"id": "rt-304-sun-6", "room_id": "room-304", "department": "Civil Engineering", "day": "Sunday", "time_slot": "02:00 PM - 02:50 PM", "start_time": "14:00", "end_time": "14:50", "is_gap": False, "course_code": "CE-1101", "course_name": "Engineering Mechanics & Graphics", "instructor": "Engr. Jahirul Islam", "section": "Section A", "semester": "1st", "remarks": "EEE Complex"},
        {"id": "rt-304-sun-7", "room_id": "room-304", "department": "Civil Engineering", "day": "Sunday", "time_slot": "03:00 PM - 03:50 PM", "start_time": "15:00", "end_time": "15:50", "is_gap": False, "course_code": "CE-2101", "course_name": "Mechanics of Solids & Structural Analysis", "instructor": "Dr. Ashraful Haque", "section": "Section A", "semester": "3rd", "remarks": "EEE Complex"},
        {"id": "rt-304-sun-8", "room_id": "room-304", "department": "ALL", "day": "Sunday", "time_slot": "04:00 PM - 04:50 PM", "start_time": "16:00", "end_time": "16:50", "is_gap": True, "course_code": "GAP", "course_name": "Free Period", "instructor": "", "section": "", "semester": "", "remarks": "No Class"},

        # Room 304 - Monday
        {"id": "rt-304-mon-1", "room_id": "room-304", "department": "Electrical & Electronic Engineering", "day": "Monday", "time_slot": "09:00 AM - 09:50 AM", "start_time": "09:00", "end_time": "09:50", "is_gap": False, "course_code": "EEE-2101", "course_name": "Analog Circuits Hardware Lab", "instructor": "Dr. Kazi Moinul", "section": "Section B", "semester": "3rd", "remarks": "EEE Complex"},
        {"id": "rt-304-mon-2", "room_id": "room-304", "department": "Electrical & Electronic Engineering", "day": "Monday", "time_slot": "10:00 AM - 10:50 AM", "start_time": "10:00", "end_time": "10:50", "is_gap": False, "course_code": "EEE-2101", "course_name": "Analog Circuits Hardware Lab", "instructor": "Dr. Kazi Moinul", "section": "Section B", "semester": "3rd", "remarks": "EEE Complex"},
        {"id": "rt-304-mon-3", "room_id": "room-304", "department": "Civil Engineering", "day": "Monday", "time_slot": "11:00 AM - 11:50 AM", "start_time": "11:00", "end_time": "11:50", "is_gap": False, "course_code": "CE-1101", "course_name": "Engineering Mechanics & Graphics", "instructor": "Engr. Jahirul Islam", "section": "Section B", "semester": "1st", "remarks": "EEE Complex"},
        {"id": "rt-304-mon-4", "room_id": "room-304", "department": "Civil Engineering", "day": "Monday", "time_slot": "12:00 PM - 12:50 PM", "start_time": "12:00", "end_time": "12:50", "is_gap": False, "course_code": "CE-2101", "course_name": "Structural Analysis Lab", "instructor": "Dr. Ashraful Haque", "section": "Section A", "semester": "3rd", "remarks": "EEE Complex"},
        {"id": "rt-304-mon-5", "room_id": "room-304", "department": "ALL", "day": "Monday", "time_slot": "01:00 PM - 01:50 PM", "start_time": "13:00", "end_time": "13:50", "is_gap": True, "course_code": "GAP", "course_name": "Lunch & Prayer Break", "instructor": "", "section": "", "semester": "", "remarks": "Break"},
        {"id": "rt-304-mon-6", "room_id": "room-304", "department": "Electrical & Electronic Engineering", "day": "Monday", "time_slot": "02:00 PM - 02:50 PM", "start_time": "14:00", "end_time": "14:50", "is_gap": False, "course_code": "EEE-1101", "course_name": "Basic Electrical Circuit Analysis", "instructor": "Engr. Rezaul Karim", "section": "Section C", "semester": "2nd", "remarks": "EEE Complex"},
        {"id": "rt-304-mon-7", "room_id": "room-304", "department": "Business Administration", "day": "Monday", "time_slot": "03:00 PM - 03:50 PM", "start_time": "15:00", "end_time": "15:50", "is_gap": False, "course_code": "BBA-2101", "course_name": "Financial & Managerial Accounting", "instructor": "Prof. Golam Kibria", "section": "Section A", "semester": "3rd", "remarks": "EEE Complex"},
        {"id": "rt-304-mon-8", "room_id": "room-304", "department": "ALL", "day": "Monday", "time_slot": "04:00 PM - 04:50 PM", "start_time": "16:00", "end_time": "16:50", "is_gap": True, "course_code": "GAP", "course_name": "Evening Recess", "instructor": "", "section": "", "semester": "", "remarks": "Break"},

        # Room 405 - Sunday
        {"id": "rt-405-sun-1", "room_id": "room-405", "department": "Business Administration", "day": "Sunday", "time_slot": "09:00 AM - 09:50 AM", "start_time": "09:00", "end_time": "09:50", "is_gap": False, "course_code": "BBA-1101", "course_name": "Principles of Management", "instructor": "Dr. Sabrina Noor", "section": "Section B", "semester": "1st", "remarks": "Science Hall"},
        {"id": "rt-405-sun-2", "room_id": "room-405", "department": "Business Administration", "day": "Sunday", "time_slot": "10:00 AM - 10:50 AM", "start_time": "10:00", "end_time": "10:50", "is_gap": False, "course_code": "BBA-2101", "course_name": "Financial & Managerial Accounting", "instructor": "Prof. Golam Kibria", "section": "Section B", "semester": "3rd", "remarks": "Science Hall"},
        {"id": "rt-405-sun-3", "room_id": "room-405", "department": "Civil Engineering", "day": "Sunday", "time_slot": "11:00 AM - 11:50 AM", "start_time": "11:00", "end_time": "11:50", "is_gap": False, "course_code": "CE-1101", "course_name": "Engineering Mechanics & Graphics", "instructor": "Engr. Jahirul Islam", "section": "Section A", "semester": "1st", "remarks": "Science Hall"},
        {"id": "rt-405-sun-4", "room_id": "room-405", "department": "Software Engineering", "day": "Sunday", "time_slot": "12:00 PM - 12:50 PM", "start_time": "12:00", "end_time": "12:50", "is_gap": False, "course_code": "SWE-1101", "course_name": "Introduction to Software Engineering", "instructor": "Farhana Sultana", "section": "Section B", "semester": "1st", "remarks": "Science Hall"},
        {"id": "rt-405-sun-5", "room_id": "room-405", "department": "ALL", "day": "Sunday", "time_slot": "01:00 PM - 01:50 PM", "start_time": "13:00", "end_time": "13:50", "is_gap": True, "course_code": "GAP", "course_name": "Lunch & Prayer Break", "instructor": "", "section": "", "semester": "", "remarks": "Break"},
        {"id": "rt-405-sun-6", "room_id": "room-405", "department": "Business Administration", "day": "Sunday", "time_slot": "02:00 PM - 02:50 PM", "start_time": "14:00", "end_time": "14:50", "is_gap": False, "course_code": "BBA-1101", "course_name": "Principles of Management", "instructor": "Dr. Sabrina Noor", "section": "Section C", "semester": "1st", "remarks": "Science Hall"},
        {"id": "rt-405-sun-7", "room_id": "room-405", "department": "Civil Engineering", "day": "Sunday", "time_slot": "03:00 PM - 03:50 PM", "start_time": "15:00", "end_time": "15:50", "is_gap": False, "course_code": "CE-2101", "course_name": "Mechanics of Solids & Structural Analysis", "instructor": "Dr. Ashraful Haque", "section": "Section B", "semester": "3rd", "remarks": "Science Hall"},
        {"id": "rt-405-sun-8", "room_id": "room-405", "department": "ALL", "day": "Sunday", "time_slot": "04:00 PM - 04:50 PM", "start_time": "16:00", "end_time": "16:50", "is_gap": True, "course_code": "GAP", "course_name": "Free Interval", "instructor": "", "section": "", "semester": "", "remarks": "No Class"},

        # Room 405 - Monday
        {"id": "rt-405-mon-1", "room_id": "room-405", "department": "Business Administration", "day": "Monday", "time_slot": "09:00 AM - 09:50 AM", "start_time": "09:00", "end_time": "09:50", "is_gap": False, "course_code": "BBA-2101", "course_name": "Financial & Managerial Accounting", "instructor": "Prof. Golam Kibria", "section": "Section A", "semester": "3rd", "remarks": "Science Hall"},
        {"id": "rt-405-mon-2", "room_id": "room-405", "department": "Software Engineering", "day": "Monday", "time_slot": "10:00 AM - 10:50 AM", "start_time": "10:00", "end_time": "10:50", "is_gap": False, "course_code": "SWE-1101", "course_name": "Introduction to Software Engineering", "instructor": "Farhana Sultana", "section": "Section A", "semester": "1st", "remarks": "Science Hall"},
        {"id": "rt-405-mon-3", "room_id": "room-405", "department": "Computer Science & Engineering", "day": "Monday", "time_slot": "11:00 AM - 11:50 AM", "start_time": "11:00", "end_time": "11:50", "is_gap": False, "course_code": "CSE-3101", "course_name": "Database Management Systems", "instructor": "Prof. Mahmudul Hasan", "section": "Section C", "semester": "5th", "remarks": "Science Hall"},
        {"id": "rt-405-mon-4", "room_id": "room-405", "department": "Electrical & Electronic Engineering", "day": "Monday", "time_slot": "12:00 PM - 12:50 PM", "start_time": "12:00", "end_time": "12:50", "is_gap": False, "course_code": "EEE-1101", "course_name": "Basic Electrical Circuit Analysis", "instructor": "Engr. Rezaul Karim", "section": "Section B", "semester": "2nd", "remarks": "Science Hall"},
        {"id": "rt-405-mon-5", "room_id": "room-405", "department": "ALL", "day": "Monday", "time_slot": "01:00 PM - 01:50 PM", "start_time": "13:00", "end_time": "13:50", "is_gap": True, "course_code": "GAP", "course_name": "Lunch & Prayer Break", "instructor": "", "section": "", "semester": "", "remarks": "Break"},
        {"id": "rt-405-mon-6", "room_id": "room-405", "department": "Civil Engineering", "day": "Monday", "time_slot": "02:00 PM - 02:50 PM", "start_time": "14:00", "end_time": "14:50", "is_gap": False, "course_code": "CE-1101", "course_name": "Engineering Mechanics & Graphics", "instructor": "Engr. Jahirul Islam", "section": "Section A", "semester": "1st", "remarks": "Science Hall"},
        {"id": "rt-405-mon-7", "room_id": "room-405", "department": "Software Engineering", "day": "Monday", "time_slot": "03:00 PM - 03:50 PM", "start_time": "15:00", "end_time": "15:50", "is_gap": False, "course_code": "SWE-2101", "course_name": "Software Requirements & Architecture", "instructor": "S. M. Farhad", "section": "Section A", "semester": "3rd", "remarks": "Science Hall"},
        {"id": "rt-405-mon-8", "room_id": "room-405", "department": "ALL", "day": "Monday", "time_slot": "04:00 PM - 04:50 PM", "start_time": "16:00", "end_time": "16:50", "is_gap": True, "course_code": "GAP", "course_name": "Department Discussion", "instructor": "", "section": "", "semester": "", "remarks": "Discussion"}
    ]

def get_default_classroom_sessions():
    today_str = date.today().isoformat()
    return {
        f"class_room-101_CSE-2101_{today_str}": {
            "room_id": "room-101",
            "department": "Computer Science & Engineering",
            "course_code": "CSE-2101",
            "course_name": "Data Structures & Algorithms",
            "day": "Sunday",
            "time_slot": "09:00 AM - 09:50 AM",
            "created_at": f"{today_str}T09:00:00",
            "candidates": {
                "faea207a": {
                    "candidate_id": "faea207a",
                    "name": "Imran",
                    "roll_id": "202314117",
                    "department": "Computer Science & Engineering",
                    "status": "PRESENT",
                    "first_detected_at": f"{today_str}T09:02:15",
                    "first_detected_time": "09:02:15 AM",
                    "last_seen_at": f"{today_str}T09:48:30",
                    "last_seen_time": "09:48:30 AM",
                    "in_class_seconds": 2775,
                    "stepped_out_at": None,
                    "stepped_out_duration_sec": 0,
                    "movement_history": [
                        {
                            "id": "ev-01",
                            "candidate_id": "faea207a",
                            "name": "Imran",
                            "event": "CLASS_ENTRY",
                            "time": "09:02:15 AM",
                            "timestamp": f"{today_str}T09:02:15",
                            "label": "Imran entered classroom (Attendance Auto-Marked)",
                            "type": "entry"
                        },
                        {
                            "id": "ev-02",
                            "candidate_id": "faea207a",
                            "name": "Imran",
                            "event": "STEPPED_OUT",
                            "time": "09:25:10 AM",
                            "timestamp": f"{today_str}T09:25:10",
                            "duration_sec": 65,
                            "label": "Imran stepped out / left classroom view (65s)",
                            "type": "out"
                        },
                        {
                            "id": "ev-03",
                            "candidate_id": "faea207a",
                            "name": "Imran",
                            "event": "RETURNED",
                            "time": "09:26:15 AM",
                            "timestamp": f"{today_str}T09:26:15",
                            "label": "Imran returned to class seat (Absent for 65s)",
                            "type": "return"
                        }
                    ]
                },
                "c73754c8": {
                    "candidate_id": "c73754c8",
                    "name": "Mohaimen Hridoy",
                    "roll_id": "202314099",
                    "department": "Computer Science & Engineering",
                    "status": "PRESENT",
                    "first_detected_at": f"{today_str}T09:04:10",
                    "first_detected_time": "09:04:10 AM",
                    "last_seen_at": f"{today_str}T09:47:00",
                    "last_seen_time": "09:47:00 AM",
                    "in_class_seconds": 2570,
                    "stepped_out_at": None,
                    "stepped_out_duration_sec": 0,
                    "movement_history": [
                        {
                            "id": "ev-04",
                            "candidate_id": "c73754c8",
                            "name": "Mohaimen Hridoy",
                            "event": "CLASS_ENTRY",
                            "time": "09:04:10 AM",
                            "timestamp": f"{today_str}T09:04:10",
                            "label": "Mohaimen Hridoy entered classroom (Attendance Auto-Marked)",
                            "type": "entry"
                        }
                    ]
                },
                "d171c7d7": {
                    "candidate_id": "d171c7d7",
                    "name": "Sinlam",
                    "roll_id": "202314105",
                    "department": "Computer Science & Engineering",
                    "status": "STEPPED_OUT",
                    "first_detected_at": f"{today_str}T09:05:00",
                    "first_detected_time": "09:05:00 AM",
                    "last_seen_at": f"{today_str}T09:35:00",
                    "last_seen_time": "09:35:00 AM",
                    "in_class_seconds": 1800,
                    "stepped_out_at": f"{today_str}T09:35:00",
                    "stepped_out_duration_sec": 120,
                    "movement_history": [
                        {
                            "id": "ev-05",
                            "candidate_id": "d171c7d7",
                            "name": "Sinlam",
                            "event": "CLASS_ENTRY",
                            "time": "09:05:00 AM",
                            "timestamp": f"{today_str}T09:05:00",
                            "label": "Sinlam entered classroom (Attendance Auto-Marked)",
                            "type": "entry"
                        },
                        {
                            "id": "ev-06",
                            "candidate_id": "d171c7d7",
                            "name": "Sinlam",
                            "event": "STEPPED_OUT",
                            "time": "09:35:00 AM",
                            "timestamp": f"{today_str}T09:35:00",
                            "duration_sec": 120,
                            "label": "Sinlam stepped out / left classroom view (120s)",
                            "type": "out"
                        }
                    ]
                },
                "58700b1f": {
                    "candidate_id": "58700b1f",
                    "name": "Taslimul Alam",
                    "roll_id": "202314107",
                    "department": "Computer Science & Engineering",
                    "status": "ABSENT",
                    "first_detected_at": None,
                    "first_detected_time": None,
                    "last_seen_at": None,
                    "last_seen_time": "-",
                    "in_class_seconds": 0,
                    "stepped_out_at": None,
                    "stepped_out_duration_sec": 0,
                    "movement_history": []
                }
            },
            "event_logs": [
                {
                    "id": "ev-06",
                    "candidate_id": "d171c7d7",
                    "name": "Sinlam",
                    "event": "STEPPED_OUT",
                    "time": "09:35:00 AM",
                    "timestamp": f"{today_str}T09:35:00",
                    "label": "Sinlam stepped out / left classroom view (120s)",
                    "type": "out"
                },
                {
                    "id": "ev-03",
                    "candidate_id": "faea207a",
                    "name": "Imran",
                    "event": "RETURNED",
                    "time": "09:26:15 AM",
                    "timestamp": f"{today_str}T09:26:15",
                    "label": "Imran returned to class seat (Absent for 65s)",
                    "type": "return"
                },
                {
                    "id": "ev-02",
                    "candidate_id": "faea207a",
                    "name": "Imran",
                    "event": "STEPPED_OUT",
                    "time": "09:25:10 AM",
                    "timestamp": f"{today_str}T09:25:10",
                    "label": "Imran stepped out / left classroom view (65s)",
                    "type": "out"
                },
                {
                    "id": "ev-05",
                    "candidate_id": "d171c7d7",
                    "name": "Sinlam",
                    "event": "CLASS_ENTRY",
                    "time": "09:05:00 AM",
                    "timestamp": f"{today_str}T09:05:00",
                    "label": "Sinlam entered classroom (Attendance Auto-Marked)",
                    "type": "entry"
                },
                {
                    "id": "ev-04",
                    "candidate_id": "c73754c8",
                    "name": "Mohaimen Hridoy",
                    "event": "CLASS_ENTRY",
                    "time": "09:04:10 AM",
                    "timestamp": f"{today_str}T09:04:10",
                    "label": "Mohaimen Hridoy entered classroom (Attendance Auto-Marked)",
                    "type": "entry"
                },
                {
                    "id": "ev-01",
                    "candidate_id": "faea207a",
                    "name": "Imran",
                    "event": "CLASS_ENTRY",
                    "time": "09:02:15 AM",
                    "timestamp": f"{today_str}T09:02:15",
                    "label": "Imran entered classroom (Attendance Auto-Marked)",
                    "type": "entry"
                }
            ]
        },
        f"class_room-101_EEE-1101_{today_str}": {
            "room_id": "room-101",
            "department": "Electrical & Electronic Engineering",
            "course_code": "EEE-1101",
            "course_name": "Basic Electrical Circuit Analysis",
            "day": "Sunday",
            "time_slot": "10:00 AM - 10:50 AM",
            "created_at": f"{today_str}T10:00:00",
            "candidates": {
                "faea207a": {
                    "candidate_id": "faea207a",
                    "name": "Imran",
                    "roll_id": "202314117",
                    "department": "Computer Science & Engineering",
                    "status": "PRESENT",
                    "first_detected_at": f"{today_str}T10:01:40",
                    "first_detected_time": "10:01:40 AM",
                    "last_seen_at": f"{today_str}T10:49:00",
                    "last_seen_time": "10:49:00 AM",
                    "in_class_seconds": 2840,
                    "stepped_out_at": None,
                    "stepped_out_duration_sec": 0,
                    "movement_history": [
                        {
                            "id": "ev-10",
                            "candidate_id": "faea207a",
                            "name": "Imran",
                            "event": "CLASS_ENTRY",
                            "time": "10:01:40 AM",
                            "timestamp": f"{today_str}T10:01:40",
                            "label": "Imran entered classroom (Attendance Auto-Marked)",
                            "type": "entry"
                        }
                    ]
                },
                "c73754c8": {
                    "candidate_id": "c73754c8",
                    "name": "Mohaimen Hridoy",
                    "roll_id": "202314099",
                    "department": "Computer Science & Engineering",
                    "status": "PRESENT",
                    "first_detected_at": f"{today_str}T10:03:00",
                    "first_detected_time": "10:03:00 AM",
                    "last_seen_at": f"{today_str}T10:48:10",
                    "last_seen_time": "10:48:10 AM",
                    "in_class_seconds": 2710,
                    "stepped_out_at": None,
                    "stepped_out_duration_sec": 0,
                    "movement_history": []
                },
                "58700b1f": {
                    "candidate_id": "58700b1f",
                    "name": "Taslimul Alam",
                    "roll_id": "202314107",
                    "department": "Computer Science & Engineering",
                    "status": "PRESENT",
                    "first_detected_at": f"{today_str}T10:05:20",
                    "first_detected_time": "10:05:20 AM",
                    "last_seen_at": f"{today_str}T10:46:00",
                    "last_seen_time": "10:46:00 AM",
                    "in_class_seconds": 2440,
                    "stepped_out_at": None,
                    "stepped_out_duration_sec": 0,
                    "movement_history": []
                }
            },
            "event_logs": []
        }
    }

class FaceDatabase:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceDatabase, cls).__new__(cls)
            cls._instance._init_db()
        return cls._instance

    def _init_db(self):
        self.data_dir = DATA_DIR
        self.faces_dir = FACES_DIR
        self.attendance_dir = ATTENDANCE_DIR
        self.db_file = DB_FILE
        self.rooms_file = ROOMS_FILE
        self.schedules_file = SCHEDULES_FILE
        self.allocations_file = ALLOCATIONS_FILE
        self.attendance_file = ATTENDANCE_FILE
        self.alerts_file = ALERTS_FILE
        self.class_routines_file = CLASS_ROUTINES_FILE
        self.classroom_attendance_file = CLASSROOM_ATTENDANCE_FILE
        self.monitoring_sessions = {}
        self.classroom_sessions = {}
        self.monitoring_config = {
            "absence_threshold_sec": 15,
            "gate_arrival_threshold_sec": 300,
            "grace_period_sec": 12,
            "auto_alert_voice": False
        }
        self._load()

    def _load(self):
        # 1. Load users
        if os.path.exists(self.db_file):
            try:
                with open(self.db_file, "r", encoding="utf-8") as f:
                    self.db = json.load(f)
            except Exception:
                self.db = {"users": {}}
        else:
            self.db = {"users": {}}
            self._save()

        # 2. Load rooms
        if os.path.exists(self.rooms_file):
            try:
                with open(self.rooms_file, "r", encoding="utf-8") as f:
                    self.rooms = json.load(f)
            except Exception:
                self.rooms = DEFAULT_ROOMS
                self._save_rooms()
        else:
            self.rooms = DEFAULT_ROOMS
            self._save_rooms()

        # Backfill default room times if missing
        modified_rooms = False
        for r in self.rooms:
            if "default_start_time" not in r:
                r["default_start_time"] = "09:00"
                modified_rooms = True
            if "default_end_time" not in r:
                r["default_end_time"] = "12:00"
                modified_rooms = True
        if modified_rooms:
            self._save_rooms()

        # 3. Load schedules
        if os.path.exists(self.schedules_file):
            try:
                with open(self.schedules_file, "r", encoding="utf-8") as f:
                    self.schedules = json.load(f)
            except Exception:
                self.schedules = get_default_schedules()
                self._save_schedules()
        else:
            self.schedules = get_default_schedules()
            self._save_schedules()

        # 4. Load candidate allocations
        if os.path.exists(self.allocations_file):
            try:
                with open(self.allocations_file, "r", encoding="utf-8") as f:
                    self.allocations = json.load(f)
            except Exception:
                self.allocations = {}
        else:
            self.allocations = {}
            self._save_allocations()

        # 5. Load today's attendance logs
        if os.path.exists(self.attendance_file):
            try:
                with open(self.attendance_file, "r", encoding="utf-8") as f:
                    self.attendance = json.load(f)
            except Exception:
                self.attendance = {}
        else:
            self.attendance = {}
            self._save_attendance()

        # 6. Load security alerts
        if os.path.exists(self.alerts_file):
            try:
                with open(self.alerts_file, "r", encoding="utf-8") as f:
                    self.alerts = json.load(f)
            except Exception:
                self.alerts = []
        else:
            self.alerts = []
            self._save_alerts()

        # 7. Load departments & courses
        self.departments_file = DEPARTMENTS_FILE
        if os.path.exists(self.departments_file):
            try:
                with open(self.departments_file, "r", encoding="utf-8") as f:
                    self.departments = json.load(f)
            except Exception:
                self.departments = DEFAULT_DEPARTMENTS
                self._save_departments()
        else:
            self.departments = DEFAULT_DEPARTMENTS
            self._save_departments()

        # 8. Load class routines
        if os.path.exists(self.class_routines_file):
            try:
                with open(self.class_routines_file, "r", encoding="utf-8") as f:
                    self.class_routines = json.load(f)
            except Exception:
                self.class_routines = get_default_class_routines()
                self._save_class_routines()
        else:
            self.class_routines = get_default_class_routines()
            self._save_class_routines()

        # 9. Load classroom attendance sessions
        if os.path.exists(self.classroom_attendance_file):
            try:
                with open(self.classroom_attendance_file, "r", encoding="utf-8") as f:
                    self.classroom_sessions = json.load(f)
            except Exception:
                self.classroom_sessions = get_default_classroom_sessions()
                self._save_classroom_sessions()
        else:
            self.classroom_sessions = get_default_classroom_sessions()
            self._save_classroom_sessions()

    def _save(self):
        with open(self.db_file, "w", encoding="utf-8") as f:
            json.dump(self.db, f, indent=2, ensure_ascii=False)

    def _save_class_routines(self):
        with open(self.class_routines_file, "w", encoding="utf-8") as f:
            json.dump(self.class_routines, f, indent=2, ensure_ascii=False)

    def _save_classroom_sessions(self):
        try:
            with open(self.classroom_attendance_file, "w", encoding="utf-8") as f:
                json.dump(self.classroom_sessions, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print("Error saving classroom sessions:", e)

    def _save_rooms(self):
        with open(self.rooms_file, "w", encoding="utf-8") as f:
            json.dump(self.rooms, f, indent=2, ensure_ascii=False)

    def _save_schedules(self):
        with open(self.schedules_file, "w", encoding="utf-8") as f:
            json.dump(self.schedules, f, indent=2, ensure_ascii=False)

    def _save_departments(self):
        with open(self.departments_file, "w", encoding="utf-8") as f:
            json.dump(self.departments, f, indent=2, ensure_ascii=False)

    def _save_allocations(self):
        with open(self.allocations_file, "w", encoding="utf-8") as f:
            json.dump(self.allocations, f, indent=2, ensure_ascii=False)

    def _save_attendance(self):
        with open(self.attendance_file, "w", encoding="utf-8") as f:
            json.dump(self.attendance, f, indent=2, ensure_ascii=False)

    def _save_alerts(self):
        with open(self.alerts_file, "w", encoding="utf-8") as f:
            json.dump(self.alerts, f, indent=2, ensure_ascii=False)

    def _get_today_key(self) -> str:
        return date.today().isoformat()

    # -------------------------------------------------------------
    # 1. Universal Candidate Profile Management
    # -------------------------------------------------------------
    def add_user(
        self,
        name: str,
        roll_id: str = "",
        department: str = "",
        rfid_tag: Optional[str] = None,
        angle_images: Optional[Dict[str, bytes]] = None,
        angle_embeddings: Optional[Dict[str, np.ndarray]] = None,
        signature_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        user_id = str(uuid.uuid4())[:8]
        user_dir = os.path.join(self.faces_dir, user_id)
        os.makedirs(user_dir, exist_ok=True)

        saved_images = {}
        if angle_images:
            for angle_name, img_bytes in angle_images.items():
                filename = f"{angle_name}.jpg"
                file_path = os.path.join(user_dir, filename)
                with open(file_path, "wb") as f:
                    f.write(img_bytes)
                saved_images[angle_name] = f"faces/{user_id}/{filename}"

        if angle_embeddings:
            emb_dict = {k: np.array(v, dtype=np.float32) for k, v in angle_embeddings.items()}
            np.savez_compressed(os.path.join(user_dir, "embeddings.npz"), **emb_dict)

        saved_signature = None
        if signature_bytes and len(signature_bytes) > 0:
            sig_filename = "signature.png"
            sig_path = os.path.join(user_dir, sig_filename)
            with open(sig_path, "wb") as f:
                f.write(signature_bytes)
            saved_signature = f"faces/{user_id}/{sig_filename}"

        clean_rfid = rfid_tag.strip() if rfid_tag and rfid_tag.strip() else None

        user_record = {
            "id": user_id,
            "name": name.strip(),
            "roll_id": roll_id.strip(),
            "department": department.strip(),
            "rfid_tag": clean_rfid,
            "created_at": datetime.now().isoformat(),
            "images": saved_images,
            "signature": saved_signature,
            "angle_count": len(angle_embeddings) if angle_embeddings else 0
        }

        self.db["users"][user_id] = user_record
        self._save()

        # Auto-create initial room allocation for convenience
        default_room = self.rooms[0] if self.rooms else {"id": "room-101", "name": "Room 101"}
        existing_alloc_count = len(self.allocations)
        seat_num = f"Seat A-{existing_alloc_count + 1:02d}"
        self.allocate_candidate(
            candidate_id=user_id,
            room_id=default_room["id"],
            seat_number=seat_num,
            admit_status="CLEARED",
            remarks="Standard registration clearance"
        )

        return user_record

    def find_user_by_roll(self, roll_id: str) -> Optional[Dict[str, Any]]:
        """Finds a registered student by their Roll ID / Student ID."""
        if not roll_id:
            return None
        clean_roll = roll_id.strip().lower()
        for u in self.db["users"].values():
            if u.get("roll_id", "").strip().lower() == clean_roll:
                return u
        return None

    def find_user_by_rfid(self, rfid_tag: str) -> Optional[Dict[str, Any]]:
        """Finds a registered student by their RFID Card Tag UID."""
        if not rfid_tag:
            return None
        clean_tag = rfid_tag.strip().lower()
        for u in self.db["users"].values():
            u_tag = str(u.get("rfid_tag", "") or "").strip().lower()
            if u_tag and u_tag == clean_tag:
                return u
        return None

    def update_user_rfid(self, user_id: str, rfid_tag: Optional[str]) -> Optional[Dict[str, Any]]:
        """Updates the RFID tag assigned to a candidate profile."""
        if user_id not in self.db.get("users", {}):
            return None
        clean_tag = rfid_tag.strip() if rfid_tag and rfid_tag.strip() else None
        self.db["users"][user_id]["rfid_tag"] = clean_tag
        self._save()
        return self.db["users"][user_id]

    def get_candidate_signature_path(self, candidate_id: str) -> Optional[str]:
        """Returns relative path to registered signature e.g. faces/{user_id}/signature.png if exists."""
        user = self.get_user(candidate_id)
        if not user:
            return None
        sig_rel = user.get("signature")
        if sig_rel:
            full_path = os.path.join(self.data_dir, sig_rel.replace("/", os.sep))
            if os.path.exists(full_path):
                return sig_rel
        # Fallback check on disk
        disk_sig = os.path.join(self.faces_dir, candidate_id, "signature.png")
        if os.path.exists(disk_sig):
            return f"faces/{candidate_id}/signature.png"
        return None

    def get_candidate_signature_bytes(self, candidate_id: str) -> Optional[bytes]:
        """Loads registered signature bytes from disk."""
        disk_sig = os.path.join(self.faces_dir, candidate_id, "signature.png")
        if os.path.exists(disk_sig):
            try:
                with open(disk_sig, "rb") as f:
                    return f.read()
            except Exception:
                return None
        return None

    def get_users(self) -> List[Dict[str, Any]]:
        return list(self.db.get("users", {}).values())

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        return self.db.get("users", {}).get(user_id)

    def delete_user(self, user_id: str) -> bool:
        if user_id in self.db.get("users", {}):
            del self.db["users"][user_id]
            self._save()
            if user_id in self.allocations:
                del self.allocations[user_id]
                self._save_allocations()

            # Clean up from course enrollments in departments.json
            modified_depts = False
            for d in self.departments:
                for c in d.get("courses", []):
                    if user_id in c.get("enrolled_student_ids", []):
                        c["enrolled_student_ids"] = [uid for uid in c["enrolled_student_ids"] if uid != user_id]
                        modified_depts = True
            if modified_depts:
                self._save_departments()

            # Clean up from exam schedules in schedules.json
            modified_scheds = False
            for s in self.schedules:
                if user_id in s.get("enrolled_student_ids", []):
                    s["enrolled_student_ids"] = [uid for uid in s["enrolled_student_ids"] if uid != user_id]
                    modified_scheds = True
                if "hall_student_map" in s:
                    for hid, sids in list(s["hall_student_map"].items()):
                        if user_id in sids:
                            s["hall_student_map"][hid] = [uid for uid in sids if uid != user_id]
                            modified_scheds = True
            if modified_scheds:
                self._save_schedules()

            user_dir = os.path.join(self.faces_dir, user_id)
            if os.path.exists(user_dir):
                shutil.rmtree(user_dir, ignore_errors=True)
            return True
        return False

    def load_all_embeddings(self) -> List[Dict[str, Any]]:
        all_records = []
        for user_id, user_data in self.db.get("users", {}).items():
            emb_file = os.path.join(self.faces_dir, user_id, "embeddings.npz")
            if os.path.exists(emb_file):
                try:
                    with np.load(emb_file) as data:
                        embs = [data[key] for key in data.files]
                        if embs:
                            all_records.append({
                                "user_id": user_id,
                                "name": user_data["name"],
                                "roll_id": user_data.get("roll_id", ""),
                                "department": user_data.get("department", ""),
                                "embeddings": embs
                            })
                except Exception as e:
                    print(f"[-] Error loading embeddings for user {user_id}: {e}")
        return all_records

    # -------------------------------------------------------------
    # 2. Exam Rooms & Halls Management
    # -------------------------------------------------------------
    def get_rooms(self) -> List[Dict[str, Any]]:
        return self.rooms

    def add_room(
        self,
        name: str,
        building: str = "",
        capacity: int = 40,
        default_start_time: str = "09:00",
        default_end_time: str = "12:00"
    ) -> Dict[str, Any]:
        room_id = f"room-{len(self.rooms) + 1:03d}-{str(uuid.uuid4())[:4]}"
        new_room = {
            "id": room_id,
            "name": name.strip(),
            "building": building.strip(),
            "capacity": capacity,
            "default_start_time": default_start_time.strip() or "09:00",
            "default_end_time": default_end_time.strip() or "12:00"
        }
        self.rooms.append(new_room)
        self._save_rooms()
        return new_room

    def update_room(
        self,
        room_id: str,
        name: Optional[str] = None,
        building: Optional[str] = None,
        capacity: Optional[int] = None,
        default_start_time: Optional[str] = None,
        default_end_time: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        for r in self.rooms:
            if r["id"] == room_id:
                if name is not None and name.strip():
                    r["name"] = name.strip()
                if building is not None:
                    r["building"] = building.strip()
                if capacity is not None:
                    r["capacity"] = max(1, int(capacity))
                if default_start_time is not None and default_start_time.strip():
                    r["default_start_time"] = default_start_time.strip()
                if default_end_time is not None and default_end_time.strip():
                    r["default_end_time"] = default_end_time.strip()

                self._save_rooms()

                # Sync room name across allocations
                if name is not None:
                    for alloc in self.allocations.values():
                        if alloc.get("room_id") == room_id:
                            alloc["room_name"] = r["name"]
                    self._save_allocations()

                return r
        return None

    def delete_room(self, room_id: str) -> bool:
        self.rooms = [r for r in self.rooms if r["id"] != room_id]
        self._save_rooms()
        # Also remove room from schedules
        for s in self.schedules:
            if room_id in s.get("hall_ids", []):
                s["hall_ids"] = [h for h in s["hall_ids"] if h != room_id]
        self._save_schedules()
        # Reallocate candidates belonging to this deleted room to first available room
        first_room = self.rooms[0] if self.rooms else None
        for alloc in list(self.allocations.values()):
            if alloc.get("room_id") == room_id:
                if first_room:
                    alloc["room_id"] = first_room["id"]
                    alloc["room_name"] = first_room["name"]
                else:
                    alloc["room_id"] = ""
                    alloc["room_name"] = "Unassigned"
        self._save_allocations()
        return True

    def get_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        for r in self.rooms:
            if r["id"] == room_id:
                return r
        return None

    # -------------------------------------------------------------
    # 3. Exam Schedules & Timetables Management
    # -------------------------------------------------------------
    def get_schedules(self) -> List[Dict[str, Any]]:
        return self.schedules

    def add_schedule(
        self,
        title: str,
        course_code: str = "",
        date_str: str = "",
        date: str = "",
        start_time: str = "09:00",
        end_time: str = "12:00",
        departments: Optional[List[str]] = None,
        hall_ids: Optional[List[str]] = None,
        washroom_limit_minutes: int = 10,
        entry_grace_minutes: int = 30,
        enrolled_student_ids: Optional[List[str]] = None,
        student_clearance_map: Optional[Dict[str, str]] = None,
        hall_student_map: Optional[Dict[str, List[str]]] = None
    ) -> Dict[str, Any]:
        target_date = (date or date_str or self._get_today_key()).strip()

        if not departments or len(departments) == 0:
            departments = ["ALL"]

        if not hall_ids or len(hall_ids) == 0:
            hall_ids = [r["id"] for r in self.rooms] if self.rooms else ["room-101"]

        sched_id = f"sched-{str(uuid.uuid4())[:8]}"
        new_sched = {
            "id": sched_id,
            "title": title.strip(),
            "course_code": course_code.strip(),
            "date": target_date,
            "start_time": start_time.strip(),
            "end_time": end_time.strip(),
            "departments": departments,
            "hall_ids": hall_ids,
            "washroom_limit_minutes": max(1, int(washroom_limit_minutes)),
            "entry_grace_minutes": max(0, int(entry_grace_minutes)),
            "enrolled_student_ids": enrolled_student_ids or [],
            "student_clearance_map": student_clearance_map or {},
            "hall_student_map": hall_student_map or {},
            "status": "SCHEDULED",
            "created_at": datetime.now().isoformat()
        }

        # Build reverse map for candidate -> allocated hall
        reverse_hall_map = {}
        if hall_student_map:
            for h_id, std_list in hall_student_map.items():
                for std_id in std_list:
                    reverse_hall_map[std_id] = h_id

        # Update candidate allocations with clearance statuses and specific hall assignment
        if enrolled_student_ids:
            clearance_dict = student_clearance_map or {}
            for std_id in enrolled_student_ids:
                status = clearance_dict.get(std_id, "CLEARED")
                remarks = "Cleared"
                if status == "PENDING_DUES":
                    remarks = "Tuition Fee Dues Pending"
                elif status == "NO_ADMIT_CARD":
                    remarks = "Admit Card Not Issued / Collected"
                elif status == "BLOCKED":
                    remarks = "Disqualified by Administration"

                assigned_hall = reverse_hall_map.get(std_id, hall_ids[0] if hall_ids else "room-101")

                try:
                    self.allocate_candidate(
                        candidate_id=std_id,
                        room_id=assigned_hall,
                        seat_number="Assigned Seat",
                        admit_status=status,
                        remarks=remarks
                    )
                except Exception as e:
                    print(f"Candidate allocation error for {std_id}: {e}")

        self.schedules.insert(0, new_sched)
        self._save_schedules()
        return new_sched

    def update_schedule(self, schedule_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for s in self.schedules:
            if s["id"] == schedule_id:
                for k, v in updates.items():
                    if k in s:
                        s[k] = v
                self._save_schedules()
                return s
        return None

    def delete_schedule(self, schedule_id: str) -> bool:
        self.schedules = [s for s in self.schedules if s["id"] != schedule_id]
        self._save_schedules()
        return True

    # -------------------------------------------------------------
    # 3.5 Department & Course Management
    # -------------------------------------------------------------
    def get_departments(self) -> List[Dict[str, Any]]:
        return self.departments

    def add_department(self, name: str, code: str = "") -> Dict[str, Any]:
        dept_id = f"dept-{str(uuid.uuid4())[:8]}"
        new_dept = {
            "id": dept_id,
            "name": name.strip(),
            "code": (code or name[:3]).upper().strip(),
            "courses": []
        }
        self.departments.append(new_dept)
        self._save_departments()
        return new_dept

    def update_department(self, dept_id: str, name: str, code: str) -> Optional[Dict[str, Any]]:
        for d in self.departments:
            if d["id"] == dept_id:
                if name: d["name"] = name.strip()
                if code: d["code"] = code.strip().upper()
                self._save_departments()
                return d
        return None

    def delete_department(self, dept_id: str) -> bool:
        self.departments = [d for d in self.departments if d["id"] != dept_id]
        self._save_departments()
        return True

    def add_course(
        self,
        dept_id: str,
        title: str,
        code: str = "",
        enrolled_student_ids: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        for d in self.departments:
            if d["id"] == dept_id:
                course_id = f"crs-{str(uuid.uuid4())[:8]}"
                new_crs = {
                    "id": course_id,
                    "code": (code or "CRS-101").upper().strip(),
                    "title": title.strip(),
                    "enrolled_student_ids": enrolled_student_ids or []
                }
                d.setdefault("courses", []).append(new_crs)
                self._save_departments()
                return new_crs
        return None

    def update_course(
        self,
        dept_id: str,
        course_id: str,
        title: str,
        code: str,
        enrolled_student_ids: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        for d in self.departments:
            if d["id"] == dept_id:
                for c in d.get("courses", []):
                    if c["id"] == course_id:
                        if title: c["title"] = title.strip()
                        if code: c["code"] = code.strip().upper()
                        if enrolled_student_ids is not None:
                            c["enrolled_student_ids"] = enrolled_student_ids
                        self._save_departments()
                        return c
        return None

    def delete_course(self, dept_id: str, course_id: str) -> bool:
        for d in self.departments:
            if d["id"] == dept_id:
                d["courses"] = [c for c in d.get("courses", []) if c["id"] != course_id]
                self._save_departments()
                return True
        return False

    def enroll_students_in_course(self, dept_id: str, course_id: str, student_ids: List[str]) -> Optional[Dict[str, Any]]:
        for d in self.departments:
            if d["id"] == dept_id:
                for c in d.get("courses", []):
                    if c["id"] == course_id:
                        c["enrolled_student_ids"] = student_ids
                        self._save_departments()
                        return c
        return None

    # -------------------------------------------------------------
    # 3.6 Weekly Room Class Routines Management
    # -------------------------------------------------------------
    def get_class_routines(
        self,
        room_id: Optional[str] = None,
        department: Optional[str] = None,
        day: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        results = self.class_routines
        if room_id and room_id != "ALL":
            results = [r for r in results if r.get("room_id") == room_id]
        if department and department != "ALL":
            results = [r for r in results if r.get("department") == department or r.get("department") == "ALL"]
        if day and day != "ALL":
            results = [r for r in results if r.get("day", "").lower() == day.lower()]
        return results

    def add_class_routine(
        self,
        room_id: str,
        department: str,
        day: str,
        time_slot: str,
        start_time: str = "",
        end_time: str = "",
        is_gap: bool = False,
        course_code: str = "",
        course_name: str = "",
        instructor: str = "",
        section: str = "",
        semester: str = "",
        remarks: str = ""
    ) -> Dict[str, Any]:
        if (not start_time or not end_time) and "-" in time_slot:
            parts = time_slot.split("-")
            if not start_time:
                start_time = parts[0].strip()
            if not end_time:
                end_time = parts[1].strip()

        routine_id = f"rt-{str(uuid.uuid4())[:8]}"
        new_entry = {
            "id": routine_id,
            "room_id": room_id.strip(),
            "department": department.strip(),
            "day": day.strip(),
            "time_slot": time_slot.strip(),
            "start_time": start_time.strip(),
            "end_time": end_time.strip(),
            "is_gap": bool(is_gap),
            "course_code": (course_code or ("GAP" if is_gap else "CRS-101")).strip(),
            "course_name": (course_name or ("Break / Free Slot" if is_gap else "Class Lecture")).strip(),
            "instructor": instructor.strip(),
            "section": section.strip(),
            "semester": semester.strip(),
            "remarks": remarks.strip(),
            "updated_at": datetime.now().isoformat()
        }

        # If a routine already exists for this exact room, day, and time_slot -> update in place
        existing_idx = next(
            (i for i, r in enumerate(self.class_routines)
             if r.get("room_id") == room_id and r.get("day", "").lower() == day.lower() and r.get("time_slot") == time_slot),
            None
        )
        if existing_idx is not None:
            new_entry["id"] = self.class_routines[existing_idx]["id"]
            self.class_routines[existing_idx] = new_entry
        else:
            self.class_routines.append(new_entry)

        self._save_class_routines()
        return new_entry

    def update_class_routine(self, routine_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for r in self.class_routines:
            if r["id"] == routine_id:
                for k, v in updates.items():
                    r[k] = v
                r["updated_at"] = datetime.now().isoformat()
                self._save_class_routines()
                return r
        return None

    def delete_class_routine(self, routine_id: str) -> bool:
        self.class_routines = [r for r in self.class_routines if r["id"] != routine_id]
        self._save_class_routines()
        return True

    def batch_save_class_routines(self, routines_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        for item in routines_list:
            r_id = item.get("id")
            if r_id:
                existing = next((r for r in self.class_routines if r["id"] == r_id), None)
                if existing:
                    existing.update(item)
                    existing["updated_at"] = datetime.now().isoformat()
                else:
                    self.class_routines.append(item)
            else:
                item["id"] = f"rt-{str(uuid.uuid4())[:8]}"
                item["updated_at"] = datetime.now().isoformat()
                self.class_routines.append(item)
        self._save_class_routines()
        return self.class_routines

    def clear_room_routines(self, room_id: str, day: Optional[str] = None) -> bool:
        if day and day != "ALL":
            self.class_routines = [
                r for r in self.class_routines
                if not (r.get("room_id") == room_id and r.get("day", "").lower() == day.lower())
            ]
        else:
            self.class_routines = [r for r in self.class_routines if r.get("room_id") != room_id]
        self._save_class_routines()
        return True

    def get_active_schedule_for_room(self, room_id: str, now_dt: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        if not now_dt:
            now_dt = datetime.now()

        today_str = now_dt.strftime("%Y-%m-%d")
        now_time_str = now_dt.strftime("%H:%M")

        # Find schedules matching room and date
        room_today_scheds = [
            s for s in self.schedules
            if s.get("date") == today_str and (room_id in s.get("hall_ids", []) or "ALL" in s.get("hall_ids", []) or not s.get("hall_ids"))
        ]

        room_today_scheds.sort(key=lambda x: x.get("start_time", "00:00"))

        # 1. Check if any schedule today is currently inside its live active window (entry_open <= now <= exit_close)
        for s in room_today_scheds:
            st = s.get("start_time", "00:00")
            et = s.get("end_time", "23:59")
            entry_open = add_minutes_to_time_str(st, -ENTRY_PRE_EXAM_MINUTES)
            exit_close = add_minutes_to_time_str(et, EXIT_POST_EXAM_MINUTES)

            if st <= now_time_str <= et:
                return {
                    **s,
                    "is_live_active": True,
                    "session_state": "RUNNING",
                    "entry_open_time": entry_open,
                    "exit_close_time": exit_close
                }
            elif entry_open <= now_time_str < st:
                return {
                    **s,
                    "is_live_active": True,
                    "session_state": "ENTRY_OPEN",
                    "entry_open_time": entry_open,
                    "exit_close_time": exit_close
                }
            elif et < now_time_str <= exit_close:
                return {
                    **s,
                    "is_live_active": True,
                    "session_state": "EXIT_WINDOW",
                    "entry_open_time": entry_open,
                    "exit_close_time": exit_close
                }

        # 2. If NO exam is currently live, look for the NEXT upcoming exam schedule
        next_sched = self.get_next_schedule_for_room(room_id, now_dt)
        if next_sched:
            st = next_sched.get("start_time", "00:00")
            et = next_sched.get("end_time", "23:59")
            entry_open = add_minutes_to_time_str(st, -ENTRY_PRE_EXAM_MINUTES)
            exit_close = add_minutes_to_time_str(et, EXIT_POST_EXAM_MINUTES)
            is_today = (next_sched.get("date") == today_str)

            return {
                **next_sched,
                "is_live_active": False,
                "session_state": "UPCOMING_TODAY" if is_today else "FUTURE_SCHEDULE",
                "entry_open_time": entry_open,
                "exit_close_time": exit_close
            }

        # 3. No live and no upcoming schedules (all past)
        return {
            "is_live_active": False,
            "session_state": "NO_EXAM_SCHEDULED",
            "title": "No Upcoming Exams",
            "date": today_str
        }

    # -------------------------------------------------------------
    # 4. Room Allocations & Admit Card Clearance
    # -------------------------------------------------------------
    def allocate_candidate(
        self,
        candidate_id: str,
        room_id: str,
        seat_number: str = "Seat A-01",
        admit_status: str = "CLEARED",  # "CLEARED" | "PENDING_DUES" | "BLOCKED"
        remarks: str = ""
    ) -> Dict[str, Any]:
        user = self.get_user(candidate_id)
        if not user:
            raise ValueError("Candidate not found")

        room = self.get_room(room_id)
        room_name = room["name"] if room else "General Exam Hall"

        alloc = {
            "candidate_id": candidate_id,
            "name": user["name"],
            "roll_id": user.get("roll_id", ""),
            "department": user.get("department", ""),
            "room_id": room_id,
            "room_name": room_name,
            "seat_number": seat_number.strip(),
            "admit_status": admit_status,  # CLEARED, PENDING_DUES, BLOCKED
            "remarks": remarks.strip(),
            "special_clearance_by": None,
            "updated_at": datetime.now().isoformat()
        }

        self.allocations[candidate_id] = alloc
        self._save_allocations()
        return alloc

    def get_candidate_allocation(self, candidate_id: str) -> Optional[Dict[str, Any]]:
        if candidate_id in self.allocations:
            return self.allocations[candidate_id]

        user = self.get_user(candidate_id)
        if not user:
            return None

        first_room = self.rooms[0] if self.rooms else {"id": "room-101", "name": "Room 101"}
        return self.allocate_candidate(candidate_id, first_room["id"], "Seat A-01", "CLEARED")

    def get_all_allocations(self) -> List[Dict[str, Any]]:
        result = []
        users = self.get_users()
        for user in users:
            alloc = self.get_candidate_allocation(user["id"])
            if alloc:
                result.append(alloc)
        return result

    def update_admit_clearance(
        self,
        candidate_id: str,
        admit_status: str,
        special_clearance_by: Optional[str] = "Hall Supervisor",
        remarks: str = "Special Clearance Granted"
    ) -> Dict[str, Any]:
        alloc = self.get_candidate_allocation(candidate_id)
        if not alloc:
            raise ValueError("Candidate allocation not found")

        alloc["admit_status"] = admit_status
        if special_clearance_by:
            alloc["special_clearance_by"] = special_clearance_by
        if remarks:
            alloc["remarks"] = remarks
        alloc["updated_at"] = datetime.now().isoformat()

        self.allocations[candidate_id] = alloc
        self._save_allocations()
        return alloc

    def get_room_allocations(self, room_id: str) -> List[Dict[str, Any]]:
        """Returns all student allocations specifically assigned to this room_id."""
        result = []
        for cand_id, alloc in self.allocations.items():
            if alloc.get("room_id") == room_id:
                user = self.get_user(cand_id)
                alloc_copy = dict(alloc)
                if user:
                    alloc_copy["user_name"] = user.get("name", "")
                    alloc_copy["user_roll"] = user.get("roll_id", "")
                    alloc_copy["user_dept"] = user.get("department", "")
                    alloc_copy["images"] = user.get("images", {})
                result.append(alloc_copy)
        return result

    def remove_candidate_from_room(self, room_id: str, candidate_id: str) -> bool:
        """Removes a candidate from a specific room, unassigning their seat."""
        if candidate_id in self.allocations:
            alloc = self.allocations[candidate_id]
            if alloc.get("room_id") == room_id:
                alloc["room_id"] = ""
                alloc["room_name"] = "Unassigned"
                alloc["seat_number"] = "Unassigned"
                alloc["updated_at"] = datetime.now().isoformat()
                self._save_allocations()
                return True
        return False

    def batch_allocate_room(self, room_id: str, assignments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Batch allocates students to a room.
        assignments: list of dicts with {'candidate_id': ..., 'seat_number': ..., 'admit_status': ...}
        """
        results = []
        for item in assignments:
            cand_id = item.get("candidate_id")
            if cand_id:
                alloc = self.allocate_candidate(
                    candidate_id=cand_id,
                    room_id=room_id,
                    seat_number=item.get("seat_number", "Seat A-01"),
                    admit_status=item.get("admit_status", "CLEARED"),
                    remarks=item.get("remarks", "")
                )
                results.append(alloc)
        return results

    # -------------------------------------------------------------
    # 5. Room-Aware Status, Schedule, & Washroom Engine
    # -------------------------------------------------------------
    def get_next_schedule_for_room(self, room_id: str, now_dt: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
        if not now_dt:
            now_dt = datetime.now()
        today_str = now_dt.strftime("%Y-%m-%d")
        now_time_str = now_dt.strftime("%H:%M")

        # 1. Check today's upcoming or currently ongoing schedules that have not yet reached exit close deadline
        today_upcoming = []
        for s in self.schedules:
            if s.get("date") == today_str and ("ALL" in s.get("hall_ids", []) or room_id in s.get("hall_ids", []) or not s.get("hall_ids")):
                exit_close = add_minutes_to_time_str(s.get("end_time", "23:59"), EXIT_POST_EXAM_MINUTES)
                # Only consider if session has not ended past the 30-min exit deadline
                if now_time_str <= exit_close:
                    today_upcoming.append(s)

        if today_upcoming:
            today_upcoming.sort(key=lambda x: x.get("start_time", "00:00"))
            return today_upcoming[0]

        # 2. Check future schedules (where date > today_str)
        future_scheds = [
            s for s in self.schedules
            if s.get("date", "") > today_str and ("ALL" in s.get("hall_ids", []) or room_id in s.get("hall_ids", []) or not s.get("hall_ids"))
        ]
        if future_scheds:
            future_scheds.sort(key=lambda x: (x.get("date", ""), x.get("start_time", "00:00")))
            return future_scheds[0]

        return None

    def _is_dept_match(self, candidate_dept: str, sched_depts: List[str]) -> bool:
        if not candidate_dept or not sched_depts or "ALL" in sched_depts:
            return True

        cand_clean = candidate_dept.strip().lower()

        # Build candidate codes and names set using departments database
        cand_codes = {cand_clean}
        cand_names = {cand_clean}
        for d in self.departments:
            d_name = d.get("name", "").strip().lower()
            d_code = d.get("code", "").strip().lower()
            if cand_clean in [d_name, d_code] or (d_name and d_name in cand_clean) or (d_name and cand_clean in d_name):
                if d_name: cand_names.add(d_name)
                if d_code: cand_codes.add(d_code)

        for sd in sched_depts:
            if sd == "ALL":
                return True
            sd_clean = sd.strip().lower()

            sd_codes = {sd_clean}
            sd_names = {sd_clean}
            for d in self.departments:
                d_name = d.get("name", "").strip().lower()
                d_code = d.get("code", "").strip().lower()
                if sd_clean in [d_name, d_code] or (d_name and d_name in sd_clean) or (d_name and sd_clean in d_name):
                    if d_name: sd_names.add(d_name)
                    if d_code: sd_codes.add(d_code)

            if cand_codes.intersection(sd_codes) or cand_names.intersection(sd_names):
                return True

            for cn in cand_names:
                for sn in sd_names:
                    if cn in sn or sn in cn:
                        return True

        return False

    def sweep_auto_exits(self, day_key: Optional[str] = None, now_dt: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """
        Sweeps through today's attendance records.
        If current time is > 30 minutes after an exam's scheduled end time,
        any candidate still marked as 'INSIDE' or 'WASHROOM' is automatically transitioned to 'EXITED'.
        """
        if not day_key:
            day_key = self._get_today_key()
        if not now_dt:
            now_dt = datetime.now()

        today_records = self.attendance.get(day_key, {})
        if not today_records:
            return []

        now_time_str = now_dt.strftime("%H:%M")
        now_time_12h = now_dt.strftime("%I:%M:%S %p")
        now_iso = now_dt.isoformat()

        updated_records = []
        has_changes = False

        for cand_id, rec in today_records.items():
            status = rec.get("status")
            if status in ["INSIDE", "WASHROOM"]:
                room_id = rec.get("room_id")
                sched = self.get_active_schedule_for_room(room_id, now_dt)
                if not sched:
                    sched = self.get_next_schedule_for_room(room_id, now_dt)

                end_time = sched.get("end_time", "23:59") if sched else "23:59"
                auto_exit_deadline = add_minutes_to_time_str(end_time, EXIT_POST_EXAM_MINUTES)

                # If current time is past end_time + 30 mins:
                if now_time_str > auto_exit_deadline:
                    rec["status"] = "EXITED"
                    rec["exit_time"] = now_time_12h
                    rec["exit_iso"] = now_iso
                    rec["is_auto_exit"] = True
                    rec["auto_exit_reason"] = f"Auto-exited: 30 minutes elapsed after exam ended at {end_time}."

                    # Calculate duration
                    if rec.get("entry_iso"):
                        try:
                            entry_dt = datetime.fromisoformat(rec["entry_iso"])
                            duration = round((now_dt - entry_dt).total_seconds() / 60.0, 1)
                            rec["duration_minutes"] = duration
                        except Exception:
                            pass

                    # If candidate was in washroom, close washroom break
                    if status == "WASHROOM":
                        if rec.get("washroom_out_iso"):
                            try:
                                out_dt = datetime.fromisoformat(rec["washroom_out_iso"])
                                wb_dur = round((now_dt - out_dt).total_seconds() / 60.0, 1)
                                rec["total_washroom_minutes"] = round(rec.get("total_washroom_minutes", 0.0) + wb_dur, 1)
                                rec["washroom_count"] = rec.get("washroom_count", 0) + 1
                            except Exception:
                                pass
                        rec["washroom_out_time"] = None
                        rec["washroom_out_iso"] = None

                    has_changes = True
                    updated_records.append(rec)

        if has_changes:
            self._save_attendance()

        return updated_records

    def get_candidate_status(
        self,
        candidate_id: str,
        active_room_id: Optional[str] = None,
        day_key: Optional[str] = None,
        now_dt: Optional[datetime] = None
    ) -> Dict[str, Any]:
        if not day_key:
            day_key = self._get_today_key()
        if not now_dt:
            now_dt = datetime.now()

        # Run auto-exit sweep first
        self.sweep_auto_exits(day_key=day_key, now_dt=now_dt)

        user = self.get_user(candidate_id)
        if not user:
            return {"status": "UNREGISTERED", "record": None, "allocation": None}

        alloc = self.get_candidate_allocation(candidate_id)
        day_records = self.attendance.get(day_key, {})
        att_record = day_records.get(candidate_id)

        # 1. Check Room Match
        if active_room_id and alloc and alloc.get("room_id") != active_room_id:
            active_room = self.get_room(active_room_id)
            return {
                "status": "WRONG_ROOM",
                "candidate": user,
                "allocation": alloc,
                "allocated_room_name": alloc.get("room_name", "Another Room"),
                "allocated_seat": alloc.get("seat_number", "-"),
                "active_room_name": active_room["name"] if active_room else active_room_id,
                "record": att_record,
                "admit_status": alloc.get("admit_status", "CLEARED")
            }

        # 2. Check Admit Card Status
        admit_status = alloc.get("admit_status", "CLEARED") if alloc else "CLEARED"
        if admit_status != "CLEARED":
            return {
                "status": "ADMIT_PENDING",
                "candidate": user,
                "allocation": alloc,
                "admit_status": admit_status,
                "remarks": alloc.get("remarks", "Admit card not cleared / Fee pending"),
                "record": att_record
            }

        # 3. Check Active Exam Schedule for this Room (Date, Dept & Time Window)
        if active_room_id:
            active_sched = self.get_active_schedule_for_room(active_room_id, now_dt)

            # If no exam is currently live active (Standby / Normal Camera Mode):
            if not active_sched or not active_sched.get("is_live_active"):
                next_title = active_sched.get("title", "No Upcoming Exam") if active_sched else "No Upcoming Exam"
                next_date = active_sched.get("date", "-") if active_sched else "-"
                next_time = active_sched.get("start_time", "-") if active_sched else "-"
                entry_open = active_sched.get("entry_open_time", "-") if active_sched else "-"

                return {
                    "status": "STANDBY_NO_EXAM",
                    "is_standby": True,
                    "candidate": user,
                    "allocation": alloc,
                    "schedule": active_sched,
                    "next_schedule": active_sched,
                    "remarks": f"Standby Mode (Normal Camera). Next exam '{next_title}' is scheduled on {next_date} at {next_time} (Entry opens at {entry_open}).",
                    "record": att_record
                }

            if active_sched:
                sched_depts = active_sched.get("departments", ["ALL"])
                user_dept = user.get("department", "").strip()

                # Verify Department Match (using code & full name resolution)
                if not self._is_dept_match(user_dept, sched_depts):
                    return {
                        "status": "WRONG_DEPARTMENT",
                        "candidate": user,
                        "allocation": alloc,
                        "schedule": active_sched,
                        "allowed_departments": sched_depts,
                        "candidate_department": user_dept,
                        "record": att_record
                    }

                # Verify Time Window: Entry opens 30m before exam; auto-exit 30m after end
                start_time = active_sched.get("start_time", "00:00")
                end_time = active_sched.get("end_time", "23:59")
                entry_open_time = add_minutes_to_time_str(start_time, -ENTRY_PRE_EXAM_MINUTES)
                exit_close_time = add_minutes_to_time_str(end_time, EXIT_POST_EXAM_MINUTES)
                now_time_str = now_dt.strftime("%H:%M")

                # Before Entry Window (earlier than start_time - 30m):
                if now_time_str < entry_open_time:
                    return {
                        "status": "EXAM_NOT_STARTED",
                        "candidate": user,
                        "allocation": alloc,
                        "schedule": active_sched,
                        "schedule_start_time": start_time,
                        "entry_open_time": entry_open_time,
                        "remarks": f"Attendance entry opens at {entry_open_time} (30 mins before exam starts at {start_time}).",
                        "record": att_record
                    }

                # After Exam End Time (now_time_str > end_time):
                if now_time_str > end_time:
                    # If candidate has not entered yet:
                    if not att_record or att_record.get("status") in ["ABSENT", "NOT_ENTERED"]:
                        return {
                            "status": "EXAM_ENDED",
                            "candidate": user,
                            "allocation": alloc,
                            "schedule": active_sched,
                            "schedule_end_time": end_time,
                            "remarks": f"Exam ended at {end_time}. New entry is closed.",
                            "record": att_record
                        }
                    # If candidate already exited (or auto-exited):
                    if att_record and att_record.get("status") == "EXITED":
                        return {
                            "status": "EXITED",
                            "candidate": user,
                            "allocation": alloc,
                            "schedule": active_sched,
                            "record": att_record,
                            "remarks": att_record.get("auto_exit_reason", "Candidate has exited the exam.")
                        }

        # 4. Check Current Attendance Status
        if not att_record:
            return {
                "status": "NOT_ENTERED",
                "candidate": user,
                "allocation": alloc,
                "record": None
            }

        current_status = att_record.get("status", "NOT_ENTERED")
        return {
            "status": current_status,
            "candidate": user,
            "allocation": alloc,
            "record": att_record
        }

    def mark_attendance(
        self,
        candidate_id: str,
        action: str,  # "ENTRY", "EXIT", "WASHROOM_OUT", "WASHROOM_IN"
        active_room_id: Optional[str] = None,
        snapshot_bytes: Optional[bytes] = None,
        signature_bytes: Optional[bytes] = None,
        exam_name: str = "Final Examination 2026",
        hall_name: str = "Room 202 - CS & AI Lab",
        override_admit: bool = False,
        override_schedule: bool = False
    ) -> Dict[str, Any]:
        user = self.get_user(candidate_id)
        if not user:
            raise ValueError("Candidate not found in database.")

        alloc = self.get_candidate_allocation(candidate_id)

        # 1. Validate room
        if active_room_id and alloc and alloc.get("room_id") != active_room_id:
            raise ValueError(f"Wrong Room! Candidate is allocated to {alloc.get('room_name')}, not this room.")

        # 2. Validate admit card
        admit_status = alloc.get("admit_status", "CLEARED") if alloc else "CLEARED"
        if admit_status != "CLEARED" and not override_admit:
            raise ValueError(f"Admit card clearance pending ({alloc.get('remarks', 'Fee Dues')}). Entry blocked.")

        day_key = self._get_today_key()
        now = datetime.now()
        time_str = now.strftime("%I:%M:%S %p")
        iso_str = now.isoformat()

        # 3. Check Active Schedule & Department
        active_sched = None
        if active_room_id:
            active_sched = self.get_active_schedule_for_room(active_room_id, now)

        if active_sched and not override_schedule:
            sched_depts = active_sched.get("departments", ["ALL"])
            user_dept = user.get("department", "").strip()
            if not self._is_dept_match(user_dept, sched_depts):
                raise ValueError(f"Department mismatch! This exam session is for {', '.join(sched_depts)}, but candidate is from {user_dept}.")

            # Validate 30-minute Pre-Exam Entry Window & End Time
            if action == "ENTRY":
                start_time = active_sched.get("start_time", "00:00")
                end_time = active_sched.get("end_time", "23:59")
                entry_open_time = add_minutes_to_time_str(start_time, -ENTRY_PRE_EXAM_MINUTES)
                now_time_str = now.strftime("%H:%M")

                if now_time_str < entry_open_time:
                    raise ValueError(f"Exam entry is not open yet! Attendance entry starts at {entry_open_time} (30 mins before exam starts at {start_time}).")
                if now_time_str > end_time:
                    raise ValueError(f"Exam ended at {end_time}. New candidate entry is closed.")

            if active_sched.get("title"):
                exam_name = active_sched["title"]

        washroom_limit = active_sched.get("washroom_limit_minutes", 10) if active_sched else 10

        if day_key not in self.attendance:
            self.attendance[day_key] = {}

        day_att_dir = os.path.join(self.attendance_dir, day_key, candidate_id)
        os.makedirs(day_att_dir, exist_ok=True)

        current_record = self.attendance[day_key].get(candidate_id, {
            "candidate_id": candidate_id,
            "name": user["name"],
            "roll_id": user.get("roll_id", ""),
            "department": user.get("department", ""),
            "room_id": alloc.get("room_id", active_room_id) if alloc else active_room_id,
            "room_name": alloc.get("room_name", hall_name) if alloc else hall_name,
            "seat_number": alloc.get("seat_number", "Seat A-01") if alloc else "Seat A-01",
            "admit_status": admit_status,
            "date": day_key,
            "exam_name": exam_name,
            "hall_name": hall_name,
            "status": "ABSENT",
            "entry_time": None,
            "entry_iso": None,
            "entry_snapshot": None,
            "signature_snapshot": None,
            "signature_time": None,
            "exit_time": None,
            "exit_iso": None,
            "exit_snapshot": None,
            "duration_minutes": None,
            # Washroom Break Tracking
            "washroom_out_time": None,
            "washroom_out_iso": None,
            "washroom_out_snapshot": None,
            "washroom_count": 0,
            "total_washroom_minutes": 0.0,
            "has_washroom_violation": False,
            "washroom_logs": []
        })

        # Save snapshot file helper
        def save_snap(prefix: str) -> Optional[str]:
            if not snapshot_bytes:
                return None
            filename = f"{prefix}_{int(now.timestamp())}.jpg"
            fpath = os.path.join(day_att_dir, filename)
            with open(fpath, "wb") as f:
                f.write(snapshot_bytes)
            return f"attendance/snapshots/{day_key}/{candidate_id}/{filename}"

        # Save signature file helper
        def save_signature() -> Optional[str]:
            if not signature_bytes:
                return None
            filename = f"signature_{int(now.timestamp())}.png"
            fpath = os.path.join(day_att_dir, filename)
            with open(fpath, "wb") as f:
                f.write(signature_bytes)
            return f"attendance/snapshots/{day_key}/{candidate_id}/{filename}"

        # -------------------------------------------------------------
        # ACTION: ENTRY
        # -------------------------------------------------------------
        if action == "ENTRY":
            snap_path = save_snap("entry")
            sig_path = save_signature()
            current_record["status"] = "INSIDE"
            current_record["entry_time"] = time_str
            current_record["entry_iso"] = iso_str
            if snap_path:
                current_record["entry_snapshot"] = snap_path
            if sig_path:
                current_record["signature_snapshot"] = sig_path
                current_record["signature_time"] = time_str
            current_record["exam_name"] = exam_name
            current_record["hall_name"] = hall_name

        # -------------------------------------------------------------
        # ACTION: EXIT (Submit Exam & Leave)
        # -------------------------------------------------------------
        elif action == "EXIT":
            snap_path = save_snap("exit")
            current_record["status"] = "EXITED"
            current_record["exit_time"] = time_str
            current_record["exit_iso"] = iso_str
            if snap_path:
                current_record["exit_snapshot"] = snap_path

            if current_record.get("entry_iso"):
                try:
                    entry_dt = datetime.fromisoformat(current_record["entry_iso"])
                    duration = round((now - entry_dt).total_seconds() / 60.0, 1)
                    current_record["duration_minutes"] = duration
                except Exception:
                    pass

        # -------------------------------------------------------------
        # ACTION: WASHROOM_OUT (Leaving hall for washroom break)
        # -------------------------------------------------------------
        elif action == "WASHROOM_OUT":
            if current_record.get("status") != "INSIDE":
                raise ValueError(f"Candidate must be inside the exam hall to take a washroom break. Current status: {current_record.get('status')}")

            snap_path = save_snap("washroom_out")
            current_record["status"] = "WASHROOM"
            current_record["washroom_out_time"] = time_str
            current_record["washroom_out_iso"] = iso_str
            current_record["washroom_out_snapshot"] = snap_path

        # -------------------------------------------------------------
        # ACTION: WASHROOM_IN (Returning from washroom break)
        # -------------------------------------------------------------
        elif action == "WASHROOM_IN":
            if current_record.get("status") != "WASHROOM":
                raise ValueError(f"Candidate is not marked as being in the washroom. Current status: {current_record.get('status')}")

            out_iso = current_record.get("washroom_out_iso")
            out_time = current_record.get("washroom_out_time")
            snap_path = save_snap("washroom_in")

            duration_mins = 0.0
            if out_iso:
                try:
                    out_dt = datetime.fromisoformat(out_iso)
                    duration_mins = round((now - out_dt).total_seconds() / 60.0, 1)
                except Exception:
                    duration_mins = 1.0

            is_overtime = duration_mins > washroom_limit
            overtime_mins = max(0.0, round(duration_mins - washroom_limit, 1))

            break_record = {
                "out_time": out_time or "Unknown",
                "out_iso": out_iso,
                "in_time": time_str,
                "in_iso": iso_str,
                "duration_minutes": duration_mins,
                "limit_minutes": washroom_limit,
                "is_overtime": is_overtime,
                "overtime_minutes": overtime_mins,
                "snapshot_out": current_record.get("washroom_out_snapshot"),
                "snapshot_in": snap_path
            }

            if "washroom_logs" not in current_record:
                current_record["washroom_logs"] = []
            current_record["washroom_logs"].append(break_record)

            current_record["washroom_count"] = current_record.get("washroom_count", 0) + 1
            current_record["total_washroom_minutes"] = round(current_record.get("total_washroom_minutes", 0.0) + duration_mins, 1)

            if is_overtime:
                current_record["has_washroom_violation"] = True
                # Log security alert for overtime washroom violation
                self.log_proxy_alert(
                    snapshot_bytes=snapshot_bytes,
                    confidence=1.0,
                    notes=f"⚠️ Washroom Time Violation: Candidate {user['name']} ({user.get('roll_id', '')}) stayed in washroom for {duration_mins} mins (Limit: {washroom_limit} mins, Over: +{overtime_mins} mins) at {hall_name}."
                )

            # Return candidate to INSIDE status
            current_record["status"] = "INSIDE"
            current_record["washroom_out_time"] = None
            current_record["washroom_out_iso"] = None
            current_record["washroom_out_snapshot"] = None
            current_record["last_break"] = break_record

        self.attendance[day_key][candidate_id] = current_record
        self._save_attendance()
        return current_record

    def get_today_attendance(self, room_id: Optional[str] = None, day_key: Optional[str] = None) -> Dict[str, Any]:
        if not day_key:
            day_key = self._get_today_key()

        # Run auto-exit sweep for candidates past the 30-min post-exam exit window
        self.sweep_auto_exits(day_key=day_key)

        day_records = self.attendance.get(day_key, {})
        all_users = self.get_users()

        complete_sheet = []
        present_count = 0
        washroom_count = 0
        exited_count = 0
        absent_count = 0
        violations_count = 0

        for user in all_users:
            uid = user["id"]
            alloc = self.get_candidate_allocation(uid)

            # Filter by room if specified
            if room_id and alloc and alloc.get("room_id") != room_id:
                continue

            if uid in day_records:
                rec = day_records[uid]
                status = rec.get("status", "ABSENT")
                if status == "INSIDE":
                    present_count += 1
                elif status == "WASHROOM":
                    washroom_count += 1
                    present_count += 1  # Still counted in exam
                elif status == "EXITED":
                    exited_count += 1
                else:
                    absent_count += 1

                if rec.get("has_washroom_violation"):
                    violations_count += 1

                complete_sheet.append(rec)
            elif alloc and alloc.get("room_id") and alloc.get("room_name") not in ["", "Unassigned"]:
                # Only list as absent if candidate is explicitly assigned to a hall
                absent_count += 1
                first_img = list(user.get("images", {}).values())[0] if user.get("images") else None
                complete_sheet.append({
                    "candidate_id": uid,
                    "name": user["name"],
                    "roll_id": user.get("roll_id", ""),
                    "department": user.get("department", ""),
                    "room_id": alloc.get("room_id", "room-101"),
                    "room_name": alloc.get("room_name", "General Hall"),
                    "seat_number": alloc.get("seat_number", "Seat A-01"),
                    "admit_status": alloc.get("admit_status", "CLEARED"),
                    "date": day_key,
                    "exam_name": "Scheduled Exam",
                    "hall_name": alloc.get("room_name", "Exam Hall"),
                    "status": "ABSENT",
                    "entry_time": "-",
                    "entry_snapshot": first_img,
                    "exit_time": "-",
                    "exit_snapshot": None,
                    "duration_minutes": None,
                    "washroom_count": 0,
                    "total_washroom_minutes": 0,
                    "has_washroom_violation": False,
                    "washroom_logs": [],
                    "movement_history": []
                })

        return {
            "date": day_key,
            "room_id": room_id,
            "total_candidates": len(complete_sheet),
            "present_inside": present_count,
            "in_washroom": washroom_count,
            "exited": exited_count,
            "absent": absent_count,
            "washroom_violations": violations_count,
            "records": complete_sheet
        }

    # -------------------------------------------------------------
    # 6. Security & Proxy Alerts
    # -------------------------------------------------------------
    def log_proxy_alert(
        self,
        snapshot_bytes: Optional[bytes] = None,
        confidence: float = 0.0,
        notes: str = "Unrecognized face detected during exam session."
    ) -> Dict[str, Any]:
        day_key = self._get_today_key()
        now = datetime.now()
        alert_id = str(uuid.uuid4())[:8]

        alerts_dir = os.path.join(self.attendance_dir, day_key, "alerts")
        os.makedirs(alerts_dir, exist_ok=True)

        snap_path = None
        if snapshot_bytes:
            filename = f"proxy_{alert_id}_{int(now.timestamp())}.jpg"
            fpath = os.path.join(alerts_dir, filename)
            with open(fpath, "wb") as f:
                f.write(snapshot_bytes)
            snap_path = f"attendance/snapshots/{day_key}/alerts/{filename}"

        alert_record = {
            "id": alert_id,
            "timestamp": now.strftime("%I:%M:%S %p"),
            "iso_date": now.isoformat(),
            "date": day_key,
            "confidence": confidence,
            "snapshot": snap_path,
            "notes": notes
        }

        self.alerts.insert(0, alert_record)
        self.alerts = self.alerts[:100]
        self._save_alerts()
        return alert_record

    def get_proxy_alerts(self) -> List[Dict[str, Any]]:
        return self.alerts

    def update_alert(self, alert_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for al in self.alerts:
            if al.get("id") == alert_id:
                for k, v in updates.items():
                    if v is not None:
                        al[k] = v
                self._save_alerts()
                return al
        return None

    def delete_alert(self, alert_id: str) -> bool:
        initial_len = len(self.alerts)
        self.alerts = [al for al in self.alerts if al.get("id") != alert_id]
        if len(self.alerts) < initial_len:
            self._save_alerts()
            return True
        return False

    def clear_all_alerts(self) -> bool:
        self.alerts = []
        self._save_alerts()
        return True

    def update_attendance_record(
        self,
        candidate_id: str,
        updates: Dict[str, Any],
        day_key: Optional[str] = None
    ) -> Dict[str, Any]:
        if not day_key:
            day_key = self._get_today_key()

        if day_key not in self.attendance:
            self.attendance[day_key] = {}

        current_record = self.attendance[day_key].get(candidate_id)
        if not current_record:
            user = self.get_user(candidate_id)
            if not user:
                raise ValueError(f"Candidate {candidate_id} not found in database.")
            alloc = self.get_candidate_allocation(candidate_id)
            current_record = {
                "candidate_id": candidate_id,
                "name": user["name"],
                "roll_id": user.get("roll_id", ""),
                "department": user.get("department", ""),
                "room_id": alloc.get("room_id") if alloc else "room-101",
                "room_name": alloc.get("room_name", "General Hall") if alloc else "General Hall",
                "seat_number": alloc.get("seat_number", "Seat A-01") if alloc else "Seat A-01",
                "admit_status": alloc.get("admit_status", "CLEARED") if alloc else "CLEARED",
                "date": day_key,
                "exam_name": "Scheduled Exam",
                "hall_name": alloc.get("room_name", "Exam Hall") if alloc else "Exam Hall",
                "status": "ABSENT",
                "entry_time": "-",
                "entry_snapshot": None,
                "exit_time": "-",
                "exit_snapshot": None,
                "duration_minutes": None,
                "washroom_count": 0,
                "total_washroom_minutes": 0,
                "has_washroom_violation": False,
                "washroom_logs": [],
                "movement_history": []
            }

        # Apply updates
        for k, v in updates.items():
            if v is not None:
                current_record[k] = v

        self.attendance[day_key][candidate_id] = current_record
        self._save_attendance()
        return current_record

    def delete_attendance_record(self, candidate_id: str, day_key: Optional[str] = None) -> bool:
        if not day_key:
            day_key = self._get_today_key()

        deleted = False
        # 1. Delete attendance record for the day
        if day_key in self.attendance and candidate_id in self.attendance[day_key]:
            del self.attendance[day_key][candidate_id]
            self._save_attendance()
            deleted = True

        # 2. Also remove candidate from room allocation if allocated so they don't reappear as an empty absent row
        if candidate_id in self.allocations:
            del self.allocations[candidate_id]
            self._save_allocations()
            deleted = True

        # 3. Clean up from active monitoring sessions
        for room_key, session in self.monitoring_sessions.items():
            if "candidates" in session and candidate_id in session["candidates"]:
                del session["candidates"][candidate_id]

        return deleted

    def reset_today_attendance(self, day_key: Optional[str] = None):
        self.attendance = {}
        self._save_attendance()
        return True

    def export_attendance_csv(self, room_id: Optional[str] = None, day_key: Optional[str] = None) -> str:
        data = self.get_today_attendance(room_id=room_id, day_key=day_key)
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "Candidate ID", "Full Name", "Roll / Student ID", "Department",
            "Allocated Room", "Seat Number", "Admit Status",
            "Exam Date", "Exam Subject", "Status",
            "Entry Time", "Exit Time", "Total Exam Mins",
            "Washroom Breaks Count", "Total Washroom Mins", "Washroom Violation"
        ])

        for r in data["records"]:
            writer.writerow([
                r.get("candidate_id", ""),
                r.get("name", ""),
                r.get("roll_id", ""),
                r.get("department", ""),
                r.get("room_name", ""),
                r.get("seat_number", ""),
                r.get("admit_status", ""),
                r.get("date", ""),
                r.get("exam_name", ""),
                r.get("status", ""),
                r.get("entry_time", "-"),
                r.get("exit_time", "-"),
                r.get("duration_minutes", "-"),
                r.get("washroom_count", 0),
                r.get("total_washroom_minutes", 0),
                "YES" if r.get("has_washroom_violation") else "NO"
            ])

        return output.getvalue()

    # -------------------------------------------------------------
    # 7. Continuous Exam Hall Surveillance & Presence Tracking
    # -------------------------------------------------------------
    def get_monitoring_config(self) -> Dict[str, Any]:
        return self.monitoring_config

    def update_monitoring_config(
        self,
        absence_threshold_sec: Optional[int] = None,
        gate_arrival_threshold_sec: Optional[int] = None,
        grace_period_sec: Optional[int] = None,
        auto_alert_voice: Optional[bool] = None
    ) -> Dict[str, Any]:
        if absence_threshold_sec is not None:
            self.monitoring_config["absence_threshold_sec"] = max(10, int(absence_threshold_sec))
        if gate_arrival_threshold_sec is not None:
            self.monitoring_config["gate_arrival_threshold_sec"] = max(30, int(gate_arrival_threshold_sec))
        if grace_period_sec is not None:
            self.monitoring_config["grace_period_sec"] = max(5, int(grace_period_sec))
        if auto_alert_voice is not None:
            self.monitoring_config["auto_alert_voice"] = bool(auto_alert_voice)
        return self.monitoring_config

    def update_continuous_presence(
        self,
        active_room_id: Optional[str],
        detected_faces: List[Dict[str, Any]],
        snapshot_bytes: Optional[bytes] = None
    ) -> Dict[str, Any]:
        day_key = self._get_today_key()
        now = datetime.now()
        now_iso = now.isoformat()
        now_time = now.strftime("%I:%M:%S %p")

        # Run auto-exit sweep for any candidates exceeding the 30-minute post-exam exit window
        self.sweep_auto_exits(day_key=day_key, now_dt=now)

        absence_threshold = self.monitoring_config.get("absence_threshold_sec", 15)
        gate_arrival_threshold = self.monitoring_config.get("gate_arrival_threshold_sec", 300)
        grace_period = self.monitoring_config.get("grace_period_sec", 5)

        room_key = active_room_id or "default-hall"

        # Check if an exam is currently live active in this room (between entry_open and exit_close)
        active_sched = self.get_active_schedule_for_room(active_room_id, now)
        if not active_sched or not active_sched.get("is_live_active") or active_sched.get("session_state") not in ["RUNNING", "ENTRY_OPEN"]:
            # Exam has concluded or outside active hours -> Clear session & enter Standby CCTV Mode
            if room_key in self.monitoring_sessions:
                # Close any remaining open candidate absence logs before ending session
                sess = self.monitoring_sessions[room_key]
                for c_id, c_data in sess.get("candidates", {}).items():
                    if c_data.get("current_open_absence"):
                        op_ev = c_data["current_open_absence"]
                        op_ev["return_time"] = now_time
                        op_ev["return_iso"] = now_iso
                        op_ev["status"] = "EXAM_ENDED"
                        c_data["current_open_absence"] = None
                        if day_key in self.attendance and c_id in self.attendance[day_key]:
                            self.attendance[day_key][c_id]["movement_history"] = c_data.get("movement_history", [])
                self._save_attendance()
                del self.monitoring_sessions[room_key]

            return {
                "success": True,
                "is_standby": True,
                "room_id": room_key,
                "message": f"Standby Mode (Normal CCTV). Next exam: {active_sched.get('title', 'None')} on {active_sched.get('date', '-')} at {active_sched.get('start_time', '-')}",
                "total_candidates_inside": 0,
                "present_active_count": 0,
                "writing_head_down_count": 0,
                "missing_count": 0,
                "in_washroom_count": 0,
                "unrecognized_faces_in_frame": 0,
                "roster": [],
                "new_alerts": [],
                "next_schedule": active_sched,
                "config": self.monitoring_config
            }

        if room_key not in self.monitoring_sessions:
            self.monitoring_sessions[room_key] = {
                "started_at": now_iso,
                "total_frames": 0,
                "candidates": {}
            }

        session = self.monitoring_sessions[room_key]
        session["total_frames"] += 1
        session["last_updated"] = now_iso

        # Get all attendance records for today
        today_att = self.get_today_attendance(room_id=active_room_id, day_key=day_key)
        records_map = {r["candidate_id"]: r for r in today_att.get("records", [])}

        # Build detected recognized users map (strictly 80%+ confidence)
        detected_user_map = {}
        unrecognized_count = 0
        for f in detected_faces:
            if f.get("is_recognized") and f.get("user_id") and f.get("confidence_percent", 0) >= 80.0:
                detected_user_map[f["user_id"]] = f
            else:
                unrecognized_count += 1

        # Track ONLY candidates who are currently INSIDE or in approved WASHROOM break
        # Any candidate who has EXITED or is ABSENT is completely excluded from monitoring.
        new_alerts = []
        for cand_id, att_rec in records_map.items():
            status = att_rec.get("status")

            # If candidate has EXITED or is ABSENT: immediately stop monitoring them
            if status not in ["INSIDE", "WASHROOM"]:
                if cand_id in session["candidates"]:
                    c_data = session["candidates"][cand_id]
                    # Close any pending absence log cleanly
                    if c_data.get("current_open_absence"):
                        op_ev = c_data["current_open_absence"]
                        op_ev["return_time"] = att_rec.get("exit_time", now_time)
                        op_ev["return_iso"] = now_iso
                        op_ev["status"] = "EXITED"
                        c_data["current_open_absence"] = None
                    if day_key in self.attendance and cand_id in self.attendance[day_key]:
                        self.attendance[day_key][cand_id]["movement_history"] = c_data.get("movement_history", [])
                    del session["candidates"][cand_id]
                continue

            entry_iso = att_rec.get("entry_iso")
            entry_time = att_rec.get("entry_time", now_time)
            try:
                entry_dt = datetime.fromisoformat(entry_iso) if entry_iso else now
            except Exception:
                entry_dt = now

            if cand_id not in session["candidates"]:
                existing_movements = att_rec.get("movement_history", [])
                session["candidates"][cand_id] = {
                    "candidate_id": cand_id,
                    "name": att_rec.get("name", "Unknown"),
                    "roll_id": att_rec.get("roll_id", ""),
                    "department": att_rec.get("department", ""),
                    "seat_number": att_rec.get("seat_number", "Seat A-01"),
                    "room_name": att_rec.get("room_name", "Exam Hall"),
                    "first_seen_iso": now_iso,
                    "has_been_seen_at_desk": False,
                    "entry_time": entry_time,
                    "entry_iso": entry_iso or now_iso,
                    "entry_dt": entry_dt,
                    "last_seen_dt": entry_dt,
                    "last_seen_iso": entry_iso or now_iso,
                    "last_seen_time": entry_time,
                    "posture": "ATTENTIVE",
                    "posture_label": "En route to Seat",
                    "is_writing": False,
                    "pitch_score": 0.0,
                    "monitoring_status": "PRESENT" if status == "INSIDE" else status,
                    "total_checks": 0,
                    "seen_checks": 0,
                    "writing_checks": 0,
                    "missing_alert_sent": False,
                    "missing_events_count": len(existing_movements),
                    "missing_duration_sec": 0,
                    "movement_history": list(existing_movements),
                    "current_open_absence": None
                }

            cand_track = session["candidates"][cand_id]
            cand_track["total_checks"] += 1

            if status == "WASHROOM":
                cand_track["monitoring_status"] = "WASHROOM"
                cand_track["posture_label"] = "Approved Washroom Break"
                cand_track["last_seen_dt"] = now
                cand_track["last_seen_iso"] = now_iso
                cand_track["missing_alert_sent"] = False
                continue

            # Status is INSIDE:
            if cand_id in detected_user_map:
                face_info = detected_user_map[cand_id]

                # Check if candidate is returning from an absence / away state
                last_seen_dt = cand_track.get("last_seen_dt", now)
                elapsed_since_last_seen = max(0.0, (now - last_seen_dt).total_seconds())

                was_away = (
                    cand_track.get("current_open_absence") is not None
                    or cand_track.get("is_verifying_return", False)
                    or cand_track.get("return_start_dt") is not None
                    or cand_track.get("monitoring_status") in ["MISSING", "GRACE_PERIOD", "WASHROOM", "EXITED", "RETURNING"]
                    or cand_track.get("missing_duration_sec", 0) > 1.5
                    or not cand_track.get("has_been_seen_at_desk", False)
                )

                if was_away:
                    # Candidate was away and is now in front of camera
                    if cand_track.get("return_start_dt") is None:
                        # First frame of return detection: record the exact timestamp they returned to desk
                        cand_track["return_start_dt"] = now
                        cand_track["return_start_iso"] = now_iso
                        cand_track["return_start_time"] = now_time
                        cand_track["is_verifying_return"] = True
                        cand_track["stable_seen_sec"] = 0

                    # Calculate how long candidate has been stably seen continuously
                    stable_seen_sec = max(0.0, (now - cand_track["return_start_dt"]).total_seconds())

                    # Require at least 5.0 seconds of continuous stable presence
                    if stable_seen_sec < 5.0:
                        # Still in the 5-second verification window
                        cand_track["monitoring_status"] = "RETURNING"
                        if not cand_track.get("has_been_seen_at_desk", False):
                            cand_track["posture_label"] = f"🟢 Verifying Entry ({int(stable_seen_sec)}s/5s)"
                        else:
                            cand_track["posture_label"] = f"🟢 Verifying Return ({int(stable_seen_sec)}s/5s)"
                        cand_track["stable_seen_sec"] = round(stable_seen_sec, 1)
                        cand_track["is_verifying_return"] = True
                        cand_track["posture"] = face_info.get("posture", "ATTENTIVE")
                        cand_track["is_writing"] = face_info.get("is_writing", False)
                        cand_track["seen_checks"] += 1

                        # Keep missing duration > 0 so it does not say "Live" until 5s are completed
                        cand_track["missing_duration_sec"] = round(max(1.0, (now - last_seen_dt).total_seconds()), 1)

                        # Keep absence duration frozen to the return moment (excluding ongoing 5s verification)
                        if cand_track.get("current_open_absence"):
                            open_ev = cand_track["current_open_absence"]
                            try:
                                out_dt = datetime.fromisoformat(open_ev["out_iso"])
                                dur_sec = max(0, int((cand_track["return_start_dt"] - out_dt).total_seconds()))
                            except Exception:
                                dur_sec = open_ev.get("duration_sec", 0)
                            open_ev["duration_sec"] = dur_sec
                            open_ev["duration_formatted"] = f"{dur_sec // 60}m {dur_sec % 60}s" if dur_sec >= 60 else f"{dur_sec}s"
                    else:
                        # 5 SECONDS OF STABLE PRESENCE CONFIRMED!
                        cand_track["has_been_seen_at_desk"] = True
                        # Close the open absence event officially
                        if cand_track.get("current_open_absence"):
                            open_ev = cand_track["current_open_absence"]
                            open_ev["return_time"] = cand_track["return_start_time"]
                            open_ev["return_iso"] = cand_track["return_start_iso"]
                            try:
                                out_dt = datetime.fromisoformat(open_ev["out_iso"])
                                # Exclude the 5-second return verification window from absence duration
                                dur_sec = max(0, int((cand_track["return_start_dt"] - out_dt).total_seconds()))
                            except Exception:
                                dur_sec = open_ev.get("duration_sec", 0)
                            open_ev["duration_sec"] = dur_sec
                            open_ev["duration_formatted"] = f"{dur_sec // 60}m {dur_sec % 60}s" if dur_sec >= 60 else f"{dur_sec}s"
                            open_ev["status"] = "RETURNED"
                            cand_track["current_open_absence"] = None

                        # Reset return verification trackers
                        cand_track["return_start_dt"] = None
                        cand_track["return_start_iso"] = None
                        cand_track["return_start_time"] = None
                        cand_track["is_verifying_return"] = False
                        cand_track["stable_seen_sec"] = 0
                        cand_track["missing_alert_sent"] = False
                        cand_track["missing_duration_sec"] = 0

                        # Mark present / writing and NOW update last seen to LIVE
                        cand_track["last_seen_dt"] = now
                        cand_track["last_seen_iso"] = now_iso
                        cand_track["last_seen_time"] = now_time
                        cand_track["posture"] = face_info.get("posture", "ATTENTIVE")
                        cand_track["posture_label"] = face_info.get("posture_label", "Attentive")
                        cand_track["is_writing"] = face_info.get("is_writing", False)
                        cand_track["pitch_score"] = face_info.get("pitch_score", 0.0)
                        cand_track["seen_checks"] += 1
                        if cand_track["is_writing"]:
                            cand_track["writing_checks"] += 1
                            cand_track["monitoring_status"] = "WRITING"
                        else:
                            cand_track["monitoring_status"] = "PRESENT"
                else:
                    # Normal continuous detection while already present at desk
                    cand_track["has_been_seen_at_desk"] = True
                    cand_track["last_seen_dt"] = now
                    cand_track["last_seen_iso"] = now_iso
                    cand_track["last_seen_time"] = now_time
                    cand_track["posture"] = face_info.get("posture", "ATTENTIVE")
                    cand_track["posture_label"] = face_info.get("posture_label", "Attentive")
                    cand_track["is_writing"] = face_info.get("is_writing", False)
                    cand_track["pitch_score"] = face_info.get("pitch_score", 0.0)
                    cand_track["seen_checks"] += 1
                    if cand_track["is_writing"]:
                        cand_track["writing_checks"] += 1
                        cand_track["monitoring_status"] = "WRITING"
                    else:
                        cand_track["monitoring_status"] = "PRESENT"

                    cand_track["missing_alert_sent"] = False
                    cand_track["missing_duration_sec"] = 0
            else:
                # Not detected in this frame:
                # If they were attempting to verify return (< 5s), cancel and continue absence
                if cand_track.get("return_start_dt") is not None:
                    cand_track["return_start_dt"] = None
                    cand_track["return_start_iso"] = None
                    cand_track["return_start_time"] = None
                    cand_track["is_verifying_return"] = False
                    cand_track["stable_seen_sec"] = 0

                last_seen_dt = cand_track.get("last_seen_dt", now)
                elapsed_sec = max(0.0, (now - last_seen_dt).total_seconds())
                cand_track["missing_duration_sec"] = round(elapsed_sec, 1)

                has_arrived_before = cand_track.get("has_been_seen_at_desk", False)
                active_threshold = absence_threshold if has_arrived_before else gate_arrival_threshold

                if elapsed_sec > active_threshold:
                    cand_track["monitoring_status"] = "MISSING"
                    if not has_arrived_before:
                        cand_track["posture_label"] = f"Delayed Desk Arrival ({int(elapsed_sec // 60)}m {int(elapsed_sec % 60)}s)"
                    else:
                        cand_track["posture_label"] = f"Missing from Seat ({int(elapsed_sec)}s)"

                    # Start or update ongoing absence record
                    if not cand_track.get("current_open_absence"):
                        out_t = cand_track.get("last_seen_time", now_time)
                        out_i = cand_track.get("last_seen_iso", now_iso)
                        dur_s = int(elapsed_sec)
                        new_ev = {
                            "event_id": str(uuid.uuid4())[:8],
                            "out_time": out_t,
                            "out_iso": out_i,
                            "return_time": None,
                            "return_iso": None,
                            "duration_sec": dur_s,
                            "duration_formatted": f"{dur_s // 60}m {dur_s % 60}s" if dur_s >= 60 else f"{dur_s}s",
                            "status": "AWAY",
                            "seat_number": cand_track.get("seat_number", "Seat A-01"),
                            "reason": "Delayed arrival at desk after gate entry" if not has_arrived_before else "Left desk during exam"
                        }
                        cand_track["current_open_absence"] = new_ev
                        cand_track["movement_history"].append(new_ev)
                        cand_track["missing_events_count"] = len(cand_track["movement_history"])
                    else:
                        open_ev = cand_track["current_open_absence"]
                        open_ev["duration_sec"] = int(elapsed_sec)
                        dur_s = int(elapsed_sec)
                        open_ev["duration_formatted"] = f"{dur_s // 60}m {dur_s % 60}s" if dur_s >= 60 else f"{dur_s}s"

                    if not cand_track.get("missing_alert_sent"):
                        cand_track["missing_alert_sent"] = True
                        if not has_arrived_before:
                            note_text = f"🚨 DELAYED DESK ARRIVAL: Candidate {cand_track['name']} (Roll: {cand_track['roll_id']}) checked in at gate ({cand_track.get('entry_time')}) but has not arrived at seat {cand_track['seat_number']} after {int(elapsed_sec // 60)}m {int(elapsed_sec % 60)}s."
                        else:
                            note_text = f"🚨 UNAUTHORIZED ABSENCE: Candidate {cand_track['name']} (Roll: {cand_track['roll_id']}) is missing from seat {cand_track['seat_number']} for over {int(elapsed_sec)}s."

                        alert_item = self.log_proxy_alert(
                            snapshot_bytes=snapshot_bytes,
                            confidence=0.95,
                            notes=note_text
                        )
                        new_alerts.append({
                            "type": "MISSING_CANDIDATE",
                            "candidate_id": cand_id,
                            "name": cand_track["name"],
                            "seat": cand_track["seat_number"],
                            "message": note_text,
                            "alert_id": alert_item.get("id")
                        })
                elif elapsed_sec > grace_period and has_arrived_before:
                    cand_track["monitoring_status"] = "GRACE_PERIOD"
                    cand_track["posture_label"] = f"Away / Unfocused ({int(elapsed_sec)}s)"

            # Sync movement history to persistent attendance dictionary
            if day_key in self.attendance and cand_id in self.attendance[day_key]:
                self.attendance[day_key][cand_id]["movement_history"] = cand_track["movement_history"]

        # Save synced movement records
        if session["total_frames"] % 8 == 0:
            self._save_attendance()

        # Build active hall presence roster summary
        roster = []
        present_count = 0
        writing_count = 0
        missing_count = 0
        washroom_count = 0

        for cand_id, cand_track in session["candidates"].items():
            st = cand_track["monitoring_status"]
            if st == "PRESENT":
                present_count += 1
            elif st == "WRITING":
                writing_count += 1
                present_count += 1
            elif st == "MISSING":
                missing_count += 1
            elif st == "WASHROOM":
                washroom_count += 1

            total_c = max(1, cand_track["total_checks"])
            seen_c = cand_track["seen_checks"]
            writing_c = cand_track["writing_checks"]
            presence_pct = round((seen_c / total_c) * 100, 1)
            writing_pct = round((writing_c / max(1, seen_c)) * 100, 1) if seen_c > 0 else 0.0

            movements = cand_track.get("movement_history", [])
            total_away_sec = sum(e.get("duration_sec", 0) for e in movements)

            roster.append({
                "candidate_id": cand_id,
                "name": cand_track["name"],
                "roll_id": cand_track["roll_id"],
                "department": cand_track["department"],
                "seat_number": cand_track["seat_number"],
                "room_name": cand_track["room_name"],
                "monitoring_status": cand_track["monitoring_status"],
                "posture": cand_track["posture"],
                "posture_label": cand_track["posture_label"],
                "is_writing": cand_track["is_writing"],
                "is_verifying_return": cand_track.get("is_verifying_return", False),
                "stable_seen_sec": cand_track.get("stable_seen_sec", 0),
                "last_seen_time": cand_track["last_seen_time"],
                "last_seen_seconds_ago": int(cand_track.get("missing_duration_sec", 0)),
                "presence_percent": presence_pct,
                "writing_percent": writing_pct,
                "missing_events_count": len(movements),
                "total_away_seconds": total_away_sec,
                "movement_history": movements,
                "is_currently_away": cand_track.get("current_open_absence") is not None
            })

        status_priority = {"MISSING": 0, "RETURNING": 0.5, "GRACE_PERIOD": 1, "WRITING": 2, "PRESENT": 3, "WASHROOM": 4, "EXITED": 5}
        roster.sort(key=lambda x: status_priority.get(x["monitoring_status"], 9))

        return {
            "success": True,
            "room_id": room_key,
            "total_candidates_inside": len(session["candidates"]),
            "present_active_count": present_count,
            "writing_head_down_count": writing_count,
            "missing_count": missing_count,
            "in_washroom_count": washroom_count,
            "unrecognized_faces_in_frame": unrecognized_count,
            "roster": roster,
            "new_alerts": new_alerts,
            "config": self.monitoring_config
        }

    def get_continuous_monitoring_status(self, active_room_id: Optional[str] = None) -> Dict[str, Any]:
        room_key = active_room_id or "default-hall"
        if room_key not in self.monitoring_sessions:
            return {
                "success": True,
                "room_id": room_key,
                "total_candidates_inside": 0,
                "present_active_count": 0,
                "writing_head_down_count": 0,
                "missing_count": 0,
                "in_washroom_count": 0,
                "unrecognized_faces_in_frame": 0,
                "roster": [],
                "new_alerts": [],
                "config": self.monitoring_config
            }

        return self.update_continuous_presence(active_room_id=active_room_id, detected_faces=[])

    # =============================================================
    # 8. Classroom Surveillance & Live Course Attendance Tracking
    # =============================================================
    def update_classroom_surveillance(
        self,
        room_id: str,
        department: str,
        course_code: str,
        course_name: str,
        detected_faces: List[Dict[str, Any]],
        absence_threshold_sec: int = 15,
        day: Optional[str] = None,
        time_slot: Optional[str] = None
    ) -> Dict[str, Any]:
        now = datetime.now()
        now_iso = now.isoformat()
        now_time = now.strftime("%I:%M:%S %p")
        day_key = self._get_today_key()

        sess_key = f"class_{room_id}_{course_code}_{day_key}"
        if sess_key not in self.classroom_sessions:
            self.classroom_sessions[sess_key] = {
                "room_id": room_id,
                "department": department,
                "course_code": course_code,
                "course_name": course_name,
                "day": day or "Sunday",
                "time_slot": time_slot or "09:00 - 09:50",
                "created_at": now_iso,
                "candidates": {},
                "event_logs": []
            }

        sess = self.classroom_sessions[sess_key]

        # 1. Resolve enrolled candidates for this specific course
        enrolled_ids = []
        for d in self.departments:
            if d.get("name") == department or department == "ALL":
                for c in d.get("courses", []):
                    if c.get("code") == course_code:
                        enrolled_ids = c.get("enrolled_student_ids", [])
                        break

        # If no explicit enrollment list, fallback to all users in the department
        if not enrolled_ids:
            all_users = self.get_users()
            enrolled_ids = [
                u["id"] for u in all_users
                if (u.get("department") == department or department == "ALL")
            ]

        # Initialize candidates in session if not yet present
        for u_id in enrolled_ids:
            user_obj = self.get_user(u_id)
            if not user_obj:
                continue
            if u_id not in sess["candidates"]:
                sess["candidates"][u_id] = {
                    "id": u_id,
                    "name": user_obj.get("name", "Student"),
                    "roll_id": user_obj.get("roll_id", "N/A"),
                    "department": user_obj.get("department", department),
                    "status": "ABSENT",  # "PRESENT", "STEPPED_OUT", "ABSENT"
                    "first_detected_at": None,
                    "first_detected_time": None,
                    "last_seen_at": None,
                    "last_seen_time": None,
                    "last_seen_timestamp": 0,
                    "in_class_seconds": 0,
                    "stepped_out_at": None,
                    "stepped_out_time": None,
                    "stepped_out_duration_sec": 0,
                    "movement_history": []
                }

        # 2. Process detected faces in this frame
        new_events = []
        seen_user_ids = set()
        guest_faces = []

        for face in detected_faces:
            if face.get("is_recognized") and face.get("user_id") and face.get("confidence_percent", 0) >= 80.0:
                u_id = face["user_id"]
                seen_user_ids.add(u_id)

                if u_id in sess["candidates"]:
                    c_data = sess["candidates"][u_id]
                    old_status = c_data.get("status", "ABSENT")

                    # Case 1: First time detected in this class session (Requires 5-second hold before entry is confirmed)
                    if not c_data.get("first_detected_at"):
                        if c_data.get("entry_start_dt") is None:
                            c_data["entry_start_dt"] = now
                            c_data["is_verifying_entry"] = True

                        hold_sec = max(0.0, (now - c_data["entry_start_dt"]).total_seconds())

                        if hold_sec < 5.0:
                            # In 5-second entry debounce hold
                            c_data["status"] = "VERIFYING_ENTRY"
                            c_data["hold_progress"] = round(hold_sec, 1)
                            c_data["posture_label"] = f"🟢 Verifying Entry ({int(hold_sec)}s/5s)"
                            face["classroom_status"] = "VERIFYING_ENTRY"
                            face["is_enrolled"] = True
                        else:
                            # 5-second continuous presence confirmed! Mark entry attendance
                            c_data["first_detected_at"] = now_iso
                            c_data["first_detected_time"] = now_time
                            c_data["entry_start_dt"] = None
                            c_data["is_verifying_entry"] = False
                            c_data["status"] = "PRESENT"
                            c_data["posture_label"] = "Present in Class"
                            c_data["last_seen_at"] = now_iso
                            c_data["last_seen_time"] = now_time
                            c_data["last_seen_timestamp"] = now.timestamp()
                            c_data["stepped_out_at"] = None
                            c_data["stepped_out_duration_sec"] = 0
                            c_data["in_class_seconds"] = 5

                            ev = {
                                "id": f"ev-{uuid.uuid4().hex[:8]}",
                                "candidate_id": u_id,
                                "name": c_data["name"],
                                "event": "CLASS_ENTRY",
                                "time": now_time,
                                "timestamp": now_iso,
                                "label": f"{c_data['name']} entered classroom (5s Verified Attendance)",
                                "type": "entry"
                            }
                            c_data["movement_history"].append(ev)
                            sess["event_logs"].insert(0, ev)
                            new_events.append(ev)

                            face["classroom_status"] = "PRESENT"
                            face["is_enrolled"] = True

                    # Case 2: Student was STEPPED_OUT and is now returning (Requires 5-second hold before return confirmed)
                    elif old_status in ["STEPPED_OUT", "VERIFYING_RETURN"]:
                        if c_data.get("return_start_dt") is None:
                            c_data["return_start_dt"] = now
                            c_data["is_verifying_return"] = True

                        hold_sec = max(0.0, (now - c_data["return_start_dt"]).total_seconds())

                        if hold_sec < 5.0:
                            # In 5-second return debounce hold
                            c_data["status"] = "VERIFYING_RETURN"
                            c_data["hold_progress"] = round(hold_sec, 1)
                            c_data["posture_label"] = f"🟢 Verifying Return ({int(hold_sec)}s/5s)"
                            face["classroom_status"] = "VERIFYING_RETURN"
                            face["is_enrolled"] = True
                        else:
                            # 5-second continuous return confirmed!
                            away_sec = c_data.get("stepped_out_duration_sec", 0)
                            c_data["status"] = "PRESENT"
                            c_data["return_start_dt"] = None
                            c_data["is_verifying_return"] = False
                            c_data["posture_label"] = "Present in Class"
                            c_data["last_seen_at"] = now_iso
                            c_data["last_seen_time"] = now_time
                            c_data["last_seen_timestamp"] = now.timestamp()
                            c_data["stepped_out_at"] = None
                            c_data["stepped_out_duration_sec"] = 0

                            ev = {
                                "id": f"ev-{uuid.uuid4().hex[:8]}",
                                "candidate_id": u_id,
                                "name": c_data["name"],
                                "event": "RETURNED",
                                "time": now_time,
                                "timestamp": now_iso,
                                "label": f"{c_data['name']} returned to class seat (Absent for {away_sec}s)",
                                "type": "return"
                            }
                            c_data["movement_history"].append(ev)
                            sess["event_logs"].insert(0, ev)
                            new_events.append(ev)

                            face["classroom_status"] = "PRESENT"
                            face["is_enrolled"] = True

                    # Case 3: Student already PRESENT
                    else:
                        c_data["status"] = "PRESENT"
                        c_data["last_seen_at"] = now_iso
                        c_data["last_seen_time"] = now_time
                        c_data["last_seen_timestamp"] = now.timestamp()
                        c_data["stepped_out_at"] = None
                        c_data["stepped_out_duration_sec"] = 0
                        c_data["entry_start_dt"] = None
                        c_data["return_start_dt"] = None
                        c_data["is_verifying_entry"] = False
                        c_data["is_verifying_return"] = False
                        c_data["in_class_seconds"] = int(now.timestamp() - datetime.fromisoformat(c_data["first_detected_at"]).timestamp()) if c_data.get("first_detected_at") else 0

                        face["classroom_status"] = "PRESENT"
                        face["is_enrolled"] = True
                else:
                    other_u = self.get_user(u_id)
                    cand_name = other_u.get("name", "Guest Student") if other_u else "Guest Student"
                    face["classroom_status"] = "GUEST_STUDENT"
                    face["is_enrolled"] = False
                    guest_faces.append({"user_id": u_id, "name": cand_name, "status": "GUEST"})
            else:
                face["classroom_status"] = "UNKNOWN"
                face["is_enrolled"] = False

        # 3. Check for students who stepped out or left camera (with 5-second hold debounce)
        for u_id, c_data in sess["candidates"].items():
            if u_id not in seen_user_ids:
                # Cancel unconfirmed entry if face left before completing 5s
                if c_data.get("entry_start_dt") is not None:
                    c_data["entry_start_dt"] = None
                    c_data["is_verifying_entry"] = False
                    c_data["status"] = "ABSENT"
                    c_data["posture_label"] = "Absent"

                # Cancel unconfirmed return if face left before completing 5s
                if c_data.get("return_start_dt") is not None:
                    c_data["return_start_dt"] = None
                    c_data["is_verifying_return"] = False
                    c_data["status"] = "STEPPED_OUT"
                    c_data["posture_label"] = f"Stepped Out ({c_data.get('stepped_out_duration_sec', 0)}s)"

                if c_data.get("first_detected_at"):
                    last_seen_ts = c_data.get("last_seen_timestamp", 0)
                    elapsed = now.timestamp() - last_seen_ts

                    # 5-second hold / debounce: wait 5 seconds before triggering STEPPED_OUT
                    if elapsed >= 5.0:
                        if c_data["status"] == "PRESENT":
                            c_data["status"] = "STEPPED_OUT"
                            c_data["stepped_out_at"] = now_iso
                            c_data["stepped_out_time"] = now_time
                            ev = {
                                "id": f"ev-{uuid.uuid4().hex[:8]}",
                                "candidate_id": u_id,
                                "name": c_data["name"],
                                "event": "STEPPED_OUT",
                                "time": now_time,
                                "timestamp": now_iso,
                                "label": f"{c_data['name']} stepped out / left classroom view ({int(elapsed)}s)",
                                "type": "out"
                            }
                            c_data["movement_history"].append(ev)
                            sess["event_logs"].insert(0, ev)
                            new_events.append(ev)

                        c_data["stepped_out_duration_sec"] = int(elapsed)
                        c_data["posture_label"] = f"Stepped Out ({int(elapsed)}s)"

        # 4. Summarize session
        present_count = sum(1 for c in sess["candidates"].values() if c["status"] == "PRESENT")
        stepped_out_count = sum(1 for c in sess["candidates"].values() if c["status"] == "STEPPED_OUT")
        absent_count = sum(1 for c in sess["candidates"].values() if c["status"] == "ABSENT")

        roster = list(sess["candidates"].values())
        status_rank = {"PRESENT": 0, "STEPPED_OUT": 1, "ABSENT": 2}
        roster.sort(key=lambda x: (status_rank.get(x["status"], 3), x.get("name", "")))

        # Keep event logs capped at 100
        sess["event_logs"] = sess["event_logs"][:100]

        # Save session to persistent JSON storage
        self._save_classroom_sessions()

        return {
            "success": True,
            "session_key": sess_key,
            "room_id": room_id,
            "department": department,
            "course_code": course_code,
            "course_name": course_name,
            "time_slot": time_slot or "09:00 - 09:50",
            "total_enrolled": len(sess["candidates"]),
            "present_count": present_count,
            "stepped_out_count": stepped_out_count,
            "absent_count": absent_count,
            "guest_count": len(guest_faces),
            "unregistered_faces_in_frame": sum(1 for f in detected_faces if not f.get("is_recognized")),
            "roster": roster,
            "event_logs": sess["event_logs"],
            "new_events": new_events,
            "guest_faces": guest_faces
        }

    def get_classroom_session_status(self, room_id: str, course_code: str) -> Dict[str, Any]:
        day_key = self._get_today_key()
        sess_key = f"class_{room_id}_{course_code}_{day_key}"
        if sess_key not in self.classroom_sessions:
            return {
                "success": True,
                "is_active": False,
                "room_id": room_id,
                "course_code": course_code,
                "total_enrolled": 0,
                "present_count": 0,
                "stepped_out_count": 0,
                "absent_count": 0,
                "roster": [],
                "event_logs": []
            }
        sess = self.classroom_sessions[sess_key]
        roster = list(sess["candidates"].values())
        status_rank = {"PRESENT": 0, "STEPPED_OUT": 1, "ABSENT": 2}
        roster.sort(key=lambda x: (status_rank.get(x["status"], 3), x.get("name", "")))
        return {
            "success": True,
            "is_active": True,
            "room_id": room_id,
            "department": sess.get("department", ""),
            "course_code": course_code,
            "course_name": sess.get("course_name", ""),
            "time_slot": sess.get("time_slot", ""),
            "total_enrolled": len(sess["candidates"]),
            "present_count": sum(1 for c in roster if c["status"] == "PRESENT"),
            "stepped_out_count": sum(1 for c in roster if c["status"] == "STEPPED_OUT"),
            "absent_count": sum(1 for c in roster if c["status"] == "ABSENT"),
            "roster": roster,
            "event_logs": sess.get("event_logs", [])
        }

    def reset_classroom_session(self, room_id: str, course_code: str) -> bool:
        day_key = self._get_today_key()
        sess_key = f"class_{room_id}_{course_code}_{day_key}"
        if sess_key in self.classroom_sessions:
            del self.classroom_sessions[sess_key]
            self._save_classroom_sessions()
        return True

    def get_classroom_attendance(
        self,
        date_str: Optional[str] = None,
        room_id: Optional[str] = None,
        course_code: Optional[str] = None,
        min_duration_mins: int = 30
    ) -> Dict[str, Any]:
        """
        Retrieves all classroom attendance sessions for a specific date and room.
        Matches against scheduled class routines and active/past sessions.
        Applies min_duration_mins threshold (default 30 mins) for attendance qualification.
        """
        if not date_str:
            date_str = self._get_today_key()

        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            weekday = dt.strftime("%A")
        except Exception:
            weekday = "Sunday"

        # 1. Fetch class routines for this day and room
        routines = self.get_class_routines(room_id=room_id, day=weekday)
        routines.sort(key=lambda x: x.get("start_time") or x.get("time_slot", ""))

        classes_data = []
        total_enrolled_sum = 0
        present_sum = 0
        stepped_out_sum = 0
        absent_sum = 0
        processed_session_keys = set()
        min_sec = int(min_duration_mins * 60)

        for rt in routines:
            c_code = rt.get("course_code")
            r_id = rt.get("room_id")
            slot = rt.get("time_slot")

            if rt.get("is_gap") or not c_code or c_code == "GAP":
                classes_data.append({
                    "is_gap": True,
                    "time_slot": slot,
                    "title": rt.get("course_name") or "Recess / Break",
                    "room_id": r_id,
                    "room_name": self.get_room(r_id)["name"] if self.get_room(r_id) else r_id,
                    "remarks": rt.get("remarks", "Break")
                })
                continue

            if course_code and c_code != course_code:
                continue

            sess_key = f"class_{r_id}_{c_code}_{date_str}"
            processed_session_keys.add(sess_key)

            if sess_key in self.classroom_sessions:
                sess = self.classroom_sessions[sess_key]
                roster = list(sess.get("candidates", {}).values())
                event_logs = sess.get("event_logs", [])
            else:
                # Build default roster from enrolled students or all eligible students
                roster = []
                enrolled_ids = []
                for d in self.departments:
                    for c in d.get("courses", []):
                        if c.get("code") == c_code:
                            enrolled_ids = c.get("enrolled_student_ids", [])
                            break

                if not enrolled_ids:
                    for u in self.get_users():
                        if not rt.get("department") or self._is_dept_match(u.get("department", ""), [rt.get("department")]):
                            enrolled_ids.append(u["id"])

                for u_id in enrolled_ids:
                    u = self.get_user(u_id)
                    if u:
                        first_img = list(u.get("images", {}).values())[0] if u.get("images") else None
                        roster.append({
                            "candidate_id": u["id"],
                            "name": u["name"],
                            "roll_id": u.get("roll_id", "N/A"),
                            "department": u.get("department", rt.get("department", "")),
                            "avatar": f"/api/{first_img}" if first_img else None,
                            "status": "ABSENT",
                            "entry_time": "-",
                            "first_detected_at": None,
                            "first_detected_time": None,
                            "last_seen_time": "-",
                            "in_class_seconds": 0,
                            "in_class_formatted": "0m",
                            "stepped_out_count": 0,
                            "stepped_out_duration_sec": 0,
                            "away_formatted": "0s",
                            "movement_history": []
                        })
                event_logs = []

            # Format in-class duration, qualification, & away duration
            for item in roster:
                sec = item.get("in_class_seconds", 0)
                item["in_class_formatted"] = f"{int(sec // 60)}m {int(sec % 60)}s" if sec >= 60 else f"{sec}s"
                away_sec = item.get("stepped_out_duration_sec", 0)
                item["away_formatted"] = f"{int(away_sec // 60)}m {int(away_sec % 60)}s" if away_sec >= 60 else f"{away_sec}s"
                
                is_qualified = sec >= min_sec
                item["is_qualified"] = is_qualified
                item["min_duration_mins"] = min_duration_mins
                if item.get("status") in ["PRESENT", "STEPPED_OUT"] and not is_qualified:
                    item["qualified_status"] = f"ABSENT (<{min_duration_mins}m)"
                else:
                    item["qualified_status"] = item.get("status", "ABSENT")

            # Presence counts considering 30-min minimum attendance rule
            p_cnt = sum(1 for c in roster if c.get("status") in ["PRESENT", "STEPPED_OUT"] and c.get("in_class_seconds", 0) >= min_sec)
            s_cnt = sum(1 for c in roster if c.get("status") == "STEPPED_OUT")
            a_cnt = sum(1 for c in roster if c.get("status") == "ABSENT" or c.get("in_class_seconds", 0) < min_sec)
            total_enrolled_sum += len(roster)
            present_sum += p_cnt
            stepped_out_sum += s_cnt
            absent_sum += a_cnt

            status_rank = {"PRESENT": 0, "STEPPED_OUT": 1, "ABSENT": 2}
            roster.sort(key=lambda x: (status_rank.get(x.get("status", "ABSENT"), 3), x.get("name", "")))

            room_obj = self.get_room(r_id)

            classes_data.append({
                "is_gap": False,
                "session_key": sess_key,
                "room_id": r_id,
                "room_name": room_obj["name"] if room_obj else r_id,
                "department": rt.get("department", "CSE"),
                "course_code": c_code,
                "course_name": rt.get("course_name", "Academic Class"),
                "instructor": rt.get("instructor", "Faculty"),
                "section": rt.get("section", "A"),
                "semester": rt.get("semester", "Spring 2026"),
                "time_slot": slot,
                "start_time": rt.get("start_time", ""),
                "end_time": rt.get("end_time", ""),
                "min_duration_mins": min_duration_mins,
                "total_enrolled": len(roster),
                "present_count": p_cnt,
                "stepped_out_count": s_cnt,
                "absent_count": a_cnt,
                "roster": roster,
                "event_logs": event_logs
            })

        # Also add standalone recorded sessions for that date
        for sess_key, sess in self.classroom_sessions.items():
            if sess_key not in processed_session_keys and date_str in sess_key:
                r_id = sess.get("room_id")
                if room_id and r_id != room_id:
                    continue
                roster = list(sess.get("candidates", {}).values())
                for item in roster:
                    sec = item.get("in_class_seconds", 0)
                    item["in_class_formatted"] = f"{int(sec // 60)}m {int(sec % 60)}s" if sec >= 60 else f"{sec}s"
                    away_sec = item.get("stepped_out_duration_sec", 0)
                    item["away_formatted"] = f"{int(away_sec // 60)}m {int(away_sec % 60)}s" if away_sec >= 60 else f"{away_sec}s"
                    is_qualified = sec >= min_sec
                    item["is_qualified"] = is_qualified
                    item["min_duration_mins"] = min_duration_mins
                    if item.get("status") in ["PRESENT", "STEPPED_OUT"] and not is_qualified:
                        item["qualified_status"] = f"ABSENT (<{min_duration_mins}m)"
                    else:
                        item["qualified_status"] = item.get("status", "ABSENT")

                p_cnt = sum(1 for c in roster if c.get("status") in ["PRESENT", "STEPPED_OUT"] and c.get("in_class_seconds", 0) >= min_sec)
                s_cnt = sum(1 for c in roster if c.get("status") == "STEPPED_OUT")
                a_cnt = sum(1 for c in roster if c.get("status") == "ABSENT" or c.get("in_class_seconds", 0) < min_sec)
                total_enrolled_sum += len(roster)
                present_sum += p_cnt
                stepped_out_sum += s_cnt
                absent_sum += a_cnt

                room_obj = self.get_room(r_id)
                classes_data.append({
                    "is_gap": False,
                    "session_key": sess_key,
                    "room_id": r_id,
                    "room_name": room_obj["name"] if room_obj else r_id,
                    "department": sess.get("department", "CSE"),
                    "course_code": sess.get("course_code", "Special Class"),
                    "course_name": sess.get("course_name", "Class Session"),
                    "instructor": "Faculty",
                    "section": "A",
                    "semester": "Spring 2026",
                    "time_slot": sess.get("time_slot", "09:00 - 09:50"),
                    "min_duration_mins": min_duration_mins,
                    "total_enrolled": len(roster),
                    "present_count": p_cnt,
                    "stepped_out_count": s_cnt,
                    "absent_count": a_cnt,
                    "roster": roster,
                    "event_logs": sess.get("event_logs", [])
                })

        return {
            "date": date_str,
            "day": weekday,
            "room_id": room_id,
            "min_duration_mins": min_duration_mins,
            "total_classes": sum(1 for c in classes_data if not c.get("is_gap")),
            "total_enrolled": total_enrolled_sum,
            "present_count": present_sum,
            "stepped_out_count": stepped_out_sum,
            "absent_count": absent_sum,
            "classes": classes_data
        }

    def get_student_history(self, candidate_id: str) -> Dict[str, Any]:
        """
        Retrieves a comprehensive multi-day attendance and AI movement history profile
        for a student across both Classroom sessions and Exam Hall sessions.
        """
        user = self.get_user(candidate_id)
        if not user:
            raise ValueError("Student / Candidate profile not found")

        first_img = list(user.get("images", {}).values())[0] if user.get("images") else None
        alloc = self.get_candidate_allocation(candidate_id)

        # 1. Gather Exam Hall Attendance & Surveillance Records
        exam_history = []
        for date_key, day_sheet in sorted(self.attendance.items(), reverse=True):
            if candidate_id in day_sheet:
                rec = day_sheet[candidate_id]
                exam_history.append({
                    "date": date_key,
                    "session_type": "EXAM_HALL",
                    "title": rec.get("exam_name") or "Semester Examination",
                    "room_id": rec.get("room_id", ""),
                    "room_name": rec.get("room_name") or rec.get("hall_name") or "Main Exam Hall",
                    "seat_number": rec.get("seat_number", "Seat A-01"),
                    "status": rec.get("status", "ABSENT"),
                    "entry_time": rec.get("entry_time") or "-",
                    "exit_time": rec.get("exit_time") or "-",
                    "duration_minutes": rec.get("duration_minutes"),
                    "washroom_count": rec.get("washroom_count", 0),
                    "total_washroom_minutes": rec.get("total_washroom_minutes", 0),
                    "movement_history": rec.get("movement_history", []),
                    "washroom_logs": rec.get("washroom_logs", []),
                    "entry_snapshot": rec.get("entry_snapshot"),
                    "exit_snapshot": rec.get("exit_snapshot"),
                    "signature_snapshot": rec.get("signature_snapshot")
                })

        # 2. Gather Classroom Surveillance Records across all sessions
        classroom_history = []
        for sess_key, sess in sorted(self.classroom_sessions.items(), reverse=True):
            parts = sess_key.split("_")
            date_key = parts[-1] if len(parts) >= 4 else sess.get("created_at", "")[:10]
            candidates = sess.get("candidates", {})

            if candidate_id in candidates:
                c_data = candidates[candidate_id]
                in_class_sec = c_data.get("in_class_seconds", 0)
                in_class_mins = round(in_class_sec / 60.0, 1) if in_class_sec else 0

                if in_class_sec >= 60:
                    in_class_formatted = f"{int(in_class_sec // 60)}m {int(in_class_sec % 60)}s"
                else:
                    in_class_formatted = f"{in_class_sec}s"

                movements = c_data.get("movement_history", [])
                stepped_out_count = sum(1 for m in movements if m.get("event") == "STEPPED_OUT" or m.get("type") == "out")

                total_away_sec = sum(
                    int(m.get("duration_sec", 0))
                    for m in movements
                    if "duration_sec" in m
                )
                if total_away_sec == 0 and c_data.get("stepped_out_duration_sec"):
                    total_away_sec = c_data.get("stepped_out_duration_sec", 0)

                away_formatted = f"{int(total_away_sec // 60)}m {int(total_away_sec % 60)}s" if total_away_sec >= 60 else f"{total_away_sec}s"

                classroom_history.append({
                    "session_key": sess_key,
                    "date": date_key,
                    "day": sess.get("day", ""),
                    "session_type": "CLASSROOM",
                    "room_id": sess.get("room_id", ""),
                    "room_name": self.get_room(sess.get("room_id", ""))["name"] if self.get_room(sess.get("room_id", "")) else sess.get("room_id", ""),
                    "course_code": sess.get("course_code", ""),
                    "course_name": sess.get("course_name", ""),
                    "time_slot": sess.get("time_slot", ""),
                    "department": sess.get("department", ""),
                    "status": c_data.get("status", "ABSENT"),
                    "first_detected_time": c_data.get("first_detected_time") or c_data.get("entry_time") or "-",
                    "last_seen_time": c_data.get("last_seen_time") or "-",
                    "in_class_seconds": in_class_sec,
                    "in_class_minutes": in_class_mins,
                    "in_class_formatted": in_class_formatted,
                    "stepped_out_count": stepped_out_count,
                    "total_away_seconds": total_away_sec,
                    "away_formatted": away_formatted,
                    "movement_history": movements
                })

        # 3. Overall Statistics Calculation
        total_class_sessions = len(classroom_history)
        classes_present = sum(1 for c in classroom_history if c["status"] in ["PRESENT", "STEPPED_OUT"])
        classes_absent = sum(1 for c in classroom_history if c["status"] == "ABSENT")
        class_attendance_rate = round((classes_present / total_class_sessions * 100), 1) if total_class_sessions > 0 else 100.0

        total_exams = len(exam_history)
        exams_attended = sum(1 for e in exam_history if e["status"] in ["INSIDE", "EXITED"])
        exam_attendance_rate = round((exams_attended / total_exams * 100), 1) if total_exams > 0 else 100.0

        total_in_class_sec = sum(c["in_class_seconds"] for c in classroom_history)
        total_class_hours = round(total_in_class_sec / 3600.0, 1)

        total_stepped_out = sum(c["stepped_out_count"] for c in classroom_history) + sum(len(e["movement_history"]) for e in exam_history)
        total_away_sec = sum(c["total_away_seconds"] for c in classroom_history) + sum(
            sum(int(m.get("duration_sec", 0)) for m in e.get("movement_history", []))
            for e in exam_history
        )
        total_away_formatted = f"{int(total_away_sec // 60)}m {int(total_away_sec % 60)}s" if total_away_sec >= 60 else f"{total_away_sec}s"

        return {
            "success": True,
            "student": {
                "id": user["id"],
                "name": user["name"],
                "roll_id": user.get("roll_id", "N/A"),
                "department": user.get("department", "General"),
                "photo": f"/api/{first_img}" if first_img else None,
                "allocated_room": alloc.get("room_name") if alloc else "Unassigned",
                "allocated_seat": alloc.get("seat_number") if alloc else "N/A"
            },
            "statistics": {
                "total_classroom_sessions": total_class_sessions,
                "classes_present": classes_present,
                "classes_absent": classes_absent,
                "classroom_attendance_rate": class_attendance_rate,
                "total_class_hours": total_class_hours,
                "total_class_minutes": round(total_in_class_sec / 60.0, 1),
                "total_exams": total_exams,
                "exams_attended": exams_attended,
                "exam_attendance_rate": exam_attendance_rate,
                "total_departures_count": total_stepped_out,
                "total_away_seconds": total_away_sec,
                "total_away_formatted": total_away_formatted
            },
            "classroom_history": classroom_history,
            "exam_history": exam_history
        }

db = FaceDatabase()

