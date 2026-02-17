# Midwifery Services Agreement Template
# New customizable contract with dynamic field merging

MIDWIFE_CONTRACT_AGREEMENT_TEXT = """Midwifery Services Agreement

This Midwifery Services Agreement ("Agreement") is made between {midwife_practice_name} ("Midwife/Practice") and {client_name} ("Client") as of {agreement_date}. The Client is planning care with the Midwife for pregnancy, birth, and the early postpartum period. The Partner or primary support person, if applicable, is {partner_name}.

True Joy Birthing and any related platforms or services that make this Agreement template available are not parties to this Agreement and are not providing legal, medical, or professional advice by doing so. This Agreement is entered into solely between the Client and the Midwife/Practice, who each accept full responsibility for understanding, customizing, and enforcing its terms. True Joy Birthing has no obligation to mediate, enforce, or resolve any dispute arising from this Agreement, and neither the Client nor the Midwife/Practice may hold True Joy Birthing liable for any claims, losses, or disagreements related to the use of this template or to their midwife-client relationship.

The Midwife agrees to provide midwifery care within the Midwife's professional scope of practice and in accordance with applicable state laws and regulations. {scope_description}

The Client agrees to participate actively in care. This includes providing complete and accurate health history; updating the Midwife about changes in health, medications, or significant events; attending scheduled visits or notifying the Midwife promptly to reschedule; and considering recommended labs, ultrasounds, or consultations. If the Client chooses to decline a recommended test or referral, the Client understands that the Midwife will document this informed refusal and that declining recommended evaluation may increase risk to the Client or baby. Honest communication about symptoms, concerns, and changes in how the Client feels is essential for safe midwifery care.

The planned place of birth for this pregnancy is {planned_birth_location}. The Client understands that, although the plan may be for an out-of-hospital birth, situations can arise in which transfer to a hospital or physician is recommended for the safety of the Client or baby. {transfer_indications_description} The Client understands that choosing to refuse recommended transfer increases risk, and that if the Client declines transfer after counseling, the Midwife may document this decision and may withdraw from care in accordance with law and professional standards. {client_refusal_of_transfer_note}

The Midwife or an appropriate back-up midwife will be on call for labor support between approximately {on_call_window_description} (for example, 37-42 weeks), except in cases of illness, emergency, or previously disclosed absence. The Client understands that labor timing cannot be controlled or guaranteed and that a designated back-up midwife or assistant may attend the birth if the primary Midwife is unavailable or requires assistance. {backup_midwife_policy}

The total fee for midwifery services for this pregnancy is ${total_fee}. {fee_coverage_description} A retainer or initial payment of ${retainer_amount} is due at the time of signing, with the remaining balance of ${remaining_balance} due by {remaining_balance_due_description}, unless a different written payment schedule is agreed upon. The Client understands that insurance or health-sharing reimbursement is not guaranteed and that, regardless of reimbursement, the Client remains responsible for payment of fees as outlined in this Agreement.

If either party wishes to end this care relationship, they may do so in writing. The Client may transfer to another provider at any time, and the Midwife may discontinue care if the Client's condition falls outside the Midwife's safe scope of practice, if there is persistent non-payment, repeated missed appointments, or another significant breach of this Agreement. {midwife_withdrawal_reasons} {refund_policy_description} {no_refund_scenarios_description}

The Client understands that pregnancy and childbirth carry inherent risks, including rare but real possibilities of serious injury or death to mother or baby, regardless of the care provider or place of birth. The Midwife will discuss the benefits, risks, and alternatives of midwifery care, out-of-hospital birth if applicable, and hospital care, and will provide opportunities for questions and clarification throughout care. The Client acknowledges that no outcome can be guaranteed, that informed choice is ongoing, and that the Client has the right to accept or decline suggested interventions after receiving information about them.

The Client understands that the Midwife is functioning as a midwife and not as an obstetrician, hospital, or emergency department. The Midwife does not provide epidurals, cesarean sections, or other interventions that require hospital facilities or physician privileges, and does not manage high-risk conditions that fall outside the midwifery scope defined by law or by the Midwife's training and policies. The Client is encouraged to establish or maintain a relationship with a physician or hospital willing to provide back-up or emergency care if needed.

The Midwife will maintain the Client's records confidentially and in accordance with applicable privacy and record-keeping laws. Information will not be released without the Client's written consent, except when required by law, such as mandatory reporting or public health requirements. The Client may request access to their records consistent with practice policy and legal standards.

{contact_instructions_routine} {contact_instructions_urgent} {emergency_instructions} The Client agrees to follow these guidelines to the best of their ability and understands that delaying care in an emergency can significantly increase risk. The Client acknowledges that some risks associated with pregnancy and birth are outside the control of the Midwife and agrees that the Midwife cannot be held responsible for outcomes that could not reasonably be prevented within the scope of midwifery practice.

Nothing in this Agreement is intended to waive legal rights where such waiver is not permitted by law, and both parties are encouraged to seek independent legal advice if they have questions about the legal effect of this Agreement.

Any additional terms, boundaries, or special arrangements that either party wishes to include: {special_arrangements}

By signing below, the Midwife and Client affirm that they have read this Agreement, had the opportunity to ask questions, and understand and accept its terms. They further affirm that they enter into this contract voluntarily, with the intention of mutual respect and benefit, and that they understand it is a private agreement between them that does not create any duty or liability for True Joy Birthing."""

