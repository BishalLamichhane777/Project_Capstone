import urllib.request, json, urllib.error, sqlite3

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

db_path = r'c:\Users\sajak\Project_Capstone\Backend Sajak\backend\backend\database\attendance.db'

# ── Login admin ───────────────────────────────────────────────────────────────
sc, r = post('/api/auth/login', {'email': 'admin@mytimes.com', 'password': 'admin123'})
admin_token = r.get('token', '')
print(f"ADMIN: {sc} {r.get('fullname')}")

# ── Reset student1 password via admin (user_id=2) ────────────────────────────
sc, r = put('/api/admin/user/2', {'password': 'student123'}, admin_token)
print(f"RESET STUDENT1 PW: {sc} {r.get('email')}")

# ── Login student1 ────────────────────────────────────────────────────────────
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'student123'})
student_token = r.get('token', '')
student_user_id = r.get('user_id')
print(f"STUDENT1 LOGIN: {sc} name={r.get('fullname')} user_id={student_user_id} token={'YES' if student_token else 'NO'}")

# ── Login student2 ────────────────────────────────────────────────────────────
sc2, r2 = post('/api/auth/login', {'email': 'student2@capstone.com', 'password': 'student123'})
student2_token = r2.get('token', '')
print(f"STUDENT2 LOGIN: {sc2} name={r2.get('fullname')}")

# ── Login teacher (user_id=6, already reset) ─────────────────────────────────
sc, r = put('/api/admin/user/6', {'password': 'teacher123'}, admin_token)
sc, r = post('/api/auth/login', {'email': 'teacher1@test.com', 'password': 'teacher123'})
teacher_token = r.get('token', '')
teacher_user_id = r.get('user_id')
print(f"TEACHER LOGIN: {sc} name={r.get('fullname')} user_id={teacher_user_id}")

print(f"\nAll tokens: admin={bool(admin_token)} teacher={bool(teacher_token)} student={bool(student_token)} student2={bool(student2_token)}")

# ════════════════════════════════════════════════════════════════════════
# UAT-21 RE-RUN: Student changes their password
# ════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print(" UAT-21 RE-RUN: Student changes password")
print("="*70)

# 1. Confirm student is logged in — /me works
sc, me = get('/api/auth/me', student_token)
print(f"  /me (confirm login): {sc} email={me.get('email')} role={me.get('role')}")

# 2. Change password via PUT /api/auth/me
sc, r = put('/api/auth/me', {'password': 'newpass456'}, student_token)
print(f"  PUT /api/auth/me (change to newpass456): {sc} => {r}")

# 3. Login with new password
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'newpass456'})
new_token = r.get('token', '')
print(f"  Login with NEW password: {sc} => token={'YES' if new_token else 'NO'}")

# 4. Confirm OLD password is now rejected
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'student123'})
print(f"  Login with OLD password (expect 401): {sc} => {r.get('error','')}")

# 5. /me works with new token
sc, me2 = get('/api/auth/me', new_token)
print(f"  /me with new token: {sc} email={me2.get('email')}")

# 6. Restore original password
sc, r = put('/api/auth/me', {'password': 'student123'}, new_token)
print(f"  Restore to student123: {sc} => {r}")
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'student123'})
student_token = r.get('token', student_token)
print(f"  Re-login with restored password: {sc} token={'YES' if student_token else 'NO'}")

# ════════════════════════════════════════════════════════════════════════
# UAT-25 RE-RUN: Student views per-class attendance percentage
# ════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print(" UAT-25 RE-RUN: Student views per-class attendance %")
print("="*70)

sc, stu_classes = get('/api/student/classes', student_token)
print(f"  GET /student/classes: {sc} count={len(stu_classes) if isinstance(stu_classes,list) else 'ERR'}")
if isinstance(stu_classes, list):
    for c in stu_classes:
        print(f"    class_id={c.get('class_id')} name={c.get('class_name')} subject={c.get('subject')} active_session={c.get('active_session_id')}")

sc2, analytics = get('/api/attendance/analytics', student_token)
print(f"  GET /attendance/analytics: {sc2}")
if isinstance(analytics, dict):
    print(f"    name={analytics.get('name')} total={analytics.get('total')} present={analytics.get('present')} absent={analytics.get('absent')} pct={analytics.get('percentage')}%")
    for c in analytics.get('classes', []):
        print(f"    class={c.get('course')} attendance={c.get('attendance')}% present={c.get('present')} absent={c.get('absent')} risk={c.get('risk')}")

sc3, hist = get('/api/attendance/history', student_token)
print(f"  GET /attendance/history: {sc3} count={len(hist) if isinstance(hist,list) else hist}")
if isinstance(hist, list):
    for h in hist:
        print(f"    class={h.get('class_name')} date={h.get('date')} status={h.get('status')}")

