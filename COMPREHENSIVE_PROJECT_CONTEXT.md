# Smart Attendance System - Comprehensive Project Context

## Project Overview

**Project Name:** Smart Attendance System (myTIMeS Direct V2)

**Project Type:** Automated classroom attendance management system with AI-powered face recognition

**Core Concept:** A full-stack mobile application that enables automated classroom attendance tracking using face recognition technology. The system allows teachers to conduct live attendance sessions by scanning students' faces via mobile camera, automatically logging entry/exit events, calculating attendance duration, and determining final attendance status based on configurable thresholds.

**Target Users:**
- **Administrators:** System management, user creation, class scheduling, batch management, reporting
- **Teachers:** Conduct attendance sessions, view class schedules, manage student enrollments, generate reports
- **Students:** View attendance history, submit excuse requests, check analytics, receive notifications

**Deployment Architecture:** Docker containerized backend with React Native mobile frontend, designed for on-premises deployment in educational institutions

---

## Technology Stack

### Frontend (Mobile Application)
- **Framework:** React Native 0.81.5
- **Development Platform:** Expo SDK 54.0.33
- **Navigation:** React Navigation 7.x (Native Stack Navigator)
- **UI Components:** 
  - Lucide React Native 1.17.0 (icons)
  - React Native Safe Area Context 5.6.0
  - React Native Screens 4.16.0
  - React Native SVG 15.12.1
- **Camera & Image Processing:**
  - Expo Camera 17.0.10 (live camera feed)
  - Expo Image Manipulator 14.0.8 (image preprocessing)
  - Expo Image Picker 17.0.11 (photo selection)
- **State Management:** React Context API (AuthContext)
- **API Communication:** Native fetch API with centralized endpoint configuration

### Backend (REST API)
- **Framework:** Flask 3.0 (Python web framework)
- **ORM:** SQLAlchemy 2.0 with Flask-SQLAlchemy
- **Database:** SQLite (local file-based database)
- **Authentication:**
  - JWT (PyJWT) for API authentication
  - bcrypt for password hashing
- **Push Notifications:** Expo Push Notifications
- **CORS:** Flask-CORS for cross-origin requests
- **Admin Panel:** Flask-Admin with CSRF protection
- **Production Server:** Gunicorn WSGI server with multiple workers
- **Containerization:** Docker multi-stage builds

### AI/ML Components (Face Recognition)
- **Face Detection:** MTCNN (Multi-task Cascaded Convolutional Networks)
- **Face Recognition:** DeepFace library with FaceNet model
- **Embedding Generation:** 128-dimensional face embeddings using FaceNet
- **Similarity Metric:** Cosine distance (threshold: 0.40)
- **Image Processing:** OpenCV (opencv-python-headless) for image manipulation
- **Preprocessing:** Histogram equalization, noise reduction, face alignment
- **Model Storage:** NumPy arrays (.npy files) for face embeddings

### Database
- **Type:** SQLite (file-based relational database)
- **Location:** `Backend Sajak/backend/backend/database/attendance.db`
- **ORM:** SQLAlchemy with declarative models
- **Migration Strategy:** Automatic table creation on startup (db.create_all)
- **Backup Strategy:** Volume-mounted in Docker for persistence

### DevOps & Infrastructure
- **Containerization:** Docker with docker-compose orchestration
- **Volume Mounting:** Database and face embeddings persisted outside container
- **Environment Management:** Python-dotenv for configuration
- **Health Checks:** Built-in health endpoints
- **Logging:** Structured Python logging with multiple levels

---

## Project Structure

### Root Directory Structure
```
Project_Capstone_New/
├── docker-compose.yml              # Docker orchestration configuration
├── .env                           # Root environment variables
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore patterns
├── PROJECT_CONTEXT.md             # Existing project context (legacy)
├── package.json                   # Root package dependencies
├── node_modules/                  # Root node dependencies
├── venv/                          # Python virtual environment
├── _archive/                      # Archived files and old implementations
├── AttendanceApp/                 # React Native frontend application
└── Backend Sajak/                 # Flask backend application
```

### Frontend Structure (AttendanceApp/)
```
AttendanceApp/
├── App.js                         # Main navigation container with screen routing
├── api.js                         # Centralized API endpoint configuration
├── app.json                       # Expo application configuration
├── package.json                   # Frontend dependencies
├── index.js                       # Application entry point
├── .env                           # Frontend environment variables
├── assets/                        # Static assets (images, fonts)
├── components/                    # Reusable UI components
│   ├── AdminBottomNav.js         # Admin navigation (5 tabs)
│   ├── BottomNav.js              # Student navigation
│   └── TeacherBottomNav.js       # Teacher navigation
├── context/                       # React Context providers
│   └── AuthContext.js             # Authentication state management
└── screens/                       # Screen components (22 screens)
    ├── LoginScreen.js             # User authentication
    ├── HomeScreen.js              # Student home dashboard
    ├── ProfileScreen.js           # User profile management
    ├── AttendanceHistoryScreen.js # Student attendance history
    ├── ClassesScreen.js           # Student class list
    ├── SubmitWaiverScreen.js      # Excuse request submission
    ├── WaiverStatusScreen.js      # Excuse request status
    ├── StudentAnalyticsScreen.js  # Attendance analytics
    ├── AdminDashboardScreen.js    # Admin main dashboard
    ├── AdminWaiversScreen.js      # Admin waiver management
    ├── AdminSettingsScreen.js     # Admin system settings
    ├── ManageSchedulesScreen.js   # Class scheduling management
    ├── AddStudentFaceScreen.js    # Face enrollment interface
    ├── ManageBatchesScreen.js     # Batch management
    ├── ManageBatchDetailScreen.js # Batch detail management
    ├── SendAlertsScreen.js        # Notification sending
    ├── ExportReportsScreen.js     # Report generation
    ├── TeacherDashboardScreen.js  # Teacher dashboard
    ├── TeacherClassesScreen.js    # Teacher class management
    ├── StartClassScreen.js        # Live attendance scanning
    ├── TeacherReportsScreen.js    # Teacher reporting
    └── TeacherProfileScreen.js    # Teacher profile
```

### Backend Structure (Backend Sajak/backend/backend/)
```
backend/
├── app.py                         # Flask application factory
├── config.py                      # Configuration management
├── database.py                    # SQLAlchemy instance initialization
├── requirements.txt               # Python dependencies
├── Dockerfile                     # Docker image configuration
├── .env                           # Backend environment variables
├── .env.example                   # Environment variable template
├── seed_admin.py                  # Admin user seeding script
├── health.py                      # Health check endpoints
├── ADMIN_GUIDE.md                 # Admin panel documentation
├── README.md                      # Backend documentation
├── Endpoints.md                   # API endpoint documentation
├── PROJECT_FLOW.md                # System flow documentation
├── admin/                         # Flask-Admin panel
│   └── __init__.py               # Admin panel initialization with CSRF
├── models/                        # SQLAlchemy ORM models
│   ├── __init__.py               # Model exports
│   ├── user.py                   # User authentication model
│   ├── student.py                # Student profile model
│   ├── class_model.py            # Class and Enrollment models
│   ├── session.py                # Attendance session model
│   ├── attendance.py             # AttendanceLog and AttendanceRecord models
│   ├── excuse.py                 # WaiverRequest model
│   ├── notification.py           # Notification model
│   ├── batch.py                  # Batch and BatchStudent models
│   └── batch_class_link.py       # Batch-Class relationship model
├── routes/                        # API route blueprints
│   ├── __init__.py               # Blueprint exports
│   ├── auth.py                   # Authentication endpoints
│   ├── session.py                # Session management endpoints
│   ├── attendance.py             # Attendance tracking endpoints
│   ├── excuse.py                 # Excuse request endpoints
│   ├── student.py                # Student management endpoints
│   ├── admin.py                  # Admin management endpoints
│   └── batch.py                  # Batch management endpoints
├── services/                      # Business logic services
│   ├── __init__.py
│   ├── attendance_engine.py      # Attendance calculation engine
│   ├── notifications.py          # Push notification service
│   └── face_recognition/         # Face recognition pipeline
│       ├── __init__.py          # Face recognition service initialization
│       ├── recognizer.py        # Face recognition using DeepFace
│       ├── detector.py          # MTCNN face detection
│       ├── preprocess.py        # Image preprocessing
│       ├── enroll.py            # Face enrollment from images
│       ├── validate_embeddings.py # Embedding validation
│       └── embeddings/          # Face embedding storage
│           ├── labels.json      # Student label mapping
│           └── *.npy           # Individual student embeddings
├── middleware/                    # Custom middleware
│   ├── __init__.py
│   └── auth_middleware.py       # JWT authentication & RBAC
├── templates/                     # Flask templates (if any)
├── tests/                         # Test suite
│   ├── test_face_enrollment.py
│   ├── test_scan_attendance.py
│   ├── test_batch_enrollment.py
│   └── test_schedule_enforcement.py
├── database/                      # Database storage (volume mounted)
│   └── attendance.db             # SQLite database file
├── instance/                      # Flask instance folder
└── venv/                          # Python virtual environment
```

