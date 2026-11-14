from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import json

from app.database import get_db
from app.schemas.scan import (
    SMSScanRequest,
    URLScanRequest,
    QRScanTextRequest,
    ScanReportResponse,
)
from app.services.scan_service import (
    execute_sms_scan,
    execute_url_scan,
    execute_qr_scan,
    _build_response,
)
from app.engine.qr_analyzer import decode_qr_image_bytes
from app.engine.correlator import correlate_indicators
from app.models.scan import Scan

router = APIRouter(prefix="/api/scan", tags=["Scanner"])

@router.post("/sms", response_model=ScanReportResponse)
async def scan_sms_endpoint(request: SMSScanRequest, db: Session = Depends(get_db)):
    """Analyze suspicious SMS message text for urgency, impersonation, and extracted links."""
    try:
        report = await execute_sms_scan(db, request.text, request.sender)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMS analysis failed: {str(e)}")

@router.post("/url", response_model=ScanReportResponse)
async def scan_url_endpoint(request: URLScanRequest, db: Session = Depends(get_db)):
    """Analyze website URL for structural anomalies, typosquatting, and threat intelligence."""
    try:
        report = await execute_url_scan(db, request.url)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URL analysis failed: {str(e)}")

@router.post("/qr/text", response_model=ScanReportResponse)
async def scan_qr_text_endpoint(request: QRScanTextRequest, db: Session = Depends(get_db)):
    """Analyze decoded QR code destination string or URL."""
    try:
        report = await execute_qr_scan(db, request.content, request.filename)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QR analysis failed: {str(e)}")

@router.post("/qr/upload", response_model=ScanReportResponse)
async def scan_qr_upload_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a QR code image (PNG, JPG, WEBP) to decode and analyze its destination."""
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds maximum limit of 10MB.")

    decoded_text, error_msg = decode_qr_image_bytes(contents)
    if not decoded_text:
        raise HTTPException(
            status_code=422,
            detail=error_msg or "Failed to decode QR code. Ensure the QR code is clearly visible and well lit."
        )

    try:
        report = await execute_qr_scan(db, decoded_text, file.filename)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"QR analysis pipeline failed: {str(e)}")

@router.get("/{scan_id}", response_model=ScanReportResponse)
def get_scan_report(scan_id: str, db: Session = Depends(get_db)):
    """Retrieve full analysis report for a previously executed scan."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan report not found")

    indicators = json.loads(scan.indicators_json or "[]")
    heuristics = json.loads(scan.heuristics_json or "[]")
    threat_intel = json.loads(scan.threat_intel_json or "[]")
    
    # Re-evaluate live correlations to reflect any new scans submitted since this scan was created
    correlations = correlate_indicators(db, scan.id, scan.scan_type, indicators)
    
    # Reconstruct evidence statement
    if scan.insufficient_evidence:
        evidence_stmt = "Insufficient evidence — treat this submission with caution and verify independently."
    elif scan.risk_level == "Low":
        evidence_stmt = "Minimal threat indicators detected under current heuristic rules."
    elif scan.risk_level == "Medium":
        evidence_stmt = "Suspicious indicators detected with potential social engineering cues."
    elif scan.risk_level == "High":
        evidence_stmt = "High-risk detection. Multiple threat signals or deceptive patterns identified."
    else:
        evidence_stmt = "Critical threat detected. Confirmed malicious signatures or converged attack infrastructure identified."

    return _build_response(scan, indicators, heuristics, threat_intel, correlations, evidence_stmt)
