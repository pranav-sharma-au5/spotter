from trip.domain.enums import ConstraintType, EventType
from trip.domain.models import Coordinate
from trip.services.hos_calculator import HOSCalculatorService

total = 3300.0
n_points = 20
step = total / (n_points - 1)
geo = [Coordinate(lat=35.0 + i * 0.05, lng=-97.0 - i * 0.10) for i in range(n_points)]
cum = [round(i * step, 6) for i in range(n_points)]
calc = HOSCalculatorService()
days = calc.calculate(3300, 825, 0, geo, cum)

msf = 0.0
for day in days:
    for e in day.events:
        if e.type == EventType.DRIVE:
            msf += e.miles_from_prev
            if msf > 950.05:
                print(f"OVER {msf:.0f} before drive after {e.id}")
        elif ConstraintType.FUEL in e.satisfies or e.type == EventType.FUEL:
            msf = 0.0
        elif e.type == EventType.REST:
            msf = max(0.0, msf - 400.0)

print("--- stops ---")
for day in days:
    for e in day.events:
        if e.type != EventType.DRIVE:
            sat = ",".join(s.value for s in e.satisfies) if e.satisfies else ""
            print(f"D{day.day_number} {e.type:8} +{e.miles_from_prev:6.0f} {sat}")
