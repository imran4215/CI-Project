import os
import io
import cv2
import numpy as np
from typing import Optional, Dict, Any, Tuple

try:
    from skimage.metrics import structural_similarity as ssim_fn
    HAS_SKIMAGE = True
except ImportError:
    HAS_SKIMAGE = False


class SignatureEngine:
    """
    Biometric Signature Matching Engine using Computer Vision.
    Fuses SSIM (Structural Similarity), Normalized Cross-Correlation (NCC),
    ORB Keypoint Feature Descriptors, and Hu Moments for offline, resilient
    signature verification.
    """

    def __init__(self, target_width: int = 256, target_height: int = 128, default_threshold: float = 0.60):
        self.target_width = target_width
        self.target_height = target_height
        self.default_threshold = default_threshold
        self.orb = cv2.ORB_create(nfeatures=500, scaleFactor=1.2, nlevels=4)
        self.bf_matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)

    def decode_image(self, img_input: Any) -> Optional[np.ndarray]:
        """Decodes raw bytes, numpy array, or file buffer into a BGR/BGRA numpy image."""
        if img_input is None:
            return None
        if isinstance(img_input, np.ndarray):
            return img_input
        if isinstance(img_input, (bytes, bytearray)):
            nparr = np.frombuffer(img_input, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        return None

    def preprocess_signature(self, img_input: Any) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """
        Preprocesses raw signature image:
        1. Separates stroke ink from alpha / light background.
        2. Binarizes ink strokes with Otsu's thresholding.
        3. Crops tightly around stroke bounding box.
        4. Scales to canonical standard size (256x128) with aspect-ratio preserving padding.
        Returns:
            canonical_gray: standard 256x128 grayscale mask (0=bg, 255=stroke)
            canonical_bin: binarized binary mask
        """
        img = self.decode_image(img_input)
        if img is None:
            return None, None

        # 1. Handle Alpha Transparency Channel if present
        if len(img.shape) == 3 and img.shape[2] == 4:
            alpha = img[:, :, 3]
            bgr = img[:, :, :3]
            gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
            # Combine alpha transparency with grayscale luminance
            stroke_mask = np.where(alpha > 30, 255 - gray, 0).astype(np.uint8)
        elif len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Detect if background is white/light or dark
            mean_val = np.mean(gray)
            if mean_val > 127:
                # White paper background -> invert so ink is white on black
                stroke_mask = 255 - gray
            else:
                # Dark canvas background -> ink is bright
                stroke_mask = gray
        else:
            mean_val = np.mean(img)
            stroke_mask = 255 - img if mean_val > 127 else img

        # 2. Binarize using Otsu's Thresholding
        _, binary = cv2.threshold(stroke_mask, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        # 3. Find Non-Zero Ink Stroke Coordinates
        pts = cv2.findNonZero(binary)
        if pts is None or len(pts) < 15:
            # Blank or insufficient strokes
            return None, None

        # 4. Tight Bounding Box Crop with Padding
        x, y, w, h = cv2.boundingRect(pts)
        pad = 8
        x0 = max(0, x - pad)
        y0 = max(0, y - pad)
        x1 = min(binary.shape[1], x + w + pad)
        y1 = min(binary.shape[0], y + h + pad)

        cropped_gray = stroke_mask[y0:y1, x0:x1]
        cropped_bin = binary[y0:y1, x0:x1]

        # 5. Aspect-Ratio Preserving Resize to (target_width, target_height)
        canonical_gray = self._resize_with_padding(cropped_gray, self.target_width, self.target_height)
        canonical_bin = self._resize_with_padding(cropped_bin, self.target_width, self.target_height)

        return canonical_gray, canonical_bin

    def _resize_with_padding(self, image: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
        h, w = image.shape[:2]
        if h == 0 or w == 0:
            return np.zeros((target_h, target_w), dtype=np.uint8)

        scale = min(target_w / w, target_h / h)
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))

        resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        padded = np.zeros((target_h, target_w), dtype=np.uint8)
        x_offset = (target_w - new_w) // 2
        y_offset = (target_h - new_h) // 2

        padded[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized
        return padded

    def _compute_ssim(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Computes Structural Similarity Index (SSIM)."""
        if HAS_SKIMAGE:
            try:
                score = ssim_fn(img1, img2, data_range=255)
                return max(0.0, min(1.0, float(score)))
            except Exception:
                pass

        # Pure OpenCV / NumPy SSIM fallback
        c1 = (0.01 * 255) ** 2
        c2 = (0.03 * 255) ** 2

        img1 = img1.astype(np.float64)
        img2 = img2.astype(np.float64)

        kernel = cv2.getGaussianKernel(11, 1.5)
        window = np.outer(kernel, kernel.transpose())

        mu1 = cv2.filter2D(img1, -1, window)[5:-5, 5:-5]
        mu2 = cv2.filter2D(img2, -1, window)[5:-5, 5:-5]

        mu1_sq = mu1 ** 2
        mu2_sq = mu2 ** 2
        mu1_mu2 = mu1 * mu2

        sigma1_sq = cv2.filter2D(img1 ** 2, -1, window)[5:-5, 5:-5] - mu1_sq
        sigma2_sq = cv2.filter2D(img2 ** 2, -1, window)[5:-5, 5:-5] - mu2_sq
        sigma12 = cv2.filter2D(img1 * img2, -1, window)[5:-5, 5:-5] - mu1_mu2

        ssim_map = ((2 * mu1_mu2 + c1) * (2 * sigma12 + c2)) / ((mu1_sq + mu2_sq + c1) * (sigma1_sq + sigma2_sq + c2))
        return max(0.0, min(1.0, float(np.mean(ssim_map))))

    def _compute_ncc(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Computes Normalized Cross-Correlation (NCC)."""
        try:
            res = cv2.matchTemplate(img1, img2, cv2.TM_CCOEFF_NORMED)
            ncc_score = float(res[0][0])
            # Map from [-1.0, 1.0] to [0.0, 1.0]
            return max(0.0, min(1.0, (ncc_score + 1.0) / 2.0))
        except Exception:
            return 0.5

    def _compute_orb_similarity(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Computes ORB feature keypoint matching score."""
        try:
            kp1, des1 = self.orb.detectAndCompute(img1, None)
            kp2, des2 = self.orb.detectAndCompute(img2, None)

            if des1 is None or des2 is None or len(kp1) < 4 or len(kp2) < 4:
                return 0.5

            matches = self.bf_matcher.knnMatch(des1, des2, k=2)
            good_matches = []
            for m_n in matches:
                if len(m_n) == 2:
                    m, n = m_n
                    if m.distance < 0.75 * n.distance:
                        good_matches.append(m)

            ratio = len(good_matches) / max(min(len(kp1), len(kp2)), 1)
            # Scale ratio so 30%+ good matches gives high confidence
            score = min(1.0, ratio * 2.5)
            return float(score)
        except Exception:
            return 0.5

    def _compute_hu_similarity(self, bin1: np.ndarray, bin2: np.ndarray) -> float:
        """Computes shape similarity via Hu Moments."""
        try:
            cnts1, _ = cv2.findContours(bin1, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cnts2, _ = cv2.findContours(bin2, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if not cnts1 or not cnts2:
                return 0.5

            c1 = max(cnts1, key=cv2.contourArea)
            c2 = max(cnts2, key=cv2.contourArea)

            d = cv2.matchShapes(c1, c2, cv2.CONTOURS_MATCH_I1, 0.0)
            sim = 1.0 / (1.0 + d)
            return max(0.0, min(1.0, float(sim)))
        except Exception:
            return 0.5

    def compare_signatures(
        self,
        registered_bytes: Optional[bytes],
        live_bytes: Optional[bytes],
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Compares a registered reference signature against a live captured signature.
        Returns match verdict, similarity percentage (0-100%), and breakdown.
        """
        target_thresh = threshold if threshold is not None else self.default_threshold

        # Case 1: Candidate has no registered reference signature (Legacy or Unset)
        if registered_bytes is None or len(registered_bytes) == 0:
            return {
                "success": True,
                "is_match": True,
                "similarity_score": 100.0,
                "threshold": target_thresh * 100.0,
                "status": "AUTO_APPROVED",
                "is_legacy": True,
                "message": "No registered signature on profile. Auto-approved for entry.",
                "metrics": {
                    "ssim": 1.0,
                    "ncc": 1.0,
                    "orb": 1.0,
                    "hu": 1.0
                }
            }

        # Case 2: Live signature is empty or invalid
        if live_bytes is None or len(live_bytes) == 0:
            return {
                "success": False,
                "is_match": False,
                "similarity_score": 0.0,
                "threshold": target_thresh * 100.0,
                "status": "EMPTY_PAD",
                "is_legacy": False,
                "message": "Live signature pad is empty. Please sign on the tablet.",
                "metrics": {
                    "ssim": 0.0,
                    "ncc": 0.0,
                    "orb": 0.0,
                    "hu": 0.0
                }
            }

        # Preprocess both signatures
        reg_gray, reg_bin = self.preprocess_signature(registered_bytes)
        live_gray, live_bin = self.preprocess_signature(live_bytes)

        if reg_gray is None or reg_bin is None:
            # Registered signature image was corrupted/unparseable -> fallback approve
            return {
                "success": True,
                "is_match": True,
                "similarity_score": 100.0,
                "threshold": target_thresh * 100.0,
                "status": "AUTO_APPROVED",
                "is_legacy": True,
                "message": "Registered signature unparseable. Auto-approved.",
                "metrics": {}
            }

        if live_gray is None or live_bin is None:
            return {
                "success": False,
                "is_match": False,
                "similarity_score": 0.0,
                "threshold": target_thresh * 100.0,
                "status": "EMPTY_PAD",
                "is_legacy": False,
                "message": "Live signature stroke could not be detected. Please draw clearly on pad.",
                "metrics": {}
            }

        # Compute Individual Metric Scores
        ssim_score = self._compute_ssim(reg_gray, live_gray)
        ncc_score = self._compute_ncc(reg_gray, live_gray)
        orb_score = self._compute_orb_similarity(reg_gray, live_gray)
        hu_score = self._compute_hu_similarity(reg_bin, live_bin)

        # Weighted Ensemble Similarity Fusion
        # SSIM (40%) + NCC (30%) + ORB (20%) + Hu (10%)
        fused_similarity = (
            0.40 * ssim_score +
            0.30 * ncc_score +
            0.20 * orb_score +
            0.10 * hu_score
        )

        # Boost slightly for natural pen thickness variance
        normalized_sim = min(1.0, fused_similarity * 1.05)
        score_percent = round(normalized_sim * 100.0, 1)
        thresh_percent = round(target_thresh * 100.0, 1)

        is_match = normalized_sim >= target_thresh

        return {
            "success": True,
            "is_match": is_match,
            "similarity_score": score_percent,
            "raw_similarity": round(normalized_sim, 4),
            "threshold": thresh_percent,
            "status": "VERIFIED" if is_match else "MISMATCH",
            "is_legacy": False,
            "message": f"Signature match verified ({score_percent}%)" if is_match else f"Signature mismatch ({score_percent}% < {thresh_percent}%)",
            "metrics": {
                "ssim": round(ssim_score * 100.0, 1),
                "ncc": round(ncc_score * 100.0, 1),
                "orb": round(orb_score * 100.0, 1),
                "hu": round(hu_score * 100.0, 1)
            }
        }
