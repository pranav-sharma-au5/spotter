"""ORS/OSM mappings and naming heuristics for facility lookup."""
from trip.domain.enums import FacilityType

ORS_POI_CATEGORIES = [596, 590]

ORS_TYPE_MAP: dict[str, FacilityType] = {
    "truck_stop": FacilityType.TRUCK_STOP,
}
OSM_AMENITY_MAP: dict[str, FacilityType] = {
    "truck_stop": FacilityType.TRUCK_STOP,
    "rest_area": FacilityType.REST_AREA,
}
OSM_HIGHWAY_MAP: dict[str, FacilityType] = {
    "rest_area": FacilityType.REST_AREA,
    "services": FacilityType.REST_AREA,
}

MACHINE_PLACEHOLDERS: frozenset[str] = frozenset({
    "fuel",
    "gas",
    "gas station",
    "petrol",
    "filling station",
    "service station",
    "car repair",
    "car_repair",
    "24/7",
})

GENERIC_BRANDS: frozenset[str] = frozenset({
    "shell",
    "sinclair",
    "bp",
    "chevron",
    "exxon",
    "mobil",
    "marathon",
    "phillips 66",
    "76",
    "speedway",
    "casey's",
    "kwik trip",
    "circle k",
    "valero",
    "conoco",
    "sunoco",
    "citgo",
    "arco",
})

PICK_MILE_WINDOW = 30.0
ORS_MAX_BUFFER_M = 2000

RICHNESS_TAG_KEYS: tuple[str, ...] = (
    "name",
    "brand",
    "operator",
    "official_name",
    "alt_name",
    "ref",
    "ref:TA",
    "phone",
    "website",
    "opening_hours",
    "addr:city",
    "addr:town",
    "addr:village",
    "addr:state",
    "addr:street",
    "addr:postcode",
    "addr:full",
    "amenity",
    "highway",
    "is_in",
)
