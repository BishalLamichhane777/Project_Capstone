import sqlite3
db_path = r'c:\Users\sajak\Project_Capstone\Backend Sajak\backend\backend\database\attendance.db'
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute('PRAGMA table_info(notifications)')
print('notifications columns:', [c[1] for c in cur.fetchall()])
cur.execute('PRAGMA table_info(classes)')
print('classes columns:', [c[1] for c in cur.fetchall()])
cur.execute('SELECT * FROM notifications WHERE user_id=2 LIMIT 3')
print('sample notifications (user_id=2):', cur.fetchall())
conn.close()
