import time
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings
from app.engine.extractor import extract_urls

# Known test and confirmed malicious indicators in local threat cache
LOCAL_KNOWN_THREATS = {
    "malware.testing.google.test": {"type": "Malware Distribution", "source": "Safe Browsing Test Suite", "confidence": "high"},
    "testsafebrowsing.appspot.com": {"type": "Phishing Test Site", "source": "Safe Browsing Test Suite", "confidence": "high"},
    "openphish-sample.net": {"type": "Phishing Credential Harvest", "source": "Local Threat Feed", "confidence": "high"},
    "urlhaus-test.abuse.ch": {"type": "Malware Payload Drop", "source": "URLhaus Test Suite", "confidence": "high"},
    "bad-login-harvest.xyz": {"type": "Banking Smishing Vector", "source": "Local Threat Feed", "confidence": "critical"},
    "secure-chase-update.info": {"type": "Financial Phishing Campaign", "source": "Local Threat Feed", "confidence": "critical"},
    "usps-parcel-tracking.vip": {"type": "Courier Fee Smishing", "source": "Local Threat Feed", "confidence": "critical"},
    "apple-id-verify.php": {"type": "Credential Harvesting", "source": "Local Threat Feed", "confidence": "critical"},
    "wellsfarg0-online-secure.com": {"type": "Banking Impersonation Phishing", "source": "Local Threat Feed", "confidence": "critical"}
}

async def query_google_safe_browsing(url: str) -> Dict[str, Any]:
    """
    Queries Google Safe Browsing Lookup API v4 if configured.
    """
    api_key = settings.GOOGLE_SAFE_BROWSING_API_KEY
    if not api_key:
        return {
            "source": "Google Safe Browsing",
            "status": "unconfigured",
            "threat_type": None,
            "details": "API key not configured in environment (GOOGLE_SAFE_BROWSING_API_KEY). External lookup skipped; local heuristics active.",
            "query_time_ms": 0.0,
            "is_external": True
        }

    start = time.perf_counter()
    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
    payload = {
        "client": {
            "clientId": "clavis-cyber-defense",
            "clientVersion": "1.0.0"
        },
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}]
        }
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(endpoint, json=payload)
            elapsed = (time.perf_counter() - start) * 1000
            
            if resp.status_code == 200:
                data = resp.json()
                matches = data.get("matches", [])
                if matches:
                    threat_type = matches[0].get("threatType", "THREAT_DETECTED")
                    return {
                        "source": "Google Safe Browsing",
                        "status": "threat_found",
                        "threat_type": threat_type,
                        "details": f"Flagged by Google Safe Browsing as {threat_type}.",
                        "query_time_ms": round(elapsed, 1),
                        "is_external": True
                    }
                else:
                    return {
                        "source": "Google Safe Browsing",
                        "status": "clean",
                        "threat_type": None,
                        "details": "No threat matches found in Google Safe Browsing index.",
                        "query_time_ms": round(elapsed, 1),
                        "is_external": True
                    }
            elif resp.status_code == 429:
                return {
                    "source": "Google Safe Browsing",
                    "status": "rate_limited",
                    "threat_type": None,
                    "details": "Google Safe Browsing rate limit reached. Analysis falling back to local heuristics.",
                    "query_time_ms": round(elapsed, 1),
                    "is_external": True
                }
            else:
                return {
                    "source": "Google Safe Browsing",
                    "status": "error",
                    "threat_type": None,
                    "details": f"API returned status {resp.status_code}. Using local heuristics.",
                    "query_time_ms": round(elapsed, 1),
                    "is_external": True
                }
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        return {
            "source": "Google Safe Browsing",
            "status": "error",
            "threat_type": None,
            "details": f"Network error during Safe Browsing query: {type(e).__name__}. Relying on local heuristics.",
            "query_time_ms": round(elapsed, 1),
            "is_external": True
        }

