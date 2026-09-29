import os

from pymongo import MongoClient

c = MongoClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = c['truejoybirthing_test']
for u in db.users.find({}, {'_id': 0, 'email': 1, 'role': 1, 'password_hash': 1}):
    print(u.get('email'), u.get('role'), 'has_hash' if u.get('password_hash') else 'NO_HASH')