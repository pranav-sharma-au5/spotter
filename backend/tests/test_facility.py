"""Unit tests for FacilityService."""
from trip.domain.enums import EventType, FacilityType
from trip.domain.models import Facility, StopInfo
from trip.services.facility import FacilityService
from trip.core.utils import cumulative_miles


def test_facility_projected_onto_route(sample_route_geometry):
    """A facility sitting right on the route should project with near-zero perp distance."""
    service = FacilityService(corridor_miles=5.0)

    geometry = sample_route_geometry
    cum = cumulative_miles(geometry)

    a = geometry[0]
    b = geometry[1]
    mid_lat = (a.lat + b.lat) / 2
    mid_lng = (a.lng + b.lng) / 2

    result = service._project_onto_route(mid_lat, mid_lng, geometry, cum)
    assert result is not None
    miles_from_start, perp_dist = result
    assert perp_dist < 0.5
    assert miles_from_start >= 0.0


def test_facility_too_far_from_route_excluded(sample_route_geometry):
    service = FacilityService(corridor_miles=5.0)
    geometry = sample_route_geometry
    cum = cumulative_miles(geometry)

    result = service._project_onto_route(50.0, -120.0, geometry, cum)
    assert result is not None
    _, perp_dist = result
    assert perp_dist > 5.0


def test_format_name_includes_city_and_ref():
    tags = {
        "name": "Love's Travel Stop",
        "brand": "Love's",
        "ref": "142",
        "addr:city": "Ogden",
        "addr:state": "UT",
    }
    name = FacilityService._format_facility_name(tags, {}, "fuel")
    assert "Love" in name
    assert "142" in name
    assert "Ogden" in name


def test_format_name_uses_brand_not_fuel_category():
    tags = {"brand": "Flying J"}
    name = FacilityService._format_facility_name(
        tags, {"596": {"category_name": "fuel"}}, "fuel"
    )
    assert name == "Flying J"
    assert name != "Fuel"


def test_format_name_falls_back_to_gas_station_not_fuel():
    name = FacilityService._format_facility_name({}, {"596": {"category_name": "fuel"}}, "fuel")
    assert name == "Gas Station"


def test_populated_field_count_prefers_rich_poi():
    rich_tags = {
        "name": "Pilot Travel Center",
        "brand": "Pilot",
        "ref": "412",
        "addr:city": "Casper",
        "addr:state": "WY",
        "phone": "+1-555-0100",
        "website": "https://pilot.com",
    }
    sparse_tags = {"name": "Fuel"}

    rich_info = StopInfo(city="Casper, WY", phone="+1-555-0100", website="https://pilot.com")
    sparse_info = StopInfo()

    rich_name = FacilityService._format_facility_name(rich_tags, {}, "fuel")
    sparse_name = "Gas Station"

    rich_count = FacilityService._populated_field_count(
        rich_tags, rich_info, rich_name, "fuel", None
    )
    sparse_count = FacilityService._populated_field_count(
        sparse_tags, sparse_info, sparse_name, "fuel", None
    )

    assert rich_count > sparse_count


def test_select_best_prefers_max_populated_fields_over_mile():
    generic = Facility(
        id="1", name="Fuel", type=FacilityType.FUEL,
        lat=35.0, lng=-97.0, miles_from_start=0.0,
    )
    detailed = Facility(
        id="2", name="Pilot Travel Center #412, Casper, WY",
        type=FacilityType.TRUCK_STOP,
        lat=35.1, lng=-97.1, miles_from_start=0.0,
        stop_info=StopInfo(
            city="Casper, WY", phone="+1", website="https://x.com",
        ),
    )
    pilot_tags = {
        "name": "Pilot Travel Center",
        "brand": "Pilot",
        "ref": "412",
        "addr:city": "Casper",
        "addr:state": "WY",
        "phone": "+1",
        "website": "https://x.com",
    }
    candidates = [
        (99.0, FacilityService._populated_field_count(
            {}, StopInfo(), "Fuel", "fuel", None
        ), generic, False),
        (80.0, FacilityService._populated_field_count(
            pilot_tags,
            detailed.stop_info,
            detailed.name,
            "truck_stop",
            None,
        ), detailed, True),
    ]

    assert FacilityService._select_best_candidate(candidates) is detailed


