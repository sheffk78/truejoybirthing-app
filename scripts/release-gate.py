#!/usr/bin/env python3
"""TJB Mobile release gate — fail-closed pre-submission checks (Build-Standard L2/L4).

Run BEFORE any App Store / Play Console submission. Invalid release = rejected (exit 1).
States: build -> RELEASE GATE (this script) -> upload -> submit -> watchdog monitor.

Checks:
  version-sync     app.json version/buildNumber/versionCode match the release args
  git-clean        working tree clean (reproducible build source)
  store-listing    listing copy present, length limits ok, no banned/overclaim phrases
  reviewer-creds   every declared credential logs in LIVE against prod (200)
  failure-replay   TJB failure library replay is all-caught (sibling repo)

Seeded from real rejections (memory/play-console-submit-pitfalls.md):
  2026-07-01 Play rejection: listing claimed a nonexistent feature.
  2026-09-04 Play rejection: dead reviewer credentials in the declaration.

Usage:
  python3 scripts/release-gate.py --version 1.5.0 --build 152 --platform android \
      --creds scripts/release-creds.json --listing store/play-listing.txt
  python3 scripts/release-gate.py --self-test   # offline detector proof (no network)
"""
import argparse
import contextlib
import http.server
import json
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
APP_JSON = REPO / "frontend" / "app.json"
FL_SCRIPT = REPO.parent / "truejoybirthing-website" / "scripts" / "failure-library.py"
DEFAULT_BASE = "https://truejoybirthing-app-production.up.railway.app"
# Grown only from real store rejections — never speculative.
BANNED_PHRASES = ["hospital advocacy scripts"]


def fail(msg):
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(1)


def check_version_sync(app, version, build, platform):
    problems = []
    if app["expo"]["version"] != version:
        problems.append(f"app.json version {app['expo']['version']!r} != release {version!r}")
    if platform in ("android", "both") and app["expo"]["android"]["versionCode"] != build:
        problems.append(f"android versionCode {app['expo']['android']['versionCode']} != release {build}")
    if platform in ("ios", "both"):
        ios_build = app["expo"]["ios"]["buildNumber"]
        if ios_build != str(build):
            problems.append(f"ios buildNumber {ios_build!r} != release {str(build)!r}")
    return (not problems, "; ".join(problems) or "version/build in sync")


def check_git_clean():
    r = subprocess.run(["git", "status", "--porcelain"], cwd=REPO, capture_output=True, text=True)
    if r.returncode != 0:
        return False, f"git status failed: {r.stderr.strip()}"
    if r.stdout.strip():
        return False, f"working tree dirty ({len(r.stdout.strip().splitlines())} changes) — commit or stash before release"
    return True, "clean tree"


def check_store_listing(listing_path):
    if not listing_path or not Path(listing_path).exists():
        return False, f"store listing file missing: {listing_path} (required, fail-closed)"
    text = Path(listing_path).read_text()
    problems = []
    short = full = None
    for line in text.splitlines():
        if line.startswith("short:"):
            short = line[len("short:"):].strip()
        if line.startswith("full:"):
            full = text.split("full:", 1)[1].strip()
            break
    if not short:
        problems.append("no 'short:' line (Android short description)")
    elif len(short) > 80:
        problems.append(f"short description {len(short)} chars (Play limit 80)")
    if not full:
        problems.append("no 'full:' section (Android full description)")
    elif len(full) > 4000:
        problems.append(f"full description {len(full)} chars (Play limit 4000)")
    low = text.lower()
    for phrase in BANNED_PHRASES:
        if phrase.lower() in low:
            problems.append(f"banned/overclaim phrase {phrase!r} (rejection class 2026-07-01)")
    return (not problems, "; ".join(problems) or "listing ok, no banned phrases")


