"""Vercel Python Serverless Function — Django WSGI entrypoint.

Vercel routes all /api/* requests here. Django's URL router then dispatches
to the appropriate view based on the full path (e.g. /api/v1/trip/route/).
"""
import os
import sys

# Make the backend package importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.core.wsgi import get_wsgi_application  # noqa: E402

app = get_wsgi_application()
