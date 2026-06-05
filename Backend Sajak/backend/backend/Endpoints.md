# myTIMeS API — Postman Collection Reference

**Base URL:** `http://localhost:5000/api`

**Auth Header (where required):**
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## 1. AUTH — `/api/auth`

---

### POST `/api/auth/login`

> **Auth:** None

**Request Body:**
```json
{
  "email": "admin@mytimes.com",
  "password": "admin123"
}
```

**Response 200 — Success:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "admin",
  "user_id": 1,
  "fullname": "System Admin"
}
```

**Response 401 — Invalid credentials:**
```json
{
  "error": "Invalid credentials",
  "status": 401
}
```

**Response 400 — Missing fields:**
```json
{
  "error": "Email and password are required",
  "status": 400
}
```

---

### POST `/api/auth/register`

> **Auth:** Admin only

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

**Request Body (student — requires extra fields):**
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

**Request Body (admin):**
```json
{
  "fullname": "New Admin",
  "email": "newadmin@mytimes.com",
  "password": "admin456",
  "role": "admin",
  "phone": "+977-9800000000"
}
```

**Response 201 — Success:**
```json
{
  "user_id": 5,
  "message": "User registered"
}
```

**Response 409 — Duplicate email:**
```json
{
  "error": "Email already exists",
  "status": 409
}
```

**Response 409 — Duplicate roll number:**
```json
{
  "error": "Roll number already exists",
  "status": 409
}
```

**Response 422 — Invalid role:**
```json
{
  "error": "Invalid role. Must be one of: admin, teacher, student",
  "status": 422
}
```

**Response 400 — Missing student fields:**
```json
{
  "error": "roll_number and program are required for student role",
  "status": 400
}
```

---

### GET `/api/auth/me`

> **Auth:** Any valid token
**Request Body:** None

**Response 200 — Teacher/Admin:**
```json
{
  "id": 2,
  "fullname": "Dr. Ramesh Sharma",
  "email": "ramesh@mytimes.com",
  "role": "teacher",
  "phone": "+977-9801234567",
  "device_token": null,
  "created_at": "2026-05-24T10:00:00"
}
```

**Response 200 — Student (includes student_profile):**
```json
{
  "id": 3,
  "fullname": "Anita Thapa",
  "email": "anita@mytimes.com",
  "role": "student",
  "phone": "+977-9812345678",
  "device_token": "fcm-token-here",
  "created_at": "2026-05-24T10:00:00",
  "student_profile": {
    "student_id": 1,
    "roll_number": "BCA-2024-001",
    "program": "BCA",
    "year_of_study": 2
  }
}
```

---

## 2. SESSION — `/api/session`

---

### POST `/api/session/start`

> **Auth:** Teacher only

**Request Body:**
```json
{
  "class_id": 1,
  "mode": "Strict",
  "start_time": "2026-05-24T10:00:00+05:45"
}
```

> `mode` must be `"Strict"` or `"Activity"`. `start_time` is optional (defaults to now).

**Response 200 — Success:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "threshold_percent": 0.8,
  "enrolled_count": 42
}
```

**Response 404 — Class not found:**
```json
{
  "error": "Class not found",
  "status": 404
}
```

**Response 403 — Not class owner:**
```json
{
  "error": "You are not the teacher of this class",
  "status": 403
}
```

**Response 422 — Invalid mode:**
```json
{
  "error": "mode must be 'Strict' or 'Activity'",
  "status": 422
}
```

---

### POST `/api/session/end`

> **Auth:** Teacher only

**Request Body:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response 200 — Success:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "summary": {
    "present": 38,
    "absent": 4,
    "total": 42
  }
}
```

**Response 400 — Already closed:**
```json
{
  "error": "Session is not active",
  "status": 400
}
```

**Response 403 — Not session owner:**
```json
{
  "error": "You are not the teacher of this session",
  "status": 403
}
```

---

### GET `/api/session/status/<session_id>`

> **Auth:** Teacher, Admin

**URL Example:** `/api/session/status/a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Request Body:** None

