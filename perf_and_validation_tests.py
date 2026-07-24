"""
perf_and_validation_tests.py
─────────────────────────────
Runs inside the Docker container (or locally with requests installed).
Produces ALL evidence for Chapter 6 Performance and V&V sections.

Usage (run from host):
    docker exec attendance_backend python /app/perf_and_validation_tests.py
"""

import io
import json
import time
import statistics
import os
import sys
import urllib.request
import urllib.error
import urllib.parse

BASE = "http://localhost:5000"

# ─── HTTP helpers (pure stdlib — no requests needed) ─────────────────────────

def http(method, path, body=None, headers=None, files=None):
    """
    Minimal HTTP helper using urllib.
    Returns (status_code, response_body_str, elapsed_seconds).
    """
    url = BASE + path
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)

    if files:
        # multipart/form-data for the scan endpoint
        import email.generator
        import random, string
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
    try:
        return json.loads(raw)
    except Exception:
        return raw


def measure(label, method, path, body=None, headers=None, files=None, n=5):
    """Run n times, print each, return stats."""
    times = []
    last_status = None
    last_body = None
    print(f"\n{'─'*60}")
    print(f"  {label}  ({n} runs)")
    print(f"{'─'*60}")
    for i in range(n):
        status, raw, elapsed = http(method, path, body=body, headers=headers, files=files)
        times.append(elapsed)
        last_status = status
        last_body = raw
        flag = ""
        if i == 0:
            flag = "  ← first call"
        print(f"  Run {i+1}: {elapsed*1000:.0f} ms  (HTTP {status}){flag}")
    print(f"  Min={min(times)*1000:.0f}ms  Max={max(times)*1000:.0f}ms  Avg={statistics.mean(times)*1000:.0f}ms  Median={statistics.median(times)*1000:.0f}ms")
    print(f"  Last response body: {jbody(last_body)}")
    return times, last_status, last_body


def single(label, method, path, body=None, headers=None, files=None):
    """Run once, print status + full body."""
    status, raw, elapsed = http(method, path, body=body, headers=headers, files=files)
    parsed = jbody(raw)
    print(f"\n  [{label}]")
    print(f"  → HTTP {status}  ({elapsed*1000:.0f} ms)")
    print(f"  → Body: {json.dumps(parsed, indent=4) if isinstance(parsed, dict) else parsed[:500]}")
    return status, parsed, elapsed


# ══════════════════════════════════════════════════════════════════════════════
# SETUP — get tokens
# ══════════════════════════════════════════════════════════════════════════════

print("\n" + "═"*60)
print("  SETUP — acquiring tokens")
print("═"*60)

# Admin login
_, raw, _ = http("POST", "/api/auth/login",
                 body={"email": "admin@mytimes.com", "password": "admin123"})
admin_data = jbody(raw)
ADMIN_TOKEN = admin_data.get("token", "")
ADMIN_USER_ID = admin_data.get("user_id", "")
print(f"  Admin token: {'OK' if ADMIN_TOKEN else 'FAILED — ' + str(admin_data)}")

# Teacher login
_, raw, _ = http("POST", "/api/auth/login",
                 body={"email": "teacher1@test.com", "password": "pass1234"})
teacher_data = jbody(raw)
TEACHER_TOKEN = teacher_data.get("token", "")
TEACHER_USER_ID = teacher_data.get("user_id", "")
print(f"  Teacher token: {'OK' if TEACHER_TOKEN else 'FAILED — ' + str(teacher_data)}")

# Student login
_, raw, _ = http("POST", "/api/auth/login",
                 body={"email": "student1@test.com", "password": "pass1234"})
student_data = jbody(raw)
STUDENT_TOKEN = student_data.get("token", "")
STUDENT_USER_ID = student_data.get("user_id", "")
print(f"  Student token: {'OK' if STUDENT_TOKEN else 'FAILED — ' + str(student_data)}")

# Second student for cross-access test
_, raw, _ = http("POST", "/api/auth/login",
                 body={"email": "student11@test.com", "password": "pass1234"})
student2_data = jbody(raw)
STUDENT2_TOKEN = student2_data.get("token", "")
STUDENT2_ID    = student2_data.get("user_id", "")
print(f"  Student2 token: {'OK' if STUDENT2_TOKEN else 'FAILED — ' + str(student2_data)}")

