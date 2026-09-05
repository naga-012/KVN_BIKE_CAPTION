import os
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/kvn_db")

client = MongoClient(MONGO_URI)
db = client.get_default_database()

# Collections
users_col = db["users"]
rides_col = db["rides"]
wallets_col = db["wallets"]
coupons_col = db["coupons"]
ratings_col = db["ratings"]
support_col = db["support_tickets"]
fare_settings_col = db["fare_settings"]
drivers_col = db["drivers"]

def init_db():
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
