"""Request validation helpers."""
from __future__ import annotations

from pydantic import BaseModel, ValidationError
from rest_framework.response import Response

from trip.domain.models import TripRequest
from trip.api.serializers import TripRequestSerializer


def parse_trip_request(data: object) -> TripRequest | Response:
    serializer = TripRequestSerializer(data=data)
    if not serializer.is_valid():
        return Response(
            {"error": "invalid_request", "detail": serializer.errors},
            status=400,
        )
    return TripRequest(**serializer.validated_data)


def parse_body(model_cls: type[BaseModel], data: object) -> BaseModel | Response:
    try:
        return model_cls.model_validate(data)
    except ValidationError as exc:
        return Response(
            {"error": "invalid_request", "detail": exc.errors()},
            status=400,
        )
