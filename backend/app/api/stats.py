from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from collections import defaultdict

from app.database import get_db
from app.models.scan import Scan
from app.models.indicator import Indicator
from app.schemas.scan import StatsSummary, ScanHistoryItem

router = APIRouter(prefix="/api/stats", tags=["Stats"])

@router.get("", response_model=StatsSummary)
def get_dashboard_statistics(db: Session = Depends(get_db)):
    """Retrieve aggregate threat statistics for the CLAVIS executive dashboard."""
    total_scans = db.query(Scan).count()
    
    # Risk breakdowns
    risk_counts = (
        db.query(Scan.risk_level, func.count(Scan.id))
        .group_by(Scan.risk_level)
        .all()
    )
    risk_dict = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    for rlevel, count in risk_counts:
        if rlevel in risk_dict:
            risk_dict[rlevel] = count

    suspicious_scans = risk_dict["Medium"] + risk_dict["High"] + risk_dict["Critical"]
    high_risk_scans = risk_dict["High"] + risk_dict["Critical"]

    # Channel breakdowns
    channel_counts = (
        db.query(Scan.scan_type, func.count(Scan.id))
        .group_by(Scan.scan_type)
        .all()
    )
    channel_dict = {"sms": 0, "url": 0, "qr": 0}
    for ctype, count in channel_counts:
        if ctype in channel_dict:
            channel_dict[ctype] = count

    # Correlated indicators count
    correlated_count = (
        db.query(Indicator.indicator_value)
        .group_by(Indicator.indicator_value)
        .having(func.count(func.distinct(Indicator.scan_id)) >= 2)
        .count()
    )

    # Recent scans
    recent_scans = (
        db.query(Scan)
        .order_by(Scan.created_at.desc())
        .limit(6)
        .all()
    )
    recent_items = [
        ScanHistoryItem(
            id=s.id,
            scan_type=s.scan_type,
            title=s.title,
            raw_preview=s.raw_content[:75] + ("..." if len(s.raw_content) > 75 else ""),
            risk_score=s.risk_score,
            risk_level=s.risk_level,
            correlation_count=s.correlation_count or 0,
            created_at=s.created_at.isoformat() if s.created_at else ""
        )
        for s in recent_scans
    ]

    # Recent alerts
    recent_alerts = []
    alert_scans = (
        db.query(Scan)
        .filter(Scan.risk_level.in_(["High", "Critical"]))
        .order_by(Scan.created_at.desc())
        .limit(4)
        .all()
    )
    for s in alert_scans:
        recent_alerts.append({
            "id": s.id,
            "scan_type": s.scan_type,
            "title": s.title,
            "risk_level": s.risk_level,
            "risk_score": s.risk_score,
            "correlation_count": s.correlation_count or 0,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "message": f"{s.risk_level} threat alert in {s.scan_type.upper()} submission"
        })

    return StatsSummary(
        total_scans=total_scans,
        suspicious_scans=suspicious_scans,
        high_risk_scans=high_risk_scans,
        correlated_indicators=correlated_count,
        channel_breakdown=channel_dict,
        risk_breakdown=risk_dict,
        recent_activity=recent_items,
        recent_alerts=recent_alerts
    )
