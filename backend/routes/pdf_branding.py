"""
TJB Branded PDF generation helpers for birth plan exports.

Uses ReportLab with:
- DM Serif Display for headings (brand font)
- DM Sans for body text (brand font)
- TJB logo as page header
- Lavender (#7C3AED) section heading text
- Rose (#D8A0C4) accent bars
- White background (print-friendly, minimal ink)
- Footer with brand name, URL, and page numbers

All colors are ink-efficient: no filled backgrounds, just text and thin accent lines.

Layout (all measurements in inches from top of page):
  0.35  ── logo top
  1.06  ── logo bottom (0.35 + 0.709 logo height)
  1.12  ── rose accent bar (0.06 gap below logo)
  1.35  ── content frame top (0.23 gap below bar)
  10.50 ── content frame bottom
  10.65 ── footer line
  10.80 ── footer text
"""

import os
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle,
    Flowable, BaseDocTemplate, PageTemplate, Frame
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── TJB Color Tokens ──────────────────────────────────────────────
TJB_LAVENDER = colors.HexColor('#7C3AED')
TJB_LAVENDER_LIGHT = colors.HexColor('#EDE5FF')
TJB_ROSE = colors.HexColor('#D8A0C4')
TJB_CHARCOAL = colors.HexColor('#2D2D2D')
TJB_GRAY = colors.HexColor('#6B7280')

# ── Asset Paths ───────────────────────────────────────────────────
_ASSET_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets')
_FONT_DIR = os.path.join(_ASSET_DIR, 'fonts')
_IMAGE_DIR = os.path.join(_ASSET_DIR, 'images')
_LOGO_PATH = os.path.join(_IMAGE_DIR, 'tjb-logo-wordmark.png')

# ── Font Registration (lazy, once) ────────────────────────────────
_fonts_registered = False

def _register_fonts():
    global _fonts_registered
    if _fonts_registered:
        return
    pdfmetrics.registerFont(TTFont('DMSans', os.path.join(_FONT_DIR, 'DMSans-Regular.ttf')))
    pdfmetrics.registerFont(TTFont('DMSans-Bold', os.path.join(_FONT_DIR, 'DMSans-Bold.ttf')))
    pdfmetrics.registerFont(TTFont('DMSerifDisplay', os.path.join(_FONT_DIR, 'DMSerifDisplay-Regular.ttf')))
    _fonts_registered = True


# ── Layout Constants ──────────────────────────────────────────────
# Logo
LOGO_WIDTH = 1.5 * inch
_LOGO_HEIGHT = None  # computed lazily

# Header positions (from top of page, in inches)
LOGO_TOP = 0.35 * inch

# Footer positions (from bottom of page, in inches)
FOOTER_LINE_Y = 0.75 * inch
FOOTER_TEXT_Y = 0.55 * inch

# Content frame
CONTENT_LEFT = 0.75 * inch
CONTENT_RIGHT = 0.75 * inch
CONTENT_TOP_MARGIN = 1.35 * inch   # below logo + rose bar + gap
CONTENT_BOTTOM_MARGIN = 0.85 * inch  # above footer


def _get_logo_height():
    global _LOGO_HEIGHT
    if _LOGO_HEIGHT is None:
        try:
            from PIL import Image as PILImage
            img = PILImage.open(_LOGO_PATH)
            aspect = img.height / img.width
            _LOGO_HEIGHT = LOGO_WIDTH * aspect
        except Exception:
            _LOGO_HEIGHT = 0.66 * inch  # fallback
    return _LOGO_HEIGHT


# ── Custom Flowables ──────────────────────────────────────────────

class AccentBar(Flowable):
    """A thin colored accent bar. Used for decorative rose lines under headings."""
    def __init__(self, width=2.0 * inch, height=2.0, color=None):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.color = color or TJB_ROSE

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)

    def wrap(self, aW, aH):
        return (self.width, self.height)


