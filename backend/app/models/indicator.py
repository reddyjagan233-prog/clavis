from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from app.database import Base

class Indicator(Base):
    __tablename__ = "indicators"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    scan_id = Column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    indicator_type = Column(String(30), nullable=False, index=True)  # url, domain, root_domain, ip, phone, email, brand_target, keyword
    indicator_value = Column(String(500), nullable=False, index=True)
    severity = Column(String(20), default="suspicious")  # info, suspicious, malicious
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    scan = relationship("Scan", back_populates="indicators")

    __table_args__ = (
        Index("idx_indicator_type_value", "indicator_type", "indicator_value"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "scan_id": self.scan_id,
            "indicator_type": self.indicator_type,
            "indicator_value": self.indicator_value,
            "severity": self.severity,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
