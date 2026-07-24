import urllib.request, json, urllib.error

BASE = 'http://localhost:5000'

def post(path, data, token=None):
    body = json.dumps(data).encode()
    req = urllib.request.Request(BASE+path, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def get(path, token=None):
    req = urllib.request.Request(BASE+path)
    if token:
        req.add_header('Authorization', 'Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def put(path, data, token=None):
    body = json.dumps(data).encode()
    req = urllib.request.Request(BASE+path, data=body, method='PUT')
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def sep(n, title=''):
    print(f"\n{'='*70}")
    print(f" UAT-{n} {title}")
    print(f"{'='*70}")

# ── Step 1: Login admin ───────────────────────────────────────────────────────
sc, r = post('/api/auth/login', {'email': 'admin@mytimes.com', 'password': 'admin123'})
admin_token = r.get('token', '')
print(f"ADMIN LOGIN: {sc} name={r.get('fullname')} token={'YES' if admin_token else 'NO'}")

# ── Step 2: Reset teacher6 password via admin, then login as teacher ─────────
sc, r = put('/api/admin/user/6', {'password': 'teacher123'}, admin_token)
print(f"RESET TEACHER PW: {sc} => {r}")

sc, r = post('/api/auth/login', {'email': 'teacher1@test.com', 'password': 'teacher123'})
teacher_token = r.get('token', '')
teacher_user_id = r.get('user_id')
print(f"TEACHER LOGIN: {sc} name={r.get('fullname')} user_id={teacher_user_id}")

# ── Step 3: Login student ─────────────────────────────────────────────────────
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'student123'})
student_token = r.get('token', '')
student_user_id = r.get('user_id')
print(f"STUDENT LOGIN: {sc} name={r.get('fullname')} user_id={student_user_id}")

print(f"\nTokens ready: admin={bool(admin_token)} teacher={bool(teacher_token)} student={bool(student_token)}")
print(f"IDs: teacher_user_id={teacher_user_id} student_user_id={student_user_id}")

# ════════════════════════════════════════════════════════════════════════
# UAT-21: Student changes their password
# ════════════════════════════════════════════════════════════════════════
sep(21, "Student changes password")
# 1. Verify current password works (already logged in above)
print(f"  Step 1: Student already logged in as student1@capstone.com")
# 2. Get current email via /me
sc, me = get('/api/auth/me', student_token)
print(f"  /me: {sc} email={me.get('email')} role={me.get('role')}")
# 3. Verify old password via login first
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'student123'})
print(f"  Verify old password login: {sc}")
# 4. Change password via PUT /api/auth/me
sc, r = put('/api/auth/me', {'password': 'newpass456'}, student_token)
print(f"  PUT /me password change: {sc} => {r}")
# 5. Logout + login with new password
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'newpass456'})
new_token_after_change = r.get('token', '')
print(f"  Login with NEW password: {sc} => token={'YES' if new_token_after_change else 'NO'}")
# 6. Confirm old password is rejected
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'student123'})
print(f"  Login with OLD password (should be 401): {sc} => {r.get('error','')}")
# 7. Restore original password so other tests work
sc, r = put('/api/auth/me', {'password': 'student123'}, new_token_after_change if new_token_after_change else student_token)
print(f"  Restore original password: {sc}")
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'student123'})
student_token = r.get('token', student_token)
print(f"  Re-login with restored password: {sc}")