---

## Database Schema

### Database Overview
- **Type:** SQLite relational database
- **File:** `attendance.db`
- **ORM:** SQLAlchemy with declarative models
- **Relationships:** Foreign key relationships with cascade options
- **Constraints:** Unique constraints for data integrity

### Core Tables

#### 1. users
**Purpose:** Stores authentication and profile information for all user types

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | Integer | PRIMARY KEY, AUTOINCREMENT | Unique user identifier |
| fullname | String(150) | NOT NULL | User's full name |
| email | String(255) | UNIQUE, NOT NULL | User's email address (login credential) |
| password_hash | String(255) | NOT NULL | Bcrypt-hashed password |
| role | String(20) | NOT NULL | User role: 'admin', 'teacher', or 'student' |
| phone | String(30) | NULLABLE | Contact phone number |
| device_token | String(512) | NULLABLE | FCM/Expo push notification token |
| created_at | DateTime | NOT NULL, DEFAULT UTC | Account creation timestamp |

**Relationships:**
- One-to-one with Student (student_profile)
- One-to-many with Notification (notifications)
- One-to-many with Class (teacher_id foreign key)
- One-to-many with Session (teacher_id foreign key)

#### 2. students
**Purpose:** Extended profile for student users with academic information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| student_id | Integer | PRIMARY KEY, AUTOINCREMENT | Unique student identifier |
| user_id | Integer | FOREIGN KEY→users.id, UNIQUE, NOT NULL | Link to user account |
| roll_number | String(50) | UNIQUE, NOT NULL | Academic roll number |
| program | String(100) | NOT NULL | Academic program (e.g., BCA, BBA) |
| year_of_study | Integer | NULLABLE | Current year of study |
| face_label | String(50) | UNIQUE, NULLABLE | Face recognition identifier (matches embedding key) |

**Relationships:**
- Many-to-one with User (user)
- One-to-many with Enrollment (enrollments)
- One-to-many with AttendanceLog (attendance_logs)
- One-to-many with AttendanceRecord (attendance_records)
- One-to-many with WaiverRequest (waiver_requests)
- One-to-many with BatchStudent (batches)

**Critical Invariant:** `face_label` must match the embedding filename key (e.g., roll_number) for face recognition to work correctly.

#### 3. classes
**Purpose:** Represents academic classes/courses with scheduling information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| class_id | Integer | PRIMARY KEY, AUTOINCREMENT | Unique class identifier |
| class_name | String(150) | NOT NULL | Class code or name (e.g., "CS101") |
| subject | String(150) | NOT NULL | Subject name (e.g., "Data Structures") |
| room | String(50) | NULLABLE | Classroom location |
| teacher_id | Integer | FOREIGN KEY→users.id, NULLABLE | Assigned teacher |
| schedule_time | DateTime | NULLABLE | Legacy combined datetime field |
| duration_minutes | Integer | NOT NULL | Class duration in minutes |
| scheduled_date | Date | NULLABLE | New: Date of class (YYYY-MM-DD) |
| scheduled_time | Time | NULLABLE | New: Start time (HH:MM) |
| scheduled_end_time | Time | NULLABLE | New: End time (HH:MM) |

**Relationships:**
- Many-to-one with User (teacher)
- One-to-many with Enrollment (enrollments)
- One-to-many with Session (sessions)

**Scheduling Logic:** Uses `scheduled_date`, `scheduled_time`, and `scheduled_end_time` for schedule enforcement. Legacy `schedule_time` field maintained for backward compatibility.

#### 4. enrollments
**Purpose:** Many-to-many relationship between students and classes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| enrollment_id | Integer | PRIMARY KEY, AUTOINCREMENT | Unique enrollment identifier |
| student_id | Integer | FOREIGN KEY→students.student_id, NOT NULL | Enrolled student |
| class_id | Integer | FOREIGN KEY→classes.class_id, NOT NULL | Enrolled class |
| enrolled_at | DateTime | NOT NULL, DEFAULT UTC | Enrollment timestamp |

**Constraints:**
- UNIQUE(student_id, class_id) - prevents duplicate enrollments

**Relationships:**
- Many-to-one with Student (student)
- Many-to-one with Class (class_)

**Business Rule:** Only enrolled students can have attendance logged for a class session.

#### 5. sessions
**Purpose:** Represents individual attendance sessions (live or closed)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| session_id | String(36) | PRIMARY KEY | UUID identifier |
| class_id | Integer | FOREIGN KEY→classes.class_id, NOT NULL | Associated class |
| teacher_id | Integer | FOREIGN KEY→users.id, NOT NULL | Conducting teacher |
| mode | String(20) | NOT NULL | Attendance mode: 'Strict' or 'Activity' |
| start_time | DateTime | NOT NULL | Session start timestamp (UTC naive) |
| end_time | DateTime | NULLABLE | Session end timestamp (UTC naive) |
| status | String(10) | NOT NULL, DEFAULT 'ACTIVE' | Session status: 'ACTIVE' or 'CLOSED' |
| threshold_percent | Float | NULLABLE | Attendance threshold (decimal fraction, e.g., 0.80) |

**Relationships:**
- Many-to-one with Class (class_)
- Many-to-one with User (teacher)
- One-to-many with AttendanceLog (attendance_logs)
- One-to-many with AttendanceRecord (attendance_records)

**Threshold Logic:**
- Strict mode: typically 0.80 (80% attendance required)
- Activity mode: typically 0.55 (55% attendance required)
- Stored as decimal fraction, not percentage

#### 6. attendance_logs
**Purpose:** Individual entry/exit events captured during sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| log_id | Integer | PRIMARY KEY, AUTOINCREMENT | Unique log identifier |
| student_id | Integer | FOREIGN KEY→students.student_id, NOT NULL | Student who entered/exited |
| session_id | String(36) | FOREIGN KEY→sessions.session_id, NOT NULL | Associated session |
| event_type | String(10) | NOT NULL | Event type: 'ENTRY' or 'EXIT' |
| timestamp | DateTime | NOT NULL | Event timestamp (UTC naive) |
| confidence_score | Float | NULLABLE | Face recognition confidence (0-100) |

**Relationships:**
- Many-to-one with Student (student)
- Many-to-one with Session (session)

**Business Logic:** Logs are paired chronologically (ENTRY→EXIT) to calculate total attendance duration. Unpaired ENTRY events are closed at session end_time.

#### 7. attendance_records
**Purpose:** Finalized attendance summary per student per session

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| record_id | Integer | PRIMARY KEY, AUTOINCREMENT | Unique record identifier |
| student_id | Integer | FOREIGN KEY→students.student_id, NOT NULL | Student |
| session_id | String(36) | FOREIGN KEY→sessions.session_id, NOT NULL | Session |
| total_duration_seconds | Float | DEFAULT 0 | Total time present in seconds |
| threshold_required | Float | NULLABLE | Required seconds for Present status |
| status | String(10) | NOT NULL, DEFAULT 'Absent' | Final status: 'Present', 'Absent', or 'Partial' |
| finalized_at | DateTime | NULLABLE | When record was finalized (UTC naive) |

**Constraints:**
- UNIQUE(student_id, session_id) - one record per student per session

**Relationships:**
- Many-to-one with Student (student)
- Many-to-one with Session (session)

**Calculation Logic:** Status determined by comparing `total_duration_seconds` with `threshold_required` (threshold_percent × session_duration).

#### 8. batches
**Purpose:** Groups students for bulk class enrollment

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| batch_id | Integer | PRIMARY KEY, AUTOINCREMENT | Unique batch identifier |
| batch_name | String(150) | NOT NULL | Batch name |
| description | String(500) | NULLABLE | Batch description |
| created_at | DateTime | NOT NULL, DEFAULT UTC | Creation timestamp |

**Relationships:**
- One-to-many with BatchStudent (batch_students)
- One-to-many with BatchClassLink (batch_class_links)

