"""
State Resources API — state-specific newborn procedure forms & program links.
Data source: backend/data/state_resources/<state>.json (verified links, biannual cron re-check).
Part of the state-specific newborn procedures plan (plans/2026-09-24-state-newborn-procedures-plan.md).
"""
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from .dependencies import check_role, User

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "state_resources"


def _load_state(state_code: str) -> Optional[dict]:
    """Load a state resource file; None if we have no data for that state yet."""
    state_code = (state_code or "").strip().upper()
    if len(state_code) != 2 or not state_code.isalpha():
        return None
    path = DATA_DIR / f"{state_code.lower()}.json"
    if not path.exists():
        return None
    with open(path) as f:
        return json.load(f)


def _public_view(data: dict) -> dict:
    """Strip internal bookkeeping fields before serving to clients."""
    out = {
        "state": data.get("state"),
        "state_name": data.get("state_name"),
        "last_verified": data.get("last_verified"),
        "procedures": data.get("procedures", {}),
        "program_contact": data.get("program_contact", {}),
    }
    return out


@router.get("/state-resources/{state_code}")
async def get_state_resources(state_code: str, user: User = Depends(check_role(["MOM", "DOULA", "MIDWIFE", "LACTATION", "ADMIN"]))):
    """State-specific newborn procedure resources for the requesting user's state.

    Returns 404 with a friendly shape when we don't have the state yet —
    the frontend falls back to generic informed-choice cards (no deep links).
    """
    data = _load_state(state_code)
    if data is None:
        raise HTTPException(status_code=404, detail={
            "error": "not_configured",
            "message": "State-specific resources aren't available for this state yet. Generic informed-choice documents are still available.",
            "state": (state_code or "").upper(),
        })
    return _public_view(data)


@router.get("/state-resources/{state_code}/procedure/{procedure_key}")
async def get_state_procedure(state_code: str, procedure_key: str, user: User = Depends(check_role(["MOM", "DOULA", "MIDWIFE", "LACTATION", "ADMIN"]))):
    """One procedure's state resources (deep-link target for a birth-plan card)."""
    data = _load_state(state_code)
    if data is None:
        raise HTTPException(status_code=404, detail={"error": "not_configured"})
    proc = data.get("procedures", {}).get(procedure_key)
    if proc is None:
        raise HTTPException(status_code=404, detail={"error": "unknown_procedure", "procedure_key": procedure_key})
    return {
        "state": data.get("state"),
        "state_name": data.get("state_name"),
        "last_verified": data.get("last_verified"),
        "procedure_key": procedure_key,
        **proc,
    }


@router.get("/state-resources")
async def list_configured_states(user: User = Depends(check_role(["MOM", "DOULA", "MIDWIFE", "LACTATION", "ADMIN"]))):
    """States with verified resource data (for admin/coverage display)."""
    states = []
    for path in sorted(DATA_DIR.glob("*.json")):
        try:
            with open(path) as f:
                d = json.load(f)
            states.append({"state": d.get("state", path.stem.upper()), "state_name": d.get("state_name"), "last_verified": d.get("last_verified")})
        except Exception:
            continue
    return {"states": states, "count": len(states)}