# ════════════════════════════════════════════════════════════════════════
# UAT-22: Teacher reschedules a session's time before it starts
# ════════════════════════════════════════════════════════════════════════
sep(22, "Teacher reschedules session time")
# Get class list to find a class assigned to teacher6
sc, classes = get('/api/session/classes', teacher_token)
print(f"  Teacher classes: {sc} count={len(classes) if isinstance(classes,list) else 'ERR'}")
if isinstance(classes, list) and classes:
    c = classes[0]
    class_id = c.get('class_id')
    print(f"  Class found: class_id={class_id} name={c.get('class_name')} sched_date={c.get('scheduled_date')} sched_time={c.get('scheduled_time')}")
    # Teacher has no schedule-edit endpoint — only admin can via PUT /api/admin/class/:id
    sc2, r2 = put(f'/api/admin/class/{class_id}/schedule',
                  {'scheduled_date': '2026-07-25', 'scheduled_time': '10:00', 'scheduled_end_time': '12:00'},
                  teacher_token)
    print(f"  Teacher PUT /admin/class/{class_id}/schedule: {sc2} => {r2}")
    # Try as admin
    sc3, r3 = put(f'/api/admin/class/{class_id}/schedule',
                  {'scheduled_date': '2026-07-25', 'scheduled_time': '10:00', 'scheduled_end_time': '12:00'},
                  admin_token)
    print(f"  Admin PUT /admin/class/{class_id}/schedule: {sc3} => sched_time={r3.get('scheduled_time')} sched_date={r3.get('scheduled_date')}")
    # Student checks their classes for the update
    sc4, sc_classes = get('/api/student/classes', student_token)
    print(f"  Student GET /student/classes: {sc4} count={len(sc_classes) if isinstance(sc_classes,list) else sc_classes}")
    if isinstance(sc_classes, list):
        for cls in sc_classes:
            print(f"    class_id={cls.get('class_id')} name={cls.get('class_name')} sched_date={cls.get('scheduled_date')} sched_time={cls.get('scheduled_time')}")
else:
    print("  No classes available for teacher — BLOCKED")

# ════════════════════════════════════════════════════════════════════════
# UAT-23: Admin approves a single pending waiver request
# ════════════════════════════════════════════════════════════════════════
sep(23, "Admin approves a pending waiver")
sc, pending = get('/api/excuse/pending', admin_token)
print(f"  GET /excuse/pending: {sc} count={len(pending) if isinstance(pending,list) else 'ERR'}")

# Create a fresh waiver to approve: need an Absent record
# Check student3 (user_id=7, student_id=3) attendance records
import sqlite3
db_path = r'c:\Users\sajak\Project_Capstone\Backend Sajak\backend\backend\database\attendance.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT record_id, student_id, session_id, status FROM attendance_records WHERE status='Absent' LIMIT 3")
absent_recs = cur.fetchall()
cur.execute("SELECT request_id, student_id, session_id, status FROM waiver_requests WHERE status='Pending' LIMIT 3")
pending_waivers = cur.fetchall()
conn.close()
print(f"  Absent records in DB: {absent_recs}")
print(f"  Pending waivers in DB: {pending_waivers}")

if pending_waivers:
    req_id = pending_waivers[0][0]
    sc, r = put(f'/api/excuse/decide/{req_id}', {'decision': 'Approved'}, admin_token)
    print(f"  PUT /excuse/decide/{req_id} Approved: {sc} => {r}")
    # Check the attendance record was updated to Present
    conn2 = sqlite3.connect(db_path)
    cur2 = conn2.cursor()
    cur2.execute("SELECT status FROM attendance_records WHERE student_id=? AND session_id=?",
                 (pending_waivers[0][1], pending_waivers[0][2]))
    row = cur2.fetchone()
    conn2.close()
    print(f"  Attendance record status after approval: {row}")
elif isinstance(pending, list) and pending:
    req_id = pending[0]['request_id']
    sc, r = put(f'/api/excuse/decide/{req_id}', {'decision': 'Approved'}, admin_token)
    print(f"  PUT /excuse/decide/{req_id} Approved: {sc} => {r}")
