import math
import random
import time
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import (
    init_db,
    users_col,
    rides_col,
    wallets_col,
    coupons_col,
    ratings_col,
    support_col,
    fare_settings_col,
    captains_col,
    captain_earnings_col,
    ride_messages_col,
    sos_alerts_col
)
import socketio
from sockets import (
    sio,
    broadcast_new_ride,
    broadcast_ride_accepted,
    broadcast_ride_status_change
)
from captain_routes import captain_router

app = FastAPI(title="KVN Ride Booking Platform Customer & Captain API", version="2.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Captain Routes
app.include_router(captain_router)

# Mount Socket.IO on ASGI
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

@app.on_event("startup")
def startup_event():
    init_db()

# --- Helper Utilities ---

def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    if lat1 == lat2 and lon1 == lon2:
        return 0.1
    radlat1 = math.pi * lat1 / 180.0
    radlat2 = math.pi * lat2 / 180.0
    theta = lon1 - lon2
    radtheta = math.pi * theta / 180.0
    dist = math.sin(radlat1) * math.sin(radlat2) + math.cos(radlat1) * math.cos(radlat2) * math.cos(radtheta)
    dist = min(1.0, max(-1.0, dist))
    dist = math.acos(dist)
    dist = dist * 180.0 / math.pi
    dist = dist * 60.0 * 1.1515 * 1.609344
    return max(0.2, round(dist, 2))

def estimate_trip_duration(distance_km: float, vehicle_type: str = "CAB") -> int:
    speeds = {"BIKE": 28, "AUTO": 22, "CAB": 20}
    avg_speed = speeds.get(vehicle_type, 22)
    minutes = math.ceil((distance_km / avg_speed) * 60)
    return max(3, minutes)

def serialize_doc(doc: Any) -> Any:
    if doc is None:
        return doc
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        new_doc = {k: serialize_doc(v) for k, v in doc.items()}
        if "_id" in new_doc and "id" not in new_doc:
            new_doc["id"] = str(new_doc["_id"])
        return new_doc
    return doc

# --- Pydantic Request Models ---

class RegisterReq(BaseModel):
    name: str
    phone: str
    email: str
    password: str

class LoginReq(BaseModel):
    identifier: str
    password: str

class VerifyOtpReq(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None

class EstimateReq(BaseModel):
    pickupLat: float
    pickupLng: float
    dropLat: float
    dropLng: float
    couponCode: Optional[str] = None

class LocationModel(BaseModel):
    address: str
    lat: float
    lng: float

class CreateRideReq(BaseModel):
    pickupLocation: LocationModel
    dropLocation: LocationModel
    vehicleType: str
    couponCode: Optional[str] = None
    paymentMethod: str = "UPI"

class TopupReq(BaseModel):
    amount: float

class PaymentVerifyReq(BaseModel):
    rideId: str
    method: str = "UPI"
    amount: Optional[float] = None
    transactionId: Optional[str] = None

class WalletPayReq(BaseModel):
    rideId: str

class RateRideReq(BaseModel):
    score: int
    comment: Optional[str] = ""
    tags: Optional[List[str]] = []

class TicketReq(BaseModel):
    category: str
    subject: str
    description: str
    rideId: Optional[str] = None

class AcceptRideReq(BaseModel):
    captainId: str
    captainName: Optional[str] = None
    vehicle: Optional[str] = None
    plateNumber: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None

# --- Available Telangana Captains Pool ---
AVAILABLE_CAPTAINS_POOL = [
    {
        "id": "cpt_ramesh_1",
        "name": "Captain Ramesh Yadav",
        "phone": "+91 98480 11223",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        "vehicleType": "BIKE",
        "vehicle": "Honda Activa 6G (Black)",
        "plateNumber": "TS 08 EA 4589",
        "rating": 4.92,
        "offsetLat": 0.0035,
        "offsetLng": 0.0028,
    },
    {
        "id": "cpt_shiva_2",
        "name": "Captain Shiva Kumar",
        "phone": "+91 98480 22334",
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
        "vehicleType": "AUTO",
        "vehicle": "Bajaj RE Green-Yellow Auto",
        "plateNumber": "TS 07 UA 7821",
        "rating": 4.87,
        "offsetLat": -0.0045,
        "offsetLng": 0.0052,
    },
    {
        "id": "cpt_venkat_3",
        "name": "Captain Venkat Reddy",
        "phone": "+91 98480 33445",
        "avatar": "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80",
        "vehicleType": "CAB",
        "vehicle": "Maruti Swift Dzire Prime AC",
        "plateNumber": "TS 09 FB 3412",
        "rating": 4.96,
        "offsetLat": 0.0062,
        "offsetLng": -0.0041,
    },
    {
        "id": "cpt_rizwan_4",
        "name": "Captain MD Rizwan",
        "phone": "+91 98480 44556",
        "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
        "vehicleType": "BIKE",
        "vehicle": "TVS Jupiter 125 (Grey)",
        "plateNumber": "TS 08 HK 9923",
        "rating": 4.89,
        "offsetLat": -0.0032,
        "offsetLng": -0.0058,
    },
    {
        "id": "cpt_srinivas_5",
        "name": "Captain K. Srinivas",
        "phone": "+91 98480 55667",
        "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
        "vehicleType": "AUTO",
        "vehicle": "Piaggio Ape Auto",
        "plateNumber": "TS 07 ZA 6610",
        "rating": 4.84,
        "offsetLat": 0.0071,
        "offsetLng": 0.0045,
    }
]

def get_captains_within_2km(pickup_lat: float, pickup_lng: float, vehicle_type: str = "BIKE"):
    """
    Finds all active captains positioned within exactly 2.0 km radius of customer pickup.
    Checks live database 'captains' collection first; falls back to Telangana pool if needed.
    """
    results = []
    
    # 1. Query live database captains
    try:
        query = {
            "isOnline": True,
            "status": "AVAILABLE",
            "verificationStatus": "APPROVED"
        }
        live_captains = list(captains_col.find(query))
        for c in live_captains:
            c_vtype = (c.get("vehicleType") or "BIKE").upper()
            if c_vtype != vehicle_type.upper():
                continue
            loc = c.get("location") or {}
            c_lat = loc.get("lat")
            c_lng = loc.get("lng")
            if c_lat is None or c_lng is None:
                continue
            dist = calculate_distance_km(pickup_lat, pickup_lng, c_lat, c_lng)
            if dist <= 2.0:
                results.append({
                    "id": str(c["_id"]),
                    "code": c.get("code", f"cpt_{str(c['_id'])[-4:]}"),
                    "name": c["name"],
                    "phone": c["phone"],
                    "avatar": c.get("avatar"),
                    "vehicleType": c_vtype,
                    "vehicle": c.get("vehicle", "Vehicle"),
                    "plateNumber": c.get("plateNumber", ""),
                    "rating": c.get("rating", 4.9),
                    "lat": round(c_lat, 6),
                    "lng": round(c_lng, 6),
                    "distanceKm": round(dist, 2),
                    "etaMinutes": max(1, math.ceil(dist * 2.5)),
                })
    except Exception as e:
        print(f"[Dispatch] Error querying live captains: {e}")

    # 2. If no live captains found in DB, fallback to seed pool
    if not results:
        for c in AVAILABLE_CAPTAINS_POOL:
            cap_lat = pickup_lat + c["offsetLat"]
            cap_lng = pickup_lng + c["offsetLng"]
            dist = calculate_distance_km(pickup_lat, pickup_lng, cap_lat, cap_lng)
            if dist <= 2.0:
                results.append({
                    "id": c["id"],
                    "code": c["id"],
                    "name": c["name"],
                    "phone": c["phone"],
                    "avatar": c["avatar"],
                    "vehicleType": c["vehicleType"],
                    "vehicle": c["vehicle"],
                    "plateNumber": c["plateNumber"],
                    "rating": c["rating"],
                    "lat": round(cap_lat, 6),
                    "lng": round(cap_lng, 6),
                    "distanceKm": round(dist, 2),
                    "etaMinutes": max(1, math.ceil(dist * 2.5)),
                })
    results.sort(key=lambda x: x["distanceKm"])
    return results

# --- Background Task: Simulated Driver Lifecycle (fallback after 6s) ---

async def simulate_driver_dispatch(ride_id: str):
    """
    Automated realistic fallback: If no captain accepts manually within 6 seconds,
    the nearest available captain within 2km accepts the order.
    """
    await asyncio.sleep(6)
    ride = rides_col.find_one({"_id": ObjectId(ride_id)})
    if not ride or ride.get("status") != "SEARCHING_DRIVER":
        return

    captains = ride.get("broadcastCaptains") or []
    # Assign the closest captain within 2km
    assigned = captains[0] if captains else {
        "id": "cpt_ramesh_1",
        "name": "Captain Ramesh Yadav",
        "phone": "+91 98480 11223",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        "vehicle": "Honda Activa 6G (Black)",
        "plateNumber": "TS 08 EA 4589",
        "rating": 4.92,
        "lat": ride["pickupLocation"]["lat"] + 0.003,
        "lng": ride["pickupLocation"]["lng"] + 0.003,
    }

    rides_col.update_one(
        {"_id": ObjectId(ride_id), "status": "SEARCHING_DRIVER"},
        {"$set": {
            "status": "DRIVER_ASSIGNED",
            "driver": assigned,
            "driverLiveLocation": {
                "lat": assigned.get("lat", ride["pickupLocation"]["lat"] + 0.003),
                "lng": assigned.get("lng", ride["pickupLocation"]["lng"] + 0.003)
            },
            "acceptedAt": datetime.utcnow()
        }}
    )

    await asyncio.sleep(4)
    rides_col.update_one(
        {"_id": ObjectId(ride_id)},
        {"$set": {
            "status": "DRIVER_ARRIVED",
            "driverLiveLocation": {
                "lat": ride["pickupLocation"]["lat"],
                "lng": ride["pickupLocation"]["lng"]
            }
        }}
    )

TELANGANA_LANDMARKS = [
    {
        "title": "BN Reddy Nagar Bus Stop",
        "subtitle": "Sagar Ring Road, L.B. Nagar, Hyderabad, Telangana",
        "address": "BN Reddy Nagar Bus Stop, Sagar Ring Road, L.B. Nagar, Hyderabad, Telangana",
        "lat": 17.3228,
        "lng": 78.5630,
        "tags": ["bn reddy", "bn reddy bus stop", "lb nagar", "bus stand"]
    },
    {
        "title": "BIET College (Bharat Institute of Eng & Tech)",
        "subtitle": "Mangalpally, Ibrahimpatnam, Ranga Reddy, Telangana",
        "address": "Bharat Institute of Engineering and Technology (BIET), Ibrahimpatnam, Telangana",
        "lat": 17.1895,
        "lng": 78.6534,
        "tags": ["biet", "biet college", "bharat institute", "ibrahimpatnam"]
    },
    {
        "title": "Hitec City Cyber Towers",
        "subtitle": "Madhapur, Hyderabad, Telangana",
        "address": "Cyber Towers, Hitec City, Madhapur, Hyderabad, Telangana",
        "lat": 17.4504,
        "lng": 78.3808,
        "tags": ["hitec", "cyber towers", "madhapur", "it hub"]
    },
    {
        "title": "Gachibowli Financial District",
        "subtitle": "Nanakramguda, Hyderabad, Telangana",
        "address": "Financial District, Gachibowli, Hyderabad, Telangana",
        "lat": 17.4401,
        "lng": 78.3489,
        "tags": ["gachibowli", "financial district", "nanakramguda"]
    },
    {
        "title": "Charminar",
        "subtitle": "Old City, Hyderabad, Telangana",
        "address": "Charminar, Ghansi Bazaar, Hyderabad, Telangana",
        "lat": 17.3616,
        "lng": 78.4747,
        "tags": ["charminar", "old city", "laad bazaar"]
    },
    {
        "title": "Secunderabad Railway Station",
        "subtitle": "Secunderabad, Hyderabad, Telangana",
        "address": "Secunderabad Junction Railway Station, Secunderabad, Telangana",
        "lat": 17.4344,
        "lng": 78.5013,
        "tags": ["secunderabad", "railway station", "train"]
    },
    {
        "title": "Rajiv Gandhi Int. Airport (RGIA)",
        "subtitle": "Shamshabad, Hyderabad, Telangana",
        "address": "Rajiv Gandhi International Airport, Shamshabad, Hyderabad, Telangana",
        "lat": 17.2403,
        "lng": 78.4294,
        "tags": ["airport", "rgia", "shamshabad", "flight"]
    },
    {
        "title": "L.B. Nagar Metro Station",
        "subtitle": "Ring Road, L.B. Nagar, Hyderabad, Telangana",
        "address": "L.B. Nagar Metro Station, Hyderabad, Telangana",
        "lat": 17.3553,
        "lng": 78.5522,
        "tags": ["lb nagar", "metro", "dilsukhnagar"]
    },
    {
        "title": "Dilsukhnagar Bus Depot",
        "subtitle": "Dilsukhnagar, Hyderabad, Telangana",
        "address": "Dilsukhnagar Bus Depot, Hyderabad, Telangana",
        "lat": 17.3687,
        "lng": 78.5247,
        "tags": ["dilsukhnagar", "depot", "bus stop"]
    },
    {
        "title": "Kukatpally Housing Board (KPHB)",
        "subtitle": "Kukatpally, Hyderabad, Telangana",
        "address": "KPHB Colony, Kukatpally, Hyderabad, Telangana",
        "lat": 17.4938,
        "lng": 78.3995,
        "tags": ["kphb", "kukatpally", "jntu"]
    },
    {
        "title": "JNTU Hyderabad",
        "subtitle": "Kukatpally, Hyderabad, Telangana",
        "address": "JNTU College of Engineering, Kukatpally, Hyderabad, Telangana",
        "lat": 17.4975,
        "lng": 78.3914,
        "tags": ["jntu", "jntuh", "kukatpally"]
    },
    {
        "title": "Ameerpet Metro Interchange",
        "subtitle": "Ameerpet, Hyderabad, Telangana",
        "address": "Ameerpet Metro Station, Hyderabad, Telangana",
        "lat": 17.4357,
        "lng": 78.4446,
        "tags": ["ameerpet", "metro"]
    },
    {
        "title": "Jubilee Hills Checkpost",
        "subtitle": "Road No. 36, Jubilee Hills, Hyderabad, Telangana",
        "address": "Jubilee Hills Checkpost, Hyderabad, Telangana",
        "lat": 17.4300,
        "lng": 78.4073,
        "tags": ["jubilee hills", "checkpost", "road 36"]
    },
    {
        "title": "Banjara Hills Road No. 12",
        "subtitle": "Banjara Hills, Hyderabad, Telangana",
        "address": "Road Number 12, Banjara Hills, Hyderabad, Telangana",
        "lat": 17.4180,
        "lng": 78.4350,
        "tags": ["banjara hills", "road 12"]
    },
    {
        "title": "Uppal Cricket Stadium",
        "subtitle": "Rajiv Gandhi Stadium, Uppal, Hyderabad, Telangana",
        "address": "Rajiv Gandhi International Cricket Stadium, Uppal, Hyderabad, Telangana",
        "lat": 17.4065,
        "lng": 78.5593,
        "tags": ["uppal", "stadium", "cricket"]
    },
    {
        "title": "Mehdipatnam Rythu Bazar",
        "subtitle": "Mehdipatnam, Hyderabad, Telangana",
        "address": "Mehdipatnam Bus Stop, Hyderabad, Telangana",
        "lat": 17.3916,
        "lng": 78.4398,
        "tags": ["mehdipatnam", "bus stand"]
    },
    {
        "title": "Miyapur Cross Roads",
        "subtitle": "Miyapur, Hyderabad, Telangana",
        "address": "Miyapur Metro Station & Junction, Hyderabad, Telangana",
        "lat": 17.4968,
        "lng": 78.3547,
        "tags": ["miyapur", "cross road", "metro"]
    },
    {
        "title": "Kakatiya Fort & Kala Thoranam",
        "subtitle": "Warangal, Telangana",
        "address": "Warangal Fort, Warangal, Telangana",
        "lat": 17.9689,
        "lng": 79.5941,
        "tags": ["warangal", "fort", "kakatiya"]
    },
    {
        "title": "Thousand Pillar Temple",
        "subtitle": "Hanamkonda, Warangal, Telangana",
        "address": "Thousand Pillar Temple, Hanamkonda, Telangana",
        "lat": 18.0039,
        "lng": 79.5762,
        "tags": ["hanamkonda", "warangal", "temple"]
    },
    {
        "title": "Karimnagar Bus Station",
        "subtitle": "Karimnagar, Telangana",
        "address": "Karimnagar Main Bus Stand, Karimnagar, Telangana",
        "lat": 18.4386,
        "lng": 79.1288,
        "tags": ["karimnagar", "bus stand"]
    },
    {
        "title": "Nizamabad Railway Station",
        "subtitle": "Nizamabad, Telangana",
        "address": "Nizamabad Junction, Nizamabad, Telangana",
        "lat": 18.6725,
        "lng": 78.0941,
        "tags": ["nizamabad", "station"]
    },
    {
        "title": "Khammam Bus Stand",
        "subtitle": "Khammam, Telangana",
        "address": "Khammam Central Bus Station, Khammam, Telangana",
        "lat": 17.2473,
        "lng": 80.1514,
        "tags": ["khammam"]
    }
]

# --- Endpoints ---

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "platform": "KVN Ride Booking Platform (Python FastAPI)",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/locations/search")
def search_locations(q: str = Query(..., min_length=1)):
    """
    Fast Google-style location autocomplete API for Telangana:
    1. Matches instantly from curated Telangana landmarks & colleges (BIET, BN Reddy, etc.)
    2. Enriches with OpenStreetMap Nominatim results for Telangana/India
    """
    query_lower = q.lower().strip()
    matched = []

    # 1. Match local landmarks
    for item in TELANGANA_LANDMARKS:
        title_match = query_lower in item["title"].lower()
        sub_match = query_lower in item["subtitle"].lower()
        tag_match = any(query_lower in tag or tag in query_lower for tag in item.get("tags", []))
        if title_match or sub_match or tag_match:
            matched.append({
                "title": item["title"],
                "subtitle": item["subtitle"],
                "address": item["address"],
                "lat": item["lat"],
                "lng": item["lng"],
                "source": "verified_telangana"
            })

    # 2. Live geocoder enrichment via Nominatim if needed
    if len(matched) < 6:
        try:
            import urllib.request
            import urllib.parse
            import json as pyjson

            # Add Telangana if query is short or doesn't specify state
            search_term = q.strip()
            if "telangana" not in search_term.lower() and "hyderabad" not in search_term.lower():
                search_term = f"{search_term}, Telangana, India"

            url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(search_term)}&format=json&countrycodes=in&limit=6"
            req = urllib.request.Request(url, headers={"User-Agent": "KVNRidesTelanganaApp/2.0"})
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                data = pyjson.loads(resp.read().decode())
                for item in data:
                    display = item.get("display_name", "")
                    parts = [p.strip() for p in display.split(",")]
                    title = parts[0] if parts else display
                    subtitle = ", ".join(parts[1:4]) if len(parts) > 1 else "Telangana, India"
                    
                    # Prevent duplicates
                    if not any(abs(m["lat"] - float(item["lat"])) < 0.002 and abs(m["lng"] - float(item["lon"])) < 0.002 for m in matched):
                        matched.append({
                            "title": title,
                            "subtitle": subtitle,
                            "address": display,
                            "lat": float(item["lat"]),
                            "lng": float(item["lon"]),
                            "source": "geocoded"
                        })
        except Exception:
            pass

    return {
        "success": True,
        "query": q,
        "locations": matched[:8]
    }

@app.post("/api/auth/register")
def register_user(req: RegisterReq):
    existing = users_col.find_one({"$or": [{"email": req.email.lower()}, {"phone": req.phone}]})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email or mobile number already exists")

    doc = {
        "name": req.name,
        "phone": req.phone,
        "email": req.email.lower(),
        "password": req.password,
        "role": "CUSTOMER",
        "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        "savedPlaces": [],
        "createdAt": datetime.utcnow()
    }
    result = users_col.insert_one(doc)
    user_id = str(result.inserted_id)

    # Initial wallet with welcome bonus
    wallets_col.insert_one({
        "userId": user_id,
        "balance": 150,
        "promotionalBalance": 50
    })

    return {
        "success": True,
        "token": f"jwt_mock_token_{user_id}",
        "user": {
            "id": user_id,
            "name": req.name,
            "phone": req.phone,
            "email": req.email.lower(),
            "role": "CUSTOMER",
            "avatar": doc["avatar"]
        }
    }

@app.post("/api/auth/login")
def login_user(req: LoginReq):
    user = users_col.find_one({
        "$or": [{"email": req.identifier.lower()}, {"phone": req.identifier}]
    })
    if not user or user.get("password") != req.password:
        raise HTTPException(status_code=401, detail="Invalid mobile number/email or password")

    user_id = str(user["_id"])
    return {
        "success": True,
        "token": f"jwt_mock_token_{user_id}",
        "user": {
            "id": user_id,
            "name": user.get("name"),
            "phone": user.get("phone"),
            "email": user.get("email"),
            "role": user.get("role", "CUSTOMER"),
            "avatar": user.get("avatar")
        }
    }

@app.post("/api/auth/verify-otp")
def verify_otp(req: VerifyOtpReq):
    user = users_col.find_one({"phone": req.phone})
    if not user:
        rider_name = req.name.strip() if req.name and req.name.strip() else f"KVN Rider {req.phone[-4:]}"
        doc = {
            "name": rider_name,
            "phone": req.phone,
            "email": f"rider_{req.phone[-6:]}@kvn.local",
            "password": "Password@123",
            "role": "CUSTOMER",
            "avatar": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            "createdAt": datetime.utcnow()
        }
        res = users_col.insert_one(doc)
        user = doc
        user["_id"] = res.inserted_id
        wallets_col.insert_one({"userId": str(res.inserted_id), "balance": 150, "promotionalBalance": 50})
    elif req.name and req.name.strip():
        users_col.update_one({"_id": user["_id"]}, {"$set": {"name": req.name.strip()}})
        user["name"] = req.name.strip()

    user_id = str(user["_id"])
    return {
        "success": True,
        "token": f"jwt_mock_token_{user_id}",
        "user": {
            "id": user_id,
            "name": user.get("name"),
            "phone": user.get("phone"),
            "email": user.get("email"),
            "role": "CUSTOMER",
            "avatar": user.get("avatar")
        }
    }

@app.get("/api/auth/profile")
def get_profile():
    demo = users_col.find_one({"phone": "9876543210"}) or users_col.find_one()
    wallet = wallets_col.find_one({"userId": str(demo["_id"])}) if demo else None
    return {
        "success": True,
        "user": serialize_doc(demo),
        "wallet": serialize_doc(wallet)
    }

# --- Rides & Fare Engine ---

@app.post("/api/rides/estimate")
def estimate_fare(req: EstimateReq):
    dist_km = calculate_distance_km(req.pickupLat, req.pickupLng, req.dropLat, req.dropLng)
    coupon = None
    if req.couponCode:
        coupon = coupons_col.find_one({"code": req.couponCode.upper(), "isActive": True})

    types = ["BIKE", "AUTO", "CAB"]
    base_rates = {
        "BIKE": {"base": 25, "km": 9, "min": 1.5, "minFare": 30, "fee": 5},
        "AUTO": {"base": 35, "km": 14, "min": 2.0, "minFare": 45, "fee": 7},
        "CAB":  {"base": 65, "km": 18, "min": 2.5, "minFare": 80, "fee": 15},
    }

    estimates = {}
    for t in types:
        r = base_rates[t]
        duration = estimate_trip_duration(dist_km, t)
        dist_charge = round(max(0.0, dist_km - 1.5) * r["km"])
        time_charge = round(duration * r["min"])
        subtotal = r["base"] + dist_charge + time_charge + r["fee"]
        total = max(r["minFare"], subtotal)

        discount = 0
        if coupon:
            if coupon.get("discountType") == "PERCENTAGE":
                discount = min(coupon.get("maximumDiscount", 50), round(total * (coupon.get("discountValue", 50) / 100)))
            else:
                discount = min(coupon.get("discountValue", 20), total)

        final_fare = max(10, total - discount)

        estimates[t] = {
            "vehicleType": t,
            "distanceKm": dist_km,
            "durationMinutes": duration,
            "etaMinutes": random.randint(2, 5),
            "fare": {
                "baseFare": r["base"],
                "distanceCharge": dist_charge,
                "timeCharge": time_charge,
                "bookingFee": r["fee"],
                "discount": discount,
                "totalFare": final_fare,
                "driverEarning": round(final_fare * 0.8),
                "platformCommission": round(final_fare * 0.2)
            }
        }

    return {
        "success": True,
        "distanceKm": dist_km,
        "estimates": estimates,
        "appliedCoupon": serialize_doc(coupon) if coupon else None
    }

@app.post("/api/rides")
def create_ride(req: CreateRideReq, background_tasks: BackgroundTasks):
    dist_km = calculate_distance_km(
        req.pickupLocation.lat, req.pickupLocation.lng,
        req.dropLocation.lat, req.dropLocation.lng
    )
    duration = estimate_trip_duration(dist_km, req.vehicleType)

    # Calculate fare
    base_fares = {"BIKE": (25, 9, 1.5, 30, 5), "AUTO": (35, 14, 2.0, 45, 7), "CAB": (65, 18, 2.5, 80, 15)}
    base, km_r, min_r, min_f, fee = base_fares.get(req.vehicleType, base_fares["BIKE"])
    dist_charge = round(max(0.0, dist_km - 1.5) * km_r)
    time_charge = round(duration * min_r)
    total = max(min_f, base + dist_charge + time_charge + fee)

    discount = 0
    if req.couponCode:
        c = coupons_col.find_one({"code": req.couponCode.upper(), "isActive": True})
        if c:
            discount = min(c.get("maximumDiscount", 50), round(total * 0.5) if c.get("discountType") == "PERCENTAGE" else c.get("discountValue", 20))

    final_total = max(10, total - discount)
    otp = str(random.randint(1000, 9999))

    captains_within_2km = get_captains_within_2km(req.pickupLocation.lat, req.pickupLocation.lng, req.vehicleType)

    ride_doc = {
        "vehicleType": req.vehicleType,
        "pickupLocation": req.pickupLocation.dict(),
        "dropLocation": req.dropLocation.dict(),
        "distanceKm": dist_km,
        "durationMinutes": duration,
        "fareBreakdown": {
            "baseFare": base,
            "distanceCharge": dist_charge,
            "timeCharge": time_charge,
            "bookingFee": fee,
            "discount": discount,
            "taxes": round(final_total * 0.05),
            "totalFare": final_total,
            "driverEarning": round(final_total * 0.8),
            "platformCommission": round(final_total * 0.2)
        },
        "couponCode": req.couponCode,
        "paymentMethod": req.paymentMethod,
        "paymentStatus": "PENDING",
        "status": "SEARCHING_DRIVER",
        "dispatchRadiusKm": 2.0,
        "broadcastCaptains": captains_within_2km,
        "otp": otp,
        "createdAt": datetime.utcnow()
    }

    res = rides_col.insert_one(ride_doc)
    ride_id = str(res.inserted_id)
    ride_doc["_id"] = ride_id
    ride_doc["id"] = ride_id

    # Broadcast ride:new_request simultaneously to all eligible captains via Socket.IO
    background_tasks.add_task(broadcast_new_ride, ride_doc, captains_within_2km)

    return {"success": True, "ride": ride_doc, "broadcastCount": len(captains_within_2km)}

@app.get("/api/captains/active-order")
def get_active_order_for_captains():
    """
    Returns the latest order broadcasting to captains within 2km radius.
    If already accepted by any captain, status is DRIVER_ASSIGNED so it disappears right away.
    """
    order = rides_col.find_one({"status": "SEARCHING_DRIVER"}, sort=[("createdAt", -1)])
    if not order:
        return {"success": True, "activeOrder": None, "captainsWithin2km": []}
    return {
        "success": True,
        "activeOrder": serialize_doc(order),
        "captainsWithin2km": order.get("broadcastCaptains", [])
    }

@app.post("/api/rides/{ride_id}/accept")
def accept_ride_by_captain(ride_id: str, req: AcceptRideReq, background_tasks: BackgroundTasks):
    """
    Atomic first-come, first-served lock:
    The first captain who accepts gets the order automatically.
    The order disappears from other captains' apps right away via Socket.IO.
    """
    from pymongo import ReturnDocument

    captain_info = {
        "id": req.captainId,
        "code": req.captainId,
        "name": req.captainName or "Captain Ramesh Yadav",
        "phone": req.phone or "+91 98480 11223",
        "avatar": req.avatar or "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        "vehicle": req.vehicle or "Honda Activa 6G (Black)",
        "plateNumber": req.plateNumber or "TS 08 EA 4589",
        "rating": 4.92
    }

    # Fetch captain location if in DB
    captain_loc = {"lat": 17.3228 + 0.003, "lng": 78.5630 + 0.003}
    try:
        c_db = captains_col.find_one({"$or": [{"_id": ObjectId(req.captainId)} if ObjectId.is_valid(req.captainId) else {"phone": req.captainId}, {"code": req.captainId}]})
        if c_db and c_db.get("location"):
            captain_loc = c_db["location"]
    except Exception:
        pass

    # Atomic lock: updates ONLY IF status is still SEARCHING_DRIVER
    try:
        updated_ride = rides_col.find_one_and_update(
            {"_id": ObjectId(ride_id), "status": "SEARCHING_DRIVER"},
            {"$set": {
                "status": "DRIVER_ASSIGNED",
                "captainId": req.captainId,
                "captain_id": req.captainId,
                "driver": captain_info,
                "driverLiveLocation": {
                    "lat": captain_loc.get("lat", 17.3228 + 0.003),
                    "lng": captain_loc.get("lng", 78.5630 + 0.003)
                },
                "acceptedAt": datetime.utcnow()
            }},
            return_document=ReturnDocument.AFTER
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ride ID format")

    if not updated_ride:
        # Another captain already accepted!
        raise HTTPException(
            status_code=409,
            detail="Order already accepted by another captain. It has disappeared from your queue."
        )

    # Update winning captain status to BUSY
    try:
        query = {"_id": ObjectId(req.captainId)} if ObjectId.is_valid(req.captainId) else {"$or": [{"phone": req.captainId}, {"code": req.captainId}]}
        captains_col.update_one(query, {"$set": {"status": "BUSY"}})
    except Exception as e:
        print(f"[Accept] Error setting captain status to BUSY: {e}")

    # Real-time socket broadcast: winner confirmed, other captains cancelled, customer notified
    background_tasks.add_task(broadcast_ride_accepted, serialize_doc(updated_ride), captain_info)

    return {
        "success": True,
        "message": f"Ride accepted by {captain_info['name']}!",
        "ride": serialize_doc(updated_ride)
    }

@app.get("/api/rides/my-rides")
def get_my_rides():
    rides = list(rides_col.find().sort("createdAt", -1).limit(30))
    return {"success": True, "rides": [serialize_doc(r) for r in rides]}

@app.get("/api/rides/{ride_id}")
def get_ride(ride_id: str):
    try:
        doc = rides_col.find_one({"_id": ObjectId(ride_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid ride ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Ride not found")
    return {"success": True, "ride": serialize_doc(doc)}

@app.post("/api/rides/{ride_id}/cancel")
def cancel_ride(ride_id: str):
    rides_col.update_one({"_id": ObjectId(ride_id)}, {"$set": {"status": "CANCELLED"}})
    return {"success": True, "message": "Ride cancelled successfully"}

@app.post("/api/rides/{ride_id}/advance-status")
def advance_ride_status(ride_id: str):
    """Convenient endpoint to advance ride to RIDE_STARTED and RIDE_COMPLETED for instant testing"""
    r = rides_col.find_one({"_id": ObjectId(ride_id)})
    if not r:
        raise HTTPException(status_code=404, detail="Ride not found")
    curr = r.get("status")
    next_status = "DRIVER_ARRIVED"
    if curr == "DRIVER_ARRIVED":
        next_status = "RIDE_STARTED"
    elif curr == "RIDE_STARTED":
        next_status = "RIDE_COMPLETED"
    rides_col.update_one({"_id": ObjectId(ride_id)}, {"$set": {"status": next_status}})
    return {"success": True, "status": next_status}

@app.post("/api/rides/{ride_id}/rate")
def rate_ride(ride_id: str, req: RateRideReq):
    ratings_col.insert_one({
        "rideId": ride_id,
        "score": req.score,
        "comment": req.comment,
        "tags": req.tags,
        "createdAt": datetime.utcnow()
    })
    return {"success": True, "message": "Rating submitted successfully"}

# --- Payments & Wallet ---

@app.post("/api/payments/verify")
def verify_payment(req: PaymentVerifyReq):
    rides_col.update_one(
        {"_id": ObjectId(req.rideId)},
        {"$set": {"paymentStatus": "SUCCESS", "paymentMethod": req.method}}
    )
    return {
        "success": True,
        "message": "Payment verified successfully",
        "payment": {
            "rideId": req.rideId,
            "method": req.method,
            "status": "SUCCESS",
            "transactionId": req.transactionId or f"TXN_{int(time.time()*1000)}"
        }
    }

@app.post("/api/payments/wallet")
def pay_with_wallet(req: WalletPayReq):
    ride = rides_col.find_one({"_id": ObjectId(req.rideId)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    amount = ride.get("fareBreakdown", {}).get("totalFare", 50)

    demo_user = users_col.find_one({"phone": "9876543210"})
    u_id = str(demo_user["_id"]) if demo_user else "default"
    w = wallets_col.find_one({"userId": u_id})

    if not w or w.get("balance", 0) < amount:
        raise HTTPException(status_code=400, detail=f"Insufficient balance. Required: ₹{amount}")

    new_bal = w.get("balance", 0) - amount
    wallets_col.update_one({"userId": u_id}, {"$set": {"balance": new_bal}})
    rides_col.update_one({"_id": ObjectId(req.rideId)}, {"$set": {"paymentStatus": "SUCCESS", "paymentMethod": "WALLET"}})

    return {
        "success": True,
        "message": f"Paid ₹{amount} from KVN Wallet",
        "remainingBalance": new_bal,
        "payment": {"method": "WALLET", "status": "SUCCESS"}
    }

@app.get("/api/wallet")
def get_wallet():
    demo_user = users_col.find_one({"phone": "9876543210"})
    u_id = str(demo_user["_id"]) if demo_user else "default"
    w = wallets_col.find_one({"userId": u_id}) or {"balance": 350, "promotionalBalance": 50}
    return {"success": True, "wallet": serialize_doc(w)}

@app.post("/api/wallet/topup")
def topup_wallet(req: TopupReq):
    demo_user = users_col.find_one({"phone": "9876543210"})
    u_id = str(demo_user["_id"]) if demo_user else "default"
    wallets_col.update_one({"userId": u_id}, {"$inc": {"balance": req.amount}}, upsert=True)
    w = wallets_col.find_one({"userId": u_id})
    return {"success": True, "wallet": serialize_doc(w), "message": f"Added ₹{req.amount} successfully"}

# --- Coupons ---

@app.get("/api/coupons")
def get_coupons():
    coupons = list(coupons_col.find({"isActive": True}))
    return {"success": True, "coupons": [serialize_doc(c) for c in coupons]}

@app.post("/api/coupons/validate")
def validate_coupon(code: str = Query(...)):
    c = coupons_col.find_one({"code": code.upper(), "isActive": True})
    if not c:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    return {"success": True, "coupon": serialize_doc(c)}

# --- Support ---

@app.post("/api/support/tickets")
def create_ticket(req: TicketReq):
    t_num = f"TKT-{int(time.time())}"[-8:]
    doc = {
        "ticketNumber": t_num,
        "category": req.category,
        "subject": req.subject,
        "description": req.description,
        "rideId": req.rideId,
        "status": "OPEN",
        "createdAt": datetime.utcnow()
    }
    res = support_col.insert_one(doc)
    doc["_id"] = str(res.inserted_id)
    return {"success": True, "ticket": doc}

@app.get("/api/support/my-tickets")
def get_my_tickets():
    tickets = list(support_col.find().sort("createdAt", -1).limit(20))
    return {"success": True, "tickets": [serialize_doc(t) for t in tickets]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:socket_app", host="0.0.0.0", port=5000, reload=True)
