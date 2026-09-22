"""
TJB Branded PDF generation — birth plan exports (refreshed design law, 2026-09-22).

Design language = approved 2026-09-14 refresh + Phase-A packet (Jeff approved 2026-09-22):
- Cormorant Garamond 700 for display headings, Quicksand 600 for kickers/labels,
  Source Sans 3 for body
- Muted palette: cream #FAF8F5, lavender #6E6C99, rose #A25C86, sage #5F7154,
  ink #2F2A33, gray #6B6470, hairline #EFE0EB  (banned: bright violet #7C3AED)
- Approved watercolor spot illustrations (transparent cutouts) decorate the title
  band and section headings — small, ink-light, print friendly
- Structure: cream title wash → meta row → labeled preference blocks per section

create_branded_pdf_buffer() keeps its exact signature — the mom export endpoint,
the provider export, and all callers stay unchanged. Data in = sections[{section_id,
data{field: str|list}}]; unknown fields render with auto-titled labels so future
sections keep working without edits here.
"""

import os
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, KeepTogether,
    Flowable, BaseDocTemplate, PageTemplate, Frame, Image as RLImage
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── TJB Color Tokens (2026 design refresh) ────────────────────────
CREAM        = colors.HexColor('#FAF8F5')
CREAM_WASH   = colors.HexColor('#F3EEE9')
LAVENDER     = colors.HexColor('#6E6C99')
LAVENDER_SOFT= colors.HexColor('#E7E4F2')
ROSE         = colors.HexColor('#A25C86')
ROSE_PALE    = colors.HexColor('#F1E4EC')
SAGE         = colors.HexColor('#5F7154')
INK          = colors.HexColor('#2F2A33')
GRAY         = colors.HexColor('#6B6470')
HAIRLINE     = colors.HexColor('#EFE0EB')

