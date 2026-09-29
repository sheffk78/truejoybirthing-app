import os

from passlib.context import CryptContext
from pymongo import MongoClient

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
c = MongoClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = c['truejoybirthing_test']

fixes = [
    ('demo.mom@truejoybirthing.com', 'DemoScreenshot2024!'),
    ('demo.doula@truejoybirthing.com', 'DemoScreenshot2024!'),
    ('demo.midwife@truejoybirthing.com', 'DemoScreenshot2024!'),
    ('testmidwife@test.com', 'password123'),
    ('marketplace_doula@test.com', 'password123'),
    ('midwife@test.com', 'password123'),
    ('testdoula123@test.com', 'password123'),
    ('testmom@test.com', 'password123'),
    ('testmom_msg@test.com', 'password123'),
]
for email, pw in fixes:
    u = db.users.find_one({'email': email})
    if not u:
        print(email, 'MISSING — creating')
        db.users.insert_one({
            'email': email,
            'password_hash': pwd_context.hash(pw),
            'user_id': f'user_{email.split("@")[0]}',
            'full_name': email.split('@')[0].replace('.', ' ').title(),
            'role': 'MOM' if 'mom' in email else ('DOULA' if 'doula' in email else 'MIDWIFE'),
            'email_verified': True,
            'onboarding_completed': True,
            'created_at': __import__('datetime').datetime.now(__import__('datetime').timezone.utc),
        })
        continue
    cur = u.get('password_hash') or ''
    if not pwd_context.verify(pw, cur):
        db.users.update_one({'email': email}, {'$set': {'password_hash': pwd_context.hash(pw)}})
        print(email, 'HASH RESET to', pw)
    else:
        print(email, 'hash ok')