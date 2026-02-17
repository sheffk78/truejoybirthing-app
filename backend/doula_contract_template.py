# Doula Service Agreement Template
# New customizable contract with dynamic field merging

DOULA_CONTRACT_AGREEMENT_TEXT = """Doula Service Agreement

This Doula Service Agreement ("Agreement") is made between {client_name} ("Client") and {doula_name} ("Doula") for doula services related to the Client's pregnancy, labor, birth, and early postpartum period. The Client's estimated due date is {estimated_due_date}. The total payment amount for doula services will be ${total_fee}, of which ${retainer_amount} is a retainer (down payment) and ${remaining_balance} is the remaining balance. Unless otherwise specified here: {final_payment_due_description}, the final payment will be due on {final_payment_due_description}.

True Joy Birthing and any related platforms or services that make this Agreement template available are not parties to this Agreement and are not providing legal, medical, or professional advice by doing so. This Agreement is entered into solely between the Client and the Doula, who each accept full responsibility for understanding, customizing, and enforcing its terms. True Joy Birthing has no obligation to mediate, enforce, or resolve any dispute arising from this Agreement, and neither the Client nor the Doula may hold True Joy Birthing liable for any claims, losses, or disagreements related to the use of this template or to their doula-client relationship.

The Client understands that the Doula is hired by and accountable only to the Client (and the Client's partner, if applicable), and never to the Client's medical care provider or hospital. This is a private contract designed to protect the rights, privacy, and autonomy of both parties. Doula support is non-medical in nature and is offered with the highest standards of confidentiality and respect; no clinical tasks will be performed and no medical advice will be given. The Doula's role is to provide physical, emotional, and informational support during pregnancy, labor, birth, and the immediate postpartum period, tailored to the Client's preferences and needs. This may include comfort measures, position suggestions, breathing and relaxation techniques, encouragement, and help in understanding options. The Doula supports open, respectful communication between the Client and the birth team and encourages the Client's informed decision-making, but does not make decisions for the Client or speak to staff on the Client's behalf unless a specific exception is agreed here: {speak_for_client_exception}. All information shared with the Doula is held in strict confidence except where disclosure is required by law. The Doula's support is non-judgmental; the Client's choices regarding birth, pain relief, interventions, and parenting are respected, and the Doula agrees not to impose personal opinions.

The services provided under this Agreement may include an initial consultation, prenatal visits, on-call availability, labor and birth attendance, and postpartum support. An initial consultation is typically offered as a free meeting to assess mutual fit and answer questions; there is no obligation to proceed with services after this meeting, and referrals may be offered if either party feels it is not a good match. For this agreement, we agree to the following prenatal visit plan: {prenatal_visit_description}.

The Doula will be on call for the Client during a defined on-call period, most often from approximately 38 to 42 weeks of pregnancy, during which the Doula will be available by phone, text, or email and prepared to join the Client in labor as requested. Outside the on-call period, the Doula will respond to non-urgent messages within a reasonable timeframe (for example, within 24 hours), and during the on-call period the Doula will respond as promptly as possible. Specific on-call dates and response expectations: {on_call_window_description}. Response expectations: {on_call_response_description}.

When labor is suspected or begins, the Client agrees to contact the Doula as early as reasonably possible. The Doula will join the Client when requested, with typical arrival within approximately 1-2 hours, recognizing that distance, traffic, and other factors may affect timing. If the Doula is attending another birth or is otherwise unexpectedly unavailable, a back-up doula may be called in accordance with prior arrangements; the Client understands that a back-up doula may attend in place of the primary Doula if needed. If labor is very long (for example, exceeds 24 hours of continuous support), the Doula may call in a back-up for relief or additional support. Backup doula preferences: {backup_doula_preferences}.

After the birth, the Doula will typically remain with the Client for approximately one to two hours to assist with immediate postpartum needs, such as comfort, basic newborn care support, and establishing initial feeding as desired. Postpartum support arrangement: {postpartum_visit_description}.

The Client understands that the Doula does not provide medical care or perform medical procedures. The Doula does not take blood pressure or temperature, provide fetal monitoring, perform vaginal exams, diagnose conditions, or prescribe treatments. The Doula does not make medical decisions or give medical advice, and will not communicate with staff as the Client's legal representative or advocate unless a specific arrangement is made and documented. If an unplanned birth occurs in the Doula's presence, such as at home or in a car en route to the planned birth location, the Doula will call emergency medical services and provide calm, supportive presence and comfort measures only, staying within a non-clinical role.

All discussions between the Client and the Doula, whether in person, by phone, or in writing, are considered confidential, except when disclosure is required by law (for example, in cases of suspected abuse or imminent harm). The Doula will keep reasonable communication channels open throughout the Client's journey, and the Client agrees to use agreed-upon methods (such as phone, text, or messaging through an app) for reaching the Doula. The Client understands that the Doula is not legally responsible for outcomes or events outside the Doula's control, including but not limited to medical decisions made by the Client or providers, changes in hospital policies, or unforeseen emergencies.

Payment terms for this Agreement specify that a retainer or down payment of ${retainer_amount} is due upon signing, in order to reserve the Doula's services and on-call availability for the anticipated birth window. This retainer is typically non-refundable after {retainer_non_refundable_after_weeks} weeks' gestation and is applied toward the total fee. The remaining balance of ${remaining_balance} is due by {final_payment_due_detail}. Both parties acknowledge that all payment details above govern what is owed and when.

The Client understands that cancellations and refunds are handled according to clear timelines. If the Client cancels services up to and including {cancellation_weeks_threshold} weeks of pregnancy, only the retainer is owed and is non-refundable, and any additional amounts paid may be refunded or credited at the Doula's discretion. If the Client cancels after that agreed point, the full agreed-upon fee is typically due, as the Doula has reserved on-call time and may have turned away other clients. If the Client chooses a planned cesarean birth and decides not to have the Doula present, the full fee still applies, but the Doula will provide postpartum support in place of in-person labor support: {cesarean_alternative_support_description}.

In situations where the Doula is unexpectedly unavailable, this Agreement sets out how that will be handled. If the Client calls at the onset of labor and the Doula is unreachable within a reasonable time frame ({unreachable_timeframe_description}) and therefore misses the birth, {unreachable_remedy_description}. If a very rapid labor ({precipitous_labor_definition}) prevents the Doula from arriving in time, the Doula may offer additional postpartum hours or another form of compensation: {precipitous_labor_compensation_description}. Other absences or unusual circumstances: {other_absence_policy}.

By signing this Agreement, the Client and the Doula affirm that they understand that the Doula's services are personal and non-medical, that the Client remains responsible for medical decisions and for communicating with health care providers, and that the Client has the right to informed decision-making and privacy. They further affirm that they enter into this contract voluntarily, with the intention of mutual respect and benefit, and that they understand it is a private agreement between them that does not create any duty or liability for True Joy Birthing.

Any additional terms, boundaries, or special arrangements that either party wishes to include: {special_arrangements}."""

