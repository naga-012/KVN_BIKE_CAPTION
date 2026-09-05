from database import rides_col, captains_col

res = rides_col.update_many(
    {"status": {"$in": ["DRIVER_ASSIGNED", "DRIVER_ARRIVED", "OTP_VERIFIED", "RIDE_STARTED"]}},
    {"$set": {"status": "RIDE_COMPLETED"}}
)
print(f"Rides closed: {res.modified_count}")

c = captains_col.update_many(
    {},
    {"$set": {"isOnline": True, "status": "AVAILABLE"}}
)
print(f"Captains reset to ONLINE/AVAILABLE: {c.modified_count}")

for cpt in captains_col.find():
    print(f"Captain: {cpt.get('name')} | Code: {cpt.get('code')} | isOnline: {cpt.get('isOnline')} | status: {cpt.get('status')}")