def creds_live_ok(creds_path, base_url):
    """POST every credential to prod login. Returns (ok, results, error)."""
    if not creds_path or not Path(creds_path).exists():
        return False, [], f"credentials file missing: {creds_path} (required, fail-closed)"
    try:
        parsed = json.loads(Path(creds_path).read_text())
    except Exception as e:
        return False, [], f"creds file unparseable: {e}"
    if isinstance(parsed, dict):
        parsed = parsed.get("accounts")
    if not isinstance(parsed, list) or not parsed:
        return False, [], "creds file must be a non-empty JSON array (or {\"accounts\": [...]})"
    entries = []
    for ent in parsed:
        if not isinstance(ent, dict) or not ent.get("email") or not ent.get("password"):
            return False, [], f"creds entry missing email/password: {ent!r}"
        entries.append(ent)
    results, ok = [], True
    for ent in entries:
        email, pw = ent.get("email"), ent.get("password")
        body = json.dumps({"email": email, "password": pw}).encode()
        req = urllib.request.Request(f"{base_url}/api/auth/login", data=body,
                                     headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                code, detail = resp.status, "login ok"
        except urllib.error.HTTPError as e:
            code = e.code
            detail = f"HTTP {e.code} — declaration would ship a dead account"
        except urllib.error.URLError as e:
            code, detail = 0, f"unreachable: {e.reason}"
        except Exception as e:
            code, detail = 0, f"unreachable: {e}"
        good = code == 200
        ok = ok and good
        results.append({"email": email, "status": code, "ok": good, "detail": detail})
    return ok, results, None


def check_failure_replay(fl_script=None):
    """Release-scoped replay is BLOCKING: only the release-gate cases decide the
    release, so an unrelated model outage (e.g. voice/accuracy eval) can't block
    a legitimate submission. The FULL library replay still runs — recorded as
    informational so pipeline drift stays visible without gate-coupling."""
    fl = Path(fl_script) if fl_script else FL_SCRIPT
    if not fl.exists():
        return False, f"failure library not found at {fl}", None
    r = subprocess.run([sys.executable, str(fl), "replay", "--eval", "release-gate"],
                       capture_output=True, text=True, timeout=600)
    try:
        out = json.loads(r.stdout)
    except Exception:
        return False, f"replay output unparseable: {r.stdout[:200]}", None
    if not (r.returncode == 0 and out.get("ok") is True):
        return False, out.get("message", "release-scoped replay failed"), None
    full = subprocess.run([sys.executable, str(fl), "replay"], capture_output=True, text=True, timeout=600)
    try:
        full_out = json.loads(full.stdout)
        full_msg = full_out.get("message", "full replay unparseable")
    except Exception:
        full_msg = "full replay output unparseable"
    return True, f"release-scoped replay all-caught; full library: {full_msg}", full_msg


# ---------------------------------------------------------------- self-test
class _MockLogin(http.server.BaseHTTPRequestHandler):
    status_code = 401

    def do_POST(self):
        body = json.dumps({"access_token": "mock"}).encode()
        self.send_response(self.status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


def _serve(status_code):
    handler = type("H", (_MockLogin,), {"status_code": status_code})
    srv = http.server.HTTPServer(("127.0.0.1", 0), handler)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


def self_test():
    """Prove every detector catches its failure class, offline. Replayable."""
    caught = []
    app = json.loads(APP_JSON.read_text())
    real_version, real_build = app["expo"]["version"], app["expo"]["android"]["versionCode"]

    # 1. version-sync catches a mismatch
    ok, detail = check_version_sync(app, "9.9.9", real_build, "android")
    if not ok:
        caught.append("version-sync")
    # 2. store-listing catches the banned phrase + missing file
    ok, _ = check_store_listing(None)
    if not ok:
        caught.append("store-listing/missing")
    with _tmpfile("short: x\nfull: hospital advocacy scripts\n") as p:
        ok, _ = check_store_listing(p)
        if not ok:
            caught.append("store-listing/banned-phrase")
    # 3. reviewer-creds catches a 401 (dead account) and passes a 200
    with _write_creds([{"email": "dead@x.com", "password": "z"}]) as cp:
        ok, results, _ = creds_live_ok(cp, _serve(401)[1])
    if not ok:
        caught.append("reviewer-creds/dead-account")
    srv200, url200 = _serve(200)
    with _write_creds([{"email": "live@x.com", "password": "z"}]) as cp:
        pass_ok, _, err = creds_live_ok(cp, url200)
    srv200.shutdown()
    # 4. git-clean catches a dirty tree: monkeypatch subprocess.run to return
    #    porcelain output, as `git status --porcelain` would on a dirty repo.
    #    Then prove the pass-through path too (clean output).
    real_run = subprocess.run

    def _dirty_run(cmd, **kw):
        class R:
            returncode = 0
            stdout = " M frontend/app.json\n"
            stderr = ""
        return R()

    subprocess.run = _dirty_run
    try:
        dirty_ok, _ = check_git_clean()
    finally:
        subprocess.run = real_run
    if not dirty_ok:
        caught.append("git-clean/dirty-tree")
    # 5. failure-replay catches a missing/broken library (fast, offline case —
    #    the pass-through path is proven live by the gate run itself)
    fr_ok, fr_detail, _ = check_failure_replay(fl_script=Path(tempfile.gettempdir()) / "no-such-failure-library.py")
    if not fr_ok:
        caught.append("failure-replay/missing-library")

    expected = ["version-sync", "store-listing/missing", "store-listing/banned-phrase", "reviewer-creds/dead-account", "git-clean/dirty-tree", "failure-replay/missing-library"]
    all_ok = sorted(caught) == sorted(expected) and pass_ok
    print(json.dumps({
        "ok": all_ok,
        "self_test": "PASS — all detectors fire" if all_ok else "FAIL",
        "caught": caught,
        "expected": expected,
        "pass_through_ok": pass_ok,
        "pass_through_detail": err or "live credential on mock 200 passes the gate",
    }, indent=2))
    sys.exit(0 if all_ok else 1)


# ---------------------------------------------------------------- helpers
@contextlib.contextmanager
def _tmpfile(text):
    p = Path(tempfile.gettempdir()) / f"release-gate-selftest-{time.time_ns()}.txt"
    p.write_text(text)
    try:
        yield str(p)
    finally:
        p.unlink(missing_ok=True)


def _write_creds(entries):
    """Context-managed so credential-shaped temp files never leak."""
    p = Path(tempfile.gettempdir()) / f"release-gate-creds-{time.time_ns()}.json"

    @contextlib.contextmanager
    def _ctx():
        p.write_text(json.dumps(entries))
        try:
            yield str(p)
        finally:
            p.unlink(missing_ok=True)

    return _ctx()


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version"); ap.add_argument("--build", type=int)
    ap.add_argument("--platform", choices=["android", "ios", "both"], default="both")
    ap.add_argument("--creds"); ap.add_argument("--listing")
    ap.add_argument("--base-url", default=DEFAULT_BASE)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        self_test()
        return
    if not (args.version and args.build):
        fail("--version and --build required (or --self-test)")

    if not APP_JSON.exists():
        fail(f"app.json not found at {APP_JSON}")
    app = json.loads(APP_JSON.read_text())

    checks = []
    checks.append({"id": "version-sync", **dict(zip(("ok", "detail"), check_version_sync(app, args.version, args.build, args.platform)))})
    checks.append({"id": "git-clean", **dict(zip(("ok", "detail"), check_git_clean()))})
    checks.append({"id": "store-listing", **dict(zip(("ok", "detail"), check_store_listing(args.listing)))})

    ok, results, err = creds_live_ok(args.creds, args.base_url)
    checks.append({"id": "reviewer-creds", "ok": ok, "detail": err or f"{sum(r['ok'] for r in results)}/{len(results)} credentials live-verified", "results": results})

    replay_ok, replay_detail, full_info = check_failure_replay()
    checks.append({"id": "failure-replay", "ok": replay_ok, "detail": replay_detail, "full_library": full_info})

    ok = all(c["ok"] for c in checks)
    print(json.dumps({
        "ok": ok,
        "release": f"v{args.version} build {args.build} ({args.platform})",
        "verdict": "RELEASE CLEARED — submit" if ok else "RELEASE BLOCKED — fix failures above",
        "checks": checks,
    }, indent=2))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()