# Get student_id for student1 (not user_id)
_, raw, _ = http("GET", "/api/student/list",
                 headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
students_list = jbody(raw)
STUDENT1_STUDENT_ID = None
STUDENT2_STUDENT_ID = None
if isinstance(students_list, list):
    for s in students_list:
        if s.get("user_id") == STUDENT_USER_ID:
            STUDENT1_STUDENT_ID = s.get("student_id")
        if s.get("user_id") == STUDENT2_ID:
            STUDENT2_STUDENT_ID = s.get("student_id")
print(f"  Student1 student_id: {STUDENT1_STUDENT_ID}")
print(f"  Student2 student_id: {STUDENT2_STUDENT_ID}")

# Get or create a class with teacher
_, raw, _ = http("GET", "/api/admin/class/list",
                 headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
classes = jbody(raw)
CLASS_ID = None
if isinstance(classes, list) and classes:
    CLASS_ID = classes[0].get("class_id")
    print(f"  Using existing class_id: {CLASS_ID}")
else:
    _, raw, _ = http("POST", "/api/admin/class/create",
                     headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
                     body={"class_name": "PerfTest101", "subject": "Performance",
                           "duration_minutes": 60, "teacher_id": TEACHER_USER_ID})
    cls = jbody(raw)
    CLASS_ID = cls.get("class_id")
    print(f"  Created class_id: {CLASS_ID}")

# Ensure student1 is enrolled
if STUDENT1_STUDENT_ID and CLASS_ID:
    http("PUT", f"/api/student/enrol/{STUDENT1_STUDENT_ID}",
         headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
         body={"class_id": CLASS_ID})
    print(f"  Enrolled student {STUDENT1_STUDENT_ID} in class {CLASS_ID}")

# ══════════════════════════════════════════════════════════════════════════════
# PART 1 — PERFORMANCE MEASUREMENTS
# ══════════════════════════════════════════════════════════════════════════════

print("\n\n" + "═"*60)
print("  PART 1 — PERFORMANCE MEASUREMENTS")
print("═"*60)

# 1a. Login
auth_times, _, _ = measure(
    "POST /api/auth/login",
    "POST", "/api/auth/login",
    body={"email": "admin@mytimes.com", "password": "admin123"},
    n=5
)

# 1b. Start session — need a class
print("\n  Setting up session start test...")
# First end any leftover active session
_, raw, _ = http("GET", f"/api/session/class/{CLASS_ID}",
                 headers={"Authorization": f"Bearer {TEACHER_TOKEN}"})
existing = jbody(raw)
if isinstance(existing, dict) and existing.get("sessions"):
    for s in existing["sessions"]:
        if s.get("status") == "ACTIVE":
            http("POST", "/api/session/end",
                 headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                 body={"session_id": s["session_id"]})
            print(f"  Cleaned up active session {s['session_id']}")

# remove scheduled_date so session can start anytime
http("PUT", f"/api/admin/class/{CLASS_ID}",
     headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
     body={"scheduled_date": None, "scheduled_time": None,
           "scheduled_end_time": None})

session_start_times = []
session_ids = []
print(f"\n{'─'*60}")
print("  POST /api/session/start  (5 runs — each ends before next starts)")
print(f"{'─'*60}")
for i in range(5):
    status, raw, elapsed = http(
        "POST", "/api/session/start",
        headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
        body={"class_id": CLASS_ID, "mode": "Strict"}
    )
    session_start_times.append(elapsed)
    parsed = jbody(raw)
    sid = parsed.get("session_id") if isinstance(parsed, dict) else None
    session_ids.append(sid)
    print(f"  Run {i+1}: {elapsed*1000:.0f} ms  (HTTP {status})  session_id={sid}")
    # End immediately so next start works
    if sid:
        http("POST", "/api/session/end",
             headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
             body={"session_id": sid})

print(f"  Min={min(session_start_times)*1000:.0f}ms  Max={max(session_start_times)*1000:.0f}ms  "
      f"Avg={statistics.mean(session_start_times)*1000:.0f}ms  "
      f"Median={statistics.median(session_start_times)*1000:.0f}ms")

# 1c. POST /api/attendance/scan — the critical one
# Start a fresh session for scanning
_, raw, _ = http("POST", "/api/session/start",
                 headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                 body={"class_id": CLASS_ID, "mode": "Strict"})
scan_session = jbody(raw)
SCAN_SESSION_ID = scan_session.get("session_id") if isinstance(scan_session, dict) else None
print(f"\n  Scan session started: {SCAN_SESSION_ID}")

# Build a realistic test JPEG (50×50 pixel grey image — real JPEG bytes)
import struct, zlib

def make_jpeg_bytes(width=160, height=160):
    """Create a minimal but valid JPEG in pure Python (no cv2 needed here)."""
    # Use a very simple approach: create PPM-like raw bytes and encode as JPEG
    # Since we're IN Docker, cv2 is available
    try:
        import cv2
        import numpy as np
        img = (np.ones((height, width, 3), dtype=np.uint8) * 128)
        # Add some variation so MTCNN has something to process
        img[40:120, 40:120] = 200  # bright square in centre
        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return buf.tobytes()
    except Exception:
        # fallback: minimal JPEG header (will be rejected gracefully)
        return b'\xff\xd8\xff\xe0' + b'\x00' * 100 + b'\xff\xd9'

jpeg_bytes = make_jpeg_bytes(160, 160)
print(f"  Test JPEG size: {len(jpeg_bytes)} bytes")

if SCAN_SESSION_ID:
    scan_times = []
    print(f"\n{'─'*60}")
    print("  POST /api/attendance/scan  (5 runs, real MTCNN+FaceNet)")
    print(f"{'─'*60}")
    for i in range(5):
        status, raw, elapsed = http(
            "POST", "/api/attendance/scan",
            headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
            files={"image": ("frame.jpg", jpeg_bytes, "image/jpeg")},
            body={"session_id": SCAN_SESSION_ID}
        )
        scan_times.append(elapsed)
        parsed = jbody(raw)
        result_status = parsed.get("status") if isinstance(parsed, dict) else "?"
        flag = "  ← FIRST CALL (potential cold start)" if i == 0 else ""
        print(f"  Run {i+1}: {elapsed*1000:.0f} ms  (HTTP {status})  result={result_status}{flag}")

    print(f"  Min={min(scan_times)*1000:.0f}ms  Max={max(scan_times)*1000:.0f}ms  "
          f"Avg={statistics.mean(scan_times)*1000:.0f}ms  "
          f"Median={statistics.median(scan_times)*1000:.0f}ms")
    print(f"\n  Cold-start (run 1) vs warm average (runs 2-5):")
    warm_avg = statistics.mean(scan_times[1:])
    print(f"    Run 1 (cold): {scan_times[0]*1000:.0f} ms")
    print(f"    Runs 2-5 avg (warm): {warm_avg*1000:.0f} ms")
    print(f"    Difference: {(scan_times[0] - warm_avg)*1000:.0f} ms")

    # End the scan session
    _, raw, elapsed_end = http("POST", "/api/session/end",
                                headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                                body={"session_id": SCAN_SESSION_ID})
    end_parsed = jbody(raw)
    print(f"\n{'─'*60}")
    print("  POST /api/session/end  (1 run — session must be active)")
    print(f"{'─'*60}")
    print(f"  Run 1: {elapsed_end*1000:.0f} ms  (HTTP _)")
    print(f"  Response: {end_parsed}")

    # Run session/end 4 more times on fresh sessions
    end_times = [elapsed_end]
    print(f"\n  Running 4 more end-session measurements...")
    for i in range(4):
        _, raw, _ = http("POST", "/api/session/start",
                         headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                         body={"class_id": CLASS_ID, "mode": "Strict"})
        new_sid = jbody(raw).get("session_id") if isinstance(jbody(raw), dict) else None
        if not new_sid:
            new_sid_raw = jbody(raw)
            # try re-parsing
            _, raw2, _ = http("POST", "/api/session/start",
                              headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                              body={"class_id": CLASS_ID, "mode": "Activity"})
            new_sid = jbody(raw2).get("session_id") if isinstance(jbody(raw2), dict) else None
        if new_sid:
            _, _, elapsed_end_i = http("POST", "/api/session/end",
                                        headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
                                        body={"session_id": new_sid})
            end_times.append(elapsed_end_i)
            print(f"  Run {i+2}: {elapsed_end_i*1000:.0f} ms")

    print(f"  Min={min(end_times)*1000:.0f}ms  Max={max(end_times)*1000:.0f}ms  "
          f"Avg={statistics.mean(end_times)*1000:.0f}ms  "
          f"Median={statistics.median(end_times)*1000:.0f}ms")

# 1e. Export report
print(f"\n{'─'*60}")
print("  POST /api/admin/export-report — full report CSV  (5 runs)")
print(f"{'─'*60}")
export_times = []
for i in range(5):
    status, raw, elapsed = http(
        "POST", "/api/admin/export-report",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        body={"report_type": "full", "format": "csv", "period": "This Month"}
    )
    export_times.append(elapsed)
    print(f"  Run {i+1}: {elapsed*1000:.0f} ms  (HTTP {status})")
print(f"  Min={min(export_times)*1000:.0f}ms  Max={max(export_times)*1000:.0f}ms  "
      f"Avg={statistics.mean(export_times)*1000:.0f}ms  "
      f"Median={statistics.median(export_times)*1000:.0f}ms")


# ══════════════════════════════════════════════════════════════════════════════
# PART 2 — ROLE-BASED ACCESS CONTROL AND SECURITY VALIDATION
# ══════════════════════════════════════════════════════════════════════════════

print("\n\n" + "═"*60)
print("  PART 2 — VALIDATION & VERIFICATION (SECURITY TESTS)")
print("═"*60)

print("\n  --- Test 2.1: Student token → admin-only endpoint ---")
single("Student token to GET /api/admin/users",
       "GET", "/api/admin/users",
       headers={"Authorization": f"Bearer {STUDENT_TOKEN}"})

print("\n  --- Test 2.2: Teacher token → batch management endpoint ---")
single("Teacher token to POST /api/admin/batches",
       "POST", "/api/admin/batches",
       headers={"Authorization": f"Bearer {TEACHER_TOKEN}"},
       body={"batch_name": "Illegal Batch", "description": "Should fail"})

print("\n  --- Test 2.3: No token → protected endpoint ---")
single("No token to GET /api/admin/users",
       "GET", "/api/admin/users")

print("\n  --- Test 2.4: Malformed/corrupted token → protected endpoint ---")
single("Malformed token to GET /api/admin/users",
       "GET", "/api/admin/users",
       headers={"Authorization": "Bearer this.is.not.a.real.jwt.token"})

print("\n  --- Test 2.5: Duplicate email registration ---")
single("Duplicate email registration",
       "POST", "/api/auth/register",
       headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
       body={"fullname": "Duplicate User", "email": "student1@test.com",
             "password": "pass1234", "role": "student",
             "roll_number": "DUP-001", "program": "CS"})

print("\n  --- Test 2.6: Student accessing ANOTHER student's attendance history ---")
if STUDENT2_STUDENT_ID:
    single(f"Student1 token → /api/attendance/history/{STUDENT2_STUDENT_ID}",
           "GET", f"/api/attendance/history/{STUDENT2_STUDENT_ID}",
           headers={"Authorization": f"Bearer {STUDENT_TOKEN}"})
else:
    print("  SKIPPED — student2 student_id not found")

print("\n  --- Test 2.7: Deactivate user then attempt login ---")
# Deactivate student1
deactivate_status, deactivate_raw, _ = http(
    "PUT", f"/api/admin/user/{STUDENT_USER_ID}/deactivate",
    headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
)
print(f"\n  [Deactivate user_id={STUDENT_USER_ID}]")
print(f"  → HTTP {deactivate_status}")
print(f"  → Body: {jbody(deactivate_raw)}")

# Now try logging in as deactivated user
login_status, login_raw, login_elapsed = http(
    "POST", "/api/auth/login",
    body={"email": "student1@test.com", "password": "pass1234"}
)
print(f"\n  [Login attempt as deactivated user]")
print(f"  → HTTP {login_status}  ({login_elapsed*1000:.0f} ms)")
print(f"  → Body: {jbody(login_raw)}")

# Re-activate student1 so we don't leave DB in broken state
reactivate_status, reactivate_raw, _ = http(
    "PUT", f"/api/admin/user/{STUDENT_USER_ID}/reactivate",
    headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
)
print(f"\n  [Reactivate user_id={STUDENT_USER_ID} — cleanup]")
print(f"  → HTTP {reactivate_status}")
print(f"  → Body: {jbody(reactivate_raw)}")

# ══════════════════════════════════════════════════════════════════════════════
# PART 3 — FULL TEST SUITE INSIDE DOCKER
# ══════════════════════════════════════════════════════════════════════════════
# (Reported separately — run via docker exec)

print("\n\n" + "═"*60)
print("  DONE — perf_and_validation_tests.py complete")
print("═"*60)
