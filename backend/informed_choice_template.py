"""
Informed-Choice Master Document Template — newborn procedures & prenatal screening.

One document covers all 8 decision items with a single signature block
(Chante decision 2026-09-24: "you could totally do that").

Language rule (hard gate): the phrase "against medical advice" must NEVER
appear — this feature is framed as informed choice everywhere. Enforced by
`assert_informed_choice_language()` and a unit test.

State data comes from backend/data/state_resources/<state>.json via
routes/state_resources.py — procedure labels, statute cites, and state-form
links are injected at render time so no state facts are hand-written here.
"""
import json
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).resolve().parent / "data" / "state_resources"

# Render order & display names (matches ca.json procedure keys exactly)
PROCEDURE_ORDER = [
    "metabolic_screening",
    "hearing_screening",
    "cchd_screening",
    "erythromycin_eye_ointment",
    "vitamin_k",
    "hepatitis_b_vaccine",
    "gestational_diabetes",
    "group_b_strep",
]

PROCEDURE_LABELS = {
    "metabolic_screening": "Newborn Metabolic Screening (blood spot)",
    "hearing_screening": "Newborn Hearing Screening",
    "cchd_screening": "CCHD Pulse-Oximetry Screening (critical congenital heart disease)",
    "erythromycin_eye_ointment": "Erythromycin Eye Ointment",
    "vitamin_k": "Vitamin K (oral or injection)",
    "hepatitis_b_vaccine": "Hepatitis B Vaccine (birth dose)",
    "gestational_diabetes": "Gestational Diabetes Screening (prenatal)",
    "group_b_strep": "Group B Strep Screening & Prophylaxis (prenatal)",
}

INTRO_TEXT = """Informed Choice — Newborn & Prenatal Screening Decisions

This document records the informed choices of {client_name} for the screening
and treatment decisions listed below, in care with {midwife_practice_name},
as of {agreement_date}.

For each item, the Midwife has provided information about what the screening or
treatment is, its potential benefits, its potential risks and limitations, and
reasonable alternatives — including the choice to decline. The Client has had
the opportunity to ask questions and has indicated a decision freely. Choosing
to decline any item is documented here as an informed choice, made after
discussion; it is not a refusal of care and does not end the midwife-client
relationship.

{state_note}
"""

CHOICE_LANGUAGE = {
    "metabolic_screening": "I choose the newborn metabolic (blood spot) screening for my baby.",
    "hearing_screening": "I choose newborn hearing screening for my baby.",
    "cchd_screening": "I choose CCHD pulse-oximetry screening for my baby.",
    "erythromycin_eye_ointment": "I choose erythromycin eye ointment for my baby.",
    "vitamin_k": "I choose Vitamin K for my baby (mark one: oral / injection / decline).",
    "hepatitis_b_vaccine": "I choose the Hepatitis B birth dose for my baby.",
    "gestational_diabetes": "I choose gestational diabetes screening during pregnancy.",
    "group_b_strep": "I choose Group B Strep screening (and prophylaxis if positive).",
}

DECLINE_LANGUAGE = {
    "metabolic_screening": "I decline the newborn metabolic (blood spot) screening for my baby.",
    "hearing_screening": "I decline newborn hearing screening for my baby.",
    "cchd_screening": "I decline CCHD pulse-oximetry screening for my baby.",
    "erythromycin_eye_ointment": "I decline erythromycin eye ointment for my baby.",
    "vitamin_k": "I decline Vitamin K for my baby.",
    "hepatitis_b_vaccine": "I decline the Hepatitis B birth dose for my baby.",
    "gestational_diabetes": "I decline gestational diabetes screening.",
    "group_b_strep": "I decline Group B Strep screening.",
}

SIGNATURE_BLOCK = """Decisions recorded by:
Client (mother): {client_name}  Signature: ______________________  Date: __________
Midwife: {midwife_name}  Signature: ______________________  Date: __________
"""