# Default values for contract fields
DEFAULT_CONTRACT_FIELDS = {
    "prenatal_visit_description": "Three prenatal visits to discuss preferences, birth plan, and support roles",
    "on_call_window_description": "38 to 42 weeks",
    "on_call_response_description": "Respond to non-urgent messages within 24 hours and as promptly as possible while on call",
    "backup_doula_preferences": "A backup doula may be introduced prior to labor in case coverage is needed",
    "postpartum_visit_description": "One or two in-home visits within the first two weeks after birth to discuss the birth experience, offer breastfeeding and newborn-care support, and provide referrals",
    "speak_for_client_exception": "None - the Doula will not speak on the Client's behalf to staff",
    "retainer_non_refundable_after_weeks": 37,
    "cancellation_weeks_threshold": 37,
    "final_payment_due_detail": "Day after birth",
    "cesarean_alternative_support_description": "Two postpartum sessions even if Doula does not attend the birth",
    "unreachable_timeframe_description": "Within two hours after notification at onset of labor",
    "unreachable_remedy_description": "The contract may be considered void and payments may be refunded",
    "precipitous_labor_definition": "Less than two hours from first call",
    "precipitous_labor_compensation_description": "Four extra postpartum hours at no cost as a gesture of goodwill",
    "other_absence_policy": "Reviewed case-by-case, any refund or waiver of fees at the Doula's discretion",
    "special_arrangements": "None at this time"
}


