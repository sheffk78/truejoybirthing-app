"""
Birth Summary Report Routes
Generates a comprehensive PDF combining Labor Records + Birth Record
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from models.user import User
from config.auth import check_role
from config.db import db

router = APIRouter()

# ============== CONSTANTS ==============

LABOR_STAGES = {
    "early": "Early Labor",
    "active": "Active Labor",
    "transition": "Transition",
    "pushing": "Pushing",
    "delivery": "Delivery",
}

MODE_OF_BIRTH = {
    "spontaneous_vaginal": "Spontaneous Vaginal",
    "assisted_vaginal": "Assisted Vaginal",
    "cesarean": "Cesarean Section",
    "vbac": "VBAC",
}

PLACE_OF_BIRTH = {
    "home": "Home",
    "birth_center": "Birth Center",
    "hospital": "Hospital",
}

NEWBORN_CONDITION = {
    "vigorous": "Vigorous at Birth",
    "needed_assistance": "Needed Some Assistance",
    "required_resuscitation": "Required Resuscitation",
}

REPAIRS = {
    "none": "None",
    "first_degree": "1st Degree Tear",
    "second_degree": "2nd Degree Tear",
    "third_degree": "3rd Degree Tear",
    "fourth_degree": "4th Degree Tear",
    "other": "Other",
}

MATERNAL_STATUS = {
    "stable": "Stable",
    "monitored": "Monitored",
    "transferred": "Transferred",
    "complications": "Complications",
}

BABY_STATUS = {
    "skin_to_skin": "Skin-to-Skin",
    "breastfeeding_initiated": "Breastfeeding Initiated",
    "transferred": "Transferred",
    "nicu": "NICU",
}

# ============== HELPER FUNCTIONS ==============

def format_datetime(dt_str: str) -> str:
    """Format a datetime string for display"""
    if not dt_str:
        return ""
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return dt.strftime("%B %d, %Y at %I:%M %p")
    except:
        return dt_str

def format_time_only(dt_str: str) -> str:
    """Format just the time from a datetime string"""
    if not dt_str:
        return ""
    try:
        dt = datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        return dt.strftime("%I:%M %p")
    except:
        return dt_str

def get_label(lookup: dict, value: str) -> str:
    """Get a human-readable label from a lookup dict"""
    return lookup.get(value, value.replace("_", " ").title()) if value else ""

# ============== PDF GENERATION ==============

def generate_birth_summary_pdf(
    client_name: str,
    provider_name: str,
    labor_records: list,
    birth_record: dict
) -> bytes:
    """Generate a comprehensive birth summary PDF"""
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter, 
        topMargin=0.75*inch, 
        bottomMargin=0.75*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch
    )
    
    # Define styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'Title', 
        parent=styles['Title'], 
        fontSize=26, 
        textColor=colors.HexColor('#9F83B6'), 
        spaceAfter=6,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle', 
        parent=styles['Normal'], 
        fontSize=12, 
        textColor=colors.HexColor('#666666'), 
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    section_style = ParagraphStyle(
        'Section', 
        parent=styles['Heading1'], 
        fontSize=16, 
        textColor=colors.HexColor('#9F83B6'), 
        spaceBefore=25, 
        spaceAfter=12,
        borderPadding=5
    )
    
    subsection_style = ParagraphStyle(
        'Subsection', 
        parent=styles['Heading2'], 
        fontSize=12, 
        textColor=colors.HexColor('#4a4a4a'), 
        spaceBefore=15, 
        spaceAfter=8
    )
    
    body_style = ParagraphStyle(
        'Body', 
        parent=styles['Normal'], 
        fontSize=10, 
        leading=14, 
        spaceAfter=4
    )
    
    label_style = ParagraphStyle(
        'Label', 
        parent=styles['Normal'], 
        fontSize=9, 
        textColor=colors.HexColor('#888888'),
        spaceAfter=2
    )
    
    value_style = ParagraphStyle(
        'Value', 
        parent=styles['Normal'], 
        fontSize=11, 
        fontName='Helvetica-Bold',
        spaceAfter=8
    )
    
    timeline_time_style = ParagraphStyle(
        'TimelineTime', 
        parent=styles['Normal'], 
        fontSize=10, 
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#9F83B6')
    )
    
    timeline_content_style = ParagraphStyle(
        'TimelineContent', 
        parent=styles['Normal'], 
        fontSize=10, 
        leading=13,
        spaceAfter=4
    )
    
    notes_style = ParagraphStyle(
        'Notes', 
        parent=styles['Normal'], 
        fontSize=10, 
        leading=14,
        fontStyle='italic',
        textColor=colors.HexColor('#555555'),
        leftIndent=10,
        spaceAfter=6
    )
    
    elements = []
    
    # ========== TITLE PAGE ==========
    elements.append(Spacer(1, 50))
    elements.append(Paragraph("Birth Summary", title_style))
    elements.append(Paragraph(f"for {client_name}", subtitle_style))
    
    # Birth date if available
    if birth_record and birth_record.get("birth_datetime"):
        birth_dt = format_datetime(birth_record["birth_datetime"])
        elements.append(Paragraph(f"Born: {birth_dt}", subtitle_style))
    
    elements.append(Spacer(1, 20))
    
    # Baby info header if available
    if birth_record and birth_record.get("baby_name"):
        baby_name = birth_record.get("baby_name", "")
        baby_sex = get_label({"male": "Boy", "female": "Girl", "intersex": ""}, birth_record.get("baby_sex", ""))
        elements.append(Paragraph(f"Welcome, {baby_name}!", ParagraphStyle(
            'BabyName',
            parent=styles['Title'],
            fontSize=20,
            textColor=colors.HexColor('#5a8f5a'),
            alignment=TA_CENTER,
            spaceAfter=10
        )))
        
        if baby_sex:
            elements.append(Paragraph(f"({baby_sex})", subtitle_style))
    
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="80%", thickness=1, color=colors.HexColor('#e0e0e0'), spaceBefore=10, spaceAfter=10))
    elements.append(Paragraph(f"Midwife: {provider_name}", subtitle_style))
    
    # ========== BIRTH RECORD SECTION ==========
    if birth_record and any(birth_record.get(k) for k in ["birth_datetime", "mode_of_birth", "place_of_birth", "baby_name"]):
        elements.append(Paragraph("Birth Details", section_style))
        
        # Timeline
        if any(birth_record.get(k) for k in ["full_dilation_datetime", "pushing_start_datetime", "birth_datetime"]):
            elements.append(Paragraph("Timeline", subsection_style))
            
            timeline_data = []
            if birth_record.get("full_dilation_datetime"):
                timeline_data.append(["Full Dilation:", format_datetime(birth_record["full_dilation_datetime"])])
            if birth_record.get("pushing_start_datetime"):
                timeline_data.append(["Pushing Started:", format_datetime(birth_record["pushing_start_datetime"])])
            if birth_record.get("birth_datetime"):
                timeline_data.append(["Time of Birth:", format_datetime(birth_record["birth_datetime"])])
            
            if timeline_data:
                timeline_table = Table(timeline_data, colWidths=[1.5*inch, 4*inch])
                timeline_table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ]))
                elements.append(timeline_table)
        
        # Birth Info
        if birth_record.get("mode_of_birth") or birth_record.get("place_of_birth"):
            elements.append(Paragraph("Delivery", subsection_style))
            if birth_record.get("mode_of_birth"):
                elements.append(Paragraph(f"<b>Mode of Birth:</b> {get_label(MODE_OF_BIRTH, birth_record['mode_of_birth'])}", body_style))
            if birth_record.get("place_of_birth"):
                elements.append(Paragraph(f"<b>Place of Birth:</b> {get_label(PLACE_OF_BIRTH, birth_record['place_of_birth'])}", body_style))
        
        # Newborn
        if any(birth_record.get(k) for k in ["baby_name", "baby_sex", "baby_weight_lbs", "baby_length_inches", "apgar_1min"]):
            elements.append(Paragraph("Newborn", subsection_style))
            
            if birth_record.get("baby_sex"):
                elements.append(Paragraph(f"<b>Sex:</b> {get_label({'male': 'Male', 'female': 'Female', 'intersex': 'Intersex'}, birth_record['baby_sex'])}", body_style))
            
            if birth_record.get("baby_weight_lbs") or birth_record.get("baby_weight_oz"):
                lbs = birth_record.get("baby_weight_lbs", 0)
                oz = birth_record.get("baby_weight_oz", 0)
                elements.append(Paragraph(f"<b>Weight:</b> {lbs} lbs {oz} oz", body_style))
            
            if birth_record.get("baby_length_inches"):
                elements.append(Paragraph(f"<b>Length:</b> {birth_record['baby_length_inches']} inches", body_style))
            
            if birth_record.get("newborn_condition"):
                elements.append(Paragraph(f"<b>Condition:</b> {get_label(NEWBORN_CONDITION, birth_record['newborn_condition'])}", body_style))
            
            if birth_record.get("newborn_condition_notes"):
                elements.append(Paragraph(f"<i>{birth_record['newborn_condition_notes']}</i>", notes_style))
            
            if birth_record.get("apgar_1min") is not None or birth_record.get("apgar_5min") is not None:
                apgar_text = []
                if birth_record.get("apgar_1min") is not None:
                    apgar_text.append(f"1 min: {birth_record['apgar_1min']}")
                if birth_record.get("apgar_5min") is not None:
                    apgar_text.append(f"5 min: {birth_record['apgar_5min']}")
                elements.append(Paragraph(f"<b>APGAR Scores:</b> {', '.join(apgar_text)}", body_style))
        
        # Maternal Outcomes
        if any(birth_record.get(k) for k in ["estimated_blood_loss_ml", "repairs_performed"]):
            elements.append(Paragraph("Maternal Outcomes", subsection_style))
            
            if birth_record.get("estimated_blood_loss_ml"):
                elements.append(Paragraph(f"<b>Estimated Blood Loss:</b> {birth_record['estimated_blood_loss_ml']} ml", body_style))
            
            if birth_record.get("repairs_performed"):
                elements.append(Paragraph(f"<b>Repairs:</b> {get_label(REPAIRS, birth_record['repairs_performed'])}", body_style))
            
            if birth_record.get("repairs_notes"):
                elements.append(Paragraph(f"<i>{birth_record['repairs_notes']}</i>", notes_style))
        
        # Postpartum
        if any(birth_record.get(k) for k in ["maternal_status", "baby_status"]):
            elements.append(Paragraph("Immediate Postpartum", subsection_style))
            
            if birth_record.get("maternal_status"):
                elements.append(Paragraph(f"<b>Maternal Status:</b> {get_label(MATERNAL_STATUS, birth_record['maternal_status'])}", body_style))
                if birth_record.get("maternal_status_notes"):
                    elements.append(Paragraph(f"<i>{birth_record['maternal_status_notes']}</i>", notes_style))
            
            if birth_record.get("baby_status"):
                elements.append(Paragraph(f"<b>Baby Status:</b> {get_label(BABY_STATUS, birth_record['baby_status'])}", body_style))
                if birth_record.get("baby_status_notes"):
                    elements.append(Paragraph(f"<i>{birth_record['baby_status_notes']}</i>", notes_style))
        
        # Transfer
        if birth_record.get("transfer_occurred"):
            elements.append(Paragraph("Transfer of Care", subsection_style))
            
            transfer_who = birth_record.get("transfer_who", "")
            if transfer_who:
                elements.append(Paragraph(f"<b>Who:</b> {transfer_who.title()}", body_style))
            
            if birth_record.get("transfer_destination"):
                elements.append(Paragraph(f"<b>Destination:</b> {birth_record['transfer_destination']}", body_style))
            
            if birth_record.get("transfer_reason"):
                elements.append(Paragraph(f"<b>Reason:</b> {birth_record['transfer_reason']}", body_style))
    
    # ========== LABOR TIMELINE SECTION ==========
    if labor_records:
        elements.append(Paragraph("Labor Timeline", section_style))
        elements.append(Paragraph(
            f"The following is a chronological record of labor progress ({len(labor_records)} entries):",
            body_style
        ))
        elements.append(Spacer(1, 10))
        
        # Sort by entry_datetime
        sorted_records = sorted(labor_records, key=lambda x: x.get("entry_datetime", ""))
        
        for i, record in enumerate(sorted_records):
            # Time header
            entry_time = format_datetime(record.get("entry_datetime", ""))
            stage = get_label(LABOR_STAGES, record.get("labor_stage", ""))
            
            header_text = f"{entry_time}"
            if stage:
                header_text += f" - {stage}"
            
            elements.append(Paragraph(header_text, timeline_time_style))
            
            # Build content
            content_parts = []
            
            # Cervical exam
            cervical = []
            if record.get("dilation_cm") is not None:
                cervical.append(f"Dilation: {record['dilation_cm']}cm")
            if record.get("effacement_percent") is not None:
                cervical.append(f"Effacement: {record['effacement_percent']}%")
            if record.get("station"):
                cervical.append(f"Station: {record['station']}")
            if cervical:
                content_parts.append("Cervical Exam: " + ", ".join(cervical))
            
            # Contractions
            contractions = []
            if record.get("contractions_per_10min"):
                contractions.append(f"{record['contractions_per_10min']}/10min")
            if record.get("contraction_duration_sec"):
                contractions.append(f"{record['contraction_duration_sec']}s duration")
            if record.get("contraction_strength"):
                contractions.append(record['contraction_strength'])
            if contractions:
                content_parts.append("Contractions: " + ", ".join(contractions))
            
            # Fetal heart rate
            if record.get("fetal_heart_rate"):
                fhr_text = f"FHR: {record['fetal_heart_rate']} bpm"
                if record.get("fhr_variability"):
                    fhr_text += f" ({record['fhr_variability']} variability)"
                content_parts.append(fhr_text)
            
            # Maternal vitals
            vitals = []
            if record.get("maternal_bp"):
                vitals.append(f"BP {record['maternal_bp']}")
            if record.get("maternal_pulse"):
                vitals.append(f"Pulse {record['maternal_pulse']}")
            if record.get("maternal_temp"):
                vitals.append(f"Temp {record['maternal_temp']}")
            if vitals:
                content_parts.append("Vitals: " + ", ".join(vitals))
            
            # Notes
            if record.get("general_notes"):
                content_parts.append(f"Notes: {record['general_notes']}")
            
            if content_parts:
                for part in content_parts:
                    elements.append(Paragraph(f"• {part}", timeline_content_style))
            else:
                elements.append(Paragraph("• Entry recorded", timeline_content_style))
            
            elements.append(Spacer(1, 8))
            
            # Add separator between entries (except last)
            if i < len(sorted_records) - 1:
                elements.append(HRFlowable(width="60%", thickness=0.5, color=colors.HexColor('#e0e0e0'), spaceBefore=5, spaceAfter=10))
    
    # ========== BIRTH STORY ==========
    if birth_record and birth_record.get("birth_story_notes"):
        elements.append(Paragraph("Birth Story", section_style))
        elements.append(Paragraph(birth_record["birth_story_notes"], body_style))
    
    # ========== FOOTER ==========
    elements.append(Spacer(1, 40))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#9F83B6'), spaceBefore=20, spaceAfter=10))
    elements.append(Paragraph(
        f"Generated on {datetime.now().strftime('%B %d, %Y')} via True Joy Birthing",
        ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#999999'), alignment=TA_CENTER)
    ))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return buffer.getvalue()


# ============== API ROUTES ==============

@router.get("/midwife/clients/{client_id}/birth-summary/pdf")
async def generate_birth_summary_report(client_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """
    Generate a comprehensive Birth Summary PDF combining Labor Records and Birth Record
    
    This creates a printable timeline document that families can keep as a memento
    of their birth experience.
    """
    
    # Verify client belongs to this midwife
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get midwife profile for name
    midwife_profile = await db.midwife_profiles.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    midwife_user = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    provider_name = midwife_profile.get("practice_name") if midwife_profile else None
    if not provider_name:
        provider_name = midwife_user.get("full_name", "Midwife") if midwife_user else "Midwife"
    
    # Get client name
    client_name = client.get("name", "Client")
    
    # Get labor records
    labor_records = await db.labor_records.find(
        {"client_id": client_id},
        {"_id": 0}
    ).to_list(length=100)
    
    # Get birth record
    birth_record = await db.birth_records.find_one(
        {"client_id": client_id},
        {"_id": 0}
    )
    
    # Check if there's any data
    if not labor_records and not birth_record:
        raise HTTPException(
            status_code=404, 
            detail="No labor or birth records found for this client. Please add records before generating a summary."
        )
    
    # Generate PDF
    pdf_bytes = generate_birth_summary_pdf(
        client_name=client_name,
        provider_name=provider_name,
        labor_records=labor_records or [],
        birth_record=birth_record or {}
    )
    
    # Create filename
    safe_name = client_name.replace(" ", "_").replace("/", "_")
    baby_name = birth_record.get("baby_name", "") if birth_record else ""
    if baby_name:
        filename = f"Birth_Summary_{baby_name.replace(' ', '_')}.pdf"
    else:
        filename = f"Birth_Summary_{safe_name}.pdf"
    
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/midwife/clients/{client_id}/birth-summary/preview")
async def preview_birth_summary(client_id: str, user: User = Depends(check_role(["MIDWIFE"]))):
    """
    Get a preview of what data will be included in the birth summary PDF
    """
    
    # Verify client belongs to this midwife
    client = await db.clients.find_one(
        {"client_id": client_id, "provider_id": user.user_id},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get labor records count
    labor_count = await db.labor_records.count_documents({"client_id": client_id})
    
    # Get birth record
    birth_record = await db.birth_records.find_one(
        {"client_id": client_id},
        {"_id": 0}
    )
    
    return {
        "client_name": client.get("name", "Client"),
        "labor_records_count": labor_count,
        "has_birth_record": birth_record is not None,
        "baby_name": birth_record.get("baby_name") if birth_record else None,
        "birth_datetime": birth_record.get("birth_datetime") if birth_record else None,
        "can_generate": labor_count > 0 or birth_record is not None
    }
