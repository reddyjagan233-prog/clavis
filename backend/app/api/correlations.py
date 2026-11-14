from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from collections import defaultdict
import json

from app.database import get_db
from app.models.scan import Scan
from app.models.indicator import Indicator

router = APIRouter(prefix="/api/correlations", tags=["Correlations"])

@router.get("/overview")
def get_correlations_overview(db: Session = Depends(get_db)):
    """
    Returns high-level cross-channel intelligence clusters.
    Identifies indicators that recur across multiple submissions and different attack channels.
    """
    # Find indicators appearing in >= 2 distinct scans
    grouped = (
        db.query(
            Indicator.indicator_value,
            Indicator.indicator_type,
            func.count(func.distinct(Indicator.scan_id)).label("scan_count")
        )
        .group_by(Indicator.indicator_value, Indicator.indicator_type)
        .having(func.count(func.distinct(Indicator.scan_id)) >= 2)
        .order_by(func.count(func.distinct(Indicator.scan_id)).desc())
        .limit(30)
        .all()
    )

    clusters = []
    for val, itype, count in grouped:
        # Find scans associated with this indicator
        scans_for_ind = (
            db.query(Scan)
            .join(Indicator, Scan.id == Indicator.scan_id)
            .filter(Indicator.indicator_value == val)
            .all()
        )
        channels = list(set([s.scan_type for s in scans_for_ind]))
        is_cross_channel = len(channels) > 1

        clusters.append({
            "indicator_value": val,
            "indicator_type": itype,
            "occurrences": count,
            "channels": channels,
            "is_cross_channel": is_cross_channel,
            "associated_scans": [
                {
                    "id": s.id,
                    "title": s.title,
                    "scan_type": s.scan_type,
                    "risk_level": s.risk_level,
                    "risk_score": s.risk_score,
                    "created_at": s.created_at.isoformat() if s.created_at else None
                }
                for s in scans_for_ind
            ]
        })

    return {
        "total_shared_clusters": len(clusters),
        "cross_channel_clusters": sum(1 for c in clusters if c["is_cross_channel"]),
        "clusters": clusters
    }

@router.get("/graph")
def get_global_intelligence_graph(db: Session = Depends(get_db)):
    """
    Constructs a holistic interactive network graph connecting all scans and shared indicators.
    """
    scans = db.query(Scan).order_by(Scan.created_at.desc()).limit(40).all()
    scan_ids = [s.id for s in scans]

    indicators = (
        db.query(Indicator)
        .filter(Indicator.scan_id.in_(scan_ids))
        .all()
    )

    # Count occurrences of each indicator
    ind_occurrence = defaultdict(set)
    for ind in indicators:
        ind_occurrence[ind.indicator_value].add(ind.scan_id)

    nodes = []
    edges = []
    added_nodes = set()

    # Add scan nodes
    for s in scans:
        s_node_id = f"scan:{s.id}"
        if s_node_id not in added_nodes:
            added_nodes.add(s_node_id)
            nodes.append({
                "id": s_node_id,
                "label": f"[{s.scan_type.upper()}] {s.title[:20]}...",
                "full_label": s.title,
                "type": "scan",
                "scan_type": s.scan_type,
                "risk_level": s.risk_level,
                "risk_score": s.risk_score,
                "created_at": s.created_at.isoformat() if s.created_at else None
            })

    # Add shared and prominent indicator nodes
    for ind in indicators:
        val = ind.indicator_value
        is_shared = len(ind_occurrence[val]) > 1
        ind_node_id = f"ind:{val}"

        # Focus on shared indicators, or high-severity indicators
        if is_shared or ind.severity in ["malicious", "suspicious"]:
            if ind_node_id not in added_nodes:
                added_nodes.add(ind_node_id)
                nodes.append({
                    "id": ind_node_id,
                    "label": val,
                    "full_label": val,
                    "type": f"indicator_{ind.indicator_type}",
                    "indicator_type": ind.indicator_type,
                    "is_shared": is_shared,
                    "severity": ind.severity
                })

            # Add edge
            s_node_id = f"scan:{ind.scan_id}"
            if s_node_id in added_nodes:
                edges.append({
                    "source": s_node_id,
                    "target": ind_node_id,
                    "label": "References",
                    "type": "shared_indicator" if is_shared else "indicator"
                })

    return {
        "nodes": nodes,
        "edges": edges,
        "stats": {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "scans_represented": len(scans)
        }
    }
