from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import json
from datetime import datetime, timezone, timedelta

from app.config import settings
from app.database import get_db
from app.models.scan import Scan
from app.models.indicator import Indicator
from app.services.scan_service import execute_sms_scan, execute_url_scan, execute_qr_scan

router = APIRouter(prefix="/api/config", tags=["Configuration"])

class ThresholdUpdateRequest(BaseModel):
    low_max: int
    medium_max: int
    high_max: int

@router.get("")
def get_system_configuration():
    """Retrieve current system configuration, threshold rules, and API integration statuses."""
    return {
        "thresholds": {
            "low_max": settings.LOW_THRESHOLD_MAX,
            "medium_max": settings.MEDIUM_THRESHOLD_MAX,
            "high_max": settings.HIGH_THRESHOLD_MAX,
            "critical_min": settings.CRITICAL_THRESHOLD_MIN,
        },
        "integrations": {
            "google_safe_browsing": {
                "name": "Google Safe Browsing v4",
                "configured": bool(settings.GOOGLE_SAFE_BROWSING_API_KEY),
                "key_env_var": "GOOGLE_SAFE_BROWSING_API_KEY",
                "status": "Active" if settings.GOOGLE_SAFE_BROWSING_API_KEY else "Unconfigured (Local fallback active)"
            },
            "urlhaus": {
                "name": "URLhaus (abuse.ch)",
                "configured": bool(settings.URLHAUS_API_KEY),
                "key_env_var": "URLHAUS_API_KEY",
                "status": "Active with Auth Key" if settings.URLHAUS_API_KEY else "Public Mode / Local fallback active"
            },
            "local_threat_db": {
                "name": "CLAVIS Local Threat Feed & Heuristics",
                "configured": True,
                "status": "Online & Active"
            }
        },
        "ssrf_protection": {
            "status": "Enforced",
            "rfc1918_blocked": True,
            "cloud_metadata_blocked": True
        }
    }

@router.post("/thresholds")
def update_thresholds(req: ThresholdUpdateRequest):
    """Adjust risk scoring thresholds dynamically."""
    if not (0 <= req.low_max < req.medium_max < req.high_max <= 100):
        raise HTTPException(
            status_code=400,
            detail="Thresholds must satisfy: 0 <= Low < Medium < High <= 100"
        )
    settings.LOW_THRESHOLD_MAX = req.low_max
    settings.MEDIUM_THRESHOLD_MAX = req.medium_max
    settings.HIGH_THRESHOLD_MAX = req.high_max
    settings.CRITICAL_THRESHOLD_MIN = req.high_max + 1
    return {
        "status": "success",
        "thresholds": {
            "low_max": settings.LOW_THRESHOLD_MAX,
            "medium_max": settings.MEDIUM_THRESHOLD_MAX,
            "high_max": settings.HIGH_THRESHOLD_MAX,
            "critical_min": settings.CRITICAL_THRESHOLD_MIN,
        }
    }

@router.post("/seed")
async def seed_sample_data(db: Session = Depends(get_db)):
    """
    Populates sample test data demonstrating cross-channel correlation.
    Seeds paired submissions sharing common threat indicators across SMS, URL, and QR codes.
    """
    # Check if database already has scans
    existing_count = db.query(Scan).count()
    if existing_count > 0:
        return {"status": "info", "message": f"Database already contains {existing_count} scans. Seed skipped to avoid duplication."}

    # 1. First Scan: SMS containing fraudulent courier link and callback phone
    sms_1 = (
        "URGENT from USPS: Your package US-8921-99 is suspended due to unpaid customs fee of $2.30. "
        "Update your card details within 12 hours at https://usps-parcel-tracking.vip/pay or call 800-555-0199 to avoid return."
    )
    await execute_sms_scan(db, sms_1, sender="+1-800-555-0199")

    # 2. Second Scan: QR Code (Quishing) that decodes to the exact same deceptive domain
    qr_1 = "https://usps-parcel-tracking.vip/auth/login"
    await execute_qr_scan(db, qr_1, filename="parking_meter_sticker_qr.png")

    # 3. Third Scan: Banking Smishing SMS with typosquatting domain
    sms_2 = (
        "WELLS FARGO ALERT: Unauthorized login attempt detected from IP 192.88.99.12. "
        "Your account has been locked. Verify immediately at http://wellsfarg0-online-secure.com/auth to avoid termination."
    )
    await execute_sms_scan(db, sms_2, sender="fraud-dept@wellsfargo-notice.com")

    # 4. Fourth Scan: Direct URL submission with the same banking phishing domain
    url_2 = "http://wellsfarg0-online-secure.com/verify-identity?action=reset"
    await execute_url_scan(db, url_2)

    # 5. Fifth Scan: Benign URL to demonstrate low risk & honest 'Insufficient evidence' output
    url_3 = "https://en.wikipedia.org/wiki/Computer_security"
    await execute_url_scan(db, url_3)

    return {
        "status": "success",
        "message": "Successfully seeded sample scans illustrating cross-channel SMS ↔ QR ↔ URL correlations and benign baselines."
    }
