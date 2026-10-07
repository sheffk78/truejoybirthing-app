#!/usr/bin/env python3
"""Informed-choice feature regression harness (Part A of QA-KICKOFF 2026-09-25).
Durable, re-runnable: python3 scripts/verify_informed_choice.py [BASE_URL]
Pass = all checks green + validator green."""
import sys, json, urllib.request, urllib.error, base64, io, time, datetime

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8899/api'
results = []

def check(name, fn):
    try:
        fn()
        results.append((name, 'PASS', ''))
    except AssertionError as e:
        results.append((name, 'FAIL', str(e)[:140]))
    except Exception as e:
        results.append((name, 'ERROR', f'{type(e).__name__}: {str(e)[:140]}'))

def req(path, method='GET', body=None, token=None, expect=200):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None: r.add_header('Content-Type', 'application/json')
    if token: r.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def jbody(b): return json.loads(b.decode() or '{}')

DAY = time.strftime('%Y%m%d')
PW = 'TestPass123!'

def register(role, name):
    """Login a pre-seeded harness account (seeded directly in Mongo — register
    is rate-limited 5/hour (auth.py:158), which breaks repeat regression runs).
    Seed via: scripts/seed_informed_choice_users.py"""
    email = f'ic_{role.lower()}_{DAY}@example.com'
    code, b = req('/auth/login', 'POST', {'email': email, 'password': PW})
    if code != 200:
        time.sleep(2)
        code, b = req('/auth/register', 'POST', {'email': email, 'password': PW, 'full_name': name, 'role': role})
    assert code == 200, f'login/register {role} → {code}: {b[:120]}'
    j = jbody(b)
    assert j.get('session_token'), 'no token'
    return j['session_token'], j.get('user_id', '')

# 1. language gate: banned phrase → 422
def t1():
    mw, _ = register('MIDWIFE', 'MW LangGate')
    code, b = req('/informed-choice/CA/create', 'POST', {'client_id': 'c_lang', 'client_name': 'Lang Gate Mom (this refusal is against medical advice)', 'midwife_id': 'm1', 'midwife_name': 'Lang Gate MW', 'state_code': 'CA', 'decisions': {}}, mw, 422)
    assert code == 422, f'expected 422, got {code}: {b[:150]}'
check('1 language gate 422', t1)

# 2. clean create → 200 + doc_id
mw, mwid = register('MIDWIFE', 'MW Main')
mom, momid = register('MOM', 'Mom Main')
def t2():
    global doc_id
    code, b = req('/informed-choice/CA/create', 'POST', {'client_id': momid, 'client_name': 'IC Mom', 'midwife_id': mwid, 'midwife_name': 'IC MW', 'state_code': 'CA', 'decisions': {'metabolic_screening': {'choice': 'opt_out'}, 'vitamin_k': {'choice': 'opt_in', 'option': 'oral'}, 'group_b_strep': {'choice': 'opt_in'}}}, mw)
    assert code == 200, f'create → {code}: {b[:150]}'
    j = jbody(b)
    global doc_id
    doc_id = j.get('doc_id') or j.get('id')
    assert doc_id, f'no doc_id in {list(j.keys())}'
check('2 create doc 200', t2)

# 3. preview renders 8 items (TX, no create) — mom reads fine
def t3():
    code, b = req('/informed-choice/TX', 'GET', token=mom)
    assert code == 200, f'preview → {code}: {b[:120]}'
    j = jbody(b)
    items = j.get('items') or (j.get('doc') or {}).get('items')
    assert items and len(items) == 8, f'expected 8 items, got {len(items) if items else 0}'
check('3 preview 8 items', t3)

# 4. MOM cannot create (403)
def t4():
    code, b = req('/informed-choice/CA/create', 'POST', {'client_id': 'x', 'client_name': 'x', 'midwife_id': 'y', 'midwife_name': 'y', 'decisions': {}}, mom)
    assert code in (403, 401), f'MOM create → {code} (expected 403)'
check('4 MOM create 403', t4)

# 5. mom signs → then midwife countersigns → retention stamped at FINAL signature (2036)
def t5():
    code, b = req(f'/informed-choice/{doc_id}/sign', 'POST', {'signer': 'mom', 'signature_name': 'IC Mom'}, mom)
    assert code == 200, f'mom sign → {code}: {b[:150]}'
    j = jbody(b)
    assert not j.get('retention_until'), 'retention must NOT stamp before dual signature'
check('5 mom sign (no retention yet)', t5)

# 6. re-sign same signer → 400
def t6():
    code, b = req(f'/informed-choice/{doc_id}/sign', 'POST', {'signer': 'mom', 'signature_name': 'Again'}, mom)
    assert code in (400, 409), f're-sign → {code} (expected 400/409): {b[:120]}'
check('6 re-sign 400', t6)

# 6b. midwife countersigns → final signature → retention stamped (2036)
def t7():
    code, b = req(f'/informed-choice/{doc_id}/sign', 'POST', {'signer': 'midwife', 'signature_name': 'IC MW'}, mw)
    assert code == 200, f'midwife sign → {code}: {b[:150]}'
    j = jbody(b)
    ru = j.get('retention_until')
    assert ru, f'retention not stamped at final signature: {list(j.keys())[:8]}'
    year = int(ru[:4])
    expected = (datetime.datetime.now().year + 10)
    assert year == expected, f'retention year {year} != {expected}'
check('7 countersign + retention stamped', t7)

# 8. PDF bytes
def t8():
    code, b = req(f'/informed-choice/{doc_id}/pdf', 'GET', token=mw)
    assert code == 200, f'pdf → {code}'
    assert b[:5] == b'%PDF-', f'not PDF bytes: {b[:20]}'
check('8 pdf bytes', t8)

# 9. client list (midwife view)
def t9():
    code, b = req(f'/informed-choice/client/{momid}', 'GET', token=mw)
    assert code == 200, f'client list → {code}: {b[:150]}'
    j = jbody(b)
    docs = j.get('docs') or j.get('documents') or []
    assert any((d.get('id') or d.get('doc_id') or d.get('_id')) == doc_id for d in docs), 'doc not in client list'
check('9 client list', t9)

# 10. state-resources: CA + ZZ fallback + unauth 401
def t10():
    code, b = req('/state-resources/CA', 'GET', token=mom)
    assert code == 200, f'CA → {code}'
    j = jbody(b)
    assert len((j.get('procedures') or {})) == 8, 'CA procedures != 8'
    code, b = req('/state-resources/ZZ', 'GET', token=mom)
    assert code in (200, 404), f'ZZ → {code}'
check('10 state-resources CA 8 + ZZ fallback', t10)

def t11():
    code, b = req('/state-resources/CA', 'GET')
    assert code == 401, f'unauth → {code} (expected 401)'
check('11 unauth 401', t11)

fails = [r for r in results if r[1] != 'PASS']
for name, st, msg in results:
    print(f'{st:5} {name}' + (f' — {msg}' if msg else ''))
print(f'\n{len(results) - len(fails)}/{len(results)} PASS')
sys.exit(1 if fails else 0)
