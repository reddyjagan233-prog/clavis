import asyncio
import sys
import json
from app.database import SessionLocal, Base, engine
from app.models.scan import Scan
from app.models.indicator import Indicator
from app.services.scan_service import execute_sms_scan, execute_url_scan, execute_qr_scan
from app.api.stats import get_dashboard_statistics
from app.api.correlations import get_correlations_overview, get_global_intelligence_graph
from app.api.history import get_scan_history

async def test_all():
    print("--> 1. Initializing DB schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("--> 2. Testing SMS scan with USPS Phishing lure...")
    sms_text = "URGENT from USPS: Your package US-8921-99 is suspended due to unpaid customs fee. Update your card at https://usps-parcel-tracking.vip/pay within 24h or it will be returned."
    sms_rep = await execute_sms_scan(db, sms_text, sender="+1-800-555-0199")
    print(f"    SMS Scan complete: Risk={sms_rep.risk_level}, Score={sms_rep.risk_score}")
    print(f"    Extracted {len(sms_rep.indicators)} indicators, {len(sms_rep.heuristics)} heuristics triggered.")
    assert sms_rep.risk_score >= 50, f"Expected high risk, got {sms_rep.risk_score}"

    print("--> 3. Testing QR scan with matching root domain (testing Cross-Channel Correlation)...")
    qr_content = "https://usps-parcel-tracking.vip/auth/login?redirect=pay"
    qr_rep = await execute_qr_scan(db, qr_content, filename="parking_meter_quishing.png")
    print(f"    QR Scan complete: Risk={qr_rep.risk_level}, Score={qr_rep.risk_score}")
    print(f"    Total correlations found: {qr_rep.correlations.total_correlations}")
    print(f"    Channel crossover detected: {qr_rep.correlations.channel_crossover}")
    print(f"    Channels involved: {qr_rep.correlations.channels_involved}")
    assert qr_rep.correlations.channel_crossover == True, "Channel crossover should be detected between SMS and QR!"
    assert len(qr_rep.correlations.shared_indicators) >= 1, "Should have shared domain indicator"

    print("--> 4. Testing Benign URL scan (testing honest Insufficient Evidence logic)...")
    wiki_url = "https://en.wikipedia.org/wiki/Computer_security"
    wiki_rep = await execute_url_scan(db, wiki_url)
    print(f"    Benign Scan complete: Risk={wiki_rep.risk_level}, Score={wiki_rep.risk_score}")
    print(f"    Insufficient evidence flag: {wiki_rep.insufficient_evidence}")
    print(f"    Evidence statement: {wiki_rep.evidence_statement}")
    assert wiki_rep.risk_level == "Low", "Wikipedia should be Low risk"
    assert "Insufficient evidence" in wiki_rep.evidence_statement, "Must state insufficient evidence honestly!"

    print("--> 5. Testing Dashboard Statistics...")
    stats = get_dashboard_statistics(db)
    print(f"    Stats: Total Scans={stats.total_scans}, Suspicious={stats.suspicious_scans}, Correlated={stats.correlated_indicators}")
    assert stats.total_scans == 3, f"Expected 3 scans, got {stats.total_scans}"

    print("--> 6. Testing Correlation Overview...")
    corr_overview = get_correlations_overview(db)
    print(f"    Total shared clusters={corr_overview['total_shared_clusters']}, Cross-channel clusters={corr_overview['cross_channel_clusters']}")
    assert corr_overview['cross_channel_clusters'] >= 1, "Should have at least 1 cross-channel cluster"

    print("--> 7. Testing Global Intelligence Graph...")
    graph = get_global_intelligence_graph(db)
    print(f"    Graph nodes={graph['stats']['node_count']}, edges={graph['stats']['edge_count']}")
    assert graph['stats']['node_count'] > 0, "Graph should have nodes"

    print("--> 8. Testing Scan History query...")
    history = get_scan_history(db=db)
    print(f"    History count={len(history)}")
    assert len(history) == 3, f"Expected 3 history items, got {len(history)}"

    db.close()
    print("\n✅ ALL BACKEND SECURITY AND CORRELATION TESTS PASSED PERFECTLY!\n")

if __name__ == "__main__":
    asyncio.run(test_all())
