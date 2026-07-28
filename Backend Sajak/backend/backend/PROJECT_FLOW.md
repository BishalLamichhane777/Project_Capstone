# myTIMeS Backend — Complete Project Flow

> This document explains **how every part of the system works**, why you got a 401 on register, and the exact order of operations to use the API from scratch.

---

## Table of Contents

1. [Why Register Returns 401](#1-why-register-returns-401--the-bootstrap-problem)
2. [Getting Started — Step by Step](#2-getting-started--step-by-step)
3. [Authentication Flow](#3-authentication-flow)
4. [User & Role System](#4-user--role-system)
5. [Class Management Flow](#5-class-management-flow)
6. [Student Enrollment Flow](#6-student-enrollment-flow)
7. [Session Lifecycle](#7-session-lifecycle--the-core-of-attendance)
8. [Attendance Calculation Engine](#8-attendance-calculation-engine)
9. [Excuse / Waiver Workflow](#9-excuse--waiver-workflow)
10. [Notifications System](#10-notifications-system)
11. [Complete Request Lifecycle](#11-complete-request-lifecycle)
12. [Entity Relationship Overview](#12-entity-relationship-overview)

---

## 1. Why Register Returns 401 — The Bootstrap Problem

You got this error:

```json
{
    "error": "Authorization token is missing",
    "status": 401
}
```

**This is expected behavior.** Here's why:

The `POST /api/auth/register` endpoint is decorated with `@require_role("admin")`. This means **only an already-authenticated admin can create new users**. This is a security design — you don't want random people registering accounts in an attendance system.

But when you first start the app, the database is empty. There are no users at all, so there's no admin to log in as, and no way to create one through the API.

> [!IMPORTANT]
> **The Solution:** Run the seed script to create your first admin user directly in the database:
> ```bash
> python seed_admin.py
> ```
> This creates an admin with `admin@mytimes.com` / `admin123`. Then you log in through the API to get a JWT token, and use that token to register everyone else.

```mermaid
flowchart LR
    A["Empty DB"] -->|"python seed_admin.py"| B["Admin exists in DB"]
    B -->|"POST /api/auth/login"| C["Get JWT token"]
    C -->|"POST /api/auth/register\n(with Bearer token)"| D["Create teachers\n& students"]
```

---

## 2. Getting Started — Step by Step

Here's the exact sequence to go from zero to a working system:

### Step 1: Start the server
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # edit SECRET_KEY for production
python app.py                 # or: flask run
```
> On first run, SQLite creates `instance/attendance.db` with all tables automatically.

### Step 2: Seed the first admin
```bash
python seed_admin.py
```
Output:
```
==================================================
  ADMIN USER CREATED SUCCESSFULLY
==================================================
  User ID  : 1
  Email    : admin@mytimes.com
  Password : admin123
  Role     : admin
==================================================
```

### Step 3: Login as admin → get JWT token
```
POST /api/auth/login
Body: { "email": "admin@mytimes.com", "password": "admin123" }
```
Response:
```json
{ "token": "eyJhbG...", "role": "admin", "user_id": 1, "fullname": "System Admin" }
```
> **Copy this token.** You'll use it in the `Authorization` header for all subsequent requests.

### Step 4: Register a teacher
```
POST /api/auth/register
Headers: Authorization: Bearer <admin-token>
Body: {
  "fullname": "Dr. Ramesh Sharma",
  "email": "ramesh@mytimes.com", 
  "password": "teacher123",
  "role": "teacher"
}
```

### Step 5: Register students
```
POST /api/auth/register
Headers: Authorization: Bearer <admin-token>
Body: {
  "fullname": "Anita Thapa",
  "email": "anita@mytimes.com",
  "password": "student123",
  "role": "student",
  "roll_number": "BCA-2024-001",
  "program": "BCA",
  "year_of_study": 2
}
```

### Step 6: Create a class
```
POST /api/admin/class/create
Headers: Authorization: Bearer <admin-token>
Body: {
  "class_name": "Data Structures",
  "subject": "Computer Science",
  "room": "Lab-301",
  "teacher_id": 2,
  "duration_minutes": 60
}
```

### Step 7: Enrol students in the class
```
PUT /api/student/enrol/1
Headers: Authorization: Bearer <admin-token>
Body: { "class_id": 1 }
```

### Step 8: Teacher starts a session
```
POST /api/session/start
Headers: Authorization: Bearer <teacher-token>
Body: { "class_id": 1, "mode": "Strict" }
```

### Step 9: Teacher ends the session
```
POST /api/session/end
Headers: Authorization: Bearer <teacher-token>
Body: { "session_id": "<uuid-from-step-8>" }
```

Now the system is fully operational. Students can view their attendance, submit excuses, etc.

---

## 3. Authentication Flow

Every API request (except login) follows this flow:

```mermaid
sequenceDiagram
    participant Client as Client (Postman/App)
    participant MW as Auth Middleware
    participant Route as Route Handler
    participant DB as SQLite Database

    Client->>MW: Request + Authorization: Bearer <token>
    
    alt No token in header
        MW-->>Client: 401 "Authorization token is missing"
    end

    MW->>MW: Try decode as app JWT (HS256 + SECRET_KEY)
    
    alt JWT valid
        MW->>MW: Extract {user_id, role, email} from payload
        MW->>Route: Set g.current_user, proceed
    else JWT invalid
        MW-->>Client: 401 "Invalid or expired token"
    end

    Route->>Route: Check g.current_user.role ∈ allowed_roles
    alt Role not allowed
        Route-->>Client: 403 "Forbidden: requires one of [...]"
    end
    
    Route->>DB: Perform database operations
    Route-->>Client: 200/201 JSON response
```

### How JWT Works in This System

1. **Login** → server generates a JWT with payload `{user_id, role, email, exp}` signed with `SECRET_KEY`
2. **Token lifetime** → 24 hours (configurable via `JWT_EXPIRY_HOURS`)
3. **Every request** → client sends `Authorization: Bearer <token>` header
4. **Middleware decodes** → extracts user info into `g.current_user`
5. **Role check** → `@require_role("admin")` compares `g.current_user.role` against allowed roles

### JWT Payload Structure
```json
{
  "user_id": 1,
  "role": "admin",
  "email": "admin@mytimes.com",
  "exp": 1748186400
}
```

---

## 4. User & Role System

The system has three roles with strict permission boundaries:

| Role | Can Do | Cannot Do |
|------|--------|-----------|
| **admin** | Everything — register users, manage classes, approve excuses, override attendance, delete data | N/A |
| **teacher** | Start/end sessions for their own classes, view reports, view students | Register users, manage classes, approve excuses, delete students |
| **student** | View own attendance, submit excuses, view own notifications | View other students' data, start sessions, approve anything |

### Registration creates different records based on role:

```mermaid
flowchart TD
    R["POST /api/auth/register"] --> V{Validate inputs}
    V -->|Invalid| E1["400/422 Error"]
    V -->|Valid| H["Hash password with bcrypt"]
    H --> U["INSERT into users table"]
    U --> C{role == 'student'?}
    C -->|Yes| S["INSERT into students table\n(roll_number, program, year)"]
    C -->|No| D["Return {user_id, message}"]
    S --> D
```

> [!NOTE]
> When role is `student`, the request body **must** include `roll_number` and `program` — these go into the separate `students` table linked to the `users` table via `user_id`.

---

## 5. Class Management Flow

Classes are the organizational unit — they link teachers to subjects and rooms.

```mermaid
flowchart LR
    A["Admin creates class\n(POST /admin/class/create)"] --> B["Class stored in DB\n{class_name, subject, room,\nteacher_id, duration_minutes}"]
    B --> C["Admin enrolls students\n(PUT /student/enrol/:id)"]
    C --> D["Teacher starts sessions\nagainst this class"]
```

**Key rules:**
- A class has **one teacher** (`teacher_id` → `users.id`)
- A class has **many enrolled students** (via `enrollments` table)
- A class can have **many sessions** over time
- A class **cannot be deleted** if it has active sessions

---

## 6. Student Enrollment Flow

Enrollment connects students to classes. Without enrollment, students don't appear in attendance when a session starts.

```mermaid
flowchart TD
    E["PUT /api/student/enrol/1\nBody: {class_id: 1}"] --> C1{Student exists?}
    C1 -->|No| E1["404 Student not found"]
    C1 -->|Yes| C2{Already enrolled?}
    C2 -->|Yes| E2["409 Already enrolled"]
    C2 -->|No| I["INSERT into enrollments\n(student_id, class_id, enrolled_at)"]
    I --> OK["201 Student enrolled"]
```

**Why enrollment matters:** When a teacher starts a session for a class, the system automatically creates `attendance_records` rows for **every enrolled student** with `status=Absent` as the default. If a student isn't enrolled, they won't get an attendance record for that session.

---

## 7. Session Lifecycle — The Core of Attendance

A session represents one class period where attendance is tracked. This is the most important flow in the system.

### 7.1 Starting a Session

```mermaid
sequenceDiagram
    participant T as Teacher
    participant API as Session Route
    participant DB as SQLite

    T->>API: POST /api/session/start<br/>{class_id: 1, mode: "Strict"}
    
    API->>DB: Verify class exists & teacher owns it
    API->>API: Generate UUID session_id
    API->>API: Set threshold (Strict=80%, Activity=55%)
    API->>DB: INSERT session (status=ACTIVE)
    API->>DB: Query all enrolled students for class
    
    loop For each enrolled student
        API->>DB: INSERT attendance_record<br/>(student_id, session_id, status=Absent)
    end
    
    API-->>T: {session_id, threshold_percent, enrolled_count}
```

**What happens internally:**
1. Validates the teacher owns the class
2. Creates a UUID for the session
3. Sets the attendance threshold based on mode:
   - **Strict mode** → student must be present for **80%** of class duration
   - **Activity mode** → student must be present for **55%** of class duration
4. Creates an `attendance_record` for **every enrolled student** with `status=Absent` (default)

### 7.2 During a Session (Face Recognition — Not Yet Implemented)

> This is where the face recognition module will plug in later. It will:
> - Process camera frames
> - Identify students
> - INSERT `attendance_logs` with `event_type=ENTRY` or `EXIT` and a timestamp
>
> For now, you can manually insert attendance_logs for testing, or they'll remain empty.

### 7.3 Ending a Session

```mermaid
sequenceDiagram
    participant T as Teacher
    participant API as Session Route
    participant Engine as Attendance Engine
    participant DB as SQLite
    participant Push as Expo Push

    T->>API: POST /api/session/end<br/>{session_id: "uuid..."}
    
    API->>DB: Set session.end_time = now
    API->>Engine: calculate_all(session_id)
    
    Engine->>DB: Fetch session details (mode, threshold, times)
    Engine->>DB: Fetch all enrolled students
    
    loop For each student
        Engine->>DB: Fetch attendance_logs (ENTRY/EXIT pairs)
        Engine->>Engine: Pair ENTRY→EXIT, sum durations
        Engine->>Engine: Compare total vs threshold
        Engine->>DB: UPDATE attendance_record (status, duration)
    end
    
    Engine-->>API: {present: 38, absent: 4, total: 42}
    
    API->>DB: UPDATE session (status=CLOSED)
    
    loop For each absent student
        API->>Push: Send "Attendance Alert" via Expo Push API
    end
    
    API-->>T: {session_id, summary: {present, absent, total}}
```

---

## 8. Attendance Calculation Engine

This is the brain of the system — `services/attendance_engine.py`.

### How Duration is Calculated

```mermaid
flowchart TD
    A["Fetch all attendance_logs\nfor student+session\nORDER BY timestamp ASC"] --> B{Any logs?}
    B -->|No| Z["total_duration = 0\nstatus = Absent"]
    B -->|Yes| C["Walk through logs sequentially"]
    
    C --> D{Event type?}
    D -->|ENTRY| E["Record entry_time"]
    D -->|EXIT| F{Have pending entry_time?}
    F -->|Yes| G["duration += exit_time - entry_time\nClear entry_time"]
    F -->|No| H["Skip (orphan EXIT)"]
    G --> I{More logs?}
    H --> I
    E --> I
    I -->|Yes| D
    I -->|No| J{Unclosed ENTRY?}
    
    J -->|Yes| K["duration += session.end_time - entry_time"]
    J -->|No| L["Final total_duration ready"]
    K --> L
    
    L --> M["threshold_seconds = threshold% × session_duration"]
    M --> N{total_duration ≥ threshold_seconds?}
    N -->|Yes| P["status = Present ✅"]
    N -->|No| Q["status = Absent ❌"]
```

### Example Calculation

```
Session: 10:00 AM → 11:00 AM (60 min = 3600 sec)
Mode: Strict (threshold = 80% = 2880 sec)

Student logs:
  10:02 ENTRY
  10:30 EXIT    → 28 min = 1680 sec
  10:35 ENTRY
  11:00 EXIT    → 25 min = 1500 sec (closed by session end)

Total: 1680 + 1500 = 3180 sec
Threshold: 2880 sec
3180 ≥ 2880 → ✅ PRESENT
```

---

## 9. Excuse / Waiver Workflow

When a student is marked absent, they can submit an excuse. Admins review and approve/reject.

```mermaid
sequenceDiagram
    participant S as Student
    participant API as Excuse Route
    participant DB as SQLite
    participant A as Admin
    participant Push as Expo Push

    Note over S: Student sees they're "Absent"

    S->>API: POST /api/excuse/submit<br/>{session_id, reason}
    API->>DB: Verify student was Absent for this session
    API->>DB: Check no duplicate excuse exists
    API->>DB: INSERT waiver_request (status=Pending)
    API->>DB: INSERT notification for each admin user
    API->>Push: Send "New Excuse Request" to admin devices
    API-->>S: {request_id, message}

    Note over A: Admin sees pending excuses

    A->>API: GET /api/excuse/pending
    API->>DB: Fetch all waivers WHERE status=Pending
    API-->>A: List with student name, class, reason

    A->>API: PUT /api/excuse/decide/1<br/>{decision: "Approved"}
    API->>DB: UPDATE waiver_request (status=Approved)
    
    alt Decision = Approved
        API->>DB: UPDATE attendance_record → status=Present
    end
    
    API->>DB: INSERT notification for student
    API->>Push: Send "Excuse Approved" to student device
    API-->>A: {message, decision}
```

**Key rules:**
- Students can **only** submit excuses for sessions where they are `Absent`
- **One excuse per session** — duplicates return 409
- Approving an excuse **changes attendance to Present**
- Both student and admin get notifications at each step

---

## 10. Notifications System

Two notification channels work in parallel:

### In-App Notifications (SQLite `notifications` table)
- Stored in the database
- Retrieved via `GET /api/admin/notifications` or `GET /api/student/notifications`
- **Marked as read on fetch** — once you GET them, `is_read` flips to `true`

### Expo Push Notifications
- Sent to device via Expo push token stored on the user
- Real-time push to mobile devices
- **Best-effort** — if push fails, the API doesn't crash

| Event | Who Gets Notified | Notification Type |
|-------|-------------------|-------------------|
| Session ends, student absent | Student (Expo push + in-app) | "Attendance Alert" |
| Student submits excuse | All admins (Expo push + in-app) | "New Excuse Request" |
| Admin approves excuse | Student (Expo push + in-app) | "Excuse Approved" |
| Admin rejects excuse | Student (Expo push + in-app) | "Excuse Rejected" |

---

## 11. Complete Request Lifecycle

Here's what happens for **every single API request**, start to finish:

```mermaid
flowchart TD
    A["Client sends HTTP request"] --> B["Flask receives request"]
    B --> C["CORS middleware checks origin"]
    C --> D{"Route has @require_role?"}
    
    D -->|No auth needed| H["Route handler executes"]
    D -->|Yes| E["Extract Bearer token from header"]
    
    E --> F{"Token present?"}
    F -->|No| X1["401: Token missing"]
    F -->|Yes| G["Decode JWT (HS256)"]
    
    G --> G1{"JWT valid?"}
    G1 -->|Yes| G2["Set g.current_user"]
    G1 -->|No| X2["401: Invalid token"]
    
    G2 --> G5{"Role ∈ allowed roles?"}
    G5 -->|No| X3["403: Forbidden"]
    G5 -->|Yes| H
    
    H --> I["Validate request body"]
    I --> J{"Valid?"}
    J -->|No| X4["400/422: Validation error"]
    J -->|Yes| K["SQLAlchemy DB operations"]
    
    K --> L["Expo push notifications (try/except)"]
    L --> N["Return JSON response"]
    
    X1 --> Z["Global error handler\nformats JSON error"]
    X2 --> Z
    X3 --> Z
    X4 --> Z

    style X1 fill:#ff6b6b,color:#fff
    style X2 fill:#ff6b6b,color:#fff
    style X3 fill:#ff6b6b,color:#fff
    style X4 fill:#ff6b6b,color:#fff
```

---

## 12. Entity Relationship Overview

```mermaid
erDiagram
    users ||--o| students : "has profile"
    users ||--o{ notifications : "receives"
    users ||--o{ classes : "teaches"
    
    students ||--o{ enrollments : "enrolled in"
    students ||--o{ attendance_logs : "logs"
    students ||--o{ attendance_records : "records"
    students ||--o{ waiver_requests : "submits"
    
    classes ||--o{ enrollments : "has"
    classes ||--o{ sessions : "has"
    
    sessions ||--o{ attendance_logs : "contains"
    sessions ||--o{ attendance_records : "contains"
    sessions ||--o{ waiver_requests : "related to"

    users {
        int id PK
        string fullname
        string email UK
        string password_hash
        string role
        string phone
        string device_token
    }
    
    students {
        int student_id PK
        int user_id FK
        string roll_number UK
        string program
        int year_of_study
    }
    
    classes {
        int class_id PK
        string class_name
        string subject
        string room
        int teacher_id FK
        int duration_minutes
    }
    
    enrollments {
        int enrollment_id PK
        int student_id FK
        int class_id FK
    }
    
    sessions {
        string session_id PK
        int class_id FK
        int teacher_id FK
        string mode
        string status
        float threshold_percent
    }
    
    attendance_logs {
        int log_id PK
        int student_id FK
        string session_id FK
        string event_type
        datetime timestamp
    }
    
    attendance_records {
        int record_id PK
        int student_id FK
        string session_id FK
        float total_duration_seconds
        string status
    }
    
    waiver_requests {
        int request_id PK
        int student_id FK
        string session_id FK
        string reason
        string status
    }
    
    notifications {
        int notif_id PK
        int user_id FK
        string type
        string message
        bool is_read
    }
```

---

## Quick Reference — What Each Role Does First

| Step | Admin | Teacher | Student |
|------|-------|---------|---------|
| 1 | `python seed_admin.py` | — | — |
| 2 | Login → get token | — | — |
| 3 | Register teacher & students | — | — |
| 4 | Create classes | — | — |
| 5 | Enrol students in classes | — | — |
| 6 | — | Login → get token | — |
| 7 | — | Start session | — |
| 8 | — | End session | — |
| 9 | — | View reports | Login → get token |
| 10 | Review excuses | — | View attendance |
| 11 | Approve/reject excuses | — | Submit excuses |
## 14. Admin Panel Authentication Flow
The admin panel uses session-based authentication (cookies) via `Flask-Login`, which is separate from the JWT authentication used by the API routes. 
- When an admin attempts to access `/admin/`, `Flask-Login` checks if there's an active session.
- If unauthenticated, the user is redirected to `/admin/login`.
- The login form validates the user against the `User` table, using the same `bcrypt` password check as the API.
- Upon successful validation and role verification (`is_admin`), a session cookie is issued, granting access to the panel.

## 15. Admin Panel Request Lifecycle
Each request to an admin route (e.g., `/admin/user/`) follows this lifecycle:
1.  **Request Reception:** The request hits the Flask app.
2.  **CSRF Check:** `Flask-WTF` intercepts POST requests to validate the CSRF token.
3.  **Authentication/Authorization:** The `is_accessible()` method on the corresponding model view is triggered. This checks if the user is authenticated via `current_user.is_authenticated` and has the `admin` role via `is_admin(current_user)`.
4.  **Inaccessible Callback:** If `is_accessible()` fails, `inaccessible_callback()` intercepts and redirects the user to the login page.
5.  **View Execution:** If authorized, the `Flask-Admin` base view executes its standard CRUD logic (e.g., querying the DB, rendering templates).

## 16. Admin CRUD Workflow
The admin panel provides CRUD operations mapped to the SQLAlchemy models:
-   **Create:** A form is generated based on the model's columns. Relationships (like `teacher_id` in `Class`) are populated as dropdowns. Passwords for new users are hashed automatically via an `on_model_change` hook.
-   **Read (List & Detail):** Displays paginated records. Sensitive fields like `password_hash` are excluded. Search and filters are applied dynamically to the SQLAlchemy query.
-   **Update:** Similar to Create, utilizing an auto-generated form. Read-only fields are disabled.
-   **Delete:** Records can be deleted (subject to database constraints).

## 17. Admin Authorization Flow
Authorization in the admin panel is governed by custom base views:
-   `SecureModelView`: Provides full CRUD capabilities. It overrides `is_accessible()` to enforce `current_user.is_authenticated` and `is_admin(current_user)`.
-   `ReadOnlyAdminView`: Inherits from `SecureModelView` but disables create, edit, and delete actions. Used for system-generated logs like `AttendanceLog` and `Notification`.
-   `AdminOnlyView`: Used for non-model views like the custom Dashboard. Enforces the same `is_accessible` rules.

## 18. Admin Model Registration Flow
The `init_admin(app)` function in `admin/__init__.py` orchestrates the setup:
1.  Initializes `Flask-WTF` CSRF protection.
2.  Initializes `Flask-Login` for session management.
3.  Instantiates the `Flask-Admin` object with a custom `AdminIndexView` for the dashboard and login routing.
4.  Imports all SQLAlchemy models to prevent circular dependencies.
5.  Imports the customized model views (e.g., `UserAdmin`, `ClassAdmin`).
6.  Registers each view with the `Admin` instance via `admin.add_view()`.

## 19. Admin Database Interaction Flow
`Flask-Admin` integrates tightly with `SQLAlchemy`. The view classes (e.g., `UserAdmin`) are instantiated with the SQLAlchemy `db.session`. All CRUD operations initiated from the UI translate directly into SQLAlchemy commands executed within the context of the active request, ensuring data consistency with the main application. Hooks like `on_model_change` intercept the flow before `db.session.commit()` is called, allowing for custom logic (like hashing passwords or finalizing attendance when an excuse is approved).
