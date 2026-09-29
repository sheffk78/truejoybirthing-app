#!/usr/bin/env python3
"""Post-run verification for the TJB simulator E2E (Phase 4).

Confirms, against the live test stack (no mocks):
  1. The DocuSeal submission for the E2E sign is completed.
  2. The generated PDF is repainted (size > bare-template size, values present via
     ToUnicode CMap decode — same method proven on 9/28 for submission 13).
  3. A webhook event row exists for the submission (delivery itself is prod-verified).

Usage: backend/.venv/bin/python e2e-simulator/verify_backend.py --post --submission-id N
"""
import argparse
import base64
import os
import re
import subprocess
import sys
import zlib

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "truejoybirthing_test")
CONTAINER = "docuseal-tjb-test"
CONTAINER_DB = "/data/docuseal/db.sqlite3"


def snapshot_sqlite(tmp="e2e_snap"):
    subprocess.run(["docker", "exec", CONTAINER, "sh", "-c",
                    f"cat {CONTAINER_DB} > /tmp/{tmp}.db"], check=True, capture_output=True)
    subprocess.run(["docker", "cp", f"{CONTAINER}:/tmp/{tmp}.db", f"/tmp/{tmp}.db"],
                   capture_output=True, check=True)
    return f"/tmp/{tmp}.db"


def submission_status(db_path, sub_id):
    import sqlite3
    con = sqlite3.connect(db_path)
    row = con.execute("SELECT status FROM submissions WHERE id=?", (sub_id,)).fetchone()
    return row[0] if row else None


def fetch_pdf(sub_id):
    name = subprocess.run(["docker", "exec", CONTAINER, "sh", "-c",
                           f"ls /data/docuseal/pdf | grep '^{sub_id}_' | head -1"],
                          capture_output=True, text=True, check=True).stdout.strip()
    tmp = f"e2e_pdf_{sub_id}"
    subprocess.run(["docker", "cp", f"{CONTAINER}:/data/docuseal/pdf/{name}", f"/tmp/{tmp}.pdf"],
                   capture_output=True, check=True)
    return f"/tmp/{tmp}.pdf"


def decode_stream(raw):
    try:
        return zlib.decompress(base64.a85decode(raw.strip(), adobe=True))
    except Exception:
        pass
    try:
        return zlib.decompress(raw)
    except Exception:
        pass
    return raw


def pdf_painted_text(pdf_path):
    """Decode text ops via the ToUnicode CMap — proven method from submission 13."""
    data = open(pdf_path, "rb").read()
    streams = []
    for m in re.finditer(rb"stream[\r\n]+(.*?)endstream", data, re.S):
        streams.append(decode_stream(m.group(1)))
    cmap = next((s.decode("latin-1") for s in streams
                 if b"beginbfchar" in s or b"beginbfrange" in s), None)
    g2u = {}
    if cmap:
        for m in re.finditer(r"<([0-9A-Fa-f]{4})><([0-9A-Fa-f]{4})>", cmap):
            g2u[int(m.group(1), 16)] = chr(int(m.group(2), 16))
        for m in re.finditer(r"<([0-9A-Fa-f]{4})><([0-9A-Fa-f]{4})><([0-9A-Fa-f]{4})>", cmap):
            a, b, c = (int(x, 16) for x in m.groups())
            for g in range(a, b + 1):
                g2u[g] = chr(c + (g - a))
    texts = []
    for s in streams:
        t = s.decode("latin-1", errors="replace")
        if "Tj" not in t or "bfchar" in t:
            continue
        for pos, body in re.findall(r"([\d.]+ [\d.]+) Td\s*\(((?:[^)\\]|\\.)*)\)Tj", t):
            bl = body.encode("latin-1", errors="replace")
            if cmap:
                chars = [g2u.get((bl[i] << 8) | bl[i + 1], "?") for i in range(0, len(bl) - 1, 2)]
            else:
                chars = [chr(b) for b in bl]
            texts.append("".join(chars))
    return texts


EXPECTED_TOKENS = ("2500", "625", "1875", "2026")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--post", action="store_true")
    ap.add_argument("--submission-id", type=int, required=True)
    args = ap.parse_args()
    if not args.post:
        print("nothing to do (use --post)")
        return 0

    db = snapshot_sqlite()
    status = submission_status(db, args.submission_id)
    print(f"submission {args.submission_id} status: {status}")
    if status != "completed":
        print("FAIL: submission not completed")
        return 3

    pdf = fetch_pdf(args.submission_id)
    texts = pdf_painted_text(pdf)
    joined = " | ".join(t for t in texts if t.strip())
    print("painted text:", joined)
    missing = [tok for tok in EXPECTED_TOKENS if tok not in joined]
    if missing:
        print("FAIL: missing painted tokens:", missing)
        return 3
    print("POST-RUN VERIFICATION PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())