# Default values for contract fields
DEFAULT_MIDWIFE_CONTRACT_FIELDS = {
    "partner_name": "N/A",
    "scope_description": "Care generally includes routine prenatal visits at intervals recommended by the Midwife, availability for consultation by phone or secure message for non-emergent concerns, on-call availability around the estimated time of birth, attendance at labor and birth in the planned setting when appropriate, and postpartum follow-up visits for both the Client and baby for approximately six to eight weeks after birth, as outlined in the Midwife's practice policies. The Midwife does not provide services outside this scope, such as surgery, hospital-only procedures, or long-term pediatric care, and may recommend consultation, transfer, or referral when medical needs go beyond community midwifery practice.",
    "transfer_indications_description": "The Midwife will recommend transfer if, in the Midwife's clinical judgment, complications develop that cannot be safely managed in the planned setting, such as non-reassuring fetal status, concerning bleeding, signs of infection, or certain blood pressure or labor patterns.",
    "client_refusal_of_transfer_note": "",
    "on_call_window_description": "37 to 42 weeks of pregnancy",
    "backup_midwife_policy": "The Midwife will make reasonable efforts to introduce any regular back-up midwives or students in advance when possible.",
    "fee_coverage_description": "This fee typically covers prenatal care within the practice, attendance at labor and birth in the planned setting, and routine postpartum and newborn care through about six to eight weeks postpartum, but does not include charges from hospitals, laboratories, imaging centers, pharmacies, or other specialists unless explicitly stated in writing.",
    "remaining_balance_due_description": "36 weeks' gestation",
    "refund_policy_description": "When care ends before the birth, the Midwife may, at their discretion, provide a partial refund after subtracting the value of services already rendered and any non-refundable retainer.",
    "midwife_withdrawal_reasons": "",
    "no_refund_scenarios_description": "No refund is due when the Client refuses recommended transfer and the Midwife must withdraw, or when the Client chooses to give birth in another setting for personal reasons after the Midwife has provided extensive prenatal care.",
    "contact_instructions_routine": "The Midwife will provide clear instructions regarding how to reach the Midwife for routine questions.",
    "contact_instructions_urgent": "The Midwife will provide instructions on how to contact the Midwife urgently for concerning symptoms.",
    "emergency_instructions": "The Client understands when to bypass the Midwife and call emergency services or go directly to the hospital.",
    "special_arrangements": "None at this time"
}