class SectionDivider(Flowable):
    """A thin lavender divider line between sections."""
    def __init__(self, width=7.0 * inch):
        Flowable.__init__(self)
        self.width = width
        self.height = 0.5

    def draw(self):
        self.canv.setStrokeColor(TJB_LAVENDER_LIGHT)
        self.canv.setLineWidth(0.5)
        self.canv.line(0, 0, self.width, 0)

    def wrap(self, aW, aH):
        return (self.width, self.height + 6)


# ── Paragraph Styles ──────────────────────────────────────────────

def _build_styles():
    return {
        'title': ParagraphStyle(
            'TJBTitle',
            fontName='DMSerifDisplay',
            fontSize=22,
            leading=28,
            textColor=TJB_CHARCOAL,
            spaceAfter=4,
            alignment=TA_LEFT,
        ),
        'subtitle': ParagraphStyle(
            'TJBSubtitle',
            fontName='DMSans',
            fontSize=10,
            leading=13,
            textColor=TJB_GRAY,
            spaceAfter=16,
            alignment=TA_LEFT,
        ),
        'section_heading': ParagraphStyle(
            'TJBSectionHeading',
            fontName='DMSerifDisplay',
            fontSize=14,
            leading=18,
            textColor=TJB_CHARCOAL,
            spaceBefore=22,
            spaceAfter=3,
            alignment=TA_LEFT,
        ),
        'body': ParagraphStyle(
            'TJBBody',
            fontName='DMSans',
            fontSize=10,
            leading=15,
            textColor=TJB_CHARCOAL,
            spaceAfter=5,
            alignment=TA_LEFT,
        ),
        'info_label': ParagraphStyle(
            'TJBInfoLabel',
            fontName='DMSans-Bold',
            fontSize=9,
            leading=12,
            textColor=TJB_GRAY,
            spaceAfter=1,
        ),
        'info_value': ParagraphStyle(
            'TJBInfoValue',
            fontName='DMSans',
            fontSize=10,
            leading=13,
            textColor=TJB_CHARCOAL,
            spaceAfter=6,
        ),
    }


# ── Header / Footer ────────────────────────────────────────────────

def _header_footer(canvas, doc):
    """Draw logo header and branded footer on each page.

    ReportLab origin is BOTTOM-LEFT. All Y coordinates are from bottom.
    Page height = 11 inches. To place something at N inches from TOP:
      y = height - N*inch
    """
    width, height = letter
    canvas.saveState()

    # ── Header: Logo top-left ──
    lh = _get_logo_height()
    # Logo bottom-left corner in ReportLab coords:
    #   x = left margin (0.75 inch)
    #   y = height - LOGO_TOP - lh  (so logo TOP is at LOGO_TOP from page top)
    logo_y = height - LOGO_TOP - lh
    canvas.drawImage(
        _LOGO_PATH,
        0.75 * inch,
        logo_y,
        width=LOGO_WIDTH,
        height=lh,
        mask='auto',
    )

    # Rose accent bar BELOW the logo (not overlapping)
    # Bar top = LOGO_TOP + lh + 0.06 inch gap (from page top)
    bar_top_from_top = LOGO_TOP + lh + 0.06 * inch
    bar_y = height - bar_top_from_top - 2  # 2px bar height
    canvas.setFillColor(TJB_ROSE)
    canvas.rect(0.75 * inch, bar_y, 1.2 * inch, 2, fill=1, stroke=0)

    # ── Footer ──
    canvas.setFont('DMSans', 8)
    canvas.setFillColor(TJB_GRAY)

    # Thin lavender footer line
    canvas.setStrokeColor(TJB_LAVENDER_LIGHT)
    canvas.setLineWidth(0.5)
    canvas.line(0.75 * inch, FOOTER_LINE_Y, width - 0.75 * inch, FOOTER_LINE_Y)

    # Left: brand name
    canvas.drawString(0.75 * inch, FOOTER_TEXT_Y, "True Joy Birthing")
    # Center: URL
    canvas.drawCentredString(width / 2, FOOTER_TEXT_Y, "truejoybirthing.com")
    # Right: page number
    page_num = canvas.getPageNumber()
    canvas.drawRightString(width - 0.75 * inch, FOOTER_TEXT_Y, f"Page {page_num}")

    canvas.restoreState()


