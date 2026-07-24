import urllib.request, json, urllib.error, sqlite3

BASE     = 'http://localhost:5000'
db_path  = r'c:\Users\sajak\Project_Capstone\Backend Sajak\backend\backend\database\attendance.db'

def post(path, data, token=None):
    body = json.dumps(data).encode()
    req  = urllib.request.Request(BASE+path, data=body, method='POST')
    req.add_header('Content-Type','application/json')
    if token: req.add_header('Authorization','Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def get(path, token=None):
    req = urllib.request.Request(BASE+path)
    if token: req.add_header('Authorization','Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def put(path, data, token=None):
    body = json.dumps(data).encode()
    req  = urllib.request.Request(BASE+path, data=body, method='PUT')
    req.add_header('Content-Type','application/json')
    if token: req.add_header('Authorization','Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}

def sep(n, title):
    print(f"\n{'='*70}\n UAT-{n}: {title}\n{'='*70}")

def db(sql, params=()):
    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()
    cur.execute(sql, params)
    rows = cur.fetchall()
    conn.close()
    return rows

# ── Login all roles ────────────────────────────────────────────────────────────
sc, r = post('/api/auth/login', {'email':'admin@mytimes.com','password':'admin123'})
admin_token = r.get('token','')
print(f"ADMIN  : {sc} {r.get('fullname')}")

sc, r = post('/api/auth/login', {'email':'student1@capstone.com','password':'student123'})
student_token   = r.get('token','')
student_user_id = r.get('user_id')
print(f"STUDENT: {sc} {r.get('fullname')} user_id={student_user_id}")

put('/api/admin/user/6', {'password':'teacher123'}, admin_token)
sc, r = post('/api/auth/login', {'email':'teacher1@test.com','password':'teacher123'})
teacher_token   = r.get('token','')
teacher_user_id = r.get('user_id')
print(f"TEACHER: {sc} {r.get('fullname')} user_id={teacher_user_id}")

put('/api/admin/user/5', {'password':'teacher123'}, admin_token)
sc, r = post('/api/auth/login', {'email':'ramesh@mytimes.com','password':'teacher123'})
teacher5_token = r.get('token','')
print(f"TEACH5 : {sc} {r.get('fullname')}")

# ════════════════════════════════════════════════════════════════════════
# UAT-36: Student marks a notification as read
# ════════════════════════════════════════════════════════════════════════
sep(36, "Student marks a notification as read")

# --- BEFORE state ---
sc, notifs = get('/api/notifications/my-notifications', student_token)
print(f"  GET /notifications/my-notifications: {sc}  total={len(notifs) if isinstance(notifs,list) else 'ERR'}")
if isinstance(notifs, list):
    for n in notifs[:4]:
        print(f"    notif_id={n.get('notif_id')} type={n.get('type')} is_read={n.get('is_read')}  msg={str(n.get('message',''))[:55]}")

sc2, uc_before = get('/api/notifications/unread-count', student_token)
print(f"  unread-count BEFORE: {sc2}  unread={uc_before.get('unread_count')}")

# --- Action: first, seed an unread notification via admin so we have something fresh to mark ---
sc_send, r_send = post('/api/notifications/send',
    {'user_id': student_user_id, 'type': 'General',
     'title': 'UAT36 test', 'message': 'UAT36: mark-as-read test notification'},
    admin_token)
print(f"  Admin send test notification: {sc_send}  notif_id={r_send.get('notif_id')} => {r_send.get('message','')}")

# Refresh list to get the new unread notif
sc3, notifs2 = get('/api/notifications/my-notifications', student_token)
unread_list = [n for n in notifs2 if not n.get('is_read')] if isinstance(notifs2, list) else []
print(f"  After send — total={len(notifs2) if isinstance(notifs2,list) else '?'}  unread={len(unread_list)}")

sc4, uc_mid = get('/api/notifications/unread-count', student_token)
print(f"  unread-count after send: {sc4}  unread={uc_mid.get('unread_count')}")

# --- Action: mark-read via PUT /api/notifications/mark-read (bulk endpoint) ---
sc5, r5 = put('/api/notifications/mark-read', {}, student_token)
print(f"  PUT /notifications/mark-read (bulk): {sc5}  => {r5}")

# --- AFTER state ---
sc6, uc_after = get('/api/notifications/unread-count', student_token)
print(f"  unread-count AFTER mark-read: {sc6}  unread={uc_after.get('unread_count')}")

sc7, notifs3 = get('/api/notifications/my-notifications', student_token)
still_unread = [n for n in notifs3 if not n.get('is_read')] if isinstance(notifs3, list) else []
print(f"  Still-unread after bulk mark-read: {len(still_unread)}")

# --- Verify in DB ---
db_rows = db("SELECT notif_id, is_read, type FROM notifications WHERE user_id=? ORDER BY sent_at DESC LIMIT 5",
             (student_user_id,))
print(f"  DB notifications (user_id={student_user_id}): {db_rows}")

# --- Test individual mark-read by notif_id ---
target_id = notifs3[0].get('notif_id') if notifs3 else None
print(f"\n  Testing individual mark-read for notif_id={target_id}:")
sc8, r8 = put(f'/api/notifications/mark-read/{target_id}', {}, student_token)
print(f"  PUT /notifications/mark-read/{target_id}: {sc8} => {r8}")
sc9, r9 = post(f'/api/notifications/{target_id}/read', {}, student_token)
print(f"  POST /notifications/{target_id}/read: {sc9} => {r9}")

# ════════════════════════════════════════════════════════════════════════
# UAT-37: Admin searches for a specific student by name
# ════════════════════════════════════════════════════════════════════════
sep(37, "Admin searches for a specific student by name")

# --- Full unfiltered list (baseline) ---
sc, all_stu = get('/api/student/list', admin_token)
print(f"  GET /student/list (no filter): {sc}  count={len(all_stu) if isinstance(all_stu,list) else 'ERR'}")
if isinstance(all_stu, list):
    for s in all_stu:
        print(f"    student_id={s.get('student_id')} fullname={s.get('fullname')} roll={s.get('roll_number')}")

# --- Search params: try all plausible query-param names ---
for param in ['search','q','name','query','filter']:
    sc2, r2 = get(f'/api/student/list?{param}=Student+Two', admin_token)
    count = len(r2) if isinstance(r2,list) else '?'
    first = r2[0].get('fullname','') if isinstance(r2,list) and r2 else ''
    print(f"  ?{param}=Student+Two => {sc2}  count={count}  first_name={first}")

# --- Admin students endpoint ---
sc3, r3 = get('/api/admin/students?search=Student+Two', admin_token)
print(f"  GET /admin/students?search=Student+Two: {sc3}  => {str(r3)[:120]}")

# --- Source verdict from ManageStudentsScreen.js ---
print(f"\n  SOURCE: ManageStudentsScreen.js filters client-side:")
print(f"    const filtered = students.filter(s => {{")
print(f"      const q = searchQuery.trim().toLowerCase();")
print(f"      return (s.fullname||'').toLowerCase().includes(q) || ...")
print(f"    }})")
print(f"  No search param is sent to the backend — all 4 students always fetched,")
print(f"  then filtered in React state by name, roll_number, program, or email.")

# ════════════════════════════════════════════════════════════════════════
# UAT-38: Teacher views total number of sessions held for a class
# ════════════════════════════════════════════════════════════════════════
sep(38, "Teacher views total sessions held for a class")

# Teacher's class list
sc, classes = get('/api/session/classes', teacher_token)
print(f"  GET /session/classes: {sc}  count={len(classes) if isinstance(classes,list) else 'ERR'}")
if isinstance(classes, list):
    for c in classes:
        print(f"    class_id={c.get('class_id')} name={c.get('class_name')} subject={c.get('subject')}")

# Session list for class 2 — direct count visible here
sc2, class_detail = get('/api/session/class/2', teacher_token)
sessions = class_detail.get('sessions',[]) if isinstance(class_detail,dict) else []
print(f"  GET /session/class/2: {sc2}  sessions_returned={len(sessions)}")
for s in sessions:
    print(f"    {s.get('session_id','')[:8]}...  start={s.get('start_time','')[:10]}  status={s.get('status')}  present={s.get('present_count')}  absent={s.get('absent_count')}")

# Attendance report — total_sessions field
sc3, report = get('/api/attendance/report/2', teacher_token)
print(f"  GET /attendance/report/2: {sc3}")
if isinstance(report, dict):
    print(f"    class_name={report.get('class_name')}  total_sessions={report.get('total_sessions')}")
    for stu in report.get('students',[]):
        print(f"    {stu.get('fullname')}: present={stu.get('sessions_present')}/{stu.get('total_sessions')}  pct={stu.get('attendance_percentage')}%  at_risk={stu.get('at_risk')}")

# DB ground truth
db_total  = db("SELECT COUNT(*) FROM sessions WHERE class_id=2")[0][0]
db_closed = db("SELECT COUNT(*) FROM sessions WHERE class_id=2 AND status='CLOSED'")[0][0]
print(f"  DB: class_id=2 total_sessions={db_total}  CLOSED={db_closed}")
api_total = report.get('total_sessions') if isinstance(report,dict) else None
print(f"  API total_sessions={api_total}  matches DB CLOSED: {api_total == db_closed}")

# ════════════════════════════════════════════════════════════════════════
# UAT-39: Student checks overall attendance % across all classes
# ════════════════════════════════════════════════════════════════════════
sep(39, "Student checks overall attendance % across all classes")

sc, analytics = get('/api/attendance/analytics', student_token)
print(f"  GET /attendance/analytics: {sc}")
if isinstance(analytics, dict):
    name    = analytics.get('name')
    total   = analytics.get('total', 0)
    present = analytics.get('present', 0)
    absent  = analytics.get('absent', 0)
    pct     = analytics.get('percentage')
    print(f"  Student: {name}")
    print(f"  Overall: total_sessions={total}  present={present}  absent={absent}  overall_pct={pct}%")
    print(f"  Per-class breakdown:")
    for c in analytics.get('classes',[]):
        print(f"    course={c.get('course')}  attendance={c.get('attendance')}%  present={c.get('present')}  absent={c.get('absent')}  risk={c.get('risk')}")

# DB verification: student_id=1 (user_id=2)
db_records = db("""
    SELECT ar.status, COUNT(*)
    FROM attendance_records ar
    JOIN students s ON s.student_id = ar.student_id
    WHERE s.user_id = ?
    GROUP BY ar.status""", (student_user_id,))
print(f"\n  DB attendance_records for user_id={student_user_id}: {db_records}")
db_present = sum(c for s,c in db_records if s=='Present')
db_total_r = sum(c for s,c in db_records)
db_pct = round(db_present/db_total_r*100, 1) if db_total_r > 0 else 0
print(f"  DB computed: present={db_present}/{db_total_r} = {db_pct}%")
print(f"  API present={present}/{total}  API pct={pct}%")
print(f"  Match: {present==db_present and total==db_total_r}")

# History endpoint
sc2, hist = get('/api/attendance/history', student_token)
print(f"\n  GET /attendance/history: {sc2}  count={len(hist) if isinstance(hist,list) else 'ERR'}")
if isinstance(hist, list):
    for h in hist:
        print(f"    class={h.get('class_name')}  date={h.get('date')}  status={h.get('status')}")

# ════════════════════════════════════════════════════════════════════════
# UAT-40: Admin edits a class's name/details successfully
# ════════════════════════════════════════════════════════════════════════
sep(40, "Admin edits a class's name and details")

before_db = db("SELECT class_id, class_name, subject, room, duration_minutes FROM classes WHERE class_id=2")[0]
print(f"  DB BEFORE: {before_db}")

sc2, r_put = put('/api/admin/class/2',
    {'class_name':'CS101-UAT40', 'subject':'Intro to CS (EDITED)', 'duration_minutes':90},
    admin_token)
print(f"  PUT /api/admin/class/2 (name+subject+duration): {sc2}")
print(f"  Response: class_name={r_put.get('class_name')} subject={r_put.get('subject')} duration={r_put.get('duration_minutes')} id={r_put.get('class_id')}")

after_db = db("SELECT class_id, class_name, subject, room, duration_minutes FROM classes WHERE class_id=2")[0]
print(f"  DB AFTER:  {after_db}")
print(f"  name changed:     {before_db[1]} -> {after_db[1]}  => {'YES' if before_db[1]!=after_db[1] else 'NO-UNCHANGED'}")
print(f"  subject changed:  {before_db[2]} -> {after_db[2]}  => {'YES' if before_db[2]!=after_db[2] else 'NO-UNCHANGED'}")
print(f"  duration changed: {before_db[4]} -> {after_db[4]}  => {'YES' if before_db[4]!=after_db[4] else 'NO-UNCHANGED'}")

# Verify via GET
sc3, r_get = get('/api/session/class/2', admin_token)
print(f"  GET /session/class/2 after edit: {sc3}  class_name={r_get.get('class_name')}  subject={r_get.get('subject')}")

# Restore
put('/api/admin/class/2', {'class_name':'CS101','subject':'Intro to CS','duration_minutes':60}, admin_token)
restored = db("SELECT class_id, class_name, subject, duration_minutes FROM classes WHERE class_id=2")[0]
print(f"  Restored to: {restored}")

# ════════════════════════════════════════════════════════════════════════
# UAT-41: Teacher ends a session and immediately sees final attendance count
# ════════════════════════════════════════════════════════════════════════
sep(41, "Teacher ends session — immediately sees final attendance count")

# Use class 2 / teacher6
sc_start, r_start = post('/api/session/start', {'class_id':2, 'mode':'Strict'}, teacher_token)
sess_id = r_start.get('session_id','')
print(f"  POST /session/start class_id=2: {sc_start}")
print(f"    session_id={sess_id[:16]}...  enrolled={r_start.get('enrolled_count')}  status={r_start.get('status')}")

if sess_id:
    # Check live status mid-session
    sc2, r_status = get(f'/api/session/status/{sess_id}', teacher_token)
    print(f"\n  GET /session/status/{sess_id[:12]}... (LIVE): {sc2}")
    if isinstance(r_status, dict):
        print(f"    status={r_status.get('status')}  enrolled={len(r_status.get('enrolled_students',[]))}  scanned={r_status.get('scanned_count')}  present={r_status.get('present_count')}  absent={r_status.get('absent_count')}")

    # End the session
    sc3, r_end = post('/api/session/end', {'session_id': sess_id}, teacher_token)
    print(f"\n  POST /session/end: {sc3}")
    print(f"    message='{r_end.get('message','')}'")
    summary = r_end.get('summary',{})
    print(f"    summary IN END RESPONSE: total={summary.get('total')}  present={summary.get('present')}  absent={summary.get('absent')}  present_pct={summary.get('present_percentage')}%")

    # Immediately check session/class list — does it update in place?
    sc4, r_class = get('/api/session/class/2', teacher_token)
    sessions_after = r_class.get('sessions',[]) if isinstance(r_class,dict) else []
    latest = next((s for s in sessions_after if s.get('session_id')==sess_id), None)
    print(f"\n  GET /session/class/2 immediately after end: {sc4}  sessions={len(sessions_after)}")
    if latest:
        print(f"    latest session: status={latest.get('status')}  present={latest.get('present_count')}  absent={latest.get('absent_count')}  total={latest.get('total_enrolled')}")
    else:
        print(f"    (new session not found in list — check session_ids)")

    # Attendance report — updated immediately?
    sc5, r_rep = get('/api/attendance/report/2', teacher_token)
    print(f"\n  GET /attendance/report/2 immediately after end: {sc5}  total_sessions={r_rep.get('total_sessions') if isinstance(r_rep,dict) else '?'}")
    if isinstance(r_rep, dict):
        for stu in r_rep.get('students',[]):
            print(f"    {stu.get('fullname')}: {stu.get('sessions_present')}/{stu.get('total_sessions')}  {stu.get('attendance_percentage')}%  at_risk={stu.get('at_risk')}")

    # DB ground truth
    db_recs = db("SELECT status, COUNT(*) FROM attendance_records WHERE session_id=? GROUP BY status", (sess_id,))
    print(f"\n  DB attendance_records for this session: {db_recs}")
    db_total_s  = db("SELECT COUNT(*) FROM sessions WHERE class_id=2")[0][0]
    print(f"  DB total sessions for class_id=2: {db_total_s}")
else:
    print("  Could not start session")
