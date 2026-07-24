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
        return e.code, json.loads(e.read())

def get(path, token=None):
    req = urllib.request.Request(BASE+path)
    if token:
        req.add_header('Authorization', 'Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

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
        return e.code, json.loads(e.read())

def delete(path, data=None, token=None):
    body = json.dumps(data).encode() if data else b''
    req = urllib.request.Request(BASE+path, data=body, method='DELETE')
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer '+token)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

# ── Discover available users from the DB via health/admin ────────────────────
print("=== CHECKING HEALTH ===")
sc, r = get('/health/')
print('HEALTH:', sc, json.dumps(r))

# Try common credentials
creds = [
    ('admin@mytimes.com', 'admin123'),
    ('admin@attendance.edu', 'admin123'),
    ('admin@iimscollege.edu.np', 'admin123'),
    ('admin@test.com', 'admin123'),
    ('admin', 'admin123'),
]
admin_token = ''
for em, pw in creds:
    sc, r = post('/api/auth/login', {'email': em, 'password': pw})
    print(f'ADMIN_LOGIN {em}: {sc} {json.dumps(r)[:120]}')
    if sc == 200:
        admin_token = r.get('token', '')
        break

# Try teacher
teacher_creds = [
    ('teacher@mytimes.com', 'teacher123'),
    ('teacher@test.com', 'teacher123'),
    ('teacher@iimscollege.edu.np', 'teacher123'),
]
teacher_token = ''
for em, pw in teacher_creds:
    sc, r = post('/api/auth/login', {'email': em, 'password': pw})
    print(f'TEACHER_LOGIN {em}: {sc} {json.dumps(r)[:120]}')
    if sc == 200:
        teacher_token = r.get('token', '')
        teacher_user_id = r.get('user_id', '')
        break

# Try student
student_creds = [
    ('student@mytimes.com', 'student123'),
    ('student@test.com', 'student123'),
    ('student@iimscollege.edu.np', 'student123'),
]
student_token = ''
for em, pw in student_creds:
    sc, r = post('/api/auth/login', {'email': em, 'password': pw})
    print(f'STUDENT_LOGIN {em}: {sc} {json.dumps(r)[:120]}')
    if sc == 200:
        student_token = r.get('token', '')
        student_user_id = r.get('user_id', '')
        break

print(f'\nTOKENS: admin={bool(admin_token)} teacher={bool(teacher_token)} student={bool(student_token)}')
