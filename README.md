# FaceVision AI - Real-Time Multi-Angle Face Detection & Recognition

A state-of-the-art, browser-based Face Detection and Face Recognition system utilizing your laptop/desktop webcam. Powered by **FastAPI** and **OpenCV DNN (YuNet CNN Detector + SFace 128D Deep Feature Recognizer)**.

---

## 🌟 Key Features

1. **📸 Multi-Angle Face Registration Studio**:
   - Guided step-by-step registration for **5 distinct face angles**:
     - **Frontal** (Straight)
     - **Turn Left** (~25°)
     - **Turn Right** (~25°)
     - **Tilt Up** (~15°)
     - **Tilt Down** (~15°)
   - Live face detection quality verification before capturing each angle.
   - Saves multi-vector embeddings so you are recognized accurately from any perspective.

2. **⚡ Real-Time Live Face Detection & Recognition**:
   - Ultra-low latency webcam processing.
   - Cyberpunk/Sci-Fi HUD Canvas overlay with glowing bounding boxes, facial landmark tracking, and match confidence percentages.
   - Text-to-Speech voice greeting (*"Welcome, [Name]!"*).
   - Real-time Detection Activity Feed with cropped facial snapshot thumbnails and timestamps.

3. **👥 Face Database Directory**:
   - Search and filter registered individuals by Name, Student/Employee ID, or Department.
   - View all registered angle photos in an interactive inspection gallery.
   - 1-Click deletion and database management.

4. **🚀 One-Click Launch**:
   - Auto-downloads required AI models on initial launch.
   - Double-click `start.bat` or run `python main.py` to automatically start the backend server and open your default browser.

---

## 🛠️ How to Run

### Method 1: Double-Click (Windows)
Simply double click the file:
```
start.bat
```

### Method 2: Command Line
```powershell
python main.py
```

Open your browser at: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## 📂 Project Structure

```
Face Detect/
├── backend/
│   ├── app.py              # FastAPI server, REST & WebSocket routes
│   ├── database.py         # JSON and vector embedding storage manager
│   ├── face_engine.py      # Face detection, embedding extraction & cosine matching
│   └── models_manager.py   # OpenCV YuNet & SFace ONNX downloader & loader
├── frontend/
│   ├── css/
│   │   └── styles.css      # Modern Glassmorphism/Cyber dark styling
│   ├── js/
│   │   └── app.js          # Webcam stream, canvas HUD, registration & DB logic
│   └── index.html          # Web UI interface
├── models/                 # OpenCV ONNX deep learning models (auto-downloaded)
├── data/
│   ├── faces/              # Stored face images and .npz embeddings per person
│   └── database.json       # User metadata database
├── main.py                 # Application launcher
├── start.bat               # Windows 1-click batch launcher
└── requirements.txt        # Python dependencies
```