# ════════════════════════════════════════════════════════════════════════
# UAT-27 RE-RUN: Student views upcoming classes
# ════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print(" UAT-27 RE-RUN: Student views upcoming classes")
print("="*70)

sc, stu_cls = get('/api/student/classes', student_token)
print(f"  GET /student/classes: {sc} count={len(stu_cls) if isinstance(stu_cls,list) else 'ERR'}")
if isinstance(stu_cls, list):
    for c in stu_cls:
        print(f"    class_id={c.get('class_id')} name={c.get('class_name')} sched_date={c.get('scheduled_date')} sched_time={c.get('scheduled_time')} active_session={c.get('active_session_id')}")

# ════════════════════════════════════════════════════════════════════════
# UAT-30 RE-RUN: Student turns off a specific notification type
# ════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print(" UAT-30 RE-RUN: Student notification type preferences")
print("="*70)

# Check student notifications endpoint with valid token
sc, notifs = get('/api/notifications/my-notifications', student_token)
print(f"  GET /notifications/my-notifications (student): {sc} count={len(notifs) if isinstance(notifs,list) else notifs}")

sc2, unread = get('/api/notifications/unread-count', student_token)
print(f"  GET /notifications/unread-count: {sc2} => {unread}")

# Confirm no per-type preferences endpoint exists
for path in ['/api/notifications/preferences', '/api/notifications/settings',
             '/api/user/notification-settings', '/api/student/notification-preferences']:
    sc3, r3 = get(path, student_token)
    print(f"  GET {path}: {sc3} (exists={'YES' if sc3!=404 else 'NO'})")

# The ProfileScreen.js has a notificationsEnabled Switch toggle - check if it calls any API
# Source confirmed: line in ProfileScreen.js:
#   <Switch value={notificationsEnabled} onValueChange={v => setNotificationsEnabled(v)} .../>
# No API call made - it is local React state only, not persisted anywhere.
print(f"  FINDING: ProfileScreen notificationsEnabled toggle is local state only — no API call made, not persisted to backend")

# ════════════════════════════════════════════════════════════════════════
# UAT-33 RE-RUN: Student logs out successfully (JWT stateless check)
# ════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print(" UAT-33 RE-RUN: Student logout")
print("="*70)

sc, r = get('/api/auth/me', student_token)
print(f"  /me before logout: {sc} email={r.get('email')}")
# Check logout endpoint
sc2, r2 = post('/api/auth/logout', {}, student_token)
print(f"  POST /api/auth/logout: {sc2} => {r2}")
# Token still valid after (JWT stateless — no blacklist)
sc3, r3 = get('/api/auth/me', student_token)
print(f"  /me after 'logout': {sc3} email={r3.get('email')} (token still valid={'YES' if sc3==200 else 'NO'})")
print(f"  NOTE: App.js logoutState() only clears local AsyncStorage — no server call")

# ════════════════════════════════════════════════════════════════════════
# UAT-23 RE-RUN: Admin approves a pending waiver — create fresh scenario
# ════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print(" UAT-23 RE-RUN: Admin approves waiver (create fresh test data)")
print("="*70)

# Create a closed session for class 2, then manually inject an Absent record,
# then have student submit waiver, then admin approves it.

# Step 1: Start a session as teacher for class 2 (needs scheduled_date removed first)
sc_cls, r_cls = put('/api/admin/class/2',
    {'scheduled_date': None, 'scheduled_time': None, 'scheduled_end_time': None}, admin_token)
print(f"  Clear CS101 schedule: {sc_cls}")

# Step 2: Start session as teacher
sc_start, r_start = post('/api/session/start', {'class_id': 2, 'mode': 'Strict'}, teacher_token)
print(f"  Start session: {sc_start} session_id={r_start.get('session_id')} enrolled={r_start.get('enrolled_count')}")
new_session_id = r_start.get('session_id', '')

