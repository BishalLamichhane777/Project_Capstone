# Smart Attendance System — Project Context

Paste this into a new Kiro chat to continue development with full context.

---

## Project Overview

**Smart Attendance System (myTIMeS)** — React Native (Expo SDK 54) frontend + Flask/SQLAlchemy/SQLite backend, Dockerized, with Firebase Admin SDK for FCM push notifications. Face recognition uses MTCNN + DeepFace (FaceNet) for enrollment and identification.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React Native, Expo SDK 54, `expo-camera` v17, lucide-react-native, `expo-notifications` 0.32.17, `expo-document-picker` 14.0.8 |
| Backend | Flask 3.0, Flask-SQLAlchemy, SQLite, Gunicorn |
| AI | DeepFace (FaceNet, 128-dim embeddings), MTCNN, opencv-python-headless |
| Auth | JWT (PyJWT), bcrypt |
| Notifications | Firebase Admin SDK (FCM push + in-app SQLite rows) |
| Container | Docker multi-stage build, docker-compose |

---

## Directory Structure

```
Project_Capstone/
├── docker-compose.yml
├── .env                          # ROOT env — used by docker-compose
├── firebase_credentials.json     # capstone-project-attendanceapp (project in use)
│
├── Backend Sajak/backend/backend/      # MAIN FLASK BACKEND (live-mounted at /app)
│   ├── app.py                          # Flask factory + runtime migrations
│   ├── config.py
│   ├── database.py
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── uploads/waivers/                # waiver supporting documents (volume-mounted)
│   ├── models/
│   │   ├── user.py                     # platform column added
│   │   ├── excuse.py                   # waiver_type, class_id, target_date, start_date, end_date added; session_id nullable
│   │   ├── notification.py
│   │   └── ...
│   ├── routes/
│   │   ├── session.py                  # resume logic + _auto_expire_stale_session()
│   │   ├── excuse.py                   # prior/retroactive waiver, multipart upload
│   │   ├── auth.py                     # device-token endpoint accepts platform
│   │   ├── student.py                  # notifications endpoints
│   │   ├── notifications.py
│   │   └── ...
│   └── services/
│       └── notifications.py            # rewritten — in-app DB row + FCM push; notify_absent_students_bulk_plain()
│
└── AttendanceApp/                      # REACT NATIVE FRONTEND
    ├── api.js                          # BASE_URL + all API endpoints (attendanceReport, sessionByClass added)
    ├── App.js
    ├── context/AuthContext.js          # FCM token registration on login
    ├── app.json                        # android.package, googleServicesFile, expo-notifications plugin
    ├── google-services.json            # capstone-project-attendanceapp
    ├── components/
    └── screens/
        ├── HomeScreen.js               # REWRITTEN — live analytics, real weekly chart, real recent status
        ├── ProfileScreen.js            # REWRITTEN — live analytics, real monthly chart, risk assessment, bell+badge, OS notif toggle
        ├── ClassesScreen.js            # date filter counter fixed (filtered.length not classes.length)
        ├── SubmitWaiverScreen.js       # real file picker, prior/retroactive toggle, date range
        ├── NotificationsScreen.js      # useFocusEffect for re-fetch; per-notif mark-read
        ├── AdminWaiversScreen.js       # Prior Request / Retroactive badge
        ├── WaiverStatusScreen.js       # type badge, start/end date range display
        ├── AdminDashboardScreen.js     # removed Add Student Face + Student Analytics quick actions
        ├── TeacherReportsScreen.js     # REWRITTEN — all static data replaced with live API data; Waivers Pending + Top Attendance removed
        └── ... (other screens unchanged)
```

---

## Database Schema — Key Changes Since Last Context

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
| platform | String(10) nullable | **NEW** — `android` / `ios` |
| is_active | Boolean DEFAULT 1 | soft-delete |
| created_at | DateTime | UTC |

### `waiver_requests` (updated — major schema change)
| Column | Type | Notes |
|---|---|---|
| request_id | Integer PK | |
| student_id | Integer FK→students | |
| waiver_type | String(20) NOT NULL DEFAULT 'retroactive' | **NEW** — `retroactive` / `prior` |
| session_id | String(36) FK→sessions **NULLABLE** | **CHANGED** — was NOT NULL |
| class_id | Integer FK→classes nullable | **NEW** — prior waivers only |
| target_date | String(10) nullable | legacy single-date field |
| start_date | String(10) nullable | **NEW** — ISO `YYYY-MM-DD` |
| end_date | String(10) nullable | **NEW** — ISO `YYYY-MM-DD` |
| reason | Text | |
| supporting_doc_path | String(512) nullable | real file path under uploads/waivers/ |
| status | String(20) DEFAULT 'Pending' | |
| submitted_at | DateTime | |
| reviewed_at | DateTime nullable | |