**Business Rule:** Batches are templates for enrollment - deleting a batch does not affect existing enrollments.

#### 9. batch_students
**Purpose:** Many-to-many relationship between batches and students

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| batch_id | Integer | FOREIGN KEY→batches.batch_id, PRIMARY KEY | Batch |
| student_id | Integer | FOREIGN KEY→students.student_id, PRIMARY KEY | Student |
| added_at | DateTime | NOT NULL, DEFAULT UTC | When student was added to batch |

**Constraints:**
- Composite PRIMARY KEY (batch_id, student_id)

**Relationships:**
- Many-to-one with Batch (batch)
- Many-to-one with Student (student)

#### 10. batch_class_links
**Purpose:** Tracks which batches have been enrolled in which classes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| batch_id | Integer | FOREIGN KEY→batches.batch_id, PRIMARY KEY | Batch |
| class_id | Integer | FOREIGN KEY→classes.class_id, PRIMARY KEY | Class |
| enrolled_at | DateTime | NOT NULL, DEFAULT UTC | When batch was enrolled in class |

**Constraints:**
- Composite PRIMARY KEY (batch_id, class_id)

**Business Rule:** Enables tracking of bulk enrollment operations for audit purposes.

#### 11. waiver_requests
**Purpose:** Student excuse requests for absence

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| request_id | Integer | PRIMARY KEY, AUTOINCREMENT | Unique request identifier |
| student_id | Integer | FOREIGN KEY→students.student_id, NOT NULL | Requesting student |
| session_id | String(36) | FOREIGN KEY→sessions.session_id, NOT NULL | Session for excuse |
| reason | String(500) | NOT NULL | Excuse reason |
| status | String(20) | NOT NULL, DEFAULT 'pending' | Status: 'pending', 'approved', 'rejected' |
| submitted_at | DateTime | NOT NULL, DEFAULT UTC | Submission timestamp |
| decided_at | DateTime | NULLABLE | Decision timestamp |
| decided_by | Integer | FOREIGN KEY→users.id, NULLABLE | Admin who decided |

**Relationships:**
- Many-to-one with Student (student)
- Many-to-one with Session (session)
- Many-to-one with User (decided_by)

#### 12. notifications
**Purpose:** User notifications for various system events

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| notification_id | Integer | PRIMARY KEY, AUTOINCREMENT | Unique notification identifier |
| user_id | Integer | FOREIGN KEY→users.id, NOT NULL | Recipient user |
| message | String(500) | NOT NULL | Notification message |
| type | String(50) | NOT NULL | Notification type |
| read | Boolean | DEFAULT False | Read status |
| created_at | DateTime | NOT NULL, DEFAULT UTC | Creation timestamp |

**Relationships:**
- Many-to-one with User (user)

---

## API Endpoints

### Authentication Endpoints (/api/auth)

#### POST /api/auth/login
**Purpose:** Authenticate user and return JWT token
**Access:** Public
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "role": "teacher",
  "user_id": 1,
  "fullname": "John Doe"
}
```

#### POST /api/auth/register
**Purpose:** Register new user (admin only)
**Access:** Admin
**Request Body:**
```json
{
  "fullname": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "role": "student",
  "phone": "+977-9800000000",
  "roll_number": "BCA-2024-001",
  "program": "BCA",
  "year_of_study": 2,
  "face_label": "BCA-2024-001"
}
```
**Response (201):**
```json
{
  "user_id": 5,
  "message": "User registered"
}
```

#### GET /api/auth/me
**Purpose:** Get current user profile
**Access:** Any authenticated user
**Headers:** `Authorization: Bearer <token>`
**Response (200):**
```json
{
  "id": 1,
  "fullname": "John Doe",
  "email": "john@example.com",
  "role": "teacher",
  "phone": "+977-9800000000",
  "device_token": "ExponentPushToken[...]",
  "created_at": "2026-01-01T00:00:00Z",
  "student_profile": {
    "student_id": 1,
    "roll_number": "BCA-2024-001",
    "program": "BCA",
    "year_of_study": 2
  }
}
```

#### POST /api/auth/device-token
**Purpose:** Register Expo push token for notifications
**Access:** Any authenticated user
**Request Body:**
```json
{
  "device_token": "ExponentPushToken[...]"
}
```
**Response (200):**
```json
{
  "message": "Device token saved"
}
```

### Session Endpoints (/api/session)

#### GET /api/session/classes
**Purpose:** Get all classes assigned to current teacher
**Access:** Teacher
**Response (200):**
```json
[
  {
    "class_id": 1,
    "class_name": "CS101",
    "subject": "Data Structures",
    "room": "Room 101",
    "teacher_id": 1,
    "teacher_name": "John Doe",
    "schedule_time": "2026-06-21T09:00:00Z",
    "duration_minutes": 90,
    "scheduled_date": "2026-06-21",
    "scheduled_time": "09:00:00",
    "scheduled_end_time": "10:30:00",
    "students_count": 42,
    "active_session_id": "uuid-...",
    "schedule_status": "ready"
  }
]
```

**Schedule Status Values:**
- `"ongoing"` - Active session exists
- `"unscheduled"` - No scheduled_date set
- `"future_date"` - Scheduled for future date
- `"not_started"` - Today but before open window
- `"ready"` - Today, within open window (start button enabled)
- `"ended"` - Time has passed
- `"ended_today"` - Today, past scheduled_end_time

#### POST /api/session/start
**Purpose:** Start a new attendance session
**Access:** Teacher
**Request Body:**
```json
{
  "class_id": 1,
  "mode": "Strict",
  "start_time": "2026-06-21T09:00:00Z"
}
```
**Response (200):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "threshold_percent": 0.8,
  "enrolled_count": 42,
  "enrolled_students": [
    {
      "student_id": 1,
      "roll_number": "BCA-2024-001",
      "fullname": "Jane Smith",
      "program": "BCA"
    }
  ]
}
```

**Schedule Enforcement:**
- If `scheduled_date` is set, teacher can only start:
  - On the scheduled date (in server timezone)
  - Within 15 minutes before scheduled_time
  - Before scheduled_end_time (if set)
- Classes without `scheduled_date` are unrestricted

#### POST /api/session/end
**Purpose:** End active session and finalize attendance
**Access:** Teacher
**Request Body:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```
**Response (200):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "summary": {
    "present": 38,
    "absent": 4,
    "total": 42
  }
}
```

**Side Effects:**
- Calculates final attendance for all enrolled students
- Sends push notifications to absent students
- Syncs results to Firebase Realtime Database

