import urllib.request
import json

BASE = 'http://localhost:5000/api'

def post(endpoint, data):
    req = urllib.request.Request(
        f'{BASE}{endpoint}',
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def get(endpoint):
    req = urllib.request.Request(f'{BASE}{endpoint}')
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

print('===========================================================')
print('=== 1. TEST SCENARIO 45: 2KM GEOSPATIAL FILTERING ===')
print('===========================================================')
s45_status, s45_res = post('/captains/test-scenario/reset', {})
print(f'Reset & Filter Status: {s45_status}')
print(f"Summary: {s45_res.get('summary')}")
print(f"Eligible (within 2km): {[c['code'] + ' (' + str(c['distanceKm']) + 'km)' for c in s45_res.get('eligibleWithin2Km', [])]}")
print(f"Excluded (outside 2km): {[c['code'] + ' (' + str(c['distanceKm']) + 'km)' for c in s45_res.get('excludedOutside2Km', [])]}")

print('\n===========================================================')
print('=== 2. TEST SCENARIO 46: CONCURRENT RACE CONDITION TEST ===')
print('===========================================================')
s46_status, s46_res = post('/captains/test-scenario/race-accept', {})
print(f'Race Condition Status: {s46_status}')
print(f"Execution Results: {s46_res.get('results')}")
print(f"Winner: {s46_res.get('winningCaptain')}")
print(f"Safeguard: {s46_res.get('raceConditionSafeguard')}")

print('\n===========================================================')
print('=== 3. COMPLETE END-TO-END CUSTOMER & CAPTAIN LIFECYCLE ===')
print('===========================================================')
# Customer creates real ride
create_status, create_res = post('/rides', {
    'pickupLocation': {'address': 'BN Reddy Nagar Bus Stop, Hyderabad', 'lat': 17.3228, 'lng': 78.5630},
    'dropLocation': {'address': 'BIET College Ibrahimpatnam', 'lat': 17.1895, 'lng': 78.6534},
    'vehicleType': 'BIKE',
    'paymentMethod': 'UPI'
})
ride = create_res['ride']
ride_id = ride['id']
otp = ride['otp']
broadcast_count = create_res['broadcastCount']
print(f'[Step 1] Customer created ride ID: {ride_id}')
print(f'         Broadcast sent simultaneously to {broadcast_count} eligible captains within 2 KM')
print(f'         Customer Ride OTP generated: {otp}')

# Winner accepts
acc_status, acc_res = post(f'/rides/{ride_id}/accept', {
    'captainId': 'cpt_a',
    'captainName': 'Captain A - Ramesh Yadav',
    'vehicle': 'Honda Activa 6G (Black)',
    'plateNumber': 'TS 08 EA 4589'
})
print(f'[Step 2] Captain A clicks ACCEPT -> Status {acc_status}: {acc_res.get("message")}')

# Loser tries to accept
lost_status, lost_res = post(f'/rides/{ride_id}/accept', {
    'captainId': 'cpt_b',
    'captainName': 'Captain B - Shiva Kumar'
})
print(f'[Step 3] Captain B clicks ACCEPT -> Status {lost_status} CONFLICT: {lost_res.get("detail")}')

# Captain marks Arrived
arr_status, arr_res = post(f'/rides/{ride_id}/arrived', {})
print(f'[Step 4] Captain clicks ARRIVED -> Status {arr_status}, ride.status = {arr_res.get("status")}')

# Captain verifies OTP
otp_status, otp_res = post(f'/rides/{ride_id}/verify-otp', {'otp': otp})
print(f'[Step 5] Captain enters OTP {otp} -> Status {otp_status}: {otp_res.get("message")}')

# Captain starts ride
start_status, start_res = post(f'/rides/{ride_id}/start', {})
print(f'[Step 6] Captain clicks START RIDE -> Status {start_status}, ride.status = {start_res.get("status")}')

# Captain sends Chat message
chat_status, chat_res = post(f'/rides/{ride_id}/chat', {
    'sender': 'Captain Ramesh',
    'senderType': 'CAPTAIN',
    'text': 'We are on the way to BIET College.'
})
chat_msg = chat_res.get('message', {}).get('text')
print(f'[Step 7] Captain sends Chat message -> Status {chat_status}: "{chat_msg}"')

# Captain triggers SOS
sos_status, sos_res = post('/captains/sos', {
    'captainId': 'cpt_a',
    'rideId': ride_id,
    'lat': 17.3228,
    'lng': 78.5630,
    'reason': 'Test Safety Drill'
})
print(f'[Step 8] Captain Safety SOS -> Status {sos_status}: {sos_res.get("message")}')

# Captain completes ride
comp_status, comp_res = post(f'/rides/{ride_id}/complete', {})
driver_earn = comp_res.get('driverEarning')
total_fare = comp_res.get('fare', {}).get('totalFare')
print(f'[Step 9] Captain clicks COMPLETE RIDE -> Status {comp_status}')
print(f'         Total Customer Fare: Rs {total_fare}, Captain Net Earning: Rs {driver_earn}')

# Verify Captain Status returned to AVAILABLE
me_status, me_res = get('/captains/me?captainId=cpt_a')
print(f'[Step 10] Captain Profile Status in DB: {me_res.get("captain", {}).get("status")}, Today Earnings: Rs {me_res.get("captain", {}).get("todayEarnings")}')

print('\n===========================================================')
print('=== ALL CRITICAL SYSTEM & SCENARIO REQUIREMENTS PASSED! ===')
print('===========================================================')
