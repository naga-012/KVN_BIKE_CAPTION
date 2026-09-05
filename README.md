# 🚀 KVN — Customer Ride-Booking Platform (Python FastAPI + React)

**KVN** is a modern, full-stack customer ride-booking application built specifically for Indian riders (supporting **Bike**, **Auto**, and **Cab**).

The architecture consists of a high-performance **Python FastAPI** backend connected to **MongoDB** and a **React + Vite + Tailwind CSS** customer frontend.

---

## 🏗 Architecture & Stack

```
KVN/
├── backend/
│   ├── main.py              # Python FastAPI server with all customer endpoints
│   ├── database.py          # PyMongo MongoDB client & automatic data seeding
│   ├── requirements.txt     # Python dependencies (fastapi, uvicorn, pymongo, pydantic)
│   └── .env                 # Environment configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # MapView (Leaflet), Header, Modals (Chat, Safety, Payment, Rating, Invoice)
│   │   ├── context/         # AuthContext, ToastContext
│   │   ├── pages/
│   │   │   └── CustomerApp.jsx  # Complete Customer Booking & Ride Lifecycle experience
│   │   ├── services/        # Axios API client & Socket.io client
│   │   ├── App.jsx          # Customer application entry shell
│   │   ├── index.css        # Tailwind & glassmorphism theme
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

---

## 🌟 Customer Features Included

1. **Interactive Map**: OpenStreetMap + Leaflet with custom SVG markers and live animated route lines.
2. **Dynamic Fare Engine**: Server-calculated fares in Python for **Bike**, **Auto**, and **Cab** with haversine distance & duration.
3. **Discount Coupons**: Promo code application (`KVN50`, `FIRST20`, `BIKE10`).
4. **Radar Dispatch**: Live searching animation connecting to nearby drivers.
5. **Driver Assigned & Arrived**: Live driver coordinates, vehicle plate number, driver rating, and **4-digit Ride OTP**.
6. **Trip Progression Simulation**: Instant simulation controls to test driver arrival, ride start, and trip completion.
7. **In-Ride Live Chat**: Live messaging modal between customer and driver partner.
8. **Safety & SOS Center**: 1-click emergency SOS alert, police 112 hotline, and live trip link sharing.
9. **Itemized Receipt & Invoice**: Complete fare breakdown (base fare, distance charge, time charge, taxes, discount) with print/download.
10. **Multi-Modal Payments**: UPI (GPay/PhonePe/Paytm), KVN Wallet, Cards, and Cash.
11. **5-Star Rating & Reviews**: Post-trip ratings with feedback chips.
12. **KVN Wallet**: Balance management, top-up funds, and promotional balance ledger.
13. **Trip History & Invoices**: Overview of all past completed trips with receipts.
14. **Customer Support**: Ticket submission and resolution tracker.

---

## 🚀 Running Locally

### 1. Python Backend
```bash
cd backend
python -m pip install -r requirements.txt
python main.py
```
*API runs on `http://localhost:5000` (Swagger docs available at `http://localhost:5000/docs`)*

### 2. React Customer Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*
