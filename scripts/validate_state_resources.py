#!/usr/bin/env python3
"""Validate state_resources JSON files: schema completeness + live URL checks.

Usage:
  python3 scripts/validate_state_resources.py                # schema only
  python3 scripts/validate_state_resources.py --links        # schema + HTTP-200 every URL
  python3 scripts/validate_state_resources.py --links CA     # include URL checks for one state only

Exit 0 = all pass. Exit 1 = failures (printed per file)."""
import json
import sys
import urllib.request
import urllib.error
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "backend" / "data" / "state_resources"
PROCEDURE_KEYS = [
    "metabolic_screening", "hearing_screening", "cchd_screening",
    "erythromycin_eye_ointment", "vitamin_k", "hepatitis_b_vaccine",
    "gestational_diabetes", "group_b_strep",
]
TOP_KEYS = ["state", "state_name", "last_verified", "verified_by", "procedures"]


def iter_urls(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "options":
                continue
            if isinstance(v, str) and v.startswith(("http://", "https://")):
                yield v
            else:
                yield from iter_urls(v)
    elif isinstance(obj, list):
        for i in obj:
            yield from iter_urls(i)


def check_links(url):
    try:
        import ssl
        try:
            import certifi
            # uv's cpython lacks a system CA bundle — without certifi, CDPH and
            # other state sites fail SSL verification and look "down" (48/51 bug).
            ctx = ssl.create_default_context(cafile=certifi.where())
        except ImportError:
            ctx = ssl.create_default_context()
        https_handler = urllib.request.HTTPSHandler(context=ctx)
        opener = urllib.request.build_opener(https_handler)
        req = urllib.request.Request(url, method="HEAD")
        try:
            with opener.open(req, timeout=25) as r:
                return r.status == 200
        except Exception:
            pass
        # some servers reject HEAD; fall back to GET.
        # NOTE: a plain/non-browser UA ("...link verification") gets hard-404'd by
        # some WAFs (e.g. ohio.gov Akamai) even when the page is live with a
        # browser UA, so use a standard browser UA here.
        req = urllib.request.Request(url, method="GET",
                                     headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                                              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"})
        with opener.open(req, timeout=25) as r:
            return r.status == 200
    except urllib.error.URLError as e:
        # macOS-only roots (e.g. Comodo "AAA Certificate Services", used by
        # cdph.ca.gov) exist in the system trust store but not in certifi —
        # fall back to curl, which uses the system store.
        import subprocess
        try:
            r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
                                '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                                '--max-time', '25', url], capture_output=True, text=True, timeout=30)
            return r.stdout.strip() == '200'
        except Exception:
            return False
    except Exception:
        return False


def main():
    args = sys.argv[1:]
    check_all_links = "--links" in args
    only = [a for a in args if not a.startswith("--")]
    files = sorted(DATA_DIR.glob("*.json"))
    if only:
        files = [f for f in files if f.stem.upper() in [s.upper() for s in only]]
    if not files:
        print(f"No JSON files in {DATA_DIR}")
        return 1

    failures = 0
    for f in files:
        errs = []
        try:
            d = json.load(open(f))
        except Exception as e:
            print(f"FAIL {f.name}: unparseable JSON — {e}")
            failures += 1
            continue
        for k in TOP_KEYS:
            if k not in d:
                errs.append(f"missing top key '{k}'")
        if d.get("state") != f.stem.upper():
            errs.append(f"state '{d.get('state')}' != filename '{f.stem.upper()}'")
        procs = d.get("procedures", {})
        for k in PROCEDURE_KEYS:
            if k not in procs:
                errs.append(f"missing procedure '{k}'")
        vk = procs.get("vitamin_k", {})
        if vk.get("options") not in (None, ["oral", "shot", "none"]):
            errs.append(f"vitamin_k options wrong: {vk.get('options')}")
        if not d.get("last_verified"):
            errs.append("missing last_verified")
        urls = list(iter_urls(d))
        if check_all_links:
            for u in urls:
                if not check_links(u):
                    errs.append(f"URL not 200: {u[:100]}")
        if errs:
            failures += 1
            print(f"FAIL {f.name} ({len(urls)} urls):")
            for e in errs:
                print(f"  - {e}")
        else:
            print(f"OK   {f.name}: {d.get('state_name')} — {len(procs)} procedures, {len(urls)} urls"
                  + (", all links 200" if check_all_links else ""))

    print(f"\n{len(files) - failures}/{len(files)} files valid"
          + (" (schema + live links)" if check_all_links else " (schema only; pass --links to verify URLs)"))
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    sys.exit(main())