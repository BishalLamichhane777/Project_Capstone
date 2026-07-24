from app import create_app
from models.user import User

app = create_app()
with app.app_context():
    students = User.query.filter_by(role='student').all()
    if not students:
        print('No student accounts found.')
    for u in students:
        sp = u.student_profile
        roll = sp.roll_number if sp else 'NO PROFILE'
        print(f'Email: {u.email}  |  Name: {u.fullname}  |  Roll: {roll}  |  Active: {u.is_active}')
