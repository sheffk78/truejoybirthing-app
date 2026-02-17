# True Joy Birthing Doula Service Agreement Template
# This file contains the pre-populated contract template sections

DOULA_CONTRACT_TEMPLATE = {
    "title": "True Joy Birthing Doula Service Agreement",
    "provider": {
        "business_name": "True Joy Birthing",
        "legal_entity": "DBA of Sheffk Ventures LLC",
        "doula_name": "Shelbi Kohler"
    },
    "sections": [
        {
            "id": "introduction",
            "title": "Introduction & Scope",
            "content": """True Joy Birthing is a DBA of Sheffk Ventures LLC. Shelbi Kohler ("Doula") is hired by and accountable only to the client (and partner, if applicable). This is a private contract designed to protect rights, privacy, and sovereignty of all parties.

Doula support is provided according to the highest standards of confidentiality and respect for autonomy. No medical or clinical tasks will be performed; no medical advice will be given.""",
            "editable": True
        },
        {
            "id": "role_boundaries",
            "title": "Doula's Role & Boundaries",
            "content": """The Doula provides:
• Physical, emotional, and informational support during labor and birth, tailored to your preferences and needs
• Open, respectful communication with birth staff and support for informed decision-making
• Strict confidentiality for all shared information
• Non-judgmental support - your choices are respected; no opinions imposed or decisions made on your behalf
• Flexible, adaptive support, including prenatal and postpartum assistance""",
            "editable": True
        },
        {
            "id": "services_provided",
            "title": "Services Provided",
            "subsections": [
                {
                    "id": "initial_consultation",
                    "title": "Initial Consultation",
                    "content": "Free meeting to assess mutual fit; no obligation to proceed. Referrals may be provided if needed."
                },
                {
                    "id": "prenatal_visits",
                    "title": "Prenatal Visits",
                    "content": "Typically 3-4 meetings (more or fewer as needed) to establish preferences, birth plan, and team roles."
                },
                {
                    "id": "on_call_period",
                    "title": "On-Call Period (38-42 Weeks)",
                    "content": "Doula is available for calls, emails, and in-person support. Replies within 24 hours outside of on-call period; immediate response while on-call."
                },
                {
                    "id": "labor_attendance",
                    "title": "Labor Attendance",
                    "content": """• Client must contact doula as soon as labor is suspected
• Doula will join upon request; typical arrival within 1-2 hours
• Backup doula arranged if doula is unavailable due to attending another birth
• If labor exceeds 24 hours, backup may be called"""
                },
                {
                    "id": "after_birth",
                    "title": "After Birth",
                    "content": "Doula remains for 1-2 hours postpartum to assist with transition and comfort."
                },
                {
                    "id": "postpartum_support",
                    "title": "Postpartum Support",
                    "content": "One or two in-home visits within days after birth, covering breastfeeding, newborn care, resources, and birth processing."
                }
            ],
            "editable": True
        },
        {
            "id": "restrictions_exclusions",
            "title": "Restrictions & Exclusions",
            "content": """• No Medical Procedures: No blood pressure checks, fetal monitoring, or exams
• No Medical Decisions or Advocacy: Doula suggests options and supports communication but does not make decisions or speak on client's behalf to staff
• Not a Midwife or Doctor: In case of unplanned birth (home/en route), doula will call EMS and provide calming support only""",
            "editable": True
        },
        {
            "id": "privacy_communications",
            "title": "Privacy, Boundaries, & Communications",
            "content": """• Confidentiality: All discussions (written/verbal) are held strictly confidential, except where disclosure is required by law
• Communication Channels: Phone, email, and text kept open throughout the client's journey
• Liability: Doula is not liable for outcomes or events outside of her control""",
            "editable": True
        },
        {
            "id": "payment_terms",
            "title": "Payment Terms",
            "content": """• Retainer Fee (Down Payment): Due upon execution of agreement to reserve services and dates. Non-refundable after 37 weeks' gestation.
• Final Payment: Due the day after the birth or at postpartum visit, whichever comes first.""",
            "editable": True
        },
        {
            "id": "cancellations_refunds",
            "title": "Cancellations, Refunds, and Special Circumstances",
            "content": """• Cancellation (Up to & including 37 weeks): Only Retainer Fee is due, non-refundable.
• Late Cancellation (After 37 weeks): Full fee is due.
• Cesarean Birth (Excluding Doula Attendance): Full fee applies; two postpartum sessions still provided.

Doula Unavailability:
• If Shelbi is unreachable within two hours after notification at onset of labor and misses birth: Contract is void, and all payments are refunded.
• If rapid labor (<2 hours after call) prevents attendance: Four extra postpartum hours provided at no cost.
• Other absences: Reviewed case-by-case, may result in refund/waiver at doula's discretion.""",
            "editable": True
        },
        {
            "id": "acknowledgements",
            "title": "Acknowledgements",
            "content": """By signing below, both parties affirm understanding and acceptance of this agreement:
• This is a private contract; services are personal and non-medical
• Client has the right to privacy, informed decision-making, and support free from external intervention beyond what is consented to
• This agreement is entered into voluntarily and from a position of mutual benefit and respect""",
            "editable": False
        }
    ],
    "additional_terms_placeholder": "Enter any additional terms, special arrangements, or notes here..."
}

