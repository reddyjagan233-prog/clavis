from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.scans import router as scans_router
from app.api.history import router as history_router
from app.api.correlations import router as correlations_router
from app.api.stats import router as stats_router
from app.api.settings_api import router as settings_router
from app.models.scan import Scan
from app.services.scan_service import execute_sms_scan, execute_url_scan, execute_qr_scan

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clavis")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    logger.info("CLAVIS Database tables initialized.")

    # Auto-seed initial test data if database is empty
    db = SessionLocal()
    try:
        if db.query(Scan).count() == 0:
            logger.info("Initializing CLAVIS with sample demonstration data...")
            # 1. SMS with malicious courier lure
            await execute_sms_scan(
                db,
                "URGENT from USPS: Your parcel US-8921-99 is suspended due to unpaid customs fee. Update your card at https://usps-parcel-tracking.vip/pay within 24h or it will be returned.",
                sender="+1-800-555-0199"
            )
            # 2. QR code with matching courier domain (Cross-channel link)
            await execute_qr_scan(
                db,
                "https://usps-parcel-tracking.vip/auth/login?redirect=pay",
                filename="parking_meter_quishing_sticker.png"
            )
            # 3. Banking Smishing
            await execute_sms_scan(
                db,
                "WELLS FARGO ALERT: Unauthorized login attempt detected from IP 192.88.99.12. Account locked. Verify immediately at http://wellsfarg0-online-secure.com/auth or call 800-555-0199",
                sender="fraud-dept@wellsfargo-notice.com"
            )
            # 4. URL submission with same banking phishing domain
            await execute_url_scan(
                db,
                "http://wellsfarg0-online-secure.com/reset-credentials"
            )
            # 5. Benign site
            await execute_url_scan(
                db,
                "https://en.wikipedia.org/wiki/Computer_security"
            )
            logger.info("Sample demonstration data created.")
    except Exception as e:
        logger.error(f"Failed to auto-seed initial data: {e}")
    finally:
        db.close()

    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Cross-Channel Link Analysis & Verification Intelligence System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(scans_router)
app.include_router(history_router)
app.include_router(correlations_router)
app.include_router(stats_router)
app.include_router(settings_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "active",
        "threat_intel_mode": "hybrid_local_external"
    }

# Mount static frontend production build if available
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes or docs
        if full_path.startswith("api") or full_path in ["docs", "openapi.json", "redoc"]:
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "system": settings.APP_NAME,
            "tagline": settings.APP_TAGLINE,
            "status": "operational",
            "version": "1.0.0",
            "docs": "/docs"
        }
