import sys, os
sys.path.insert(0, r'c:\Users\sajak\Project_Capstone\Backend Sajak\backend\backend')
os.chdir(r'c:\Users\sajak\Project_Capstone\Backend Sajak\backend\backend')

from app import create_app
app = create_app()
with app.app_context():
    from models.user import User
    users = User.query.all()
    for u in users:
        print(f"id={u.id} role={u.role} email={u.email} active={u.is_active} name={u.fullname}")
