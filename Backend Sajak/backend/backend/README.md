# myTIMeS Direct V2 — Backend API

Automated classroom attendance system REST API built with Flask + SQLAlchemy.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Flask 3.0 |
| ORM | SQLAlchemy 2.0 + Flask-SQLAlchemy |
| Database | SQLite (local) |
| Auth | bcrypt + PyJWT |
| Push Notifications | Expo Push Notifications |
| CORS | Flask-CORS |

## Quick Start

### 1. Clone and navigate

```bash
cd backend
```

### 2. Create virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env with your values — especially SECRET_KEY
```

### 5. Run the server

```bash
python app.py
```

The server starts at `http://localhost:5000`. All API routes are under `/api/`.

### 7. Production

```bash
gunicorn app:create_app() --bind 0.0.0.0:5000 --workers 4
```

---

## API Endpoints

All endpoints return JSON. Authentication via `Authorization: Bearer <token>` header.

### Auth (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Login with email + password → JWT |
| POST | `/api/auth/register` | Admin | Register a new user |
| GET | `/api/auth/me` | Any | Get current user profile |

#### POST `/api/auth/login`
```json
// Request
{ "email": "user@example.com", "password": "secret" }

// Response 200
{ "token": "jwt...", "role": "teacher", "user_id": 1, "fullname": "John Doe" }
```

#### POST `/api/auth/register`
```json
// Request (admin-only)
{
  "fullname": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "role": "student",
  "phone": "+977-9800000000",
  "roll_number": "BCA-2024-001",
  "program": "BCA",
  "year_of_study": 2
}

// Response 201
{ "user_id": 5, "message": "User registered" }
```

---

### Sessions (`/api/session`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/session/start` | Teacher | Start attendance session |
| POST | `/api/session/end` | Teacher | End session & finalize |
| GET | `/api/session/status/<id>` | Teacher, Admin | Session status + counts |
| GET | `/api/session/class/<id>` | Teacher, Admin | All sessions for a class |

#### POST `/api/session/start`
```json
// Request
{ "class_id": 1, "mode": "Strict", "start_time": "2026-05-24T10:00:00+05:45" }

// Response 200
{ "session_id": "uuid...", "threshold_percent": 0.8, "enrolled_count": 42 }
```

#### POST `/api/session/end`
```json
// Request
{ "session_id": "uuid..." }

// Response 200
{ "session_id": "uuid...", "summary": { "present": 38, "absent": 4, "total": 42 } }
```

---

### Attendance (`/api/attendance`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/attendance/history/<student_id>` | Student (own), Admin | Attendance history |
| GET | `/api/attendance/report/<class_id>` | Teacher, Admin | Class attendance report |
| PUT | `/api/attendance/manual-override` | Admin | Override attendance status |

#### GET `/api/attendance/report/<class_id>`
```json
// Response 200
{
  "class_name": "Data Structures",
  "total_sessions": 15,
  "students": [
    {
      "student_id": 1,
      "fullname": "Jane Smith",
      "roll_number": "BCA-2024-001",
      "total_sessions": 15,
      "sessions_present": 12,
      "attendance_percentage": 80.0,
      "at_risk": false
    }
  ],
  "generated_at": "2026-05-24T10:30:00+00:00"
}
```

---

### Excuses (`/api/excuse`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/excuse/submit` | Student | Submit an excuse |
| GET | `/api/excuse/pending` | Admin | List pending excuses |
| GET | `/api/excuse/history/<student_id>` | Student (own), Admin | Excuse history |
| PUT | `/api/excuse/decide/<request_id>` | Admin | Approve/reject excuse |

---

### Students (`/api/student`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/student/list` | Admin, Teacher | List all students |
| GET | `/api/student/<id>` | Admin, Teacher | Student detail |
| PUT | `/api/student/enrol/<id>` | Admin | Enrol student in class |
| DELETE | `/api/student/unenrol` | Admin | Remove student from class |
| DELETE | `/api/student/<id>` | Admin | Delete student + all data |
| GET | `/api/student/notifications` | Student | Student notifications |

---

### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/class/create` | Admin | Create a class |
| GET | `/api/admin/class/list` | Admin, Teacher | List all classes |
| PUT | `/api/admin/class/<id>` | Admin | Update a class |
| DELETE | `/api/admin/class/<id>` | Admin | Delete class (no active sessions) |
| DELETE | `/api/admin/session/<id>` | Admin | Delete session + data |
| GET | `/api/admin/users` | Admin | List users (?role=filter) |
| PUT | `/api/admin/user/<id>` | Admin | Update user info |
| GET | `/api/admin/notifications` | Admin | Admin notifications |

---

## Database Schema

SQLite database is automatically created on first run at `backend/instance/attendance.db`.

**Tables:** `users`, `students`, `classes`, `enrollments`, `sessions`, `attendance_logs`, `attendance_records`, `waiver_requests`, `notifications`

---

## Error Responses

All errors return structured JSON:

```json
{ "error": "Description of the error", "status": 400 }
```

| Code | Meaning |
|------|---------|
| 400 | Malformed request / missing required fields |
| 401 | Missing or invalid authentication token |
| 403 | Insufficient role permissions |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 422 | Validation error (e.g., invalid enum value) |
| 500 | Internal server error |
| 503 | Service unavailable |

---

## Project Structure

```
backend/
├── app.py                          # Application factory & entry point
├── config.py                       # Configuration from env vars
├── database.py                     # SQLAlchemy instance
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variable template
├── models/
│   ├── __init__.py                 # Model re-exports
│   ├── user.py                     # User model
│   ├── student.py                  # Student model
│   ├── class_model.py              # Class + Enrollment models
│   ├── session.py                  # Session model
│   ├── attendance.py               # AttendanceLog + AttendanceRecord
│   ├── excuse.py                   # WaiverRequest model
│   └── notification.py             # Notification model
├── routes/
│   ├── __init__.py                 # Blueprint re-exports
│   ├── auth.py                     # /api/auth
│   ├── session.py                  # /api/session
│   ├── attendance.py               # /api/attendance
│   ├── excuse.py                   # /api/excuse
│   ├── student.py                  # /api/student
│   └── admin.py                    # /api/admin
├── services/
│   ├── __init__.py
│   ├── attendance_engine.py        # Duration calculation & finalization
│   └── notifications.py            # Expo push notifications
└── middleware/
    ├── __init__.py
    └── auth_middleware.py           # JWT auth & RBAC
```

---

## Notes

- **Face Recognition** modules (`services/face_recognition.py`, `services/preprocessing.py`) and their endpoints (`POST /admin/enroll-face/{student_id}`, `POST /attendance/frame`) are not included — they will be added separately.
- All timestamps are stored and returned as ISO 8601 strings.
- Passwords are never exposed in API responses.
