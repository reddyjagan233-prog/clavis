# CLAVIS — Cross-Channel Link Analysis & Verification Intelligence System

> **Tagline:** *One scan. Multiple threat signals. Smarter protection.*

CLAVIS is a modern, responsive, mobile-first cybersecurity web application engineered to identify and dissect suspicious content across three prominent attack vectors:

1. **Suspicious SMS Messages (Smishing)**
2. **URLs & Website Links (Phishing / Deceptive Infrastructure)**
3. **QR Codes & Decoded Destinations (Quishing)**

Its key architectural differentiator is **Cross-Channel Correlation**: CLAVIS analyzes submitted indicators against historical submissions to identify shared root domains, IPs, telephone numbers, and brand targeting patterns across disparate delivery channels, exposing coordinated attacker infrastructure.

---

## 🛡️ Architecture Overview

```
                         ┌───────────────────────────────────────────────┐
                         │              CLAVIS Web UI (React)            │
                         │  Dashboard • Scanner • Reports • Graph • Logs  │
                         └──────────────────────┬────────────────────────┘
                                                │ REST API / JSON
                                                ▼
                         ┌───────────────────────────────────────────────┐
                         │             FastAPI Backend Engine            │
                         └───────┬──────────────┬──────────────┬─────────┘
                                 │              │              │
                 ┌───────────────▼─┐    ┌───────▼────────┐  ┌──▼────────────────┐
                 │ Indicator AST   │    │ Explainable    │  │ Cross-Channel     │
                 │ Extractor       │    │ Heuristic Eng  │  │ Correlator & Graph│
                 └───────────────┬─┘    └───────┬────────┘  └──┬────────────────┘
                                 │              │              │
                                 └──────────────┼──────────────┘
                                                ▼
                                  ┌───────────────────────────┐
                                  │ Risk Scorer & Explainable │
                                  │ Evidence Assessor         │
                                  └─────────────┬─────────────┘
                                                │
                                  ┌─────────────▼─────────────┐
                                  │   SQLite / PostgreSQL DB  │
                                  │  (Scans, Indicators, Graph│
                                  └───────────────────────────┘
```

### Core Components
- **Unified Indicator Extractor:** Identifies URLs, naked domains, registrable root domains, IPv4/IPv6 addresses, telephone numbers, emails, and brand targets.
- **Explainable Heuristic Engine:**
  - *URL Analysis:* Raw IP host detection, URL shortener disclosure, brand impersonation/typosquatting, Punycode homograph attacks, high-abuse TLDs, subdomain stuffing, hyphenation stuffing, credential harvesting path queries.
  - *SMS Analysis:* Urgent psychological coercion, artificial deadlines, authority impersonation, direct OTP/credential/card solicitations, email-to-SMS gateway detection.
  - *QR Code Analysis (Quishing):* Camera video frame decoding, image file decoding via OpenCV & jsQR, quishing link extraction, rogue Wi-Fi / vCard detection.
- **Cross-Channel Correlator:** Queries historical indicators to find convergent threat infrastructure across different channels (e.g. an SMS delivery lure and a parking meter QR code sharing the same malicious root domain).
- **External Threat Intelligence Integration:** Optional Google Safe Browsing and URLhaus APIs with graceful local heuristics fallback when unconfigured or offline.
- **Privacy & SSRF Protection:** Prevents loopback (`127.0.0.1`), RFC 1918 private subnets, and cloud metadata (`169.254.169.254`) targeting. Never executes submitted scripts or visits arbitrary untrusted endpoints.

---

## 🚀 Quickstart & Installation