else:
    # Submit a new waiver for student2 (if they have an Absent record)
    # Login student2
    sc_s2, r_s2 = post('/api/auth/login', {'email': 'student2@capstone.com', 'password': 'student123'})
    s2_token = r_s2.get('token','')
    print(f"  Student2 login: {sc_s2}")
    if s2_token:
        conn3 = sqlite3.connect(db_path)
        cur3 = conn3.cursor()
        cur3.execute("SELECT ar.record_id, ar.student_id, ar.session_id FROM attendance_records ar JOIN students s ON s.student_id=ar.student_id WHERE s.user_id=3 AND ar.status='Absent' LIMIT 1")
        r_absent = cur3.fetchone()
        conn3.close()
        print(f"  Absent record for student2: {r_absent}")
        if r_absent:
            sc_sub, r_sub = post('/api/excuse/submit',
                                  {'session_id': r_absent[2], 'reason': 'Medical appointment'},
                                  s2_token)
            print(f"  Submit waiver: {sc_sub} => {r_sub}")
            if sc_sub == 201:
                new_req_id = r_sub.get('request_id')
                sc_dec, r_dec = put(f'/api/excuse/decide/{new_req_id}', {'decision': 'Approved'}, admin_token)
                print(f"  Approve new waiver {new_req_id}: {sc_dec} => {r_dec}")
        else:
            print("  No Absent records found to submit waiver — BLOCKED: no pending waivers and no Absent records")
    else:
        print("  BLOCKED: cannot log in as student2")

# ════════════════════════════════════════════════════════════════════════
# UAT-24: Teacher filters attendance records by date range
# ════════════════════════════════════════════════════════════════════════
sep(24, "Teacher filters attendance records by date range")
# GET /api/attendance/history — check what params it accepts
sc, hist = get('/api/attendance/history', teacher_token)
print(f"  GET /attendance/history (no params): {sc} => {str(hist)[:200]}")
# Try with date range params
sc2, hist2 = get('/api/attendance/history?start_date=2026-07-01&end_date=2026-07-31', teacher_token)
print(f"  GET /attendance/history?start_date=2026-07-01&end_date=2026-07-31: {sc2} => {str(hist2)[:200]}")
# Try session/class route for teacher's class
sc3, sessions = get('/api/session/class/2', teacher_token)
print(f"  GET /session/class/2: {sc3} => {str(sessions)[:200]}")

# ════════════════════════════════════════════════════════════════════════
# UAT-25: Student views their per-class attendance percentage
# ════════════════════════════════════════════════════════════════════════
sep(25, "Student views per-class attendance percentage")
sc, stu_classes = get('/api/student/classes', student_token)
print(f"  GET /student/classes: {sc} count={len(stu_classes) if isinstance(stu_classes,list) else 'ERR'}")
if isinstance(stu_classes, list):
    for c in stu_classes:
        print(f"    class_id={c.get('class_id')} name={c.get('class_name')} subject={c.get('subject')}")
# Get analytics for student
sc2, analytics = get('/api/attendance/analytics', student_token)
print(f"  GET /attendance/analytics: {sc2} => {str(analytics)[:400]}")
# Try admin student detail endpoint for student_id=1
sc3, detail = get('/api/admin/students/1/detail', admin_token)
print(f"  GET /admin/students/1/detail: {sc3} => classes={[c.get('class_name') for c in detail.get('classes',[])] if isinstance(detail,dict) else detail}")
if isinstance(detail, dict) and detail.get('classes'):
    for c in detail['classes']:
        print(f"    {c.get('class_name')}: {c.get('attendance_percent')}% present={c.get('present_count')} sessions={c.get('session_count')}")

# ════════════════════════════════════════════════════════════════════════
# UAT-26: Teacher sees today's schedule at a glance on login
# ════════════════════════════════════════════════════════════════════════
sep(26, "Teacher sees today's schedule on login")
sc, my_sess = get('/api/session/my-sessions', teacher_token)
print(f"  GET /session/my-sessions: {sc} count={len(my_sess) if isinstance(my_sess,list) else 'ERR'}")
if isinstance(my_sess, list):
    for s in my_sess:
        print(f"    id={s.get('class_id')} subject={s.get('subject')} status={s.get('status')} schedule_status={s.get('schedule_status')} date={s.get('scheduled_date')} time={s.get('scheduled_time')}")

