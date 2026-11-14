import re
import ipaddress
import socket
from urllib.parse import urlparse, parse_qs
from typing import List, Dict, Any, Tuple
from app.engine.extractor import extract_root_domain, SUSPICIOUS_TLDS, KNOWN_BRANDS

# Known legitimate domains for major brands
LEGIT_BRAND_DOMAINS = {
    "apple": ["apple.com", "icloud.com"],
    "amazon": ["amazon.com", "amazon.co.uk", "amazon.de", "aws.amazon.com"],
    "paypal": ["paypal.com", "paypal.me"],
    "chase": ["chase.com", "jpmorganchase.com"],
    "wells fargo": ["wellsfargo.com"],
    "bank of america": ["bankofamerica.com", "bofa.com"],
    "citibank": ["citi.com", "citibank.com"],
    "netflix": ["netflix.com"],
    "microsoft": ["microsoft.com", "live.com", "office.com", "azure.com"],
    "google": ["google.com", "gmail.com", "youtube.com", "withgoogle.com"],
    "usps": ["usps.com"],
    "fedex": ["fedex.com"],
    "dhl": ["dhl.com", "dhl.de"],
    "ups": ["ups.com"],
    "irs": ["irs.gov"],
    "meta": ["facebook.com", "meta.com", "instagram.com", "whatsapp.com"],
    "binance": ["binance.com"],
    "coinbase": ["coinbase.com"]
}

# Known URL shorteners
SHORTENER_DOMAINS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
    "cutt.ly", "rb.gy", "rebrand.ly", "tiny.cc", "shorturl.at", "t.ly", "s.id"
}

# Sensitive credential and phishing keywords in path or query
CREDENTIAL_KEYWORDS = [
    "login", "signin", "sign-in", "log-in", "verify", "verification", "secure",
    "account", "banking", "wallet", "password", "passcode", "security", "update",
    "authenticate", "2fa", "otp", "confirm", "validation", "identity", "billing"
]

# SSRF Protected IP ranges
PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("10.0.0.0/8"),       # Private RFC 1918
    ipaddress.ip_network("172.16.0.0/12"),    # Private RFC 1918
    ipaddress.ip_network("192.168.0.0/16"),   # Private RFC 1918
    ipaddress.ip_network("169.254.0.0/16"),   # Link-local / Cloud metadata (169.254.169.254)
    ipaddress.ip_network("100.64.0.0/10"),    # Carrier-grade NAT
    ipaddress.ip_network("0.0.0.0/8"),        # Current network
    ipaddress.ip_network("224.0.0.0/4"),      # Multicast
    ipaddress.ip_network("240.0.0.0/4"),      # Reserved
    ipaddress.ip_network("::1/128"),          # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),        # IPv6 link-local
]

def check_ssrf_safety(hostname: str) -> Tuple[bool, str]:
    """
    Validates whether a hostname resolves to a restricted internal or metadata IP.
    Returns (is_safe, reason). Instantaneous AST/Lexical evaluation with zero network blocking.
    """
    if not hostname:
        return False, "Empty hostname provided"
        
    # Check if host is direct IP
    try:
        ip_obj = ipaddress.ip_address(hostname)
        for net in PRIVATE_NETWORKS:
            if ip_obj in net:
                return False, f"Host points to restricted/private IP address: {hostname}"
        return True, "Public IP address"
    except ValueError:
        pass

    # Check for localhost and cloud metadata variations
    lower_host = hostname.lower()
    restricted_names = [
        "localhost", "metadata.google.internal", "instance-data",
        "169.254.169.254", "metadata", "local", "internal",
        "0.0.0.0", "[::1]", "ip6-localhost", "ip6-loopback"
    ]
    if lower_host in restricted_names or lower_host.endswith((".local", ".internal", ".localhost", ".localdomain")):
        return False, f"Host name '{hostname}' is a restricted local or cloud metadata target"

    return True, "Safe external destination"