### `notifications`
No schema change. In-app rows now reliably created — background thread bug was fixed.

---

## API Endpoints — Changes & Additions

### Auth
| Method | URL | Notes |
|---|---|---|
| POST | /api/auth/device-token | Now accepts `{ device_token, platform }` |

### Session
| Method | URL | Notes |
|---|---|---|
| POST | /api/session/start | **UPDATED** — returns existing ACTIVE session with `resumed: true` instead of creating duplicate |
| GET | /api/session/class/`<class_id>` | Used by TeacherReportsScreen for weekly trend data |

### Excuse / Waiver
| Method | URL | Notes |
|---|---|---|
| POST | /api/excuse/submit | **UPDATED** — two paths: retroactive (`session_id`) and prior (`waiver_type=prior`, `class_id` optional, `start_date` required, `end_date` optional); accepts multipart/form-data for file upload |
| GET | /api/excuse/pending | Returns `waiver_type`, `start_date`, `end_date`, `class_name` |
| GET | /api/excuse/my-excuses | Same additional fields |
| PUT | /api/excuse/decide/`<id>` | Only auto-flips attendance for retroactive+Approved |

### Student Notifications
| Method | URL | Role | Notes |
|---|---|---|---|
| GET | /api/student/notifications | student | returns notifications newest-first |
| PUT | /api/student/notifications/`<id>`/read | student | mark single notification read |

### Notifications (shared)
| Method | URL | Notes |
|---|---|---|
| GET | /api/notifications/my-notifications | all roles |
| PUT | /api/notifications/mark-read | all roles |
| GET | /api/notifications/unread-count | all roles |

### Attendance
| Method | URL | Notes |
|---|---|---|
| GET | /api/attendance/report/`<class_id>` | teacher/admin — used by TeacherReportsScreen |

---

## Notification System Architecture

### Two delivery paths per notification event:
1. **In-app DB row** — always created for all platforms. Stored in `notifications` table. Read via bell screen.
2. **FCM push** — only for Android + token present. Sent via `firebase_admin.messaging.send()`.

### Background thread fix (critical):
- `end_session` spawns a daemon thread for absent notifications
- Thread was failing silently with two errors:
  - `Working outside of application context` — fixed by passing `app._get_current_object()` and using `with app.app_context()`
  - `Parent instance not bound to Session; lazy load cannot proceed` — fixed by pre-extracting all ORM data into plain dicts before spawning thread
- New function: `notify_absent_students_bulk_plain(absent_data: list, class_name)` — thread-safe version

### Push notification limitation:
- **Expo Go blocks FCM push since SDK 53** — requires a development build (`npx expo run:android`)
- In-app notifications (bell screen) work in Expo Go
- Dev build was attempted; `android/` folder generated via `npx expo prebuild --clean`
- Build ran successfully but was interrupted before completion

---

## Session Resume Fix

`POST /api/session/start` now:
1. Checks for existing `ACTIVE` session on the same `class_id`
2. If found and **not stale** → returns it with `{ resumed: true, start_time, session_id, enrolled_students }`
3. If found and **stale** → auto-closes it (via `_auto_expire_stale_session()`), then creates new session
4. Stale = started on a previous calendar day, OR started today but past `scheduled_end_time + 60 min`

Frontend (`StartClassScreen.handleStart`): when `data.resumed === true`, calls `fetchSessionStatus()` which recalculates elapsed time from server `start_time` and repopulates detected students list.

---

## Prior Waiver Feature

Two waiver types now supported:

**Retroactive** (original flow):
- Student was already marked Absent
- Requires `session_id`
- Approval auto-flips attendance to Present

**Prior** (new):
- Requested before the session happens
- Requires `start_date` (ISO), optional `end_date` (multi-day leave), optional `class_id`
- `class_id = null` means "All Classes / General Leave"
- Enrollment check only runs when a specific class is given
- Approval does NOT flip attendance (Option A — teacher handles manually)

