import io
import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional, List, Dict, Any
from app.engine.extractor import extract_urls

def decode_qr_image_bytes(image_bytes: bytes) -> Tuple[Optional[str], Optional[str]]:
    """
    Decodes a QR code from raw image bytes using OpenCV QRCodeDetector with PIL pre-processing.
    Returns (decoded_text, error_message).
    """
    try:
        # Load image via PIL to normalize formats (PNG, JPG, WEBP, GIF)
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img = pil_img.convert("RGB")
        open_cv_image = np.array(pil_img)
        # Convert RGB to BGR for OpenCV
        open_cv_image = open_cv_image[:, :, ::-1].copy()
    except Exception as e:
        return None, f"Failed to parse image file: {str(e)}"

    detector = cv2.QRCodeDetector()
    
    # Attempt 1: Direct detection
    try:
        data, bbox, _ = detector.detectAndDecode(open_cv_image)
        if data:
            return data.strip(), None
    except Exception:
        pass

    # Attempt 2: Grayscale + Otsu thresholding for low-contrast/camera scans
    try:
        gray = cv2.cvtColor(open_cv_image, cv2.COLOR_BGR2GRAY)
        data, bbox, _ = detector.detectAndDecode(gray)
        if data:
            return data.strip(), None

        # Binary thresholding
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        data, bbox, _ = detector.detectAndDecode(thresh)
        if data:
            return data.strip(), None
    except Exception:
        pass

    return None, "No valid QR code could be detected in the provided image. Please check lighting or upload a clearer image."

def analyze_qr_quishing_heuristics(decoded_content: str) -> List[Dict[str, Any]]:
    """
    Evaluates QR-specific threats ('Quishing' - QR Phishing).
    """
    heuristics = []
    content_lower = decoded_content.lower().strip()

    # 1. QR Payload Type
    urls = extract_urls(decoded_content)
    if urls:
        heuristics.append({
            "code": "QR_WEB_DESTINATION",
            "name": "QR Code Directs to External URL",
            "category": "url_structure",
            "severity": "low",
            "score_impact": 10,
            "explanation": f"The QR code immediately opens an external link ({urls[0]}). QR phishing (Quishing) bypasses standard email link scanners by encoding URLs into graphical images."
        })

    # 2. Check for Wi-Fi or vCard payload tricks
    if content_lower.startswith("wifi:"):
        heuristics.append({
            "code": "QR_WIFI_CONFIG",
            "name": "Wi-Fi Network Configuration Payload",
            "category": "url_structure",
            "severity": "medium",
            "score_impact": 15,
            "explanation": "The QR code configures device Wi-Fi connectivity. Malicious QR codes in public places often entice users to connect to rogue rogue access points."
        })
    elif "begin:vcard" in content_lower:
        heuristics.append({
            "code": "QR_VCARD_PAYLOAD",
            "name": "Electronic Business Card (vCard) Payload",
            "category": "url_structure",
            "severity": "low",
            "score_impact": 8,
            "explanation": "The QR code contains contact card data. Inspect embedded phone numbers and websites carefully."
        })

    return heuristics
