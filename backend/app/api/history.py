from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import json

from app.database import get_db
from app.models.scan import Scan
from app.models.indicator import Indicator
from app.schemas.scan import ScanHistoryItem

router = APIRouter(prefix="/api/history", tags=["History"])

@router.get("", response_model=List[ScanHistoryItem])
def get_scan_history(
    q: Optional[str] = None,
    scan_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Retrieve filterable scan history."""
    query = db.query(Scan)

    if scan_type and isinstance(scan_type, str) and scan_type.lower() != "all":
        query = query.filter(Scan.scan_type == scan_type.lower())

    if risk_level and isinstance(risk_level, str) and risk_level.lower() != "all":
        query = query.filter(Scan.risk_level == risk_level)

    if q and isinstance(q, str):
        search_filter = f"%{q.strip()}%"
        query = query.filter(
            (Scan.title.ilike(search_filter)) | 
            (Scan.raw_content.ilike(search_filter))
        )

    scans = query.order_by(desc(Scan.created_at)).offset(offset).limit(limit).all()

    items = []
    for s in scans:
        preview = s.raw_content[:80] + ("..." if len(s.raw_content) > 80 else "")
        items.append(ScanHistoryItem(
            id=s.id,
            scan_type=s.scan_type,
            title=s.title,
            raw_preview=preview,
            risk_score=s.risk_score,
            risk_level=s.risk_level,
            correlation_count=s.correlation_count or 0,
            created_at=s.created_at.isoformat() if s.created_at else ""
        ))

    return items

@router.delete("/{scan_id}")
def delete_single_scan(scan_id: str, db: Session = Depends(get_db)):
    """Delete an individual scan report and its associated indicators."""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan record not found")
    
    db.delete(scan)
    db.commit()
    return {"status": "success", "message": f"Scan {scan_id} deleted successfully"}

@router.delete("")
def clear_all_history(db: Session = Depends(get_db)):
    """Wipe all scan records and historical indicators for complete user privacy."""
    try:
        db.query(Indicator).delete()
        db.query(Scan).delete()
        db.commit()
        return {"status": "success", "message": "All scan history and cached indicators have been securely deleted."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}")

@router.get("/compare/{id1}/{id2}")
def compare_scans(id1: str, id2: str, db: Session = Depends(get_db)):
    """Compare two scans side-by-side to inspect shared infrastructure and differences."""
    scan1 = db.query(Scan).filter(Scan.id == id1).first()
    scan2 = db.query(Scan).filter(Scan.id == id2).first()

    if not scan1 or not scan2:
        raise HTTPException(status_code=404, detail="One or both scans could not be found.")

    ind1 = json.loads(scan1.indicators_json or "[]")
    ind2 = json.loads(scan2.indicators_json or "[]")

    val1 = {i["value"].lower().strip(): i for i in ind1}
    val2 = {i["value"].lower().strip(): i for i in ind2}

    shared_values = set(val1.keys()).intersection(set(val2.keys()))
    shared_indicators = [val1[v] for v in shared_values]

    return {
        "scan1": scan1.to_dict(),
        "scan2": scan2.to_dict(),
        "shared_indicators": shared_indicators,
        "channel_crossover": scan1.scan_type != scan2.scan_type,
        "score_difference": abs(scan1.risk_score - scan2.risk_score)
    }
