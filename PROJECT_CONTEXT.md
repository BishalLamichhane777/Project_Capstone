# Smart Attendance System — Project Context

Paste this into a new Kiro chat to continue development with full context.

---

## Project Overview

**Smart Attendance System** — React Native (Expo SDK 54) frontend + Flask/SQLAlchemy/SQLite backend, Dockerized, with Firebase Realtime DB + FCM. Face recognition uses MTCNN + DeepFace (FaceNet) for enrollment and identification.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React Native, Expo SDK 54, `expo-camera` v17, lucide-react-native |
| Backend | Flask 3.0, Flask-SQLAlchemy, SQLite, Gunicorn 2 workers |
| AI | DeepFace (FaceNet, 128-dim embeddings), MTCNN, opencv-python-headless |
| Auth | JWT (PyJWT), bcrypt |
| Notifications | Firebase Admin SDK (FCM), Firebase Realtime DB |
| Container | Docker multi-stage build, docker-compose |

---

## Directory Structure

```
Project_Capstone_New/
├── docker-compose.yml
├── .env                          # ROOT env — used by docker-compose
├── firebase_credentials.json
├── _archive/standalone_ai_reference/   # OLD standalone AI scripts (not used)
│
├── Backend Sajak/backend/backend/      # MAIN FLASK BACKEND (Dockerized)
│   ├── app.py                          # Flask factory
│   ├── config.py
│   ├── database.py                     # db = SQLAlchemy()
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── student.py
│   │   ├── class_model.py              # Class + Enrollment
│   │   ├── session.py
│   │   ├── attendance.py               # AttendanceLog + AttendanceRecord
│   │   ├── excuse.py                   # WaiverRequest
│   │   ├── notification.py
│   │   └── batch.py                    # Batch + BatchStudent (NEW)
│   ├── routes/
│   │   ├── auth.py          → /api/auth
│   │   ├── session.py       → /api/session
│   │   ├── attendance.py    → /api/attendance
│   │   ├── excuse.py        → /api/excuse
│   │   ├── student.py       → /api/student
│   │   ├── admin.py         → /api/admin
│   │   └── batch.py         → /api/admin  (NEW)
│   ├── services/
│   │   ├── attendance_engine.py
│   │   ├── firebase_sync.py
│   │   ├── notifications.py
│   │   └── face_recognition/
│   │       ├── __init__.py             # recognize_student(), reload_embeddings()
│   │       ├── recognizer.py           # load_all_embeddings(), recognize_face()
│   │       ├── detector.py             # MTCNN wrapper
│   │       ├── preprocess.py
│   │       ├── enroll.py               # enroll_student_from_images() (NEW)
│   │       ├── validate_embeddings.py  # startup validation (NEW)
│   │       └── embeddings/             # *.npy files + labels.json
│   ├── admin/                          # Flask-Admin panel
│   │   └── __init__.py                 # CSRFProtect — all API blueprints exempted here
│   └── tests/
│       ├── test_face_enrollment.py
│       ├── test_scan_attendance.py
│       ├── test_batch_enrollment.py
│       └── test_schedule_enforcement.py
│
└── AttendanceApp/                      # REACT NATIVE FRONTEND
    ├── api.js                          # BASE_URL + all API endpoints
    ├── App.js                          # Navigator
    ├── context/AuthContext.js
    ├── components/
    │   ├── AdminBottomNav.js           # 5 tabs: Home/Waivers/Batches/Reports/Settings
    │   ├── BottomNav.js                # Student nav
    │   └── TeacherBottomNav.js
    └── screens/
        ├── LoginScreen.js
        ├── AdminDashboardScreen.js
        ├── ManageSchedulesScreen.js    # Class creation + Set Schedule button
        ├── ManageBatchesScreen.js      # NEW
        ├── ManageBatchDetailScreen.js  # NEW
        ├── TeacherClassesScreen.js     # Schedule badges + gated Start button
        ├── StartClassScreen.js         # Live camera scan (CameraView)
        └── ... (other screens)
```

---

## Database Schema (SQLite — key tables)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| fullname | String(150) | |
| email | String(255) UNIQUE | |
| password_hash | String(255) | bcrypt |
| role | String(20) | `admin` / `teacher` / `student` |
| phone | String(30) nullable | |
| device_token | String(512) nullable | FCM token |
| created_at | DateTime | UTC |

### `students`
| Column | Type | Notes |
|---|---|---|
| student_id | Integer PK | |
| user_id | Integer FK→users | UNIQUE |
| roll_number | String(50) UNIQUE | |
| program | String(100) | |
| year_of_study | Integer nullable | |
| face_label | String(50) UNIQUE nullable | **must match embedding key** |

