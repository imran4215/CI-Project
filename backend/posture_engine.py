import math
from typing import Dict, Any, List, Tuple, Optional
import numpy as np

class PostureEngine:
    """
    Analyzes 5 facial landmarks from YuNet to estimate Head Pose (Pitch, Yaw, Roll)
    and determines student classroom/exam activity:
    - ✍️ WRITING (Head Down / Bowed towards desk)
    - 👀 ATTENTIVE (Looking straight / forward)
    - ↔️ LOOKING_AWAY (Head turned left/right)
    - ⬆️ LOOKING_UP (Head tilted up)
    """

    @staticmethod
    def calculate_posture(
        bbox: List[int],
        landmarks: List[List[int]]
    ) -> Dict[str, Any]:
        """
        landmarks: [[rx, ry], [lx, ly], [nx, ny], [rmx, rmy], [lmx, lmy]]
        (Right Eye, Left Eye, Nose Tip, Right Mouth Corner, Left Mouth Corner)
        """
        if not landmarks or len(landmarks) < 5:
            return {
                "posture": "UNKNOWN",
                "label": "Face Detected",
                "is_writing": False,
                "pitch_score": 0.0,
                "yaw_score": 0.0,
                "roll_deg": 0.0,
                "confidence": 0.5
            }

        rx, ry = landmarks[0]  # Right eye
        lx, ly = landmarks[1]  # Left eye
        nx, ny = landmarks[2]  # Nose tip
        rmx, rmy = landmarks[3]  # Right mouth
        lmx, lmy = landmarks[4]  # Left mouth

        x, y, w, h = bbox

        # 1. Roll angle (Tilt angle between eyes in degrees)
        dx = lx - rx
        dy = ly - ry
        roll_rad = math.atan2(dy, dx)
        roll_deg = math.degrees(roll_rad)

        # 2. Eye Midpoint and Mouth Midpoint
        eye_mid_x = (rx + lx) / 2.0
        eye_mid_y = (ry + ly) / 2.0
        mouth_mid_x = (rmx + lmx) / 2.0
        mouth_mid_y = (rmy + lmy) / 2.0

        eye_dist = max(1.0, math.hypot(dx, dy))
        mouth_dist = max(1.0, math.hypot(lmx - rmx, lmy - rmy))

        # 3. Vertical geometry for Pitch (Head-down vs Head-up)
        # Distance from eye midpoint to nose
        d_eye_to_nose = ny - eye_mid_y
        # Distance from nose to mouth midpoint
        d_nose_to_mouth = mouth_mid_y - ny
        # Total facial feature height
        total_feat_h = max(1.0, mouth_mid_y - eye_mid_y)

        # Ratio of eye-to-nose vs total feature height
        # Normal straight-looking: eye-to-nose is ~45-55% of feature height
        # Head down (writing): Nose appears significantly lower (closer to mouth) or
        # distance between eyes and mouth shrinks relative to face box height (h)
        vertical_ratio = d_eye_to_nose / total_feat_h if total_feat_h > 0 else 0.5
        feat_to_box_ratio = total_feat_h / max(1.0, float(h))
        eye_to_box_top = (eye_mid_y - y) / max(1.0, float(h))

        # Pitch score estimation:
        # Lower pitch score = Head tilted down (writing on desk)
        # Higher pitch score = Head tilted up
        pitch_score = 0.0

        # When head is bowed writing on a desk:
        # - The eyes are closer to the top or feature height is foreshortened
        # - Eye-to-nose distance is elongated relative to nose-to-mouth (ratio > 0.60)
        # - Overall feature height to box ratio is compressed (< 0.40)
        is_writing = False
        posture = "ATTENTIVE"
        label = "Attentive"

        # 4. Yaw score (Looking Left/Right)
        # Ratio of nose offset from eye midpoint relative to eye distance
        yaw_offset = (nx - eye_mid_x) / (eye_dist / 2.0) if eye_dist > 0 else 0.0

        # Classification heuristics
        if vertical_ratio > 0.62 or feat_to_box_ratio < 0.38 or eye_to_box_top < 0.28:
            is_writing = True
            posture = "WRITING"
            label = "Writing (Head Down)"
            pitch_score = -1.0 * min(1.0, (vertical_ratio - 0.5) * 3.0)
        elif vertical_ratio < 0.38:
            posture = "LOOKING_UP"
            label = "Looking Up"
            pitch_score = 1.0 * min(1.0, (0.5 - vertical_ratio) * 3.0)
        elif abs(yaw_offset) > 0.45:
            is_writing = False
            posture = "LOOKING_AWAY"
            label = "Looking Left" if yaw_offset < 0 else "Looking Right"
            pitch_score = 0.0
        else:
            is_writing = False
            posture = "ATTENTIVE"
            label = "Attentive (Looking Ahead)"
            pitch_score = 0.0

        return {
            "posture": posture,
            "label": label,
            "is_writing": is_writing,
            "pitch_score": round(float(pitch_score), 2),
            "yaw_score": round(float(yaw_offset), 2),
            "roll_deg": round(float(roll_deg), 1),
            "eye_dist": round(float(eye_dist), 1),
            "vertical_ratio": round(float(vertical_ratio), 2),
            "confidence": 0.92 if is_writing else 0.88
        }
