"""
Optional database seed script with 25 sample potholes.
Every row is explicitly marked with is_demo=True.
IMPORTANT: This script must NEVER run automatically.
Execute manually using: python seed.py
"""
import sys
from datetime import datetime, timedelta
import random

from app.core.database import SessionLocal, Base, engine
from app.models.pothole import Pothole


SAMPLE_LOCATIONS = [
    (12.9716, 77.5946, "MG Road intersection", "high", 0.92, [120, 200, 310, 390]),
    (12.9750, 77.6010, "Brigade Road near cross", "medium", 0.84, [80, 150, 190, 260]),
    (12.9698, 77.5890, "Residency Road eastbound", "low", 0.78, [40, 100, 95, 160]),
    (12.9352, 77.6245, "Koramangala 80ft Road", "high", 0.89, [140, 220, 360, 410]),
    (12.9385, 77.6190, "Koramangala 5th Block", "medium", 0.81, [70, 130, 180, 240]),
    (12.9279, 77.6271, "Sony World signal junction", "high", 0.94, [160, 240, 390, 450]),
    (12.9784, 77.6408, "Indiranagar 100ft Road", "medium", 0.83, [90, 160, 210, 270]),
    (12.9719, 77.6412, "Indiranagar 12th Main", "low", 0.74, [35, 80, 90, 135]),
    (12.9850, 77.6050, "Commercial Street bypass", "low", 0.76, [45, 95, 100, 150]),
    (12.9900, 77.5950, "Cunningham Road curve", "medium", 0.85, [85, 170, 195, 280]),
    (12.9165, 77.6101, "BTM Layout 2nd Stage", "high", 0.91, [150, 230, 370, 420]),
    (12.9200, 77.6150, "Outer Ring Road near Silk Board", "high", 0.95, [180, 260, 420, 480]),
    (12.9100, 77.6400, "HSR Layout Sector 1", "medium", 0.82, [75, 140, 175, 235]),
    (12.9120, 77.6450, "HSR Layout 27th Main", "low", 0.71, [30, 70, 85, 125]),
    (12.9050, 77.6500, "HSR Sector 3 arterial road", "medium", 0.87, [95, 180, 215, 290]),
    (13.0033, 77.5645, "Malleshwaram 8th Cross", "low", 0.73, [40, 85, 95, 140]),
    (13.0100, 77.5550, "Yeshwanthpur flyover approach", "high", 0.88, [135, 210, 340, 395]),
    (12.9550, 77.5400, "Vijayanagar chord road", "medium", 0.79, [80, 150, 185, 255]),
    (12.9600, 77.5300, "Nagarbhavi main circle", "low", 0.75, [42, 90, 102, 148]),
    (12.9800, 77.5200, "Magadi Road toll point", "high", 0.90, [145, 225, 355, 415]),
    (12.9950, 77.6963, "Whitefield Main Road", "high", 0.93, [165, 245, 400, 460]),
    (12.9850, 77.7200, "ITPL service lane", "medium", 0.80, [78, 145, 182, 248]),
    (12.9700, 77.7100, "Kundalahalli gate junction", "high", 0.91, [155, 235, 380, 435]),
    (12.9500, 77.7000, "Marathahalli bridge descent", "medium", 0.86, [88, 165, 205, 275]),
    (12.9400, 77.6800, "Bellandur tech corridor", "low", 0.77, [48, 105, 110, 165]),
]


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing_demo_count = db.query(Pothole).filter(Pothole.is_demo == True).count()
        if existing_demo_count > 0:
            print(f"Removing {existing_demo_count} existing demo records...")
            db.query(Pothole).filter(Pothole.is_demo == True).delete()
            db.commit()

        print(f"Inserting {len(SAMPLE_LOCATIONS)} demo potholes...")
        now = datetime.utcnow()

        for idx, (lat, lng, notes, sev, conf, box) in enumerate(SAMPLE_LOCATIONS):
            days_ago = random.uniform(0.1, 14.0)
            record_time = now - timedelta(days=days_ago)

            pothole = Pothole(
                latitude=lat,
                longitude=lng,
                confidence=conf,
                severity=sev,
                class_name="pothole",
                box_x1=float(box[0]),
                box_y1=float(box[1]),
                box_x2=float(box[2]),
                box_y2=float(box[3]),
                image_path=f"demo/pothole_{idx + 1}.jpg",
                timestamp=record_time,
                is_demo=True,  # Mandatory demo marker
                notes=notes,
            )
            db.add(pothole)

        db.commit()
        print(f"Successfully seeded {len(SAMPLE_LOCATIONS)} demo potholes (all marked is_demo=True).")
    finally:
        db.close()


if __name__ == "__main__":
    print("Executing manual database seeding...")
    seed_database()
