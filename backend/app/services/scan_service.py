import json
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from app.models.scan import Scan
from app.models.indicator import Indicator
from app.engine.extractor import extract_all_indicators, extract_urls, extract_root_domain
from app.engine.url_analyzer import analyze_url_heuristics, normalize_url
from app.engine.sms_analyzer import analyze_sms_heuristics
from app.engine.qr_analyzer import analyze_qr_quishing_heuristics
from app.engine.threat_intel import check_all_threat_intelligence
from app.engine.correlator import correlate_indicators
from app.engine.risk_scorer import calculate_risk
from app.schemas.scan import (
    ScanReportResponse,
    IndicatorDetail,
    HeuristicDetail,
    ExternalIntelSource,
    CorrelationReport,
    CorrelationMatch,
    CorrelationGraphNode,
    CorrelationGraphEdge,
)

async def execute_sms_scan(db: Session, text: str, sender: Optional[str] = None) -> ScanReportResponse:
    """Processes an SMS message scan."""
    scan_id = str(uuid.uuid4())
    scan_type = "sms"
    title = f"SMS: {text[:40]}..." if len(text) > 40 else f"SMS: {text}"
    
    # 1. Extract indicators
    indicators_raw = extract_all_indicators(text)
    if sender:
        indicators_raw.append({
            "type": "phone",
            "value": sender.strip(),
            "severity": "info",
            "label": "Sender Address"
        })

    # 2. Run SMS Heuristics
    heuristics = analyze_sms_heuristics(text, sender)

    # 3. For any URLs found in SMS, run URL heuristics as well!
    found_urls = extract_urls(text)
    for u in found_urls:
        url_heuristics = analyze_url_heuristics(u)
        heuristics.extend(url_heuristics)

    # 4. Threat Intel lookup on extracted links
    threat_intel = []
    if found_urls:
        parsed = urlparse(found_urls[0])
        threat_intel = await check_all_threat_intelligence(found_urls[0], parsed.hostname)

    # 5. Cross-Channel Correlation against history
    correlations_dict = correlate_indicators(db, scan_id, scan_type, indicators_raw)

    # 6. Calculate Explainable Risk
    score, risk_lvl, is_insufficient, evidence_stmt, recommendations = calculate_risk(
        heuristics, threat_intel, correlations_dict, scan_type
    )

    # 7. Persist Scan and Indicators in Database
    scan_record = Scan(
        id=scan_id,
        scan_type=scan_type,
        title=title,
        raw_content=text,
        risk_score=score,
        risk_level=risk_lvl,
        insufficient_evidence=is_insufficient,
        heuristics_json=json.dumps(heuristics),
        indicators_json=json.dumps(indicators_raw),
        threat_intel_json=json.dumps(threat_intel),
        recommendations_json=json.dumps(recommendations),
        correlation_count=correlations_dict.get("total_correlations", 0),
        correlated_scan_ids_json=json.dumps([m["matched_scan_id"] for m in correlations_dict.get("matches", [])]),
        created_at=datetime.now(timezone.utc)
    )
    db.add(scan_record)

    for ind in indicators_raw:
        ind_record = Indicator(
            id=str(uuid.uuid4()),
            scan_id=scan_id,
            indicator_type=ind["type"],
            indicator_value=ind["value"].lower().strip(),
            severity=ind.get("severity", "suspicious"),
            created_at=datetime.now(timezone.utc)
        )
        db.add(ind_record)

    db.commit()
    db.refresh(scan_record)

    return _build_response(scan_record, indicators_raw, heuristics, threat_intel, correlations_dict, evidence_stmt)

async def execute_url_scan(db: Session, raw_url: str) -> ScanReportResponse:
    """Processes a URL scan."""
    scan_id = str(uuid.uuid4())
    scan_type = "url"
    normalized = normalize_url(raw_url)
    title = f"URL: {normalized[:45]}..." if len(normalized) > 45 else f"URL: {normalized}"

    # 1. Extract indicators
    indicators_raw = extract_all_indicators(normalized, context_url=normalized)

    # 2. Run URL Heuristics
    heuristics = analyze_url_heuristics(normalized)

    # 3. Threat Intel lookup
    parsed = urlparse(normalized)
    threat_intel = await check_all_threat_intelligence(normalized, parsed.hostname)

    # 4. Cross-Channel Correlation
    correlations_dict = correlate_indicators(db, scan_id, scan_type, indicators_raw)

    # 5. Calculate Explainable Risk
    score, risk_lvl, is_insufficient, evidence_stmt, recommendations = calculate_risk(
        heuristics, threat_intel, correlations_dict, scan_type
    )

    # 6. Persist Scan and Indicators
    scan_record = Scan(
        id=scan_id,
        scan_type=scan_type,
        title=title,
        raw_content=normalized,
        risk_score=score,
        risk_level=risk_lvl,
        insufficient_evidence=is_insufficient,
        heuristics_json=json.dumps(heuristics),
        indicators_json=json.dumps(indicators_raw),
        threat_intel_json=json.dumps(threat_intel),
        recommendations_json=json.dumps(recommendations),
        correlation_count=correlations_dict.get("total_correlations", 0),
        correlated_scan_ids_json=json.dumps([m["matched_scan_id"] for m in correlations_dict.get("matches", [])]),
        created_at=datetime.now(timezone.utc)
    )
    db.add(scan_record)

    for ind in indicators_raw:
        ind_record = Indicator(
            id=str(uuid.uuid4()),
            scan_id=scan_id,
            indicator_type=ind["type"],
            indicator_value=ind["value"].lower().strip(),
            severity=ind.get("severity", "suspicious"),
            created_at=datetime.now(timezone.utc)
        )
        db.add(ind_record)

    db.commit()
    db.refresh(scan_record)

    return _build_response(scan_record, indicators_raw, heuristics, threat_intel, correlations_dict, evidence_stmt)