def test_select_best_prefers_quality_pool_over_generic_brand():
    sinclair = Facility(
        id="1", name="Sinclair", type=FacilityType.FUEL,
        lat=35.0, lng=-97.0, miles_from_start=0.0,
    )
    loves = Facility(
        id="2", name="Love's Travel Stop, Ogden, UT",
        type=FacilityType.TRUCK_STOP,
        lat=35.1, lng=-97.1, miles_from_start=0.0,
        stop_info=StopInfo(city="Ogden, UT"),
    )
    candidates = [
        (98.0, 2, sinclair, False),
        (90.0, 5, loves, True),
    ]
    assert FacilityService._select_best_candidate(candidates) is loves


def test_select_best_tiebreaks_by_mile_when_field_count_equal():
    a = Facility(
        id="a", name="Pilot Travel Center, Denver, CO",
        type=FacilityType.FUEL, lat=0, lng=0, miles_from_start=0,
        stop_info=StopInfo(city="Denver, CO"),
    )
    b = Facility(
        id="b", name="Pilot Travel Center, Cheyenne, WY",
        type=FacilityType.FUEL, lat=0, lng=0, miles_from_start=0,
        stop_info=StopInfo(city="Cheyenne, WY"),
    )
    count = 6
    candidates = [(90.0, count, a, True), (95.0, count, b, True)]

    assert FacilityService._select_best_candidate(candidates) is b


def test_is_machine_display_name():
    assert FacilityService.is_machine_display_name("Fuel")
    assert FacilityService.is_machine_display_name("Sinclair")
    assert FacilityService.is_machine_display_name("24/7")
    assert not FacilityService.is_machine_display_name("Love's Travel Stop")


def test_select_best_rest_prefers_truck_stop_over_fuel():
    fuel = Facility(
        id="1", name="24/7", type=FacilityType.FUEL,
        lat=35.0, lng=-97.0, miles_from_start=0.0,
        stop_info=StopInfo(opening_hours="24/7", city="Amarillo, TX"),
    )
    truck_stop = Facility(
        id="2", name="Love's Travel Stop, Amarillo, TX",
        type=FacilityType.TRUCK_STOP,
        lat=35.1, lng=-97.1, miles_from_start=0.0,
        stop_info=StopInfo(city="Amarillo, TX"),
    )
    candidates = [
        (98.0, 8, fuel, True),
        (90.0, 6, truck_stop, True),
    ]
    assert FacilityService._select_best_candidate(candidates, EventType.REST) is truck_stop


def test_location_with_city_appends_city_to_generic_brand():
    assert FacilityService.location_with_city(
        "Sinclair", "Billings, MT", EventType.REST
    ) == "Sinclair, Billings, MT"


def test_location_with_city_upgrades_fuel_placeholder():
    assert FacilityService.location_with_city(
        "Fuel", "Casper, WY", EventType.REST
    ) == "Rest Stop, Casper, WY"


def test_feature_point_parses_geojson_point():
    feat = {"geometry": {"type": "Point", "coordinates": [-121.5, 47.55]}}
    assert FacilityService._feature_point(feat) == (47.55, -121.5)


def test_record_poi_error_tracks_quota_message():
    svc = FacilityService(ors_api_key="")
    svc.clear_poi_errors()
    svc._record_poi_error("ORS POI 403: Quota exceeded")
    assert "Quota exceeded" in svc.poi_error_summary()


def test_stop_info_city_from_osm_tags():
    props = {
        "osm_tags": {"addr:city": "Cheyenne", "addr:state": "WY"},
        "category_ids": {"596": {"category_name": "fuel"}},
    }
    info = FacilityService._stop_info_from_props(props)
    assert info.city == "Cheyenne, WY"
