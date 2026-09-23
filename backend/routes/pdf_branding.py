"""
TJB Branded PDF generation — birth plan exports (site-matched design law, 2026-09-22).

Design language = The Joyful Birth Plan (truejoybirthing.com/true-joy-birth-plan.pdf),
the site standard Jeff pointed to — NOT the earlier spot-illustration style:
- ALL-SANS typography (Quicksand headings/labels + Source Sans body), no serif
- Full-width muted-lavender section bands (uppercase, letterspaced, white text)
- Checkbox rows for every choice field: real checkboxes with lavender solid fill
  for SELECTED options (matches the filled-in affordance), hollow squares otherwise
- Free-text fields: label + answer in a light ruled well (like the site's write-in lines)
- Hairline dividers between rows, generous vertical rhythm, single column
- Header: lavender band w/ TRUE JOY BIRTHING; page 1 adds "The Joyful Birth Plan"
  masthead + mom's name/date; footer: doc title left, Page N of M right (2-pass)
- One tasteful watercolor accent ONLY on the cover masthead (lavender sprig);
  content pages stay pure form like the site's booklet
- Unknown fields/sections future-proof: render gracefully, never crash

create_branded_pdf_buffer(user_name, birth_plan, pdf_sections, section_names,
                          field_labels, mom_profile=None, filename=None)
  keeps its exact signature — the mom export endpoint, provider client PDF,
  and lead PDF all keep working unchanged.
"""
from __future__ import annotations

import json
import os
from datetime import datetime

from reportlab.lib import colors as rl_colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

# ── Asset Paths ───────────────────────────────────────────────────
_ASSET_DIR = os.environ.get(
    'TJB_ASSET_DIR',
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets'),
)
_FONT_DIR = os.path.join(_ASSET_DIR, 'fonts')
_IMAGE_DIR = os.path.join(_ASSET_DIR, 'images')
_SPOT_DIR = os.path.join(_ASSET_DIR, 'spots')

# ── Palette (refresh + site booklet) ─────────────────────────────
LAVENDER = HexColor('#EBEAF5')        # full-width fills — site booklet's print-safe washted lavender)
LAVENDER_SOFT = HexColor('#E7E0F0')   # checkbox fill / soft washes
LAVENDER_XSOFT = HexColor('#F4F1F8')  # free-text wells / meta row wash
INK = HexColor('#3F3A45')             # primary text
INK_SOFT = HexColor('#6E6678')        # secondary text
HAIRLINE = HexColor('#DDD5E4')        # row dividers
PAPER = HexColor('#FFFFFF')
COVER_WASH = HexColor('#F7F4FA')      # cover band wash

ACCENT_ROSE = HexColor('#C98CA7')     # brand accents (footer heart, checkbox stroke alt)

# ── Fonts (all-sans, refresh law) ─────────────────────────────────
_FONT_FILES = {
    ('Quicksand', 'Regular'): 'Quicksand-Regular.ttf',
    ('Quicksand', 'Medium'): 'Quicksand-Medium.ttf',
    ('Quicksand', 'SemiBold'): 'Quicksand-SemiBold.ttf',
    ('Quicksand', 'Bold'): 'Quicksand-Bold.ttf',
    ('SourceSans', 'Regular'): 'SourceSans3-Regular.ttf',
    ('SourceSans', 'Semibold'): 'SourceSans3-Semibold.ttf',
    ('SourceSans', 'Italic'): 'SourceSans3-It.ttf',
}
_FONT_READY = False


def _ensure_fonts() -> None:
    global _FONT_READY
    if _FONT_READY:
        return
    for (fam, variant), fname in _FONT_FILES.items():
        path = os.path.join(_FONT_DIR, fname)
        if os.path.exists(path):
            pdfmetrics.registerFont(TTFont(f'{fam}-{variant}', path))
    _FONT_READY = True


def _f(fam: str, variant: str) -> str:
    _ensure_fonts()
    name = f'{fam}-{variant}'
    try:
        pdfmetrics.getFont(name)
        return name
    except Exception:
        return 'Helvetica'


# ── Geometry ──────────────────────────────────────────────────────
PAGE_W, PAGE_H = letter
MARGIN = 0.85 * inch
CONTENT_W = PAGE_W - 2 * MARGIN

FOOTER_TEXT_Y = 0.52 * inch
FOOTER_RULE_Y = 0.68 * inch


