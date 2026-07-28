# Smart Attendance System — Project Context

Paste this into a new Kiro chat to continue development with full context.

---

## Project Overview

**Smart Attendance System** — React Native (Expo SDK 54) frontend + Flask/SQLAlchemy/SQLite backend, Dockerized, with Expo push notifications and face recognition using MTCNN + DeepFace (FaceNet) for enrollment and identification.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React Native, Expo SDK 54, `expo-camera` v17, lucide-react-native |
| Backend | Flask 3.0, Flask-SQLAlchemy, SQLite, Gunicorn 2 workers |
| AI | DeepFace (FaceNet, 128-dim embeddings), MTCNN, opencv-python-headless |
| Auth | JWT (PyJWT), bcrypt |
| Notifications | Expo Push Notifications, SQLite notifications table |
| Container | Docker multi-stage build, docker-compose |

---

## Directory Structure

```
Project_Capstone/
├── docker-compose.yml
├── .env                          # ROOT env — used by docker-compose
├── .gitignore
├── Backend Sajak/backend/backend/      # MAIN FLASK BACKEND (live-mounted)
│   ├── app.py                          # Flask factory
│   ├── config.py
│   ├── database.py                     # db = SQLAlchemy()
│   ├── Dockerfile                      # gunicorn --reload (live reload)
│   ├── requirements.txt
│   ├── migrate_add_is_active.py        # one-off migration: adds is_active column
│   ├── backfill_batch_class_links.py   # one-off migration: backfills missing BCL rows
│   ├── models/ ...
│   ├── routes/
│   │   ├── batch.py                    # UPDATED — added is_at_risk() and pick_worst_class() pure helpers
│   │   └── ...
│   ├── services/ ...
│   ├── test/                           # API/integration tests (Flask test client)
│   │   ├── __init__.py                 # makes test/ a package
│   │   ├── test_helpers.py             # shared test infrastructure (make_app, auth_as, DB factories, AI stubs)
│   │   ├── test_admin_routes.py        # admin class/user/dashboard/at-risk tests (27 tests)
│   │   ├── test_student_routes.py      # student list/enrol/history/log/waiver/notif tests (28 tests)
│   │   └── test_teacher_routes.py      # teacher class listing, session lifecycle, report tests (19 tests)
│   └── tests/unit/                     # NEW — pure unit tests (no Flask, no DB, no HTTP)
│       ├── __init__.py
│       ├── test_attendance_engine.py   # 13 tests for _determine_status()
│       ├── test_enroll_threshold.py    # 12 tests for _compute_adaptive_threshold()
│       ├── test_recognizer_confidence.py # 16 tests for compute_confidence()
│       └── test_batch_risk_logic.py    # 19 tests for is_at_risk() + pick_worst_class()
│
└── AttendanceApp/                      # REACT NATIVE FRONTEND
    ├── api.js                          # BASE_URL + all API endpoints
    ├── App.js                          # Navigator (all screens registered)
    ├── context/AuthContext.js
    ├── utils/
    │   └── exportHelper.js             # shared triggerExport() utility (new)
    ├── components/ ...
    └── screens/
        ├── LoginScreen.js
        ├── AdminDashboardScreen.js     # REWRITTEN — live At Risk from API, removed hardcoded data + duplicate cards
        ├── ManageSchedulesScreen.js    # duration_minutes fix (auto-calc from time pickers)
        ├── ManageStudentsScreen.js     # REWRITTEN — deactivate/reactivate replaces hard-delete, inactive toggle added
        ├── ManageTeachersScreen.js     # NEW — teacher CRUD + deactivate/reactivate
        ├── ManageBatchesScreen.js
        ├── ManageBatchDetailScreen.js
        ├── BatchOverviewScreen.js      # NEW — batch analytics overview + per-batch export
        ├── ClassListScreen.js          # NEW — classes within a batch
        ├── ClassDetailScreen.js        # NEW — student roster with filters/sort/pagination + export
        ├── StudentDetailScreen.js      # NEW — per-student attendance detail + export
        ├── ExportReportsScreen.js      # existing (unchanged)
        └── ... (other screens)
```

---

## Database Schema (SQLite — key tables)

### `users` (updated)
| Column | Type | Notes |
|---|---|---|
| id | Integer PK | |
| fullname | String(150) | |
| email | String(255) UNIQUE | |
| password_hash | String(255) | bcrypt |
| role | String(20) | `admin` / `teacher` / `student` |
| phone | String(30) nullable | |
| device_token | String(512) nullable | FCM token |
| is_active | Boolean DEFAULT 1 | **NEW** — soft-delete; False blocks login |
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

### Admin — Dashboard
| Method | URL | Role | Notes |
|---|---|---|---|
| GET | /api/admin/stats | admin | total_students, present_today, absent_today, waivers_pending, sessions_today, attendance_rate — **casing bug fixed (was always returning 0)** |
| GET | /api/admin/recent-sessions | admin | last 5 sessions with present/absent counts |
| GET | /api/admin/dashboard/at-risk-students | admin | **NEW** — top N students below 75% across all classes; params: `limit` (default 8, max 20); sorted lowest first |

