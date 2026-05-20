"""URL patterns for the trip app."""
from django.conf import settings
from django.urls import path

from trip.api.views import TripEnrichView, TripRouteView, TripScheduleView

urlpatterns = [
    path("trip/route/", TripRouteView.as_view(), name="trip-route"),
    path("trip/schedule/", TripScheduleView.as_view(), name="trip-schedule"),
    path("trip/enrich/", TripEnrichView.as_view(), name="trip-enrich"),
]

if settings.DEBUG or getattr(settings, "ENABLE_VERIFICATION", False):
    from trip.verification.views import (
        VerificationRouteDetailView,
        VerificationRouteExportView,
        VerificationRouteListView,
    )

    urlpatterns += [
        path(
            "verification/routes/",
            VerificationRouteListView.as_view(),
            name="verification-routes-list",
        ),
        path(
            "verification/routes/<slug:slug>/",
            VerificationRouteDetailView.as_view(),
            name="verification-routes-detail",
        ),
        path(
            "verification/routes/<slug:slug>/export/",
            VerificationRouteExportView.as_view(),
            name="verification-routes-export",
        ),
    ]
