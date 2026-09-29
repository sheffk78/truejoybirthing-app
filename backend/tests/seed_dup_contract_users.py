import os

from passlib.context import CryptContext
from pymongo import MongoClient

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
c = MongoClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = c['truejoybirthing_test']
users = [
    ('testmidwife@test.com', 'midwife', 'Test Midwife'),
    ('marketplace_doula@test.com', 'doula', 'Test Doula'),
]
for email, role, name in users:
    if db.users.find_one({'email': email}):
        print(email, 'exists')
        continue
    db.users.insert_one({
        'email': email,
        'password': pwd_context.hash('password123'),
        'role': role,
        'name': name,
        'email_verified': True,
    })
    print(email, 'created')