**Response 200:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "ACTIVE",
  "mode": "Strict",
  "class_id": 1,
  "class_name": "Data Structures",
  "start_time": "2026-05-24T10:00:00",
  "end_time": null,
  "liveCount": 25,
  "present_count": 25,
  "absent_count": 17,
  "total": 42
}
```

---

### GET `/api/session/class/<class_id>`

> **Auth:** Teacher, Admin

**URL Example:** `/api/session/class/1`

**Request Body:** None

**Response 200:**
```json
{
  "class_id": 1,
  "class_name": "Data Structures",
  "sessions": [
    {
      "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "class_id": 1,
      "teacher_id": 2,
      "mode": "Strict",
      "start_time": "2026-05-24T10:00:00",
      "end_time": "2026-05-24T11:00:00",
      "status": "CLOSED",
      "threshold_percent": 0.8,
      "class_name": "Data Structures",
      "summary": {
        "present": 38,
        "absent": 4,
        "total": 42
      }
    }
  ]
}
```

---

## 3. ATTENDANCE — `/api/attendance`

---

### GET `/api/attendance/history/<student_id>`

> **Auth:** Student (own only) or Admin

**URL Example:** `/api/attendance/history/1`

**Request Body:** None

**Response 200:**
```json
[
  {
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "class_name": "Data Structures",
    "date": "2026-05-24T10:00:00",
    "status": "Present",
    "total_duration_seconds": 2880.0,
    "logs": [
      {
        "event_type": "ENTRY",
        "timestamp": "2026-05-24T10:02:15"
      },
      {
        "event_type": "EXIT",
        "timestamp": "2026-05-24T10:50:15"
      }
    ]
  },
  {
    "session_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "class_name": "Operating Systems",
    "date": "2026-05-23T14:00:00",
    "status": "Absent",
    "total_duration_seconds": 0,
    "logs": []
  }
]
```

**Response 403 — Student accessing another's data:**
```json
{
  "error": "You can only view your own attendance",
  "status": 403
}
```

---

### GET `/api/attendance/report/<class_id>`

> **Auth:** Teacher, Admin

**URL Example:** `/api/attendance/report/1`

**Request Body:** None

**Response 200:**
```json
{
  "class_name": "Data Structures",
  "class_id": 1,
  "total_sessions": 15,
  "students": [
    {
      "student_id": 1,
      "fullname": "Anita Thapa",
      "roll_number": "BCA-2024-001",
      "total_sessions": 15,
      "sessions_present": 12,
      "attendance_percentage": 80.0,
      "at_risk": false
    },
    {
      "student_id": 2,
      "fullname": "Bikash Gurung",
      "roll_number": "BCA-2024-002",
      "total_sessions": 15,
      "sessions_present": 10,
      "attendance_percentage": 66.67,
      "at_risk": true
    }
  ],
  "generated_at": "2026-05-24T10:30:00+00:00"
}
```

---

### PUT `/api/attendance/manual-override`

> **Auth:** Admin only

**Request Body:**
```json
{
  "student_id": 2,
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "Present"
}
```

> `status` must be `"Present"`, `"Absent"`, or `"Partial"`

**Response 200:**
```json
{
  "message": "Attendance updated"
}
```

**Response 404 — Record not found:**
```json
{
  "error": "Attendance record not found",
  "status": 404
}
```

**Response 422 — Invalid status:**
```json
{
  "error": "status must be 'Present', 'Absent', or 'Partial'",
  "status": 422
}
```

---

## 4. EXCUSE — `/api/excuse`

---

### POST `/api/excuse/submit`

> **Auth:** Student only

**Request Body:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "reason": "I had a medical emergency and was admitted to the hospital."
}
```

**Response 201 — Success:**
```json
{
  "request_id": 1,
  "message": "Excuse submitted"
}
```

**Response 400 — Not absent:**
```json
{
  "error": "You can only submit an excuse for sessions where you were marked Absent",
  "status": 400
}
```

**Response 409 — Duplicate excuse:**
```json
{
  "error": "An excuse has already been submitted for this session",
  "status": 409
}
```

**Response 404 — No attendance record:**
```json
{
  "error": "No attendance record found for this session",
  "status": 404
}
```

---

### GET `/api/excuse/pending`

> **Auth:** Admin only

**Request Body:** None

**Response 200:**
```json
[
  {
    "request_id": 1,
    "student_id": 1,
    "student_name": "Anita Thapa",
    "roll_number": "BCA-2024-001",
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "class_name": "Data Structures",
    "session_date": "2026-05-24T10:00:00",
    "reason": "I had a medical emergency and was admitted to the hospital.",
    "submitted_at": "2026-05-24T12:30:00"
  }
]
```

---

### GET `/api/excuse/history/<student_id>`

> **Auth:** Student (own only) or Admin

**URL Example:** `/api/excuse/history/1`

**Request Body:** None