def get_midwife_contract_template():
    """Return midwife contract template info with default fields"""
    return {
        "title": "Midwifery Services Agreement",
        "agreement_text_template": MIDWIFE_CONTRACT_AGREEMENT_TEXT,
        "default_fields": DEFAULT_MIDWIFE_CONTRACT_FIELDS,
        "field_sections": [
            {
                "id": "parties_basics",
                "title": "Parties & Basic Details",
                "fields": [
                    {"id": "midwife_practice_name", "label": "Midwife/Practice Name", "type": "text", "required": True, "placeholder": "Your practice or full name", "prefill_from_profile": True},
                    {"id": "client_name", "label": "Client Name(s)", "type": "text", "required": True, "placeholder": "Full name(s) of the client"},
                    {"id": "partner_name", "label": "Partner/Support Person (optional)", "type": "text", "placeholder": "Name of partner or support person"},
                    {"id": "agreement_date", "label": "Agreement Date", "type": "date", "required": True},
                    {"id": "estimated_due_date", "label": "Estimated Due Date", "type": "date", "required": True}
                ]
            },
            {
                "id": "birth_scope",
                "title": "Place of Birth & Scope",
                "fields": [
                    {"id": "planned_birth_location", "label": "Planned Place of Birth", "type": "text", "required": True, "placeholder": "e.g., home at [address], ABC Birth Center, XYZ Hospital"},
                    {"id": "scope_description", "label": "Included Services Description", "type": "textarea", "placeholder": "Description of midwifery services included"}
                ]
            },
            {
                "id": "fees_payment",
                "title": "Fees & Payment",
                "fields": [
                    {"id": "total_fee", "label": "Total Fee ($)", "type": "currency", "required": True, "placeholder": "0.00"},
                    {"id": "retainer_amount", "label": "Retainer Amount ($)", "type": "currency", "required": True, "placeholder": "0.00"},
                    {"id": "remaining_balance", "label": "Remaining Balance ($)", "type": "currency", "auto_calculate": "total_fee - retainer_amount"},
                    {"id": "remaining_balance_due_description", "label": "Remaining Balance Due By", "type": "text", "placeholder": "e.g., 36 weeks' gestation"},
                    {"id": "fee_coverage_description", "label": "Fee Coverage Description", "type": "textarea", "placeholder": "What the fee includes"},
                    {"id": "refund_policy_description", "label": "Refund Policy", "type": "textarea", "placeholder": "Terms for refunds if care ends early"}
                ]
            },
            {
                "id": "transfer_withdrawal",
                "title": "Transfer & Withdrawal",
                "fields": [
                    {"id": "transfer_indications_description", "label": "Transfer Indications", "type": "textarea", "placeholder": "When transfer to hospital/physician is recommended"},
                    {"id": "client_refusal_of_transfer_note", "label": "Client Refusal of Transfer Note (optional)", "type": "textarea", "placeholder": "Additional language regarding client refusal of transfer"},
                    {"id": "midwife_withdrawal_reasons", "label": "Midwife Withdrawal Reasons", "type": "textarea", "placeholder": "Reasons midwife may discontinue care"},
                    {"id": "no_refund_scenarios_description", "label": "No-Refund Scenarios", "type": "textarea", "placeholder": "Situations where no refund is applicable"}
                ]
            },
            {
                "id": "oncall_backup",
                "title": "On-Call & Backup",
                "fields": [
                    {"id": "on_call_window_description", "label": "On-Call Window", "type": "text", "placeholder": "e.g., 37 to 42 weeks of pregnancy"},
                    {"id": "backup_midwife_policy", "label": "Backup Midwife Policy", "type": "textarea", "placeholder": "Details on backup coverage and student involvement"}
                ]
            },
            {
                "id": "communication_emergencies",
                "title": "Communication & Emergencies",
                "fields": [
                    {"id": "contact_instructions_routine", "label": "Routine Contact Instructions", "type": "textarea", "placeholder": "How to reach midwife for routine questions"},
                    {"id": "contact_instructions_urgent", "label": "Urgent Contact Instructions", "type": "textarea", "placeholder": "How to contact for concerning symptoms"},
                    {"id": "emergency_instructions", "label": "Emergency Instructions", "type": "textarea", "placeholder": "When to call 911 or go directly to hospital"}
                ]
            },
            {
                "id": "special_arrangements",
                "title": "Special Arrangements",
                "fields": [
                    {"id": "special_arrangements", "label": "Special Arrangements / Addendum", "type": "textarea", "placeholder": "Any additional services, travel radius, student involvement, etc."}
                ]
            }
        ]
    }


def generate_midwife_contract_text(contract_data: dict) -> str:
    """Generate the full midwife contract text with merged fields"""
    # Start with defaults
    merged_data = DEFAULT_MIDWIFE_CONTRACT_FIELDS.copy()
    
    # Overlay contract-specific data
    for key, value in contract_data.items():
        if value is not None and value != "":
            merged_data[key] = value
    
    # Format currency values
    if "total_fee" in merged_data:
        merged_data["total_fee"] = f"{float(merged_data['total_fee']):,.2f}"
    if "retainer_amount" in merged_data:
        merged_data["retainer_amount"] = f"{float(merged_data['retainer_amount']):,.2f}"
    if "remaining_balance" in merged_data:
        merged_data["remaining_balance"] = f"{float(merged_data['remaining_balance']):,.2f}"
    
    # Generate the contract text
    try:
        contract_text = MIDWIFE_CONTRACT_AGREEMENT_TEXT.format(**merged_data)
    except KeyError as e:
        # If a field is missing, use a placeholder
        contract_text = MIDWIFE_CONTRACT_AGREEMENT_TEXT
        for key in merged_data:
            contract_text = contract_text.replace(f"{{{key}}}", str(merged_data.get(key, f"[{key}]")))
    
    return contract_text


