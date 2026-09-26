#!/usr/bin/env python3
"""Seed the per-day harness accounts directly in Mongo (bypasses the 5/hour
register rate limit — auth.py:158). Run with the server's venv python:
  /tmp/tjb-venv/bin/python scripts/seed_informed_choice_users.py
"""
import sys, datetime
sys.path.insert(0, '/Users/socializerender/.openclaw/workspace/Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/backend')
from passlib.context import CryptContext
from pymongo import MongoClient

DAY = datetime.datetime.now().strftime('%Y%m%d')
ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')
db = MongoClient('mongodb://localhost:27017')['tjb_test']

for role in ('MIDWIFE', 'MOM'):
    email = f'ic_{role.lower()}_{DAY}@example.com'
    if db.users.find_one({'email': email}):
        print('exists', email); continue
    db.users.insert_one({
        'user_id': f'user_ic{role.lower()}{DAY}',
        'email': email,
        'full_name': 'IC Harness ' + role,
        'role': role,
        'password_hash': ctx.hash('TestPass123!'),
        'onboarding_completed': True,
        'tutorial_completed': True,
        'email_verified': True,
        'created_at': datetime.datetime.now(datetime.UTC).isoformat(),
    })
    print('seeded', email)

