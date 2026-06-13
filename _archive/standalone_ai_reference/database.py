# database.py
# SQLite database layer — unchanged from original except:
#   - DB_PATH now uses absolute path (won't break if run from wrong folder)
#   - Comments updated to reflect DeepFace terminology

import sqlite3
import os
import uuid
from datetime import datetime

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH     = os.path.join(BACKEND_DIR, "attendance.db")


def get_connection():
    """Returns a SQLite connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def create_tables():
    """
    Creates all database tables.
    Safe to call multiple times (IF NOT EXISTS).
    Based on Class Diagram Section 4.4.
    """
    conn = get_connection()
    c    = conn.cursor()

    # Students table
    c.execute("""
        CREATE TABLE IF NOT EXISTS Students (
            student_id   TEXT PRIMARY KEY,
            name         TEXT NOT NULL,
            program      TEXT,
            model_path   TEXT,
            enrolled_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Sessions table
    c.execute("""
        CREATE TABLE IF NOT EXISTS Sessions (
            session_id   TEXT PRIMARY KEY,
            class_name   TEXT NOT NULL,
            teacher_id   TEXT,
            mode         TEXT NOT NULL,
            threshold    REAL NOT NULL,
            start_time   TEXT NOT NULL,
            end_time     TEXT,
            status       TEXT DEFAULT 'active'
        )
    """)

    # AttendanceEvents table
    # Every ENTRY and EXIT is one row here
    # Report Section 3.2.1 Step 12
    c.execute("""
        CREATE TABLE IF NOT EXISTS AttendanceEvents (
            event_id     TEXT PRIMARY KEY,
            student_id   TEXT NOT NULL,
            session_id   TEXT NOT NULL,
            event_type   TEXT NOT NULL,
            timestamp    TEXT NOT NULL,
            confidence   REAL,
            sync_status  TEXT DEFAULT 'unsynced'
        )
    """)

    # AttendanceRecords table
    # Final attendance status per student per session
    # Report Section 3.2.1 Step 13
    c.execute("""
        CREATE TABLE IF NOT EXISTS AttendanceRecords (
            record_id        TEXT PRIMARY KEY,
            student_id       TEXT NOT NULL,
            session_id       TEXT NOT NULL,
            total_minutes    REAL DEFAULT 0,
            required_minutes REAL DEFAULT 0,
            status           TEXT DEFAULT 'Absent',
            computed_at      TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()
    print("✓ All database tables ready!")


def add_student(student_id, name,
                program="", model_path=""):
    """
    Inserts one student into the database.
    model_path stores the path to the mean embedding .npy file.
    """
    conn = get_connection()
    try:
        conn.execute("""
            INSERT INTO Students
            (student_id, name, program, model_path)
            VALUES (?, ?, ?, ?)
        """, (student_id, name, program, model_path))
        conn.commit()
        print(f"✓ Student added: {student_id} — {name}")
        return True
    except sqlite3.IntegrityError:
        print(f"Student {student_id} already exists.")
        return False
    finally:
        conn.close()


def start_session(session_id, class_name,
                  teacher_id, mode):
    """Creates a new session record when teacher starts attendance."""
    # Threshold: proportion of session time required for 'Present'
    threshold = 0.70 if mode == "strict" else 0.55

    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO Sessions "
            "(session_id, class_name, teacher_id, "
            " mode, threshold, start_time, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                session_id,
                class_name,
                teacher_id,
                mode,
                threshold,
                datetime.now().isoformat(),
                "active"
            )
        )
        conn.commit()
        print(f"✓ Session started: {session_id}")
        print(f"  Mode: {mode} | "
              f"Threshold: {threshold*100:.0f}%")
    except Exception as e:
        print(f"ERROR starting session: {e}")
    finally:
        conn.close()


def end_session(session_id):
    """Marks a session as ended and records end_time."""
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE Sessions "
            "SET end_time = ?, status = ? "
            "WHERE session_id = ?",
            (datetime.now().isoformat(), "ended", session_id)
        )
        conn.commit()
        print(f"✓ Session ended: {session_id}")
    except Exception as e:
        print(f"ERROR ending session: {e}")
    finally:
        conn.close()


def log_event(event_id, student_id,
              session_id, event_type, confidence):
    """Logs one ENTRY or EXIT event to AttendanceEvents."""
    conn = get_connection()
    try:
        conn.execute(
            "INSERT INTO AttendanceEvents "
            "(event_id, student_id, session_id, "
            " event_type, timestamp, confidence) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                event_id,
                student_id,
                session_id,
                event_type,
                datetime.now().isoformat(),
                confidence
            )
        )
        conn.commit()
    except Exception as e:
        print(f"ERROR logging event: {e}")
    finally:
        conn.close()


def calculate_and_save_attendance(session_id):
    """
    Calculates final attendance for all students in a session.
    Pairs ENTRY/EXIT timestamps, sums duration, compares to threshold.
    Report Section 3.2.1 Step 13.

    Returns:
        dict: { student_id: { total_minutes, required_minutes, status } }
    """
    conn = get_connection()

    session = conn.execute("""
        SELECT * FROM Sessions WHERE session_id = ?
    """, (session_id,)).fetchone()

    if not session:
        print(f"Session {session_id} not found!")
        conn.close()
        return {}

    start     = datetime.fromisoformat(session["start_time"])
    end       = datetime.fromisoformat(session["end_time"])
    total_dur = (end - start).total_seconds() / 60
    required  = total_dur * session["threshold"]

    print(f"\nSession duration : {total_dur:.1f} min")
    print(f"Required time    : {required:.1f} min")
    print(f"Mode             : {session['mode']}")

    students = conn.execute("""
        SELECT DISTINCT student_id
        FROM AttendanceEvents
        WHERE session_id = ?
    """, (session_id,)).fetchall()

    results = {}

    for row in students:
        student_id = row["student_id"]

        events = conn.execute("""
            SELECT event_type, timestamp
            FROM AttendanceEvents
            WHERE session_id = ? AND student_id = ?
            ORDER BY timestamp ASC
        """, (session_id, student_id)).fetchall()

        total_minutes = 0
        entry_time    = None

        for event in events:
            if event["event_type"] == "ENTRY":
                entry_time = datetime.fromisoformat(
                    event["timestamp"])

            elif (event["event_type"] == "EXIT"
                  and entry_time is not None):
                exit_time     = datetime.fromisoformat(
                    event["timestamp"])
                total_minutes += (
                    exit_time - entry_time
                ).total_seconds() / 60
                entry_time = None

        # Student still inside when session ended
        if entry_time is not None:
            total_minutes += (
                end - entry_time
            ).total_seconds() / 60

        status = ("Present"
                  if total_minutes >= required
                  else "Absent")

        conn.execute("""
            INSERT INTO AttendanceRecords
            (record_id, student_id, session_id,
             total_minutes, required_minutes, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()),
            student_id,
            session_id,
            round(total_minutes, 2),
            round(required, 2),
            status
        ))

        results[student_id] = {
            "total_minutes"   : round(total_minutes, 2),
            "required_minutes": round(required, 2),
            "status"          : status
        }

        print(f"  {student_id}: "
              f"{total_minutes:.1f}/{required:.1f} min "
              f"= {status}")

    conn.commit()
    conn.close()
    return results


def get_student_attendance(student_id):
    """Returns full attendance history for one student."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT r.*, s.class_name, s.mode, s.start_time
        FROM AttendanceRecords r
        JOIN Sessions s ON r.session_id = s.session_id
        WHERE r.student_id = ?
        ORDER BY s.start_time DESC
    """, (student_id,)).fetchall()
    conn.close()
    return rows


if __name__ == "__main__":
    print("=" * 50)
    print("  DATABASE SETUP")
    print("=" * 50)

    create_tables()

    add_student("Student_1", "Student One",
                "Computer Science")
    add_student("Student_2", "Student Two",
                "Computer Science")
    add_student("Student_3", "Student Three",
                "Computer Science")

    print(f"\n✓ Database created at: {DB_PATH}")
    print("Database setup complete!")
