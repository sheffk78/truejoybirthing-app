"""Check remaining surfaces: where notifications render in app, doula-side invoice UI, mom team screen."""
import os, re

base = os.path.dirname(os.path.abspath(__file__))

def grep_dir(d, pattern):
    hits = []
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith((".tsx", ".ts")):
                p = os.path.join(root, f)
                try:
                    for i, line in enumerate(open(p, encoding="utf-8", errors="ignore"), 1):
                        if re.search(pattern, line):
                            hits.append((p.replace(base + "/", ""), i, line.strip()[:130]))
                except Exception:
                    pass
    return hits

print("=== notifications list UI (where in-app notifs render) ===")
for p, i, l in grep_dir(os.path.join(base, "frontend"), r"notifications|getNotifications")[:15]:
    print(f"  {p}:{i}: {l}")

print("\n=== mark-paid usage anywhere ===")
for p, i, l in grep_dir(os.path.join(base, "frontend"), r"mark-paid|mark_paid|Mark as Paid|mark as paid")[:10]:
    print(f"  {p}:{i}: {l}")

print("\n=== doula invoices screen: actions on Sent invoice ===")
p = os.path.join(base, "frontend/app/(doula)/invoices.tsx")
if os.path.exists(p):
    src = open(p).read()
    for pat in [r"send", r"reminder", r"paid"]:
        ms = [(i, l.strip()[:110]) for i, l in enumerate(src.splitlines(), 1) if re.search(pat, l)][:6]
        print(f"  -- '{pat}':")
        for i, l in ms:
            print(f"     {i}: {l}")