### Frontend flow:
- Toggle: "Report Absence" (blue) / "Request in Advance" (orange)
- Prior flow: class picker (optional, "All Classes" first option), start date picker, end date picker (auto-defaults to same as start)
- Date range (60 days from today shown in pickers)
- History cards show range `"Jul 25 → Jul 29"` for multi-day prior waivers

### Admin review:
- "Prior Request" (orange, Clock icon) vs "Retroactive" (grey, AlertTriangle) badge on each card
- Orange info bar on prior cards: "no attendance record exists yet"

---

## Hardcoded Data Fixes (Student Screens)

### HomeScreen.js — fully rewritten:
- **Attendance circle**: live from `GET /api/attendance/analytics → data.percentage`
- **Good Standing badge**: conditional — ≥75% green "Good Standing", <75% red "At Risk"
- **Weekly trend chart**: real data from attendance history, grouped by NPT calendar day, last 7 days
- **+X.X% trend badge**: calculated as this week avg − last week avg; hidden if no data
- **Recent Status**: live from attendance history (was fake hardcoded array with Oct 21 dates)
- Single `fetchAll()` call on focus fetches analytics + history + unread count in parallel

### ProfileScreen.js — fully rewritten:
- **88% attendance stat**: live from analytics
- **Risk Assessment card**: dynamic — ≥80% Low (green), 60–79% Mid (amber), <60% High (red)
- **Monthly chart**: real data from attendance history grouped by month; period picker actually changes chart
- **Bell button**: navigates to Notifications + unread badge
- **Notifications toggle**: reads/requests real OS permission via `expo-notifications`
- All student-only endpoints guarded by `user?.role === 'student'` — no 403 for teachers

### ClassesScreen.js:
- Header badge and subtitle now show `filtered.length` (classes on selected date) not `classes.length`

### TeacherReportsScreen.js — fully rewritten:
- **Overall Attendance %**: real average across teacher's classes from `/api/attendance/report/<id>`
- **At-Risk count**: real from same report data
- **Waivers Pending** and **Top Attendance** stat cards: **removed**
- **Weekly trend chart**: real session data from `/api/session/class/<id>`, grouped by NPT day
- **Student Distribution bar chart**: real enrollment counts from `/api/session/classes`
- **At-Risk students list**: real students < 75%, sorted lowest first, up to 5
- Hardcoded `▲ 4.2%` trend badge: **removed**

---

## Firebase Projects

| File | Project | Used for |
|---|---|---|
| `firebase_credentials.json` (root) | mytimes-direct-v2 | NOT USED by backend |
| `Backend Sajak/.../firebase_credentials.json` | capstone-project-attendanceapp | **Backend FCM** (mounted at /app/) |
| `AttendanceApp/google-services.json` | capstone-project-attendanceapp | **Frontend FCM** |

Both backend credentials and google-services.json use the **same project**: `capstone-project-attendanceapp`.

---

## Running the Project

```bash
# Start backend
docker compose up -d

# Start frontend
cd AttendanceApp
npx expo start --clear

# Check backend logs
docker logs attendance_backend --tail 50

# Compile-check backend files
docker exec attendance_backend python -c "import py_compile; [py_compile.compile(f, doraise=True) for f in ['/app/routes/session.py','/app/routes/excuse.py','/app/services/notifications.py']]"
```

**Important**: Update `BASE_URL` in `api.js` to your PC's current WiFi IP whenever it changes.

---

## Known Pending Work

1. **Dev build for FCM push** — `npx expo prebuild --clean` + `npx expo run:android` generates the native build. The splashscreen_logo error was resolved by prebuild. Build was running (CMake step) when interrupted. Re-run to complete.

2. **Profile screen static data** — ProfileScreen fixes (#1-6) are complete for students. Teachers/admins correctly skip student-only sections.

3. **Export Reports "Recent Exports" section** — still hardcoded static dummy data (cosmetic, low priority).

4. **`reload_embeddings()` only refreshes one gunicorn worker** — container restart guarantees consistency.

5. **TeacherDashboard quickStats** — `{ '4 Classes Today', '68 Total Students', '91% Avg Attendance' }` are still hardcoded static values in `TeacherDashboardScreen.js`.

6. **WaiverStatusScreen feedback text** — "ADMIN FEEDBACK" section still shows hardcoded text like "Medical certificate verified. Stay safe!" regardless of actual admin decision.