def _load_state_data(state_code: Optional[str]):
    """Load a state file; None => generic fallback (no state-specific facts)."""
    if not state_code:
        return None
    path = DATA_DIR / f"{state_code.lower()}.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_state_note(state_code: Optional[str]) -> str:
    """One short paragraph about this state's form situation."""
    data = _load_state_data(state_code)
    if not data:
        return ("State-specific forms were not available for your state at the "
                "time this document was prepared. Where an official state form "
                "exists, the Midwife will provide it and its signature satisfies "
                "the state requirement; this document records the informed-choice "
                "discussion for the practice record.")
    name = data.get("state_name", state_code)
    nbs = data["procedures"].get("metabolic_screening", {})
    if nbs.get("opt_out_form"):
        return (f"In {name}, the state provides an official declination form for "
                f"newborn screening. The Midwife will provide it; signing that "
                f"state form satisfies the state requirement, and this document "
                f"records the informed-choice discussion for the practice record.")
    note = (nbs.get("state_form_note") or "").strip()
    if note:
        return f"Note for {name}: {note}"
    return f"In {name}, refusal of state-mandated screening is documented in writing per state law; this document serves that purpose."


def build_master_document(state_code: Optional[str],
                          client_name: str = "{client_name}",
                          midwife_name: str = "{midwife_name}",
                          agreement_date: str = "{agreement_date}") -> dict:
    """Render the full master informed-choice document as structured sections.

    Returns {"title", "intro", "items": [...], "signature_block"} where each
    item carries the decision language, the state's statute cite (if any), and
    the official state form link (if any)."""
    data = _load_state_data(state_code)
    items = []
    for key in PROCEDURE_ORDER:
        proc = (data or {}).get("procedures", {}).get(key, {})
        label = proc.get("label") or PROCEDURE_LABELS[key]
        item = {
            "procedure_key": key,
            "label": label,
            "accept_text": CHOICE_LANGUAGE[key],
            "decline_text": DECLINE_LANGUAGE[key],
            "statute": proc.get("statute") or proc.get("law") or None,
            "state_form_url": proc.get("opt_out_form") or None,
            "state_form_note": proc.get("state_form_note") or None,
        }
        if key == "vitamin_k":
            item["options"] = ["oral", "shot", "none"]
        items.append(item)
    return {
        "title": "Informed Choice — Newborn & Prenatal Screening Decisions",
        "intro": INTRO_TEXT.format(
            client_name=client_name,
            midwife_practice_name=midwife_name,
            agreement_date=agreement_date,
            state_note=build_state_note(state_code),
        ),
        "items": items,
        "signature_block": SIGNATURE_BLOCK,
    }


def assert_informed_choice_language(text: str) -> None:
    """Hard gate: the generated document must never contain the banned phrase.

    Chante decision 2026-09-24 — 'informed choice' language, never 'against
    medical advice'. Raises ValueError so the sign flow refuses to render."""
    if "against medical advice" in text.lower():
        raise ValueError(
            "Language gate: generated document contains 'against medical advice' — "
            "rephrase as informed choice before rendering."
        )


def render_document_text(doc: dict) -> str:
    """Flatten the structured doc to plain text (PDF source) and gate language."""
    parts = [doc["title"], "", doc["intro"], ""]
    for i, item in enumerate(doc["items"], 1):
        parts.append(f"{i}. {item['label']}")
        if item.get("statute"):
            parts.append(f"   State law reference: {item['statute']}")
        if item.get("state_form_url"):
            parts.append(f"   Official state form: {item['state_form_url']}")
        if item.get("state_form_note"):
            parts.append(f"   Note: {item['state_form_note']}")
        parts.append(f"   [ ] {item['accept_text']}")
        parts.append(f"   [ ] {item['decline_text']}")
        if item.get("options"):
            parts.append("   Vitamin K route (if accepting): [ ] oral  [ ] injection")
        parts.append("")
    parts.append(doc["signature_block"])
    text = "\n".join(parts)
    assert_informed_choice_language(text)
    return text


if __name__ == "__main__":
    # Smoke: render CA and an unknown state, gate both
    for st in ("CA", "ZZ"):
        doc = build_master_document(st, "Test Client", "Test Midwife", "2026-09-24")
        text = render_document_text(doc)
        assert "[ ]" in text and doc["items"][4]["options"] == ["oral", "shot", "none"]
        assert "against medical advice" not in text.lower()
    print("smoke ok: CA + unknown-state render, language gate passed")