### Prerequisites
- **Node.js** (v18+) and **npm**
- **Python** (v3.11+) or [uv](https://astral.sh/uv)

### 1. Backend Setup

```bash
cd clavis/backend

# Create virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Configure environment variables in .env
cp .env.example .env

# Run FastAPI server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend API will be available at: `http://127.0.0.1:8000`  
Interactive Swagger OpenAPI Docs: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup

```bash
cd clavis/frontend

# Install dependencies
npm install

# Start Vite dev server on port 5173
npm run dev
```

Open your browser at: `http://localhost:5173`

---

## ⚙️ Environment Variables

Store secrets in `backend/.env`. Secret keys are strictly retained on the backend and are **never exposed to the browser**:

| Variable | Description | Default / Fallback |
|---|---|---|
| `DATABASE_URL` | SQLAlchemy connection string | `sqlite:///./clavis.db` |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Google Safe Browsing v4 API Key | *None (Local heuristics active)* |
| `URLHAUS_API_KEY` | URLhaus (abuse.ch) Auth Key | *None (Local heuristics active)* |
| `LOW_THRESHOLD_MAX` | Upper limit for Low risk (0 to X) | `24` |
| `MEDIUM_THRESHOLD_MAX` | Upper limit for Medium risk (X+1 to Y) | `49` |
| `HIGH_THRESHOLD_MAX` | Upper limit for High risk (Y+1 to Z) | `74` |

---

## 🧪 Sample Demonstration Test Data

CLAVIS ships with preloaded sample demonstration data and test presets accessible directly from the UI:

### Scenario 1: Cross-Channel Courier Campaign (SMS ↔ QR Code)
1. **SMS Scan:**
   ```text
   URGENT from USPS: Your package US-8921-99 is suspended due to unpaid customs fee. Update your card at https://usps-parcel-tracking.vip/pay within 24h or it will be returned.
   Sender: +1-800-555-0199
   ```
2. **QR Code Scan:**
   Decode QR code with destination:
   ```text
   https://usps-parcel-tracking.vip/auth/login?redirect=pay
   ```
3. **Correlation Result:**
   CLAVIS flags a **Cross-Channel Correlation** alert connecting the SMS and QR submissions via the shared root domain `usps-parcel-tracking.vip`, displaying the first-seen/last-seen timestamps and mapping both onto the interactive relationship graph.

### Scenario 2: Banking Credential Harvesting (Typosquatting)
- **Submission:**
  ```text
  http://wellsfarg0-online-secure.com/auth
  ```
- **Heuristics Triggered:**
  - `BRAND_IMPERSONATION_DOMAIN` (Mimics Wells Fargo with lookalike `wellsfarg0`)
  - `CREDENTIAL_HARVESTING_PATHS` (Path contains `/auth`)
  - `HYPHEN_STUFFING` (Hyphen-separated brand masquerading)

### Scenario 3: Raw IP Host
- **Submission:**
  ```text
  http://192.88.99.12/apple-id-verify.php?token=sec99
  ```
- **Heuristics Triggered:**
  - `RAW_IP_HOST` (IP address used instead of registered domain)
  - `BRAND_IMPERSONATION_DOMAIN` (Apple ID mimicry in path)

### Scenario 4: Benign Baseline (Honest Evidence Representation)
- **Submission:**
  ```text
  https://en.wikipedia.org/wiki/Computer_security
  ```
- **Output:**
  - Risk Level: `Low` (Score: 0)
  - Evidence Statement: *"Insufficient evidence — treat this submission with caution and verify independently. Absence of known threat intelligence matches or heuristic triggers does not guarantee that a link, sender, or destination is safe."*

---

## 🔒 Privacy & Safety Guarantees

1. **Zero Untrusted Execution:** Submitted links and messages are parsed via regular expressions and URL abstract syntax trees. CLAVIS **never** executes untrusted JavaScript or opens destination pages directly.
2. **SSRF Guard:** Server-side inspection strictly blocks private IP address ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local/cloud metadata (`169.254.169.254`), and carrier-grade NATs.
3. **Data Hygiene & Purge:** Users can wipe their entire scan history and indicator database at any time with a single click from the **Scan History** or **Settings** page.
4. **Honesty Clause:** CLAVIS never claims 100% detection accuracy. A low risk score is clearly communicated as "insufficient evidence" rather than definitive certification of safety.

---

## 📋 Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, jsQR, Vite.
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Pydantic v2, Pillow, OpenCV (headless), HTTPX.
- **Database:** SQLite (default) / PostgreSQL-ready.
- **Architecture:** Decoupled REST API with modular engine pipelines.
