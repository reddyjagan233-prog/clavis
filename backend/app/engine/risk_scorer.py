from typing import List, Dict, Any, Tuple
from app.config import settings

def calculate_risk(
    heuristics: List[Dict[str, Any]],
    threat_intel: List[Dict[str, Any]],
    correlations: Dict[str, Any],
    scan_type: str
) -> Tuple[int, str, bool, str, List[str]]:
    """
    Calculates weighted risk score (0-100), risk level (Low, Medium, High, Critical),
    checks for insufficient evidence conditions, and generates explainable recommendations.
    
    Returns: (score, risk_level, insufficient_evidence, evidence_statement, recommendations)
    """
    raw_score = 0
    
    # 1. Tally heuristic score impacts with diminishing returns
    category_scores: Dict[str, int] = {}
    for h in heuristics:
        cat = h.get("category", "general")
        impact = h.get("score_impact", 0)
        # Cap impact per category to avoid single-category inflation
        category_scores[cat] = category_scores.get(cat, 0) + impact

    # Category caps
    caps = {
        "urgency": 30,
        "impersonation": 40,
        "credential_harvesting": 45,
        "url_structure": 45,
        "domain_reputation": 40,
        "threat_intel": 60,
        "correlation": 25
    }

    for cat, total in category_scores.items():
        cap = caps.get(cat, 35)
        raw_score += min(total, cap)

    # 2. Threat Intel impact
    has_threat_intel_match = False
    for intel in threat_intel:
        if intel.get("status") == "threat_found":
            has_threat_intel_match = True
            raw_score += 45
            break

    # 3. Correlation impact
    # If the indicator was seen in other attacks (especially cross-channel), boost confidence/score
    total_corr = correlations.get("total_correlations", 0)
    has_crossover = correlations.get("channel_crossover", False)
    if has_crossover:
        raw_score += 18
        heuristics.append({
            "code": "CROSS_CHANNEL_RECURRENCE",
            "name": "Cross-Channel Infrastructure Convergence",
            "category": "correlation",
            "severity": "high",
            "score_impact": 18,
            "explanation": f"This submission shares indicators across different delivery channels ({', '.join(correlations.get('channels_involved', []))}). Multi-channel campaigns indicate organized distribution."
        })
    elif total_corr >= 2:
        raw_score += 12
        heuristics.append({
            "code": "RECURRING_INDICATOR",
            "name": "Recurring Threat Indicator",
            "category": "correlation",
            "severity": "medium",
            "score_impact": 12,
            "explanation": f"Indicator has been observed across {total_corr} previous submissions in CLAVIS history."
        })

    # Clamp score to 0 - 100
    final_score = max(0, min(100, int(raw_score)))

    # Determine Risk Level based on configurable thresholds
    if final_score <= settings.LOW_THRESHOLD_MAX:
        risk_level = "Low"
    elif final_score <= settings.MEDIUM_THRESHOLD_MAX:
        risk_level = "Medium"
    elif final_score <= settings.HIGH_THRESHOLD_MAX:
        risk_level = "High"
    else:
        risk_level = "Critical"

    # Important Honesty & Safety Check:
    # A low score or absence of matches must NEVER be presented as proof that something is safe.
    # If score is low and no heuristics fired, state: "Insufficient evidence — treat this submission with caution and verify independently."
    insufficient_evidence = False
    if final_score <= settings.LOW_THRESHOLD_MAX and len(heuristics) <= 1 and not has_threat_intel_match:
        insufficient_evidence = True
        evidence_statement = (
            "Insufficient evidence — treat this submission with caution and verify independently. "
            "Absence of known threat intelligence matches or heuristic triggers does not guarantee that a link, sender, or destination is safe."
        )
    elif final_score <= settings.LOW_THRESHOLD_MAX:
        evidence_statement = (
            "Minimal threat indicators detected under current heuristic and intelligence rules. "
            "Exercise routine caution and never enter credentials without independent verification."
        )
    elif risk_level == "Medium":
        evidence_statement = (
            "Suspicious indicators detected. The submission displays tactics commonly observed in social engineering or deceptive campaigns."
        )
    elif risk_level == "High":
        evidence_statement = (
            "High-risk detection. Multiple high-severity threat signals detected (e.g. brand impersonation, deceptive domain, or credential harvesting pattern)."
        )
    else: # Critical
        evidence_statement = (
            "Critical threat detected. Confirmed malicious signatures, severe brand mimicry, or converged cross-channel attack infrastructure identified."
        )

    # Generate Tailored Actionable Recommendations
    recommendations = []
    if risk_level in ["High", "Critical"]:
        recommendations.append("Do NOT visit, click, or open the link or destination under any circumstances.")
        recommendations.append("Never submit passwords, one-time passcodes (OTP), or payment information on this page.")
        if scan_type == "sms":
            recommendations.append("Block the sender's phone number or contact address immediately.")
            recommendations.append("Report the message to your cellular carrier's spam line (forward to 7726 / SPAM).")
        elif scan_type == "qr":
            recommendations.append("Inspect the physical QR code location: check if an attacker placed a malicious sticker over a legitimate QR code.")
        recommendations.append("If credentials were provided, immediately reset your password on the authentic official service.")
    elif risk_level == "Medium":
        recommendations.append("Avoid interacting directly with links or attachments provided in this submission.")
        recommendations.append("Verify the message directly by navigating to the official website or calling customer support from an official phone number.")
        recommendations.append("Do not reply to urgent solicitations for account verification or payments.")
    else:
        # Low / Insufficient evidence recommendations
        recommendations.append("Confirm the authenticity of the sender through a known, trusted secondary channel.")
        recommendations.append("Check the address bar in your browser to verify the exact domain name and SSL certificate.")
        recommendations.append("Remember: Zero detected signals does not certify safety against novel or targeted zero-day attacks.")

    return final_score, risk_level, insufficient_evidence, evidence_statement, recommendations
