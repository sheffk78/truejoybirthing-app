#!/usr/bin/env python3
"""Payment plans regression harness (Phase 8, Chante's ask #2).

Durable, re-runnable: python3 scripts/verify_payment_plans.py [BASE_URL]
Pass = all checks green. Exit 0 = all pass.

Tests:
  1. Seed provider + mom accounts (idempotent via upsert).
  2. Provider creates a draft invoice with a 3-installment payment plan.
  3. Verify plan roll-up: status='due', total=amount, installments all 'due'.
  4. Provider marks installment 1 paid â roll-up transitions to 'partial'.
  5. Provider marks installment 2 paid â roll-up stays 'partial' (1 remaining).
  6. Provider marks installment 3 paid â roll-up transitions to 'paid'.
  7. Mom can read the payment plan (respects active-relationship gating).
  8. Mom with no active relationship is blocked (403/401).
"""
import sys, json, urllib.request, urllib.error, time, datetime

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8899/api'
results = []

def check(name, fn):
    try:
        fn()
        results.append((name, 'PASS', ''))
    except AssertionError as e:
        results.append((name, 'FAIL', str(e)[:200]))
    except Exception as e:
        results.append((name, 'ERROR', f'{type(e).__name__}: {str(e)[:200]}'))

def req(path, method='GET', body=None, token=None, expect=200):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None:
        r.add_header('Content-Type', 'application/json')
    if token:
        r.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def jbody(b):
    return json.loads(b.decode() or '{}')

DAY = time.strftime('%Y%m%d')
PW = 'TestPass123!'

def _db_name():
    # Fail-fast: harness direct-Mongo seeds MUST run with the SAME DB_NAME the
    # server uses (run_e2e.sh + serve-backend.sh export DB_NAME). A silent
    # default desyncs seeds from API reads (t7/t11 404 mystery, 2026-10-01).
    import os as _os
    v = _os.environ.get('DB_NAME')
    if not v:
        raise SystemExit("Set DB_NAME to the server's database (run_e2e.sh exports it).")
    return v


def register(role, name):
    """Login a pre-seeded harness account or register if missing."""
    # Slug the name into the email so distinct roles-with-same-role (main mom vs orphan
    # mom) never collide on one account.
    slug = name.lower().replace(' ', '_')
    email = f'pp_{slug}_{DAY}@example.com'
    code, b = req('/auth/login', 'POST', {'email': email, 'password': PW})
    if code == 429:
        # Login is rate-limited 10/60s (auth.py:241) and register 5/hour (auth.py:158).
        # Back off, then re-login; if the account was never registered (register 429),
        # seed it directly in Mongo like scripts/seed_informed_choice_users.py does.
        for wait in (10, 20, 30):
            time.sleep(wait)
            code, b = req('/auth/login', 'POST', {'email': email, 'password': PW})
            if code != 429:
                break
        if code not in (200, 429):
            pass  # fall through to register path below
    if code != 200:
        # try register (5/hour); on 429 seed directly in Mongo + retry login
        code, b = req('/auth/register', 'POST', {'email': email, 'password': PW, 'full_name': name, 'role': role})
        if code == 429:
            import pymongo, datetime as _dt
            _db = pymongo.MongoClient('mongodb://localhost:27017')[_db_name()]
            from passlib.context import CryptContext
            _ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')
            _uid = f'user_pp{slug}{DAY}'
            _db.users.update_one(
                {'email': email},
                {'$set': {
                    'user_id': _uid,
                    'email': email,
                    'full_name': name,
                    'role': role,
                    'password_hash': _ctx.hash(PW),
                    'onboarding_completed': True,
                    'email_verified': True,
                    'created_at': _dt.datetime.now(datetime.timezone.utc).isoformat(),
                }},
                upsert=True)
            for wait in (10, 20, 30):
                time.sleep(wait)
                code, b = req('/auth/login', 'POST', {'email': email, 'password': PW})
                if code == 200:
                    break
    assert code == 200, f'login/register {role} â {code}: {b[:150]}'
    j = jbody(b)
    assert j.get('session_token'), 'no token'
    return j['session_token'], j.get('user_id', '')