# ── 2-pass canvas: true "Page N of M" on every page ───────────────
class NumberedCanvas(pdfcanvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self._draw_footer(total)
            super().showPage()
        super().save()

    def _draw_footer(self, total: int) -> None:
        self.setFillColor(HAIRLINE)
        self.setStrokeColor(HAIRLINE)
        self.setLineWidth(0.6)
        self.line(MARGIN, FOOTER_RULE_Y, PAGE_W - MARGIN, FOOTER_RULE_Y)
        self.setFont(_f('Quicksand', 'Medium'), 7.5)
        self.setFillColor(INK_SOFT)
        self.drawString(MARGIN, FOOTER_TEXT_Y, 'The Joyful Birth Plan  ·  True Joy Birthing')
        self.drawRightString(PAGE_W - MARGIN, FOOTER_TEXT_Y, f'Page {self._pageNumber} of {total}')


# ── Page furniture ────────────────────────────────────────────────
def _draw_top_band(canvas: pdfcanvas.Canvas, doc) -> None:
    """Printer-friendly header on every content page: letterspaced brand line +
    thin lavender hairline. No ink fill (full-bleed bands waste toner and band
    the header on home printers)."""
    band_h = 0.30 * inch
    canvas.saveState()
    canvas.setFillColor(INK)
    canvas.setFont(_f('Quicksand', 'SemiBold'), 8)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H - band_h + 0.095 * inch, 'T R U E   J O Y   B I R T H I N G')
    canvas.setStrokeColor(LAVENDER)
    canvas.setLineWidth(0.75)
    canvas.line(MARGIN, PAGE_H - band_h, PAGE_W - MARGIN, PAGE_H - band_h)
    canvas.restoreState()


# ── Flowables ─────────────────────────────────────────────────────
class SectionBand(Flowable):
    """Full-width muted-lavender band with uppercase letterspaced white title."""

    def __init__(self, text: str, width: float, number: int | None = None):
        super().__init__()
        self.text = text
        self.width = width
        self.number = number
        self.height = 0.34 * inch

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(LAVENDER)
        c.rect(0, 0, self.width, self.height, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont(_f('Quicksand', 'SemiBold'), 10.5)
        label = self.text.upper()
        if self.number is not None:
            label = f'SECTION {self.number}  ·  {label}'
        # manual letterspacing
        x = MARGIN * 0.35
        y = (self.height - 10.5) / 2 + 2.2
        for ch in label:
            c.drawString(x, y, ch)
            x += c.stringWidth(ch, _f('Quicksand', 'SemiBold'), 10.5) + 0.9
        c.restoreState()


class CheckboxRow(Flowable):
    """One checkbox option: 10pt square + label. Filled => soft lavender fill + ink check."""

    ROW_H = 0.235 * inch

    def __init__(self, label: str, checked: bool, width: float):
        super().__init__()
        self.label = label
        self.checked = checked
        self.width = width

    def wrap(self, aw, ah):
        return self.width, self.ROW_H

    def draw(self):
        c = self.canv
        box = 0.115 * inch
        y = (self.ROW_H - box) / 2
        c.saveState()
        if self.checked:
            c.setFillColor(LAVENDER_SOFT)
            c.roundRect(0, y, box, box, 2, stroke=0, fill=1)
            c.setStrokeColor(INK)
            c.setLineWidth(1.25)
            c.setLineCap(1)
            c.setLineJoin(1)
            # check mark (single polyline, slightly deep V)
            # check geometry tuned for 8.3pt box: visible short arm + long arm
            x1, x2, x3 = 1.7, 3.3, 6.9
            y1, y2, y3 = y + 4.6, y + 2.6, y + 6.4
            p = c.beginPath()
            p.moveTo(x1, y1)
            p.lineTo(x2, y2)
            p.lineTo(x3, y3)
            c.drawPath(p, stroke=1, fill=0)
        else:
            c.setStrokeColor(HAIRLINE)
            c.setLineWidth(0.9)
            c.roundRect(0, y, box, box, 2, stroke=1, fill=0)
        c.setFillColor(INK if self.checked else INK_SOFT)
        c.setFont(_f('SourceSans', 'Semibold' if self.checked else 'Regular'), 9.5)
        c.drawString(box + 8, y + 0.5, self.label)
        c.restoreState()


class FreeTextAnswer(Flowable):
    """Label + wrapped answer inside a soft lavender wash (site's write-in line analog)."""

    PAD_X = 10
    PAD_TOP = 7
    PAD_BOTTOM = 8

    def __init__(self, label: str, value: str, width: float):
        super().__init__()
        self.label = label
        self.value = value
        self.width = width
        self._val_style = ParagraphStyle(
            'fta', fontName=_f('SourceSans', 'Regular'), fontSize=9.5, leading=13.5, textColor=INK)
        self._val_para = Paragraph(value, self._val_style)
        inner_w = width - 2 * self.PAD_X
        _, self._val_h = self._val_para.wrap(inner_w, 10000)
        self.height = self.PAD_TOP + 12 + self._val_h + self.PAD_BOTTOM

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(LAVENDER_XSOFT)
        c.roundRect(0, 0, self.width, self.height, 4, stroke=0, fill=1)
        c.setFillColor(INK_SOFT)
        c.setFont(_f('Quicksand', 'SemiBold'), 7.4)
        c.drawString(self.PAD_X, self.height - self.PAD_TOP - 5, self.label.upper())
        self._val_para.drawOn(c, self.PAD_X, self.PAD_BOTTOM + 2)
        c.restoreState()


class FieldNote(Flowable):
    """Small helper line under a section band (site: 'Check all that apply...')."""

    def __init__(self, text: str, width: float):
        super().__init__()
        self.text = text
        self.width = width
        self.height = 13

    def wrap(self, aw, ah):
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFont(_f('SourceSans', 'Italic'), 8.6)
        c.setFillColor(INK_SOFT)
        c.drawString(0, 2, self.text)


def _hairline(width: float) -> Table:
    t = Table([['']], colWidths=[width], rowHeights=[0.4])
    t.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 0.6, HAIRLINE),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    return t


