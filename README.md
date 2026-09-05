# 🚀 KVN — Ride-Booking Ecosystem (Customer + Captain + FastAPI + MongoDB)

**KVN** ("Ride. Earn. Move with KVN") is a production-grade ride-hailing ecosystem built for Indian riders and driver partners (supporting **Bike**, **Auto**, and **Cab**).

The ecosystem connects customer ride requests directly with nearby driver partners in real time via **Python FastAPI**, **Socket.io**, and **MongoDB**.

---

## 🏗 Platform Architecture

```
KVN_BIKE_CAPTION/
├── backend/
│   ├── main.py              # Python FastAPI server with Customer & Captain endpoints + ASGI Socket.io
│   ├── database.py          # PyMongo MongoDB client & automatic seeding (Captains A-E, users, fares)
│   ├── sockets.py           # Socket.io real-time engine & 2KM simultaneous broadcast handlers
│   ├── captain_routes.py    # Captain REST APIs (auth, arrived, verify-otp, start, complete, test suite)
│   └── requirements.txt     # Python dependencies
├── frontend/                # Customer Ride-Booking Web Application (Port 5173)
│   ├── src/
│   │   ├── pages/CustomerApp.jsx
│   │   ├── components/
│   │   └── services/
│   └── package.json
├── captain-frontend/        # Captain / Driver Partner Web Application (Port 5174)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CaptainNavbar.jsx      # Online/Offline switch, SOS, Captain switcher
│   │   │   ├── CaptainMap.jsx         # Leaflet + custom KVN vehicle and route markers
│   │   │   ├── RideRequestModal.jsx   # 15s visual countdown request card with Accept/Reject
│   │   │   ├── ActiveRideSheet.jsx    # Arrived -> OTP verify -> Start -> Complete ride
│   │   │   ├── OtpVerificationModal.jsx # 4-digit Ride OTP keypad
│   │   │   ├── CaptainChatModal.jsx   # Real-time chat with rider
│   │   │   ├── SafetyCenterModal.jsx  # SOS Emergency (112 police dispatch)
│   │   │   └── ScenarioTestModal.jsx  # Interactive 2KM radius & race condition test runner
│   │   ├── pages/
│   │   │   ├── CaptainDashboard.jsx   # Main map & bottom sheet experience
│   │   │   ├── EarningsPage.jsx       # Daily, weekly, monthly earnings breakdown
│   │   │   ├── RideHistoryPage.jsx    # Past completed rides and receipts
│   │   │   ├── CaptainProfilePage.jsx # Vehicle info, plate, verified badge, documents
│   │   │   └── CaptainAuthPage.jsx    # Login and 6-step registration onboarding wizard
│   │   └── context/CaptainAuthContext.jsx
│   └── package.json
├── test_e2e.py              # Automated End-to-End Test Suite (Scenarios 45 & 46)
└── README.md
```

---

## ⚡ Core Dispatch Logic & Guarantees

### 1. 2 KM Radius Simultaneous Broadcast
- When a customer confirms a booking, the backend queries all captains who are **ONLINE**, **AVAILABLE**, **APPROVED**, and match the requested **vehicleType**.
- Calculates Haversine distance between customer pickup coordinates and captain GPS coordinates.
- Sends the request **to all eligible captains within 2.0 km simultaneously** via Socket.io (`ride:new_request`).
- Captains beyond 2.0 km (e.g. Captain E at 2.5 km) are strictly excluded.

### 2. First Accept Wins (Atomic Lock)
- Booking assignment uses an atomic conditional MongoDB update:
  `find_one_and_update({"_id": ObjectId(ride_id), "status": "SEARCHING_DRIVER"}, {"$set": {"status": "DRIVER_ASSIGNED", "captainId": ...}})`
- The first captain to click **ACCEPT** wins the booking (HTTP 200).
- The backend immediately broadcasts `ride:no_longer_available` to dismiss the request from all other captains.
- Any concurrent accept attempt receives **HTTP 409 Conflict** (`"Order already accepted by another captain"`).

### 3. Full Ride Lifecycle
1. **Customer Creates Booking** -> Sockets broadcast to eligible captains within 2 KM.
2. **Captain Accepts** -> Status: `DRIVER_ASSIGNED`. Customer sees assigned Captain and live location.
3. **Captain Arrives** -> Clicks `I HAVE ARRIVED`. Status: `DRIVER_ARRIVED`. Customer notified.
4. **OTP Verification** -> Customer shares 4-digit Ride OTP. Captain enters OTP. Verified against database.
5. **Start Ride** -> Status: `RIDE_STARTED`. Trip timer starts and coordinates stream live.
6. **Complete Ride** -> Destination reached. Status: `RIDE_COMPLETED`. Final fare calculated and credited to Captain wallet. Captain status returns to `AVAILABLE`.

---

## 🧪 Automated Test Verification

Run the end-to-end integration test:
```bash
python test_e2e.py
```

### Verified Test Results:
* **Scenario 45 (2 KM Radius Filter)**: Captains A (0.46 km), B (0.77 km), C (1.15 km), and D (1.67 km) verified within 2 km; Captain E (2.55 km) excluded.
* **Scenario 46 (Atomic Race Condition Safeguard)**: Simultaneous accept requests result in Captain A winning (200 OK) and Captain B receiving 409 Conflict.
* **Full Ride Lifecycle**: Booking -> Dispatch -> Accept -> Arrived -> OTP Verified -> Ride Started -> Chat -> SOS -> Complete Ride -> Earnings Credited.

---

## 🚀 Running Locally

### 1. Start MongoDB
Ensure MongoDB is running locally on `localhost:27017`.

### 2. Start Backend (Port 5000)
```bash
cd backend
python -m uvicorn main:socket_app --host 0.0.0.0 --port 5000 --reload
```

### 3. Start Customer App (Port 5173)
```bash
cd frontend
npm install
npm run dev
```

### 4. Start Captain App (Port 5174)
```bash
cd captain-frontend
npm install
npm run dev
```

Open:
- **Customer App**: `http://localhost:5173`
- **Captain App**: `http://localhost:5174`
- **API Health**: `http://localhost:5000/api/health`