**Response 200:**
```json
[
  {
    "request_id": 1,
    "student_id": 1,
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "reason": "I had a medical emergency and was admitted to the hospital.",
    "supporting_doc_path": null,
    "status": "Approved",
    "submitted_at": "2026-05-24T12:30:00",
    "reviewed_at": "2026-05-24T14:00:00"
  },
  {
    "request_id": 2,
    "student_id": 1,
    "session_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "reason": "Family emergency",
    "supporting_doc_path": null,
    "status": "Pending",
    "submitted_at": "2026-05-23T16:00:00",
    "reviewed_at": null
  }
]
```

---

### PUT `/api/excuse/decide/<request_id>`

> **Auth:** Admin only

**URL Example:** `/api/excuse/decide/1`

**Request Body:**
```json
{
  "decision": "Approved"
}
```

> `decision` must be `"Approved"` or `"Rejected"`

**Response 200 — Success:**
```json
{
  "message": "Decision recorded",
  "decision": "Approved"
}
```

**Response 422 — Invalid decision:**
```json
{
  "error": "decision must be 'Approved' or 'Rejected'",
  "status": 422
}
```

**Response 404 — Not found:**
```json
{
  "error": "Waiver request not found",
  "status": 404
}
```

---

## 5. STUDENT — `/api/student`

---

### GET `/api/student/list`

> **Auth:** Admin, Teacher

**Request Body:** None

**Response 200:**
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
  },
  {
    "student_id": 2,
    "user_id": 4,
    "roll_number": "BCA-2024-002",
    "program": "BCA",
    "year_of_study": 2,
    "fullname": "Bikash Gurung",
    "email": "bikash@mytimes.com",
    "phone": "+977-9823456789"
  }
]
```

---

### GET `/api/student/<student_id>`

> **Auth:** Admin, Teacher

**URL Example:** `/api/student/1`

**Request Body:** None

**Response 200:**
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
      "enrolled_at": "2026-05-20T10:00:00"
    },
    {
      "enrollment_id": 3,
      "student_id": 1,
      "class_id": 2,
      "enrolled_at": "2026-05-20T10:05:00"
    }
  ]
}
```

**Response 404:**
```json
{
  "error": "Student not found",
  "status": 404
}
```

---

### PUT `/api/student/enrol/<student_id>`

> **Auth:** Admin only

**URL Example:** `/api/student/enrol/1`

**Request Body:**
```json
{
  "class_id": 3
}
```

**Response 201 — Success:**
```json
{
  "message": "Student enrolled"
}
```

**Response 409 — Already enrolled:**
```json
{
  "error": "Student is already enrolled in this class",
  "status": 409
}
```

---

### DELETE `/api/student/unenrol`

> **Auth:** Admin only

**Request Body:**
```json
{
  "student_id": 1,
  "class_id": 3
}
```

**Response 200:**
```json
{
  "message": "Student unenrolled"
}
```

**Response 404:**
```json
{
  "error": "Enrollment not found",
  "status": 404
}
```

---

### DELETE `/api/student/<student_id>`

> **Auth:** Admin only

**URL Example:** `/api/student/1`

**Request Body:** None

**Response 200:**
```json
{
  "message": "Student deleted"
}
```

**Response 404:**
```json
{
  "error": "Student not found",
  "status": 404
}
```

---

### GET `/api/student/notifications`

> **Auth:** Student only

**Request Body:** None

**Response 200:**
```json
[
  {
    "notif_id": 5,
    "user_id": 3,
    "type": "Waiver",
    "message": "Your excuse for Data Structures has been approved",
    "is_read": false,
    "sent_at": "2026-05-24T14:00:00"
  },
  {
    "notif_id": 3,
    "user_id": 3,
    "type": "Absent",
    "message": "You were marked absent from Operating Systems",
    "is_read": true,
    "sent_at": "2026-05-23T15:00:00"
  }
]
```

> All returned notifications are marked as `is_read: true` after this call.

---

## 6. ADMIN — `/api/admin`

---

### POST `/api/admin/class/create`

> **Auth:** Admin only

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

> `room`, `teacher_id`, `schedule_time` are optional.

**Response 201 — Success:**
```json
{
  "class_id": 1,
  "message": "Class created"
}
```

**Response 404 — Invalid teacher:**
```json
{
  "error": "Invalid teacher_id — user not found or not a teacher",
  "status": 404
}
```

---

### GET `/api/admin/class/list`

> **Auth:** Admin, Teacher

**Request Body:** None