### `classes`
| Column | Type | Notes |
|---|---|---|
| class_id | Integer PK | |
| class_name | String(150) | |
| subject | String(150) | |
| room | String(50) nullable | |
| teacher_id | Integer FK→users nullable | |
| schedule_time | DateTime nullable | legacy combined datetime |
| duration_minutes | Integer | |
| scheduled_date | Date nullable | NEW — date of class (YYYY-MM-DD) |
| scheduled_time | Time nullable | NEW — start time (HH:MM) |
| scheduled_end_time | Time nullable | NEW — end time (HH:MM) |

### `sessions`
| Column | Type | Notes |
|---|---|---|
| session_id | String(36) PK | UUID |
| class_id | Integer FK→classes | |
| teacher_id | Integer FK→users | |
| mode | String(20) | `Strict` / `Activity` |
| start_time | DateTime | UTC naive |
| end_time | DateTime nullable | UTC naive |
| status | String(10) | `ACTIVE` / `CLOSED` |
| threshold_percent | Float nullable | decimal fraction e.g. 0.80 |

### `attendance_logs`
| Column | Type | Notes |
|---|---|---|
| log_id | Integer PK | |
| student_id | Integer FK→students | |
| session_id | String(36) FK→sessions | |
| event_type | String(10) | `ENTRY` / `EXIT` |
| timestamp | DateTime | UTC naive (SQLite strips tz) |
| confidence_score | Float nullable | |

### `attendance_records`
| Column | Type | Notes |
|---|---|---|
| record_id | Integer PK | |
| student_id | Integer FK→students | |
| session_id | String(36) FK→sessions | |
| total_duration_seconds | Float | |
| threshold_required | Float nullable | seconds |
| status | String(10) | `Present` / `Absent` |
| finalized_at | DateTime nullable | UTC naive |
| UNIQUE | (student_id, session_id) | |

### `batches` (NEW)
| Column | Type | Notes |
|---|---|---|
| batch_id | Integer PK | |
| batch_name | String(150) | |
| description | String(500) nullable | |
| created_at | DateTime | UTC |

### `batch_students` (NEW)
| Column | Type | Notes |
|---|---|---|
| batch_id | Integer PK FK→batches | composite PK |
| student_id | Integer PK FK→students | composite PK |
| added_at | DateTime | UTC |

### `enrollments`
| Column | Type | Notes |
|---|---|---|
| enrollment_id | Integer PK | |
| student_id | Integer FK→students | |
| class_id | Integer FK→classes | |
| enrolled_at | DateTime | UTC |
| UNIQUE | (student_id, class_id) | |

---

## API Endpoints

### Auth
| Method | URL | Role | Notes |
|---|---|---|---|
| POST | /api/auth/login | public | returns JWT |
| POST | /api/auth/register | admin | creates user |
| GET | /api/auth/me | any | current user |

### Session
| Method | URL | Role | Notes |
|---|---|---|---|
| GET | /api/session/classes | teacher | includes `schedule_status` |
| POST | /api/session/start | teacher | enforces schedule window |
| POST | /api/session/end | teacher | finalizes attendance |
| GET | /api/session/status/{id} | teacher/admin | |
| GET | /api/session/my-sessions | teacher | |

### Attendance
| Method | URL | Role | Notes |
|---|---|---|---|
| POST | /api/attendance/scan | teacher/admin | **face scan endpoint** |
| POST | /api/attendance/log | student | manual entry |
| GET | /api/attendance/history | student | |
| GET | /api/attendance/analytics | any | |
| PUT | /api/attendance/manual-override | admin | |

### Admin — Classes
| Method | URL | Role | Notes |
|---|---|---|---|
| POST | /api/admin/class/create | admin | optional `batch_id`, `scheduled_date/time` |
| GET | /api/admin/class/list | admin/teacher | |
| PUT | /api/admin/class/{id} | admin | |
| DELETE | /api/admin/class/{id} | admin | |
| PUT | /api/admin/class/{id}/schedule | admin | set schedule fields |

### Admin — Batches (NEW)
| Method | URL | Role | Notes |
|---|---|---|---|
| POST | /api/admin/batches | admin | create batch |
| GET | /api/admin/batches | admin | list all |
| GET | /api/admin/batches/{id} | admin | detail + students |
| PUT | /api/admin/batches/{id} | admin | rename/edit |
| DELETE | /api/admin/batches/{id} | admin | **never cascades to enrollments** |
| POST | /api/admin/batches/{id}/students | admin | add students |
| DELETE | /api/admin/batches/{id}/students/{sid} | admin | remove from batch only |
| POST | /api/admin/classes/{id}/enroll-batch | admin | bulk enroll |

