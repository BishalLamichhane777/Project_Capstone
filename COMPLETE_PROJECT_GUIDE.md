# Smart Attendance System - Complete Project Guide

**Project Name:** Smart Attendance System (myTIMeS Direct V2)  
**Project Type:** Automated classroom attendance management system with AI-powered face recognition  
**Version:** 2.0  
**Last Updated:** July 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Complete File Structure](#3-complete-file-structure)
4. [Database Schema & Relationships](#4-database-schema--relationships)
5. [Backend Architecture & Endpoints](#5-backend-architecture--endpoints)
6. [Frontend Architecture & Screens](#6-frontend-architecture--screens)
7. [AI/ML Face Recognition System](#7-ai-ml-face-recognition-system)
8. [Frontend-Backend API Connections](#8-frontend-backend-api-connections)
9. [System Flows & Workflows](#9-system-flows--workflows)
10. [Configuration & Deployment](#10-configuration--deployment)

---

## 1. Project Overview

### Core Concept
A full-stack mobile application that enables automated classroom attendance tracking using face recognition technology. The system allows teachers to conduct live attendance sessions by scanning students' faces via mobile camera, automatically logging entry/exit events, calculating attendance duration, and determining final attendance status based on configurable thresholds.

### Target Users
- **Administrators:** System management, user creation, class scheduling, batch management, reporting
- **Teachers:** Conduct attendance sessions, view class schedules, manage student enrollments, generate reports
- **Students:** View attendance history, submit excuse requests, check analytics, receive notifications

### Deployment Architecture
Docker containerized backend with React Native mobile frontend, designed for on-premises deployment in educational institutions.

### Key Capabilities
- Real-time face recognition attendance tracking
- Automated entry/exit logging with duration calculation
- Configurable attendance thresholds (Strict/Activity modes)
- Schedule enforcement with time windows
- Excuse request workflow with admin approval
- Push notifications for attendance alerts
- Comprehensive reporting and analytics

---

## 2. Technology Stack

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

## 3. Complete File Structure

### Root Directory Structure
```
Project_Capstone/
├── docker-compose.yml              # Docker orchestration configuration
├── .env                           # Root environment variables
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore patterns
├── package.json                   # Root package dependencies
├── node_modules/                  # Root node dependencies
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
│   ├── BottomNav.js              # Student navigation (5 tabs)
│   └── TeacherBottomNav.js       # Teacher navigation (4 tabs)
├── context/                       # React Context providers
│   └── AuthContext.js             # Authentication state management
└── screens/                       # Screen components (23 screens)
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
    ├── TeacherProfileScreen.js    # Teacher profile
    └── NotificationsScreen.js     # Notifications display
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
│   ├── batch.py                  # Batch management endpoints
│   └── notifications.py          # Notification endpoints
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

## 4. Database Schema & Relationships

### Database Overview
- **Type:** SQLite relational database
- **File:** `attendance.db`
- **ORM:** SQLAlchemy with declarative models
- **Relationships:** Foreign key relationships with cascade options
- **Constraints:** Unique constraints for data integrity

### Entity Relationship Diagram
```
users (1) ──< (1) students
users (1) ──< (N) notifications
users (1) ──< (N) classes (as teacher)
users (1) ──< (N) sessions (as teacher)

students (1) ──< (N) enrollments
students (1) ──< (N) attendance_logs
students (1) ──< (N) attendance_records
students (1) ──< (N) waiver_requests
students (1) ──< (N) batch_students

classes (1) ──< (N) enrollments
classes (1) ──< (N) sessions
classes (1) ──< (N) batch_class_links

sessions (1) ──< (N) attendance_logs
sessions (1) ──< (N) attendance_records
sessions (1) ──< (N) waiver_requests

batches (1) ──< (N) batch_students
batches (1) ──< (N) batch_class_links
```

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

## 5. Backend Architecture & Endpoints

### Application Factory Pattern
The backend uses Flask's application factory pattern for better testing and modularity.

**File:** `app.py`

```python
def create_app(config_class=Config) -> Flask:
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    _init_firebase(app)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.session import session_bp
    # ... other blueprints
    
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    # ... register other blueprints
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app
```

### Configuration Management
**File:** `config.py`

Configuration is loaded from environment variables using python-dotenv:

```python
class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI", "sqlite:///attendance.db")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
    STRICT_MODE_THRESHOLD = float(os.getenv("STRICT_MODE_THRESHOLD", "0.80"))
    ACTIVITY_MODE_THRESHOLD = float(os.getenv("ACTIVITY_MODE_THRESHOLD", "0.55"))
    SCAN_COOLDOWN_SECONDS = int(os.getenv("SCAN_COOLDOWN_SECONDS", "15"))
    SERVER_TIMEZONE = os.getenv("SERVER_TIMEZONE", "Asia/Kathmandu")
    SESSION_START_BUFFER_MINUTES = int(os.getenv("SESSION_START_BUFFER_MINUTES", "15"))
```

### Route Blueprints
Routes are organized into blueprints for modularity:

- **auth_bp** (`/api/auth`) - Authentication endpoints
- **session_bp** (`/api/session`) - Session management
- **attendance_bp** (`/api/attendance`) - Attendance tracking
- **excuse_bp** (`/api/excuse`) - Excuse requests
- **student_bp** (`/api/student`) - Student management
- **admin_bp** (`/api/admin`) - Admin operations
- **batch_bp** (`/api/admin`) - Batch management
- **notifications_bp** (`/api/notifications`) - Notification operations

### Complete API Endpoints

#### Authentication Endpoints (/api/auth)

##### POST /api/auth/login
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

##### POST /api/auth/register
**Purpose:** Register new user (admin only)  
**Access:** Admin  
**Request Body (teacher):**
```json
{
  "fullname": "Dr. Ramesh Sharma",
  "email": "ramesh@mytimes.com",
  "password": "teacher123",
  "role": "teacher",
  "phone": "+977-9801234567"
}
```
**Request Body (student):**
```json
{
  "fullname": "Anita Thapa",
  "email": "anita@mytimes.com",
  "password": "student123",
  "role": "student",
  "phone": "+977-9812345678",
  "roll_number": "BCA-2024-001",
  "program": "BCA",
  "year_of_study": 2
}
```
**Response (201):**
```json
{
  "user_id": 5,
  "message": "User registered"
}
```

##### GET /api/auth/me
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

##### POST /api/auth/device-token
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

#### Session Endpoints (/api/session)

##### POST /api/session/start
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

##### POST /api/session/end
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

##### GET /api/session/status/<session_id>
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
  "liveCount": 25,
  "present_count": 25,
  "absent_count": 17,
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

##### GET /api/session/my-sessions
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
    "scheduled_end_time": "10:30:00"
  }
]
```

##### GET /api/session/classes
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

#### Attendance Endpoints (/api/attendance)

##### POST /api/attendance/scan
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

##### GET /api/attendance/history
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

##### GET /api/attendance/history/<student_id>
**Purpose:** Get attendance history for specific student  
**Access:** Student (own only), Admin  
**Response:** Same as /history above

##### GET /api/attendance/report/<class_id>
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

##### PUT /api/attendance/manual-override
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

##### GET /api/attendance/analytics
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

#### Excuse Endpoints (/api/excuse)

##### POST /api/excuse/submit
**Purpose:** Submit excuse request  
**Access:** Student  
**Request Body:**
```json
{
  "session_id": "uuid-...",
  "reason": "I had a medical emergency and was admitted to the hospital."
}
```
**Response (201):**
```json
{
  "request_id": 1,
  "message": "Excuse submitted"
}
```

##### GET /api/excuse/pending
**Purpose:** Get pending excuse requests  
**Access:** Admin  
**Response (200):**
```json
[
  {
    "request_id": 1,
    "student_id": 1,
    "student_name": "Anita Thapa",
    "roll_number": "BCA-2024-001",
    "session_id": "uuid-...",
    "class_name": "Data Structures",
    "session_date": "2026-06-21T10:00:00Z",
    "reason": "I had a medical emergency and was admitted to the hospital.",
    "submitted_at": "2026-06-21T12:30:00Z"
  }
]
```

##### GET /api/excuse/history/<student_id>
**Purpose:** Get excuse history for student  
**Access:** Student (own only), Admin  
**Response (200):**
```json
[
  {
    "request_id": 1,
    "student_id": 1,
    "session_id": "uuid-...",
    "reason": "I had a medical emergency and was admitted to the hospital.",
    "status": "Approved",
    "submitted_at": "2026-06-21T12:30:00Z",
    "reviewed_at": "2026-06-21T14:00:00Z"
  }
]
```

##### PUT /api/excuse/decide/<request_id>
**Purpose:** Approve or reject excuse request  
**Access:** Admin  
**Request Body:**
```json
{
  "decision": "Approved"
}
```
**Response (200):**
```json
{
  "message": "Decision recorded",
  "decision": "Approved"
}
```

#### Student Endpoints (/api/student)

##### GET /api/student/list
**Purpose:** Get all students  
**Access:** Admin, Teacher  
**Response (200):**
```json
[
  {
    "student_id": 1,
    "user_id": 3,
    "roll_number": "BCA-2024-001",
    "program": "BCA",
    "year_of_study": 2,
    "fullname": "Anita Thapa",
    "email": "anita@mytimes.com",
    "phone": "+977-9812345678"
  }
]
```

##### GET /api/student/<student_id>
**Purpose:** Get specific student details  
**Access:** Admin, Teacher  
**Response (200):**
```json
{
  "student_id": 1,
  "user_id": 3,
  "roll_number": "BCA-2024-001",
  "program": "BCA",
  "year_of_study": 2,
  "fullname": "Anita Thapa",
  "email": "anita@mytimes.com",
  "phone": "+977-9812345678",
  "enrollments": [
    {
      "enrollment_id": 1,
      "student_id": 1,
      "class_id": 1,
      "enrolled_at": "2026-05-20T10:00:00Z"
    }
  ]
}
```

##### PUT /api/student/enrol/<student_id>
**Purpose:** Enroll student in class  
**Access:** Admin  
**Request Body:**
```json
{
  "class_id": 3
}
```
**Response (201):**
```json
{
  "message": "Student enrolled"
}
```

##### DELETE /api/student/unenrol
**Purpose:** Unenroll student from class  
**Access:** Admin  
**Request Body:**
```json
{
  "student_id": 1,
  "class_id": 3
}
```
**Response (200):**
```json
{
  "message": "Student unenrolled"
}
```

##### DELETE /api/student/<student_id>
**Purpose:** Delete student  
**Access:** Admin  
**Response (200):**
```json
{
  "message": "Student deleted"
}
```

##### GET /api/student/notifications
**Purpose:** Get student notifications  
**Access:** Student  
**Response (200):**
```json
[
  {
    "notif_id": 5,
    "user_id": 3,
    "type": "Waiver",
    "message": "Your excuse for Data Structures has been approved",
    "is_read": false,
    "sent_at": "2026-05-24T14:00:00Z"
  }
]
```

#### Admin Endpoints (/api/admin)

##### POST /api/admin/class/create
**Purpose:** Create new class  
**Access:** Admin  
**Request Body:**
```json
{
  "class_name": "Data Structures",
  "subject": "Computer Science",
  "room": "Lab-301",
  "teacher_id": 2,
  "schedule_time": "2026-06-01T10:00:00+05:45",
  "duration_minutes": 60
}
```
**Response (201):**
```json
{
  "class_id": 1,
  "message": "Class created"
}
```

##### GET /api/admin/class/list
**Purpose:** Get all classes  
**Access:** Admin, Teacher  
**Response (200):**
```json
[
  {
    "class_id": 1,
    "class_name": "Data Structures",
    "subject": "Computer Science",
    "room": "Lab-301",
    "teacher_id": 2,
    "teacher_name": "Dr. Ramesh Sharma",
    "schedule_time": "2026-06-01T10:00:00",
    "duration_minutes": 60,
    "enrolled_count": 42
  }
]
```

##### PUT /api/admin/class/<class_id>
**Purpose:** Update class  
**Access:** Admin  
**Request Body:**
```json
{
  "room": "Lab-302",
  "duration_minutes": 90
}
```
**Response (200):**
```json
{
  "message": "Class updated"
}
```

##### DELETE /api/admin/class/<class_id>
**Purpose:** Delete class  
**Access:** Admin  
**Response (200):**
```json
{
  "message": "Class deleted"
}
```

##### DELETE /api/admin/session/<session_id>
**Purpose:** Delete session  
**Access:** Admin  
**Response (200):**
```json
{
  "message": "Session deleted"
}
```

##### GET /api/admin/users
**Purpose:** Get all users  
**Access:** Admin  
**Query Parameters:**
- `role` (optional) - Filter by role: admin, teacher, student

**Response (200):**
```json
[
  {
    "id": 1,
    "fullname": "System Admin",
    "email": "admin@mytimes.com",
    "role": "admin",
    "phone": null,
    "device_token": null,
    "created_at": "2026-05-20T08:00:00Z"
  }
]
```

##### PUT /api/admin/user/<user_id>
**Purpose:** Update user  
**Access:** Admin  
**Request Body:**
```json
{
  "fullname": "Anita Thapa Magar",
  "phone": "+977-9812345000",
  "device_token": "fcm-device-token-abc123"
}
```
**Response (200):**
```json
{
  "message": "User updated"
}
```

##### GET /api/admin/stats
**Purpose:** Get dashboard statistics  
**Access:** Admin  
**Response (200):**
```json
{
  "total_students": 150,
  "present_today": 120,
  "absent_today": 30,
  "waivers_pending": 5,
  "sessions_today": 8,
  "attendance_rate": 80
}
```

##### GET /api/admin/recent-sessions
**Purpose:** Get recent sessions  
**Access:** Admin  
**Response (200):**
```json
[
  {
    "session_id": "uuid-...",
    "class_name": "Data Structures",
    "subject": "Computer Science",
    "start_time": "2026-06-21T09:00:00Z",
    "present_count": 38,
    "absent_count": 4
  }
]
```

##### GET /api/admin/notifications
**Purpose:** Get admin notifications  
**Access:** Admin  
**Response (200):**
```json
[
  {
    "notif_id": 1,
    "user_id": 1,
    "type": "Waiver",
    "message": "Anita Thapa submitted an excuse for Data Structures",
    "is_read": false,
    "sent_at": "2026-05-24T12:30:00Z"
  }
]
```

#### Batch Endpoints (/api/admin/batches)

##### GET /api/admin/batches
**Purpose:** Get all batches  
**Access:** Admin  
**Response (200):**
```json
[
  {
    "batch_id": 1,
    "batch_name": "BCA 2024",
    "description": "BCA First Year Students",
    "student_count": 45,
    "created_at": "2026-05-20T10:00:00Z"
  }
]
```

##### POST /api/admin/batches
**Purpose:** Create new batch  
**Access:** Admin  
**Request Body:**
```json
{
  "batch_name": "BCA 2024",
  "description": "BCA First Year Students"
}
```
**Response (201):**
```json
{
  "batch_id": 1,
  "message": "Batch created"
}
```

##### GET /api/admin/batches/<batch_id>
**Purpose:** Get batch details with students  
**Access:** Admin  
**Response (200):**
```json
{
  "batch_id": 1,
  "batch_name": "BCA 2024",
  "description": "BCA First Year Students",
  "students": [
    {
      "student_id": 1,
      "roll_number": "BCA-2024-001",
      "fullname": "Anita Thapa"
    }
  ]
}
```

##### POST /api/admin/batches/<batch_id>/students
**Purpose:** Add students to batch  
**Access:** Admin  
**Request Body:**
```json
{
  "student_ids": [1, 2, 3]
}
```
**Response (200):**
```json
{
  "message": "Students added to batch"
}
```

##### DELETE /api/admin/batches/<batch_id>/students/<student_id>
**Purpose:** Remove student from batch  
**Access:** Admin  
**Response (200):**
```json
{
  "message": "Student removed from batch"
}
```

##### POST /api/admin/classes/<class_id>/enroll-batch
**Purpose:** Enroll entire batch in class  
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
  "message": "Batch enrolled in class",
  "enrolled_count": 45
}
```

#### Notification Endpoints (/api/notifications)

##### GET /api/notifications/my-notifications
**Purpose:** Get current user's notifications  
**Access:** Any authenticated user  
**Response (200):**
```json
[
  {
    "notification_id": 1,
    "message": "Your excuse has been approved",
    "type": "Waiver",
    "read": false,
    "created_at": "2026-06-21T10:00:00Z"
  }
]
```

##### POST /api/notifications/mark-read
**Purpose:** Mark notifications as read  
**Access:** Any authenticated user  
**Response (200):**
```json
{
  "message": "Notifications marked as read"
}
```

##### GET /api/notifications/unread-count
**Purpose:** Get unread notification count  
**Access:** Any authenticated user  
**Response (200):**
```json
{
  "unread_count": 5
}
```

---

## 6. Frontend Architecture & Screens

### Navigation Structure
The application uses React Navigation's Native Stack Navigator with role-based routing.

**File:** `App.js`

**Main Navigation Stack:**
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
5. **Shared:**
   - NotificationsScreen

### Authentication Context
**File:** `context/AuthContext.js`

Global authentication state management using React Context API:

```javascript
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const loginState = (token, user) => {
    setToken(token);
    setUser(user);
  };

  const logoutState = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loginState, logoutState, isDarkMode, setIsDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### API Integration
**File:** `api.js`

Centralized API endpoint configuration:

```javascript
export const BASE_URL = 'http://10.200.29.152:5000';

export const API = {
  login: `${BASE_URL}/api/auth/login`,
  register: `${BASE_URL}/api/auth/register`,
  currentUser: `${BASE_URL}/api/auth/me`,
  sessionStart: `${BASE_URL}/api/session/start`,
  sessionEnd: `${BASE_URL}/api/session/end`,
  sessionStatus: `${BASE_URL}/api/session/status`,
  sessionClasses: `${BASE_URL}/api/session/classes`,
  attendanceHistory: `${BASE_URL}/api/attendance/history`,
  attendanceScan: `${BASE_URL}/api/attendance/scan`,
  attendanceAnalytics: `${BASE_URL}/api/attendance/analytics`,
  excuses: `${BASE_URL}/api/excuse`,
  excuseSubmit: `${BASE_URL}/api/excuse/submit`,
  excusePending: `${BASE_URL}/api/excuse/pending`,
  excuseDecide: `${BASE_URL}/api/excuse/decide`,
  adminClassList: `${BASE_URL}/api/admin/class/list`,
  adminClassCreate: `${BASE_URL}/api/admin/class/create`,
  adminUsers: `${BASE_URL}/api/admin/users`,
  adminStats: `${BASE_URL}/api/admin/stats`,
  adminRecentSessions: `${BASE_URL}/api/admin/recent-sessions`,
  sessionMySessions: `${BASE_URL}/api/session/my-sessions`,
  adminBatches: `${BASE_URL}/api/admin/batches`,
  adminBatchDetail: `${BASE_URL}/api/admin/batches`,
  adminEnrollBatch: `${BASE_URL}/api/admin/classes`,
  adminStudentsList: `${BASE_URL}/api/student/list`,
  adminTeachers: `${BASE_URL}/api/admin/users?role=teacher`,
  adminSendNotification: `${BASE_URL}/api/admin/send-notification`,
  adminNotifications: `${BASE_URL}/api/admin/notifications`,
  myNotifications: `${BASE_URL}/api/notifications/my-notifications`,
  markNotificationsRead: `${BASE_URL}/api/notifications/mark-read`,
  notificationUnreadCount: `${BASE_URL}/api/notifications/unread-count`,
};
```

### Screen-by-Screen Documentation

#### 1. LoginScreen.js
**Purpose:** User authentication with role selection  
**Key Features:**
- Role toggle (Student/Teacher/Admin)
- Email and password input
- Role validation (backend role must match selected role)
- Connection timeout handling (10 seconds)
- Auto-navigation to appropriate dashboard based on role

**API Calls:**
- `POST /api/auth/login` - Authenticate user

**UI Components:**
- Role selector with icons (User, ClipboardList, Shield)
- Role-specific info banners
- Input fields with icons (Mail, Eye/EyeOff)
- Loading states with ActivityIndicator

**Navigation:**
- Student → HomeScreen
- Teacher → TeacherDashboardScreen
- Admin → AdminDashboardScreen

#### 2. HomeScreen.js (Student)
**Purpose:** Student dashboard showing attendance overview  
**Key Features:**
- Circular progress indicator for overall attendance
- Quick action buttons (Submit Waiver, View Waiver)
- Weekly trend bar chart
- Recent attendance status cards
- Notification badge with unread count

**API Calls:**
- `GET /api/notifications/unread-count` - Get unread notification count

**UI Components:**
- CircularProgress component
- WeeklyTrendChart component
- Action buttons with icons
- Status cards with badges

**Navigation:**
- Submit Waiver → SubmitWaiverScreen
- View Waiver → WaiverStatusScreen
- View All → AttendanceHistoryScreen
- Bell icon → NotificationsScreen

#### 3. AdminDashboardScreen.js
**Purpose:** Admin dashboard with system overview  
**Key Features:**
- Statistics grid (Total Students, Present Today, Absent Today, Waivers Pending)
- Weekly attendance chart
- Quick action grid (Manage Schedules, Student Analytics, Add Student Face, etc.)
- At-risk students list
- Today's overview with attendance rate
- Recent sessions list
- Notification badge

**API Calls:**
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/recent-sessions` - Get recent sessions
- `GET /api/notifications/unread-count` - Get unread notification count

**UI Components:**
- StatsGrid with icon cards
- WeeklyChart component
- QuickActions grid
- RiskBadge component
- StudentRow component

**Navigation:**
- Manage Schedules → ManageSchedulesScreen
- Student Analytics → StudentAnalyticsScreen
- Add Student Face → AddStudentFaceScreen
- Review Waivers → AdminWaiversScreen
- Export Reports → ExportReportsScreen
- Send Alerts → SendAlertsScreen
- Manage Batches → ManageBatchesScreen
- Bell icon → NotificationsScreen

#### 4. TeacherDashboardScreen.js
**Purpose:** Teacher dashboard with class schedule  
**Key Features:**
- Quick stats (Classes Today, Total Students, Avg Attendance)
- Ongoing class card (if session active)
- Upcoming classes list
- Start Face Attendance banner
- Notification badge

**API Calls:**
- `GET /api/session/my-sessions` - Get teacher's sessions
- `GET /api/notifications/unread-count` - Get unread notification count

**UI Components:**
- OngoingCard component (for active sessions)
- UpcomingCard component (for scheduled classes)
- StudentAvatars component
- StartBanner component

**Navigation:**
- View/Start button → StartClassScreen
- See All → TeacherClassesScreen
- Start Face Attendance → StartClassScreen
- Bell icon → NotificationsScreen

#### 5. StartClassScreen.js
**Purpose:** Live face recognition attendance scanning  
**Key Features:**
- Real-time camera feed using expo-camera
- Face recognition integration with backend
- Entry/exit logging with confidence scores
- Live attendance count
- Session timer
- Detected students list with event badges
- Recognition overlay with flash animation
- Multi-face detection support

**API Calls:**
- `POST /api/session/start` - Start attendance session
- `POST /api/session/end` - End attendance session
- `GET /api/session/status/<session_id>` - Get session status
- `POST /api/attendance/scan` - Scan face and log attendance

**UI Components:**
- CameraView with permission handling
- PulsingDot animation
- RecognitionOverlay component
- DetectedStudentRow component
- Stats row (Detected, Not Yet, Total, Attendance %)

**Key Functions:**
- `handleStart()` - Start session and fetch enrolled students
- `handleEnd()` - End session and finalize attendance
- `runScan()` - Capture and upload frames for face recognition
- `handleScanResult()` - Process scan results and update UI

**Camera Settings:**
- Resolution: 720px width (optimized for upload)
- Scan interval: 2000ms
- Quality: 0.6
- Format: JPEG

#### 6. AttendanceHistoryScreen.js
**Purpose:** Display student's attendance history  
**Key Features:**
- List of all attendance records
- Status badges (Present/Absent/Partial)
- Duration display
- Date and class information
- Filter by date range

**API Calls:**
- `GET /api/attendance/history` - Get attendance history

**UI Components:**
- Attendance cards with status badges
- Date and time display
- Duration in minutes/hours

#### 7. SubmitWaiverScreen.js
**Purpose:** Submit absence excuse request  
**Key Features:**
- Session selection (absent sessions only)
- Reason input
- Supporting document upload
- Submission confirmation

**API Calls:**
- `GET /api/attendance/history` - Get absent sessions
- `POST /api/excuse/submit` - Submit excuse request

**UI Components:**
- Session dropdown/selector
- Text input for reason
- File upload button
- Submit button

#### 8. WaiverStatusScreen.js
**Purpose:** View excuse request status  
**Key Features:**
- List of all excuse requests
- Status badges (Pending/Approved/Rejected)
- Decision date display
- Reason display

**API Calls:**
- `GET /api/excuse/history/<student_id>` - Get excuse history

**UI Components:**
- Waiver cards with status badges
- Color-coded status indicators

#### 9. StudentAnalyticsScreen.js
**Purpose:** Display attendance analytics  
**Key Features:**
- Overall attendance percentage
- Per-class attendance breakdown
- Risk assessment (Low/Mid/High)
- Attendance trends
- Present/Absent/Waiver counts

**API Calls:**
- `GET /api/attendance/analytics` - Get analytics data

**UI Components:**
- Circular progress indicators
- Bar charts for trends
- Risk badges
- Class-wise breakdown cards

#### 10. ManageSchedulesScreen.js
**Purpose:** Create and manage class schedules  
**Key Features:**
- Class creation form
- Schedule setting (date, time, duration)
- Teacher assignment
- Room assignment
- Batch enrollment integration
- Class list with edit/delete options

**API Calls:**
- `GET /api/admin/class/list` - Get all classes
- `POST /api/admin/class/create` - Create class
- `PUT /api/admin/class/<class_id>` - Update class
- `DELETE /api/admin/class/<class_id>` - Delete class
- `GET /api/admin/users?role=teacher` - Get teachers list
- `GET /api/admin/batches` - Get batches list

**UI Components:**
- Form inputs for class details
- Date/time pickers
- Teacher dropdown
- Batch selector
- Class list cards

#### 11. AddStudentFaceScreen.js
**Purpose:** Enroll student face for recognition  
**Key Features:**
- Photo capture/upload
- Face validation feedback
- Student selection
- Enrollment status tracking
- Multiple photo capture for better accuracy

**API Calls:**
- `GET /api/student/list` - Get students list
- `POST /api/attendance/scan` - Validate and enroll face

**UI Components:**
- Camera view
- Photo gallery
- Student selector
- Validation feedback
- Progress indicator

#### 12. ManageBatchesScreen.js
**Purpose:** Create and manage student batches  
**Key Features:**
- Batch creation
- Student addition to batches
- Batch list with student counts
- Batch enrollment in classes

**API Calls:**
- `GET /api/admin/batches` - Get all batches
- `POST /api/admin/batches` - Create batch
- `GET /api/admin/batches/<batch_id>` - Get batch details
- `POST /api/admin/batches/<batch_id>/students` - Add students to batch

**UI Components:**
- Batch cards
- Student selector
- Create batch form
- Student count display

#### 13. ManageBatchDetailScreen.js
**Purpose:** Manage students within a batch  
**Key Features:**
- View batch students
- Add/remove students
- Batch information display
- Enroll batch in classes

**API Calls:**
- `GET /api/admin/batches/<batch_id>` - Get batch details
- `POST /api/admin/batches/<batch_id>/students` - Add students
- `DELETE /api/admin/batches/<batch_id>/students/<student_id>` - Remove student
- `POST /api/admin/classes/<class_id>/enroll-batch` - Enroll batch in class

**UI Components:**
- Student list with remove buttons
- Add student selector
- Class enrollment dropdown
- Batch info header

#### 14. AdminWaiversScreen.js
**Purpose:** Review and manage excuse requests  
**Key Features:**
- Pending excuse requests list
- Approve/Reject functionality
- Request details display
- Student information
- Session information

**API Calls:**
- `GET /api/excuse/pending` - Get pending excuses
- `PUT /api/excuse/decide/<request_id>` - Approve/reject excuse

**UI Components:**
- Waiver request cards
- Approve/Reject buttons
- Student and session info
- Reason display

#### 15. SendAlertsScreen.js
**Purpose:** Send notifications to users  
**Key Features:**
- Recipient selection (students/teachers/all)
- Message composition
- Notification type selection
- Send confirmation

**API Calls:**
- `GET /api/admin/users` - Get users list
- `POST /api/admin/send-notification` - Send notification

**UI Components:**
- Recipient selector
- Message input
- Type dropdown
- Send button

#### 16. ExportReportsScreen.js
**Purpose:** Generate and export attendance reports  
**Key Features:**
- Date range selection
- Class selection
- Report type selection
- CSV/PDF export
- Summary statistics

**API Calls:**
- `GET /api/admin/class/list` - Get classes
- `GET /api/attendance/report/<class_id>` - Get class report
- `GET /api/attendance/analytics` - Get analytics

**UI Components:**
- Date range picker
- Class dropdown
- Report type selector
- Export buttons
- Summary cards

#### 17. TeacherClassesScreen.js
**Purpose:** View and manage teacher's classes  
**Key Features:**
- Class list with schedule information
- Session status display
- Start session button
- Student count display
- Schedule enforcement indicators

**API Calls:**
- `GET /api/session/classes` - Get teacher's classes

**UI Components:**
- Class cards with schedule info
- Status badges (ongoing/ready/ended)
- Start session buttons
- Student count display

#### 18. TeacherReportsScreen.js
**Purpose:** View teacher's attendance reports  
**Key Features:**
- Class selection
- Attendance summary
- Student-wise breakdown
- Export options
- Date range filter

**API Calls:**
- `GET /api/session/classes` - Get teacher's classes
- `GET /api/attendance/report/<class_id>` - Get class report

**UI Components:**
- Class selector
- Summary cards
- Student list with attendance
- Export buttons

#### 19. ProfileScreen.js
**Purpose:** User profile management  
**Key Features:**
- Profile information display
- Edit profile functionality
- Password change
- Dark mode toggle
- Logout

**API Calls:**
- `GET /api/auth/me` - Get current user
- `PUT /api/admin/user/<user_id>` - Update user profile

**UI Components:**
- Profile card with avatar
- Editable fields
- Dark mode toggle
- Logout button

#### 20. TeacherProfileScreen.js
**Purpose:** Teacher-specific profile  
**Key Features:**
- Teacher information display
- Assigned classes list
- Teaching statistics
- Profile editing

**API Calls:**
- `GET /api/auth/me` - Get teacher profile
- `GET /api/session/classes` - Get assigned classes

**UI Components:**
- Profile header
- Classes list
- Statistics cards
- Edit form

#### 21. AdminSettingsScreen.js
**Purpose:** System settings management  
**Key Features:**
- Attendance threshold configuration
- System timezone setting
- Notification settings
- Firebase configuration
- System information display

**API Calls:**
- Various settings endpoints (if implemented)

**UI Components:**
- Settings forms
- Toggle switches
- Input fields
- Save buttons

#### 22. ClassesScreen.js
**Purpose:** Student's enrolled classes list  
**Key Features:**
- Class list with schedule
- Attendance status per class
- Teacher information
- Room and time display

**API Calls:**
- `GET /api/student/classes` - Get student's classes

**UI Components:**
- Class cards
- Schedule information
- Attendance badges
- Teacher names

#### 23. NotificationsScreen.js
**Purpose:** Display user notifications  
**Key Features:**
- Notification list
- Read/unread status
- Notification types
- Mark as read functionality
- Delete notifications

**API Calls:**
- `GET /api/notifications/my-notifications` - Get notifications
- `POST /api/notifications/mark-read` - Mark as read

**UI Components:**
- Notification cards
- Type icons
- Read/unread indicators
- Timestamp display

### Navigation Components

#### BottomNav.js (Student)
**Purpose:** Student bottom navigation  
**Tabs:**
- Home
- Classes
- History
- Waiver
- Profile

#### AdminBottomNav.js (Admin)
**Purpose:** Admin bottom navigation  
**Tabs:**
- Home
- Schedule
- Waivers
- Batches
- Settings

#### TeacherBottomNav.js (Teacher)
**Purpose:** Teacher bottom navigation  
**Tabs:**
- Home
- Classes
- Reports
- Profile

---

## 7. AI/ML Face Recognition System

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

#### 1. Image Preprocessing
**File:** `services/face_recognition/preprocess.py`

**Input:** Raw BGR image from camera

**Operations:**
- Histogram equalization for lighting normalization
- Noise reduction using Gaussian blur
- Color space normalization
- Resolution optimization (max 640px width)

**Output:** Preprocessed image ready for face detection

#### 2. Face Detection
**File:** `services/face_recognition/detector.py`

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

#### 3. Face Cropping
**Input:** Image + face bounding box

**Operations:**
- Extract face region with padding (10%)
- Resize to FaceNet input size (160x160)
- Aspect ratio preservation

#### 4. Embedding Generation
**File:** `services/face_recognition/recognizer.py`

**Input:** Cropped face image

**Operations:**
- FaceNet model inference
- 128-dimensional embedding generation
- Normalization

**Output:** Face embedding vector

#### 5. Similarity Matching
**Input:** New embedding + stored embeddings

**Operations:**
- Cosine distance calculation
- Threshold comparison (0.40)
- Best match selection

**Output:** Student ID or "unknown"

### Face Enrollment Process
**File:** `services/face_recognition/enroll.py`

**Steps:**
1. Capture multiple images of student's face
2. Detect and crop faces from each image
3. Generate embeddings for each face
4. Average embeddings to create robust representation
5. Save as .npy file with student's roll_number as filename
6. Update labels.json mapping

**Storage Structure:**
```
services/face_recognition/embeddings/
├── labels.json              # Mapping: filename → student info
├── BCA-2024-001.npy        # Student embeddings
├── BCA-2024-002.npy
└── ...
```

### Recognition During Attendance
**File:** `routes/attendance.py` - `/api/attendance/scan` endpoint

**Flow:**
1. Receive image frame from mobile app
2. Preprocess image
3. Detect faces
4. For each detected face:
   - Crop face
   - Generate embedding
   - Compare with stored embeddings
   - Find best match below threshold
5. Log attendance event (ENTRY/EXIT)
6. Return recognition result

**Cooldown Mechanism:**
- Default: 15 seconds between logs for same student
- Prevents duplicate attendance logs
- Configurable via environment variable

### Multi-Face Detection
**Enhancement:** Support for detecting multiple faces in single frame

**Logic:**
1. Detect all faces in frame
2. Process each face independently
3. Return multiple recognition results
4. Log attendance for all recognized students
5. Display combined result in UI

### Performance Optimizations
1. **Image Resizing:** Frontend resizes to 720px width before upload
2. **Frame Skipping:** Scans every 2 seconds (configurable)
3. **Embedding Caching:** Stored embeddings loaded once on startup
4. **Async Processing:** Firebase sync in background thread
5. **Cooldown:** Prevents redundant processing

### Error Handling
- No face detected → Return "no_face" status
- Face not recognized → Return "unknown" status
- Cooldown active → Return "cooldown" status
- Processing error → Return "error" status with details

---

## 8. Frontend-Backend API Connections

### Authentication Flow
```
LoginScreen → POST /api/auth/login
           ← JWT token + user info
           → Save to AuthContext
           → Navigate to role-specific dashboard
```

### Student Flow
```
HomeScreen → GET /api/notifications/unread-count
          → GET /api/attendance/history (for recent status)
          → GET /api/attendance/analytics (for overall %)

AttendanceHistoryScreen → GET /api/attendance/history

SubmitWaiverScreen → GET /api/attendance/history (to get absent sessions)
                  → POST /api/excuse/submit

WaiverStatusScreen → GET /api/excuse/history/<student_id>

StudentAnalyticsScreen → GET /api/attendance/analytics

ClassesScreen → GET /api/student/classes

ProfileScreen → GET /api/auth/me
             → PUT /api/admin/user/<user_id>

NotificationsScreen → GET /api/notifications/my-notifications
                    → POST /api/notifications/mark-read
```

### Teacher Flow
```
TeacherDashboardScreen → GET /api/session/my-sessions
                      → GET /api/notifications/unread-count

TeacherClassesScreen → GET /api/session/classes

StartClassScreen → POST /api/session/start
                → GET /api/session/status/<session_id>
                → POST /api/attendance/scan (repeated)
                → POST /api/session/end

TeacherReportsScreen → GET /api/session/classes
                     → GET /api/attendance/report/<class_id>

TeacherProfileScreen → GET /api/auth/me
                     → GET /api/session/classes
```

### Admin Flow
```
AdminDashboardScreen → GET /api/admin/stats
                    → GET /api/admin/recent-sessions
                    → GET /api/notifications/unread-count

ManageSchedulesScreen → GET /api/admin/class/list
                      → GET /api/admin/users?role=teacher
                      → POST /api/admin/class/create
                      → PUT /api/admin/class/<class_id>
                      → DELETE /api/admin/class/<class_id>

AddStudentFaceScreen → GET /api/student/list
                     → POST /api/attendance/scan (for enrollment)

ManageBatchesScreen → GET /api/admin/batches
                    → POST /api/admin/batches

ManageBatchDetailScreen → GET /api/admin/batches/<batch_id>
                       → POST /api/admin/batches/<batch_id>/students
                       → DELETE /api/admin/batches/<batch_id>/students/<student_id>
                       → POST /api/admin/classes/<class_id>/enroll-batch

AdminWaiversScreen → GET /api/excuse/pending
                   → PUT /api/excuse/decide/<request_id>

SendAlertsScreen → GET /api/admin/users
                 → POST /api/admin/send-notification

ExportReportsScreen → GET /api/admin/class/list
                     → GET /api/attendance/report/<class_id>
                     → GET /api/attendance/analytics

StudentAnalyticsScreen → GET /api/attendance/analytics

AdminSettingsScreen → Various settings endpoints

NotificationsScreen → GET /api/admin/notifications
                    → POST /api/notifications/mark-read
```

### API Call Patterns

#### Standard Fetch Pattern
```javascript
const response = await fetch(API.endpoint, {
  method: 'GET', // or POST, PUT, DELETE
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data) // for POST/PUT
});
const result = await response.json();
```

#### Multipart Form Data (Image Upload)
```javascript
const form = new FormData();
form.append('session_id', sessionId);
form.append('image', { uri: imageUri, type: 'image/jpeg', name: 'frame.jpg' });

const response = await fetch(API.attendanceScan, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: form
});
```

#### Error Handling Pattern
```javascript
if (!response.ok) {
  const error = await response.json();
  Alert.alert('Error', error.error || 'Request failed');
  return;
}
```

### Authentication Headers
All authenticated requests include:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Token Management
- Token stored in AuthContext
- Automatically included in all API calls
- Token validated on each request via middleware
- 24-hour expiry (configurable)
- Auto-logout on token expiry

---

## 9. System Flows & Workflows

### User Registration Flow
```
1. Admin logs in via seed_admin.py
2. Admin creates teacher account via POST /api/auth/register
3. Admin creates student account via POST /api/auth/register
4. Student profile automatically created in students table
5. Face enrollment via AddStudentFaceScreen
6. Student ready for attendance
```

### Class Setup Flow
```
1. Admin creates class via POST /api/admin/class/create
2. Admin assigns teacher to class
3. Admin creates batch via POST /api/admin/batches
4. Admin adds students to batch
5. Admin enrolls batch in class via POST /api/admin/classes/<id>/enroll-batch
6. Class ready for attendance sessions
```

### Attendance Session Flow
```
1. Teacher views classes via GET /api/session/classes
2. Teacher starts session via POST /api/session/start
   - Creates session record
   - Creates attendance_records for all enrolled students (status=Absent)
   - Returns enrolled students list
3. Teacher opens StartClassScreen
4. Camera captures frames every 2 seconds
5. Frames sent to POST /api/attendance/scan
6. Face recognition identifies students
7. Attendance logs created (ENTRY/EXIT events)
8. Real-time UI updates with detected students
9. Teacher ends session via POST /api/session/end
   - Calculates final attendance for all students
   - Updates attendance_records status
   - Sends push notifications to absent students
   - Syncs to Firebase
```

### Excuse Request Flow
```
1. Student views attendance history
2. Student sees "Absent" status
3. Student submits excuse via POST /api/excuse/submit
   - Validates student was absent
   - Creates waiver_request record
   - Sends notification to admins
4. Admin views pending excuses via GET /api/excuse/pending
5. Admin reviews request
6. Admin decides via PUT /api/excuse/decide/<id>
   - If approved: updates attendance_record to Present
   - Sends notification to student
7. Student views updated status
```

### Attendance Calculation Flow
```
1. Session ends
2. Attendance engine fetches all attendance_logs for session
3. For each student:
   a. Pair ENTRY/EXIT events chronologically
   b. Calculate duration between pairs
   c. Handle unpaired ENTRY (use session end time)
   d. Sum total duration
   e. Compare with threshold (mode × session duration)
   f. Set status: Present (≥ threshold) or Absent (< threshold)
4. Update attendance_records
5. Return summary statistics
```

### Face Recognition Flow
```
1. Camera captures frame
2. Frontend resizes to 720px width
3. Frame sent to POST /api/attendance/scan
4. Backend preprocesses image
5. MTCNN detects faces
6. For each face:
   a. Crop face region
   b. Generate FaceNet embedding
   c. Compare with stored embeddings
   d. Find best match (cosine distance < 0.40)
   e. Return student ID or "unknown"
7. Check enrollment in class
8. Check cooldown period
9. Determine event type (ENTRY/EXIT toggle)
10. Create attendance_log
11. Return result to frontend
12. Frontend updates UI
```

### Notification Flow
```
1. Event occurs (session end, excuse submitted, etc.)
2. Backend creates notification record
3. Backend attempts FCM push notification
   - Reads device_token from users table
   - Sends via Firebase Cloud Messaging
4. Frontend receives push (if app in background)
5. Frontend fetches notifications via GET /api/notifications/my-notifications
6. Frontend displays notification list
7. User marks as read via POST /api/notifications/mark-read
8. Backend updates notification.read = true
```

### Firebase Sync Flow
```
1. Event occurs in SQLite
2. Backend attempts Firebase sync (try/except)
3. If successful:
   - Data pushed to Firebase Realtime Database
   - Path: /sessions/{id}, /attendance/{id}, etc.
4. If failed:
   - Error logged
   - System continues with SQLite only
5. Frontend can optionally subscribe to Firebase for real-time updates
```

### Schedule Enforcement Flow
```
1. Teacher views classes via GET /api/session/classes
2. Backend checks schedule_status for each class:
   a. If no scheduled_date → "unscheduled"
   b. If scheduled_date > today → "future_date"
   c. If scheduled_date = today:
      - If before scheduled_time - 15min → "not_started"
      - If within time window → "ready"
      - If after scheduled_end_time → "ended_today"
   d. If scheduled_date < today → "ended"
3. Frontend displays appropriate status badge
4. Start button only enabled when status = "ready"
5. Session start validates schedule on backend
```

---

## 10. Configuration & Deployment

### Environment Variables

#### Backend (.env)
```env
SECRET_KEY=your-secret-key-here
SQLALCHEMY_DATABASE_URI=sqlite:///attendance.db
JWT_EXPIRY_HOURS=24
STRICT_MODE_THRESHOLD=0.80
ACTIVITY_MODE_THRESHOLD=0.55
SCAN_COOLDOWN_SECONDS=15
SERVER_TIMEZONE=Asia/Kathmandu
SESSION_START_BUFFER_MINUTES=15

# Firebase (optional)
FIREBASE_CREDENTIALS_PATH=./firebase_credentials.json
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

#### Frontend (.env)
```env
EXPO_PUBLIC_API_BASE_URL=http://10.200.29.152:5000
```

### Docker Deployment

#### docker-compose.yml
```yaml
version: '3.8'
services:
  backend:
    build: ./Backend Sajak/backend
    ports:
      - "5000:5000"
    volumes:
      - ./Backend Sajak/backend/backend/database:/app/database
      - ./Backend Sajak/backend/backend/services/face_recognition/embeddings:/app/services/face_recognition/embeddings
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - SQLALCHEMY_DATABASE_URI=sqlite:///database/attendance.db
    restart: unless-stopped
```

#### Dockerfile (Backend)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:create_app()"]
```

### Local Development Setup

#### Backend Setup
```bash
cd "Backend Sajak/backend/backend"
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python seed_admin.py
python app.py
```

#### Frontend Setup
```bash
cd AttendanceApp
npm install
npm start  # or expo start
```

### Production Deployment

#### Backend (Gunicorn)
```bash
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

#### Frontend (Expo)
```bash
expo build:android
expo build:ios
```

### Database Backup
```bash
# Backup
cp database/attendance.db database/attendance.db.backup

# Restore
cp database/attendance.db.backup database/attendance.db
```

### Face Embeddings Backup
```bash
# Backup
tar -czf embeddings-backup.tar.gz services/face_recognition/embeddings/

# Restore
tar -xzf embeddings-backup.tar.gz -C services/face_recognition/
```

### Health Checks
```bash
# Check backend health
curl http://localhost:5000/health

# Check database
sqlite3 database/attendance.db ".tables"
```

### Troubleshooting

#### Common Issues

1. **Connection Refused**
   - Check backend is running
   - Verify BASE_URL in api.js
   - Ensure same network (for mobile)

2. **Face Recognition Not Working**
   - Verify embeddings exist in services/face_recognition/embeddings/
   - Check labels.json is valid
   - Ensure face_label matches embedding filename

3. **Attendance Not Calculating**
   - Check attendance_logs exist for session
   - Verify session has end_time
   - Review attendance_engine.py logs

4. **Notifications Not Sending**
   - Verify Firebase credentials
   - Check device_token is set
   - Review FCM configuration

5. **Schedule Enforcement Issues**
   - Check SERVER_TIMEZONE
   - Verify scheduled_date, scheduled_time are set
   - Review SESSION_START_BUFFER_MINUTES

---

## Appendix

### Quick Reference Commands

```bash
# Start backend
cd "Backend Sajak/backend/backend"
python app.py

# Seed admin
python seed_admin.py

# Start frontend
cd AttendanceApp
npm start

# Build frontend
expo build:android

# Run tests
python -m pytest tests/

# Database shell
sqlite3 database/attendance.db
```

### Important File Locations

- **Backend Config:** `Backend Sajak/backend/backend/config.py`
- **API Endpoints:** `Backend Sajak/backend/backend/routes/`
- **Database Models:** `Backend Sajak/backend/backend/models/`
- **Face Recognition:** `Backend Sajak/backend/backend/services/face_recognition/`
- **Frontend API:** `AttendanceApp/api.js`
- **Frontend Screens:** `AttendanceApp/screens/`
- **Navigation:** `AttendanceApp/App.js`

### Default Credentials

**Admin (seeded):**
- Email: admin@mytimes.com
- Password: admin123

### Support & Documentation

- **Backend Docs:** `Backend Sajak/backend/backend/README.md`
- **API Reference:** `Backend Sajak/backend/backend/Endpoints.md`
- **Project Flow:** `Backend Sajak/backend/backend/PROJECT_FLOW.md`
- **Admin Guide:** `Backend Sajak/backend/backend/ADMIN_GUIDE.md`

---

**Document Version:** 1.0  
**Last Updated:** July 2026  
**Maintained By:** Development Team