# ── Schema (app-native field/option lists; staged asset) ──────────
def _load_schema() -> dict:
    path = os.path.join(_ASSET_DIR, 'birth_plan_form_schema.json')
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            return json.load(fh)
    except Exception:
        return {}


SCHEMA = _load_schema()

# Section title -> schema section_id mapping (backend section_names may differ slightly)
_TITLE_ALIASES = {
    'about me': 'about_me', 'about me & my preferences': 'about_me',
    'labor & delivery': 'labor_delivery', 'labor & delivery preferences': 'labor_delivery',
    'labor support': 'labor_support',
    'pain management': 'pain_management',
    'labor environment': 'monitoring_iv', 'labor environment & comfort': 'monitoring_iv',
    'monitoring': 'monitoring_iv', 'monitoring & iv': 'monitoring_iv',
    'induction': 'induction_interventions', 'induction & birth interventions': 'induction_interventions',
    'pushing': 'pushing_safe_word', 'pushing, delivery & safe word': 'pushing_safe_word',
    'post-delivery': 'post_delivery', 'post delivery': 'post_delivery', 'post-delivery preferences': 'post_delivery',
    'newborn care': 'newborn_care', 'newborn care preferences': 'newborn_care',
    'other considerations': 'other_considerations', 'other important considerations': 'other_considerations',
}


def _schema_for_section(section_name: str):
    sid = _TITLE_ALIASES.get(str(section_name).strip().lower())
    if not sid:
        return []
    return [(k, v) for k, v in SCHEMA.items() if v.get('section') == sid]


def _norm(v) -> str:
    return str(v).strip().lower()


# ── Answer formatting ─────────────────────────────────────────────
def _format_value(value) -> tuple[str, list[str] | None, list[bool] | None, list[str] | None]:
    """Returns (joined_text, option_labels, checked_flags, free_text_lines)."""
    if value is None:
        return '', None, None, None
    if isinstance(value, list):
        vals = [str(v) for v in value if str(v).strip()]
        if not vals:
            return '', None, None, None
        return '  ·  '.join(vals), None, None, None
    s = str(value).strip()
    if not s:
        return '', None, None, None
    return s, None, None, None