def get_midwife_contract_html(contract_data: dict) -> str:
    """Generate HTML version of the midwife contract for viewing/printing"""
    contract_text = generate_midwife_contract_text(contract_data)
    
    # Split into paragraphs
    paragraphs = contract_text.split('\n\n')
    
    client_name = contract_data.get("client_name", "")
    midwife_name = contract_data.get("midwife_practice_name", "")
    partner_name = contract_data.get("partner_name", "")
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ 
                font-family: 'Georgia', serif; 
                max-width: 800px; 
                margin: 0 auto; 
                padding: 40px; 
                line-height: 1.8; 
                color: #333; 
                font-size: 14px;
            }}
            h1 {{ 
                text-align: center; 
                color: #8B6F9C; 
                font-size: 28px; 
                margin-bottom: 30px; 
            }}
            .header {{ 
                text-align: center; 
                margin-bottom: 40px; 
                border-bottom: 2px solid #D4C5E0;
                padding-bottom: 20px;
            }}
            .provider-info {{ 
                font-size: 12px; 
                color: #666; 
            }}
            p {{ 
                margin: 15px 0; 
                text-align: justify;
            }}
            .signature-section {{ 
                margin-top: 50px; 
                page-break-inside: avoid; 
            }}
            .signature-box {{ 
                display: inline-block; 
                width: 30%; 
                margin: 20px 1%; 
                vertical-align: top; 
            }}
            .signature-line {{ 
                border-bottom: 1px solid #333; 
                height: 40px; 
                margin-bottom: 5px; 
            }}
            .signature-label {{ 
                font-size: 12px; 
                color: #666; 
            }}
            .signed-info {{
                background: #f0f9f0;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
            }}
            .signed-name {{
                font-weight: bold;
                color: #2e7d32;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Midwifery Services Agreement</h1>
            <p class="provider-info">Powered by True Joy Birthing</p>
        </div>
    """
    
    for para in paragraphs:
        if para.strip():
            html += f"<p>{para.strip()}</p>\n"
    
    # Signature section
    html += """
        <div class="signature-section">
            <h2 style="color: #8B6F9C; border-bottom: 1px solid #D4C5E0; padding-bottom: 10px;">Signatures</h2>
    """
    
    midwife_sig = contract_data.get("midwife_signature")
    client_sig = contract_data.get("client_signature")
    partner_sig = contract_data.get("partner_signature")
    
    # Midwife signature
    html += '<div class="signature-box">'
    if midwife_sig:
        html += f'''
            <div class="signed-info">
                <div class="signed-name">Signed by: {midwife_sig.get("signer_name", "")}</div>
                <div>Date: {midwife_sig.get("signed_at", "")[:10] if midwife_sig.get("signed_at") else ""}</div>
            </div>
        '''
    else:
        html += f'''
            <div class="signature-line"></div>
            <div class="signature-label">Midwife/Practice: {midwife_name}</div>
            <div class="signature-line" style="margin-top: 20px;"></div>
            <div class="signature-label">Date</div>
        '''
    html += '</div>'
    
    # Client signature
    html += '<div class="signature-box">'
    if client_sig:
        html += f'''
            <div class="signed-info">
                <div class="signed-name">Signed by: {client_sig.get("signer_name", "")}</div>
                <div>Date: {client_sig.get("signed_at", "")[:10] if client_sig.get("signed_at") else ""}</div>
            </div>
        '''
    else:
        html += '''
            <div class="signature-line"></div>
            <div class="signature-label">Client Signature</div>
            <div class="signature-line" style="margin-top: 20px;"></div>
            <div class="signature-label">Date</div>
        '''
    html += '</div>'
    
    # Partner signature (optional)
    if partner_name and partner_name != "N/A":
        html += '<div class="signature-box">'
        if partner_sig:
            html += f'''
                <div class="signed-info">
                    <div class="signed-name">Signed by: {partner_sig.get("signer_name", "")}</div>
                    <div>Date: {partner_sig.get("signed_at", "")[:10] if partner_sig.get("signed_at") else ""}</div>
                </div>
            '''
        else:
            html += f'''
                <div class="signature-line"></div>
                <div class="signature-label">Partner: {partner_name}</div>
                <div class="signature-line" style="margin-top: 20px;"></div>
                <div class="signature-label">Date</div>
            '''
        html += '</div>'
    
    html += """
        </div>
    </body>
    </html>
    """
    
    return html