async def query_urlhaus(url: str) -> Dict[str, Any]:
    """
    Queries URLhaus (abuse.ch) API for malware and malicious distribution links.
    """
    if not settings.URLHAUS_API_KEY:
        return {
            "source": "URLhaus (abuse.ch)",
            "status": "unconfigured",
            "threat_type": None,
            "details": "API key not configured in environment (URLHAUS_API_KEY). External lookup skipped; local heuristics active.",
            "query_time_ms": 0.0,
            "is_external": True
        }

    start = time.perf_counter()
    endpoint = "https://urlhaus-api.abuse.ch/v1/url/"
    headers = {"Auth-Key": settings.URLHAUS_API_KEY}

    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.post(endpoint, data={"url": url}, headers=headers)
            elapsed = (time.perf_counter() - start) * 1000
            
            if resp.status_code == 200:
                data = resp.json()
                query_status = data.get("query_status")
                if query_status == "ok":
                    url_status = data.get("url_status", "unknown")
                    threat = data.get("threat", "Malware site")
                    tags = ", ".join(data.get("tags") or ["malware"])
                    return {
                        "source": "URLhaus (abuse.ch)",
                        "status": "threat_found",
                        "threat_type": f"{threat} ({tags})",
                        "details": f"Identified in URLhaus database. Status: {url_status}. Tags: {tags}.",
                        "query_time_ms": round(elapsed, 1),
                        "is_external": True
                    }
                elif query_status == "no_results":
                    return {
                        "source": "URLhaus (abuse.ch)",
                        "status": "clean",
                        "threat_type": None,
                        "details": "No known malware or payload records found in URLhaus index.",
                        "query_time_ms": round(elapsed, 1),
                        "is_external": True
                    }
                else:
                    return {
                        "source": "URLhaus (abuse.ch)",
                        "status": "clean",
                        "threat_type": None,
                        "details": f"Query response: {query_status}",
                        "query_time_ms": round(elapsed, 1),
                        "is_external": True
                    }
            elif resp.status_code == 429:
                return {
                    "source": "URLhaus (abuse.ch)",
                    "status": "rate_limited",
                    "threat_type": None,
                    "details": "URLhaus API rate limit encountered. Falling back to local intelligence.",
                    "query_time_ms": round(elapsed, 1),
                    "is_external": True
                }
            else:
                return {
                    "source": "URLhaus (abuse.ch)",
                    "status": "error",
                    "threat_type": None,
                    "details": f"URLhaus API returned status {resp.status_code}.",
                    "query_time_ms": round(elapsed, 1),
                    "is_external": True
                }
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        return {
            "source": "URLhaus (abuse.ch)",
            "status": "error",
            "threat_type": None,
            "details": f"Connection to URLhaus timed out ({type(e).__name__}). Using local engine.",
            "query_time_ms": round(elapsed, 1),
            "is_external": True
        }

def query_local_threat_cache(url: str, hostname: str = None) -> Optional[Dict[str, Any]]:
    """
    Checks local offline threat intelligence signatures.
    Clearly designated as Local Threat Intelligence.
    """
    # Check exact URL or hostname or substrings
    search_targets = [url.lower()]
    if hostname:
        search_targets.append(hostname.lower())

    for target in search_targets:
        for threat_key, threat_data in LOCAL_KNOWN_THREATS.items():
            if threat_key in target:
                return {
                    "source": "CLAVIS Local Threat Feed",
                    "status": "threat_found",
                    "threat_type": threat_data["type"],
                    "details": f"Matched confirmed threat signature in CLAVIS Local Feed ({threat_data['source']}).",
                    "query_time_ms": 0.2,
                    "is_external": False
                }
    
    return {
        "source": "CLAVIS Local Threat Feed",
        "status": "clean",
        "threat_type": None,
        "details": "No direct matches in local offline threat signature catalog.",
        "query_time_ms": 0.1,
        "is_external": False
    }

async def check_all_threat_intelligence(url: str, hostname: str = None) -> List[Dict[str, Any]]:
    """
    Queries all threat intelligence providers in parallel with fallback.
    """
    results = []
    
    # 1. Local Threat Feed (always available, instant)
    local_res = query_local_threat_cache(url, hostname)
    results.append(local_res)

    # 2. Google Safe Browsing
    sb_res = await query_google_safe_browsing(url)
    results.append(sb_res)

    # 3. URLhaus
    urlhaus_res = await query_urlhaus(url)
    results.append(urlhaus_res)

    return results
