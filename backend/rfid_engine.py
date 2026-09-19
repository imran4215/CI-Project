import os
import time
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional
import serial
import serial.tools.list_ports

class RFIDEngine:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(RFIDEngine, cls).__new__(cls)
                cls._instance._init_engine()
            return cls._instance

    def _init_engine(self):
        self.com_port = os.getenv("RFID_COM_PORT", "COM3")
        self.baud_rate = int(os.getenv("RFID_BAUD_RATE", "9600"))
        self.serial_conn: Optional[serial.Serial] = None
        self.is_running = False
        self.thread: Optional[threading.Thread] = None
        self.latest_scan: Optional[Dict[str, Any]] = None
        self.recent_scans: List[Dict[str, Any]] = []
        self.last_seen_tag = ""
        self.last_seen_time = 0.0

        # Start background serial worker
        self.start()

    def list_ports(self) -> List[Dict[str, str]]:
        """Lists all physical/virtual COM ports available on the operating system."""
        ports = []
        try:
            for p in serial.tools.list_ports.comports():
                ports.append({
                    "port": p.device,
                    "description": p.description or p.device,
                    "hwid": p.hwid or ""
                })
        except Exception as e:
            print(f"[!] Error listing COM ports: {e}")
        return ports

    def start(self):
        """Starts the background serial listener thread."""
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._serial_worker, daemon=True)
        self.thread.start()

    def stop(self):
        """Stops the background serial listener."""
        self.is_running = False
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.close()
            except Exception:
                pass
        self.serial_conn = None

    def configure(self, port: str, baud_rate: int = 9600) -> Dict[str, Any]:
        """Changes COM port and reconnects."""
        self.com_port = port.strip()
        self.baud_rate = int(baud_rate)
        
        # Reset connection to force reconnect on new port
        if self.serial_conn and self.serial_conn.is_open:
            try:
                self.serial_conn.close()
            except Exception:
                pass
        self.serial_conn = None

        return {
            "success": True,
            "port": self.com_port,
            "baud_rate": self.baud_rate,
            "is_connected": self.is_connected()
        }

    def is_connected(self) -> bool:
        return self.serial_conn is not None and self.serial_conn.is_open

    def _parse_serial_line(self, line: str) -> Optional[str]:
        """Parses various Arduino / RFID reader serial output formats."""
        line = line.strip()
        if not line:
            return None

        # 1. "ATTENDANCE:0015122682"
        if line.startswith("ATTENDANCE:"):
            tag = line.split(":", 1)[1].strip()
            return tag if tag else None

        # 2. "RFID Tag:0015122682"
        if line.startswith("RFID Tag:"):
            tag = line.split(":", 1)[1].strip()
            return tag if tag else None

        # 3. "RFID scanned (DEC): 0015122682"
        if "RFID scanned (DEC):" in line:
            tag = line.split(":", 1)[1].strip()
            return tag if tag else None

        # 4. Pure 8-12 alphanumeric/decimal tag line e.g. "0015122682" or "E2000019"
        clean = line.replace(" ", "")
        if len(clean) >= 6 and len(clean) <= 16 and clean.isalnum():
            # Filter out known debug words
            if clean.lower() not in ["ready", "error", "bufferoverflow", "init", "rfid"]:
                return clean

        return None

    def _record_scan(self, tag: str, source: str = "hardware") -> Dict[str, Any]:
        now = datetime.now()
        scan_event = {
            "tag": tag.strip(),
            "timestamp": now.strftime("%I:%M:%S %p"),
            "iso": now.isoformat(),
            "source": source,
            "epoch": time.time()
        }

        self.latest_scan = scan_event
        self.recent_scans.insert(0, scan_event)
        if len(self.recent_scans) > 20:
            self.recent_scans = self.recent_scans[:20]

        print(f"[+] [RFID] Scanned Tag: {tag} (Source: {source}) at {scan_event['timestamp']}")
        return scan_event

    def manual_scan(self, tag: str) -> Dict[str, Any]:
        """Allows simulated or manual RFID tag scan from frontend / API."""
        if not tag or not tag.strip():
            raise ValueError("RFID tag cannot be empty")
        return self._record_scan(tag.strip(), source="manual")

    def get_latest_scan(self, max_age_seconds: Optional[float] = None) -> Optional[Dict[str, Any]]:
        """Returns the latest scanned RFID tag. If max_age_seconds is set, checks recency."""
        if not self.latest_scan:
            return None

        if max_age_seconds is not None:
            age = time.time() - self.latest_scan.get("epoch", 0.0)
            if age > max_age_seconds:
                return None

        return self.latest_scan

    def clear_latest_scan(self):
        """Clears the latest scan once consumed."""
        self.latest_scan = None

    def _serial_worker(self):
        """Background thread connecting and reading from serial port."""
        while self.is_running:
            if self.serial_conn is None or not self.serial_conn.is_open:
                try:
                    self.serial_conn = serial.Serial(self.com_port, self.baud_rate, timeout=1)
                    time.sleep(1.5) # Allow Arduino reset stabilization
                    print(f"[+] [RFID Engine] Connected to hardware RFID reader on {self.com_port} ({self.baud_rate} baud)")
                except Exception as e:
                    # Serial port not available; wait and retry quietly
                    self.serial_conn = None
                    time.sleep(2.0)
                    continue

            try:
                if self.serial_conn and self.serial_conn.in_waiting > 0:
                    raw_line = self.serial_conn.readline().decode("utf-8", errors="ignore").strip()
                    if raw_line:
                        tag = self._parse_serial_line(raw_line)
                        if tag:
                            now_t = time.time()
                            # Debounce rapid scans of same card within 1.0s
                            if tag != self.last_seen_tag or (now_t - self.last_seen_time) > 1.0:
                                self.last_seen_tag = tag
                                self.last_seen_time = now_t
                                self._record_scan(tag, source="hardware")
                else:
                    time.sleep(0.05)
            except Exception as e:
                print(f"[!] [RFID Engine] Serial read error on {self.com_port}: {e}")
                if self.serial_conn:
                    try:
                        self.serial_conn.close()
                    except Exception:
                        pass
                self.serial_conn = None
                time.sleep(1.0)
