from app.api.scans import router as scans_router
from app.api.history import router as history_router
from app.api.correlations import router as correlations_router
from app.api.stats import router as stats_router
from app.api.settings_api import router as settings_router

__all__ = [
    "scans_router",
    "history_router",
    "correlations_router",
    "stats_router",
    "settings_router"
]
