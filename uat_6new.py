import urllib.request, json, urllib.error, sqlite3

BASE = 'http://localhost:5000'
db_path = r'c:\Users\sajak\Project_Capstone\Backend Sajak\backend\backend\database\attendance.db'

def post(path, data, token=None):
    body = json.dumps(data).encode()
    req = urllib.request.Request(BASE+path, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    if token: req.add_header('Authorization', 'Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def get(path, token=None):
    req = urllib.request.Request(BASE+path)
    if token: req.add_header('Authorization', 'Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def put(path, data, token=None):
    body = json.dumps(data).encode()
    req = urllib.request.Request(BASE+path, data=body, method='PUT')
    req.add_header('Content-Type', 'application/json')
    if token: req.add_header('Authorization', 'Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def sep(n, title):
    print(f"\n{'='*70}")
    print(f" UAT-{n}: {title}")
    print(f"{'='*70}")

# ── Login all roles ───────────────────────────────────────────────────────────
sc, r = post('/api/auth/login', {'email': 'admin@mytimes.com', 'password': 'admin123'})
admin_token = r.get('token', '')
print(f"ADMIN LOGIN: {sc} name={r.get('fullname')}")

sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'student123'})
student_token = r.get('token', '')
student_user_id = r.get('user_id')
print(f"STUDENT LOGIN: {sc} name={r.get('fullname')} user_id={student_user_id}")

# Teacher5 = ramesh@mytimes.com (owns class 1 Java), Teacher6 = teacher1@test.com (owns class 2 CS101)
sc, r = put('/api/admin/user/6', {'password': 'teacher123'}, admin_token)
sc, r = post('/api/auth/login', {'email': 'teacher1@test.com', 'password': 'teacher123'})
teacher_token = r.get('token', '')
teacher_user_id = r.get('user_id')
print(f"TEACHER LOGIN: {sc} name={r.get('fullname')} user_id={teacher_user_id}")

sc, r = put('/api/admin/user/5', {'password': 'teacher123'}, admin_token)
sc, r = post('/api/auth/login', {'email': 'ramesh@mytimes.com', 'password': 'teacher123'})
teacher5_token = r.get('token', '')
print(f"TEACHER5 LOGIN: {sc} name={r.get('fullname')}")

print(f"\nTokens: admin={bool(admin_token)} student={bool(student_token)} teacher={bool(teacher_token)} teacher5={bool(teacher5_token)}")

# ════════════════════════════════════════════════════════════════════════
# UAT-36: Student marks a notification as read
# ════════════════════════════════════════════════════════════════════════
sep(36, "Student marks a notification as read")

# Step 1: Get current notifications and unread count
sc, notifs = get('/api/notifications/my-notifications', student_token)
print(f"  GET /notifications/my-notifications: {sc} total={len(notifs) if isinstance(notifs,list) else 'ERR'}")
unread_before = []
if isinstance(notifs, list):
    for n in notifs[:5]:
        print(f"    id={n.get('notification_id')} type={n.get('type')} is_read={n.get('is_read')} msg={str(n.get('message',''))[:60]}")
    unread_before = [n for n in notifs if not n.get('is_read')]
    print(f"  Unread notifications: {len(unread_before)}")

sc2, unread_count = get('/api/notifications/unread-count', student_token)
print(f"  GET /notifications/unread-count BEFORE: {sc2} unread={unread_count.get('unread_count')}")

# Step 2: Mark one specific notification as read
if isinstance(notifs, list) and notifs:
    # Find an unread one, or use any
    target = next((n for n in notifs if not n.get('is_read')), notifs[0])
    notif_id = target.get('notification_id')
    is_read_before = target.get('is_read')
    print(f"\n  Targeting notification_id={notif_id} is_read={is_read_before}")

    # Try individual mark-as-read
    sc3, r3 = put(f'/api/notifications/mark-read/{notif_id}', {}, student_token)
    print(f"  PUT /notifications/mark-read/{notif_id}: {sc3} => {r3}")

    # Try body-based mark-as-read
    sc4, r4 = put('/api/notifications/mark-read', {'notification_id': notif_id}, student_token)
    print(f"  PUT /notifications/mark-read (body id={notif_id}): {sc4} => {r4}")

    # Try POST mark-as-read
    sc5, r5 = post(f'/api/notifications/mark-read/{notif_id}', {}, student_token)
    print(f"  POST /notifications/mark-read/{notif_id}: {sc5} => {r5}")

    # Try mark-all-read
    sc6, r6 = put('/api/notifications/mark-all-read', {}, student_token)
    print(f"  PUT /notifications/mark-all-read: {sc6} => {r6}")
    sc7, r7 = post('/api/notifications/mark-all-read', {}, student_token)
    print(f"  POST /notifications/mark-all-read: {sc7} => {r7}")

# Step 3: Check unread count after
sc8, unread_after = get('/api/notifications/unread-count', student_token)
print(f"  GET /notifications/unread-count AFTER: {sc8} unread={unread_after.get('unread_count')}")

# Step 4: Verify in DB directly
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT notification_id, is_read, type FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 5", (student_user_id,))
rows = cur.fetchall()
conn.close()
print(f"  DB notifications (user_id={student_user_id}): {rows}")

# ════════════════════════════════════════════════════════════════════════
# UAT-37: Admin searches for a specific student by name
# ════════════════════════════════════════════════════════════════════════
sep(37, "Admin searches for a specific student by name")

# Step 1: Try search param on student list
sc, r = get('/api/student/list?search=Student+One', admin_token)
print(f"  GET /student/list?search=Student+One: {sc} count={len(r) if isinstance(r,list) else 'ERR'}")
if isinstance(r, list):
    for s in r: print(f"    id={s.get('student_id')} name={s.get('fullname')} roll={s.get('roll_number')}")

sc2, r2 = get('/api/student/list?name=Student+One', admin_token)
print(f"  GET /student/list?name=Student+One: {sc2} count={len(r2) if isinstance(r2,list) else 'ERR'}")

sc3, r3 = get('/api/student/list?q=Student+One', admin_token)
print(f"  GET /student/list?q=Student+One: {sc3} count={len(r3) if isinstance(r3,list) else 'ERR'}")

# Step 2: Try admin-specific student search
sc4, r4 = get('/api/admin/students?search=Student+One', admin_token)
print(f"  GET /admin/students?search=Student+One: {sc4} count={len(r4.get('students',[])) if isinstance(r4,dict) else r4}")

sc5, r5 = get('/api/admin/students/search?q=Student+One', admin_token)
print(f"  GET /admin/students/search?q=Student+One: {sc5}")

# Step 3: Retrieve full list and note count — manual filter baseline
sc6, all_students = get('/api/student/list', admin_token)
print(f"  GET /student/list (no filter): {sc6} total_count={len(all_students) if isinstance(all_students,list) else 'ERR'}")
if isinstance(all_students, list):
    for s in all_students:
        print(f"    id={s.get('student_id')} name={s.get('fullname')} roll={s.get('roll_number')} active={s.get('is_active')}")

# Step 4: Check ManageStudentsScreen.js for client-side filtering logic
print(f"\n  NOTE: Checking if search is server-side or client-side...")

# ════════════════════════════════════════════════════════════════════════
# UAT-38: Teacher views total number of sessions held for a class
# ════════════════════════════════════════════════════════════════════════
sep(38, "Teacher views total sessions held for a class")

# Step 1: Teacher gets their class list
sc, classes = get('/api/session/classes', teacher_token)
print(f"  GET /session/classes (teacher): {sc} count={len(classes) if isinstance(classes,list) else 'ERR'}")
if isinstance(classes, list):
    for c in classes:
        print(f"    class_id={c.get('class_id')} name={c.get('class_name')} subject={c.get('subject')}")

# Step 2: Teacher gets session list for their class
sc2, class_detail = get('/api/session/class/2', teacher_token)
print(f"  GET /session/class/2: {sc2}")
if isinstance(class_detail, dict):
    sessions = class_detail.get('sessions', [])
    print(f"  sessions returned: {len(sessions)}")
    for s in sessions:
        print(f"    session_id={s.get('session_id','')[:12]}... start={s.get('start_time','')[:10]} status={s.get('status')} present={s.get('present_count')} absent={s.get('absent_count')}")

# Step 3: Teacher attendance report endpoint
sc3, report = get('/api/attendance/report/2', teacher_token)
print(f"  GET /attendance/report/2: {sc3}")
if isinstance(report, dict):
    print(f"  total_sessions={report.get('total_sessions')} class={report.get('class_name')}")
    for stu in report.get('students', []):
        print(f"    {stu.get('fullname')}: sessions_present={stu.get('sessions_present')} total={stu.get('total_sessions')} pct={stu.get('attendance_percentage')}%")

# Step 4: Check DB directly for session count
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM sessions WHERE class_id=2 AND status='CLOSED'")
db_count = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM sessions WHERE class_id=2")
db_count_all = cur.fetchone()[0]
conn.close()
print(f"  DB: sessions for class_id=2 (total={db_count_all}, CLOSED={db_count})")
print(f"  API total_sessions matches DB: {report.get('total_sessions') == db_count if isinstance(report,dict) else 'N/A'}")

# ════════════════════════════════════════════════════════════════════════
# UAT-39: Student checks overall attendance % across all classes
# ════════════════════════════════════════════════════════════════════════
sep(39, "Student checks overall attendance % across all classes")

# Step 1: Main analytics endpoint
sc, analytics = get('/api/attendance/analytics', student_token)
print(f"  GET /attendance/analytics: {sc}")
if isinstance(analytics, dict):
    print(f"  overall: name={analytics.get('name')} total_sessions={analytics.get('total')} present={analytics.get('present')} absent={analytics.get('absent')} overall_pct={analytics.get('percentage')}%")
    print(f"  per-class breakdown:")
    for c in analytics.get('classes', []):
        print(f"    course={c.get('course')} attendance={c.get('attendance')}% present={c.get('present')} absent={c.get('absent')} risk={c.get('risk')}")

# Step 2: Student classes endpoint
sc2, stu_classes = get('/api/student/classes', student_token)
print(f"  GET /student/classes: {sc2} count={len(stu_classes) if isinstance(stu_classes,list) else 'ERR'}")
if isinstance(stu_classes, list):
    for c in stu_classes:
        print(f"    class={c.get('class_name')} subject={c.get('subject')}")

# Step 3: Verify against DB
conn = sqlite3.connect(db_path)
cur = conn.cursor()
# student_id=1 corresponds to user_id=2 (student1@capstone.com)
cur.execute("""
    SELECT ar.status, COUNT(*) FROM attendance_records ar
    JOIN students s ON s.student_id = ar.student_id
    WHERE s.user_id = ?
    GROUP BY ar.status
""", (student_user_id,))
db_rows = cur.fetchall()
conn.close()
print(f"  DB attendance_records for user_id={student_user_id}: {db_rows}")

# Step 4: Cross-check analytics percentage math
if isinstance(analytics, dict):
    total = analytics.get('total', 0)
    present = analytics.get('present', 0)
    pct = analytics.get('percentage', 'N/A')
    expected_pct = round(present / total * 100, 1) if total > 0 else 0
    print(f"  Math check: {present}/{total} = {expected_pct}% (API says {pct}%)")

# ════════════════════════════════════════════════════════════════════════
# UAT-40: Admin edits a class's name/details successfully
# ════════════════════════════════════════════════════════════════════════
sep(40, "Admin edits a class's name and details")

# Step 1: Read current state of class 2
sc, r = get('/api/session/class/2', admin_token)
print(f"  GET /session/class/2 BEFORE: {sc}")
if isinstance(r, dict):
    print(f"  class_name={r.get('class_name')} subject={r.get('subject')} sessions={len(r.get('sessions',[]))}")

# Check DB current values
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("SELECT class_id, class_name, subject, room, duration_minutes FROM classes WHERE class_id=2")
before = cur.fetchone()
conn.close()
print(f"  DB class 2 BEFORE: {before}")

# Step 2: Edit class name and subject via PUT /api/admin/class/:id
sc2, r2 = put('/api/admin/class/2',
    {'class_name': 'CS101-Updated', 'subject': 'Intro to CS (Revised)', 'duration_minutes': 90},
    admin_token)
print(f"  PUT /api/admin/class/2 (name+subject+duration): {sc2} => {r2}")

# Step 3: Verify the change
conn2 = sqlite3.connect(db_path)
cur2 = conn2.cursor()
cur2.execute("SELECT class_id, class_name, subject, room, duration_minutes FROM classes WHERE class_id=2")
after = cur2.fetchone()
conn2.close()
print(f"  DB class 2 AFTER: {after}")
print(f"  name changed: {before[1]} -> {after[1]} => {'YES' if before[1]!=after[1] else 'NO'}")
print(f"  subject changed: {before[2]} -> {after[2]} => {'YES' if before[2]!=after[2] else 'NO'}")
print(f"  duration changed: {before[4]} -> {after[4]} => {'YES' if before[4]!=after[4] else 'NO'}")

# Step 4: Confirm via GET after edit
sc3, r3 = get('/api/session/class/2', admin_token)
print(f"  GET /session/class/2 AFTER: {sc3} class_name={r3.get('class_name')} subject={r3.get('subject')}")

# Step 5: Restore original values
sc4, r4 = put('/api/admin/class/2',
    {'class_name': 'CS101', 'subject': 'Intro to CS', 'duration_minutes': 60},
    admin_token)
print(f"  Restore original: {sc4}")

# ════════════════════════════════════════════════════════════════════════
# UAT-41: Teacher ends a session and immediately sees final attendance count
# ════════════════════════════════════════════════════════════════════════
sep(41, "Teacher ends session and immediately sees final attendance count")

# Step 1: Start a fresh session for class 2 (CS101)
sc, r_start = post('/api/session/start', {'class_id': 2, 'mode': 'Strict'}, teacher_token)
print(f"  POST /session/start class_id=2: {sc}")
print(f"  session_id={r_start.get('session_id','')[:16]}... enrolled={r_start.get('enrolled_count')} status={r_start.get('status')}")
sess_id = r_start.get('session_id', '')

if sess_id:
    # Step 2: Check live session status before end
    sc2, r_status = get(f'/api/session/status/{sess_id}', teacher_token)
    print(f"  GET /session/status/{sess_id[:12]}...: {sc2}")
    if isinstance(r_status, dict):
        print(f"    status={r_status.get('status')} enrolled={len(r_status.get('enrolled_students',[]))} scanned_count={r_status.get('scanned_count')} present={r_status.get('present_count')} absent={r_status.get('absent_count')}")

    # Step 3: End the session
    sc3, r_end = post('/api/session/end', {'session_id': sess_id}, teacher_token)
    print(f"  POST /session/end: {sc3}")
    print(f"  summary in response: {r_end.get('summary')}")
    print(f"  message: {r_end.get('message','')}")
    if isinstance(r_end.get('summary'), dict):
        s = r_end['summary']
        print(f"    total={s.get('total')} present={s.get('present')} absent={s.get('absent')} present_pct={s.get('present_percentage')}%")

    # Step 4: Verify via session/class endpoint (what teacher sees in their class view)
    sc4, r_class = get('/api/session/class/2', teacher_token)
    print(f"  GET /session/class/2 after end: {sc4}")
    if isinstance(r_class, dict):
        sessions = r_class.get('sessions', [])
        latest = next((s for s in sessions if s.get('session_id') == sess_id), None)
        if latest:
            print(f"  Latest session in class view: status={latest.get('status')} present={latest.get('present_count')} absent={latest.get('absent_count')} total={latest.get('total_enrolled')}")

    # Step 5: Verify via attendance report
    sc5, report = get('/api/attendance/report/2', teacher_token)
    if isinstance(report, dict):
        print(f"  Attendance report after session: total_sessions={report.get('total_sessions')}")
        for stu in report.get('students', []):
            print(f"    {stu.get('fullname')}: {stu.get('attendance_percentage')}% ({stu.get('sessions_present')}/{stu.get('total_sessions')}) at_risk={stu.get('at_risk')}")

    # Step 6: Verify DB
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT status, COUNT(*) FROM attendance_records WHERE session_id=? GROUP BY status", (sess_id,))
    db_summary = cur.fetchall()
    conn.close()
    print(f"  DB attendance_records for this session: {db_summary}")
else:
    print("  Could not start session")