# ── Story assembly ────────────────────────────────────────────────
def _cover_flow(user_name: str, birth_plan: dict, mom_profile: dict | None, width: float) -> list:
    flow: list = []
    flow.append(Spacer(1, 0.28 * inch))
    # Masthead
    mast = Table(
        [[Paragraph('THE JOYFUL BIRTH PLAN', ParagraphStyle(
            'mast', fontName=_f('Quicksand', 'SemiBold'), fontSize=25, leading=30,
            textColor=INK, alignment=TA_CENTER))]],
        colWidths=[CONTENT_W], rowHeights=[0.62 * inch])
    mast.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COVER_WASH),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    flow.append(mast)
    # sprig accent, centered
    sprig = os.path.join(_SPOT_DIR, 'spot-lavender-t.png')
    if os.path.exists(sprig):
        from reportlab.platypus import Image as RLImage
        try:
            img = RLImage(sprig, width=0.62 * inch, height=0.62 * inch)
            img.hAlign = 'CENTER'
            flow.append(Spacer(1, 6))
            flow.append(img)
        except Exception:
            pass
    flow.append(Spacer(1, 10))
    name = (user_name or '').strip() or '—'
    flow.append(Paragraph(
        f'Prepared by <font name="{_f("Quicksand", "SemiBold")}">{name}</font>',
        ParagraphStyle('byname', fontName=_f('SourceSans', 'Regular'), fontSize=11.5,
                       leading=15, textColor=INK_SOFT, alignment=TA_CENTER)))
    # meta row: due date / birth setting / location
    mp = mom_profile or {}
    # prefer the mom's own plan answers; profile values are the fallback
    _about = (birth_plan or {}).get('about_me') if isinstance((birth_plan or {}).get('about_me'), dict) else {}
    due = _about.get('dueDate') or mp.get('due_date')
    _setting_answer = _about.get('plannedBirthSetting') or _about.get('birthLocation') or _about.get('birthSetting')
    if isinstance(_setting_answer, list):
        _setting_answer = ', '.join(str(x) for x in _setting_answer) if _setting_answer else None
    setting = _setting_answer or mp.get('planned_birth_setting')
    loc = ' '.join(str(x) for x in [mp.get('location_city', ''), mp.get('location_state', '')] if x) or None
    cells, labels = [], []
    for label, val in (('EXPECTED DUE DATE', due), ('BIRTH SETTING', setting), ('LOCATION', loc)):
        labels.append(Paragraph(label, ParagraphStyle(
            'ml', fontName=_f('Quicksand', 'SemiBold'), fontSize=7.2, leading=9,
            textColor=LAVENDER, alignment=TA_CENTER)))
        cells.append(Paragraph(str(val) if val else '—', ParagraphStyle(
            'mv', fontName=_f('SourceSans', 'Regular'), fontSize=9.5, leading=12,
            textColor=INK, alignment=TA_CENTER)))
    meta = Table([labels, cells], colWidths=[CONTENT_W / 3.0] * 3)
    meta.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BACKGROUND', (0, 0), (-1, -1), LAVENDER_XSOFT),
        ('LINEBEFORE', (1, 0), (2, -1), 0.6, PAPER),
        ('TOPPADDING', (0, 0), (-1, 0), 7),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    flow.append(Spacer(1, 12))
    flow.append(meta)
    flow.append(Spacer(1, 14))
    flow.append(Paragraph(
        'A letter to my healthcare team — my preferences, my voice, my plan.',
        ParagraphStyle('tag', fontName=_f('SourceSans', 'Italic'), fontSize=9.5, leading=13,
                       textColor=INK_SOFT, alignment=TA_CENTER)))
    flow.append(Spacer(1, 6))
    return flow


def _field_rows(field_key: str, field_meta: dict, value, width: float) -> list:
    rows: list = []
    ftype = field_meta.get('type', 'text')
    label = field_meta.get('label') or field_key

    if ftype in ('singleselect', 'multiselect'):
        options = field_meta.get('options') or []
        if options:
            vals = value if isinstance(value, list) else ([str(value)] if value else [])
            vals_norm = {_norm(v) for v in vals}
            head = Paragraph(label.upper(), ParagraphStyle(
                'fl', fontName=_f('Quicksand', 'SemiBold'), fontSize=7.4, leading=9.5,
                textColor=INK_SOFT))
            group = [head, Spacer(1, 4)]
            for opt in options:
                group.append(CheckboxRow(opt, _norm(opt) in vals_norm, width))
                group.append(_hairline(width))
            group.append(Spacer(1, 5))
            return group
        # no options: fall through to text rendering

    # text / textarea / date / unlisted choice fields
    text, *_ = _format_value(value)
    return [FreeTextAnswer(label, text if text else '—', width), Spacer(1, 6)]