def get_contract_template():
    """Return the full contract template"""
    return DOULA_CONTRACT_TEMPLATE

def get_contract_html(contract_data: dict) -> str:
    """Generate HTML version of the contract for viewing/printing"""
    client_names = contract_data.get("client_names", "")
    due_date = contract_data.get("estimated_due_date", "")
    total_amount = contract_data.get("total_payment_amount", 0)
    retainer_fee = contract_data.get("retainer_fee", 0)
    remaining_amount = contract_data.get("remaining_payment_amount", 0)
    final_payment_due = contract_data.get("final_payment_due_date", "Day after birth")
    doula_name = contract_data.get("doula_name", "Shelbi Kohler")
    agreement_date = contract_data.get("agreement_date", "")
    sections = contract_data.get("sections", DOULA_CONTRACT_TEMPLATE["sections"])
    additional_terms = contract_data.get("additional_terms", "")
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333; }}
            h1 {{ text-align: center; color: #8B6F9C; font-size: 28px; margin-bottom: 10px; }}
            h2 {{ color: #8B6F9C; border-bottom: 2px solid #D4C5E0; padding-bottom: 5px; margin-top: 30px; }}
            h3 {{ color: #666; margin-top: 20px; }}
            .header {{ text-align: center; margin-bottom: 40px; }}
            .provider-info {{ font-size: 14px; color: #666; }}
            .details-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .details-table td {{ padding: 10px; border: 1px solid #ddd; }}
            .details-table td:first-child {{ font-weight: bold; background: #f9f6fb; width: 40%; }}
            .section {{ margin: 25px 0; }}
            .content {{ white-space: pre-line; }}
            .signature-section {{ margin-top: 50px; page-break-inside: avoid; }}
            .signature-box {{ display: inline-block; width: 45%; margin: 20px 2%; vertical-align: top; }}
            .signature-line {{ border-bottom: 1px solid #333; height: 40px; margin-bottom: 5px; }}
            .signature-label {{ font-size: 12px; color: #666; }}
            .additional-terms {{ background: #f9f6fb; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            ul {{ margin: 10px 0; padding-left: 20px; }}
            li {{ margin: 5px 0; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>True Joy Birthing</h1>
            <p class="provider-info">Doula Service Agreement</p>
            <p class="provider-info">DBA of Sheffk Ventures LLC</p>
        </div>
        
        <h2>Client & Payment Details</h2>
        <table class="details-table">
            <tr><td>Client Name(s)</td><td>{client_names}</td></tr>
            <tr><td>Estimated Due Date</td><td>{due_date}</td></tr>
            <tr><td>Total Payment Amount</td><td>${total_amount:,.2f}</td></tr>
            <tr><td>Retainer Fee (Down Payment)</td><td>${retainer_fee:,.2f}</td></tr>
            <tr><td>Remaining Payment Amount</td><td>${remaining_amount:,.2f}</td></tr>
            <tr><td>Final Payment Due Date</td><td>{final_payment_due}</td></tr>
            <tr><td>Doula Name</td><td>{doula_name}</td></tr>
            <tr><td>Date of Agreement</td><td>{agreement_date}</td></tr>
        </table>
    """
    
    for section in sections:
        html += f'<div class="section"><h2>{section["title"]}</h2>'
        
        if "subsections" in section:
            for subsection in section["subsections"]:
                html += f'<h3>{subsection["title"]}</h3>'
                html += f'<div class="content">{subsection.get("content", "")}</div>'
        else:
            content = section.get("custom_content", section.get("content", ""))
            html += f'<div class="content">{content}</div>'
        
        html += '</div>'
    
    if additional_terms:
        html += f'''
        <div class="additional-terms">
            <h2>Additional Terms & Special Arrangements</h2>
            <div class="content">{additional_terms}</div>
        </div>
        '''
    
    html += '''
        <div class="signature-section">
            <h2>Signatures</h2>
            <p>By signing below, both parties acknowledge that they have read, understood, and agree to the terms of this Doula Service Agreement.</p>
            
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Client Signature</div>
                <div class="signature-line" style="margin-top: 20px;"></div>
                <div class="signature-label">Client Name (Print)</div>
                <div class="signature-line" style="margin-top: 20px;"></div>
                <div class="signature-label">Date</div>
            </div>
            
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Doula Signature</div>
                <div class="signature-line" style="margin-top: 20px;"></div>
                <div class="signature-label">Doula Name (Print): Shelbi Kohler</div>
                <div class="signature-line" style="margin-top: 20px;"></div>
                <div class="signature-label">Date</div>
            </div>
        </div>
    </body>
    </html>
    '''
    
    return html
