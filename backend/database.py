import os
from pymongo import MongoClient

raw_uri = os.getenv("MONGO_URI", "").strip()
MONGO_URI = raw_uri if raw_uri else "mongodb://localhost:27017/kvn_db"

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    try:
        db = client.get_default_database()
    except Exception:
        db = client["kvn_db"]
except Exception as e:
    print(f"[Database] Warning initializing MongoDB client: {e}. Fallback to local default.")
    client = MongoClient("mongodb://localhost:27017/kvn_db", serverSelectionTimeoutMS=2000)
    db = client["kvn_db"]

# Collections
users_col = db["users"]
rides_col = db["rides"]
wallets_col = db["wallets"]
coupons_col = db["coupons"]
ratings_col = db["ratings"]
support_col = db["support_tickets"]
fare_settings_col = db["fare_settings"]
drivers_col = db["drivers"]
captains_col = db["captains"]
captain_earnings_col = db["captain_earnings"]
ride_messages_col = db["ride_messages"]
sos_alerts_col = db["sos_alerts"]

def _seed_data():
    # Seed default fare settings if missing
    if fare_settings_col.count_documents({}) == 0:
        default_fares = [
            {
                "vehicleType": "BIKE",
                "baseFare": 25,
                "baseDistanceKm": 1.5,
                "perKmRate": 9,
                "perMinuteRate": 1.5,
                "minimumFare": 30,
                "bookingFee": 5,
                "driverCommissionPercent": 82
            },
            {
                "vehicleType": "AUTO",
                "baseFare": 35,
                "baseDistanceKm": 1.5,
                "perKmRate": 14,
                "perMinuteRate": 2.0,
                "minimumFare": 45,
                "bookingFee": 7,
                "driverCommissionPercent": 80
            },
            {
                "vehicleType": "CAB",
                "baseFare": 65,
                "baseDistanceKm": 2.0,
                "perKmRate": 18,
                "perMinuteRate": 2.5,
                "minimumFare": 80,
                "bookingFee": 15,
                "driverCommissionPercent": 78
            }
        ]
        fare_settings_col.insert_many(default_fares)
        print("[Database] Initialized default fare settings")

    # Seed coupons if missing
    if coupons_col.count_documents({}) == 0:
        default_coupons = [
            {
                "code": "KVN50",
                "description": "50% discount up to ₹50 on your ride",
                "discountType": "PERCENTAGE",
                "discountValue": 50,
                "maximumDiscount": 50,
                "minimumFare": 60,
                "isActive": True
            },
            {
                "code": "FIRST20",
                "description": "Flat ₹20 off your first ride",
                "discountType": "FLAT",
                "discountValue": 20,
                "maximumDiscount": 20,
                "minimumFare": 40,
                "isActive": True
            },
            {
                "code": "BIKE10",
                "description": "Flat ₹10 off on any Bike ride",
                "discountType": "FLAT",
                "discountValue": 10,
                "maximumDiscount": 10,
                "minimumFare": 30,
                "isActive": True
            }
        ]
        coupons_col.insert_many(default_coupons)
        print("[Database] Initialized default coupons")

    # Seed demo user
    if not users_col.find_one({"phone": "9876543210"}):
        users_col.insert_one({
            "name": "Rahul Sharma",
            "phone": "9876543210",
            "email": "rahul@kvn.com",
            "password": "Password@123",
            "role": "CUSTOMER",
            "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            "savedPlaces": [
                {"title": "Home", "address": "BN Reddy Nagar Bus Stop, Hyderabad, Telangana", "lat": 17.3228, "lng": 78.5630},
                {"title": "Work", "address": "Hitec City Cyber Towers, Madhapur, Hyderabad, Telangana", "lat": 17.4504, "lng": 78.3808}
            ]
        })
        print("[Database] Initialized demo user Rahul Sharma")

    # Ensure demo wallet
    demo_user = users_col.find_one({"phone": "9876543210"})
    if demo_user and not wallets_col.find_one({"userId": str(demo_user["_id"])}):
        wallets_col.insert_one({
            "userId": str(demo_user["_id"]),
            "balance": 350,
            "promotionalBalance": 50
        })
        print("[Database] Initialized wallet for Rahul Sharma")

    # Seed 5 Standard Captains for the Required Test Scenario (A, B, C, D within 2km; E at 2.5km)
    base_lat, base_lng = 17.3228, 78.5630  # BN Reddy Nagar, Hyderabad
    default_captains = [
        {
            "code": "cpt_a",
            "name": "Captain A - Ramesh Yadav",
            "phone": "9848011221",
            "email": "captain.a@kvn.com",
            "password": "Password@123",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
            "rating": 4.92,
            "totalRides": 482,
            "vehicleType": "BIKE",
            "vehicle": "Honda Activa 6G (Black)",
            "plateNumber": "TS 08 EA 4589",
            "vehicleModel": "Honda Activa 6G",
            "vehicleColor": "Midnight Black",
            "status": "AVAILABLE",
            "isOnline": True,
            "verificationStatus": "APPROVED",
            "location": {
                "lat": round(base_lat + 0.0032, 6),
                "lng": round(base_lng + 0.0028, 6),
                "updatedAt": "2026-09-05T06:00:00Z",
                "label": "0.5 KM from Hub"
            },
            "todayEarnings": 850,
            "weeklyEarnings": 5420,
            "monthlyEarnings": 21800,
            "onlineHoursToday": 5.4,
            "walletBalance": 1240
        },
        {
            "code": "cpt_b",
            "name": "Captain B - Shiva Kumar",
            "phone": "9848011222",
            "email": "captain.b@kvn.com",
            "password": "Password@123",
            "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
            "rating": 4.87,
            "totalRides": 395,
            "vehicleType": "BIKE",
            "vehicle": "TVS Jupiter 125 (Titanium Grey)",
            "plateNumber": "TS 07 UA 7821",
            "vehicleModel": "TVS Jupiter 125",
            "vehicleColor": "Titanium Grey",
            "status": "AVAILABLE",
            "isOnline": True,
            "verificationStatus": "APPROVED",
            "location": {
                "lat": round(base_lat - 0.0052, 6),
                "lng": round(base_lng + 0.0048, 6),
                "updatedAt": "2026-09-05T06:00:00Z",
                "label": "0.8 KM from Hub"
            },
            "todayEarnings": 720,
            "weeklyEarnings": 4890,
            "monthlyEarnings": 19400,
            "onlineHoursToday": 4.8,
            "walletBalance": 980
        },
        {
            "code": "cpt_c",
            "name": "Captain C - Venkat Reddy",
            "phone": "9848011223",
            "email": "captain.c@kvn.com",
            "password": "Password@123",
            "avatar": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80",
            "rating": 4.96,
            "totalRides": 612,
            "vehicleType": "BIKE",
            "vehicle": "Hero Splendor Plus (Blue)",
            "plateNumber": "TS 09 FB 3412",
            "vehicleModel": "Hero Splendor Plus",
            "vehicleColor": "Techno Blue",
            "status": "AVAILABLE",
            "isOnline": True,
            "verificationStatus": "APPROVED",
            "location": {
                "lat": round(base_lat + 0.0080, 6),
                "lng": round(base_lng - 0.0068, 6),
                "updatedAt": "2026-09-05T06:00:00Z",
                "label": "1.2 KM from Hub"
            },
            "todayEarnings": 1100,
            "weeklyEarnings": 6750,
            "monthlyEarnings": 27300,
            "onlineHoursToday": 6.2,
            "walletBalance": 1850
        },
        {
            "code": "cpt_d",
            "name": "Captain D - MD Rizwan",
            "phone": "9848011224",
            "email": "captain.d@kvn.com",
            "password": "Password@123",
            "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
            "rating": 4.89,
            "totalRides": 284,
            "vehicleType": "BIKE",
            "vehicle": "Bajaj Pulsar 150 (Red)",
            "plateNumber": "TS 08 HK 9923",
            "vehicleModel": "Bajaj Pulsar 150",
            "vehicleColor": "Laser Black/Red",
            "status": "AVAILABLE",
            "isOnline": True,
            "verificationStatus": "APPROVED",
            "location": {
                "lat": round(base_lat - 0.0112, 6),
                "lng": round(base_lng + 0.0105, 6),
                "updatedAt": "2026-09-05T06:00:00Z",
                "label": "1.7 KM from Hub"
            },
            "todayEarnings": 540,
            "weeklyEarnings": 3950,
            "monthlyEarnings": 16200,
            "onlineHoursToday": 3.9,
            "walletBalance": 640
        },
        {
            "code": "cpt_e",
            "name": "Captain E - K. Srinivas",
            "phone": "9848011225",
            "email": "captain.e@kvn.com",
            "password": "Password@123",
            "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
            "rating": 4.84,
            "totalRides": 195,
            "vehicleType": "BIKE",
            "vehicle": "Suzuki Access 125 (Silver)",
            "plateNumber": "TS 07 ZA 6610",
            "vehicleModel": "Suzuki Access 125",
            "vehicleColor": "Metallic Matte Platinum Silver",
            "status": "AVAILABLE",
            "isOnline": True,
            "verificationStatus": "APPROVED",
            "location": {
                "lat": round(base_lat + 0.0175, 6),
                "lng": round(base_lng + 0.0155, 6),
                "updatedAt": "2026-09-05T06:00:00Z",
                "label": "2.5 KM from Hub (OUTSIDE 2KM RADIUS)"
            },
            "todayEarnings": 420,
            "weeklyEarnings": 2980,
            "monthlyEarnings": 12100,
            "onlineHoursToday": 2.8,
            "walletBalance": 490
        }
    ]

    for cpt in default_captains:
        existing = captains_col.find_one({"phone": cpt["phone"]})
        if not existing:
            captains_col.insert_one(cpt)
        else:
            # Update base details and coordinates if needed
            captains_col.update_one(
                {"phone": cpt["phone"]},
                {"$set": {
                    "location": cpt["location"],
                    "isOnline": True,
                    "status": "AVAILABLE",
                    "verificationStatus": "APPROVED"
                }}
            )
    print(f"[Database] Seeded/verified {len(default_captains)} captains (Captains A-E)")

def init_db():
    try:
        # Check connection with a quick ping
        client.admin.command('ping')
    except Exception as e:
        print(f"[Database] MongoDB not reachable at startup ({e}). Continuing in resilient mode.")
        return

    try:
        _seed_data()
    except Exception as e:
        print(f"[Database] Note during seeding: {e}")


