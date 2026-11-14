from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import json

from app.database import Base

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    scan_type = Column(String(10), nullable=False, index=True)  # 'sms', 'url', 'qr'
    title = Column(String(255), nullable=False)
    raw_content = Column(Text, nullable=False)
    risk_score = Column(Integer, nullable=False, default=0)
    risk_level = Column(String(20), nullable=False, default="Low")  # Low, Medium, High, Critical
    insufficient_evidence = Column(Boolean, default=False)
    
    # Stored as serialized JSON
    heuristics_json = Column(Text, default="[]")
    indicators_json = Column(Text, default="[]")
    threat_intel_json = Column(Text, default="{}")
    recommendations_json = Column(Text, default="[]")
    
    correlation_count = Column(Integer, default=0)
    correlated_scan_ids_json = Column(Text, default="[]")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationship to indicators
    indicators = relationship("Indicator", back_populates="scan", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "scan_type": self.scan_type,
            "title": self.title,
            "raw_content": self.raw_content,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "insufficient_evidence": self.insufficient_evidence,
            "heuristics": json.loads(self.heuristics_json or "[]"),
            "indicators": json.loads(self.indicators_json or "[]"),
            "threat_intel": json.loads(self.threat_intel_json or "{}"),
            "recommendations": json.loads(self.recommendations_json or "[]"),
            "correlation_count": self.correlation_count,
            "correlated_scan_ids": json.loads(self.correlated_scan_ids_json or "[]"),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
