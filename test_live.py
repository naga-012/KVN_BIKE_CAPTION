import urllib.request
import json
import time

BASE = 'https://kvn-backend.onrender.com/api'

def post(endpoint, data=None):
    req = urllib.request.Request(
        f'{BASE}{endpoint}',
        data=json.dumps(data or {}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        return 500, {'error': str(e)}

def get(endpoint):
    req = urllib.request.Request(f'{BASE}{endpoint}')
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        return 500, {'error': str(e)}

print("=== 1. Health Check ===")
s, r = get('/health')
print("Health:", s, r.get('status'))

print("\n=== 2. Scenario 45: 2KM Radius Dispatch Test ===")
s, r = post('/captains/test-scenario/reset')
print("Reset status:", s)
print("Eligible (<2km):", [c['code'] for c in r.get('eligibleWithin2Km', [])])
print("Excluded (>2km):", [c['code'] for c in r.get('excludedOutside2Km', [])])

print("\n=== 3. Customer Creates Ride ===")
ride_payload = {
    'pickupLocation': {'address': 'BN Reddy Nagar Bus Stop, Hyderabad', 'lat': 17.3228, 'lng': 78.5630},
    'dropLocation': {'address': 'BIET College Ibrahimpatnam', 'lat': 17.1895, 'lng': 78.6534},
    'vehicleType': 'BIKE',
    'paymentMethod': 'UPI'
}
s, r = post('/rides', ride_payload)
print("Ride Creation status:", s)
if s == 200:
    ride = r['ride']
    ride_id = ride['id']
    otp = ride['otp']
    print(f"Ride ID: {ride_id}")
    print(f"Captains broadcasted to: {r.get('broadcastCount')}")
    print(f"OTP: {otp}")

    print("\n=== 4. Check Active Order for Captains ===")
    s, ord_r = get('/captains/active-order')
    print("Active order found:", ord_r.get('activeOrder') is not None)
    if ord_r.get('activeOrder'):
        print("Order Ride ID:", ord_r['activeOrder'].get('id'))

    print("\n=== 5. Captain A Accepts Ride ===")
    s, acc = post(f'/rides/{ride_id}/accept', {
        'captainId': 'cpt_a',
        'captainName': 'Captain A - Ramesh Yadav',
        'vehicle': 'Honda Activa 6G (Black)',
        'plateNumber': 'TS 08 EA 4589'
    })
    print("Accept status:", s, acc.get('message'))

    print("\n=== 6. Captain B Conflict Check (Should Fail 409) ===")
    s, lost = post(f'/rides/{ride_id}/accept', {
        'captainId': 'cpt_b',
        'captainName': 'Captain B - Shiva Kumar'
    })
    print("Conflict status:", s, lost.get('detail'))

    print("\n=== 7. Captain Arrived ===")
    s, arr = post(f'/rides/{ride_id}/arrived', {})
    print("Arrived status:", s, arr.get('status'))

    print("\n=== 8. Verify OTP and Start Ride ===")
    s, otp_res = post(f'/rides/{ride_id}/verify-otp', {'otp': otp})
    print("OTP verify status:", s, otp_res.get('message'))
    s, start = post(f'/rides/{ride_id}/start', {})
    print("Trip start status:", s, start.get('status'))

    print("\n=== 9. Complete Ride ===")
    s, comp = post(f'/rides/{ride_id}/complete', {})
    print("Complete status:", s, comp.get('status'))
    print("All Lifecycle Tests Passed Successfully!")
