from typing import List, Dict, Any, Tuple, Set
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.indicator import Indicator
from app.models.scan import Scan

def correlate_indicators(
    db: Session,
    current_scan_id: str,
    current_scan_type: str,
    current_indicators: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Core signature engine for CLAVIS.
    Finds historical submissions sharing indicators with the current submission,
    identifying cross-channel convergence and generating relationship graph data.
    """
    # Key indicator types that are meaningful for correlation
    # We ignore generic common keywords to prevent noise, prioritizing domains, root domains, URLs, phones, emails
    CORRELATABLE_TYPES = {"root_domain", "domain", "url", "ip", "phone", "email"}
    
    candidate_values = {
        ind["value"].lower().strip(): ind["type"]
        for ind in current_indicators
        if ind.get("type") in CORRELATABLE_TYPES and ind.get("value")
    }

    if not candidate_values:
        return {
            "total_correlations": 0,
            "channel_crossover": False,
            "channels_involved": [current_scan_type],
            "shared_indicators": [],
            "first_seen": datetime.now(timezone.utc).isoformat(),
            "last_seen": datetime.now(timezone.utc).isoformat(),
            "matches": [],
            "graph_nodes": [],
            "graph_edges": [],
            "caution_statement": "A shared indicator is a relationship clue, not definitive proof of a common attacker."
        }

    # Query matching indicators from past scans
    matching_rows = (
        db.query(Indicator, Scan)
        .join(Scan, Indicator.scan_id == Scan.id)
        .filter(
            Indicator.scan_id != current_scan_id,
            Indicator.indicator_value.in_(list(candidate_values.keys()))
        )
        .all()
    )

    matches = []
    seen_match_keys = set()
    channels_involved = set([current_scan_type])
    shared_indicators_set = set()
    first_seen_dt = None
    last_seen_dt = None

    # Track scans for graph building
    related_scans_dict = {}

    for ind, scan in matching_rows:
        shared_indicators_set.add(ind.indicator_value)
        channels_involved.add(scan.scan_type)
        
        # Timestamps
        scan_created = scan.created_at or datetime.now(timezone.utc)
        if first_seen_dt is None or scan_created < first_seen_dt:
            first_seen_dt = scan_created
        if last_seen_dt is None or scan_created > last_seen_dt:
            last_seen_dt = scan_created

        # Crossover check
        is_crossover = (scan.scan_type.lower() != current_scan_type.lower())

        match_key = f"{scan.id}:{ind.indicator_value}"
        if match_key not in seen_match_keys:
            seen_match_keys.add(match_key)
            
            crossover_text = "Cross-channel link" if is_crossover else "Same-channel recurrence"
            reason = (
                f"{crossover_text}: Indicator '{ind.indicator_value}' ({ind.indicator_type}) "
                f"was previously analyzed in a {scan.scan_type.upper()} submission '{scan.title}' "
                f"on {scan_created.strftime('%b %d, %Y')}."
            )
            
            matches.append({
                "indicator_type": ind.indicator_type,
                "indicator_value": ind.indicator_value,
                "matched_scan_id": scan.id,
                "matched_scan_title": scan.title,
                "matched_scan_type": scan.scan_type,
                "matched_scan_risk": scan.risk_level,
                "matched_scan_created_at": scan_created.isoformat(),
                "channel_crossover": is_crossover,
                "relationship_reason": reason
            })

            related_scans_dict[scan.id] = scan

    has_crossover = len(channels_involved) > 1

    # Build Visualization Graph (Nodes & Edges)
    graph_nodes = []
    graph_edges = []
    node_ids = set()

    # 1. Current scan root node
    curr_node_id = f"scan:{current_scan_id}"
    graph_nodes.append({
        "id": curr_node_id,
        "label": f"Current Scan ({current_scan_type.upper()})",
        "type": "current_scan",
        "scan_type": current_scan_type,
        "risk_level": "Pending",
        "details": "Active submission being evaluated"
    })
    node_ids.add(curr_node_id)

    # 2. Shared indicator nodes
    for shared_val in shared_indicators_set:
        ind_type = candidate_values.get(shared_val, "indicator")
        ind_node_id = f"ind:{shared_val}"
        if ind_node_id not in node_ids:
            node_ids.add(ind_node_id)
            graph_nodes.append({
                "id": ind_node_id,
                "label": shared_val,
                "type": f"indicator_{ind_type}",
                "scan_type": None,
                "risk_level": None,
                "details": f"Shared {ind_type.replace('_', ' ').title()}"
            })

        # Connect current scan to indicator
        graph_edges.append({
            "source": curr_node_id,
            "target": ind_node_id,
            "label": "Exposes",
            "type": "origin_channel"
        })

    # 3. Related scan nodes and connections
    for scan_id, rscan in related_scans_dict.items():
        rscan_node_id = f"scan:{scan_id}"
        if rscan_node_id not in node_ids:
            node_ids.add(rscan_node_id)
            graph_nodes.append({
                "id": rscan_node_id,
                "label": f"{rscan.scan_type.upper()}: {rscan.title[:24]}...",
                "type": "related_scan",
                "scan_type": rscan.scan_type,
                "risk_level": rscan.risk_level,
                "details": f"Scan from {rscan.created_at.strftime('%Y-%m-%d %H:%M') if rscan.created_at else ''}"
            })

    # Connect related scans to the matching indicators
    for m in matches:
        ind_node_id = f"ind:{m['indicator_value']}"
        rscan_node_id = f"scan:{m['matched_scan_id']}"
        if ind_node_id in node_ids and rscan_node_id in node_ids:
            graph_edges.append({
                "source": rscan_node_id,
                "target": ind_node_id,
                "label": "Shared",
                "type": "shared_indicator"
            })

    now_iso = datetime.now(timezone.utc).isoformat()
    return {
        "total_correlations": len(matches),
        "channel_crossover": has_crossover,
        "channels_involved": sorted(list(channels_involved)),
        "shared_indicators": sorted(list(shared_indicators_set)),
        "first_seen": first_seen_dt.isoformat() if first_seen_dt else now_iso,
        "last_seen": last_seen_dt.isoformat() if last_seen_dt else now_iso,
        "matches": matches,
        "graph_nodes": graph_nodes,
        "graph_edges": graph_edges,
        "caution_statement": "A shared indicator is a relationship clue, not definitive proof of a common attacker."
    }
