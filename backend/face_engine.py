import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from .models_manager import FaceModelManager
from .database import FaceDatabase
from .posture_engine import PostureEngine

class FaceEngine:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FaceEngine, cls).__new__(cls)
            cls._instance._init_engine()
        return cls._instance

    def _init_engine(self):
        self.model_manager = FaceModelManager()
        self.db = FaceDatabase()
        self.posture_engine = PostureEngine()
        self.similarity_threshold = 0.363  # SFace default cosine distance threshold
        self.reload_cache()

    def reload_cache(self):
        """Pre-loads all registered user embeddings into memory for fast vector matching."""
        self.cached_users = self.db.load_all_embeddings()
        print(f"[+] Loaded {len(self.cached_users)} registered persons into FaceEngine cache.")

    def process_image_bytes(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """Converts raw image bytes to OpenCV BGR numpy array."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img

    def validate_and_extract_face(
        self,
        image: np.ndarray,
        min_confidence: float = 0.65
    ) -> Dict[str, Any]:
        """
        Validates that a single clear face is present and extracts its embedding.
        """
        faces = self.model_manager.detect_faces(image, score_threshold=min_confidence)
        
        if len(faces) == 0:
            return {
                "success": False,
                "message": "No face detected in frame. Please face the camera with good lighting.",
                "confidence": 0.0
            }
        
        if len(faces) > 1:
            # Check if one is significantly larger/clearer, else prompt single face
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        
        face = faces[0]
        conf = float(face[14])
        
        # Bounding box
        x, y, w, h = int(face[0]), int(face[1]), int(face[2]), int(face[3])
        
        # 5 Landmarks: right eye, left eye, nose tip, right mouth corner, left mouth corner
        landmarks = [[int(face[i]), int(face[i+1])] for i in range(4, 14, 2)]

        # Calculate posture metrics
        posture_info = self.posture_engine.calculate_posture([x, y, w, h], landmarks)

        # Align and extract feature
        aligned = self.model_manager.align_crop(image, face)
        embedding = self.model_manager.extract_feature(aligned)

        # Normalize embedding vector
        embedding = cv2.normalize(embedding, None, alpha=1, beta=0, norm_type=cv2.NORM_L2)

        return {
            "success": True,
            "message": "Face detected and validated successfully.",
            "embedding": embedding,
            "bbox": [x, y, w, h],
            "landmarks": landmarks,
            "posture": posture_info,
            "confidence": round(conf * 100, 1)
        }

    def recognize_frame(
        self,
        image: np.ndarray,
        threshold: Optional[float] = None,
        score_threshold: float = 0.45
    ) -> List[Dict[str, Any]]:
        """
        Detects, recognizes, and classifies postures for all faces in the provided frame.
        Includes head-down writing detection for exam hall monitoring.
        """
        if threshold is None:
            threshold = self.similarity_threshold

        faces = self.model_manager.detect_faces(image, score_threshold=score_threshold)
        results = []

        if len(faces) == 0:
            return results

        for face in faces:
            conf = float(face[14])
            x, y, w, h = int(face[0]), int(face[1]), int(face[2]), int(face[3])
            landmarks = [[int(face[i]), int(face[i+1])] for i in range(4, 14, 2)]

            # Analyze head pose and activity posture (Writing, Attentive, Looking away)
            posture_info = self.posture_engine.calculate_posture([x, y, w, h], landmarks)

            aligned = self.model_manager.align_crop(image, face)
            query_feat = self.model_manager.extract_feature(aligned)
            query_feat = cv2.normalize(query_feat, None, alpha=1, beta=0, norm_type=cv2.NORM_L2)

            best_match_user = None
            best_score = -1.0

            # Match against cached users
            for user in self.cached_users:
                # Compare against all angle embeddings saved for this user
                for emb in user["embeddings"]:
                    score = self.model_manager.compute_similarity(query_feat, emb)
                    if score > best_score:
                        best_score = score
                        best_match_user = user

            # Cosine similarity matching:
            # If head is down writing, slight angle variance is allowed (effective threshold = threshold - 0.03)
            effective_threshold = threshold - 0.03 if posture_info.get("is_writing") else threshold
            is_recognized = (best_match_user is not None) and (best_score >= effective_threshold)

            # Map raw score to human-readable confidence percentage
            if best_score <= 0.1:
                display_conf = max(5.0, round(best_score * 100, 1))
            elif best_score < threshold:
                display_conf = round(40.0 + ((best_score - 0.1) / (threshold - 0.1)) * 34.0, 1)
            else:
                display_conf = round(75.0 + min(24.9, ((best_score - threshold) / (1.0 - threshold)) * 25.0), 1)

            results.append({
                "bbox": [x, y, w, h],
                "landmarks": landmarks,
                "det_confidence": round(conf * 100, 1),
                "is_recognized": is_recognized,
                "user_id": best_match_user["user_id"] if is_recognized else None,
                "name": best_match_user["name"] if is_recognized else "Unknown",
                "roll_id": best_match_user.get("roll_id", "") if is_recognized else "",
                "department": best_match_user.get("department", "") if is_recognized else "",
                "similarity_score": round(float(best_score), 4),
                "confidence_percent": display_conf,
                "posture": posture_info["posture"],
                "posture_label": posture_info["label"],
                "is_writing": posture_info["is_writing"],
                "pitch_score": posture_info["pitch_score"],
                "yaw_score": posture_info["yaw_score"],
                "roll_deg": posture_info["roll_deg"]
            })

        return results

    def find_matching_registered_user(
        self,
        query_embedding: np.ndarray,
        threshold: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Checks if a given face embedding matches any user already registered in the system.
        Returns the matched user details if similarity >= threshold, else None.
        """
        if threshold is None:
            threshold = self.similarity_threshold

        best_match_user = None
        best_score = -1.0

        for user in self.cached_users:
            for emb in user["embeddings"]:
                score = self.model_manager.compute_similarity(query_embedding, emb)
                if score > best_score:
                    best_score = score
                    best_match_user = user

        if best_match_user is not None and best_score >= threshold:
            display_conf = round(75.0 + min(24.9, ((best_score - threshold) / (1.0 - threshold)) * 25.0), 1)
            return {
                "user_id": best_match_user["user_id"],
                "name": best_match_user["name"],
                "roll_id": best_match_user.get("roll_id", ""),
                "department": best_match_user.get("department", ""),
                "similarity_score": round(float(best_score), 4),
                "confidence_percent": display_conf
            }
        return None
