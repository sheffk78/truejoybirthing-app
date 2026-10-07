"""Credential vocabulary + normalization for TrueJoy Birthing.

Single source of truth for recognized credentials — used by the marketplace
filter, onboarding screens (frontend mirrors this list), and profile display.

Design (Jeff 10/05): recognize COMMON credentials as canonical codes while
letting pros keep UNIQUE ones as free-text chips.

Council review 10/05 (4 reviewers, unanimous FIX-FIRST) tightened the catalog:
- Exact-phrase aliases only — no truncation or generic-phrase forcing.
  "lactation consultant" and "doula" stay custom chips: the generic phrase
  doesn't imply a specific certification (R1#4, R3#4, R4#1-3).
- Org-specific codes keep the certifying body visible (CLD/ICBD/ICPD/CBD);
  bare org names (DONA) stay custom chips — org ≠ credential code (R4#9-10).
- Removed unverifiable entries (ALE, C-MT); added ALPP's ALC/ANLC ladder, the
  LER mid-tier (CBS, CLS), and ICEA/Lamaze/CBI org certs (R4#5-9).
- DEM kept as display-only (a category, not a certification) — out of the
  mom-facing filter row; state-license codes (LM, LDEM) carry filters (R4#7).
"""
import re
from typing import Dict, List, Optional, Tuple

# ── Canonical vocabulary ──────────────────────────────────────────────────────
# Every entry: code, display name (kept tight — chips render "CODE — Name"),
# aliases (lowercase, EXACT match keys), and the roles the credential belongs
# to (DOULA / MIDWIFE / LACTATION). Org attributions live in the comments.
CREDENTIALS: List[Dict] = [
    # ── Doula certifications (DONA / CAPPA / ICEA / CBI) ──
    {"code": "CD",   "name": "Certified Doula", "aliases": ["cd", "certified doula"], "roles": ["DOULA"]},
    {"code": "PCD",  "name": "Postpartum Doula", "aliases": ["pcd", "postpartum doula", "post partum doula"], "roles": ["DOULA"]},
    {"code": "CPD",  "name": "Certified Postpartum Doula", "aliases": ["cpd"], "roles": ["DOULA"]},  # CAPPA
    {"code": "CLD",  "name": "Certified Labor Doula", "aliases": ["cld", "certified labor doula"], "roles": ["DOULA"]},  # CAPPA
    {"code": "ICBD", "name": "ICEA Certified Birth Doula", "aliases": ["icbd"], "roles": ["DOULA"]},
    {"code": "ICPD", "name": "ICEA Certified Postpartum Doula", "aliases": ["icpd"], "roles": ["DOULA"]},
    {"code": "CBD",  "name": "Certified Birth Doula", "aliases": ["cbd", "certified birth doula"], "roles": ["DOULA"]},  # Childbirth Int'l
    # ── Childbirth educators ──
    {"code": "CBE",  "name": "Certified Childbirth Educator", "aliases": ["cbe", "childbirth educator", "certified childbirth educator"], "roles": ["DOULA"]},
    {"code": "ICCE", "name": "ICEA Certified Childbirth Educator", "aliases": ["icce"], "roles": ["DOULA"]},
    {"code": "LCCE", "name": "Lamaze Certified Childbirth Educator", "aliases": ["lcce"], "roles": ["DOULA"]},
    # ── Lactation credentials (ALPP / IBLCE / LER / CAPPA ladders) ──
    {"code": "CLC",  "name": "Certified Lactation Counselor", "aliases": ["clc", "certified lactation counselor"], "roles": ["DOULA", "LACTATION"]},  # ALPP
    {"code": "ALC",  "name": "Advanced Lactation Consultant", "aliases": ["alc"], "roles": ["LACTATION"]},  # ALPP (replaces bogus ALE)
    {"code": "ANLC", "name": "Advanced Nurse Lactation Consultant", "aliases": ["anlc"], "roles": ["LACTATION"]},  # ALPP
    {"code": "CBS",  "name": "Certified Breastfeeding Specialist", "aliases": ["cbs"], "roles": ["LACTATION"]},  # LER
    {"code": "CLS",  "name": "Certified Lactation Specialist", "aliases": ["cls"], "roles": ["LACTATION"]},  # LER
    {"code": "IBCLC", "name": "International Board Certified Lactation Consultant", "aliases": ["ibclc", "board certified lactation consultant"], "roles": ["LACTATION"]},  # IBLCE
    {"code": "CLE",  "name": "Certified Lactation Educator", "aliases": ["cle", "certified lactation educator"], "roles": ["LACTATION"]},  # CAPPA
    # ── Midwife credentials (NARM / AMCB / state licenses) ──
    {"code": "CPM",  "name": "Certified Professional Midwife", "aliases": ["cpm", "certified professional midwife"], "roles": ["MIDWIFE"]},  # NARM
    {"code": "CNM",  "name": "Certified Nurse-Midwife", "aliases": ["cnm", "certified nurse midwife", "certified nurse-midwife"], "roles": ["MIDWIFE"]},  # AMCB
    {"code": "CM",   "name": "Certified Midwife", "aliases": ["cm"], "roles": ["MIDWIFE"]},  # AMCB
    {"code": "LM",   "name": "Licensed Midwife", "aliases": ["lm", "licensed midwife"], "roles": ["MIDWIFE"]},  # state license
    {"code": "LDEM", "name": "Licensed Direct-Entry Midwife", "aliases": ["ldem"], "roles": ["MIDWIFE"]},  # OR-style
    # DEM is a descriptive category, not a certification — display-only
    {"code": "DEM",  "name": "Direct-Entry Midwife", "aliases": ["dem", "direct entry midwife", "direct entry"], "roles": ["MIDWIFE"]},
]