async def execute_qr_scan(db: Session, decoded_content: str, filename: Optional[str] = None) -> ScanReportResponse:
    """Processes a decoded QR code payload."""
    scan_id = str(uuid.uuid4())
    scan_type = "qr"
    label = filename or decoded_content[:35]
    title = f"QR Code: {label}"

    # 1. Extract indicators from decoded content
    indicators_raw = extract_all_indicators(decoded_content)

    # 2. Run Quishing heuristics
    heuristics = analyze_qr_quishing_heuristics(decoded_content)

    # 3. If QR contains URLs, send through deep URL analysis pipeline!
    found_urls = extract_urls(decoded_content)
    threat_intel = []
    if found_urls:
        for u in found_urls:
            url_heuristics = analyze_url_heuristics(u)
            heuristics.extend(url_heuristics)
        parsed = urlparse(found_urls[0])
        threat_intel = await check_all_threat_intelligence(found_urls[0], parsed.hostname)

    # 4. Cross-Channel Correlation
    correlations_dict = correlate_indicators(db, scan_id, scan_type, indicators_raw)

    # 5. Calculate Risk
    score, risk_lvl, is_insufficient, evidence_stmt, recommendations = calculate_risk(
        heuristics, threat_intel, correlations_dict, scan_type
    )

    # 6. Persist Scan and Indicators
    scan_record = Scan(
        id=scan_id,
        scan_type=scan_type,
        title=title,
        raw_content=decoded_content,
        risk_score=score,
        risk_level=risk_lvl,
        insufficient_evidence=is_insufficient,
        heuristics_json=json.dumps(heuristics),
        indicators_json=json.dumps(indicators_raw),
        threat_intel_json=json.dumps(threat_intel),
        recommendations_json=json.dumps(recommendations),
        correlation_count=correlations_dict.get("total_correlations", 0),
        correlated_scan_ids_json=json.dumps([m["matched_scan_id"] for m in correlations_dict.get("matches", [])]),
        created_at=datetime.now(timezone.utc)
    )
    db.add(scan_record)

    for ind in indicators_raw:
        ind_record = Indicator(
            id=str(uuid.uuid4()),
            scan_id=scan_id,
            indicator_type=ind["type"],
            indicator_value=ind["value"].lower().strip(),
            severity=ind.get("severity", "suspicious"),
            created_at=datetime.now(timezone.utc)
        )
        db.add(ind_record)

    db.commit()
    db.refresh(scan_record)

    return _build_response(scan_record, indicators_raw, heuristics, threat_intel, correlations_dict, evidence_stmt)

def _build_response(
    scan: Scan,
    indicators: List[Dict[str, Any]],
    heuristics: List[Dict[str, Any]],
    threat_intel: List[Dict[str, Any]],
    correlations: Dict[str, Any],
    evidence_stmt: str
) -> ScanReportResponse:
    """Formats scan data into the comprehensive ScanReportResponse schema."""
    created_at_str = scan.created_at.isoformat() if scan.created_at else datetime.now(timezone.utc).isoformat()
    
    return ScanReportResponse(
        id=scan.id,
        scan_type=scan.scan_type,
        title=scan.title,
        raw_content=scan.raw_content,
        risk_score=scan.risk_score,
        risk_level=scan.risk_level,
        insufficient_evidence=scan.insufficient_evidence,
        evidence_statement=evidence_stmt,
        indicators=[
            IndicatorDetail(
                type=i["type"],
                value=i["value"],
                severity=i.get("severity", "suspicious"),
                label=i.get("label")
            )
            for i in indicators
        ],
        heuristics=[
            HeuristicDetail(
                code=h["code"],
                name=h["name"],
                category=h["category"],
                severity=h["severity"],
                score_impact=h["score_impact"],
                explanation=h["explanation"]
            )
            for h in heuristics
        ],
        threat_intel=[
            ExternalIntelSource(
                source=ti["source"],
                status=ti["status"],
                threat_type=ti.get("threat_type"),
                details=ti.get("details"),
                query_time_ms=ti.get("query_time_ms"),
                is_external=ti.get("is_external", True)
            )
            for ti in threat_intel
        ],
        correlations=CorrelationReport(
            total_correlations=correlations.get("total_correlations", 0),
            channel_crossover=correlations.get("channel_crossover", False),
            channels_involved=correlations.get("channels_involved", []),
            shared_indicators=correlations.get("shared_indicators", []),
            first_seen=correlations.get("first_seen"),
            last_seen=correlations.get("last_seen"),
            matches=[
                CorrelationMatch(**m)
                for m in correlations.get("matches", [])
            ],
            graph_nodes=[
                CorrelationGraphNode(**gn)
                for gn in correlations.get("graph_nodes", [])
            ],
            graph_edges=[
                CorrelationGraphEdge(**ge)
                for ge in correlations.get("graph_edges", [])
            ],
            caution_statement=correlations.get("caution_statement", "A shared indicator is a relationship clue, not proof of a common attacker.")
        ),
        recommendations=json.loads(scan.recommendations_json or "[]"),
        created_at=created_at_str
    )