# ââ 1. Seed accounts (idempotent) ââââââââââââââââââââââââââââââââââââââââââ
def t1():
    global mw_token, mw_id, mom_token, mom_id, client_id
    mw_token, mw_id = register('MIDWIFE', 'PP MW')
    mom_token, mom_id = register('MOM', 'PP Mom')
    # Ensure a client link exists: create a client record for the mom under this midwife.
    # NOTE: the route GENERATES its own client_id (ignores any client_id we send) and also
    # auto-links the mom by email — so we pass the mom's email and read back the real id.
    mw_email = f'pp_midwife_{DAY}@example.com'
    code, b = req('/midwife/clients', 'POST', {
        'name': 'PP Test Mom',
        'email': f'pp_pp_mom_{DAY}@example.com',
    }, mw_token, expect=200)
    assert code in (200, 409), f'ensure client → {code}: {b[:150]}'
    client_doc = jbody(b)
    client_id = client_doc.get('client_id') or f'pp_client_{DAY}'
    if client_doc.get('linked_mom_id') != mom_id and mom_id:
        # fallback link if the auto-link by email didn't match (email differs)
        req(f'/midwife/clients/{client_id}', 'PATCH', {'linked_mom_id': mom_id}, mw_token)
    # The mom invoice route scopes by ACTIVE provider relationship (share_requests doc,
    # status=accepted). Seed it + backfill linked_mom_id directly so the mom can see
    # this client's invoices. Idempotent.
    import urllib.request as _ur
    _mongo = __import__('pymongo').MongoClient('mongodb://localhost:27017')
    _db = _mongo[_db_name()]
    _db.share_requests.update_one(
        {'provider_id': mw_id, 'mom_user_id': mom_id},
        {'$set': {'status': 'accepted', 'relationship_status': 'active',
                  'provider_name': 'PP MW', 'created_at': DAY}},
        upsert=True)
    _db.clients.update_one(
        {'client_id': client_id},
        {'$set': {'linked_mom_id': mom_id}})
check('1 seed accounts + client link', t1)


# ââ 2. Provider creates invoice with 3-installment payment plan âââââââââââââ
def t2():
    global invoice_id
    plan = {
        'installment_count': 3,
        'amount_per_installment': 333.33,
        'plan_description': '3-part birth plan payment',
        'due_frequency': 'weekly',
        'first_due_date': (datetime.date.today() + datetime.timedelta(days=7)).isoformat(),
        'installments': [
            {'installment_no': 1, 'amount': 333.33, 'due_date': (datetime.date.today() + datetime.timedelta(days=7)).isoformat(), 'status': 'due'},
            {'installment_no': 2, 'amount': 333.33, 'due_date': (datetime.date.today() + datetime.timedelta(days=14)).isoformat(), 'status': 'due'},
            {'installment_no': 3, 'amount': 333.34, 'due_date': (datetime.date.today() + datetime.timedelta(days=21)).isoformat(), 'status': 'due'},
        ],
    }
    code, b = req('/midwife/invoices', 'POST', {
        'client_id': client_id,
        'description': 'Midwife Payment Plan Test',
        'amount': 1000.00,
        'issue_date': datetime.date.today().isoformat(),
        'due_date': (datetime.date.today() + datetime.timedelta(days=21)).isoformat(),
        'payment_instructions_text': 'Pay via Zelle',
    }, mw_token)
    assert code == 200, f'create invoice → {code}: {b[:200]}'
    j = jbody(b)
    invoice_id = j.get('invoice_id')
    assert invoice_id, f'no invoice_id in {list(j.keys())}'
    # The API separates invoice creation from plan attachment: POST the plan now.
    code, b = req(f'/midwife/invoices/{invoice_id}/payment-plan', 'POST', plan, mw_token)
    assert code == 200, f'attach payment plan → {code}: {b[:200]}'
check('2 create invoice + attach 3-installment plan 200', t2)


# ââ 3. Verify plan roll-up: status='due', total=amount, all installments 'due'
def t3():
    assert invoice_id, 'invoice_id not set'
    code, b = req(f'/midwife/invoices/{invoice_id}', token=mw_token)
    assert code == 200, f'get invoice â {code}'
    j = jbody(b)
    pp = j.get('payment_plan')
    assert pp, f'no payment_plan in invoice: {list(j.keys())}'
    assert pp.get('status') == 'due', f"roll-up status={pp.get('status')}, expected 'due'"
    assert pp.get('total_amount') == 1000.0, f"total_amount={pp.get('total_amount')}, expected 1000.0"
    installments = pp.get('installments', [])
    assert len(installments) == 3, f"expected 3 installments, got {len(installments)}"
    for inst in installments:
        assert inst.get('status') == 'due', f"installment {inst.get('installment_no')} status={inst.get('status')}, expected 'due'"
check('3 plan roll-up due + all installments due', t3)


# ââ 4. Mark installment 1 paid â roll-up 'partial' âââââââââââââââââââââââââ
def t4():
    assert invoice_id, 'invoice_id not set'
    code, b = req(f'/midwife/invoices/{invoice_id}/payment-plan/installment/1/mark-paid', 'POST', {}, mw_token)
    assert code == 200, f'mark installment 1 paid â {code}: {b[:150]}'
    code2, b2 = req(f'/midwife/invoices/{invoice_id}', token=mw_token)
    j = jbody(b2)
    pp = j.get('payment_plan')
    assert pp, 'no payment_plan after mark-paid'
    assert pp.get('status') == 'partial', f"roll-up status={pp.get('status')}, expected 'partial'"
    inst1 = [i for i in pp.get('installments', []) if i.get('installment_no') == 1][0]
    assert inst1.get('status') == 'paid', f"inst 1 status={inst1.get('status')}, expected 'paid'"