# Marketplace filter chips (mom-facing): the common, meaningful distinctions.
# DEM demoted (a credential category, not a cert) — council 10/05.
MARKETPLACE_FILTER_CODES: List[str] = [
    "CD", "CLC", "IBCLC", "CPM", "CNM", "LM", "CBE",
]

# Fast lookup maps built once at import
_BY_CODE: Dict[str, Dict] = {c["code"].upper(): c for c in CREDENTIALS}
_ALIAS_TO_CODE: Dict[str, str] = {}
for _c in CREDENTIALS:
    for _a in _c["aliases"]:
        _ALIAS_TO_CODE[_a] = _c["code"]
    _ALIAS_TO_CODE.setdefault(_c["code"].lower(), _c["code"])
    _ALIAS_TO_CODE.setdefault(_c["name"].lower(), _c["code"])


def known_codes() -> List[str]:
    return [c["code"] for c in CREDENTIALS]


def is_known(code: str) -> bool:
    """True if the value is a canonical code (or unambiguous alias)."""
    return string_to_codes(code) is not None


def credential_display(code: str) -> Optional[str]:
    """Full display name for a canonical code, else None (custom chip)."""
    c = _BY_CODE.get((code or "").upper())
    return c["name"] if c else None


def string_to_codes(value: str) -> Optional[List[str]]:
    """Normalize one credential entry to canonical codes.

    Handles: "IBCLC", "ibclc", "Certified Lactation Counselor", "certified
    nurse-midwife". Returns None when the text is NOT a recognized credential
    (caller keeps it as a custom chip verbatim). Substring pass runs
    longest-alias-first so longer exact phrases win over shorter overlapping
    ones; aliases are exact phrases only, so generic wording ("lactation
    consultant", "doula") correctly stays a custom chip.
    """
    if not value or not value.strip():
        return None
    key = value.strip().lower().rstrip(".")
    code = _ALIAS_TO_CODE.get(key)
    if code:
        return [code]
    # substring pass for pasted phrases ("board certified lactation ...")
    for alias, c in sorted(_ALIAS_TO_CODE.items(), key=lambda kv: -len(kv[0])):
        if len(alias) >= 4 and alias in key:
            return [c]
    return None


def parse_credential_text(
    value: "str | List[str] | None",
) -> Tuple[List[str], List[str]]:
    """Split any stored credential format into (known_codes, custom_labels).

    Accepts: None, "CD, CLC", ["CD", "CLC"], "IBCLC ,CNM", "CLC (2021)",
    or arbitrary phrases. Known tokens are normalized to canonical codes;
    unrecognized tokens are preserved verbatim as custom labels.
    """
    known: List[str] = []
    custom: List[str] = []
    if value is None:
        return known, custom
    if isinstance(value, str):
        tokens = [t.strip() for t in value.replace(";", ",").split(",")]
    elif isinstance(value, (list, tuple)):
        tokens = [str(t).strip() for t in value if t is not None and str(t).strip()]
    else:
        return known, custom
    for tok in tokens:
        if not tok:
            continue
        # Annotated codes like "CLC (2021)" escape the credential filter —
        # strip a trailing parenthetical before alias lookup (council 10/05)
        pre = re.sub(r"\s*\([^)]*\)\s*$", "", tok).strip()
        codes = string_to_codes(pre) or string_to_codes(tok)
        if codes:
            for c in codes:
                if c not in known:
                    known.append(c)
        elif tok not in custom:
            custom.append(tok)
    return known, custom


def provider_matches_credential(profile: dict, requested_code: str) -> bool:
    """Alias-aware matcher for the marketplace filter.

    Normalizes the provider's credentials (any stored format) to canonical
    codes + custom labels, then matches the requested code against both:
    canonical by code, custom case-insensitively (so a pro's custom "NNC"
    chip is findable by typing NNC in search, and a requested 'NNE' never
    matches by substring accident).
    """
    req = (requested_code or "").upper().strip()
    if not req:
        return True
    known, custom = parse_credential_text(profile.get("credentials"))
    known2, custom2 = parse_credential_text(profile.get("certifications"))
    all_known = set(known) | set(known2)
    all_custom = [c for c in (custom + [x for x in custom2 if x not in custom])]
    if req in all_known:
        return True
    return any(req == c.upper().strip() for c in all_custom)