#### GET /api/session/status/<session_id>
**Purpose:** Get session details and current attendance summary
**Access:** Teacher, Admin
**Response (200):**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ACTIVE",
  "mode": "Strict",
  "class_id": 1,
  "class_name": "Data Structures",
  "start_time": "2026-06-21T09:00:00Z",
  "end_time": null,
  "liveCount": 15,
  "present_count": 15,
  "absent_count": 27,
  "total": 42,
  "enrolled_students": [
    {
      "student_id": 1,
      "roll_number": "BCA-2024-001",
      "fullname": "Jane Smith",
      "attendance_status": "Present"
    }
  ]
}
```

#### GET /api/session/my-sessions
**Purpose:** Get active or upcoming classes for current teacher
**Access:** Teacher
**Response (200):**
```json
[
  {
    "id": "1",
    "class_id": 1,
    "subject": "Data Structures",
    "code": "CS101",
    "dept": "Room 101",
    "time": "09:00 AM - 10:30 AM",
    "room": "Room 101",
    "students": 42,
    "status": "ongoing",
    "month": "JUN",
    "day": "21",
    "session_id": "uuid-...",
    "schedule_status": "ongoing",
    "scheduled_date": "2026-06-21",
    "scheduled_time": "09:00:00",
    "scheduled_end_time": "10:30:00",
    "color": "#2952e3",
    "iconColor": "#7c3aed"
  }
]
```

### Attendance Endpoints (/api/attendance)

#### POST /api/attendance/scan
**Purpose:** Scan student face and log attendance
**Access:** Teacher, Admin
**Content-Type:** multipart/form-data
**Form Data:**
- `session_id` (string, required)
- `image` (file, required) - JPEG/PNG frame from camera

**Response (200):**
```json
{
  "status": "recognized",
  "student_id": 1,
  "student_name": "Jane Smith",
  "event": "ENTRY",
  "confidence": 85.5,
  "message": "Jane Smith — ENTRY logged"
}
```

**Status Values:**
- `"recognized"` - Face identified and attendance logged
- `"unknown"` - Face detected but not recognized
- `"no_face"` - No face detected in image
- `"cooldown"` - Student logged recently (within cooldown period)
- `"not_enrolled"` - Student recognized but not enrolled in this class
- `"error"` - Processing error

**Business Logic:**
- Enforces cooldown period (default 15 seconds) to prevent duplicate logs
- Checks enrollment before logging attendance
- Toggles ENTRY/EXIT based on last event
- Syncs to Firebase in background thread

#### POST /api/attendance/log
**Purpose:** Manual entry/exit logging (student self-service)
**Access:** Student
**Request Body:**
```json
{
  "session_id": "uuid-...",
  "event_type": "ENTRY"
}
```
**Response (201):**
```json
{
  "message": "Attendance ENTRY logged"
}
```

#### GET /api/attendance/history
**Purpose:** Get attendance history for current student
**Access:** Student
**Response (200):**
```json
[
  {
    "session_id": "uuid-...",
    "class_name": "Data Structures",
    "date": "2026-06-21T09:00:00Z",
    "status": "Present",
    "total_duration_seconds": 5400,
    "logs": [
      {
        "event_type": "ENTRY",
        "timestamp": "2026-06-21T09:05:00Z"
      },
      {
        "event_type": "EXIT",
        "timestamp": "2026-06-21T10:30:00Z"
      }
    ]
  }
]
```

#### GET /api/attendance/history/<student_id>
**Purpose:** Get attendance history for specific student
**Access:** Student (own only), Admin
**Response:** Same as /history above

#### GET /api/attendance/report/<class_id>
**Purpose:** Generate class attendance report
**Access:** Teacher, Admin
**Response (200):**
```json
{
  "class_name": "Data Structures",
  "class_id": 1,
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
  "generated_at": "2026-06-21T10:30:00Z"
}
```

#### PUT /api/attendance/manual-override
**Purpose:** Manually override attendance status
**Access:** Admin
**Request Body:**
```json
{
  "student_id": 1,
  "session_id": "uuid-...",
  "status": "Present"
}
```
**Response (200):**
```json
{
  "message": "Attendance updated"
}
```

#### GET /api/attendance/analytics
**Purpose:** Get attendance analytics
**Access:** Student, Admin, Teacher
**Query Parameters:**
- `student_id` (optional) - For admin/teacher to view specific student

**Response (200) - Individual Student:**
```json
{
  "student_id": 1,
  "name": "Jane Smith",
  "total": 15,
  "present": 12,
  "absent": 3,
  "late": 0,
  "percentage": 80.0,
  "classes": [
    {
      "id": "1",
      "course": "Data Structures",
      "attendance": 85,
      "present": 12,
      "absent": 2,
      "waivers": 0,
      "risk": "Low"
    }
  ]
}
```

**Response (200) - All Students (Admin):**
```json
[
  {
    "id": "BCA-2024-001",
    "student_id": 1,
    "name": "Jane Smith",
    "course": "General",
    "attendance": 80,
    "present": 12,
    "absent": 3,
    "waivers": 0,
    "risk": "Mid",
    "initials": "JS"
  }
]
```

### Admin Endpoints (/api/admin)

#### POST /api/admin/class/create
**Purpose:** Create a new class
**Access:** Admin
**Request Body:**
```json
{
  "class_name": "CS101",
  "subject": "Data Structures",
  "room": "Room 101",
  "teacher_id": 1,
  "duration_minutes": 90,
  "batch_id": 1,
  "scheduled_date": "2026-06-21",
  "scheduled_time": "09:00",
  "scheduled_end_time": "10:30"
}
```
**Response (201):**
```json
{
  "class_id": 1,
  "message": "Class created successfully"
}
```

#### GET /api/admin/class/list
**Purpose:** List all classes
**Access:** Admin, Teacher
**Response (200):**
```json
[
  {
    "class_id": 1,
    "class_name": "CS101",
    "subject": "Data Structures",
    "room": "Room 101",
    "teacher_id": 1,
    "teacher_name": "John Doe",
    "duration_minutes": 90,
    "students_count": 42
  }
]
```

#### PUT /api/admin/class/<id>
**Purpose:** Update class details
**Access:** Admin
**Request Body:** Same as create
**Response (200):**
```json
{
  "message": "Class updated successfully"
}
```

#### DELETE /api/admin/class/<id>
**Purpose:** Delete a class
**Access:** Admin
**Constraint:** Cannot delete classes with active sessions
**Response (200):**
```json
{
  "message": "Class deleted successfully"
}
```

#### PUT /api/admin/class/<id>/schedule
**Purpose:** Set or update class schedule
**Access:** Admin
**Request Body:**
```json
{
  "scheduled_date": "2026-06-21",
  "scheduled_time": "09:00",
  "scheduled_end_time": "10:30"
}
```
**Response (200):**
```json
{
  "message": "Schedule updated successfully"
}
```

#### POST /api/admin/classes/<id>/enroll-batch
**Purpose:** Bulk enroll all students from a batch into a class
**Access:** Admin
**Request Body:**
```json
{
  "batch_id": 1
}
```
**Response (200):**
```json
{
  "message": "Batch enrolled successfully",
  "enrolled_count": 42
}
```

#### POST /api/admin/batches
**Purpose:** Create a new batch
**Access:** Admin
**Request Body:**
```json
{
  "batch_name": "BCA 2024 Batch A",
  "description": "First year BCA students"
}
```
**Response (201):**
```json
{
  "batch_id": 1,
  "message": "Batch created successfully"
}
```

#### GET /api/admin/batches
**Purpose:** List all batches
**Access:** Admin
**Response (200):**
```json
[
  {
    "batch_id": 1,
    "batch_name": "BCA 2024 Batch A",
    "description": "First year BCA students",
    "created_at": "2026-01-01T00:00:00Z",
    "student_count": 42
  }
]
```

#### GET /api/admin/batches/<id>
**Purpose:** Get batch details with students
**Access:** Admin
**Response (200):**
```json
{
  "batch_id": 1,
  "batch_name": "BCA 2024 Batch A",
  "description": "First year BCA students",
  "created_at": "2026-01-01T00:00:00Z",
  "student_count": 42,
  "students": [
    {
      "student_id": 1,
      "roll_number": "BCA-2024-001",
      "fullname": "Jane Smith",
      "program": "BCA"
    }
  ]
}
```

#### PUT /api/admin/batches/<id>
**Purpose:** Update batch details
**Access:** Admin
**Request Body:**
```json
{
  "batch_name": "BCA 2024 Batch A (Updated)",
  "description": "Updated description"
}
```
**Response (200):**
```json
{
  "message": "Batch updated successfully"
}
```

#### DELETE /api/admin/batches/<id>
**Purpose:** Delete a batch
**Access:** Admin
**Important:** Does NOT cascade to enrollments table
**Response (200):**
```json
{
  "message": "Batch deleted successfully"
}
```

#### POST /api/admin/batches/<id>/students
**Purpose:** Add students to a batch
**Access:** Admin
**Request Body:**
```json
{
  "student_ids": [1, 2, 3, 4, 5]
}
```
**Response (200):**
```json
{
  "message": "Students added to batch successfully",
  "added_count": 5
}
```

#### DELETE /api/admin/batches/<id>/students/<student_id>
**Purpose:** Remove student from batch
**Access:** Admin
**Important:** Does NOT remove student from class enrollments
**Response (200):**
```json
{
  "message": "Student removed from batch successfully"
}
```

#### GET /api/admin/users
**Purpose:** List all users
**Access:** Admin
**Query Parameters:**
- `role` (optional) - Filter by role (admin, teacher, student)

**Response (200):**
```json
[
  {
    "id": 1,
    "fullname": "John Doe",
    "email": "john@example.com",
    "role": "teacher",
    "phone": "+977-9800000000",
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

#### GET /api/admin/stats
**Purpose:** Get dashboard statistics
**Access:** Admin
**Response (200):**
```json
{
  "total_users": 150,
  "total_students": 120,
  "total_teachers": 25,
  "total_admins": 5,
  "total_classes": 30,
  "total_sessions": 450,
  "active_sessions": 3
}
```

#### POST /api/admin/enroll-face
**Purpose:** Enroll student face from photos
**Access:** Admin
**Content-Type:** multipart/form-data
**Form Data:**
- `student_id` (integer, required)
- `images` (files, required) - Multiple face photos

**Response (200):**
```json
{
  "message": "Face enrolled successfully",
  "face_label": "BCA-2024-001",
  "images_processed": 5,
  "embedding_saved": true
}
```

### Student Endpoints (/api/student)

#### GET /api/student/list
**Purpose:** List all students
**Access:** Admin, Teacher
**Response (200):**
```json
[
  {
    "student_id": 1,
    "roll_number": "BCA-2024-001",
    "fullname": "Jane Smith",
    "program": "BCA",
    "year_of_study": 2,
    "email": "jane@example.com"
  }
]
```

#### GET /api/student/<id>
**Purpose:** Get student details
**Access:** Admin, Teacher
**Response (200):**
```json
{
  "student_id": 1,
  "roll_number": "BCA-2024-001",
  "fullname": "Jane Smith",
  "program": "BCA",
  "year_of_study": 2,
  "email": "jane@example.com",
  "phone": "+977-9800000000",
  "face_label": "BCA-2024-001"
}
```

### Excuse Endpoints (/api/excuse)

#### POST /api/excuse/submit
**Purpose:** Submit an excuse request
**Access:** Student
**Request Body:**
```json
{
  "session_id": "uuid-...",
  "reason": "Medical emergency"
}
```
**Response (201):**
```json
{
  "request_id": 1,
  "message": "Excuse request submitted"
}
```

#### GET /api/excuse/my-excuses
**Purpose:** Get current student's excuse requests
**Access:** Student
**Response (200):**
```json
[
  {
    "request_id": 1,
    "session_id": "uuid-...",
    "reason": "Medical emergency",
    "status": "pending",
    "submitted_at": "2026-06-21T09:00:00Z",
    "decided_at": null,
    "decided_by": null
  }
]
```

#### GET /api/excuse/pending
**Purpose:** Get all pending excuse requests
**Access:** Admin
**Response (200):**
```json
[
  {
    "request_id": 1,
    "student_id": 1,
    "student_name": "Jane Smith",
    "session_id": "uuid-...",
    "class_name": "Data Structures",
    "reason": "Medical emergency",
    "submitted_at": "2026-06-21T09:00:00Z"
  }
]
```

#### PUT /api/excuse/decide
**Purpose:** Approve or reject excuse request
**Access:** Admin
**Request Body:**
```json
{
  "request_id": 1,
  "decision": "approved"
}
```
**Response (200):**
```json
{
  "message": "Excuse request decided"
}
```

---

## Frontend Architecture

### Navigation Structure
The application uses React Navigation's Native Stack Navigator with role-based routing:

**Main Navigation Stack (App.js):**
1. **LoginScreen** - Entry point for all users
2. **Student Stack** (after login as student):
   - HomeScreen
   - SubmitWaiverScreen
   - AttendanceHistoryScreen
   - ClassesScreen
   - WaiverStatusScreen
   - ProfileScreen
3. **Admin Stack** (after login as admin):
   - AdminDashboardScreen
   - AdminWaiversScreen
   - ManageSchedulesScreen
   - AddStudentFaceScreen
   - StudentAnalyticsScreen
   - AdminSettingsScreen
   - SendAlertsScreen
   - ExportReportsScreen
   - ManageBatchesScreen
   - ManageBatchDetailScreen
4. **Teacher Stack** (after login as teacher):
   - TeacherDashboardScreen
   - TeacherClassesScreen
   - StartClassScreen
   - TeacherReportsScreen
   - TeacherProfileScreen

### Component Architecture

#### Authentication Context (AuthContext.js)
**Purpose:** Global authentication state management
**State:**
- `token` - JWT authentication token
- `user` - Current user object
**Methods:**
- `loginState(token, user)` - Set authentication state
- `logoutState()` - Clear authentication state
**Usage:** Wrapped around entire app in App.js, accessed via `useAuth()` hook

#### Navigation Components
**AdminBottomNav.js:**
- 5 tabs: Home, Waivers, Batches, Reports, Settings
- Role-specific navigation for admin users

**TeacherBottomNav.js:**
- 4 tabs: Dashboard, Classes, Reports, Profile
- Role-specific navigation for teacher users

**BottomNav.js:**
- 5 tabs: Home, Classes, History, Waivers, Profile
- Role-specific navigation for student users

### Screen Components

#### Authentication Screens

**LoginScreen.js:**
- Email/password login form
- JWT token storage in AuthContext
- Role-based navigation after login
- Error handling for invalid credentials

#### Student Screens

**HomeScreen.js:**
- Student dashboard
- Quick stats (attendance percentage, upcoming classes)
- Recent activity summary
- Navigation to other student features

**ProfileScreen.js:**
- Student profile display and editing
- Personal information management
- Academic details (program, year of study)

**AttendanceHistoryScreen.js:**
- Detailed attendance history
- Session-by-session breakdown
- Entry/exit log timestamps
- Duration tracking

**ClassesScreen.js:**
- List of enrolled classes
- Class schedules and details
- Quick access to class-specific information

**SubmitWaiverScreen.js:**
- Excuse request submission form
- Session selection
- Reason input
- Request status tracking

**WaiverStatusScreen.js:**
- Status of submitted excuse requests
- Approval/rejection notifications
- Decision details

**StudentAnalyticsScreen.js:**
- Attendance analytics and statistics
- Per-class attendance breakdown
- Risk assessment (Low/Mid/High)
- Visual charts and graphs

#### Admin Screens

**AdminDashboardScreen.js:**
- System overview statistics
- Quick actions (create user, create class)
- Recent activity feed
- System health indicators

**AdminWaiversScreen.js:**
- Pending excuse request management
- Approval/rejection interface
- Request details view
- Bulk decision capabilities

**ManageSchedulesScreen.js:**
- Class creation and management
- Schedule setting (date, time, duration)
- Teacher assignment
- Batch enrollment integration

**AddStudentFaceScreen.js:**
- Face enrollment interface
- Photo capture/upload
- Face validation feedback
- Enrollment status tracking

**StudentAnalyticsScreen.js:**
- Individual student analytics
- Attendance trends
- Class performance comparison
- Risk identification

**AdminSettingsScreen.js:**
- System configuration
- Threshold settings
- Firebase configuration
- User management

**ManageBatchesScreen.js:**
- Batch creation and management
- Student batch assignment
- Batch enrollment operations
- Batch statistics

**ManageBatchDetailScreen.js:**
- Detailed batch view
- Student list management
- Add/remove students
- Batch enrollment history

**SendAlertsScreen.js:**
- Push notification composition
- Target audience selection
- Message scheduling
- Notification history

**ExportReportsScreen.js:**
- Report generation interface
- Format selection (CSV, PDF)
- Date range filtering
- Report preview

#### Teacher Screens

**TeacherDashboardScreen.js:**
- Teacher-specific dashboard
- Today's schedule overview
- Quick session start
- Recent session summaries

**TeacherClassesScreen.js:**
- Assigned classes list
- Schedule status indicators
- Session management
- Student enrollment view

**StartClassScreen.js:**
- **Critical Component** - Live attendance scanning
- Real-time camera feed using expo-camera
- Face recognition integration
- Entry/exit logging
- Live attendance count
- Session status display
- Error handling and feedback

**TeacherReportsScreen.js:**
- Class attendance reports
- Per-student breakdown
- Attendance trends
- Export capabilities

**TeacherProfileScreen.js:**
- Teacher profile management
- Personal information
- Assigned classes overview

### API Integration

**Centralized API Configuration (api.js):**
```javascript
export const BASE_URL = 'http://10.200.29.220:5000';
export const API = {
  login: `${BASE_URL}/api/auth/login`,
  // ... all other endpoints
};
```

**API Communication Pattern:**
- JWT token stored in AuthContext
- Authorization header: `Bearer <token>`
- Error handling with user-friendly messages
- Loading states and offline handling

**Key Integration Points:**
1. **Authentication:** Login/logout with JWT
2. **Session Management:** Start/end sessions, status polling
3. **Face Scanning:** Real-time image upload to /api/attendance/scan
4. **Data Sync:** Firebase Realtime Database for live updates
5. **Push Notifications:** Expo push token registration

---

## AI/ML Face Recognition System

### Architecture Overview
The face recognition system is a comprehensive pipeline that processes camera frames to identify students and log attendance automatically.

### Technology Stack

**Face Detection:**
- **Library:** MTCNN (Multi-task Cascaded Convolutional Networks)
- **Purpose:** Detect faces in camera frames
- **Output:** Bounding box coordinates (x, y, width, height)
- **Performance:** Optimized for real-time processing

**Face Recognition:**
- **Library:** DeepFace with FaceNet model
- **Model:** FaceNet (128-dimensional embeddings)
- **Purpose:** Generate face embeddings and compare with stored embeddings
- **Similarity Metric:** Cosine distance
- **Threshold:** 0.40 (below threshold = same person)

**Image Processing:**
- **Library:** OpenCV (opencv-python-headless)
- **Operations:** Resizing, color space conversion, face cropping
- **Optimization:** Frame downsampling for performance

### Pipeline Stages

#### 1. Image Preprocessing (preprocess.py)
**Input:** Raw BGR image from camera
**Operations:**
- Histogram equalization for lighting normalization
- Noise reduction using Gaussian blur
- Color space normalization
- Resolution optimization (max 640px width)
**Output:** Preprocessed image ready for face detection

#### 2. Face Detection (detector.py)
**Input:** Preprocessed image
**Operations:**
- MTCNN face detection
- Multiple face detection handling
- Confidence scoring
- Bounding box extraction
**Output:** List of detected faces with coordinates and confidence scores

**Largest Face Selection:**
- In multi-face scenarios, selects the largest face
- Assumption: Largest face = person closest to camera
- Prevents false recognition of background faces

#### 3. Face Cropping (detector.py)
**Input:** Image + face bounding box
**Operations:**
- Extract face region with padding (10%)
- Resize to FaceNet input size (160x160)
- Aspect ratio preservation
**Output:** Cropped face image

#### 4. Embedding Generation (recognizer.py)
**Input:** Cropped face image
**Operations:**
- DeepFace.represent() with FaceNet model
- 128-dimensional embedding vector generation
- L2 normalization for consistent scaling
**Output:** Normalized embedding vector (128 floats)

#### 5. Similarity Calculation (recognizer.py)
**Input:** Live embedding + stored embeddings
**Operations:**
- Cosine distance calculation against all stored embeddings
- Distance range: 0.0 (identical) to 2.0 (opposite)
- Best match identification
**Output:** Best match student ID with distance score

**Cosine Distance Formula:**
```
distance = 1.0 - (embedding_a · embedding_b) / (||embedding_a|| × ||embedding_b||)
```

**Typical Values:**
- Same person: 0.05 - 0.35
- Different people: 0.50 - 1.50
- Recognition threshold: 0.40

#### 6. Threshold Application (recognizer.py)
**Input:** Best match distance
**Logic:**
- If distance < 0.40: Recognized
- If distance >= 0.40: Unknown
**Output:** Recognition status with confidence score

**Confidence Score Conversion:**
```
confidence = max(0, (1.0 - distance) × 100)
```
- distance = 0.0 → confidence = 100%
- distance = 0.40 → confidence = 60%

### Enrollment Process (enroll.py)

**Purpose:** Create face embeddings for new students

**Input:**
- Student roll number/face_label
- Multiple face photos (3-5 recommended)

**Process:**
1. Detect faces in each photo
2. Generate embeddings for each detected face
3. Calculate mean embedding across all photos
4. Save mean embedding as `{roll_number}_mean.npy`
5. Update labels.json with student mapping

**Output:**
- Saved embedding file
- Updated labels.json
- Validation report

**Validation:**
- Face quality checks
- Blurring detection
- Lighting assessment
- Minimum photo requirements

### Embedding Storage

**Location:** `services/face_recognition/embeddings/`

**Files:**
- `labels.json` - Maps face labels to student information
- `{roll_number}_mean.npy` - Individual student mean embeddings

**labels.json Structure:**
```json
{
  "BCA-2024-001": {
    "student_id": 1,
    "roll_number": "BCA-2024-001",
    "fullname": "Jane Smith"
  }
}
```

**Embedding Format:**
- NumPy array (.npy file)
- Shape: (128,) - 128-dimensional vector
- Data type: float32
- Normalized: L2 normalized

### Loading and Caching

**Startup Process:**
1. Load all embeddings from disk
2. Cache in memory as Python dictionary
3. Warm up DeepFace model with blank image
4. Validate embedding consistency with database

**Cache Structure:**
```python
_embeddings = {
  "BCA-2024-001": np.array([0.1, 0.2, ..., 0.128]),  # 128 floats
  "BCA-2024-002": np.array([0.3, 0.4, ..., 0.256]),
  # ...
}
```

**Reload Mechanism:**
- Called after new student enrollment
- Updates cache in-place
- Only affects current gunicorn worker
- Container restart guarantees full consistency

### Validation (validate_embeddings.py)

**Purpose:** Ensure database face_labels match embedding files

**Checks:**
1. All DB face_labels have corresponding .npy files
2. All .npy files have corresponding DB face_labels
3. Embedding file format validation
4. Labels.json consistency

**Startup Behavior:**
- Runs automatically on application startup
- Logs warnings for mismatches
- Does not block startup (non-fatal)
- Helps identify data consistency issues

### Performance Optimizations

**Frame Processing:**
- Max width limit: 640px
- Largest face selection only
- Cooldown period: 15 seconds (configurable)
- Background Firebase sync

**Model Loading:**
- Single model instance
- Warm-up on startup
- Cached embeddings in memory
- Skip detection for pre-cropped faces

**Memory Management:**
- Embeddings cached as NumPy arrays
- Lazy loading of Firebase DB
- Daemon threads for non-blocking operations

### Error Handling

**Recognition Failures:**
- No face detected → "no_face" status
- Embedding generation failed → "no_face" status
- No embeddings loaded → "error" status
- Database lookup failed → "unknown" status

**Enrollment Failures:**
- No faces detected in photos → error
- Low quality faces → warning
- File system errors → error
- Database errors → rollback

**Graceful Degradation:**
- Firebase failures logged but don't block
- Recognition failures return clear status codes
- Validation warnings are non-fatal

---

## System Features and Functionality

### Core Features

#### 1. User Authentication and Authorization
**Functionality:**
- Secure login with email/password
- JWT token-based authentication
- Role-based access control (RBAC)
- Three user roles: Admin, Teacher, Student
- Password hashing with bcrypt
- Session management with configurable expiry

**Implementation:**
- Flask-JWT for token generation
- Custom middleware for authentication
- Role decorators for endpoint protection
- Firebase Auth integration (optional)

#### 2. Face Recognition Attendance
**Functionality:**
- Real-time face scanning via mobile camera
- Automatic student identification
- Entry/exit event logging
- Confidence scoring
- Cooldown period to prevent duplicate logs
- Enrollment check before logging

**Implementation:**
- MTCNN for face detection
- DeepFace FaceNet for recognition
- Cosine distance similarity matching
- OpenCV for image processing
- Real-time camera feed via expo-camera

#### 3. Session Management
**Functionality:**
- Create attendance sessions
- Two attendance modes: Strict and Activity
- Configurable attendance thresholds
- Schedule enforcement (time windows)
- Session status tracking (ACTIVE/CLOSED)
- Real-time attendance counting

**Implementation:**
- UUID-based session identification
- Threshold-based attendance calculation
- Schedule validation with timezone support
- Firebase real-time sync
- Push notifications for session events

#### 4. Attendance Calculation
**Functionality:**
- Entry/exit event pairing
- Duration calculation
- Threshold-based status determination
- Present/Absent/Partial status
- Session summary generation
- Per-student and per-class reporting

**Implementation:**
- Chronological log pairing
- Duration summation
- Threshold comparison
- Automatic finalization on session end
- Analytics and reporting

#### 5. Class and Schedule Management
**Functionality:**
- Class creation and management
- Teacher assignment
- Schedule setting (date, time, duration)
- Student enrollment
- Batch enrollment support
- Schedule status calculation

**Implementation:**
- Flexible scheduling (legacy + new fields)
- Schedule enforcement with time windows
- Timezone-aware calculations
- Bulk enrollment via batches
- Status computation for UI

#### 6. Batch Management
**Functionality:**
- Create student batches
- Add/remove students from batches
- Bulk class enrollment
- Batch-class tracking
- Batch statistics

**Implementation:**
- Template-based enrollment
- Non-cascading deletes (data integrity)
- Audit trail via batch_class_links
- Separate from actual enrollments

#### 7. Excuse Request System
**Functionality:**
- Student excuse submission
- Admin approval/rejection workflow
- Request status tracking
- Decision notifications
- Excuse history

**Implementation:**
- WaiverRequest model
- Status workflow (pending→approved/rejected)
- Firebase sync for real-time updates
- Admin decision interface

#### 8. Reporting and Analytics
**Functionality:**
- Per-student attendance history
- Per-class attendance reports
- Attendance percentage calculation
- Risk assessment (Low/Mid/High)
- Trend analysis
- Export capabilities

**Implementation:**
- Aggregated queries
- Percentage calculations
- Risk threshold logic
- Visual analytics on frontend
- Report generation endpoints

#### 9. Push Notifications
**Functionality:**
- Session start notifications
- Absence alerts
- Excuse decision notifications
- System alerts
- Device token management

**Implementation:**
- Firebase Cloud Messaging (FCM)
- Expo push token integration
- Background notification sending
- Token registration endpoint
- Graceful degradation without Firebase

#### 10. Real-time Synchronization
**Functionality:**
- Live attendance updates
- Session status sync
- Attendance log sync
- Excuse decision sync
- Manual override sync

**Implementation:**
- Firebase Realtime Database
- Background thread sync
- Non-blocking operations
- SQLite as source of truth
- Graceful degradation

### Advanced Features

#### 1. Schedule Enforcement
**Functionality:**
- Time-based session access control
- 15-minute early start buffer
- Scheduled date validation
- Time window enforcement
- Status calculation for UI

**Implementation:**
- Timezone-aware calculations (Asia/Kathmandu)
- Configurable buffer period
- Multiple status values
- Frontend gating based on status

#### 2. Multi-Worker Support
**Functionality:**
- Gunicorn with multiple workers
- Load balancing
- Graceful degradation
- Embedding cache consistency

**Implementation:**
- Gunicorn WSGI server
- Worker-specific embedding caches
- Reload mechanism
- Container restart for consistency

#### 3. Data Validation
**Functionality:**
- Face embedding consistency checks
- Database constraint validation
- Input validation on endpoints
- Email uniqueness checks
- Roll number uniqueness

**Implementation:**
- Startup validation scripts
- SQLAlchemy constraints
- Request validation middleware
- Unique database constraints

#### 4. Admin Panel
**Functionality:**
- Web-based admin interface
- Direct database manipulation
- User management
- Class management
- CSRF protection

**Implementation:**
- Flask-Admin integration
- Custom views for models
- CSRF exemption for API endpoints
- Role-based access

#### 5. Docker Deployment
**Functionality:**
- Containerized backend
- Volume mounting for persistence
- Environment-based configuration
- Health checks
- Easy deployment

**Implementation:**
- Multi-stage Docker builds
- Docker Compose orchestration
- Volume mounts for database and embeddings
- Environment variable injection

---

## System Integration and Connections

### Frontend-Backend Integration

**API Communication:**
- RESTful API design
- JSON request/response format
- JWT authentication header
- Centralized endpoint configuration
- Error handling with status codes

**Data Flow:**
1. Frontend captures user input
2. API call to backend endpoint
3. Backend processes request
4. Database operations
5. Response returned to frontend
6. Frontend updates UI

**Key Integration Points:**
- Authentication (login/logout)
- Session management (start/end/status)
- Face scanning (real-time image upload)
- Data synchronization (Firebase + polling)

### Database Integration

**ORM Integration:**
- SQLAlchemy models for all tables
- Automatic table creation
- Relationship management
- Cascade operations
- Transaction management

**Data Persistence:**
- SQLite file storage
- Volume mounting in Docker
- Backup via file copy
- Migration strategy (auto-create)

**Query Optimization:**
- Indexed foreign keys
- Efficient joins via relationships
- Aggregated queries for reports
- Lazy loading where appropriate

### AI/ML Integration

**Face Recognition Pipeline:**
1. Frontend captures camera frame
2. Image sent to /api/attendance/scan
3. Backend processes through AI pipeline
4. Student identified or rejected
5. Attendance logged if enrolled
6. Response returned to frontend

**Embedding Storage:**
- File-based storage (.npy files)
- Memory caching for performance
- Validation with database
- Volume mounting for persistence

**Model Management:**
- DeepFace model loading
- MTCNN detector initialization
- Warm-up on startup
- Single instance for efficiency

### Firebase Integration

**Real-time Database:**
- Session status sync
- Attendance log sync
- Excuse decision sync
- Manual override sync
- Background thread operations

**Cloud Messaging:**
- Push notification sending
- Device token management
- Absence alerts
- Session notifications
- Graceful degradation

**Authentication (Optional):**
- Firebase Auth user creation
- Email/password authentication
- Token validation
- Best-effort integration

### External Service Integration

**Push Notifications:**
- Expo push service
- Firebase Cloud Messaging
- Token registration
- Background sending
- Error handling

**Camera Integration:**
- expo-camera for live feed
- expo-image-picker for photos
- expo-image-manipulator for processing
- Real-time frame capture
- Image compression

---

## System Architecture and Data Flow

### Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native Frontend                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Screens    │  │  Components  │  │   Context    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
│                    HTTP/REST API                             │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    Flask Backend API                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │  Services    │  │  Middleware  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐      │
│  │   Models     │  │ Face Recog.  │  │   Auth       │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
┌─────────┼─────────────────┼─────────────────┼───────────────┐
│         ▼                 ▼                 ▼               │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │ SQLite   │     │  DeepFace│     │ Firebase  │            │
│  │ Database │     │  + MTCNN │     │ Services │            │
│  └──────────┘     └──────────┘     └──────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Attendance Session Flow

```
Teacher starts session:
1. Teacher selects class and mode
2. Frontend calls POST /api/session/start
3. Backend validates schedule (if set)
4. Backend creates Session record
5. Backend creates AttendanceRecord for all enrolled students
6. Backend syncs to Firebase
7. Frontend navigates to StartClassScreen

Live attendance scanning:
1. Frontend captures camera frame
2. Frontend sends frame to POST /api/attendance/scan
3. Backend runs face recognition pipeline
4. Backend identifies student or returns unknown
5. Backend checks enrollment
6. Backend applies cooldown check
7. Backend toggles ENTRY/EXIT
8. Backend creates AttendanceLog
9. Backend syncs to Firebase (background)
10. Frontend updates UI with result

Session ends:
1. Teacher clicks "End Session"
2. Frontend calls POST /api/session/end
3. Backend calculates final attendance
4. Backend updates AttendanceRecord status
5. Backend sends push notifications to absent students
6. Backend syncs to Firebase
7. Frontend shows summary
```

### Face Recognition Flow

```
Enrollment:
1. Admin selects student and uploads photos
2. Frontend sends photos to POST /api/admin/enroll-face
3. Backend detects faces in each photo
4. Backend generates embeddings for each face
5. Backend calculates mean embedding
6. Backend saves {roll_number}_mean.npy
7. Backend updates labels.json
8. Backend updates student.face_label in database
9. Backend reloads embeddings cache
10. Frontend shows success

Recognition:
1. Camera frame captured
2. Image sent to POST /api/attendance/scan
3. Backend preprocesses image
4. Backend detects faces with MTCNN
5. Backend selects largest face
6. Backend crops face region
7. Backend generates embedding with FaceNet
8. Backend calculates cosine distance with all stored embeddings
9. Backend finds best match
10. Backend applies threshold (0.40)
11. Backend looks up student from face_label
12. Backend returns student ID or unknown
```

### Data Synchronization Flow

```
Firebase Sync (Non-blocking):
1. Backend operation completes (SQLite commit)
2. Backend spawns daemon thread
3. Thread syncs data to Firebase
4. Thread logs success/failure
5. Main thread returns response immediately
6. Frontend receives response without Firebase delay

Real-time Updates:
1. Backend writes to SQLite
2. Backend syncs to Firebase
3. Firebase triggers update
4. Frontend listens to Firebase
5. Frontend updates UI in real-time
6. If Firebase fails, frontend polls API
```

---

## Configuration and Environment

### Environment Variables

**Root .env file:**
```bash
# Flask Configuration
SECRET_KEY=your-secret-key-here
FLASK_ENV=production

# Database
SQLALCHEMY_DATABASE_URI=sqlite:///database/attendance.db

# JWT Configuration
JWT_EXPIRY_HOURS=24

# Firebase Configuration
FIREBASE_CREDENTIALS_PATH=firebase_credentials.json
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# Attendance Thresholds
STRICT_MODE_THRESHOLD=0.80
ACTIVITY_MODE_THRESHOLD=0.55

# Face Recognition
SCAN_COOLDOWN_SECONDS=15

# Scheduling
SERVER_TIMEZONE=Asia/Kathmandu
SESSION_START_BUFFER_MINUTES=15

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8081

# Flask-Admin
FLASK_ADMIN_SWATCH=cosmo

# CSRF Protection
WTF_CSRF_ENABLED=True
```

**Frontend .env file:**
```bash
# API Configuration
EXPO_PUBLIC_API_BASE_URL=http://10.200.29.220:5000
```

### Docker Configuration

**docker-compose.yml:**
```yaml
services:
  backend:
    build:
      context: "./Backend Sajak/backend/backend"
    container_name: attendance_backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - "./Backend Sajak/backend/backend/database:/app/database"
      - "./Backend Sajak/backend/backend/services/face_recognition/embeddings:/app/services/face_recognition/embeddings"
      - ./firebase_credentials.json:/app/firebase_credentials.json:ro
    env_file:
      - .env
    environment:
      - FLASK_ENV=${FLASK_ENV:-production}
      - DATABASE_URL=sqlite:////app/database/attendance.db
    networks:
      - attendance_network
```

**Volume Mounting:**
- Database persistence outside container
- Face embeddings persistence outside container
- Firebase credentials read-only mount

### Backend Configuration (config.py)

**Key Configuration Classes:**
- Database URI configuration
- JWT expiry settings
- Firebase credential paths
- Attendance thresholds
- CORS origins
- Face recognition settings
- Scheduling parameters
- CSRF protection

---

## Current Issues and Areas Needing Solutions

### Known Issues

#### 1. Multi-Worker Embedding Cache Inconsistency
**Issue:** `reload_embeddings()` only refreshes the current gunicorn worker's cache. With multiple workers, other workers keep stale embeddings until they handle an enrollment request or the container restarts.

**Impact:** Low-traffic deployments acceptable, but high-traffic scenarios may have inconsistent recognition.

**Potential Solutions:**
- Implement shared cache (Redis)
- Use file-based cache invalidation
- Force worker restart after enrollment
- Accept current behavior for low-traffic deployments

#### 2. Face Label Inconsistency
**Issue:** Existing test students have `face_label = "Student_1/2/3"` but new enrollments use `roll_number` as face_label. This causes recognition failures for old students.

**Impact:** Old test students cannot be recognized until face_labels are updated.

**Solution:** Update existing student face_labels to match roll_numbers in database.

#### 3. Schedule Date Picker UI
**Issue:** Current date input is plain TextInput requiring ISO format (YYYY-MM-DD), which is not user-friendly.

**Impact:** Poor user experience for admins setting schedules.

**Potential Solutions:**
- Implement React Native date picker
- Use expo-date-picker
- Add calendar component
- Provide format validation and hints

#### 4. Export Reports Simulation
**Issue:** ExportReportsScreen only simulates export without actual file generation.

**Impact:** Users cannot actually download reports.

**Potential Solutions:**
- Implement CSV generation
- Implement PDF generation
- Add file download functionality
- Support multiple export formats

#### 5. Face Enrollment UI Placeholder
**Issue:** AddStudentFaceScreen has placeholder UI; actual enrollment happens via API endpoint.

**Impact:** Inconsistent user experience.

**Solution:** Implement proper face photo capture UI in the screen.

### Areas for Improvement

#### 1. Error Handling and User Feedback
**Current State:** Basic error handling with status codes
**Improvements Needed:**
- More descriptive error messages
- User-friendly error UI
- Retry mechanisms
- Offline handling
- Loading states

#### 2. Testing Coverage
**Current State:** Limited test suite (4 test files)
**Improvements Needed:**
- Unit tests for all services
- Integration tests for API endpoints
- Face recognition testing
- Frontend component tests
- End-to-end testing

#### 3. Performance Optimization
**Current State:** Basic optimizations in place
**Improvements Needed:**
- Database query optimization
- Caching strategy (Redis)
- Image compression optimization
- API response caching
- Frontend performance tuning

#### 4. Security Enhancements
**Current State:** Basic security measures
**Improvements Needed:**
- Rate limiting
- Input sanitization
- SQL injection prevention (already handled by ORM)
- XSS prevention
- HTTPS enforcement
- Security headers

#### 5. Monitoring and Logging
**Current State:** Basic Python logging
**Improvements Needed:**
- Structured logging
- Log aggregation
- Performance monitoring
- Error tracking (Sentry)
- Health check endpoints
- Metrics collection

#### 6. Documentation
**Current State:** Basic README and endpoint documentation
**Improvements Needed:**
- API documentation (Swagger/OpenAPI)
- Deployment guide
- Troubleshooting guide
- User manual
- Developer guide
- Architecture documentation

#### 7. Scalability
**Current State:** Single-server deployment
**Improvements Needed:**
- Database migration (PostgreSQL)
- Load balancing
- Horizontal scaling
- CDN for static assets
- Distributed session storage

#### 8. Mobile App Enhancements
**Current State:** Functional but basic UI
**Improvements Needed:**
- Improved UI/UX design
- Offline mode support
- Background notifications
- Biometric authentication
- Dark mode support
- Accessibility improvements

#### 9. Face Recognition Accuracy
**Current State:** Good accuracy with FaceNet
**Improvements Needed:**
- Anti-spoofing measures
- Liveness detection
- Multiple face handling
- Low-light optimization
- Age-invariance testing
- Model fine-tuning

#### 10. Admin Panel Features
**Current State:** Basic Flask-Admin interface
**Improvements Needed:**
- Custom admin dashboard
- Advanced reporting
- Bulk operations
- Audit logging
- User activity tracking
- System health monitoring

---

## Deployment and Operations

### Development Setup

**Backend:**
```bash
cd "Backend Sajak/backend/backend"
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with configuration
python app.py
```

**Frontend:**
```bash
cd AttendanceApp
npm install
cp .env.example .env
# Edit .env with API URL
npx expo start
```

### Production Deployment

**Docker Deployment:**
```bash
# Build and start
docker-compose up --build -d

# View logs
docker logs attendance_backend --tail 50

# Restart
docker-compose restart backend

# Stop
docker-compose down
```

**Important Notes:**
- Source code baked into Docker image
- Use `--build` after code changes
- Database and embeddings volume-mounted
- Close DB Browser for SQLite before starting

### Database Management

**Backup:**
```bash
# Copy database file
cp Backend\ Sajak/backend/backend/database/attendance.db backup.db
```

**Restore:**
```bash
# Restore from backup
cp backup.db Backend\ Sajak/backend/backend/database/attendance.db
```

**Migration:**
- Automatic table creation on startup
- No formal migration system
- Manual schema changes require careful handling

### Monitoring

**Health Checks:**
- `/health` endpoint (if available)
- Container health status
- Database connectivity
- Firebase connectivity (optional)

**Logs:**
- Python logging to stdout
- Docker log collection
- Structured log format
- Multiple log levels

### Troubleshooting

**Common Issues:**

1. **Database Lock Error:**
   - Cause: DB Browser for SQLite open
   - Solution: Close DB Browser before starting container

2. **Face Recognition Not Working:**
   - Cause: Embeddings not loaded or mismatched
   - Solution: Check embeddings folder, validate face_labels

3. **Firebase Sync Failures:**
   - Cause: Credentials missing or invalid
   - Solution: Check firebase_credentials.json, verify permissions

4. **Schedule Enforcement Blocking:**
   - Cause: Timezone mismatch or incorrect schedule
   - Solution: Check SERVER_TIMEZONE, verify scheduled_date/time

5. **Docker Build Failures:**
   - Cause: Network issues or missing dependencies
   - Solution: Check internet connection, verify requirements.txt

---

## Conclusion

This Smart Attendance System represents a comprehensive solution for automated classroom attendance management using AI-powered face recognition. The system integrates modern mobile development practices with robust backend architecture, advanced machine learning capabilities, and real-time synchronization.

The project demonstrates:
- Full-stack development (React Native + Flask)
- AI/ML integration (DeepFace, MTCNN, FaceNet)
- Real-time features (Firebase, push notifications)
- Containerized deployment (Docker)
- Role-based access control
- Comprehensive data modeling
- Production-ready architecture

The system is designed for scalability, maintainability, and ease of deployment in educational institutions. While there are areas for improvement and known limitations, the core functionality is solid and provides a strong foundation for future enhancements.

**Key Strengths:**
- Automated face recognition attendance
- Real-time synchronization
- Flexible scheduling system
- Comprehensive reporting
- Role-based access control
- Containerized deployment
- Graceful degradation

**Primary Use Cases:**
- Daily classroom attendance tracking
- Attendance analytics and reporting
- Student absence management
- Schedule management
- Bulk enrollment operations
- Excuse request processing

The system is production-ready for small to medium-sized educational institutions and can be scaled for larger deployments with the recommended improvements.