def normalize_url(raw_url: str) -> str:
    """Ensure URL has scheme and clean trailing punctuation."""
    cleaned = raw_url.strip().rstrip('.,;:!?)"\'')
    if not re.match(r'^[a-zA-Z]+://', cleaned):
        cleaned = "https://" + cleaned
    return cleaned

def analyze_url_heuristics(url_str: str) -> List[Dict[str, Any]]:
    """
    Run deep lexical, structural, and domain-reputation heuristics on a URL.
    Returns a list of triggered HeuristicDetail dictionaries.
    """
    heuristics = []
    normalized = normalize_url(url_str)
    
    try:
        parsed = urlparse(normalized)
    except Exception as e:
        heuristics.append({
            "code": "MALFORMED_URL",
            "name": "Malformed URL Structure",
            "category": "url_structure",
            "severity": "high",
            "score_impact": 35,
            "explanation": f"The URL cannot be parsed reliably: {str(e)}"
        })
        return heuristics

    hostname = (parsed.hostname or "").lower()
    path = parsed.path.lower()
    query = parsed.query.lower()
    root_domain = extract_root_domain(hostname)

    # 1. SSRF Safety Check
    is_safe, ssrf_reason = check_ssrf_safety(hostname)
    if not is_safe:
        heuristics.append({
            "code": "SSRF_RESTRICTED_HOST",
            "name": "Restricted Network / Internal Target",
            "category": "url_structure",
            "severity": "critical",
            "score_impact": 65,
            "explanation": f"Security restriction: {ssrf_reason}. This pattern is typical of SSRF or internal reconnaissance."
        })

    # 2. Raw IP address instead of domain
    try:
        ipaddress.ip_address(hostname)
        heuristics.append({
            "code": "RAW_IP_HOST",
            "name": "Raw IP Address as Host",
            "category": "url_structure",
            "severity": "high",
            "score_impact": 30,
            "explanation": f"The URL uses a raw IP address ({hostname}) rather than a registered domain name. Legitimate services virtually never link directly to raw IPs."
        })
    except ValueError:
        pass

    # 3. URL Shortener detection
    if hostname in SHORTENER_DOMAINS or root_domain in SHORTENER_DOMAINS:
        heuristics.append({
            "code": "URL_SHORTENER",
            "name": "URL Shortener Redirection",
            "category": "url_structure",
            "severity": "medium",
            "score_impact": 20,
            "explanation": f"The domain '{hostname}' is a known URL shortening service. Shorteners obscure the true destination and are frequently used in smishing and phishing campaigns."
        })

    # 4. Suspicious TLD check
    tld = hostname.split('.')[-1] if '.' in hostname else ""
    if tld in SUSPICIOUS_TLDS:
        heuristics.append({
            "code": "SUSPICIOUS_TLD",
            "name": f"High-Abuse Top Level Domain (.{tld})",
            "category": "domain_reputation",
            "severity": "medium",
            "score_impact": 22,
            "explanation": f"The top-level domain '.{tld}' has a statistically elevated association with disposable phishing, smishing, and malware hosting."
        })

    # 5. Excessive subdomains (subdomain stuffing)
    subdomains = hostname.split('.')
    if len(subdomains) >= 5:
        heuristics.append({
            "code": "SUBDOMAIN_STUFFING",
            "name": "Excessive Subdomain Depth",
            "category": "url_structure",
            "severity": "high",
            "score_impact": 28,
            "explanation": f"The domain contains {len(subdomains)} hierarchy segments. Subdomain stuffing is often used to deceive users into believing they are visiting an authentic site."
        })
    elif len(subdomains) == 4:
        heuristics.append({
            "code": "MULTIPLE_SUBDOMAINS",
            "name": "Multiple Subdomain Layers",
            "category": "url_structure",
            "severity": "low",
            "score_impact": 10,
            "explanation": f"The domain uses multiple subdomain segments ({hostname})."
        })

    # 6. Hyphen stuffing in domain
    hyphen_count = hostname.count('-')
    if hyphen_count >= 3:
        heuristics.append({
            "code": "HYPHEN_STUFFING",
            "name": "Excessive Hyphenation in Domain",
            "category": "url_structure",
            "severity": "medium",
            "score_impact": 24,
            "explanation": f"Domain contains {hyphen_count} hyphens ('{hostname}'). Attackers frequently string words together with hyphens (e.g. 'verify-secure-account-update') to mimic brand names."
        })
    elif hyphen_count == 2:
        heuristics.append({
            "code": "HYPHENATED_DOMAIN",
            "name": "Compound Hyphenated Domain",
            "category": "url_structure",
            "severity": "low",
            "score_impact": 8,
            "explanation": f"Domain contains multiple hyphens ('{hostname}')."
        })

    # 7. Brand impersonation / Typosquatting
    for brand, legit_domains in LEGIT_BRAND_DOMAINS.items():
        brand_clean = brand.replace(" ", "")
        if brand_clean in hostname:
            # Check if it's NOT an authentic domain
            is_legit = any(hostname == ld or hostname.endswith("." + ld) for ld in legit_domains)
            if not is_legit:
                heuristics.append({
                    "code": "BRAND_IMPERSONATION_DOMAIN",
                    "name": f"Deceptive Brand Mimicry ({brand.title()})",
                    "category": "impersonation",
                    "severity": "critical",
                    "score_impact": 45,
                    "explanation": f"The domain '{hostname}' incorporates the '{brand.title()}' brand name but does not belong to an authentic brand domain ({', '.join(legit_domains)}). This is a strong indicator of phishing."
                })
                break

    # 8. Punycode / Internationalized Domain Name (IDN) Homograph attack check
    if hostname.startswith("xn--") or ".xn--" in hostname:
        heuristics.append({
            "code": "PUNYCODE_HOMOGRAPH",
            "name": "Punycode / Homograph Lookalike Domain",
            "category": "domain_reputation",
            "severity": "high",
            "score_impact": 35,
            "explanation": f"The domain '{hostname}' uses Punycode encoding (xn--). Homograph attacks leverage lookalike unicode characters from Cyrillic or Greek alphabets to mimic legitimate domains."
        })

    # 9. Credential harvesting keywords in path or query
    found_cred_words = []
    combined_path_query = f"{path}?{query}"
    for kw in CREDENTIAL_KEYWORDS:
        if re.search(r'(?:^|[/?&=-])' + re.escape(kw) + r'(?:[/?&=-]|$)', combined_path_query):
            found_cred_words.append(kw)

    if found_cred_words:
        heuristics.append({
            "code": "CREDENTIAL_HARVESTING_PATHS",
            "name": "Credential Harvesting Path Patterns",
            "category": "credential_harvesting",
            "severity": "high",
            "score_impact": min(len(found_cred_words) * 12, 32),
            "explanation": f"The URL path or query contains sensitive authentication keywords: {', '.join(found_cred_words)}. This pattern is standard in credential harvesting pages."
        })

    # 10. Open redirect parameter patterns
    redirect_params = ["redirect", "url", "next", "dest", "target", "r", "link", "goto", "return"]
    params = parse_qs(query)
    for p in redirect_params:
        if p in params:
            heuristics.append({
                "code": "POTENTIAL_OPEN_REDIRECT",
                "name": "Redirection Parameter Detected",
                "category": "url_structure",
                "severity": "medium",
                "score_impact": 18,
                "explanation": f"The parameter '{p}' was found in the URL query string. Attackers use open redirects on legitimate or compromised domains to route victims to malicious landing sites."
            })
            break

    # 11. Non-standard HTTP ports
    if parsed.port and parsed.port not in (80, 443, 8080):
        heuristics.append({
            "code": "NON_STANDARD_PORT",
            "name": f"Non-Standard Port ({parsed.port})",
            "category": "url_structure",
            "severity": "medium",
            "score_impact": 15,
            "explanation": f"The URL connects on uncommon port {parsed.port}. Most consumer services run strictly on ports 80 (HTTP) or 443 (HTTPS)."
        })

    return heuristics