# ════════════════════════════════════════════════════════════════════════
# UAT-27: Student views list of upcoming classes
# ════════════════════════════════════════════════════════════════════════
sep(27, "Student views upcoming classes")
sc, stu_cls = get('/api/student/classes', student_token)
print(f"  GET /student/classes: {sc} count={len(stu_cls) if isinstance(stu_cls,list) else 'ERR'}")
if isinstance(stu_cls, list):
    for c in stu_cls:
        print(f"    class_id={c.get('class_id')} name={c.get('class_name')} active_session={c.get('active_session_id')} sched_date={c.get('scheduled_date')}")
else:
    print(f"  Response: {stu_cls}")

# ════════════════════════════════════════════════════════════════════════
# UAT-28: Teacher views list of students enrolled in a class
# ════════════════════════════════════════════════════════════════════════
sep(28, "Teacher views enrolled student list")
# Teacher sees their classes
sc, t_classes = get('/api/session/classes', teacher_token)
print(f"  GET /session/classes (teacher): {sc} count={len(t_classes) if isinstance(t_classes,list) else 'ERR'}")
if isinstance(t_classes, list) and t_classes:
    cid = t_classes[0].get('class_id')
    # Session status endpoint gives enrolled_students
    sc2, sess_status = get(f'/api/session/class/{cid}', teacher_token)
    print(f"  GET /session/class/{cid}: {sc2}")
    if isinstance(sess_status, dict):
        sessions_list = sess_status.get('sessions', [])
        print(f"    sessions count={len(sessions_list)}")
        if sessions_list:
            sid = sessions_list[0].get('session_id')
            sc3, s_status = get(f'/api/session/status/{sid}', teacher_token)
            print(f"    GET /session/status/{sid}: {sc3} enrolled={len(s_status.get('enrolled_students',[]))} students={[s.get('fullname') for s in s_status.get('enrolled_students',[])]}")
    # Admin roster endpoint
    sc4, roster = get(f'/api/admin/classes/{cid}/students', admin_token)
    print(f"  GET /admin/classes/{cid}/students: {sc4}")
    if isinstance(roster, dict):
        print(f"    total={roster.get('total_count')} students={[s.get('fullname') for s in roster.get('students',[])]}")
else:
    print("  No classes for teacher")

# ════════════════════════════════════════════════════════════════════════
# UAT-29: Enrolling a face already registered to another student is flagged
# ════════════════════════════════════════════════════════════════════════
sep(29, "Duplicate face enrollment flagged")
# This requires multipart POST to /api/admin/enroll-face — not testable via
# plain JSON API without actual image files.
# Instead, test the face_label uniqueness at the DB model level by checking
# if the route enforces it, and inspect what happens when same face_label is reused.
import sqlite3
conn_f = sqlite3.connect(db_path)
cur_f = conn_f.cursor()
cur_f.execute("SELECT student_id, roll_number, face_label FROM students WHERE face_label IS NOT NULL")
enrolled_faces = cur_f.fetchall()
conn_f.close()
print(f"  Students with face_labels in DB: {enrolled_faces}")
# Attempt to enroll face for student_id=2 using student_id=1's face_label (Student_1)
# via the enroll-face endpoint - send empty image list to test validation
import urllib.request, urllib.error
boundary = b'----TestBoundary'
body_parts = b'------TestBoundary\r\nContent-Disposition: form-data; name="student_id"\r\n\r\n2\r\n------TestBoundary--\r\n'
req_face = urllib.request.Request(BASE+'/api/admin/enroll-face', data=body_parts, method='POST')
req_face.add_header('Content-Type', 'multipart/form-data; boundary=----TestBoundary')
req_face.add_header('Authorization', 'Bearer '+admin_token)
try:
    with urllib.request.urlopen(req_face) as rf:
        print(f"  enroll-face (no photos): {rf.status} {json.loads(rf.read())}")
except urllib.error.HTTPError as ef:
    print(f"  enroll-face (no photos): {ef.code} {json.loads(ef.read())}")

