import os
import sys
import time
import webbrowser
import threading
import uvicorn

def open_browser():
    time.sleep(2.0)
    url = "http://localhost:3000"
    print(f"\n=======================================================")
    print(f"🚀 DigiHall AI is running at: {url}")
    print(f"🌐 Opening web browser automatically...")
    print(f"=======================================================\n")
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[-] Could not open browser automatically: {e}")

if __name__ == "__main__":
    project_dir = os.path.dirname(os.path.abspath(__file__))
    if project_dir not in sys.path:
        sys.path.insert(0, project_dir)

    print("\n-------------------------------------------------------")
    print("  🛡️  DigiHall - RFID & Face Attendance & Anti-Proxy System")
    print("-------------------------------------------------------")
    print("[*] Initializing AI Engine (OpenCV YuNet + SFace)...")

    # Start browser in separate daemon thread
    threading.Thread(target=open_browser, daemon=True).start()

    # Run Uvicorn server with auto-reload enabled
    uvicorn.run(
        "backend.app:app",
        host="127.0.0.1",
        port=8000,
        log_level="info",
        reload=True,
        reload_dirs=[os.path.join(project_dir, "backend")]
    )