check('4 mark installment 1 paid â partial', t4)


# ââ 5. Mark installment 2 paid â roll-up still 'partial' âââââââââââââââââââ
def t5():
    assert invoice_id, 'invoice_id not set'
    code, b = req(f'/midwife/invoices/{invoice_id}/payment-plan/installment/2/mark-paid', 'POST', {}, mw_token)
    assert code == 200, f'mark installment 2 paid â {code}: {b[:150]}'
    code2, b2 = req(f'/midwife/invoices/{invoice_id}', token=mw_token)
    j = jbody(b2)
    pp = j.get('payment_plan')
    assert pp.get('status') == 'partial', f"roll-up status={pp.get('status')}, expected 'partial'"
    inst2 = [i for i in pp.get('installments', []) if i.get('installment_no') == 2][0]
    assert inst2.get('status') == 'paid', f"inst 2 status={inst2.get('status')}, expected 'paid'"
check('5 mark installment 2 paid â still partial', t5)


# ââ 6. Mark installment 3 paid â roll-up 'paid' ââââââââââââââââââââââââââââ
def t6():
    assert invoice_id, 'invoice_id not set'
    code, b = req(f'/midwife/invoices/{invoice_id}/payment-plan/installment/3/mark-paid', 'POST', {}, mw_token)
    assert code == 200, f'mark installment 3 paid â {code}: {b[:150]}'
    code2, b2 = req(f'/midwife/invoices/{invoice_id}', token=mw_token)
    j = jbody(b2)
    pp = j.get('payment_plan')
    assert pp.get('status') == 'paid', f"roll-up status={pp.get('status')}, expected 'paid'"
    for inst in pp.get('installments', []):
        assert inst.get('status') == 'paid', f"inst {inst.get('installment_no')} not paid"
check('6 mark installment 3 paid â paid', t6)


# ââ 7. Mom can read the payment plan (active relationship) âââââââââââââââââ
def t7():
    assert invoice_id, 'invoice_id not set'
    code, b = req(f'/mom/invoices/{invoice_id}/payment-plan', token=mom_token)
    assert code == 200, f'mom read plan â {code}: {b[:150]}'
    j = jbody(b)
    pp = j.get('payment_plan')
    assert pp, 'no payment_plan in mom response'
    assert pp.get('status') == 'paid', f"mom sees roll-up status={pp.get('status')}, expected 'paid'"
    assert len(pp.get('installments', [])) == 3, 'mom should see 3 installments'
check('7 mom reads payment plan (active relationship)', t7)


# ââ 8. Mom with no active relationship is blocked ââââââââââââââââââââââââââ
def t8():
    # Register a mom with no relationship to the provider
    orphan_mom_token, orphan_mom_id = register('MOM', 'PP Orphan Mom')
    # Ensure no client link exists for this orphan mom
    code, b = req(f'/mom/invoices/{invoice_id}/payment-plan', token=orphan_mom_token, expect=404)
    # API contract: a mom with no active relationship gets 404 "Invoice not found"
    # (info-hiding — the API doesn't confirm other moms' invoice ids exist). 404 IS the block.
    assert code in (403, 404), f'orphan mom read plan → {code} (expected 403/404)'
    assert code == 404, f'expected the info-hiding 404, got {code}'
check('8 orphan mom blocked from payment plan (404)', t8)


# ââ 9. Mom list endpoint exposes payment_plan roll-up on the invoice ââââââââââ
def t9():
    code, b = req('/mom/invoices', token=mom_token)
    assert code == 200, f'mom list â {code}: {b[:150]}'
    invoices = jbody(b)
    assert isinstance(invoices, list), f'mom invoices not a list: {type(invoices)}'
    mine = [i for i in invoices if i.get('invoice_id') == invoice_id]
    assert mine, 'invoice not visible in mom list'
    pp = mine[0].get('payment_plan')
    assert pp, f"payment_plan missing from mom list payload: {list(mine[0].keys())}"
    assert pp.get('status') == 'paid', f"list roll-up status={pp.get('status')}, expected 'paid'"
check('9 mom list payload exposes payment_plan', t9)


