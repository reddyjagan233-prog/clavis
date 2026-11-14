import re
from urllib.parse import urlparse
from typing import List, Dict, Any, Set, Tuple
import ipaddress

# Regex patterns
URL_REGEX = re.compile(
    r'(?:https?:\/\/|www\.)[^\s<>"\'{}|\\^`]+|(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|net|org|edu|gov|mil|xyz|top|info|biz|club|site|online|live|vip|co|io|me|app|dev|ru|cn|in|cc|tk|ml|ga|cf|gq|pw|buzz|rest|quest|work|click|zip|mov)\b[^\s<>"\'{}|\\^`]*',
    re.IGNORECASE
)

PHONE_REGEX = re.compile(
    r'(?:\+?(\d{1,3})[-.\s]?)?(?:\(?(\d{3})\)?[-.\s]?)?(\d{3})[-.\s]?(\d{4})\b'
)

EMAIL_REGEX = re.compile(
    r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+',
    re.IGNORECASE
)

IPV4_REGEX = re.compile(
    r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
)

# Common brand targets for impersonation
KNOWN_BRANDS = {
    "usps": ["usps", "united states postal", "postal service", "post office"],
    "fedex": ["fedex", "federal express"],
    "dhl": ["dhl", "dhl express"],
    "ups": ["ups", "united parcel service"],
    "apple": ["apple", "icloud", "apple id", "apple support", "itunes"],
    "amazon": ["amazon", "amazon prime", "aws"],
    "paypal": ["paypal"],
    "chase": ["chase", "jpmorgan", "chase bank"],
    "wells fargo": ["wells fargo", "wellsfargo"],
    "bank of america": ["bank of america", "bofa"],
    "citibank": ["citibank", "citi"],
    "netflix": ["netflix"],
    "microsoft": ["microsoft", "office365", "outlook", "onedrive"],
    "google": ["google", "gmail", "google drive", "google security"],
    "irs": ["irs", "internal revenue service", "tax refund"],
    "meta": ["facebook", "meta", "instagram", "whatsapp"],
    "telegram": ["telegram"],
    "binance": ["binance"],
    "coinbase": ["coinbase"],
}

# Suspicious high-risk TLDs commonly used in phishing/quishing/smishing
SUSPICIOUS_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "buzz", "work", "click", "vip",
    "cc", "ru", "cn", "rest", "quest", "link", "live", "country", "stream",
    "zip", "mov", "cam", "fit", "surf", "icu", "bar", "lat"
}

def extract_urls(text: str) -> List[str]:
    """Find and normalize all URLs and domain-like links in text."""
    found = []
    seen = set()
    for match in URL_REGEX.finditer(text):
        raw_url = match.group(0).rstrip('.,;:!?)"\'')
        # Normalize
        normalized = raw_url
        if not re.match(r'^[a-zA-Z]+://', raw_url):
            normalized = "https://" + raw_url
        if normalized.lower() not in seen:
            seen.add(normalized.lower())
            found.append(normalized)
    return found

def extract_phone_numbers(text: str) -> List[str]:
    """Find valid looking phone numbers in text."""
    found = []
    seen = set()
    # Avoid matching dates or small numbers
    for match in PHONE_REGEX.finditer(text):
        num_str = match.group(0).strip()
        # Ensure it has at least 7 digits
        digits = re.sub(r'\D', '', num_str)
        if 7 <= len(digits) <= 15:
            # Clean formatting
            clean = re.sub(r'[\s.-]', '', num_str)
            if clean not in seen:
                seen.add(clean)
                found.append(num_str)
    return found

def extract_emails(text: str) -> List[str]:
    """Find email addresses in text."""
    found = []
    seen = set()
    for match in EMAIL_REGEX.finditer(text):
        email = match.group(0).lower().strip()
        if email not in seen:
            seen.add(email)
            found.append(email)
    return found

def extract_ips(text: str) -> List[str]:
    """Find IPv4 addresses in text."""
    found = []
    seen = set()
    for match in IPV4_REGEX.finditer(text):
        ip_str = match.group(0)
        try:
            ip_obj = ipaddress.ip_address(ip_str)
            if ip_str not in seen:
                seen.add(ip_str)
                found.append(ip_str)
        except ValueError:
            pass
    return found

def extract_root_domain(hostname: str) -> str:
    """
    Extract registrable root domain (e.g., 'login.chase.com.evil.co' -> 'evil.co',
    'secure-update.usps-tracking.vip' -> 'usps-tracking.vip').
    """
    if not hostname:
        return ""
    
    # Strip port if present
    host = hostname.split(':')[0].lower().strip('.')
    
    # If host is an IP address, return host as is
    try:
        ipaddress.ip_address(host)
        return host
    except ValueError:
        pass
    
    parts = host.split('.')
    if len(parts) <= 2:
        return host
    
    # Handle two-part TLDs (e.g. .co.uk, .com.au, .org.uk)
    two_part_tlds = {"co.uk", "org.uk", "gov.uk", "com.au", "net.au", "co.nz", "com.br", "co.jp"}
    if len(parts) >= 3 and f"{parts[-2]}.{parts[-1]}" in two_part_tlds:
        return '.'.join(parts[-3:])
    
    return '.'.join(parts[-2:])

def extract_brands(text: str) -> List[str]:
    """Detect targeted brands mentioned in text or domain."""
    lowered = text.lower()
    targeted = []
    for brand_key, keywords in KNOWN_BRANDS.items():
        for kw in keywords:
            # Word boundary check for short names
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, lowered):
                targeted.append(brand_key.title())
                break
    return list(dict.fromkeys(targeted))

def extract_all_indicators(text: str, context_url: str = None) -> List[Dict[str, Any]]:
    """
    Extract comprehensive normalized indicators from text or URL.
    Returns a list of dicts with type, value, severity, and label.
    """
    indicators = []
    seen_keys = set()

    def add_ind(itype: str, value: str, severity: str, label: str = None):
        key = f"{itype}:{value.lower().strip()}"
        if key not in seen_keys and value.strip():
            seen_keys.add(key)
            indicators.append({
                "type": itype,
                "value": value.strip(),
                "severity": severity,
                "label": label or itype.replace("_", " ").title()
            })

    # 1. Process explicit URLs
    urls = extract_urls(text)
    if context_url and context_url not in urls:
        urls.insert(0, context_url)

    for u in urls:
        add_ind("url", u, "suspicious", "Discovered Link")
        try:
            parsed = urlparse(u)
            hostname = parsed.hostname or ""
            if hostname:
                add_ind("domain", hostname.lower(), "suspicious", "Host Domain")
                root = extract_root_domain(hostname)
                if root and root != hostname.lower():
                    add_ind("root_domain", root.lower(), "suspicious", "Root Domain")
                
                # Check if host is raw IP
                try:
                    ipaddress.ip_address(hostname)
                    add_ind("ip", hostname, "malicious", "Raw Host IP Address")
                except ValueError:
                    pass
        except Exception:
            pass

    # 2. Standalone IPs
    for ip in extract_ips(text):
        add_ind("ip", ip, "suspicious", "IP Address")

    # 3. Phone numbers
    for phone in extract_phone_numbers(text):
        add_ind("phone", phone, "info", "Contact Phone")

    # 4. Email addresses
    for email in extract_emails(text):
        add_ind("email", email, "info", "Contact Email")

    # 5. Targeted brands
    for brand in extract_brands(text):
        add_ind("brand_target", brand, "suspicious", f"Targeted Brand ({brand})")

    return indicators
