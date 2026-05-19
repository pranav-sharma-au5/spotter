"""URL patterns for the trip app."""
from django.urls import path

from trip.views import TripPlanView

urlpatterns = [
    path("trip/plan/", TripPlanView.as_view(), name="trip-plan"),
]