# ════════════════════════════════════════════════════════════════════════
# UAT-30: Student turns off one specific notification type
# ════════════════════════════════════════════════════════════════════════
sep(30, "Student turns off a notification type")
# Check if there's a notification preferences endpoint
sc, notif_prefs = get('/api/notifications/preferences', student_token)
print(f"  GET /notifications/preferences: {sc} => {notif_prefs}")
# Check ProfileScreen.js NotificationsEnabled toggle — it's local state only (no API call)
# Verify: there is no backend endpoint for per-type notification preferences
sc2, mark = put('/api/notifications/mark-read', {}, student_token)
print(f"  PUT /notifications/mark-read (exists): {sc2} => {mark}")
# Try any prefs-related path
for path in ['/api/notifications/settings', '/api/user/notification-settings']:
    sc3, r3 = get(path, student_token)
    print(f"  GET {path}: {sc3}")

# ════════════════════════════════════════════════════════════════════════
# UAT-31: Admin schedules two non-conflicting sessions for same class same day
# ════════════════════════════════════════════════════════════════════════
sep(31, "Two non-conflicting sessions for same class same day")
# Create class A and schedule it at 09:00-10:00
sc1, cls1 = post('/api/admin/class/create',
    {'class_name': 'UAT31_ClassA', 'subject': 'Math', 'duration_minutes': 60,
     'teacher_id': 6, 'scheduled_date': '2026-08-01',
     'scheduled_time': '09:00', 'scheduled_end_time': '10:00'}, admin_token)
print(f"  Create class A (09:00-10:00): {sc1} => class_id={cls1.get('class_id')} msg={cls1.get('message','')}")
cid_a = cls1.get('class_id')

# Create class B for same class_id but second time slot 11:00-12:00
# (Two sessions = two class entries in this system since sessions are started by teachers, not pre-created)
sc2, cls2 = post('/api/admin/class/create',
    {'class_name': 'UAT31_ClassB', 'subject': 'Math', 'duration_minutes': 60,
     'teacher_id': 6, 'scheduled_date': '2026-08-01',
     'scheduled_time': '11:00', 'scheduled_end_time': '12:00'}, admin_token)
print(f"  Create class B (11:00-12:00): {sc2} => class_id={cls2.get('class_id')} msg={cls2.get('message','')}")
cid_b = cls2.get('class_id')
print(f"  Both classes created without conflict: {sc1==201 and sc2==201}")

# Now verify: does the system check for time overlap on the SAME class (updating schedule)?
if cid_a:
    # Try updating class A to overlap with B — system should not block this (no overlap check)
    sc3, r3 = put(f'/api/admin/class/{cid_a}/schedule',
        {'scheduled_date': '2026-08-01', 'scheduled_time': '11:30', 'scheduled_end_time': '12:30'},
        admin_token)
    print(f"  Update class A to overlap B (11:30-12:30): {sc3} => {r3.get('error','no error')} scheduled_time={r3.get('scheduled_time')}")
    # Cleanup
    sc_d1, _ = put(f'/api/admin/class/{cid_a}', {'scheduled_time': '09:00', 'scheduled_end_time': '10:00'}, admin_token)

# ════════════════════════════════════════════════════════════════════════
# UAT-32: Admin changes class attendance mode
# ════════════════════════════════════════════════════════════════════════
sep(32, "Admin changes class attendance mode and threshold applies going forward")
# Class_id=2 (CS101) has no schedule — test mode change
sc, cls_info = get('/api/session/class/2', admin_token)
print(f"  GET /session/class/2: {sc}")
if isinstance(cls_info, dict):
    print(f"  Current class info: class_id=2 sessions={len(cls_info.get('sessions',[]))}")
    for s in cls_info.get('sessions', []):
        print(f"    session_id={s.get('session_id')} mode={s.get('mode')} threshold={s.get('threshold_percent')} status={s.get('status')}")