# ── Public API ───────────────────────────────────────────────────

def create_branded_pdf_buffer(
    user_name: str,
    mom_profile: dict,
    sections: list,
    pdf_section_names: dict,
    pdf_field_labels: dict,
) -> BytesIO:
    """
    Build a TJB-branded birth plan PDF and return it as a BytesIO buffer.

    Args:
        user_name: Full name of the mom (e.g. "Shelbi Kohler")
        mom_profile: Dict with optional keys: due_date, planned_birth_setting, provider_name
        sections: List of section dicts with 'section_id' and 'data' keys
        pdf_section_names: Mapping of section_id -> display name
        pdf_field_labels: Mapping of field key -> human-readable label

    Returns:
        BytesIO positioned at 0, ready for StreamingResponse.
    """

    _register_fonts()
    styles = _build_styles()

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
        CONTENT_LEFT,
        CONTENT_BOTTOM_MARGIN,
        letter[0] - CONTENT_LEFT - CONTENT_RIGHT,
        letter[1] - CONTENT_TOP_MARGIN - CONTENT_BOTTOM_MARGIN,
        id='normal',
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    template = PageTemplate(id='tjb', frames=[frame], onPage=_header_footer)
    doc.addPageTemplates([template])

    elements = []

    # ── Title ──
    display_name = user_name or "My"
    if display_name and not display_name.endswith("'s"):
        title_text = f"{display_name}'s Birth Plan"
    else:
        title_text = f"{display_name} Birth Plan"
    elements.append(Paragraph(title_text, styles['title']))
    elements.append(Paragraph("Personalized birth preferences for a joyful delivery", styles['subtitle']))

    # Rose accent bar under title
    elements.append(AccentBar(width=1.8 * inch, height=2.5))
    elements.append(Spacer(1, 18))

    # ── Info Block ──
    info_data = []
    if mom_profile:
        if mom_profile.get("due_date"):
            info_data.append([
                Paragraph("Expected Due Date", styles['info_label']),
                Paragraph(str(mom_profile["due_date"]), styles['info_value']),
            ])
        if mom_profile.get("planned_birth_setting"):
            info_data.append([
                Paragraph("Planned Birth Setting", styles['info_label']),
                Paragraph(str(mom_profile["planned_birth_setting"]), styles['info_value']),
            ])
        if mom_profile.get("provider_name"):
            info_data.append([
                Paragraph("Provider", styles['info_label']),
                Paragraph(str(mom_profile["provider_name"]), styles['info_value']),
            ])

    if info_data:
        # Arrange in two columns of label/value pairs
        pairs = []
        for i in range(0, len(info_data), 2):
            left = info_data[i]
            right = info_data[i + 1] if i + 1 < len(info_data) else [
                Paragraph("", styles['info_label']),
                Paragraph("", styles['info_value']),
            ]
            pairs.append([
                left[0], left[1],
                right[0], right[1],
            ])

        info_table = Table(pairs, colWidths=[1.4 * inch, 2.0 * inch, 1.4 * inch, 1.7 * inch])
        info_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 20))

    # ── Sections ──
    for section in sections:
        section_id = section.get("section_id", "")
        section_name = pdf_section_names.get(
            section_id,
            section_id.replace("_", " ").title(),
        )
        data = section.get("data", {})

        if not data:
            continue

        elements.append(Paragraph(section_name, styles['section_heading']))
        elements.append(AccentBar(width=1.0 * inch, height=2.0))
        elements.append(Spacer(1, 8))

        for key, value in data.items():
            if not value:
                continue
            label = pdf_field_labels.get(
                key,
                key.replace("_", " ").title(),
            )

            if isinstance(value, list):
                value_str = ", ".join(str(v) for v in value)
            else:
                value_str = str(value)

            elements.append(Paragraph(f"<b>{label}:</b> {value_str}", styles['body']))

        elements.append(SectionDivider())

    doc.build(elements)
    buffer.seek(0)
    return buffer