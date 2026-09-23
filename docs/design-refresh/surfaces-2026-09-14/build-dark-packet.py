#!/usr/bin/env python3
"""build-dark-packet.py — Phase 2 approval packet: side-by-side LIGHT vs DARK
for every refreshed screen, rendered at 390x844 @2x.

Layout: A4 landscape, 2-up grid — light render left, dark render right, one
row per screen with a caption bar. Cover page lists the reversal map summary.
Output: DARK-REVIEW-2026-09-23.pdf
"""
import os
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

BASE = "/Users/socializerender/Projects/TrueJoyBirthing-Mobile/docs/design-refresh/surfaces-2026-09-14"
OUT = os.path.join(BASE, "DARK-REVIEW-2026-09-23.pdf")
R = os.path.join(BASE, "renders-dark")

ROWS = [
    ("s10s11s12-mom-home-timer-tips-phone1", "MOM HOME — greeting + week band"),
    ("s10s11s12-mom-home-timer-tips-phone2", "HOME feed — team + wellness"),
    ("s10s11s12-mom-home-timer-tips-phone3", "CONTRACTION TIMER"),
    ("s10s11s12-mom-home-timer-tips-phone4", "TIPS SHEET"),
    ("s6-app-timeline-phone1", "APP TIMELINE — watercolor anchor"),
    ("s7s8s9-app-mom-core-phone1", "MOM CORE — home card"),
    ("s7s8s9-app-mom-core-phone2", "MOM CORE — midwife/doula cards"),
    ("s7s8s9-app-mom-core-phone3", "MOM CORE — team detail"),
    ("s5-app-birth-plan-phone1", "BIRTH PLAN"),
    ("s13s14s15-app-profile-wellness-invoices-phone1", "PROFILE"),
    ("s13s14s15-app-profile-wellness-invoices-phone4", "WELLNESS"),
    ("s13s14s15-app-profile-wellness-invoices-phone2", "INVOICES"),
    ("marketplace-m16-mockup-phone1", "MARKETPLACE (M16)"),
    ("marketplace-m16-mockup-phone2", "MARKETPLACE — provider list"),
]

W, H = landscape(A4)
M = 10 * mm  # margin

def wrap(c, text, font, size, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if c.stringWidth(t, font, size) <= maxw:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def build():
    c = canvas.Canvas(OUT, pagesize=(W, H))
    # ---- cover ----
    c.setFillColorRGB(0.10, 0.08, 0.13)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColorRGB(0.96, 0.95, 0.97)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(M, H - 30 * mm, "TrueJoyBirthing — Phase 2: Dark Mode (mechanical reversal of the approved light design)")
    c.setFont("Helvetica", 10.5)
    lines = [
        "Every dark value below is the mapped counterpart of a Jeff-approved light value — no redesign.",
        "Surfaces flip to plum-black; text flips to light; midtone accents keep their hue and lift for contrast.",
        "All dark text pairs meet or beat their light-mode WCAG contrast (body 8.5:1, kickers >= 4.9:1).",
        "",
        "Key reversals:",
        "  cream #FAF8F5 -> #1A1520 (canvas)   card #FDFCFA -> #2A2330   ink #2A2A2A -> #F5F3F6",
        "  lavender pill #6E6C99 kept (white text stays 4.9:1)   rose chips invert to dark-rose surfaces",
        "  photos & watercolors keep full color (brand art untouched)",
        "",
        "Review ask: approve this map as the dark token corpus; TSX conversion follows the identical map.",
        "Generated 2026-09-23 - render pipeline: make-dark-variants.py -> render-dark.py -> this packet.",
    ]
    y = H - 42 * mm
    for ln in lines:
        c.drawString(M, y, ln)
        y -= 6.2 * mm
    c.showPage()

    # ---- rows: 2 screens per page ----
    pairs_per_page = 2
    for i in range(0, len(ROWS), pairs_per_page):
        chunk = ROWS[i:i + pairs_per_page]
        c.setFillColorRGB(0.97, 0.96, 0.98)
        c.rect(0, 0, W, H, stroke=0, fill=1)
        row_h = (H - 2 * M) / pairs_per_page
        for j, (base, label) in enumerate(chunk):
            top = H - M - j * row_h
            # caption
            c.setFillColorRGB(0.10, 0.08, 0.13)
            c.setFont("Helvetica-Bold", 12)
            c.drawString(M, top - 7 * mm, label)
            c.setFont("Helvetica", 8.5)
            c.setFillColorRGB(0.42, 0.40, 0.45)
            c.drawString(M + 180 * mm, top - 7 * mm, "light (approved)  ->  dark (proposal)")
            # images: 390x844 @2x => aspect 0.462
            img_h = row_h - 14 * mm
            img_w = img_h * 390 / 844
            for k, suffix in enumerate(["-light.png", "-dark.png"]):
                p = os.path.join(R, base + suffix)
                if not os.path.exists(p):
                    c.setFillColorRGB(0.85, 0.2, 0.2)
                    c.setFont("Helvetica", 9)
                    c.drawString(M + 20 * mm + k * (img_w + 12 * mm), top - row_h / 2, "MISSING: " + base + suffix)
                    continue
                x = M + 30 * mm + k * (img_w + 14 * mm)
                y_img = top - 10 * mm - img_h
                c.drawImage(p, x, y_img, width=img_w, height=img_h, preserveAspectRatio=True, mask='auto')
            # column labels
            c.setFillColorRGB(0.42, 0.40, 0.45)
            c.setFont("Helvetica", 8)
            c.drawString(M + 30 * mm, top - 12 * mm, "LIGHT")
            c.drawString(M + 30 * mm + img_w + 14 * mm, top - 12 * mm, "DARK")
        c.showPage()

    # footer page numbers handled by reportlab automatically? no - simple page count
    c.save()
    print("wrote", OUT)

if __name__ == "__main__":
    build()