### Admin — Classes
| Method | URL | Role | Notes |
|---|---|---|---|
| POST | /api/admin/class/create | admin | `duration_minutes` required; optional `batch_id` also creates BatchClassLink |
| GET | /api/admin/class/list | admin/teacher | |
| PUT | /api/admin/class/{id} | admin | |
| DELETE | /api/admin/class/{id} | admin | |
| PUT | /api/admin/class/{id}/schedule | admin | set schedule fields |
| GET | /api/admin/classes/{id}/students | admin | roster; params: search, risk, sort, page, page_size |

### Admin — Users / Teachers
| Method | URL | Role | Notes |
|---|---|---|---|
| GET | /api/admin/users | admin | optional `?role=teacher` filter; includes `is_active` |
| PUT | /api/admin/user/{id} | admin | fullname, email, phone, password, device_token |
| PUT | /api/admin/user/{id}/deactivate | admin | sets `is_active=False`; blocks login |
| PUT | /api/admin/user/{id}/reactivate | admin | sets `is_active=True`; restores login |

### Admin — Batches
| Method | URL | Role | Notes |
|---|---|---|---|
| POST | /api/admin/batches | admin | create batch |
| GET | /api/admin/batches | admin | list all |
| GET | /api/admin/batches/summary | admin | **NEW** per-batch analytics summary |
| GET | /api/admin/batches/{id} | admin | detail + students |
| PUT | /api/admin/batches/{id} | admin | rename/edit |
| DELETE | /api/admin/batches/{id} | admin | **never cascades to enrollments** |
| POST | /api/admin/batches/{id}/students | admin | add students; auto-enrolls to linked classes |
| DELETE | /api/admin/batches/{id}/students/{sid} | admin | remove from batch + unenroll from linked classes |
| GET | /api/admin/batches/{id}/classes/summary | admin | **NEW** per-class analytics for a batch |
| POST | /api/admin/classes/{id}/enroll-batch | admin | bulk enroll; creates BatchClassLink |

### Admin — Students
| Method | URL | Role | Notes |
|---|---|---|---|
| GET | /api/student/list | admin/teacher | list all students; includes `is_active` and `user_id` per student *(updated)* |
| GET | /api/student/{id} | admin/teacher | student + enrollments |
| PUT | /api/student/{id} | admin | update student profile |
| DELETE | /api/student/{id} | admin | hard delete with cascade (fixed) |
| GET | /api/admin/students/{id}/detail | admin | **NEW** full attendance detail for drill-down |