if new_session_id:
    # Step 3: End session immediately (student will be Absent — no scan done)
    sc_end, r_end = post('/api/session/end', {'session_id': new_session_id}, teacher_token)
    print(f"  End session: {sc_end} present={r_end.get('summary',{}).get('present')} absent={r_end.get('summary',{}).get('absent')}")

    # Step 4: Check attendance records
    conn_w = sqlite3.connect(db_path)
    cur_w = conn_w.cursor()
    cur_w.execute("SELECT record_id, student_id, session_id, status FROM attendance_records WHERE session_id=?", (new_session_id,))
    recs = cur_w.fetchall()
    conn_w.close()
    print(f"  Attendance records for new session: {recs}")

    # Step 5: Student1 submits waiver (they should be Absent in this session)
    absent_rec = [rec for rec in recs if rec[3] == 'Absent']
    if absent_rec:
        sc_sub, r_sub = post('/api/excuse/submit',
            {'session_id': new_session_id, 'reason': 'Medical appointment - UAT23 test'},
            student_token)
        print(f"  Student submit waiver: {sc_sub} => request_id={r_sub.get('request_id')} msg={r_sub.get('message','')}")
        new_req_id = r_sub.get('request_id')

        if new_req_id:
            # Step 6: Admin approves the waiver
            sc_dec, r_dec = put(f'/api/excuse/decide/{new_req_id}', {'decision': 'Approved'}, admin_token)
            print(f"  Admin approve waiver {new_req_id}: {sc_dec} => {r_dec}")

            # Step 7: Verify attendance record updated to Present
            conn_v = sqlite3.connect(db_path)
            cur_v = conn_v.cursor()
            cur_v.execute("SELECT status FROM attendance_records WHERE student_id=? AND session_id=?",
                          (absent_rec[0][1], new_session_id))
            updated_status = cur_v.fetchone()
            conn_v.close()
            print(f"  Attendance status after approval: {updated_status} (expect Present)")
    else:
        print(f"  No Absent records found — student had no record. Enrolled students: {r_start.get('enrolled_count')}")
else:
    print("  Could not start session")

# ════════════════════════════════════════════════════════════════════════
# UAT-24 RE-RUN: Teacher filters attendance by date range
# ════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print(" UAT-24 RE-RUN: Teacher filters attendance by date range")
print("="*70)

# The attendance/history endpoint is student-only — no date filter params
# Teachers use attendance/report/<class_id> and session/class/<class_id>
sc, r = get('/api/attendance/report/2', teacher_token)
print(f"  GET /attendance/report/2 (teacher): {sc}")
if isinstance(r, dict):
    print(f"    class={r.get('class_name')} total_sessions={r.get('total_sessions')}")
    for s in r.get('students', []):
        print(f"    {s.get('fullname')}: {s.get('attendance_percentage')}% present={s.get('sessions_present')}/{s.get('total_sessions')} at_risk={s.get('at_risk')}")

# Session list — does it support date filter?
sc2, sessions_all = get('/api/session/class/2', teacher_token)
print(f"  GET /session/class/2 (all sessions): {sc2} count={len(sessions_all.get('sessions',[])) if isinstance(sessions_all,dict) else 'ERR'}")
if isinstance(sessions_all, dict):
    for s in sessions_all.get('sessions', []):
        print(f"    session_id={s.get('session_id')[:8]}... start={s.get('start_time','')[:10]} status={s.get('status')}")

# Try date params on session/class
sc3, r3 = get('/api/session/class/2?start_date=2026-07-01&end_date=2026-07-31', teacher_token)
print(f"  GET /session/class/2?start_date=...&end_date=...: {sc3} sessions={len(r3.get('sessions',[])) if isinstance(r3,dict) else 'SAME_AS_BEFORE'}")
print(f"  NOTE: No date-range filter param on any session or attendance endpoint for teachers")

# ════════════════════════════════════════════════════════════════════════
# UAT-35 RE-RUN: Check at-risk notification logic in source
# ════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print(" UAT-35 RE-RUN: Teacher notified when student at-risk")
print("="*70)

# Check if any at-risk notification is sent to teachers in session end
# Source: routes/session.py end_session() — send_absence_notification to STUDENTS
# notifications.py — no send_at_risk_notification function exists
# admin dashboard has at-risk endpoint, but it's admin-only

sc, t_notifs = get('/api/notifications/my-notifications', teacher_token)
print(f"  Teacher notifications: {sc} count={len(t_notifs) if isinstance(t_notifs,list) else t_notifs}")
if isinstance(t_notifs, list):
    for n in t_notifs[:5]:
        print(f"    type={n.get('type')} msg={n.get('message','')[:80]}")

sc2, at_risk = get('/api/admin/dashboard/at-risk-students', admin_token)
print(f"  At-risk students (admin view): {sc2} count={len(at_risk.get('students',[])) if isinstance(at_risk,dict) else 'ERR'}")
if isinstance(at_risk, dict):
    for s in at_risk.get('students',[]):
        print(f"    {s.get('fullname')} {s.get('attendance_percent')}% class={s.get('class_name')}")

print(f"\n  SOURCE ANALYSIS:")
print(f"  - services/notifications.py has: send_absence_notification (to student),")
print(f"    send_excuse_approved_notification, send_excuse_rejected_notification,")
print(f"    send_waiver_request_notification (to admin)")
print(f"  - NO send_at_risk_notification or any teacher-targeted at-risk alert function exists")
print(f"  - routes/session.py end_session() only notifies ABSENT STUDENTS — not teachers")
print(f"  - admin dashboard has at-risk view but it is admin-only, not pushed to teacher")
