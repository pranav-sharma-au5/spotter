"""DRF serializers for the trip planning API."""
from rest_framework import serializers


class TripRequestSerializer(serializers.Serializer):
    current_location = serializers.CharField(max_length=500)
    pickup_location = serializers.CharField(max_length=500)
    dropoff_location = serializers.CharField(max_length=500)
    cycle_used_hrs = serializers.FloatField(min_value=0, max_value=70)
