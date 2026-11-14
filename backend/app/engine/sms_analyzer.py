import re
from typing import List, Dict, Any
from app.engine.extractor import extract_urls, extract_phone_numbers, extract_brands

# Urgency indicators
URGENCY_PATTERNS = [
    (r'\b(?:urgent|immediately|immediate action|act now|hurry|final notice|final warning)\b', 24, "Immediate urgency language"),
    (r'\b(?:within (?:24|12|48|2|1) (?:hours?|hrs?)|expires today|valid for \d+ min(?:utes?)?)\b', 22, "Artificial artificial time-limit deadline"),
    (r'\b(?:suspended|locked|blocked|terminated|frozen|disabled|deactivated|cancelled)\b', 20, "Threat of account suspension or closure"),
    (r'\b(?:arrest|warrant|law enforcement|court notice|penalty|fine|legal action)\b', 30, "Coercive legal or enforcement intimidation"),
    (r'\b(?:unauthorized (?:activity|login|transaction|access)|security alert|compromised)\b', 22, "Fabricated security alert or breach claim")
]

# Credential and financial harvesting indicators
CREDENTIAL_PATTERNS = [
    (r'\b(?:otp|one-time pass(?:word|code)?|verification code|security code)\b', 28, "Solicitation of OTP or two-factor authentication codes"),
    (r'\b(?:pin|password|passcode|secret phrase|seed phrase)\b', 30, "Direct request for secret credentials or PINs"),
    (r'\b(?:credit card|debit card|cvv|cvc|card number|expiration date)\b', 28, "Payment card details solicitation"),
    (r'\b(?:bank account|routing number|ssn|social security|identity verification)\b', 30, "Sensitive identity or banking data request"),
    (r'\b(?:update (?:your )?(?:billing|payment|account) (?:details|info(?:rmation)?)|claim (?:your )?refund)\b', 22, "Billing update or prize/refund lure")
]

# Impersonation and hook patterns
IMPERSONATION_PATTERNS = [
    (r'\b(?:usps|fedex|dhl|ups|postal service|courier|parcel|package (?:tracking|delivery|cannot be delivered|on hold))\b', 22, "Postal/Courier delivery exception lure"),
    (r'\b(?:irs|tax refund|tax return|internal revenue|hmrc)\b', 25, "Government tax or revenue authority impersonation"),
    (r'\b(?:chase|wells fargo|bank of america|citibank|fraud department|card services)\b', 24, "Financial institution or fraud department impersonation"),
    (r'\b(?:netflix|amazon prime|apple id|icloud|microsoft 365|google account)\b', 20, "Subscription or digital account impersonation")
]

def analyze_sms_heuristics(text: str, sender: str = None) -> List[Dict[str, Any]]:
    """
    Run behavioral, urgency, impersonation, and credential-harvesting heuristics on SMS text.
    """
    heuristics = []
    lowered = text.lower()
    
    # 1. Evaluate Urgency Patterns
    urgency_hits = []
    max_urgency_score = 0
    for pattern, score, reason in URGENCY_PATTERNS:
        match = re.search(pattern, lowered, re.IGNORECASE)
        if match:
            urgency_hits.append((match.group(0), reason, score))
            max_urgency_score = max(max_urgency_score, score)

    if urgency_hits:
        reasons_str = "; ".join([f"'{hit[0]}' ({hit[1]})" for hit in urgency_hits[:3]])
        heuristics.append({
            "code": "SMS_URGENCY_PRESSURE",
            "name": "Excessive Psychological Urgency",
            "category": "urgency",
            "severity": "high" if len(urgency_hits) >= 2 or max_urgency_score >= 25 else "medium",
            "score_impact": min(sum(h[2] for h in urgency_hits[:2]), 35),
            "explanation": f"The message employs psychological urgency to provoke rapid action without verification: {reasons_str}."
        })

    # 2. Evaluate Credential / Financial Harvesting
    cred_hits = []
    for pattern, score, reason in CREDENTIAL_PATTERNS:
        match = re.search(pattern, lowered, re.IGNORECASE)
        if match:
            cred_hits.append((match.group(0), reason, score))

    if cred_hits:
        reasons_str = "; ".join([f"'{hit[0]}' ({hit[1]})" for hit in cred_hits[:3]])
        heuristics.append({
            "code": "SMS_CREDENTIAL_SOLICITATION",
            "name": "Credential or Sensitive Data Solicitation",
            "category": "credential_harvesting",
            "severity": "critical" if len(cred_hits) >= 2 else "high",
            "score_impact": min(sum(h[2] for h in cred_hits[:2]), 40),
            "explanation": f"The message solicits sensitive credentials, authentication codes, or banking information: {reasons_str}. Legitimate institutions never ask for OTPs or passwords via SMS."
        })

    # 3. Evaluate Brand / Organization Impersonation
    imp_hits = []
    for pattern, score, reason in IMPERSONATION_PATTERNS:
        match = re.search(pattern, lowered, re.IGNORECASE)
        if match:
            imp_hits.append((match.group(0), reason, score))

    brands_detected = extract_brands(text)
    if imp_hits or brands_detected:
        imp_details = [h[1] for h in imp_hits]
        if brands_detected:
            imp_details.append(f"Referenced Brand(s): {', '.join(brands_detected)}")
        
        heuristics.append({
            "code": "SMS_ORGANIZATION_IMPERSONATION",
            "name": "Organization or Authority Impersonation",
            "category": "impersonation",
            "severity": "high",
            "score_impact": 26,
            "explanation": f"The message mimics a well-known entity or public utility: {'; '.join(imp_details)}. Attackers exploit institutional trust to deceive recipients."
        })

    # 4. Embedded URL in unsolicited SMS
    urls = extract_urls(text)
    if urls:
        heuristics.append({
            "code": "SMS_EMBEDDED_LINK",
            "name": "Embedded Unverified Hyperlink",
            "category": "url_structure",
            "severity": "medium",
            "score_impact": 20,
            "explanation": f"The message contains {len(urls)} external web link(s) (e.g. {urls[0]}). Unsolicited SMS links are the primary vector for smishing and credential capture."
        })

    # 5. Suspicious Sender ID / Spoofing check
    if sender:
        sender_clean = sender.strip()
        # Sender looks like email or irregular format
        if "@" in sender_clean:
            heuristics.append({
                "code": "SMS_EMAIL_SENDER",
                "name": "SMS Sent from Email Gateway",
                "category": "impersonation",
                "severity": "medium",
                "score_impact": 18,
                "explanation": f"The SMS sender address is an email gateway ('{sender_clean}'). Fraudsters commonly use email-to-SMS gateways to mask phone numbers and bypass telecom filters."
            })
        elif re.match(r'^\d{4,6}$', sender_clean):
            # Shortcode - note as info
            pass

    return heuristics