# The class mode is set per-session at session start (mode param), not on the Class model
# Check Class model fields
import sqlite3
conn_m = sqlite3.connect(db_path)
cur_m = conn_m.cursor()
cur_m.execute("PRAGMA table_info(classes)")
cols = [c[1] for c in cur_m.fetchall()]
print(f"  Classes table columns: {cols}")
cur_m.execute("SELECT class_id, class_name FROM classes WHERE class_id=2")
print(f"  Class 2: {cur_m.fetchone()}")
conn_m.close()

# ════════════════════════════════════════════════════════════════════════
# UAT-33: Student logs out successfully
# ════════════════════════════════════════════════════════════════════════
sep(33, "Student logs out successfully")
# The system uses stateless JWT — there is no /logout endpoint
# Test: token still works before "logout"
sc, r = get('/api/auth/me', student_token)
print(f"  /me before logout: {sc} email={r.get('email')}")
# Check if a logout endpoint exists
sc2, r2 = post('/api/auth/logout', {}, student_token)
print(f"  POST /api/auth/logout: {sc2} => {r2}")
# Token still works after (stateless JWT — no server-side invalidation)
sc3, r3 = get('/api/auth/me', student_token)
print(f"  /me AFTER logout call: {sc3} email={r3.get('email')} (token still valid? {'YES' if sc3==200 else 'NO'})")

# ════════════════════════════════════════════════════════════════════════
# UAT-34: Admin views total number of registered students
# ════════════════════════════════════════════════════════════════════════
sep(34, "Admin views total number of registered students")
sc, stats = get('/api/admin/stats', admin_token)
print(f"  GET /admin/stats: {sc}")
print(f"  total_students={stats.get('total_students')} present_today={stats.get('present_today')} absent_today={stats.get('absent_today')} waivers_pending={stats.get('waivers_pending')}")
# Verify against DB count
import sqlite3
conn_s = sqlite3.connect(db_path)
cur_s = conn_s.cursor()
cur_s.execute("SELECT COUNT(*) FROM users WHERE role='student'")
db_count = cur_s.fetchone()[0]
conn_s.close()
print(f"  DB student count (users where role=student): {db_count}")
print(f"  Match: {stats.get('total_students') == db_count}")

# Also check admin student list
sc2, stu_list = get('/api/student/list', admin_token)
print(f"  GET /student/list: {sc2} count={len(stu_list) if isinstance(stu_list,list) else 'ERR'}")
if isinstance(stu_list, list):
    print(f"  Students: {[(s.get('fullname'), s.get('roll_number'), s.get('is_active')) for s in stu_list]}")

# ════════════════════════════════════════════════════════════════════════
# UAT-35: Teacher notified when student becomes at-risk
# ════════════════════════════════════════════════════════════════════════
sep(35, "Teacher notified when student becomes at-risk")
# At-risk notifications are sent via services/notifications.py at session end
# Check if there's a teacher-facing at-risk endpoint
sc, at_risk = get('/api/admin/dashboard/at-risk-students', admin_token)
print(f"  GET /admin/dashboard/at-risk-students: {sc} count={len(at_risk.get('students',[])) if isinstance(at_risk,dict) else 'ERR'}")
if isinstance(at_risk, dict):
    for s in at_risk.get('students', []):
        print(f"    {s.get('fullname')} {s.get('roll_number')}: {s.get('attendance_percent')}% class={s.get('class_name')}")
# Check teacher's notifications
sc2, t_notifs = get('/api/notifications/my-notifications', teacher_token)
print(f"  GET /notifications/my-notifications (teacher): {sc2} count={len(t_notifs) if isinstance(t_notifs,list) else 'ERR'}")
if isinstance(t_notifs, list):
    for n in t_notifs[:3]:
        print(f"    type={n.get('type')} msg={n.get('message','')[:80]} read={n.get('is_read')}")
# Check services/notifications.py for at-risk notification logic
print(f"  NOTE: Checking backend source for at-risk notification trigger...")
