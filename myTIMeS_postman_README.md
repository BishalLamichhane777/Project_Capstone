# myTIMeS Postman Integration Tests — README

## Files

| File | Purpose |
|---|---|
| `myTIMeS.postman_collection.json` | Import into Postman — contains all 13 requests across 3 folders |
| `myTIMeS.postman_environment.json` | Import into Postman — environment variables, all start empty except `base_url` |

---

## Before You Start

**The backend must be running** and `admin@test.com` must already exist in the database.

If you haven't seeded the admin account yet, run this once:

```bash
docker exec attendance_backend python /app/seed_admin.py
```

The default seed credentials are:

- **Email**: `admin@test.com`
- **Password**: `adminpass`

If your seed script uses different credentials, update the body of **Admin → 1. Admin Login** before running.

---

## Import Steps

1. Open Postman.
2. Click **Import** → drag in both JSON files (collection + environment).
3. In the top-right dropdown, select the **myTIMeS Local** environment.
4. If your backend is not on `localhost:5000`, edit the `base_url` variable in the environment.

---

## Run Order

The requests form a dependency chain — each one saves values that the next one needs. Follow this exact order:

### Step 1 — Run all of folder "1. Admin" (requests 1–6)

| # | Request | Saves |
|---|---|---|
| 1 | Admin Login | `admin_token` |
| 2 | Register Teacher | `teacher_user_id` |
| 3 | Register Student | `student_user_id` |
| 4 | Create Class | `class_id` |
| 5 | Get Student Profile ID | `student_id` |
| 6 | Enroll Student in Class | *(no new variable)* |

**Do not run request 7 yet.**

### Step 2 — Run all of folder "2. Teacher" (requests 1–3)

| # | Request | Saves |
|---|---|---|
| 1 | Teacher Login | `teacher_token` |
| 2 | Start Session | `session_id` |
| 3 | End Session | *(no new variable)* |

End Session finalizes attendance. Because no face scan was done, the student will be marked **Absent** — this is intentional and is what lets the student submit a waiver in the next step.

### Step 3 — Run all of folder "3. Student" (requests 1–3)

| # | Request | Saves |
|---|---|---|
| 1 | Student Login | `student_token` |
| 2 | Get My Attendance History | *(verifies Absent status)* |
| 3 | Submit Waiver | `waiver_request_id` |

### Step 4 — Go back to folder "1. Admin" and run request 7

| # | Request | Requires |
|---|---|---|
| 7 | Approve Waiver | `waiver_request_id` (set in Step 3) |

This approves the waiver and flips the student's attendance record from Absent → Present.

---

## What Each Test Script Checks

Every request has a **Tests** tab (post-response script) that:

1. Asserts the expected HTTP status code.
2. Checks for required fields in the response body.
3. Saves key values to the environment with `pm.environment.set(...)`.

The **Postman Console** (View → Show Postman Console) will log which variables were saved and their values, which is useful for debugging if a later request fails because a variable was not set.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Admin Login returns 401 | `admin@test.com` doesn't exist | Run `seed_admin.py` inside the container |
| Register Teacher/Student returns 409 | User already exists from a previous run | Delete the users from the DB, or change the email in the request body |
| Create Class returns 404 | `teacher_user_id` is empty | Re-run Admin Login, then Register Teacher |
| Start Session returns 403 | Class has `scheduled_date` set and the time window is closed | Remove the schedule from the class, or use a class without a scheduled_date |
| Submit Waiver returns 400 | Student is not marked Absent for that session | Confirm End Session ran successfully and the student had no scan |
| Approve Waiver returns 404 | `waiver_request_id` is empty | Re-run the Student folder first (Submit Waiver), then retry |

---

## Re-running After a Previous Test Run

The **Register Teacher** and **Register Student** requests will return **409 Conflict** if those accounts already exist from a prior run. You have two options:

**Option A** — Change the email addresses in requests 2 and 3 each time (e.g., `teacher2@test.com`, `student2@test.com`) and also update the matching login bodies in the Teacher and Student folders.

**Option B** — Clean the database between runs:
```bash
docker exec attendance_backend python -c "
from app import create_app
from database import db
from models.user import User

app = create_app()
with app.app_context():
    User.query.filter(User.email.in_(['teacher1@test.com', 'student1@test.com'])).delete()
    db.session.commit()
    print('Cleaned.')
"
```