**Response 200:**
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
  },
  {
    "class_id": 2,
    "class_name": "Operating Systems",
    "subject": "Computer Science",
    "room": "Room-205",
    "teacher_id": 2,
    "teacher_name": "Dr. Ramesh Sharma",
    "schedule_time": "2026-06-01T14:00:00",
    "duration_minutes": 90,
    "enrolled_count": 38
  }
]
```

---

### PUT `/api/admin/class/<class_id>`

> **Auth:** Admin only

**URL Example:** `/api/admin/class/1`

**Request Body (partial update — send only fields to change):**
```json
{
  "room": "Lab-302",
  "duration_minutes": 90
}
```

**Response 200:**
```json
{
  "message": "Class updated"
}
```

**Response 404:**
```json
{
  "error": "Class not found",
  "status": 404
}
```

---

### DELETE `/api/admin/class/<class_id>`

> **Auth:** Admin only

**URL Example:** `/api/admin/class/1`

**Request Body:** None

**Response 200:**
```json
{
  "message": "Class deleted"
}
```

**Response 400 — Has active sessions:**
```json
{
  "error": "Cannot delete class with active sessions. End all sessions first.",
  "status": 400
}
```

---

### DELETE `/api/admin/session/<session_id>`

> **Auth:** Admin only

**URL Example:** `/api/admin/session/a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Request Body:** None

**Response 200:**
```json
{
  "message": "Session deleted"
}
```

**Response 404:**
```json
{
  "error": "Session not found",
  "status": 404
}
```

---

### GET `/api/admin/users`

> **Auth:** Admin only

**URL Example:** `/api/admin/users` or `/api/admin/users?role=teacher`

**Query Params (optional):**

| Param | Values |
|-------|--------|
| `role` | `admin`, `teacher`, `student` |

**Request Body:** None

**Response 200:**
```json
[
  {
    "id": 1,
    "fullname": "System Admin",
    "email": "admin@mytimes.com",
    "role": "admin",
    "phone": null,
    "device_token": null,
    "created_at": "2026-05-20T08:00:00"
  },
  {
    "id": 2,
    "fullname": "Dr. Ramesh Sharma",
    "email": "ramesh@mytimes.com",
    "role": "teacher",
    "phone": "+977-9801234567",
    "device_token": null,
    "created_at": "2026-05-20T09:00:00"
  }
]
```

---

### PUT `/api/admin/user/<user_id>`

> **Auth:** Admin only

**URL Example:** `/api/admin/user/3`

**Request Body (partial update — only fullname, phone, device_token allowed):**
```json
{
  "fullname": "Anita Thapa Magar",
  "phone": "+977-9812345000",
  "device_token": "fcm-device-token-abc123"
}
```

**Response 200:**
```json
{
  "message": "User updated"
}
```

**Response 404:**
```json
{
  "error": "User not found",
  "status": 404
}
```

---

### GET `/api/admin/notifications`

> **Auth:** Admin only

**Request Body:** None

**Response 200:**
```json
[
  {
    "notif_id": 1,
    "user_id": 1,
    "type": "Waiver",
    "message": "Anita Thapa submitted an excuse for Data Structures",
    "is_read": false,
    "sent_at": "2026-05-24T12:30:00"
  }
]
```

> All returned notifications are marked as read after this call.

---

## Global Error Responses

These apply to **all endpoints**:

**401 — Missing token:**
```json
{
  "error": "Authorization token is missing",
  "status": 401
}
```

**401 — Invalid/expired token:**
```json
{
  "error": "Invalid or expired token",
  "status": 401
}
```

**403 — Wrong role:**
```json
{
  "error": "Forbidden: requires one of ['admin']",
  "status": 403
}
```

**500 — Server error:**
```json
{
  "error": "An unexpected error occurred",
  "status": 500
}
```

---

## Postman Setup Tips

1. **Environment Variables:** Create a Postman environment with:
   | Variable | Initial Value |
   |----------|--------------|
   | `base_url` | `http://localhost:5000/api` |
   | `token` | *(empty — set after login)* |

2. **Auto-set token after login:** In the **Tests** tab of the Login request, add:
   ```javascript
   if (pm.response.code === 200) {
       var json = pm.response.json();
       pm.environment.set("token", json.token);
   }
   ```

3. **Auth header for all requests:** In the collection-level **Authorization** tab, set:
   - Type: `Bearer Token`
   - Token: `{{token}}`

4. **Recommended test order:**
   1. Login as admin → get token
   2. Register a teacher
   3. Register a student
   4. Create a class
   5. Enrol student in class
   6. Login as teacher → get token
   7. Start session
   8. End session
   9. Login as student → get token
   10. View attendance history
   11. Submit excuse
   12. Login as admin → approve excuse
