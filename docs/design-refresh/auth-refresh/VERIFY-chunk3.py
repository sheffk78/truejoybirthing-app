#!/usr/bin/env python3
"""VERIFY-chunk3.py — canonical ad-hoc verification for auth-screens-3.html (chunk-3 packet).

Re-runnable. Run after ANY edit to auth-screens-3.html; append output to VERIFY-chunk3.log.
No canonical test/lint/build exists for a static design mockup — this IS the verification.

Checks (current rev3 state, Jeff msg 1549918375239622757):
  A. pro-last-step copy present (heading/body/skip/CTA)
  B. old copy absent
  C. approved fade construction (no wash, no 4-stop, single 3-stop x4, no sheet-over-fade,
     asset refs exist)
  D. rendered packet matches HTML (smooth dissolve, pixel seam check; png newer than html)
"""
import os, re, sys
import numpy as np
from PIL import Image

D = "/Users/socializerender/.openclaw/workspace/Kit/life/brands/TrueJoyBirthing/projects/TrueJoyBirthing-Mobile/docs/design-refresh/auth-refresh"
HTML = f"{D}/auth-screens-3.html"
PNG = f"{D}/auth-screens-3-full.png"
fails = []

def t(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f" — {detail}" if detail else ""))
    if not ok: fails.append(name)

src = open(HTML).read()

# A. new copy present
t("A1 heading 'One last step'", "One last step" in src)
t("A2 title 'Verify your <em>email</em>'", "Verify your <em>email</em>" in src)
t("A3 marketplace body copy", "Verified pros appear in the marketplace" in src)
t("A4 skip note states marketplace consequence",
  "you won't appear in the marketplace until you verify" in src)
t("A5 CTA 'Verify &amp; finish setup'", "Verify &amp; finish setup" in src)

# B. old copy gone
for old in ["One small step", "Check your <em>inbox</em>", "Prefer to explore first",
            "Verify &amp; continue", "keeps your account yours"]:
    t(f"B old copy removed: {old[:28]!r}", old not in src)

# C. construction
t("C1 no photo-wash gradients", src.count("rgba(184,122,160") == 0)
t("C2 no 4-stop fades", len(re.findall(r"rgba\(250,248,245,0\) 55%, rgba\(250,248,245,\.[\d]+\)", src)) == 0)
t("C3 single 3-stop fade x4",
  src.count("linear-gradient(180deg, rgba(142,140,181,.15) 0%, rgba(250,248,245,0) 55%, #FAF8F5 100%)") == 4)
t("C4 no solid sheet over fade", len(re.findall(r"margin-top:-\d+px", src)) == 0)
refs = re.findall(r"url\('?(assets/[^')]+)'?\)", src)
missing = [r for r in refs if not os.path.exists(f"{D}/{r}")]
t("C5 all asset refs exist", not missing, f"missing={missing}" if missing else f"{len(refs)} refs")

# D. rendered packet
im = np.array(Image.open(PNG).convert("RGB"))
bands = [(137,828),(857,1616),(1645,2468),(2497,3256)]
names = ["signup","verify","notifications","firstwin"]
worst = 0.0
for (y0,_), n in zip(bands, names):
    sub = im[y0+20:y0+175, 645:1015].astype(int)
    jump = float(np.abs(np.diff(sub.mean(axis=(1,2)))).max())
    worst = max(worst, jump)
    print(f"      photo-zone max jump {n}: {jump:.1f}")
t("D1 smooth dissolve all screens (hard-edge threshold 60)", worst < 60, f"worst={worst:.1f}")
t("D2 packet is the current render", os.path.getmtime(HTML) < os.path.getmtime(PNG))

print("\nRESULT:", "ALL PASS" if not fails else f"FAILED: {fails}", "(ad-hoc, static mockup — not a suite green)")
sys.exit(1 if fails else 0)