### Admin — Export
| Method | URL | Role | Notes |
|---|---|---|---|
| POST | /api/admin/export-report | admin | report_type: full/atrisk/class/waiver/weekly/monthly/**batch**/**class_roster**/**student** (new); format: csv/excel/pdf; scoped params: batch_id, class_id, student_id, risk, search |

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

## Running Tests

### API / Integration tests (Flask test client)
```bash
# From inside the container (recommended — all deps available)
docker exec -w /app/test attendance_backend python -m unittest test_admin_routes test_student_routes test_teacher_routes -v

# From your local machine (must be in the test/ directory — no Docker needed)
cd "Backend Sajak/backend/backend/test"
python -m unittest test_admin_routes test_student_routes test_teacher_routes -v
```

**Important**: The test files use bare `from test_helpers import ...` so the working directory must be `test/` when running. Running from `backend/` with `python -m unittest test.test_admin_routes` will fail with `ModuleNotFoundError: No module named 'test_helpers'`.

**Local run works without Docker**: `test_helpers.py` stubs out `cv2`, `deepface`, `mtcnn`, and `tensorflow` at the `sys.modules` level before any imports happen, so heavy AI packages (Docker-only) are never actually loaded during tests.

**Current results**: 73/73 tests pass (27 admin + 28 student + 19 teacher).

### Pure unit tests (no Flask, no DB, no Docker needed)
```bash
# From your local machine — must be in the tests/unit/ directory
cd "Backend Sajak/backend/backend/tests/unit"
python -m unittest test_attendance_engine test_recognizer_confidence test_batch_risk_logic test_enroll_threshold -v
```

**Design**: Each file stubs its own import chain using `importlib.util.spec_from_file_location` to load only the target module, completely bypassing `routes/__init__.py` and `services/face_recognition/__init__.py`. No Flask app, no SQLAlchemy session, no JWT, no cv2, no DeepFace. Runs in ~70 ms.

**Current results**: 62/62 tests pass across 4 files.

---

## Docker

```bash
# First build (or after requirements.txt / Dockerfile changes)
docker compose up --build -d

# Subsequent runs — source is live-mounted, no rebuild needed for .py changes
docker compose up -d

# Logs
docker logs attendance_backend --tail 50

# Stop
docker compose stop
```

**Important**: Source code is **volume-mounted** into the container (`./Backend Sajak/backend/backend:/app`) and gunicorn runs with `--reload`. Python file changes are live within ~2 seconds. Only `requirements.txt` or `Dockerfile` changes require `--build`.

**DB lock issue**: If DB Browser for SQLite is open, it locks `attendance.db` and causes `sqlite3.OperationalError: disk I/O error`. Close DB Browser before starting the container.

**"Frontend not working" checklist** (in order):
1. Is the backend container running? → `docker ps` or `docker compose ps`. If empty, run `docker compose up -d`.
2. Is `BASE_URL` in `api.js` set to the PC's current WiFi IP? → `ipconfig` to check. Update if IP changed.
3. Is the device/emulator on the **same WiFi network** as the PC?
4. Is `npx expo start` running in the `AttendanceApp` folder?

---

## Postman Collection

Two files at the project root (`Project_Capstone/`):

| File | Description |
|---|---|
| `myTIMeS.postman_collection.json` | **72 requests** across 4 folders (0. Auth, 1. Admin, 2. Teacher, 3. Student) — full coverage of every endpoint |
| `myTIMeS.postman_environment.json` | 10 environment variables; `base_url` defaults to `http://localhost:5000`, all others auto-populated by test scripts |

**Run order for end-to-end testing**:
`Auth (Admin Login)` → `Admin (1–6)` → `Teacher (all)` → `Student (all)` → `Admin → Waivers → Approve Waiver`

Every request has a `pm.test()` status check and `pm.environment.set()` to chain variables automatically. See `myTIMeS_postman_README.md` for full instructions.

---

## Agent Hooks

Located at `.kiro/hooks/`:

| Hook file | Trigger | Action |
|---|---|---|
| `session-context-loader.json` | SessionStart | Reads `PROJECT_CONTEXT.md` then `PROJECT_DOCUMENTATION.md` at the start of every session |
| `session-doc-updater.json` | Stop | Updates both docs at the end of every session to reflect all changes made |

---

## Current Known Issues / Pending Work

### Fixed this session ✅
1. **Student DELETE was 405** — `delete_student()` missing `@student_bp.route` decorator. Fixed.
2. **`routes/admin.py` crashed on startup** — missing `from flask import Blueprint, g, jsonify, request`. Fixed.
3. **Add Class always failed** — `duration_minutes` never sent from frontend. Fixed: auto-calculated from start/end time pickers with validation.
4. **`BatchClassLink` not created on class creation** — analytics endpoints couldn't see classes created via the form. Fixed + backfill run (no orphans in existing data).
5. **`GET /api/admin/stats` always returned 0 for present_today, absent_today, waivers_pending** — status filter used lowercase `'present'`/`'absent'`/`'pending'` but the model stores title-case. Also `attendance_rate` defaulted to `100` when no sessions — now correctly defaults to `0`. Fixed.
6. **`AdminDashboardScreen` hardcoded fake data** — removed `atRiskStudents` array, `weekData` array, `WeeklyChart` component, and the duplicate "Today's Overview" card. At-risk section now fetches from `GET /api/admin/dashboard/at-risk-students`. All orphaned styles removed.
7. **`ManageStudentsScreen` hard-delete replaced with deactivate/reactivate** — frontend now mirrors the teacher pattern: inactive toggle, grayed-out cards, "Inactive" badge, Deactivate/Reactivate buttons. Backend `GET /api/student/list` updated to include `is_active` and `user_id` per student. Hard-delete route preserved in backend but not exposed in UI. Full 10-test end-to-end loop verified.
8. **Missing test infrastructure** — `test/test_helpers.py` and `test/__init__.py` created. Provides `make_app()` (isolated in-memory Flask app), `auth_as()` (JWT injection context manager), and all DB factory helpers. 55/55 tests pass across both suites.
9. **Test suite expanded + infrastructure restored** — `test_teacher_routes.py` (19 tests: teacher class listing, session lifecycle, attendance report) added and passing. `test_helpers.py` now stubs `cv2`/`deepface`/`mtcnn`/`tensorflow` in `sys.modules` so the full suite runs locally without Docker. **73/73 tests pass** (27 admin + 28 student + 19 teacher).
10. **Postman collection rebuilt** — replaced old 13-request minimal collection with a full **72-request** collection covering every endpoint across 4 folders (Auth, Admin, Teacher, Student). Every request has status assertions and automatic `pm.environment.set()` variable chaining. Environment file (`myTIMeS.postman_environment.json`) unchanged.
11. **`BASE_URL` IP updated** — `AttendanceApp/api.js` updated from stale `10.200.30.101` → `192.168.1.66` (current WiFi IP). Login `AbortError` resolved.

### Still pending
1. **`reload_embeddings()` only refreshes one gunicorn worker** — with multiple workers, the other worker keeps the old cache until restarted. Container restart guarantees consistency. Acceptable for low-traffic.

2. **Face enrollment via API produces `{roll_number}_mean.npy`** but three test students have `face_label = Student_1/2/3` (manually patched). New students enrolled via the API are consistent automatically.

3. **Schedule date picker** — currently plain TextInput (ISO format). Could be improved with a date picker library.

4. **`AddStudentFaceScreen`** — the face photo UI is functional but actual enrollment goes through `POST /api/admin/enroll-face`; the screen calls `POST /api/admin/register-student` for full registration with face data.