### Admin — Other
| Method | URL | Role | Notes |
|---|---|---|---|
| POST | /api/admin/enroll-face | admin | face enrollment from photos |
| GET | /api/admin/users | admin | |
| GET | /api/admin/stats | admin | dashboard stats |

---

## Key Invariants & Rules

### Face Recognition
- Embedding key = `student.face_label` = `student.roll_number`
- File: `services/face_recognition/embeddings/{roll_number}_mean.npy`
- On scan: `recognize_student()` → returns `face_label` → DB lookup `Student.query.filter_by(face_label=...)` → `student_id`
- **Enrollment check**: scan only logs attendance if student is enrolled in the session's `class_id`
- Startup: `validate_embeddings.py` warns if face_label ↔ .npy mismatch
- `reload_embeddings()` called after API enrollment — only refreshes current gunicorn worker

### Datetime / Timezone
- All `session.start_time`, `session.end_time`, `AttendanceLog.timestamp` stored as **naive UTC** in SQLite
- Schedule enforcement uses **`ZoneInfo("Asia/Kathmandu")` (UTC+5:45)** for "is today?" and time-window checks
- `SERVER_TIMEZONE = "Asia/Kathmandu"` in `config.py`
- `SESSION_START_BUFFER_MINUTES = 15` — teacher can start 15 min early
- Never subtract naive from aware datetime — strip tzinfo before arithmetic

### Threshold
- Stored as decimal fraction: `0.80` = Strict, `0.55` = Activity
- `threshold_required` in `attendance_records` = `threshold_percent × session_duration_seconds`
- `.env` must use `STRICT_MODE_THRESHOLD=0.80` (not `80`)

### Batch Enrollment
- `batches` / `batch_students` are a **template** — enrollments table is the source of truth
- Deleting a batch NEVER touches the `enrollments` table
- Removing a student from a batch NEVER removes their class enrollment

### CSRF
- `admin/__init__.py` initializes `CSRFProtect(app)` for Flask-Admin
- **Every API blueprint must be explicitly exempted** with `csrf.exempt(blueprint_name)`
- Currently exempted: `auth_bp`, `session_bp`, `attendance_bp`, `excuse_bp`, `student_bp`, `admin_bp`, `batch_bp`
- Forgetting this causes silent `400 Bad Request` on all POST/PUT/DELETE

---

## Frontend Key Patterns

### API Base
```js
// AttendanceApp/api.js
export const BASE_URL = 'http://<YOUR_WIFI_IP>:5000';
```
Update `BASE_URL` whenever the PC's WiFi IP changes.

### Auth context
```js
const { token, user, loginState, logoutState } = useAuth();
```
`user.token` also available for dashboard screens.

### Schedule status values (from backend)
| Value | Meaning | Start button |
|---|---|---|
| `"unscheduled"` | No date set | disabled |
| `"future_date"` | Scheduled for future date | disabled |
| `"not_started"` | Today but before open window | disabled |
| `"ready"` | Today, within window | **enabled** |
| `"ended"` | Time has passed | disabled |
| `"ongoing"` | Active session exists | **enabled** (Take Attendance) |

### TeacherClassesScreen time display
- `buildTimeLabel(cls)` — reads `scheduled_date` + `scheduled_time` first, falls back to legacy `schedule_time`
- Format: `"Jun 14, 2026 • 09:00 AM – 10:30 AM"`
- Day-strip bucketing: uses `scheduled_date` (new) or `schedule_time` (legacy), fallback to Today

---

## Docker

```bash
# First build (also after any code change)
docker-compose up --build -d

# Quick restart (env/config change only)
docker-compose restart backend

# Logs
docker logs attendance_backend --tail 50

# Stop
docker-compose stop
```

**Important**: Source code is baked into the image — `docker-compose restart` uses the old image. Always use `--build` after code changes.

**DB lock issue**: If DB Browser for SQLite is open, it locks `attendance.db` and causes `sqlite3.OperationalError: disk I/O error`. Close DB Browser before starting the container.

---

## Current Known Issues / Pending Work

1. **`reload_embeddings()` only refreshes one gunicorn worker** — with `--workers 2`, the other worker keeps the old cache until restarted. Acceptable for low-traffic; container restart guarantees consistency.

2. **Face enrollment via API produces `{roll_number}_mean.npy`** but the three test students in the DB currently have `face_label = Student_1/2/3` (manually patched). Any new student enrolled via the API will be consistent automatically.

3. **Schedule date picker** — currently plain TextInput (ISO format). Could be improved with a date picker library.

4. **`ExportReportsScreen`** — export is simulated (no actual file generation).

5. **`AddStudentFaceScreen`** — the face photo UI is a placeholder; actual enrollment goes through `POST /api/admin/enroll-face`.
