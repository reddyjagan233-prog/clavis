from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class SMSScanRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Raw SMS text content to analyze")
    sender: Optional[str] = Field(None, description="Optional phone number or sender ID")

class URLScanRequest(BaseModel):
    url: str = Field(..., min_length=1, description="Website URL or naked domain to analyze")

class QRScanTextRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Decoded QR text or destination URL")
    filename: Optional[str] = Field(None, description="Uploaded QR filename if applicable")

class IndicatorDetail(BaseModel):
    type: str  # url, domain, root_domain, ip, phone, email, brand_target, keyword
    value: str
    severity: str = "suspicious"  # info, suspicious, malicious
    label: Optional[str] = None

class HeuristicDetail(BaseModel):
    code: str
    name: str
    category: str  # urgency, impersonation, credential_harvesting, url_structure, domain_reputation, threat_intel, correlation
    severity: str  # low, medium, high, critical
    score_impact: int
    explanation: str

class ExternalIntelSource(BaseModel):
    source: str  # "Google Safe Browsing", "URLhaus", "Local Threat DB"
    status: str  # "clean", "threat_found", "unconfigured", "rate_limited", "error"
    threat_type: Optional[str] = None
    details: Optional[str] = None
    query_time_ms: Optional[float] = None
    is_external: bool = True

class CorrelationMatch(BaseModel):
    indicator_type: str
    indicator_value: str
    matched_scan_id: str
    matched_scan_title: str
    matched_scan_type: str  # sms, url, qr
    matched_scan_risk: str
    matched_scan_created_at: str
    channel_crossover: bool  # True if matched scan is a different type (e.g. SMS <-> QR)
    relationship_reason: str

class CorrelationGraphNode(BaseModel):
    id: str
    label: str
    type: str  # "current_scan", "related_scan", "indicator_domain", "indicator_phone", "indicator_url", "brand"
    scan_type: Optional[str] = None
    risk_level: Optional[str] = None
    details: Optional[str] = None

class CorrelationGraphEdge(BaseModel):
    source: str
    target: str
    label: str
    type: str  # "shared_indicator", "origin_channel", "targets_brand"

class CorrelationReport(BaseModel):
    total_correlations: int = 0
    channel_crossover: bool = False
    channels_involved: List[str] = []
    shared_indicators: List[str] = []
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    matches: List[CorrelationMatch] = []
    graph_nodes: List[CorrelationGraphNode] = []
    graph_edges: List[CorrelationGraphEdge] = []
    caution_statement: str = "A shared indicator is a relationship clue, not definitive proof of a common attacker."

class ScanReportResponse(BaseModel):
    id: str
    scan_type: str  # 'sms', 'url', 'qr'
    title: str
    raw_content: str
    risk_score: int  # 0-100
    risk_level: str  # Low, Medium, High, Critical
    insufficient_evidence: bool = False
    evidence_statement: str
    indicators: List[IndicatorDetail]
    heuristics: List[HeuristicDetail]
    threat_intel: List[ExternalIntelSource]
    correlations: CorrelationReport
    recommendations: List[str]
    created_at: str

class ScanHistoryItem(BaseModel):
    id: str
    scan_type: str
    title: str
    raw_preview: str
    risk_score: int
    risk_level: str
    correlation_count: int
    created_at: str

class StatsSummary(BaseModel):
    total_scans: int
    suspicious_scans: int  # Medium, High, Critical
    high_risk_scans: int   # High, Critical
    correlated_indicators: int
    channel_breakdown: Dict[str, int]
    risk_breakdown: Dict[str, int]
    recent_activity: List[ScanHistoryItem]
    recent_alerts: List[Dict[str, Any]]