def _section_block(section_name: str, plan: dict, width: float, number: int | None,
                   band_title: str | None = None) -> list:
    flow: list = []
    # plan may be keyed by section_id ("labor_delivery") or by title — try both
    sid = _TITLE_ALIASES.get(str(section_name).strip().lower())
    data = None
    for key in (sid, section_name):
        v = plan.get(key) if key else None
        if isinstance(v, dict):
            data = v
            break
        if v:  # flat dict {section_id: {field: val}} vs {field: val}
            data = {section_name: v}
            break
    data = data if isinstance(data, dict) else {}
    fields = _schema_for_section(section_name)
    if not fields:
        # title missed the alias table; retry using any plan key that matches a schema section
        for plan_key, plan_val in plan.items():
            cand = _schema_for_section(plan_key)
            if cand and isinstance(plan_val, dict):
                fields = cand
                data = plan_val
                section_name = plan_key
                break
    if not fields:
        # unknown section: generic render of whatever data exists
        if not data:
            return []
        flow.append(SectionBand(str(band_title or section_name).upper(), width, number))
        flow.append(Spacer(1, 8))
        for k, v in data.items():
            pretty = k.replace('_', ' ').title()
            text, *_ = _format_value(v)
            flow.append(FreeTextAnswer(pretty, text if text else '—', width))
            flow.append(Spacer(1, 6))
        return flow
    # skip section if EVERY field empty
    def _filled(v):
        if isinstance(v, list):
            return bool([x for x in v if str(x).strip()])
        return bool(str(v or '').strip())
    if not any(_filled(data.get(k)) for k, _ in fields):
        return []
    flow.append(SectionBand(str(band_title or section_name), width, number))
    flow.append(Spacer(1, 9))
    multi_hint = False
    for k, meta in fields:
        v = data.get(k)
        ftype = meta.get('type', 'text')
        rows = _field_rows(k, meta, v, width)
        if len(rows) > 1:
            flow.append(KeepTogether(rows))
        else:
            flow.extend(rows)
    flow.append(Spacer(1, 6))
    return flow


def build_birth_plan_story(user_name: str, birth_plan: dict, pdf_sections: list[dict],
                           section_names: dict, mom_profile: dict | None) -> list:
    story: list = []
    seen = 0
    plan = dict(birth_plan or {})
    # normalize prod shape {sections:[{section_id,data}]} into plan BEFORE the cover renders
    for sec in (pdf_sections or []):
        if isinstance(sec, dict) and isinstance(sec.get('data'), dict) and sec.get('data'):
            sid = sec.get('section_id') or ''
            plan.setdefault(sid, {}).update(sec['data'])
    story.extend(_cover_flow(user_name, plan, mom_profile, CONTENT_W))
    for sec in pdf_sections:
        if isinstance(sec, dict):
            name = sec.get('section_id') or sec.get('name') or sec.get('title') or ''
            # prod shape: {section_id, data:{...}} — merge into the plan view
            if isinstance(sec.get('data'), dict) and sec.get('data'):
                plan.setdefault(name, {}).update(sec['data'])
            if isinstance(sec.get('fields'), dict) and sec.get('fields'):
                plan.setdefault(name, {}).update(sec['fields'])
            title = (section_names.get(name) if isinstance(section_names, dict) else None) \
                    or sec.get('title') or name.replace('_', ' ').title()
        else:
            name = str(sec)
            title = (section_names.get(name) if isinstance(section_names, dict) else None) or name.replace('_', ' ').title()
        seen += 1
        blk = _section_block(title, plan, CONTENT_W, seen, band_title=title)
        if not blk:
            # title-keyed lookup found nothing; retry with the raw section_id
            blk = _section_block(name, plan, CONTENT_W, seen, band_title=title)
        if blk:
            story.extend(blk)
            story.append(Spacer(1, 8))
    return story


# ── Entry point (signature-compatible) ────────────────────────────
def create_branded_pdf_buffer(user_name: str = 'Mom', birth_plan: dict | None = None,
                              pdf_sections: list | None = None,
                              section_names: dict | None = None,
                              field_labels: dict | None = None,
                              mom_profile: dict | None = None, filename: str | None = None,
                              sections: list | None = None, pdf_section_names: dict | None = None,
                              pdf_field_labels: dict | None = None, **_compat):
    # care_plans.py legacy kwargs -> canonical names
    if sections is not None and not pdf_sections:
        pdf_sections = sections
    if pdf_section_names is not None and not section_names:
        section_names = pdf_section_names
    field_labels = pdf_field_labels or field_labels
    birth_plan = birth_plan if birth_plan is not None else {}
    import io
    buffer = io.BytesIO()
    doc = BaseDocTemplate(
        buffer if filename is None else filename, pagesize=letter,
        leftMargin=MARGIN, rightMargin=MARGIN, topMargin=0.55 * inch, bottomMargin=0.85 * inch,
        title='The Joyful Birth Plan', author='True Joy Birthing')
    frame = Frame(MARGIN, 0.85 * inch, CONTENT_W, PAGE_H - 0.55 * inch - 0.85 * inch, id='normal')
    doc.addPageTemplates([PageTemplate(id='main', frames=[frame], onPage=_draw_top_band)])
    story = build_birth_plan_story(user_name, birth_plan or {}, pdf_sections or [],
                                   section_names or {}, mom_profile)
    doc.build(story, canvasmaker=NumberedCanvas)
    if filename is not None:
        return None
    buffer.seek(0)
    return buffer