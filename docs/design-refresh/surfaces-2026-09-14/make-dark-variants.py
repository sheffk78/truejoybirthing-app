#!/usr/bin/env python3
"""make-dark-variants.py v2 — DARK variants of the approved TJB mockup corpus.

Applies the light->dark reversal map (JOB-LEDGER 2026-09-23b) to common.css
and each approved mockup HTML. Property-aware for dual-role tokens:
white-as-bg -> surface, white-as-text -> white; lavender-as-bg -> kept
midtone, lavender-as-text -> lifted; roseBg chip -> dark rose chip.
Validates that no light-canvas hex survives outside allowed keeps.
"""
import json, os, re

BASE = os.path.dirname(os.path.abspath(__file__))

FILES = [
    "s5-app-birth-plan.html",
    "s6-app-timeline.html",
    "s7s8s9-app-mom-core.html",
    "s10s11s12-mom-home-timer-tips.html",
    "s13s14s15-app-profile-wellness-invoices.html",
    "marketplace-m16-mockup.html",
    "provider-detail-m17-mockup.html",
]

# straight map (light hex -> dark hex), WCAG-checked
MAP = {
    "#FAF8F5": "#1A1520",
    "#FDFCFA": "#2A2330",
    "#FBF5F9": "#221B20",
    "#EDEAF6": "#2F2C3A",
    "#F3F1EE": "#3C3541",
    "#F0E9EE": "#3C3540",
    "#E8EDE5": "#293522",
    "#F1F1FB": "#222235",
    "#D5D3E8": "#434059",
    "#EBE7E1": "#201B1F",
    "#FBEEF5": "#3A2530",
    "#2A2A2A": "#F5F3F6",
    "#4B4B4B": "#B6B1B9",
    "#6A6B6C": "#9E97A4",
    "#8A8B8D": "#7F7388",
    "#9C9DA0": "#8A7F90",
    "#55595F": "#E3DFE6",
    "#B9AFB8": "#756273",
    "#A25C86": "#AE7698",
    "#B085A5": "#C09BB6",
    "#B87AA0": "#BD7FA5",
    "#5F7154": "#728F60",
}

# dual-role tokens, resolved per-declaration by CSS property
DUAL = {
    "#6E6C99": {"text": "#9796B9", "bg": "#6E6C99", "border": "#6E6C99"},
    "#8E8CB5": {"text": "#A9A7C8", "bg": "#8E8CB5", "border": "#8E8CB5"},
    "#FFFFFF": {"text": "#FFFFFF", "bg": "#2A2330", "border": "#3C3540"},
    "#FFF":    {"text": "#FFFFFF", "bg": "#2A2330", "border": "#3C3540"},
    "#EFE0EB": {"text": "#E3DFE6", "bg": "#372031", "border": "#473943"},
}

RGBA_MAP = {
    "rgba(110,108,153,.14)": "rgba(142,140,181,.16)",
    "rgba(42,42,42,.05)": "rgba(0,0,0,.18)",
    "rgba(42,42,42,.07)": "rgba(0,0,0,.25)",
    "rgba(42,42,42,.08)": "rgba(0,0,0,.28)",
    "rgba(250,248,245,0)": "rgba(26,21,32,0)",
    "rgba(250,248,245,.75)": "rgba(26,21,32,.78)",
    "rgba(250, 248, 245, 0)": "rgba(26, 21, 32, 0)",
    "rgba(250, 248, 245, 0.75)": "rgba(26, 21, 32, 0.78)",
    "rgba(0,0,0,0.12)": "rgba(0,0,0,0.35)",
}

FOREGROUND_PROPS = ("color", "fill", "stroke")

def apply_map(text: str) -> str:
    # Pass 1: property-aware dual-role substitution (declaration at a time)
    dual_pat = re.compile(r"([A-Za-z-]+\s*:)\s*([^;{}\"]*)", re.IGNORECASE)
    def dual_sub(m):
        prop_raw, val = m.group(1), m.group(2)
        for hexs, spec in DUAL.items():
            if re.search(re.escape(hexs) + r"\b", val, re.IGNORECASE):
                p = prop_raw.strip().rstrip(":").strip().lower()
                if p.startswith(FOREGROUND_PROPS):
                    out = spec["text"]
                elif p.startswith("border") or p == "outline":
                    out = spec["border"]
                else:
                    out = spec["bg"]
                new_val = re.sub(re.escape(hexs) + r"\b", out, val, flags=re.IGNORECASE)
                return prop_raw + " " + new_val
        return m.group(0)
    text = dual_pat.sub(dual_sub, text)

    # Pass 2: straight hex map (case-insensitive)
    for l, d in MAP.items():
        text = re.sub(re.escape(l) + r"\b", d, text, flags=re.IGNORECASE)

    # Pass 3: rgba washes / veil stops
    for a, b in RGBA_MAP.items():
        text = text.replace(a, b)
    return text

def main():
    css = open(os.path.join(BASE, "common.css")).read()
    with open(os.path.join(BASE, "common-dark.css"), "w") as f:
        f.write(apply_map(css))
    print("wrote common-dark.css")

    made = []
    must_die = ["#FAF8F5", "#FDFCFA", "#FBF5F9", "#EDEAF6", "#F0E9EE",
                "#E8EDE5", "#F1F1FB", "#2A2A2A", "#4B4B4B", "#6A6B6C",
                "#8A8B8D", "#9C9DA0", "#B9AFB8", "#A25C86", "#B085A5",
                "#B87AA0", "#5F7154", "#55595F", "#FBEEF5", "#EBE7E1", "#D5D3E8"]
    for f in FILES:
        src = os.path.join(BASE, f)
        if not os.path.exists(src):
            print(f"SKIP missing: {f}")
            continue
        html = open(src).read()
        html = html.replace('href="common.css"', 'href="common-dark.css"')
        html = apply_map(html)
        # Dark canvas paint: the light pages leave .phone/.screen unpainted
        # (browser white = Phase 1 approved look). Dark mode must paint the
        # screen family explicitly so the phone canvas is plum-black, not
        # transparent-over-white. Injected after <style> so it wins the
        # cascade on equal specificity; inline styles still win over it.
        dark_paint = (
            '<style id="dark-canvas-paint">'
            '.phone,.screen,.phone-frame{background:#1A1520 !important;}'
            '.statusbar{background:#1A1520 !important;}'
            'body{background:#101014 !important;}'
            '</style>'
        )
        html = html.replace("</style>", "</style>" + dark_paint, 1)
        out = f.replace(".html", "-dark.html")
        with open(os.path.join(BASE, out), "w") as fh:
            fh.write(html)
        bad = [h for h in must_die if re.search(re.escape(h) + r"\b", html, re.IGNORECASE)]
        stray_white_bg = re.findall(r"background\s*:[^;\"]*#[Ff]{3,6}\b", html)
        stray_rose = re.findall(r"background\s*:[^;\"]*#EFE0EB\b", html, re.IGNORECASE)
        status = "OK " if not (bad or stray_white_bg or stray_rose) else "WARN"
        msg = f"{status} {out} ({len(html)} bytes)"
        if bad:
            msg += f" unmapped={bad}"
        if stray_white_bg:
            msg += f" white-bg-left={len(stray_white_bg)}"
        if stray_rose:
            msg += f" rose-bg-left={len(stray_rose)}"
        print(msg)
        made.append(out)
    json.dump(made, open(os.path.join(BASE, "dark-variant-files.json"), "w"))
    print("DONE", len(made), "variants")

if __name__ == "__main__":
    main()