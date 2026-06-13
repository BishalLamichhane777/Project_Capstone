# attendance.py
# Attendance session logic — ENTRY/EXIT determination and duration calculation.
# This file is UNCHANGED from the original LBPH version.
# The recognition pipeline (DeepFace vs LBPH) does not affect this layer
# because recognize_face() still returns the same dict shape:
#   { "status": "recognized", "student_id": ..., "confidence": ... }

import uuid
import os
import sys
from datetime import datetime

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

from database import (log_event,
                      start_session,
                      end_session,
                      calculate_and_save_attendance)

# In-memory cache: tracks last event per (session, student)
# Report Section 3.2.1 Step 11
last_event_cache = {}

COOLDOWN_SECONDS = 5


def begin_session(session_id, class_name,
                  teacher_id, mode):
    """
    Called when teacher starts an attendance session.
    Clears in-memory cache and creates session in database.
    """
    last_event_cache.clear()
    start_session(session_id, class_name, teacher_id, mode)

    print(f"\n✓ Session {session_id} started!")
    print(f"  Class   : {class_name}")
    print(f"  Teacher : {teacher_id}")
    print(f"  Mode    : {mode}")


def process_recognition(student_id,
                        session_id,
                        confidence):
    """
    Processes one confirmed recognition.
    Decides ENTRY or EXIT based on previous event in cache.
    Enforces 5-second cooldown to avoid duplicate events.
    Logs to database.

    Report Section 3.2.1 Step 11:
    'system gets previous event and compares with in-memory
    cache to identify ENTRY or EXIT'

    Returns:
        event_type ("ENTRY" or "EXIT")  on success
        None                             during cooldown
    """
    cache_key = f"{session_id}_{student_id}"
    now       = datetime.now()

    # Cooldown check
    if cache_key in last_event_cache:
        elapsed = (now - last_event_cache[cache_key]["timestamp"]
                   ).total_seconds()
        if elapsed < COOLDOWN_SECONDS:
            return None   # Duplicate — ignore

    # Determine event type
    if cache_key not in last_event_cache:
        event_type = "ENTRY"
    elif last_event_cache[cache_key]["event_type"] == "ENTRY":
        event_type = "EXIT"
    else:
        event_type = "ENTRY"

    event_id = str(uuid.uuid4())

    log_event(
        event_id   = event_id,
        student_id = student_id,
        session_id = session_id,
        event_type = event_type,
        confidence = confidence
    )

    last_event_cache[cache_key] = {
        "event_type": event_type,
        "timestamp" : now
    }

    print(f"  LOGGED: {student_id} → {event_type} "
          f"(conf: {confidence})")

    return event_type


def finish_session(session_id,
                   session_duration_minutes,
                   mode):
    """
    Called when teacher ends session.
    Calculates and saves final attendance for all students.
    Report Section 3.2.1 Step 13.
    """
    print(f"\n{'='*50}")
    print(f"SESSION ENDING: {session_id}")
    print(f"{'='*50}")

    end_session(session_id)
    results = calculate_and_save_attendance(session_id)

    print(f"\n{'='*50}")
    print("FINAL ATTENDANCE RESULTS")
    print(f"{'='*50}")

    for student_id, data in results.items():
        print(f"\n  {student_id}:")
        print(f"    Time in class : {data['total_minutes']} min")
        print(f"    Required      : {data['required_minutes']} min")
        print(f"    Status        : {data['status']}")

    return results


if __name__ == "__main__":
    """Quick test of the full attendance flow."""
    import time

    print("=" * 50)
    print("  ATTENDANCE LOGIC TEST")
    print("=" * 50)

    test_session = "session_" + str(uuid.uuid4())[:8]

    begin_session(
        session_id = test_session,
        class_name = "Computer Science 101",
        teacher_id = "teacher_001",
        mode       = "strict"
    )

    print("\nSimulating student movements...")

    process_recognition("Student_1", test_session, 95.2)
    time.sleep(6)
    process_recognition("Student_2", test_session, 91.8)
    time.sleep(6)
    process_recognition("Student_1", test_session, 94.5)

    print("\nEnding session...")
    finish_session(test_session, 60, "strict")
    print("\nAttendance test complete!")