def get_contract_template():
    """Return contract template info with default fields"""
    return {
        "title": "Doula Service Agreement",
        "agreement_text_template": DOULA_CONTRACT_AGREEMENT_TEXT,
        "default_fields": DEFAULT_CONTRACT_FIELDS,
        "field_sections": [
            {
                "id": "parties_basics",
                "title": "Parties & Basic Details",
                "fields": [
                    {"id": "client_name", "label": "Client Name(s)", "type": "text", "required": True, "placeholder": "Full name(s) of the birthing parent and partner if desired"},
                    {"id": "doula_name", "label": "Doula Name", "type": "text", "required": True, "placeholder": "Doula's full name or business name", "prefill_from_profile": True},
                    {"id": "estimated_due_date", "label": "Estimated Due Date", "type": "date", "required": True},
                    {"id": "total_fee", "label": "Total Fee ($)", "type": "currency", "required": True},
                    {"id": "retainer_amount", "label": "Retainer Amount ($)", "type": "currency", "required": True},
                    {"id": "remaining_balance", "label": "Remaining Balance ($)", "type": "currency", "auto_calculate": "total_fee - retainer_amount"},
                    {"id": "final_payment_due_description", "label": "Final Payment Due", "type": "text", "placeholder": "e.g., Day after birth, at 38 weeks, first postpartum visit"}
                ]
            },
            {
                "id": "services_scope",
                "title": "Services & Scope",
                "fields": [
                    {"id": "prenatal_visit_description", "label": "Prenatal Visits Description", "type": "textarea", "placeholder": "e.g., Three prenatal visits of 60-90 minutes each"},
                    {"id": "on_call_window_description", "label": "On-Call Window", "type": "text", "placeholder": "e.g., 38 to 42 weeks"},
                    {"id": "on_call_response_description", "label": "On-Call Response Expectations", "type": "textarea", "placeholder": "e.g., Respond to non-urgent messages within 24 hours..."},
                    {"id": "backup_doula_preferences", "label": "Backup Doula Preferences", "type": "textarea", "placeholder": "Any preferences/limits on backup doula use"},
                    {"id": "postpartum_visit_description", "label": "Postpartum Visits Description", "type": "textarea", "placeholder": "e.g., Two in-home visits within the first two weeks after birth"}
                ]
            },
            {
                "id": "boundaries_communication",
                "title": "Boundaries & Communication",
                "fields": [
                    {"id": "speak_for_client_exception", "label": "Exception for Speaking on Client's Behalf", "type": "textarea", "placeholder": "Leave blank for standard language, or specify any agreed exceptions"}
                ]
            },
            {
                "id": "payment_refunds",
                "title": "Payment & Refunds",
                "fields": [
                    {"id": "retainer_non_refundable_after_weeks", "label": "Retainer Non-Refundable After (weeks)", "type": "number", "placeholder": "37"},
                    {"id": "cancellation_weeks_threshold", "label": "Cancellation Threshold (weeks)", "type": "number", "placeholder": "37"},
                    {"id": "final_payment_due_detail", "label": "Final Payment Due Detail", "type": "text", "placeholder": "e.g., Day after birth"},
                    {"id": "cesarean_alternative_support_description", "label": "Cesarean Alternative Support", "type": "textarea", "placeholder": "e.g., Two postpartum sessions even if Doula does not attend"}
                ]
            },
            {
                "id": "unavailability_circumstances",
                "title": "Unavailability & Special Circumstances",
                "fields": [
                    {"id": "unreachable_timeframe_description", "label": "Unreachable Timeframe", "type": "text", "placeholder": "e.g., Within two hours after notification at onset of labor"},
                    {"id": "unreachable_remedy_description", "label": "Remedy if Unreachable and Misses Birth", "type": "textarea", "placeholder": "e.g., Contract may be void and payments refunded"},
                    {"id": "precipitous_labor_definition", "label": "Precipitous Labor Definition", "type": "text", "placeholder": "e.g., Less than two hours from first call"},
                    {"id": "precipitous_labor_compensation_description", "label": "Rapid Birth Compensation", "type": "textarea", "placeholder": "e.g., Four extra postpartum hours at no cost"},
                    {"id": "other_absence_policy", "label": "Other Absence Policy", "type": "textarea", "placeholder": "How other absences/unusual circumstances are handled"}
                ]
            },
            {
                "id": "addendum",
                "title": "Addendum / Special Arrangements",
                "fields": [
                    {"id": "special_arrangements", "label": "Special Arrangements", "type": "textarea", "placeholder": "Any additional boundaries, services, or exceptions specific to your practice"}
                ]
            }
        ]
    }


def generate_contract_text(contract_data: dict) -> str:
    """Generate the full contract text with merged fields"""
    # Start with defaults
    merged_data = DEFAULT_CONTRACT_FIELDS.copy()
    
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
        contract_text = DOULA_CONTRACT_AGREEMENT_TEXT.format(**merged_data)
    except KeyError as e:
        # If a field is missing, use a placeholder
        contract_text = DOULA_CONTRACT_AGREEMENT_TEXT
        for key in merged_data:
            contract_text = contract_text.replace(f"{{{key}}}", str(merged_data.get(key, f"[{key}]")))
    
    return contract_text


def get_contract_html(contract_data: dict) -> str:
    """Generate HTML version of the contract for viewing/printing"""
    contract_text = generate_contract_text(contract_data)
    
    # Split into paragraphs
    paragraphs = contract_text.split('\n\n')
    
    client_name = contract_data.get("client_name", "")
    doula_name = contract_data.get("doula_name", "")
    agreement_date = contract_data.get("agreement_date", "")
    
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
                width: 45%; 
                margin: 20px 2%; 
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
            <h1>Doula Service Agreement</h1>
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
    
    client_sig = contract_data.get("client_signature")
    doula_sig = contract_data.get("doula_signature")
    
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
            <div class="signature-label">Client Name (Print)</div>
            <div class="signature-line" style="margin-top: 20px;"></div>
            <div class="signature-label">Date</div>
        '''
    html += '</div>'
    
    html += '<div class="signature-box">'
    if doula_sig:
        html += f'''
            <div class="signed-info">
                <div class="signed-name">Signed by: {doula_sig.get("signer_name", "")}</div>
                <div>Date: {doula_sig.get("signed_at", "")[:10] if doula_sig.get("signed_at") else ""}</div>
            </div>
        '''
    else:
        html += f'''
            <div class="signature-line"></div>
            <div class="signature-label">Doula Signature</div>
            <div class="signature-line" style="margin-top: 20px;"></div>
            <div class="signature-label">Doula Name: {doula_name}</div>
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
