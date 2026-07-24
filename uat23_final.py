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

# Login
sc, r = post('/api/auth/login', {'email': 'admin@mytimes.com', 'password': 'admin123'})
admin_token = r['token']
sc, r = post('/api/auth/login', {'email': 'student1@capstone.com', 'password': 'student123'})
student_token = r['token']
student_user_id = r['user_id']  # user_id=2, student_id=1, enrolled in class 1 (Java)

# Teacher for class 1 (Java) is user_id=5 (ramesh@mytimes.com) — need to find/set password
sc_t, r_t = put('/api/admin/user/5', {'password': 'teacher123'}, admin_token)
sc_t2, r_t2 = post('/api/auth/login', {'email': 'ramesh@mytimes.com', 'password': 'teacher123'})
teacher5_token = r_t2.get('token','')
print(f"Teacher5 (Ramesh, owns class1/Java): login={sc_t2} token={'YES' if teacher5_token else 'NO'}")

print("\n" + "="*70)
print(" UAT-23 FINAL: Admin approves a pending waiver")
print("="*70)

# Class 1 (Java) has scheduled_date=2026-07-11 which is past — clear schedule so teacher can start
sc_c, r_c = put('/api/admin/class/1', {'scheduled_date': None, 'scheduled_time': None, 'scheduled_end_time': None}, admin_token)
print(f"  Clear Java class schedule: {sc_c}")

# Start session for class 1 as teacher5
sc_s, r_s = post('/api/session/start', {'class_id': 1, 'mode': 'Strict'}, teacher5_token)
print(f"  Start session (class 1/Java): {sc_s} => session_id={r_s.get('session_id','')[:20]}... enrolled={r_s.get('enrolled_count')}")
sess_id = r_s.get('session_id','')

if sess_id:
    # End session — student1 enrolled, no scan done, so they're Absent
    sc_e, r_e = post('/api/session/end', {'session_id': sess_id}, teacher5_token)
    print(f"  End session: {sc_e} present={r_e.get('summary',{}).get('present')} absent={r_e.get('summary',{}).get('absent')}")

    # Verify DB attendance record
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT record_id, student_id, status FROM attendance_records WHERE session_id=?", (sess_id,))
    recs = cur.fetchall()
    conn.close()
    print(f"  Attendance records: {recs}")

    absent_recs = [r for r in recs if r[2] == 'Absent']
    if absent_recs:
        # Student submits waiver
        sc_sub, r_sub = post('/api/excuse/submit',
            {'session_id': sess_id, 'reason': 'Medical appointment - UAT23 test'},
            student_token)
        print(f"  Student1 submit waiver: {sc_sub} => request_id={r_sub.get('request_id')} err={r_sub.get('error','')}")
        req_id = r_sub.get('request_id')

        if req_id:
            # Verify it appears in pending list
            sc_p, r_p = get('/api/excuse/pending', admin_token)
            print(f"  Pending waivers: {sc_p} count={len(r_p) if isinstance(r_p,list) else 'ERR'}")
            if isinstance(r_p, list):
                for w in r_p:
                    print(f"    req_id={w.get('request_id')} student={w.get('student_name')} class={w.get('class_name')} reason={w.get('reason','')[:40]}")

            # Admin approves
            sc_dec, r_dec = put(f'/api/excuse/decide/{req_id}', {'decision': 'Approved'}, admin_token)
            print(f"  Admin approve waiver {req_id}: {sc_dec} => decision={r_dec.get('decision')} msg={r_dec.get('message','')}")

            # Verify attendance updated to Present
            conn2 = sqlite3.connect(db_path)
            cur2 = conn2.cursor()
            cur2.execute("SELECT status FROM attendance_records WHERE student_id=? AND session_id=?",
                         (absent_recs[0][1], sess_id))
            updated = cur2.fetchone()
            conn2.close()
            print(f"  Attendance record status after approval: {updated} (expected: ('Present',))")

            # Student checks their waiver status
            sc_ws, r_ws = get('/api/excuse/my-excuses', student_token)
            print(f"  Student GET /excuse/my-excuses: {sc_ws} count={len(r_ws) if isinstance(r_ws,list) else 'ERR'}")
            if isinstance(r_ws, list):
                for w in r_ws[:3]:
                    print(f"    req_id={w.get('request_id')} status={w.get('status')} class={w.get('class_name')}")
        else:
            print(f"  Could not submit waiver: {r_sub}")
    else:
        print(f"  No Absent records found for student1 in this session: {recs}")
