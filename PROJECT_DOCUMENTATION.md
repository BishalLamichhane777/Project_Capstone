# myTIMeS - Smart Attendance System
## Complete Project Documentation

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [AI/ML Integration](#aiml-integration)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Project Flaws & Issues](#project-flaws--issues)
9. [Setup & Deployment](#setup--deployment)

---

## Project Overview

**myTIMeS** is an AI-powered attendance management system that uses face recognition to automatically track student attendance in educational institutions. The system consists of a React Native mobile application, a Flask-based backend API, and sophisticated face recognition capabilities using DeepFace and MTCNN.

### Key Features
- **Automated Face Recognition**: Real-time attendance tracking using AI
- **Multi-Role Support**: Admin, Teacher, and Student interfaces
- **Batch Management**: Group students for bulk class enrollment
- **Waiver System**: Students can submit absence excuses with admin approval workflow
- **Real-time Analytics**: Attendance statistics, trends, and at-risk student identification
- **Notification System**: In-app alerts for attendance status and waiver decisions
- **Export Reports**: Generate attendance reports for administrative purposes

### Technology Stack

**Frontend:**
- React Native with Expo
- React Navigation for navigation
- Lucide React Native for icons
- Expo Camera for face scanning
- Context API for state management

**Backend:**
- Flask (Python web framework)
- SQLAlchemy ORM with SQLite database
- Flask-Login for authentication
- Flask-CORS for cross-origin requests

**AI/ML:**
- DeepFace (FaceNet model for face embeddings)
- MTCNN for face detection
- OpenCV for image processing
- NumPy for numerical computations
- Adaptive thresholding for recognition accuracy

---

## Project Structure

```
Project_Capstone/
├── AttendanceApp/                 # React Native Frontend
│   ├── screens/                  # 24 screen components
│   ├── components/               # Reusable UI components
│   ├── context/                  # Authentication context
│   ├── App.js                    # Main navigation setup
│   ├── api.js                    # API endpoint configuration
│   └── package.json              # Frontend dependencies
│
├── Backend Sajak/backend/backend/ # Flask Backend
│   ├── models/                   # SQLAlchemy database models
│   ├── routes/                   # API route handlers
│   ├── services/                 # Business logic & AI services
│   │   ├── face_recognition/     # Face recognition pipeline
│   │   ├── attendance_engine.py # Attendance calculation logic
│   │   ├── notifications.py      # Notification service
│   ├── middleware/               # Custom middleware
│   ├── admin/                    # Flask-Admin panel
│   ├── templates/                # Admin panel templates
│   ├── tests/                    # Unit tests
│   ├── app.py                    # Flask application factory
│   ├── config.py                 # Configuration management
│   ├── database.py               # SQLAlchemy instance
│   └── requirements.txt          # Python dependencies
│
├── docker-compose.yml            # Docker orchestration
├── .env                          # Environment variables
└── .gitignore                    # Git ignore patterns
```

---

## Frontend Architecture

### Navigation Structure

The app uses React Navigation with a stack navigator, organized by user role:

**Auth Flow:**
- `Login` → Role-based dashboard navigation

**Student Screens:**
- `Home` - Dashboard with attendance overview
- `SubmitWaiver` - Submit absence excuses
- `AttendanceHistory` - View attendance records
- `Classes` - View enrolled classes
- `WaiverStatus` - Track waiver request status
- `Profile` - Student profile management
- `Notifications` - View alerts and messages

**Admin Screens:**
- `AdminDashboard` - Overview with statistics and quick actions
- `AdminWaivers` - Review and approve/reject waivers
- `ManageSchedules` - Class scheduling management
- `AddStudentFace` - Enroll student faces for recognition
- `StudentAnalytics` - Attendance analytics and at-risk students
- `AdminSettings` - System configuration
- `SendAlerts` - Broadcast notifications
- `ExportReports` - Generate attendance reports (CSV / Excel / PDF)
- `ManageBatches` - Create and manage student batches
- `ManageBatchDetail` - Batch-specific student management
- `ManageStudents` - Student CRUD operations
- `ManageTeachers` - Teacher CRUD + soft-deactivate/reactivate *(new)*
- `BatchOverview` - Drill-down analytics: batch-level summary with export *(new)*
- `ClassList` - Drill-down analytics: classes within a batch *(new)*
- `ClassDetail` - Drill-down analytics: student roster with search/filter/sort/export *(new)*
- `StudentDetail` - Drill-down analytics: per-student attendance breakdown + export *(new)*

**Teacher Screens:**
- `TeacherDashboard` - Teacher-specific overview
- `StartClass` - Live face recognition attendance session
- `TeacherClasses` - View assigned classes
- `TeacherReports` - Class attendance reports
- `TeacherProfile` - Teacher profile management

### Screen Details

#### 1. LoginScreen
**Purpose**: Authentication entry point with role selection

**Features**:
- Three role options: Student, Teacher, Admin
- Role-specific UI theming and navigation
- Email/password authentication
- 10-second connection timeout
- Role validation against backend response
- Connection error handling with troubleshooting hints

**Key Components**:
- Role toggle buttons with icons
- Dynamic banner based on selected role
- Password visibility toggle
- Loading states and error alerts

**API Integration**:
- `POST /api/auth/login`
- Validates role match between selection and backend

---

#### 2. HomeScreen (Student)
**Purpose**: Student dashboard with attendance overview

**Features**:
- Circular progress indicator showing overall attendance percentage
- "Good Standing" badge for attendance above threshold
- Quick actions for waiver submission and status viewing
- Weekly attendance trend bar chart
- Recent attendance status cards
- Notification bell with unread count badge
- Dark mode support

**Data Display**:
- Overall attendance percentage (e.g., 82%)
- Weekly trend visualization (Mon-Fri)
- Recent class attendance with status (Present/Absent)
- Unread notification count

**API Integration**:
- `GET /api/notifications/unread-count`

---

#### 3. AdminDashboardScreen
**Purpose**: Administrative overview with system statistics

**Features**:
- Real-time statistics grid (Total Students, Present Today, Absent Today, Waivers Pending) — all live from API
- Quick action grid (10 actions for common admin tasks)
- At-risk students list — **live data** from `GET /api/admin/dashboard/at-risk-students`; shows clean empty state ("No at-risk students right now") when none exist
- Recent sessions list with present/absent counts
- Pull-to-refresh functionality
- Notification badge and logout

**Quick Actions** (Admin Dashboard):
- Manage Schedules
- Student Analytics
- Batch Analytics *(drill-down entry point)*
- Add Student Face
- Manage Students
- Manage Teachers
- Review Waivers
- Export Reports
- Send Alerts
- Manage Batches

**API Integration**:
- `GET /api/admin/stats` — total_students, present_today, absent_today, waivers_pending, sessions_today, attendance_rate
- `GET /api/admin/recent-sessions`
- `GET /api/admin/dashboard/at-risk-students` — top at-risk students across all classes
- `GET /api/notifications/unread-count`

**Note**: Previously contained two hardcoded fake-data arrays (`atRiskStudents`, `weekData`) and a duplicate "Today's Overview" card. All removed — screen now shows only real API data.

---

#### 4. StartClassScreen (Teacher)
**Purpose**: Live face recognition attendance session

**Features**:
- Real-time camera feed with face detection
- Session timer showing elapsed time
- Live/Standby status indicator
- Face recognition overlay with student identification
- Multi-face recognition support
- Entry/Exit event tracking
- Detected students list with confidence scores
- Not-yet-detected students list
- Stats row (Detected, Not Yet, Total, Attendance %)
- Image optimization (720px resize before upload)
- Scan cooldown to prevent duplicate events
- Session state persistence (restore active sessions)

**Recognition Pipeline**:
1. Capture photo every 2 seconds
2. Resize to 720px width
3. Upload to backend
4. Backend performs face detection and recognition
5. Display recognition results with overlay
6. Update detected students list

**API Integration**:
- `POST /api/session/start` - Initialize attendance session
- `POST /api/attendance/scan` - Upload frame for recognition
- `GET /api/session/status/{session_id}` - Restore active session
- `POST /api/session/end` - Finalize attendance

**UI Components**:
- Camera box with corner decorations
- Pulsing dot indicator
- Scan line animation
- Recognition flash overlay (green)
- Status messages rotation
- Detected student rows with avatars
- Entry/Exit badges

---

#### 5. Other Key Screens

**SubmitWaiverScreen**:
- File upload for supporting documents
- Reason text input
- Session selection for absence
- Waiver submission to backend

**AttendanceHistoryScreen**:
- Historical attendance records
- Filter by date range
- Status indicators (Present/Absent/Partial)
- Duration tracking

**ManageSchedulesScreen**:
- Class creation and editing
- Time and date scheduling
- Teacher assignment
- Room allocation
- Duration configuration

**AddStudentFaceScreen**:
- Student face enrollment
- Multiple photo upload
- Real-time photo preview
- Enrollment status feedback
- Face quality validation

**StudentAnalyticsScreen**:
- At-risk student identification
- Attendance percentage calculation
- Subject-wise breakdown
- Risk level categorization (High/Mid)

**ExportReportsScreen**:
- Report generation options
- Date range selection
- Class/student filters
- Export format selection

---

### Frontend Components

#### BottomNav (Student)
- Home, Classes, Profile, Notifications tabs
- Active tab highlighting
- Icon-based navigation

#### AdminBottomNav
- Home, Students, Classes, Settings tabs
- Admin-specific navigation

#### TeacherBottomNav
- Dashboard, Classes, Reports, Profile tabs
- Teacher-specific navigation

---

### Authentication Context

**AuthContext.js** provides:
- `loginState(token, user)` - Store authentication data
- `logoutState()` - Clear authentication data
- `user` - Current user object
- `token` - JWT authentication token
- `isDarkMode` - Theme preference

---

## Backend Architecture

### Application Factory Pattern

The backend uses Flask's application factory pattern in `app.py`:

**Initialization Steps**:
1. Create Flask app instance
2. Load configuration from environment variables
3. Initialize extensions (SQLAlchemy, CORS)
4. Initialize Flask-Admin panel
5. Register blueprints (API routes)
7. Create database tables
8. Validate face embedding consistency
9. Register global error handlers

### Configuration Management

**config.py** manages environment-based configuration:

**Key Settings**:
- `SECRET_KEY` - Flask session encryption
- `SQLALCHEMY_DATABASE_URI` - Database connection (SQLite default)
- `JWT_EXPIRY_HOURS` - Token expiration (24 hours default)
- `STRICT_MODE_THRESHOLD` - Face recognition threshold (0.80)
- `ACTIVITY_MODE_THRESHOLD` - Activity mode threshold (0.55)
- `CORS_ORIGINS` - Allowed CORS origins
- `SCAN_COOLDOWN_SECONDS` - Duplicate scan prevention (15 seconds)
- `SERVER_TIMEZONE` - Server timezone (Asia/Kathmandu default)
- `SESSION_START_BUFFER_MINUTES` - Early start allowance (15 minutes)

---

### Database Models

#### 1. User Model
**Table**: `users`

**Fields**:
- `id` (Integer, Primary Key) - User identifier
- `fullname` (String 150) - Full name
- `email` (String 255, Unique) - Email address
- `password_hash` (String 255) - Bcrypt hashed password
- `role` (String 20) - 'admin' | 'teacher' | 'student'
- `phone` (String 30, Nullable) - Phone number
- `device_token` (String 512, Nullable) - FCM push token
- `is_active` (Boolean, Default True) - Soft-delete flag; deactivated users cannot log in *(new)*
- `created_at` (DateTime) - Account creation timestamp

**Relationships**:
- `student_profile` - One-to-One with Student
- `notifications` - One-to-Many with Notification

**Valid Roles**: admin, teacher, student

---

#### 2. Student Model
**Table**: `students`

**Fields**:
- `student_id` (Integer, Primary Key) - Student identifier
- `user_id` (Integer, Foreign Key) - Link to User
- `roll_number` (String 50, Unique) - Academic roll number
- `program` (String 100) - Academic program (e.g., BCA)
- `year_of_study` (Integer, Nullable) - Current year
- `face_label` (String 50, Unique, Nullable) - Face recognition label

**Relationships**:
- `user` - Many-to-One with User
- `enrollments` - One-to-Many with Enrollment
- `attendance_logs` - One-to-Many with AttendanceLog
- `attendance_records` - One-to-Many with AttendanceRecord
- `waiver_requests` - One-to-Many with WaiverRequest
- `batches` - One-to-Many with BatchStudent

---

#### 3. AttendanceLog Model
**Table**: `attendance_logs`

**Fields**:
- `log_id` (Integer, Primary Key) - Log identifier
- `student_id` (Integer, Foreign Key) - Student reference
- `session_id` (String 36, Foreign Key) - Session reference
- `event_type` (String 10) - 'ENTRY' | 'EXIT'
- `timestamp` (DateTime) - Event timestamp
- `confidence_score` (Float, Nullable) - Recognition confidence

**Relationships**:
- `student` - Many-to-One with Student
- `session` - Many-to-One with Session

**Purpose**: Tracks individual entry/exit events during a session

---

#### 4. AttendanceRecord Model
**Table**: `attendance_records`

**Fields**:
- `record_id` (Integer, Primary Key) - Record identifier
- `student_id` (Integer, Foreign Key) - Student reference
- `session_id` (String 36, Foreign Key) - Session reference
- `total_duration_seconds` (Float, Default 0) - Total time present
- `threshold_required` (Float, Nullable) - Required duration threshold
- `status` (String 10, Default 'Absent') - 'Present' | 'Absent' | 'Partial'
- `finalized_at` (DateTime, Nullable) - Finalization timestamp

**Constraints**:
- Unique constraint on (student_id, session_id)

**Relationships**:
- `student` - Many-to-One with Student
- `session` - Many-to-One with Session

**Purpose**: Finalized attendance summary per student per session

---

#### 5. Class Model
**Table**: `classes`

**Fields**:
- `class_id` (Integer, Primary Key) - Class identifier
- `class_name` (String 150) - Class name
- `subject` (String 150) - Subject name
- `room` (String 50, Nullable) - Room number
- `teacher_id` (Integer, Foreign Key, Nullable) - Assigned teacher
- `schedule_time` (DateTime, Nullable) - Legacy schedule field
- `duration_minutes` (Integer) - Class duration
- `scheduled_date` (Date, Nullable) - Scheduled date
- `scheduled_time` (Time, Nullable) - Start time
- `scheduled_end_time` (Time, Nullable) - End time

**Relationships**:
- `teacher` - Many-to-One with User
- `enrollments` - One-to-Many with Enrollment
- `sessions` - One-to-Many with Session

---

#### 6. Enrollment Model
**Table**: `enrollments`

**Fields**:
- `enrollment_id` (Integer, Primary Key) - Enrollment identifier
- `student_id` (Integer, Foreign Key) - Student reference
- `class_id` (Integer, Foreign Key) - Class reference
- `enrolled_at` (DateTime) - Enrollment timestamp

**Constraints**:
- Unique constraint on (student_id, class_id)

**Relationships**:
- `student` - Many-to-One with Student
- `class_` - Many-to-One with Class

**Purpose**: Links students to classes

---

#### 7. Session Model
**Table**: `sessions`

**Fields**:
- `session_id` (String 36, Primary Key) - UUID identifier
- `class_id` (Integer, Foreign Key) - Class reference
- `teacher_id` (Integer, Foreign Key) - Teacher reference
- `mode` (String 20) - 'Strict' | 'Activity'
- `start_time` (DateTime) - Session start
- `end_time` (DateTime, Nullable) - Session end
- `status` (String 10, Default 'ACTIVE') - 'ACTIVE' | 'CLOSED'
- `threshold_percent` (Float, Nullable) - Attendance threshold

**Relationships**:
- `class_` - Many-to-One with Class
- `teacher` - Many-to-One with User
- `attendance_logs` - One-to-Many with AttendanceLog
- `attendance_records` - One-to-Many with AttendanceRecord

**Purpose**: Represents a live or closed attendance session

---

#### 8. WaiverRequest Model
**Table**: `waiver_requests`

**Fields**:
- `request_id` (Integer, Primary Key) - Request identifier
- `student_id` (Integer, Foreign Key) - Student reference
- `session_id` (String 36, Foreign Key) - Session reference
- `reason` (Text) - Absence reason
- `supporting_doc_path` (String 512, Nullable) - Document file path
- `status` (String 20, Default 'Pending') - 'Pending' | 'Approved' | 'Rejected'
- `submitted_at` (DateTime) - Submission timestamp
- `reviewed_at` (DateTime, Nullable) - Review timestamp

**Relationships**:
- `student` - Many-to-One with Student
- `session` - Many-to-One with Session

**Purpose**: Student absence excuse requests

---

#### 9. Notification Model
**Table**: `notifications`

**Fields**:
- `notif_id` (Integer, Primary Key) - Notification identifier
- `user_id` (Integer, Foreign Key) - User reference
- `type` (String 20) - 'Absent' | 'Waiver' | 'General'
- `message` (Text) - Notification message
- `is_read` (Boolean, Default False) - Read status
- `sent_at` (DateTime) - Sent timestamp (UTC ISO 8601)

**Relationships**:
- `user` - Many-to-One with User

**Purpose**: In-app notifications and push tracking

---

#### 10. Batch Model
**Table**: `batches`

**Fields**:
- `batch_id` (Integer, Primary Key) - Batch identifier
- `batch_name` (String 150) - Batch name
- `description` (String 500, Nullable) - Batch description
- `created_at` (DateTime) - Creation timestamp

**Relationships**:
- `batch_students` - One-to-Many with BatchStudent
- `batch_class_links` - One-to-Many with BatchClassLink

**Properties**:
- `student_count` - Count of enrolled students

**Purpose**: Group students for bulk class enrollment

---

#### 11. BatchStudent Model
**Table**: `batch_students`

**Fields**:
- `batch_id` (Integer, Foreign Key, Primary Key) - Batch reference
- `student_id` (Integer, Foreign Key, Primary Key) - Student reference
- `added_at` (DateTime) - Addition timestamp

**Constraints**:
- Composite primary key on (batch_id, student_id)

**Relationships**:
- `batch` - Many-to-One with Batch
- `student` - Many-to-One with Student

**Purpose**: Many-to-Many relationship between batches and students

---

#### 12. BatchClassLink Model
**Table**: `batch_class_links`

**Fields**:
- `link_id` (Integer, Primary Key) - Link identifier
- `batch_id` (Integer, Foreign Key) - Batch reference
- `class_id` (Integer, Foreign Key) - Class reference
- `linked_at` (DateTime) - Link timestamp

**Relationships**:
- `batch` - Many-to-One with Batch
- `class_` - Many-to-One with Class

**Purpose**: Links batches to classes for bulk enrollment

---

### API Routes

#### Authentication Routes (`/api/auth`)

**POST `/api/auth/login`**
- Authenticates user with email/password
- Returns JWT token and user info
- Validates role against frontend selection

**POST `/api/auth/register`**
- Registers new users (admin only)
- Supports admin, teacher, student roles
- Student registration requires roll_number and program
- Creates User and Student records

**GET `/api/auth/me`**
- Returns current user profile
- Includes student_profile for students
- Requires valid JWT token

---

#### Session Routes (`/api/session`)

**POST `/api/session/start`**
- Starts a new attendance session (teacher only)
- Requires class_id and mode ('Strict' | 'Activity')
- Returns session_id and enrolled students
- Validates teacher is class owner

**POST `/api/session/end`**
- Ends an active session (teacher only)
- Finalizes attendance records
- Returns attendance summary (present/absent/total)

**GET `/api/session/status/<session_id>`**
- Returns session status and live counts
- Shows enrolled students and attendance status
- Teacher and admin access

**GET `/api/session/class/<class_id>`**
- Returns all sessions for a class
- Includes attendance summaries
- Teacher and admin access

---

#### Attendance Routes (`/api/attendance`)

**GET `/api/attendance/history/<student_id>`**
- Returns attendance history for student
- Students can only view own history
- Includes session details and logs
- Shows status and duration

**GET `/api/attendance/report/<class_id>`**
- Generates class attendance report
- Shows per-student statistics
- Identifies at-risk students (<70% attendance)
- Teacher and admin access

**PUT `/api/attendance/manual-override`**
- Manually override attendance status (admin only)
- Supports 'Present', 'Absent', 'Partial'
- Updates AttendanceRecord

**POST `/api/attendance/scan`**
- Uploads camera frame for face recognition
- Returns recognition results
- Handles multi-face detection
- Applies cooldown to prevent duplicates

---

#### Excuse Routes (`/api/excuse`)

**POST `/api/excuse/submit`**
- Submits absence waiver (student only)
- Requires session_id and reason
- Validates student was absent
- Prevents duplicate submissions

**GET `/api/excuse/pending`**
- Returns pending waiver requests (admin only)
- Includes student and session details

**GET `/api/excuse/history/<student_id>`**
- Returns waiver history for student
- Students can only view own history
- Shows status and review timestamps

**PUT `/api/excuse/decide/<request_id>`**
- Approves or rejects waiver (admin only)
- Updates waiver status and reviewed_at
- Optionally updates attendance record

---

#### Student Routes (`/api/student`)

**GET `/api/student/list`**
- Returns list of all students
- Admin and teacher access
- Now includes `is_active` (from linked User) and `user_id` per student *(updated)*

**GET `/api/student/<student_id>`**
- Returns student details with enrollments
- Admin and teacher access

**PUT `/api/student/enrol/<student_id>`**
- Enrolls student in class (admin only)
- Prevents duplicate enrollments

**DELETE `/api/student/unenrol`**
- Unenrolls student from class (admin only)

**DELETE `/api/student/<student_id>`**
- Deletes student account (admin only)
- Cascades to related records

---

#### Admin Routes (`/api/admin`)

**POST `/api/admin/class/create`**
- Creates new class (admin only)
- Assigns teacher, room, schedule
- Returns class_id

**GET `/api/admin/class/list`**
- Returns list of all classes
- Includes enrolled counts
- Admin and teacher access

**PUT `/api/admin/class/<class_id>`**
- Updates class details (admin only)
- Partial update supported

**DELETE `/api/admin/class/<class_id>`**
- Deletes class (admin only)
- Prevents deletion with active sessions

**DELETE `/api/admin/session/<session_id>`**
- Deletes session (admin only)

**GET `/api/admin/users`**
- Returns list of users (admin only)
- Optional role filter (?role=teacher)

**PUT `/api/admin/user/<user_id>`**
- Updates user fields — fullname, email, phone, password, device_token *(email + password support added)*
- Works for any role (admin, teacher, student)
- Returns full updated user object *(was returning `{"message": "User updated"}` before)*

**PUT `/api/admin/user/<user_id>/deactivate`** *(new)*
- Soft-deletes a user by setting `is_active = False`
- User cannot log in; all class/session/attendance history preserved
- Admin cannot deactivate their own account

**PUT `/api/admin/user/<user_id>/reactivate`** *(new)*
- Re-enables a deactivated user (`is_active = True`)
- User can log in again immediately

**GET `/api/admin/stats`**
- Returns dashboard statistics
- Fields: total_students, present_today, absent_today, waivers_pending, sessions_today, attendance_rate
- Status values use title-case (`'Present'`/`'Absent'`/`'Pending'`) — casing bug fixed (was always returning 0)
- `attendance_rate` defaults to 0 when no sessions held today (was incorrectly defaulting to 100)

**GET `/api/admin/recent-sessions`**
- Returns recent session list
- Includes attendance counts

**GET `/api/admin/dashboard/at-risk-students`** *(new)*
- Returns top N students below 75% attendance threshold across ALL classes
- For students in multiple classes, surfaces the class with the lowest attendance (worst-case)
- Query params: `limit` (default 8, max 20)
- Per-student fields: `student_id`, `fullname`, `roll_number`, `attendance_percent`, `class_name`, `class_id`
- Sorted by lowest attendance first
- Returns empty `students: []` (not an error) when no at-risk students exist
- Uses `AT_RISK_THRESHOLD = 75.0` from `routes/batch.py`

---

#### Batch Routes (`/api/admin/batches`)

**GET `/api/admin/batches`**
- Returns list of all batches with student counts

**POST `/api/admin/batches`**
- Creates new batch (admin only)

**GET `/api/admin/batches/summary`** *(new — step 1)*
- Returns per-batch attendance summary for the Batch Analytics overview
- Fields: `batch_id`, `batch_name`, `student_count`, `class_count`, `average_attendance_percent` (null if no sessions), `at_risk_count`, `at_risk_threshold_percent`

**GET `/api/admin/batches/<id>`**
- Returns batch details with full student list

**PUT `/api/admin/batches/<id>`**
- Updates batch_name and/or description

**DELETE `/api/admin/batches/<id>`**
- Deletes batch only — never touches enrollments

**POST `/api/admin/batches/<id>/students`**
- Adds students to batch; auto-enrolls them into any BatchClassLink-linked classes

**DELETE `/api/admin/batches/<id>/students/<student_id>`**
- Removes student from batch AND unenrolls from all BatchClassLink-linked classes

**GET `/api/admin/batches/<id>/classes/summary`** *(new — step 3)*
- Returns per-class attendance summary for all classes linked to the batch
- Fields: `class_id`, `class_name`, `subject`, `room`, `session_count`, `student_count`, `average_attendance_percent`, `at_risk_count`
- Returns `[]` if batch exists but has no linked classes; 404 if batch not found

**POST `/api/admin/classes/<class_id>/enroll-batch`**
- Bulk-enrolls all batch students into a class
- Also creates a `BatchClassLink` row (permanent sync link)

#### Class Roster Route *(new — step 5)*

**GET `/api/admin/classes/<class_id>/students`**
- Returns enrolled students for a class with per-student attendance stats
- Query params: `search`, `risk` (all/at_risk/good), `sort` (attendance_asc/attendance_desc/name_asc), `page`, `page_size`
- Response includes `total_count`, `class_name`, `subject`, `session_count`, pagination metadata
- Per-student fields: `student_id`, `fullname`, `roll_number`, `session_count`, `present_count`, `absent_count`, `attendance_percent`, `is_at_risk`

#### Student Detail Route *(new — step 7)*

**GET `/api/admin/students/<student_id>/detail`**
- Returns full attendance detail for a single student
- Includes overall stats, per-class breakdown, and last 10 session records
- Session records include `waived: true` flag when an approved WaiverRequest exists for that session
- Returns 404 if student not found

---

#### Notification Routes (`/api/notifications`)

**GET `/api/notifications/my-notifications`**
- Returns user's notifications
- Marks as read after retrieval

**POST `/api/notifications/mark-read`**
- Marks notifications as read

**GET `/api/notifications/unread-count`**
- Returns unread notification count

**POST `/api/admin/send-notification`**
- Sends broadcast notification (admin only)
- Supports role-based targeting

**GET `/api/admin/notifications`**
- Returns admin notifications
- Marks as read after retrieval

---

#### Export Routes (`/api/admin/export-report`)

**POST `/api/admin/export-report`**
- Generates attendance report as file download
- **Formats supported**: CSV, Excel (.xlsx), PDF
- **Existing report types**: `full`, `atrisk`, `class`, `waiver`, `weekly`, `monthly`
- **New scoped report types** *(step 8)*:
  - `batch` — requires `batch_id`; exports all students × all classes in that batch
  - `class_roster` — requires `class_id`; supports optional `risk` and `search` filters (matches what admin sees on screen)
  - `student` — requires `student_id`; exports full class breakdown for that student
- Body params: `report_type`, `format`, `period`, `batch_id`, `class_id`, `student_id`, `risk`, `search`
- Returns binary file with `Content-Disposition: attachment` header
- Missing required scope ID returns HTTP 400 with descriptive message

---

## AI/ML Integration

### Face Recognition Pipeline

The system uses DeepFace with FaceNet model for state-of-the-art face recognition:

#### Architecture Overview

**Old System (LBPH)**:
- Trained LBPH model per student
- Required retraining for new students
- Lower accuracy
- YAML file storage

**New System (DeepFace + FaceNet)**:
- Pre-trained FaceNet model (Google)
- No training required
- 128-dimensional face embeddings
- Higher accuracy
- NumPy file storage

---

#### Enrollment Process

**File**: `services/face_recognition/enroll.py`

**Pipeline**:
1. **Image Quality Check**: Validates image brightness, blur, and face detection
2. **Preprocessing**: Converts to BGR, applies bilateral filter for noise reduction
3. **Face Detection**: MTCNN detects and crops face with 10% padding
4. **Face Resizing**: Resizes crop to 160×160 (FaceNet input size)
5. **Embedding Generation**: DeepFace generates 128-dim embedding
6. **Mean Calculation**: Computes L2-normalized mean of all embeddings
7. **Adaptive Threshold**: Calculates per-student threshold based on embedding variance
8. **Storage**: Saves as `.npz` file (mean + threshold) and legacy `.npy`

**Adaptive Threshold Formula**:
```
threshold = clamp(0.40 + std_dev * 2, min=0.30, max=0.55)
```

- Consistent photos → tighter threshold (e.g., 0.30)
- Variable photos (glasses, lighting) → looser threshold (e.g., 0.55)
- Single photo → default threshold (0.40)

**File Structure**:
```
embeddings/
├── Student_1_data.npz       # New format (mean + threshold)
├── Student_1_mean.npy      # Legacy format (mean only)
├── Student_2_data.npz
├── Student_2_mean.npy
└── labels.json              # Label mapping
```

**Re-enrollment Support**:
- Deletes old files before processing new ones
- Refreshes in-memory cache without restart
- Parallel processing with thread pool (max 3 workers)
- Image downsampling to 640px for efficiency

---

#### Recognition Process

**File**: `services/face_recognition/recognizer.py`

**Pipeline**:
1. **Frame Preprocessing**: Converts to BGR, applies histogram equalization
2. **Face Detection**: MTCNN detects ALL faces in frame
3. **Size Filtering**: Skips faces narrower than 60px (too small for reliable recognition)
4. **Face Cropping**: Crops each face with 10% padding
5. **Embedding Generation**: DeepFace generates embedding per face
6. **Cosine Distance Calculation**: Compares with all student embeddings
7. **Threshold Application**: Applies per-student adaptive threshold
8. **Result Compilation**: Returns list of recognized faces

**Cosine Distance**:
- Range: 0.0 (identical) to 2.0 (opposite)
- Same person: typically 0.05 – 0.35
- Different people: typically 0.50 – 1.50
- Threshold: 0.40 (FaceNet verified)

**Confidence Calculation**:
```
confidence = max(0, (1.0 - (distance / threshold)) * 100)
```

- distance = 0.0 → confidence = 100%
- distance = threshold → confidence = 0%

**Multi-Face Support**:
- Detects and recognizes multiple faces in single frame
- Returns list of all recognized students
- Frontend displays batch recognition overlay

**Performance Optimizations**:
- Frame downsampling to 640px width
- MTCNN runs once per frame (not per face)
- FaceNet operates on 160×160 crops
- Cooldown period (5 seconds) to prevent duplicate events

---

#### Face Detection

**File**: `services/face_recognition/detector.py`

**MTCNN Configuration**:
- Multi-task Cascaded Convolutional Networks
- Detects face bounding boxes
- Provides facial landmarks
- Supports face alignment

**Functions**:
- `detect_faces(image)` - Returns list of face detections
- `crop_face(image, detection, padding)` - Crops face region
- `get_largest_face(detections)` - Returns largest face by area

---

#### Preprocessing

**File**: `services/face_recognition/preprocess.py`

**Enrollment Preprocessing**:
- BGR conversion
- Bilateral filter (d=9, sigmaColor=75, sigmaSpace=75)
- Histogram equalization
- Image quality validation

**Recognition Preprocessing**:
- BGR conversion
- Histogram equalization
- Noise reduction

**Quality Checks**:
- Minimum image size (100×100)
- Brightness validation (not too dark/bright)
- Blur detection (Laplacian variance)
- Face detection requirement

---

#### Embedding Management

**File**: `services/face_recognition/__init__.py`

**Module-Level Cache**:
- `_EMBEDDINGS` dictionary stores all student embeddings
- Loaded at backend startup
- Reloaded without restart via `reload_embeddings()`

**Warm-up**:
- DeepFace model warmed up at startup
- Prevents first-scan latency (2-5 seconds)
- Runs blank image through FaceNet

**Validation**:
- `validate_embeddings()` checks consistency
- Warns if DB face_label has no matching .npy file
- Catches Student_N vs roll_number mismatches

---

#### Attendance Engine

**File**: `services/attendance_engine.py`

**Attendance Calculation**:
- Calculates total duration from ENTRY/EXIT logs
- Applies threshold percentage (default 80%)
- Determines status: Present/Absent/Partial
- Handles edge cases (single entry, multiple entries)

**Session Finalization**:
- Computes attendance for all enrolled students
- Creates AttendanceRecord entries
- Marks session as CLOSED
- Generates summary statistics

---

### Notifications

**File**: `services/notifications.py`

**Push Notifications**:
- Expo push token storage in User model
- Push notification sending via Expo Push API
- Individual notifications to users
- Token validation handling

**Features**:
- Attendance alerts to students
- Waiver decision notifications
- System announcements
- In-app notification fallback

---

## Database Schema

### Database Technology

**SQLite** with SQLAlchemy ORM

**Advantages**:
- Zero configuration
- Portable single-file database
- Suitable for small to medium deployments
- Easy backup and migration

**Schema File**: `attendance.db` (default location)

---

### Entity Relationship Diagram

```
User (1) ----< (1) Student
  |
  +----< (1..*) Notification
  |
  +----< (1..*) Session (as teacher)
  |
  +----< (1..*) Class (as teacher)

Student (1) ----< (1..*) Enrollment
  |
  +----< (1..*) AttendanceLog
  |
  +----< (1..*) AttendanceRecord
  |
  +----< (1..*) WaiverRequest
  |
  +----< (1..*) BatchStudent

Class (1) ----< (1..*) Enrollment
  |
  +----< (1..*) Session
  |
  +----< (1..*) BatchClassLink

Session (1) ----< (1..*) AttendanceLog
  |
  +----< (1..*) AttendanceRecord

Batch (1) ----< (1..*) BatchStudent
  |
  +----< (1..*) BatchClassLink
```

---

### Table Summary

**Total Tables**: 12

**Core Tables**:
1. `users` - User accounts and authentication
2. `students` - Student profiles and face recognition data
3. `classes` - Class information and scheduling
4. `sessions` - Attendance sessions
5. `enrollments` - Student-class relationships

**Attendance Tables**:
6. `attendance_logs` - Individual entry/exit events
7. `attendance_records` - Finalized attendance summaries

**Waiver Tables**:
8. `waiver_requests` - Absence excuse requests

**Notification Tables**:
9. `notifications` - In-app notifications

**Batch Tables**:
10. `batches` - Student groups
11. `batch_students` - Batch membership
12. `batch_class_links` - Batch-class relationships

---

### Indexes and Constraints

**Unique Constraints**:
- `users.email` - Email uniqueness
- `students.roll_number` - Roll number uniqueness
- `students.face_label` - Face label uniqueness
- `enrollments.student_id, class_id` - Prevent duplicate enrollment
- `attendance_records.student_id, session_id` - One record per student per session
- `batch_students.batch_id, student_id` - Composite primary key

**Foreign Keys**:
- All relationships use foreign key constraints
- Cascade delete configured for most relationships
- ON DELETE behavior varies by relationship type

---

### Data Migration

**Seed Scripts**:
- `seed_admin.py` - Creates default admin account
- `insert_student.py` - Bulk student insertion
- `fix_missing_student_profile.py` - Repairs missing student profiles

**Migration Scripts**:
- `migrate_add_is_active.py` - One-off: adds `is_active` column to `users` table
- `backfill_batch_class_links.py` - One-off: creates missing `BatchClassLink` rows for classes that were created with `batch_id` before the fix

**Validation**:
- Face embedding consistency check at startup
- Roll number to face_label alignment
- Orphaned record detection

---

## Test Suite

### Location
```
Backend Sajak/backend/backend/test/
├── __init__.py              # package marker
├── test_helpers.py          # shared infrastructure
├── test_admin_routes.py     # 27 tests — admin class/user/dashboard/at-risk
├── test_student_routes.py   # 28 tests — student list/enrol/history/log/waiver/notif
└── test_teacher_routes.py   # 19 tests — teacher class listing, session lifecycle, report
```

### Running Tests
```bash
# Inside the container (all AI deps available)
docker exec -w /app/test attendance_backend python -m unittest test_admin_routes test_student_routes test_teacher_routes -v

# Locally — no Docker needed (must cd into test/ first)
cd "Backend Sajak/backend/backend/test"
python -m unittest test_admin_routes test_student_routes test_teacher_routes -v
```

**Note**: Must run from inside `test/` — the test files use bare `from test_helpers import` which requires `test/` to be on `sys.path`.

**Local run (no Docker)**: `test_helpers.py` installs stub modules for `cv2`, `deepface`, `mtcnn`, and `tensorflow` into `sys.modules` before any imports happen. These packages are Docker-only (not in the local venv) but are imported at module level by `services/face_recognition/__init__.py`. The stubs prevent `ModuleNotFoundError` without touching any production code.

### What `test_helpers.py` Provides

| Helper | Description |
|---|---|
| `make_app(blueprints)` | Creates isolated Flask app with in-memory SQLite; Firebase disabled; CSRF disabled; AI package stubs pre-installed |
| `auth_as(user_id, role)` | Context manager that issues a signed JWT and auto-injects it into every request (monkey-patches `FlaskClient.open`) |
| `make_user(db, id, ...)` | Insert a User row (idempotent) |
| `make_student(db, id, ...)` | Insert a Student row |
| `make_class(db, id, ...)` | Insert a Class row |
| `make_enrollment(db, ...)` | Insert an Enrollment row (skip if duplicate) |
| `make_session(db, sid, ...)` | Insert a Session row |
| `make_record(db, ...)` | Insert an AttendanceRecord row |
| `new_session_id()` | Returns a new UUID string |
| `hash_password(plain)` | Returns a bcrypt hash |

### AI Package Stubbing

`test_helpers.py` stubs `cv2`, `deepface`, `mtcnn`, `tensorflow`, and related sub-modules into `sys.modules` at import time. This is necessary because `routes/__init__.py` eagerly imports `attendance_bp`, which chains to `services/face_recognition/__init__.py`, which runs `import cv2` unconditionally. These packages are only installed inside Docker. The stubs are `MagicMock` objects — they satisfy the import without executing any GPU/native code.

### Test Coverage (73 tests, all passing)

**TestAdminClassManagement** (8 tests): create success/400/422/404, non-admin rejected, list, update, delete, unauthenticated 401

**TestAdminUserManagement** (10 tests): list users, role filter, update fullname/email, duplicate email 409, short password 400, deactivate, deactivate-already-inactive 409, admin-cannot-deactivate-self, reactivate, reactivate-already-active 409, deactivated-user-login-blocked (end-to-end), non-admin forbidden

**TestAdminDashboardStats** (4 tests): stats counts correct (title-case regression), attendance_rate defaults to 0 (was-100 regression), recent sessions, stats requires admin

**TestAdminAtRiskStudents** (2 tests): empty list when no at-risk, identifies student below threshold

**TestStudentListAndProfile** (6 tests): admin/teacher can list, student cannot, single student includes enrollments, 404, own classes only

**TestStudentEnrollment** (4 tests): enrol success, duplicate 409, student cannot self-enrol, unenrol success

**TestStudentAttendanceHistory** (5 tests): own history, own by id, cannot view others (403), teacher can view any, 404

**TestStudentSelfLog** (5 tests): entry success, invalid event type 422, not-enrolled 403, closed session 400, teacher cannot use

**TestStudentWaivers** (6 tests): submit for absent success, submit when present rejected 400, duplicate 409, my-excuses list, cannot view admin queue 403, submission notifies admins

**TestStudentNotifications** (2 tests): returned and marked read, other role cannot use

**TestTeacherClassListing** (4 tests): teacher sees only own classes, admin sees all, schedule_status field present and correct, student gets empty list

**TestTeacherSessionLifecycle** (11 tests): start creates Absent records for all enrolled, Activity mode threshold 0.55, invalid mode 422, wrong teacher 403, nonexistent class 404, admin cannot start session (403), end finalizes attendance, other teacher cannot end session (403), double-end 400, status reports live counts, unknown session 404

**TestTeacherAttendanceReport** (3 tests): percentage + at-risk flag computed correctly (75% boundary case), 404 for nonexistent class, student blocked 403

---

## Project Flaws & Issues

### Recently Fixed ✅

- **Student delete broken (405)**: `delete_student()` in `routes/student.py` was missing its `@student_bp.route` decorator — route was never registered. Fixed.
- **`routes/admin.py` missing Flask import**: `Blueprint`, `request`, `jsonify`, `g` were not imported — server crashed on startup. Fixed.
- **`ManageSchedulesScreen` Add Class always failing**: `duration_minutes` was never included in the POST payload. Fixed by auto-calculating it from `scheduledTime` and `scheduledEndTime` pickers (end − start in minutes). Invalid time ranges (end ≤ start, or either time missing) now show a clear validation alert.
- **`BatchClassLink` not created on class creation**: `POST /api/admin/class/create` created `Enrollment` rows when `batch_id` was supplied but never created the `BatchClassLink` row. This caused classes to be invisible in batch analytics. Fixed + backfill script run on existing data (no orphans found).

### Critical Issues

#### 1. Hardcoded API URL in Frontend
**Location**: `AttendanceApp/api.js`
**Issue**: `BASE_URL` is hardcoded to `http://192.168.1.66:5000`
**Impact**: 
- Frontend won't work on different networks
- Requires manual IP update for each deployment
- Breaks when router IP changes

**Recommendation**:
- Implement environment variable configuration
- Add network discovery or configuration screen
- Support dynamic backend URL resolution

---

#### 2. SQLite Not Production-Ready
**Location**: `config.py`
**Issue**: SQLite used as default database
**Impact**:
- No concurrent write support
- Limited scalability
- No built-in replication
- Single point of failure

**Recommendation**:
- Migrate to PostgreSQL for production
- Configure connection pooling
- Implement read replicas for scaling
- Add database backup automation

---

#### 3. No Rate Limiting
**Location**: All API routes
**Issue**: No rate limiting on API endpoints
**Impact**:
- Vulnerable to DoS attacks
- Potential abuse of face recognition endpoint
- No protection against brute force attacks

**Recommendation**:
- Implement Flask-Limiter
- Add per-IP and per-user rate limits
- Stricter limits on expensive endpoints (face recognition)

---

#### 4. Missing Input Validation
**Location**: Various route files
**Issue**: Insufficient input validation on some endpoints
**Impact**:
- Potential security vulnerabilities
- Invalid data can corrupt database
- Poor error messages for users

**Recommendation**:
- Add comprehensive input validation
- Use marshmallow or pydantic schemas
- Sanitize all user inputs
- Add request size limits

---

#### 5. No HTTPS Enforcement
**Location**: Entire application
**Issue**: No SSL/TLS encryption requirement
**Impact**:
- Credentials transmitted in plain text
- Man-in-the-middle attacks possible
- Face images transmitted unencrypted

**Recommendation**:
- Enable HTTPS in production
- Implement HSTS headers
- Use certificate management
- Encrypt sensitive data at rest

---

### Medium Priority Issues

#### 6. Face Recognition False Positives
**Location**: `services/face_recognition/recognizer.py`
**Issue**: Fixed threshold may not work for all lighting conditions
**Impact**:
- Incorrect attendance marking
- Student disputes
- Reduced trust in system

**Recommendation**:
- Implement dynamic threshold adjustment
- Add liveness detection (anti-spoofing)
- Implement multi-frame confirmation
- Add manual review workflow for low-confidence matches

---

#### 7. No Offline Support
**Location**: Frontend
**Issue**: App requires constant backend connection
**Impact**:
- Unusable during network outages
- Poor user experience in areas with poor connectivity
- Data loss if app crashes during session

**Recommendation**:
- Implement local data caching
- Add offline queue for API calls
- Sync when connection restored
- Store critical data locally

---

#### 8. Limited Error Handling
**Location**: Various files
**Issue**: Generic error messages and insufficient logging
**Impact**:
- Difficult debugging
- Poor user experience
- Security information leakage in errors

**Recommendation**:
- Implement structured logging
- Add error tracking (Sentry, Rollbar)
- User-friendly error messages
- Separate debug and production error modes

---

#### 9. Partial Test Coverage
**Location**: `test/` directory
**Issue**: Integration tests cover admin, student, and teacher API routes (73 tests) but no unit tests for face recognition pipeline, attendance engine edge cases, or export report generation.
**Impact**:
- Face recognition regressions not caught automatically
- Report generation bugs not caught automatically
- No frontend E2E tests

**Recommendation**:
- Add unit tests for `attendance_engine.py` edge cases
- Add face recognition pipeline tests with mocked embeddings
- Implement E2E tests with Detox for the React Native app
- Set up CI/CD pipeline with automated testing

---

#### 16. AdminDashboardScreen — Static Hardcoded Data ✅ FIXED
**Location**: `AttendanceApp/screens/AdminDashboardScreen.js`
**Was**: Two hardcoded arrays (`atRiskStudents`, `weekData`), a fake `WeeklyChart` component, and a duplicate "Today's Overview" card
**Fixed**: All removed. At-risk section now fetches from `GET /api/admin/dashboard/at-risk-students`. Weekly chart and Today's Overview sections deleted entirely. All orphaned styles removed.

---

#### 10. Hardcoded Timezone
**Location**: `config.py`
**Issue**: `SERVER_TIMEZONE` hardcoded to 'Asia/Kathmandu'
**Impact**:
- System not location-agnostic
- Timezone issues in different regions
- Daylight saving time not handled

**Recommendation**:
- Use UTC internally
- Store timezone per user/institution
- Convert to local time for display
- Handle DST automatically

---

### Low Priority Issues

#### 11. No Audit Logging
**Issue**: No audit trail for administrative actions
**Impact**:
- Difficult to track changes
- No accountability for data modifications
- Compliance issues

**Recommendation**:
- Add audit log table
- Log all admin actions
- Implement log retention policy
- Add audit report generation

---

#### 12. Limited Scalability
**Issue**: Single-server architecture
**Impact**:
- Can't handle high load
- No horizontal scaling
- Single point of failure

**Recommendation**:
- Implement load balancing
- Add horizontal scaling support
- Use message queue for background tasks
- Implement caching layer (Redis)

---

#### 13. No Backup Strategy
**Issue**: No automated backup system
**Impact**:
- Data loss risk
- No disaster recovery
- Manual backup only

**Recommendation**:
- Implement automated daily backups
- Add off-site backup storage
- Implement backup retention policy
- Add backup restoration testing

---

#### 14. Inconsistent Naming Conventions
**Location**: Various files
**Issue**: Mixed naming conventions (camelCase, snake_case)
**Impact**:
- Code readability issues
- Maintenance difficulties
- Inconsistent API responses

**Recommendation**:
- Establish and enforce naming conventions
- Use linters to enforce consistency
- Refactor existing code to match conventions
- Document conventions in style guide

---

#### 15. No API Versioning
**Location**: All routes
**Issue**: No versioning in API endpoints
**Impact**:
- Breaking changes affect all clients
- Difficult to maintain backward compatibility
- No graceful deprecation

**Recommendation**:
- Implement API versioning (/api/v1/, /api/v2/)
- Document version changes
- Implement deprecation timeline
- Support multiple versions concurrently

---

## Setup & Deployment

### Prerequisites

**Backend**:
- Python 3.8+
- pip
- Virtual environment (venv)

**Frontend**:
- Node.js 16+
- npm or yarn
- Expo CLI
- React Native CLI

**AI/ML Dependencies**:
- OpenCV
- TensorFlow (DeepFace dependency)
- CUDA (optional, for GPU acceleration)

---

### Backend Setup

```bash
# Navigate to backend directory
cd Backend\ Sajak/backend/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
python app.py

# Seed admin account
python seed_admin.py
```

---

### Frontend Setup

```bash
# Navigate to frontend directory
cd AttendanceApp

# Install dependencies
npm install

# Update API URL in api.js
# Edit BASE_URL to match your backend IP

# Start development server
npm start

# Run on specific platform
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
```

---

### Face Recognition Setup

```bash
# Navigate to backend
cd Backend\ Sajak/backend/backend

# Prepare student photos
# Place photos in services/face_recognition/dataset/Student_ID/

# Run enrollment
python services/face_recognition/enroll.py

# Validate embeddings
python services/face_recognition/validate_embeddings.py

# Test recognition
python services/face_recognition/recognizer.py
```

---

### Docker Deployment

```bash
# First build (also required after requirements.txt or Dockerfile changes)
docker compose up --build -d

# Subsequent runs — source is volume-mounted, no rebuild needed for .py changes
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Source volume mount**: The entire backend source directory is mounted into the container (`./Backend Sajak/backend/backend:/app`). Gunicorn runs with `--reload`, so Python file changes take effect within ~2 seconds without any rebuild. Only `requirements.txt` or `Dockerfile` changes require `--build`.

**DB volume mount**: `database/attendance.db` and face recognition `embeddings/` are also volume-mounted, so data persists across container restarts.

---

### Firebase Setup

1. Create Firebase project
2. Enable Cloud Messaging
3. Download service account JSON
4. Save as `firebase_credentials.json`
5. Update `FIREBASE_CREDENTIALS_PATH` in `.env`

---

### Environment Variables

**Required**:
- `SECRET_KEY` - Flask secret key
- `SQLALCHEMY_DATABASE_URI` - Database connection string

**Optional**:
- `JWT_EXPIRY_HOURS` - Token expiration (default: 24)
- `STRICT_MODE_THRESHOLD` - Face recognition threshold (default: 0.80)
- `ACTIVITY_MODE_THRESHOLD` - Activity mode threshold (default: 0.55)
- `CORS_ORIGINS` - Allowed CORS origins
- `SCAN_COOLDOWN_SECONDS` - Scan cooldown (default: 15)
- `SERVER_TIMEZONE` - Server timezone (default: Asia/Kathmandu)
- `SESSION_START_BUFFER_MINUTES` - Early start buffer (default: 15)

---

## Agent Hooks

Located at `.kiro/hooks/`:

| Hook file | Trigger | Action |
|---|---|---|
| `session-context-loader.json` | SessionStart | Reads `PROJECT_CONTEXT.md` then `PROJECT_DOCUMENTATION.md` at the start of every session before any work begins |
| `session-doc-updater.json` | Stop | Updates both docs at the end of every session to reflect all changes made during that session |

---

## Conclusion

myTIMeS is a comprehensive AI-powered attendance system with a modern React Native frontend, Flask backend, and sophisticated face recognition capabilities. The system successfully addresses the core requirements of automated attendance tracking while providing role-based interfaces for students, teachers, and administrators.

**Strengths**:
- Modern technology stack
- AI-powered face recognition
- Multi-role support
- Comprehensive feature set
- Real-time attendance tracking

**Areas for Improvement**:
- Production database migration
- Security hardening (HTTPS, rate limiting)
- Scalability enhancements
- Testing coverage
- Error handling improvements

The project provides a solid foundation for an attendance management system and can be enhanced to address the identified issues for production deployment.
