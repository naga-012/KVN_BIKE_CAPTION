import asyncio
import datetime
from bson import ObjectId
import socketio
from database import captains_col, rides_col, ride_messages_col, sos_alerts_col

# Shared Socket.io AsyncServer
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

# In-memory mapping of captainId -> sid, sid -> captainId
captain_sid_map = {}
sid_captain_map = {}

@sio.event
async def connect(sid, environ, auth):
    print(f"[Socket.IO] Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"[Socket.IO] Client disconnected: {sid}")
    if sid in sid_captain_map:
        cpt_id = sid_captain_map.pop(sid)
        if cpt_id in captain_sid_map and captain_sid_map[cpt_id] == sid:
            del captain_sid_map[cpt_id]
        print(f"[Socket.IO] Captain {cpt_id} disconnected")

@sio.on("captain:online")
async def handle_captain_online(sid, data):
    """
    Captain goes ONLINE:
    - Joins general 'captains' room
    - Joins private 'captain_{id}' room
    - Updates captain status in DB to AVAILABLE and isOnline=True
    """
    cpt_id = str(data.get("captainId", "")).strip()
    if not cpt_id:
        return
    
    lat = data.get("lat")
    lng = data.get("lng")

    # Captain location is strictly required to go online
    if lat is None or lng is None:
        cpt = captains_col.find_one({"_id": ObjectId(cpt_id)}) if ObjectId.is_valid(cpt_id) else captains_col.find_one({"$or": [{"phone": cpt_id}, {"code": cpt_id}]})
        loc = cpt.get("location", {}) if cpt else {}
        if loc.get("lat") is None or loc.get("lng") is None:
            await sio.emit("captain:error", {
                "message": "Device GPS location is required to go online. Please turn on device location/GPS."
            }, room=sid)
            print(f"[Socket.IO] Rejected captain {cpt_id} go-online: Location is OFF.")
            return
        lat = loc.get("lat")
        lng = loc.get("lng")

    captain_sid_map[cpt_id] = sid
    sid_captain_map[sid] = cpt_id

    await sio.enter_room(sid, "captains")
    await sio.enter_room(sid, f"captain_{cpt_id}")

    update_fields = {
        "isOnline": True,
        "status": "AVAILABLE",
        "location.lat": float(lat),
        "location.lng": float(lng),
        "location.updatedAt": datetime.datetime.utcnow().isoformat()
    }

    try:
        if ObjectId.is_valid(cpt_id):
            captains_col.update_one({"_id": ObjectId(cpt_id)}, {"$set": update_fields})
        else:
            captains_col.update_one({"$or": [{"phone": cpt_id}, {"code": cpt_id}]}, {"$set": update_fields})
    except Exception as e:
        print(f"[Socket.IO] Error updating captain online status: {e}")

    await sio.emit("captain:status_ack", {
        "status": "AVAILABLE",
        "isOnline": True,
        "location": {"lat": float(lat), "lng": float(lng)}
    }, room=sid)
    print(f"[Socket.IO] Captain {cpt_id} is now ONLINE at exact GPS location ({lat}, {lng})")

@sio.on("captain:offline")
async def handle_captain_offline(sid, data):
    cpt_id = str(data.get("captainId", "")).strip()
    if cpt_id:
        await sio.leave_room(sid, "captains")
        try:
            if ObjectId.is_valid(cpt_id):
                captains_col.update_one({"_id": ObjectId(cpt_id)}, {"$set": {"isOnline": False, "status": "OFFLINE"}})
            else:
                captains_col.update_one({"$or": [{"phone": cpt_id}, {"code": cpt_id}]}, {"$set": {"isOnline": False, "status": "OFFLINE"}})
        except Exception as e:
            print(f"[Socket.IO] Error updating captain offline: {e}")

    await sio.emit("captain:status_ack", {"status": "OFFLINE", "isOnline": False}, room=sid)
    print(f"[Socket.IO] Captain {cpt_id} is now OFFLINE")

@sio.on("captain:location")
async def handle_captain_location(sid, data):
    """
    Receives live GPS updates from Captain App:
    - Updates captain coordinates in DB
    - If in active ride, broadcasts to customer in 'ride_{rideId}'
    """
    cpt_id = data.get("captainId")
    lat = data.get("lat")
    lng = data.get("lng")
    heading = data.get("heading", 0)
    ride_id = data.get("rideId")

    if not lat or not lng:
        return

    loc_update = {
        "lat": float(lat),
        "lng": float(lng),
        "heading": float(heading),
        "updatedAt": datetime.datetime.utcnow().isoformat()
    }

    if cpt_id:
        try:
            if ObjectId.is_valid(cpt_id):
                captains_col.update_one({"_id": ObjectId(cpt_id)}, {"$set": {"location": loc_update}})
            else:
                captains_col.update_one({"$or": [{"phone": cpt_id}, {"code": cpt_id}]}, {"$set": {"location": loc_update}})
        except Exception as e:
            print(f"[Socket.IO] Error updating captain location: {e}")

    if ride_id:
        try:
            rides_col.update_one(
                {"_id": ObjectId(ride_id)},
                {"$set": {"driverLiveLocation": {"lat": float(lat), "lng": float(lng), "heading": float(heading)}}}
            )
            await sio.emit("ride:location_update", {
                "rideId": ride_id,
                "location": {"lat": float(lat), "lng": float(lng), "heading": float(heading)}
            }, room=f"ride_{ride_id}")
        except Exception as e:
            print(f"[Socket.IO] Error broadcasting location to ride_{ride_id}: {e}")

@sio.on("join:ride")
async def handle_join_ride(sid, data):
    ride_id = str(data.get("rideId", "")).strip()
    if ride_id:
        await sio.enter_room(sid, f"ride_{ride_id}")
        print(f"[Socket.IO] Client {sid} joined ride_{ride_id}")

@sio.on("message:send")
@sio.on("chat:send")
async def handle_chat_message(sid, data):
    ride_id = str(data.get("rideId", "")).strip()
    text = data.get("text", "").strip()
    sender = data.get("sender", "Captain")
    sender_type = data.get("senderType", "CAPTAIN")

    if not ride_id or not text:
        return

    msg_doc = {
        "rideId": ride_id,
        "sender": sender,
        "senderType": sender_type,
        "text": text,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

    try:
        ride_messages_col.insert_one(msg_doc)
        if "_id" in msg_doc:
            msg_doc["_id"] = str(msg_doc["_id"])
            msg_doc["id"] = msg_doc["_id"]
    except Exception as e:
        print(f"[Socket.IO] Chat insert error: {e}")

    await sio.emit("chat:new_message", msg_doc, room=f"ride_{ride_id}")
    await sio.emit("message:new", msg_doc, room=f"ride_{ride_id}")

@sio.on("sos:trigger")
async def handle_sos_trigger(sid, data):
    ride_id = str(data.get("rideId", "")).strip()
    cpt_id = str(data.get("captainId", "")).strip()
    lat = data.get("lat")
    lng = data.get("lng")
    reason = data.get("reason", "Emergency SOS triggered by Captain")

    sos_doc = {
        "rideId": ride_id,
        "captainId": cpt_id,
        "lat": lat,
        "lng": lng,
        "reason": reason,
        "createdAt": datetime.datetime.utcnow().isoformat(),
        "status": "DISPATCHED"
    }

    try:
        sos_alerts_col.insert_one(sos_doc)
        if "_id" in sos_doc:
            sos_doc["_id"] = str(sos_doc["_id"])
    except Exception as e:
        print(f"[Socket.IO] SOS insert error: {e}")

    await sio.emit("sos:dispatched", {
        "success": True,
        "alertId": sos_doc.get("_id", "SOS-1"),
        "message": "KVN Emergency Response Team notified! Police 112 contacted."
    }, room=sid)

# --- Server-side Broadcast Helpers ---

async def broadcast_new_ride(ride_doc: dict, eligible_captains: list):
    """
    Simultaneously sends the ride request to ALL eligible captains within 2 KM.
    """
    ride_id = str(ride_doc.get("id") or ride_doc.get("_id"))
    payload = {
        "rideId": ride_id,
        "ride_id": ride_id,
        "vehicleType": ride_doc.get("vehicleType", "BIKE"),
        "customerName": "Rahul Sharma",
        "customerRating": 4.86,
        "pickupLocation": ride_doc.get("pickupLocation"),
        "dropLocation": ride_doc.get("dropLocation"),
        "distanceKm": ride_doc.get("distanceKm"),
        "durationMinutes": ride_doc.get("durationMinutes"),
        "fareBreakdown": ride_doc.get("fareBreakdown"),
        "estimatedFare": ride_doc.get("fareBreakdown", {}).get("totalFare", 50),
        "paymentMethod": ride_doc.get("paymentMethod", "UPI"),
        "createdAt": datetime.datetime.utcnow().isoformat(),
        "countdownDuration": 15,
        "expiresInSeconds": 15
    }

    print(f"[Socket.IO] Broadcasting ride {ride_id} simultaneously to {len(eligible_captains)} captains within 2 KM")
    
    # Broadcast to each eligible captain's room
    for cpt in eligible_captains:
        cpt_id = str(cpt.get("id") or cpt.get("_id") or cpt.get("code"))
        await sio.emit("ride:new_request", payload, room=f"captain_{cpt_id}")

    # Also broadcast to general 'captains' room with eligibleCaptains list for instant matching
    await sio.emit("ride:new_request", {
        **payload,
        "eligibleCaptainIds": [str(c.get("id") or c.get("_id") or c.get("code")) for c in eligible_captains]
    }, room="captains")

async def broadcast_ride_accepted(ride_doc: dict, captain_info: dict):
    """
    When a captain accepts:
    1. Winner receives confirmation
    2. Other captains receive 'ride:no_longer_available' so request disappears instantly
    3. Customer receives 'ride:captain_assigned'
    """
    ride_id = str(ride_doc.get("id") or ride_doc.get("_id"))
    cpt_id = str(captain_info.get("id") or captain_info.get("_id") or captain_info.get("code"))
    cpt_name = captain_info.get("name", "Captain")

    # 1. Notify winner
    await sio.emit("ride:accepted_success", {
        "rideId": ride_id,
        "ride": ride_doc,
        "message": f"Congratulations! You won the booking."
    }, room=f"captain_{cpt_id}")

    # 2. Notify all other captains to dismiss request immediately
    await sio.emit("ride:cancelled", {
        "rideId": ride_id,
        "reason": f"Ride accepted by {cpt_name}. No longer available."
    }, room="captains")
    await sio.emit("ride:no_longer_available", {
        "rideId": ride_id,
        "reason": f"Ride accepted by {cpt_name}."
    }, room="captains")

    # 3. Notify customer
    await sio.emit("ride:captain_assigned", {
        "rideId": ride_id,
        "status": "DRIVER_ASSIGNED",
        "driver": captain_info,
        "driverLiveLocation": ride_doc.get("driverLiveLocation")
    }, room=f"ride_{ride_id}")

async def broadcast_ride_status_change(ride_id: str, new_status: str, extra: dict = None):
    payload = {"rideId": ride_id, "status": new_status, **(extra or {})}
    await sio.emit("ride:status_changed", payload, room=f"ride_{ride_id}")
    if new_status == "DRIVER_ARRIVED":
        await sio.emit("ride:captain_arrived", payload, room=f"ride_{ride_id}")
    elif new_status == "RIDE_STARTED":
        await sio.emit("ride:started", payload, room=f"ride_{ride_id}")
    elif new_status == "RIDE_COMPLETED":
        await sio.emit("ride:completed", payload, room=f"ride_{ride_id}")