# ââ 10. Derived plan (count+amount mode) honors due_frequency + totals invoice amount â
def t10():
    code, b = req('/midwife/invoices', 'POST', {
        'client_id': client_id,
        'description': 'Derived Plan Test',
        'amount': 500.00,
    }, mw_token)
    assert code == 200, f'create derived invoice â {code}: {b[:200]}'
    inv2 = jbody(b).get('invoice_id')
    assert inv2, 'no invoice_id for derived test'
    first = (datetime.date.today() + datetime.timedelta(days=3)).isoformat()
    code, b = req(f'/midwife/invoices/{inv2}/payment-plan', 'POST', {
        'installment_count': 2,
        'amount_per_installment': 250.00,
        'first_due_date': first,
        'due_frequency': 'monthly',
        'plan_description': 'Two monthly payments',
    }, mw_token)
    assert code == 200, f'attach derived plan â {code}: {b[:200]}'
    code, b = req(f'/midwife/invoices/{inv2}', token=mw_token)
    assert code == 200, f'get derived invoice â {code}'
    pp = jbody(b).get('payment_plan') or {}
    insts = pp.get('installments', [])
    assert len(insts) == 2, f'expected 2 installments, got {len(insts)}'
    assert insts[0]['due_date'] == first, f"first installment should land ON first_due_date ({first}), got {insts[0]['due_date']}"
    expected_second = (datetime.date.fromisoformat(first) + datetime.timedelta(days=30)).isoformat()
    assert insts[1]['due_date'] == expected_second, f"second installment {insts[1]['due_date']} != first+30d ({expected_second})"
    assert abs(pp.get('total_amount', 0) - 500.00) < 0.01, f"total {pp.get('total_amount')} != 500"
    assert pp.get('status') == 'due', f"derived roll-up {pp.get('status')} != 'due'"
check('10 derived plan honors due_frequency + invoice total', t10)


# ââ 11. Doula path end-to-end (plan works for BOTH provider types) âââââââââââ
def t11():
    global doula_token, doula_id, doula_client_id, doula_invoice_id
    doula_token, doula_id = register('DOULA', 'PP Doula')
    mom2_token, mom2_id = register('MOM', 'PP Doula Mom')
    code, b = req('/doula/clients', 'POST', {'name': 'PP Doula Mom', 'email': f'pp_doula_mom_{DAY}@example.com'}, doula_token)
    assert code in (200, 409), f'doula client â {code}: {b[:150]}'
    doula_client_id = jbody(b).get('client_id')
    import urllib.request as _ur2
    _mongo = __import__('pymongo').MongoClient('mongodb://localhost:27017')
    _db = _mongo[_db_name()]
    _db.share_requests.update_one(
        {'provider_id': doula_id, 'mom_user_id': mom2_id},
        {'$set': {'status': 'accepted', 'relationship_status': 'active',
                  'provider_name': 'PP Doula', 'created_at': DAY}},
        upsert=True)
    if doula_client_id:
        _db.clients.update_one({'client_id': doula_client_id}, {'$set': {'linked_mom_id': mom2_id}})
    code, b = req('/doula/invoices', 'POST', {
        'client_id': doula_client_id,
        'description': 'Doula Payment Plan Test',
        'amount': 600.00,
    }, doula_token)
    assert code == 200, f'doula invoice â {code}: {b[:200]}'
    doula_invoice_id = jbody(b).get('invoice_id')
    first = (datetime.date.today() + datetime.timedelta(days=5)).isoformat()
    code, b = req(f'/doula/invoices/{doula_invoice_id}/payment-plan', 'POST', {
        'installment_count': 2,
        'amount_per_installment': 300.00,
        'first_due_date': first,
        'due_frequency': 'biweekly',
    }, doula_token)
    assert code == 200, f'doula attach plan â {code}: {b[:200]}'
    code, b = req(f'/doula/invoices/{doula_invoice_id}/payment-plan/installment/1/mark-paid', 'POST', {}, doula_token)
    assert code == 200, f'doula mark paid â {code}: {b[:150]}'
    code, b = req(f'/doula/invoices/{doula_invoice_id}/payment-plan', 'GET', token=doula_token)
    pp = (jbody(b) or {}).get('payment_plan') or {}
    assert pp.get('status') == 'partial', f"doula roll-up {pp.get('status')} != 'partial'"
    code, b = req(f'/mom/invoices/{doula_invoice_id}/payment-plan', token=mom2_token)
    assert code == 200, f'doula-mom read plan â {code}: {b[:150]}'
    assert (jbody(b).get('payment_plan') or {}).get('status') == 'partial'
check('11 doula path end-to-end', t11)


# ââ Report ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
fails = [r for r in results if r[1] != 'PASS']
for name, st, msg in results:
    print(f'{st:5} {name}' + (f' â {msg}' if msg else ''))
print(f'\n{len(results) - len(fails)}/{len(results)} PASS')
sys.exit(1 if fails else 0)