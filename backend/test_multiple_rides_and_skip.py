import sys
import os
import datetime
from bson import ObjectId
from fastapi import BackgroundTasks, HTTPException

from main import (
    app,
    get_active_order_for_captains,
    skip_ride_by_captain,
    captain_skip_ride_alias,
    accept_ride_by_captain,
    SkipRideReq,
    CaptainSkipRideReq,
    AcceptRideReq
)
from database import rides_col, captains_col

def run_tests():
    print("=" * 65)
    print("TEST SUITE: MULTIPLE RIDES RECEIVING & SKIPPING FOR CAPTAINS")
    print("=" * 65)

    # 1. Insert 3 test customer rides with SEARCHING_DRIVER status
    print("\n--- 1. Creating 3 simultaneous customer rides in SEARCHING_DRIVER ---")
    ride_ids = []
    for i in range(1, 4):
        doc = {
            "pickupLocation": {
                "address": f"Pickup Spot #{i}, BN Reddy Nagar, Hyderabad",
                "lat": 17.3228 + (i * 0.001),
                "lng": 78.5630 + (i * 0.001)
            },
            "dropLocation": {
                "address": f"Destination #{i}, LB Nagar, Hyderabad",
                "lat": 17.3450,
                "lng": 78.5500
            },
            "distanceKm": 4.5 + i,
            "durationMinutes": 12 + (i * 2),
            "vehicleType": "BIKE",
            "paymentMethod": "UPI",
            "source": "KVN_BIKE_BOOKING",
            "fareBreakdown": {
                "baseFare": 25,
                "distanceFare": (4.5 + i) * 8,
                "totalFare": 60 + (i * 20),
                "driverEarning": 50 + (i * 15)
            },
            "status": "SEARCHING_DRIVER",
            "otp": f"123{i}",
            "createdAt": datetime.datetime.utcnow(),
            "broadcastCaptains": ["cpt_a", "cpt_b", "cpt_c"]
        }
        res = rides_col.insert_one(doc)
        rid = str(res.inserted_id)
        ride_ids.append(rid)
        print(f"  ✓ Created Ride #{i}: ID={rid}, Fare=₹{doc['fareBreakdown']['totalFare']}")

    # 2. Test GET /api/captains/active-order without captainId
    print("\n--- 2. Verify active-order returns multiple rides (activeOrders list) ---")
    res_general = get_active_order_for_captains(captainId=None)
    assert res_general["success"] is True
    assert "activeOrders" in res_general, "activeOrders field must be present"
    assert "totalAvailable" in res_general, "totalAvailable field must be present"
    assert "activeOrder" in res_general, "activeOrder must be present for backwards compatibility"
    assert res_general["totalAvailable"] >= 3
    print(f"  ✓ Total Available Rides: {res_general['totalAvailable']}")
    print(f"  ✓ Backwards-compatible activeOrder present: ID={res_general['activeOrder']['id']}")

    # 3. Verify Captain A sees all 3 rides
    print("\n--- 3. Captain A queries active orders ---")
    res_cpt_a = get_active_order_for_captains(captainId="cpt_a")
    assert res_cpt_a["success"] is True
    cpt_a_ids = [o["id"] for o in res_cpt_a["activeOrders"]]
    for rid in ride_ids:
        assert rid in cpt_a_ids, f"Ride {rid} should be in Captain A queue"
    print(f"  ✓ Captain A sees all 3 rides in queue before skipping: {cpt_a_ids[:3]}")

    # 4. Captain A skips Ride 1
    ride1_id = ride_ids[0]
    print(f"\n--- 4. Captain A skips Ride 1 ({ride1_id}) ---")
    skip_res = skip_ride_by_captain(ride1_id, SkipRideReq(captainId="cpt_a", reason="Distance not favorable"))
    assert skip_res["success"] is True
    print(f"  ✓ Ride skipped response: {skip_res['message']}")

    # Verify in DB that skippedCaptains contains 'cpt_a'
    db_ride1 = rides_col.find_one({"_id": ObjectId(ride1_id)})
    assert "cpt_a" in db_ride1.get("skippedCaptains", []), "cpt_a must be in skippedCaptains list"
    assert db_ride1["status"] == "SEARCHING_DRIVER", "Ride status must REMAIN SEARCHING_DRIVER for other captains"
    print(f"  ✓ DB check: skippedCaptains={db_ride1['skippedCaptains']}, status={db_ride1['status']}")

    # 5. Captain A queries active orders again -> Ride 1 must be filtered out
    print("\n--- 5. Captain A queries active orders after skipping Ride 1 ---")
    res_cpt_a_after = get_active_order_for_captains(captainId="cpt_a")
    cpt_a_after_ids = [o["id"] for o in res_cpt_a_after["activeOrders"]]
    assert ride1_id not in cpt_a_after_ids, "Ride 1 MUST NOT be returned to Captain A after being skipped!"
    assert ride_ids[1] in cpt_a_after_ids, "Ride 2 MUST still be available for Captain A"
    assert ride_ids[2] in cpt_a_after_ids, "Ride 3 MUST still be available for Captain A"
    print(f"  ✓ Confirmed: Ride 1 successfully excluded for Captain A!")
    print(f"  ✓ Captain A remaining queue: {cpt_a_after_ids[:2]}")

    # 6. Captain B queries active orders -> Ride 1 MUST STILL BE AVAILABLE for Captain B
    print("\n--- 6. Captain B queries active orders (verifying isolation) ---")
    res_cpt_b = get_active_order_for_captains(captainId="cpt_b")
    cpt_b_ids = [o["id"] for o in res_cpt_b["activeOrders"]]
    assert ride1_id in cpt_b_ids, "Ride 1 MUST still be returned for Captain B!"
    print(f"  ✓ Confirmed: Ride 1 is STILL available for Captain B! (Skipping is captain-isolated)")

    # 7. Test alias endpoint /api/captains/skip-ride for Captain B on Ride 2
    ride2_id = ride_ids[1]
    print(f"\n--- 7. Captain B skips Ride 2 ({ride2_id}) using alias endpoint ---")
    alias_res = captain_skip_ride_alias(CaptainSkipRideReq(rideId=ride2_id, captainId="cpt_b", reason="Short break"))
    assert alias_res["success"] is True

    res_cpt_b_after = get_active_order_for_captains(captainId="cpt_b")
    cpt_b_after_ids = [o["id"] for o in res_cpt_b_after["activeOrders"]]
    assert ride2_id not in cpt_b_after_ids, "Ride 2 MUST NOT be returned for Captain B after skip"
    assert ride1_id in cpt_b_after_ids, "Ride 1 MUST still be returned for Captain B"
    print(f"  ✓ Confirmed: Captain B successfully skipped Ride 2 via alias endpoint")

    # 8. Captain A accepts Ride 2 (atomic lock test)
    print(f"\n--- 8. Captain A accepts Ride 2 ({ride2_id}) ---")
    bg = BackgroundTasks()
    accept_res = accept_ride_by_captain(
        ride2_id,
        AcceptRideReq(
            captainId="cpt_a",
            captainName="Captain Ramesh Yadav",
            vehicle="Honda Activa 6G (Black)",
            plateNumber="TS 08 EA 4589",
            phone="+91 98480 11223"
        ),
        bg
    )
    assert accept_res["success"] is True
    print(f"  ✓ Captain A successfully accepted Ride 2!")

    # 9. Captain B attempts to accept Ride 2 -> Expect 409 Conflict
    print(f"\n--- 9. Captain B attempts to accept Ride 2 -> Expect HTTP 409 Conflict ---")
    try:
        accept_ride_by_captain(
            ride2_id,
            AcceptRideReq(
                captainId="cpt_b",
                captainName="Captain Shiva Kumar"
            ),
            bg
        )
        assert False, "Should have raised HTTPException 409"
    except HTTPException as he:
        assert he.status_code == 409, f"Expected 409, got {he.status_code}"
        print(f"  ✓ Confirmed: HTTP 409 Conflict raised properly ({he.detail})")

    # Clean up test rides
    rides_col.delete_many({"_id": {"$in": [ObjectId(r) for r in ride_ids]}})

    print("\n" + "=" * 65)
    print("ALL TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
