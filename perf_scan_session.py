"""
perf_scan_session.py — targeted performance test for scan + session endpoints.
Run: docker exec attendance_backend python /app/perf_scan_session.py
"""
import json, time, statistics, urllib.request, urllib.error, random, string

BASE = "http://localhost:5000"

def http(method, path, body=None, headers=None, files=None):
    url = BASE + path
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)

    if files:
        boundary = "".join(random.choices(string.ascii_lowercase, k=24))
        h = headers.copy() if headers else {}
        parts = b""
        for field_name, (filename, data, content_type) in files.items():
            parts += (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
                f"Content-Type: {content_type}\r\n\r\n"
            ).encode()
            parts += data + b"\r\n"
        for field_name, value in (body or {}).items():
            parts += (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="{field_name}"\r\n\r\n'
                f"{value}\r\n"
            ).encode()
        parts += f"--{boundary}--\r\n".encode()
        h["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        data_bytes = parts
    elif body is not None:
        data_bytes = json.dumps(body).encode()
    else:
        data_bytes = None

    req = urllib.request.Request(url, data=data_bytes, headers=h, method=method)
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            elapsed = time.perf_counter() - t0
            return resp.status, resp.read().decode(errors="replace"), elapsed
    except urllib.error.HTTPError as e:
        elapsed = time.perf_counter() - t0
        return e.code, e.read().decode(errors="replace"), elapsed
    except Exception as ex:
        elapsed = time.perf_counter() - t0
        return 0, str(ex), elapsed

def jbody(raw):
    try: return json.loads(raw)
    except: return raw

# ── Step 1: Login as teacher (ramesh) ────────────────────────────────────────
print("\n=== STEP 1: Teacher login ===")
_, raw, _ = http("POST", "/api/auth/login",
                 body={"email": "ramesh@mytimes.com", "password": "pass1234"})
teacher = jbody(raw)
TEACHER_TOKEN = teacher.get("token", "")
print(f"Teacher token: {'OK' if TEACHER_TOKEN else 'FAILED: ' + str(teacher)}")

_, raw, _ = http("POST", "/api/auth/login",
                 body={"email": "admin@mytimes.com", "password": "admin123"})
ADMIN_TOKEN = jbody(raw).get("token", "")
print(f"Admin token: {'OK' if ADMIN_TOKEN else 'FAILED'}")

# ── Step 2: Use class_id=1 (teacher_id=5 = ramesh) ───────────────────────────
CLASS_ID = 1
print(f"\n=== Using CLASS_ID={CLASS_ID} (teacher=ramesh, no schedule constraint) ===")

# Clear scheduled_date so session can always start
http("PUT", f"/api/admin/class/{CLASS_ID}",
     headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
     body={"scheduled_date": None, "scheduled_time": None, "scheduled_end_time": None})

# End any existing active session
_, raw, _ = http("GET", f"/api/session/class/{CLASS_ID}",
                 headers={"Authorization": f"Bearer {TEACHER_TOKEN}"})
existing = jbody(raw)
if isinstance(existing, dict):
    for s in existing.get("sessions", []):
        if s.get("status") == "ACTIVE":
            http("POST", "/api/session/end",
                 headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                 body={"session_id": s["session_id"]})
            print(f"  Ended leftover session {s['session_id']}")

# ── Step 3: Session start — 5 runs ───────────────────────────────────────────
print("\n=== SESSION START (5 runs) ===")
session_start_times = []
for i in range(5):
    status, raw, elapsed = http(
        "POST", "/api/session/start",
        headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
        body={"class_id": CLASS_ID, "mode": "Strict"}
    )
    parsed = jbody(raw)
    sid = parsed.get("session_id") if isinstance(parsed, dict) else None
    session_start_times.append(elapsed)
    print(f"  Run {i+1}: {elapsed*1000:.0f} ms  HTTP={status}  session_id={sid}")
    if sid:
        http("POST", "/api/session/end",
             headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
             body={"session_id": sid})

print(f"  SUMMARY: Min={min(session_start_times)*1000:.0f}ms  Max={max(session_start_times)*1000:.0f}ms  "
      f"Avg={statistics.mean(session_start_times)*1000:.0f}ms  "
      f"Median={statistics.median(session_start_times)*1000:.0f}ms")

# ── Step 4: Start one session for scanning ───────────────────────────────────
print("\n=== Starting scan session ===")
status, raw, _ = http("POST", "/api/session/start",
                       headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                       body={"class_id": CLASS_ID, "mode": "Strict"})
parsed = jbody(raw)
SCAN_SESSION_ID = parsed.get("session_id") if isinstance(parsed, dict) else None
print(f"  Scan session: {SCAN_SESSION_ID}  (HTTP {status})")
print(f"  Response: {parsed}")

if not SCAN_SESSION_ID:
    print("  FATAL: Could not start scan session — aborting scan test")
    import sys; sys.exit(1)

# ── Step 5: Build a realistic JPEG ───────────────────────────────────────────
import cv2, numpy as np

# Create a 160x160 image with a face-like oval to give MTCNN something real
img = np.ones((160, 160, 3), dtype=np.uint8) * 200  # light grey background
# Draw a rough oval for a "face" region
for y in range(160):
    for x in range(160):
        # ellipse equation: centre (80,80), rx=55, ry=65
        if ((x-80)/55)**2 + ((y-75)/65)**2 < 1.0:
            img[y, x] = [220, 190, 170]  # skin tone
# Add dark areas for eyes
img[60:70, 55:70] = [30, 30, 30]
img[60:70, 95:110] = [30, 30, 30]
# Mouth
img[100:108, 65:100] = [100, 50, 50]

_, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
JPEG_BYTES = buf.tobytes()
print(f"\n  Test JPEG: {len(JPEG_BYTES)} bytes (160x160 with face-like features)")

# ── Step 6: POST /api/attendance/scan — 5 runs ───────────────────────────────
print("\n=== POST /api/attendance/scan (5 runs, real MTCNN+FaceNet pipeline) ===")
scan_times = []
for i in range(5):
    status, raw, elapsed = http(
        "POST", "/api/attendance/scan",
        headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
        files={"image": ("frame.jpg", JPEG_BYTES, "image/jpeg")},
        body={"session_id": SCAN_SESSION_ID}
    )
    scan_times.append(elapsed)
    parsed = jbody(raw)
    result_status = parsed.get("status") if isinstance(parsed, dict) else "?"
    flag = "  ← FIRST CALL" if i == 0 else ""
    print(f"  Run {i+1}: {elapsed*1000:.0f} ms  HTTP={status}  result={result_status}{flag}")
    print(f"         Full response: {parsed}")

print(f"\n  SCAN SUMMARY:")
print(f"  Min={min(scan_times)*1000:.0f}ms  Max={max(scan_times)*1000:.0f}ms  "
      f"Avg={statistics.mean(scan_times)*1000:.0f}ms  "
      f"Median={statistics.median(scan_times)*1000:.0f}ms")
warm_avg = statistics.mean(scan_times[1:])
print(f"  Cold-start (run 1): {scan_times[0]*1000:.0f} ms")
print(f"  Warm avg (runs 2-5): {warm_avg*1000:.0f} ms")
print(f"  Cold vs warm delta: {(scan_times[0]-warm_avg)*1000:+.0f} ms")

# ── Step 7: POST /api/session/end — 5 runs ───────────────────────────────────
print("\n=== POST /api/session/end (5 runs) ===")
end_times = []

# End the scan session (run 1)
status, raw, elapsed = http("POST", "/api/session/end",
                             headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                             body={"session_id": SCAN_SESSION_ID})
end_times.append(elapsed)
print(f"  Run 1: {elapsed*1000:.0f} ms  HTTP={status}")
print(f"         Response: {jbody(raw)}")

# Start + immediately end 4 more fresh sessions
for i in range(4):
    _, raw, _ = http("POST", "/api/session/start",
                     headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                     body={"class_id": CLASS_ID, "mode": "Activity"})
    new_sid = jbody(raw).get("session_id") if isinstance(jbody(raw), dict) else None
    if new_sid:
        status, raw, elapsed = http("POST", "/api/session/end",
                                     headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                                     body={"session_id": new_sid})
        end_times.append(elapsed)
        print(f"  Run {i+2}: {elapsed*1000:.0f} ms  HTTP={status}")

print(f"\n  END-SESSION SUMMARY:")
print(f"  Min={min(end_times)*1000:.0f}ms  Max={max(end_times)*1000:.0f}ms  "
      f"Avg={statistics.mean(end_times)*1000:.0f}ms  "
      f"Median={statistics.median(end_times)*1000:.0f}ms")

print("\n=== DONE ===")
