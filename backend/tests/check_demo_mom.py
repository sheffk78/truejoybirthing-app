import os

from passlib.context import CryptContext
from pymongo import MongoClient

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
c = MongoClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = c['truejoybirthing_test']

# verify demo.mom's stored hash against the expected password
u = db.users.find_one({'email': 'demo.mom@truejoybirthing.com'})
if not u:
    print('demo.mom MISSING')
else:
    h = u.get('password_hash') or ''
    ok = pwd_context.verify('DemoScreenshot2024!', h) if h else False
    ok2 = pwd_context.verify('password123', h) if h else False
    print('DemoScreenshot2024! matches:', ok, '| password123 matches:', ok2)
    print('keys:', sorted(u.keys()))