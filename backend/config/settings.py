"""Django settings for hos-trip-planner."""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "django-insecure-dev-key-change-in-production-hos-trip-planner",
)

DEBUG = os.environ.get("DEBUG", "True") == "True"

if not DEBUG and SECRET_KEY.startswith("django-insecure"):
    raise ImproperlyConfigured(
        "SECRET_KEY must be set to a secure value in production. "
        "Set the SECRET_KEY environment variable."
    )

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "trip",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"

WSGI_APPLICATION = "config.wsgi.application"

# No database — this app is stateless
DATABASES = {}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "trip": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [] if DEBUG else os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
}

# ---------------------------------------------------------------------------
# External API credentials
# ---------------------------------------------------------------------------
MAPS_API_KEY: str = os.environ.get("MAPS_API_KEY", "")
ORS_BASE_URL: str = os.environ.get("ORS_BASE_URL", "https://api.openrouteservice.org")

# ---------------------------------------------------------------------------
# HOS / trip constants
# ---------------------------------------------------------------------------
AVERAGE_TRUCK_SPEED_MPH: float = 55.0
DUTY_START_TIME: str = "08:00"
MAX_DRIVE_HRS_PER_DAY: float = 11.0
MAX_DUTY_WINDOW_HRS: float = 14.0
MAX_CYCLE_HRS: float = 70.0
DRIVE_HRS_BEFORE_BREAK: float = 8.0
REQUIRED_BREAK_HRS: float = 0.5
REQUIRED_REST_HRS: float = 10.0
RESTART_HRS: float = 34.0
MAX_MILES_BEFORE_FUEL: float = 950.0
STOP_DURATION_HRS: float = 1.0
FUEL_STOP_DURATION_HRS: float = 0.5
ROUTE_CORRIDOR_MILES: float = 5.0