# ── Asset Paths ───────────────────────────────────────────────────
_ASSET_DIR   = os.environ.get('TJB_ASSET_DIR',
                 os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets'))
_FONT_DIR    = os.path.join(_ASSET_DIR, 'fonts')
_IMAGE_DIR   = os.path.join(_ASSET_DIR, 'images')
_SPOT_DIR    = os.environ.get('TJB_SPOT_DIR', os.path.join(_ASSET_DIR, 'spots'))
_LOGO_PATH   = os.path.join(_IMAGE_DIR, 'tjb-logo-wordmark.png')

# ── Fonts (lazy, once) ────────────────────────────────────────────
_fonts_registered = False

def _register_fonts():
    global _fonts_registered
    if _fonts_registered:
        return
    reg = pdfmetrics.registerFont
    T = TTFont
    reg(T('Cormorant700', os.path.join(_FONT_DIR, 'CormorantGaramond_700Bold.ttf')))
    reg(T('Cormorant600', os.path.join(_FONT_DIR, 'CormorantGaramond_600SemiBold.ttf')))
    reg(T('Cormorant500i', os.path.join(_FONT_DIR, 'CormorantGaramond_500Medium_Italic.ttf')))
    reg(T('Quicksand400', os.path.join(_FONT_DIR, 'Quicksand_400Regular.ttf')))
    reg(T('Quicksand600', os.path.join(_FONT_DIR, 'Quicksand_600SemiBold.ttf')))
    reg(T('Quicksand700', os.path.join(_FONT_DIR, 'Quicksand_700Bold.ttf')))
    reg(T('SourceSans', os.path.join(_FONT_DIR, 'SourceSans3_400Regular.ttf')))
    reg(T('SourceSans600', os.path.join(_FONT_DIR, 'SourceSans3_600SemiBold.ttf')))
    _fonts_registered = True

# ── Layout constants ──────────────────────────────────────────────
BAND_TOP    = 0.62 * inch      # cream band top, from page top
BAND_BOTTOM = 2.28 * inch      # band bottom, from page top
CONTENT_TOP_MARGIN    = BAND_BOTTOM + 0.30 * inch
CONTENT_BOTTOM_MARGIN = 0.85 * inch
CONTENT_LEFT  = 0.85 * inch
CONTENT_RIGHT = 0.85 * inch

FOOTER_LINE_Y = 0.72 * inch
FOOTER_TEXT_Y = 0.55 * inch

# Spot art per section (cycled in order)
_SPOTS = ['hands', 'teacup', 'chamomile', 'booties', 'bassinet', 'lavender']

def _spot_path(name):
    return os.path.join(_SPOT_DIR, f'spot-{name}-t.png')


def _get_spot(name, height=0.52 * inch):
    """Return an RLImage flowable for a spot illustration, or None if missing."""
    p = _spot_path(name)
    if not os.path.exists(p):
        return None
    try:
        from PIL import Image as PILImage
        w, h = PILImage.open(p).size
        return RLImage(p, width=height * (w / h), height=height, mask='auto')
    except Exception:
        return None


# ── Custom Flowables ──────────────────────────────────────────────

class RoseRule(Flowable):
    """Thin rose rule with a tiny dot at the left end — the approved section-head accent."""
    def __init__(self, width=1.05 * inch, height=1.6):
        super().__init__()
        self.width, self.height = width, height
    def draw(self):
        c = self.canv
        c.setFillColor(ROSE)
        c.circle(4, self.height / 2, 2.6, fill=1, stroke=0)
        c.setFillColor(HAIRLINE)
        c.rect(10, self.height / 2 - 0.4, self.width - 10, 0.8, fill=1, stroke=0)
    def wrap(self, aW, aH):
        return (self.width, self.height)


class BandWash(Flowable):
    """Soft cream wash band used behind the title block (drawn in onPage, not flow)."""
    pass


# ── Paragraph Styles ──────────────────────────────────────────────

def _build_styles():
    return {
        'kicker': ParagraphStyle('Kicker', fontName='Quicksand600', fontSize=8.5,
            leading=11, textColor=ROSE, spaceAfter=6),
        'title': ParagraphStyle('Title', fontName='Cormorant700', fontSize=27,
            leading=31, textColor=INK, spaceAfter=3),
        'subtitle': ParagraphStyle('Subtitle', fontName='Cormorant500i', fontSize=13.5,
            leading=17, textColor=LAVENDER, spaceAfter=0),
        'meta_label': ParagraphStyle('MetaLabel', fontName='Quicksand600', fontSize=7.5,
            leading=10, textColor=GRAY, spaceAfter=2),
        'meta_value': ParagraphStyle('MetaValue', fontName='SourceSans', fontSize=10,
            leading=13, textColor=INK),
        'section_head': ParagraphStyle('SectionHead', fontName='Cormorant700', fontSize=15.5,
            leading=19, textColor=INK, spaceBefore=0, spaceAfter=4),
        'label': ParagraphStyle('Label', fontName='Quicksand600', fontSize=8,
            leading=11, textColor=LAVENDER, spaceBefore=7, spaceAfter=1),
        'body': ParagraphStyle('Body', fontName='SourceSans', fontSize=10,
            leading=14.5, textColor=INK),
        'note': ParagraphStyle('Note', fontName='Cormorant500i', fontSize=11.5,
            leading=15, textColor=GRAY),
    }


# ── Header / Footer canvas art ────────────────────────────────────

def _title_band(canvas, doc):
    """Page-1 cream wash band: title, kicker, rose rule, spot art. Later pages: slim echo."""
    from reportlab.lib.units import inch as IN
    width, height = letter
    canvas.saveState()

    page = canvas.getPageNumber()
    if page == 1:
        # cream wash, full width
        canvas.setFillColor(CREAM_WASH)
        canvas.rect(0, height - BAND_BOTTOM, width, BAND_BOTTOM, fill=1, stroke=0)
        # faint cream base tint behind everything (ink-light)
        canvas.setFillColor(CREAM)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)

        # kicker
        canvas.setFont('Quicksand700', 8)
        canvas.setFillColor(ROSE)
        canvas.drawString(CONTENT_LEFT, height - 0.58 * inch, "T R U E   J O Y   B I R T H I N G")

        # spot art top-right (lavender sprig)
        sprig = _get_spot('lavender', height=0.95 * inch)
        if sprig:
            canvas.drawImage(_spot_path('lavender'), width - CONTENT_RIGHT - 0.75 * inch,
                             height - 1.62 * inch, width=sprig._restrictSize.__self__.drawWidth
                             if False else 0.95 * inch * (sprig.imageWidth / sprig.imageHeight),
                             height=0.95 * inch, mask='auto')

        # title + subtitle drawn by flowables in the frame (keeps text selectable)
    else:
        # slim continuation header: tiny rose dash + brand
        canvas.setFillColor(CREAM)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        canvas.setFillColor(ROSE)
        canvas.rect(CONTENT_LEFT, height - 0.62 * inch, 0.55 * inch, 1.6, fill=1, stroke=0)
        canvas.setFont('Quicksand600', 7.5)
        canvas.setFillColor(GRAY)
        canvas.drawString(CONTENT_LEFT + 0.12 * inch, height - 0.90 * inch,
                          "MY JOYFUL BIRTH PLAN · CONTINUED")

    # ── Footer (every page) ──
    canvas.setStrokeColor(HAIRLINE)
    canvas.setLineWidth(0.6)
    canvas.line(CONTENT_LEFT, FOOTER_LINE_Y, width - CONTENT_LEFT, FOOTER_LINE_Y)
    canvas.setFont('SourceSans', 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawString(CONTENT_LEFT, FOOTER_TEXT_Y,
                      "True Joy Birthing  ·  Prepared with love for my care team")
    # Page number drawn by NumberedCanvas in save() (knows the true total)
    canvas.restoreState()


def _footer_total_fix(canvas, doc):
    """Second pass placeholder — total pages filled via canvasmaker in build()."""
    pass


class NumberedCanvas(BaseDocTemplate.__mro__[1]):  # canvas.Canvas
    """Two-pass canvas: draws page numbers as 'Page N of M'."""
    def __init__(self, *args, **kwargs):
        from reportlab.pdfgen import canvas as rl_canvas
        self._rl = rl_canvas
        super().__init__(*args, **kwargs) if False else None
        raise RuntimeError("placeholder")


def _make_numbered_canvas():
    from reportlab.pdfgen.canvas import Canvas

    class TJBNumberedCanvas(Canvas):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._saved_page_states = []

        def showPage(self):
            self._saved_page_states.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            num_pages = len(self._saved_page_states)
            for state in self._saved_page_states:
                self.__dict__.update(state)
                self.draw_page_number(num_pages)
                Canvas.showPage(self)
            Canvas.save(self)

        def draw_page_number(self, total):
            width, height = letter
            self.setFont('SourceSans', 7.5)
            self.setFillColor(GRAY)
            self.drawRightString(width - CONTENT_LEFT, FOOTER_TEXT_Y,
                                 f"Page {self._pageNumber} of {total}")

    return TJBNumberedCanvas


# ── Value formatting ──────────────────────────────────────────────

def _format_value(value):
    if isinstance(value, list):
        return " · ".join(str(v) for v in value if v)
    return str(value)


# ── Public API ────────────────────────────────────────────────────

def create_branded_pdf_buffer(
    user_name: str,
    mom_profile: dict,
    sections: list,
    pdf_section_names: dict,
    pdf_field_labels: dict,
) -> BytesIO:
    """
    Build a TJB-branded birth plan PDF (2026 refreshed design) and return a BytesIO
    positioned at 0. Signature unchanged from the legacy generator.
    """
    _register_fonts()
    styles = _build_styles()
    NumberedCanvas = _make_numbered_canvas()

    buffer = BytesIO()
    doc = BaseDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=CONTENT_TOP_MARGIN,
        bottomMargin=CONTENT_BOTTOM_MARGIN,
        leftMargin=CONTENT_LEFT,
        rightMargin=CONTENT_RIGHT,
    )
    frame = Frame(
        CONTENT_LEFT, CONTENT_BOTTOM_MARGIN,
        letter[0] - CONTENT_LEFT - CONTENT_RIGHT,
        letter[1] - CONTENT_TOP_MARGIN - CONTENT_BOTTOM_MARGIN,
        id='normal', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id='tjb', frames=[frame], onPage=_title_band)])

    story = []

    # ── Title block (inside page-1 cream band) ──
    display = (user_name or "My").strip()
    story.append(Spacer(1, 2))
    story.append(Paragraph("My Joyful Birth Plan", styles['title']))
    story.append(Paragraph(f"Prepared by {display} for my birth team", styles['subtitle']))
    story.append(Spacer(1, 10))

    # ── Meta row ──
    _mp = mom_profile or {}
    _loc = " ".join(str(x) for x in [_mp.get("location_city", ""), _mp.get("location_state", "")] if x) or None
    meta_pairs = [("EXPECTED DUE DATE", _mp.get("due_date")),
                  ("BIRTH SETTING", _mp.get("planned_birth_setting")),
                  ("LOCATION", _loc)]
    meta_cells = []
    for pair in meta_pairs:
        label, val = pair
        meta_cells.append([
            Paragraph(label, styles['meta_label']),
            Paragraph(str(val) if val else "—", styles['meta_value']),
        ])
    meta = Table([meta_cells], colWidths=[2.1 * inch, 2.0 * inch, 2.7 * inch])
    meta.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LINEBELOW', (0, 0), (-1, -1), 0.6, HAIRLINE),
        ('LINEABOVE', (0, 0), (-1, -1), 0.6, HAIRLINE),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(meta)
    story.append(Spacer(1, 6))

    # ── Sections ──
    filled = 0
    for idx, section in enumerate(sections or []):
        sid = section.get("section_id", "")
        data = section.get("data") or {}
        data = {k: v for k, v in data.items() if v not in (None, "", [])}
        if not data:
            continue
        filled += 1

        head_name = pdf_section_names.get(sid, sid.replace("_", " ").title())
        spot = _get_spot(_SPOTS[idx % len(_SPOTS)], height=0.46 * inch)

        head_table = Table(
            [[Paragraph(head_name, styles['section_head']),
              spot if spot else ""]],
            colWidths=[5.9 * inch, 1.0 * inch],
        )
        head_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))

        block = [head_table, RoseRule(), Spacer(1, 5)]
        field_paras = []
        for key, value in data.items():
            label = pdf_field_labels.get(key, key.replace("_", " ").title())
            field_paras.append(Paragraph(label.upper(), styles['label']))
            field_paras.append(Paragraph(_format_value(value), styles['body']))

        # keep head + rule + first field-label together
        story.append(KeepTogether(block + field_paras[:2]))
        story.extend(field_paras[2:])
        story.append(Spacer(1, 14))

    if filled == 0:
        story.append(Paragraph(
            "This birth plan is still growing. Once preferences are added in the "
            "True Joy Birthing app, they will appear here as a beautiful, printable plan.",
            styles['note']))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer