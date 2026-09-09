import os
import urllib.request
import cv2
import numpy as np

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

YUNET_URLS = [
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "https://raw.githubusercontent.com/opencv/opencv_zoo/master/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "https://media.githubusercontent.com/media/opencv/opencv_zoo/master/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
]

SFACE_URLS = [
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
    "https://raw.githubusercontent.com/opencv/opencv_zoo/master/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
    "https://media.githubusercontent.com/media/opencv/opencv_zoo/master/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
]

YUNET_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

def download_file(urls, destination):
    if os.path.exists(destination) and os.path.getsize(destination) > 10000:
        return True
    
    print(f"[*] Downloading model to {destination}...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    for url in urls:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response, open(destination, 'wb') as out_file:
                out_file.write(response.read())
            if os.path.exists(destination) and os.path.getsize(destination) > 10000:
                print(f"[+] Successfully downloaded: {os.path.basename(destination)}")
                return True
        except Exception as e:
            print(f"[-] Failed from {url}: {e}")
            if os.path.exists(destination):
                try:
                    os.remove(destination)
                except Exception:
                    pass
    return False

class FaceModelManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceModelManager, cls).__new__(cls)
            cls._instance._init_models()
        return cls._instance

    def _init_models(self):
        # Ensure models exist
        if not os.path.exists(YUNET_PATH) or os.path.getsize(YUNET_PATH) < 10000:
            if not download_file(YUNET_URLS, YUNET_PATH):
                raise RuntimeError("Failed to download YuNet face detection model.")

        if not os.path.exists(SFACE_PATH) or os.path.getsize(SFACE_PATH) < 10000:
            if not download_file(SFACE_URLS, SFACE_PATH):
                raise RuntimeError("Failed to download SFace face recognition model.")

        # Default frame dimensions for YuNet
        self.detector_w = 640
        self.detector_h = 480
        
        # Initialize YuNet Face Detector
        # score_threshold=0.6, nms_threshold=0.3, top_k=5000
        self.detector = cv2.FaceDetectorYN.create(
            model=YUNET_PATH,
            config="",
            input_size=(self.detector_w, self.detector_h),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=5000
        )

        # Initialize SFace Face Recognizer
        self.recognizer = cv2.FaceRecognizerSF.create(
            model=SFACE_PATH,
            config="",
            backend_id=cv2.dnn.DNN_BACKEND_DEFAULT,
            target_id=cv2.dnn.DNN_TARGET_CPU
        )
        print("[+] YuNet & SFace models initialized successfully.")

    def set_input_size(self, width: int, height: int):
        if width != self.detector_w or height != self.detector_h:
            self.detector_w = width
            self.detector_h = height
            self.detector.setInputSize((width, height))

    def detect_faces(self, image: np.ndarray, score_threshold: float = 0.55):
        h, w = image.shape[:2]
        self.set_input_size(w, h)
        self.detector.setScoreThreshold(score_threshold)
        
        # Returns (status, faces) where each face has 15 elements:
        # [0..3]: x, y, w, h
        # [4..13]: 5 landmarks (x, y for right_eye, left_eye, nose_tip, right_mouth_corner, left_mouth_corner)
        # [14]: confidence score
        status, faces = self.detector.detect(image)
        if faces is None:
            return []
        return faces

    def align_crop(self, image: np.ndarray, face_info: np.ndarray) -> np.ndarray:
        aligned_face = self.recognizer.alignCrop(image, face_info)
        return aligned_face

    def extract_feature(self, aligned_face: np.ndarray) -> np.ndarray:
        feature = self.recognizer.feature(aligned_face)
        return feature

    def compute_similarity(self, feature1: np.ndarray, feature2: np.ndarray) -> float:
        # SFace cosine similarity matching rule: default threshold is ~0.363
        score = self.recognizer.match(feature1, feature2, cv2.FaceRecognizerSF_FR_COSINE)
        return float(score)
