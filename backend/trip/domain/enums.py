from enum import Enum


class EventType(str, Enum):
    DRIVE = "drive"
    BREAK = "break"
    FUEL = "fuel"
    REST = "rest"
    PICKUP = "pickup"
    DROPOFF = "dropoff"
    ON_DUTY = "on_duty"
    RESTART = "restart"


class FacilityType(str, Enum):
    FUEL = "fuel"
    TRUCK_STOP = "truck_stop"
    REST_AREA = "rest_area"


class ConstraintType(str, Enum):
    BREAK = "break"         # 30-min break before 8 cumulative drive hrs
    FUEL = "fuel"           # fuel before 950 miles
    REST = "rest"           # 10-hr rest, ends duty day
    CYCLE_LIMIT = "cycle_limit"  # 34-hr restart when 70-hr cycle hit
