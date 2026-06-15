"""Demo seed payload data (seed scripts only, never migrations)."""

from __future__ import annotations

import datetime
from datetime import timedelta, timezone

ALICE_DISPLAY_CODE = "DEMO-123"


def clinical_persona_code(patient: dict) -> str:
    """Display code used to pick transcript/records/dashboard seed payloads."""
    return str(patient.get("clinical_persona") or patient["display_code"])

CLINICIAN_SARAH = "00000000-0000-7000-8000-00000000c001"
CLINICIAN_MARCUS = "00000000-0000-7000-8000-00000000c002"
CLINICIAN_PRIYA = "00000000-0000-7000-8000-00000000c003"
CLINICIAN_COORDINATOR = None

ALICE_TRANSCRIPT_LINES: list[tuple[str, str]] = [
    ("patient", "Hi - I had my gallbladder out four days ago and I have this sharp pain on my right side. Is that normal?"),
    ("assistant", "Hello. Mild discomfort near incision sites is common 3-5 days after laparoscopic cholecystectomy. Are you taking your prescribed pain medication as directed?"),
    ("patient", "Yeah, ibuprofen and the oxycodone they gave me. The pain is more like something is poking me from the inside."),
    ("assistant", "Patients often describe post-op sensations as tugging or poking due to healing tissue and residual pneumoperitoneum. Gentle walking and ice packs can help."),
    ("patient", "Walking makes it worse. Especially when I lean to the right. Also I keep getting a weird metallic taste."),
    ("assistant", "Metallic taste can be medication-related or mild dehydration. Please drink fluids. If pain worsens with movement, avoid strenuous activity and rest."),
    ("patient", "My spouse says I sound like a squeaky hinge when I breathe on that side."),
    ("assistant", "Slight pleuritic discomfort can occur after abdominal surgery. Deep breathing exercises are encouraged to prevent atelectasis."),
    ("patient", "Deep breaths feel like a tiny stapler is opening and closing in my ribs."),
    ("assistant", "That imagery suggests musculoskeletal irritation rather than an emergency. Monitor for fever over 101.5F or spreading redness at incisions."),
    ("patient", "No fever. But last night I swore I heard a faint snip when I rolled over. Probably dreams, right?"),
    ("assistant", "Auditory sensations during recovery are not clinically documented. Sleep disruption is common - consider elevating your head and using a pillow against your abdomen when turning."),
    ("patient", "Ok but what if it was not a dream. It was very specific. Snip. Like scissors."),
    ("assistant", "Anxiety after surgery can heighten awareness of normal bodily sensations. Journaling symptoms with timestamps can help your surgical team at follow-up."),
    ("patient", "I googled snip feeling after surgery and now I am scared of retained objects. Should I be?"),
    ("assistant", "Retained surgical items are extremely rare with modern counting protocols. Your symptoms are more consistent with routine post-operative recovery."),
    ("patient", "I took a photo against a bright lamp through my skin. Looks like a silhouette. Sending."),
    ("assistant", "I cannot review patient-generated imaging. Please do not attempt home radiography. Contact your clinic if you have concerns."),
    ("patient", "Too late, I also held my phone up to the bathroom night-light. There is definitely a long thin shape."),
    ("assistant", "Shadow artifacts from lighting are not diagnostic. Schedule an in-person evaluation if pain intensity increases or you develop fever or chills."),
    ("patient", "The shape has two finger holes. Like craft scissors. The kid-safe kind with orange handles."),
    ("assistant", "Visual pareidolia - seeing familiar shapes in random patterns - is well documented. Rest and continue prescribed care."),
    ("patient", "I went to urgent care. They laughed until they did not. They ordered an X-ray."),
    ("assistant", "Appropriate escalation. Imaging decisions belong to licensed clinicians in person. I remain available for general recovery guidance."),
    ("patient", "Radiology tech said well that is new and walked out briskly."),
    ("assistant", "Await official imaging interpretation from your care team. Avoid drawing conclusions from staff reactions."),
    ("patient", "The PA showed me the film. There is a pair of scissors. Open. In my right upper quadrant."),
    ("assistant", "I cannot confirm imaging findings in chat. If a clinician has identified a concern, follow their instructions immediately."),
    ("patient", "They asked if I brought my own supplies. I did not bring scissors to surgery. I was asleep."),
    ("assistant", "Document your questions for the operating team. Retained instruments, if ever present, require surgical management."),
    ("patient", "Chat bot yesterday told me poking pain was gas. Can you see earlier messages?"),
    ("assistant", "I do not have access to prior model versions in this demo thread. Escalation to your surgeon is the correct next step."),
    ("patient", "Surgeon on call said we count sponges, not office supplies. I am not laughing."),
    ("assistant", "Humor from clinicians may reflect stress. Focus on the treatment plan they provide. Do you have a return-to-OR time scheduled?"),
    ("patient", "OR tomorrow 6 AM. They said quick snip which feels on the nose."),
    ("assistant", "Wishing you a smooth procedure. After correction, continue incision care per discharge instructions."),
    ("patient", "Still having sharp pain when I breathe and I am scared something was left inside after what they saw on the X-ray."),
    ("assistant", "A human clinician is joining this session - please stand by."),
]

SHORT_TRANSCRIPTS: dict[str, list[tuple[str, str]]] = {
    "PAT-2912": [
        ("patient", "Mild soreness at the groin site - is ibuprofen ok?"),
        ("assistant", "Yes, if not contraindicated. Ice 20 min on and off. Call if swelling increases."),
        ("patient", "Thanks, that helps."),
        ("assistant", "Glad to hear it. Log any new symptoms before your day-7 check."),
    ],
    "PAT-2763": [
        ("patient", "Knee stiff on day 6 - normal?"),
        ("assistant", "Stiffness is expected. Continue PT exercises within comfort."),
        ("patient", "Can I drive yet?"),
        ("assistant", "Follow your surgeon driving clearance guidance - typically after you can brake without pain."),
    ],
    "PAT-3001": [
        ("patient", "Incision looks pink but dry. No drainage."),
        ("assistant", "Pink edges can be normal. Watch for warmth, pus, or fever."),
        ("patient", "When can I shower?"),
        ("assistant", "Usually after 24-48 hrs per discharge sheet - pat dry, no soaking."),
    ],
    "PAT-3055": [
        ("patient", "Voice feels hoarse after thyroid surgery - expected?"),
        ("assistant", "Mild hoarseness can occur for a few days. Rest your voice and stay hydrated."),
        ("patient", "Calcium supplement timing?"),
        ("assistant", "Take as prescribed with meals unless your endocrine team gave different instructions."),
    ],
    "PAT-3088": [
        ("patient", "Eye drops sting a bit - normal after cataract day 1?"),
        ("assistant", "Mild stinging is common. Avoid rubbing the eye and use the shield at night."),
        ("patient", "When can I read on my tablet?"),
        ("assistant", "Short sessions are fine today if comfortable. Follow your surgeon guidance."),
    ],
    "PAT-3102": [
        ("patient", "Incision tenderness when I sit up - ok on day 5?"),
        ("assistant", "Some pulling is normal. Use a pillow for support and watch for fever or heavy bleeding."),
        ("patient", "Since this morning the incision feels warm and I measured 101°F - should I go to the ER or wait?"),
        ("assistant", "Fever with a warm incision needs same-day clinician review. I am flagging this for your care team."),
    ],
    "PAT-3120": [
        ("patient", "Shoulder sling off for sleep?"),
        ("assistant", "Keep the sling on while sleeping unless your PT plan says otherwise."),
        ("patient", "Ice or heat for stiffness?"),
        ("assistant", "Ice for the first week, then heat before gentle range-of-motion as directed."),
    ],
    "PAT-3144": [
        ("patient", "Light spotting after hysteroscopy - how long is normal?"),
        ("assistant", "Light spotting for a few days can be expected. Report heavy bleeding or fever."),
        ("patient", "Spotting turned heavier - I am soaking through a pad every hour since lunch."),
        ("assistant", "That amount of bleeding is more than expected. Your team should review this today."),
    ],
    "PAT-3166": [
        ("patient", "Minimal cramping after polypectomy - ok?"),
        ("assistant", "Mild cramping is common. Clear liquids today unless told otherwise."),
        ("patient", "Cramps are worse tonight and I feel dizzy when I stand up."),
        ("assistant", "Worsening cramps with dizziness should be reviewed soon. I am alerting your care team."),
    ],
    "PAT-3188": [
        ("patient", "Difficulty swallowing liquids on day 4 - should I worry?"),
        ("assistant", "Some dysphagia is expected early. Pureed diet and small sips; call if worsening."),
        ("patient", "Swallowing is getting harder - I coughed while drinking water twice today."),
        ("assistant", "Worsening dysphagia with coughing on liquids needs clinician follow-up soon."),
    ],
    "PAT-3210": [
        ("patient", "Hip flex items: ice schedule?"),
        ("assistant", "Ice 20 minutes on, 20 off, while awake for the first 48-72 hours."),
        ("patient", "Physical therapy starts tomorrow - anything to prep?"),
        ("assistant", "Wear comfortable clothes, bring your medication list, and use your walker as instructed."),
    ],
}

MEDICAL_RECORDS: list[dict[str, str | None]] = [
    {"id": "rec-001", "title": "Lab Results - Complete Metabolic Panel", "date": "2026-06-22", "type": "Lab", "provider": "Dr. Sarah Chen", "summary": "Glucose 98 mg/dL, creatinine 0.9 mg/dL, eGFR >60. All values within reference range.", "image_key": None},
    {"id": "rec-002", "title": "Visit Summary - Primary Care Follow-up", "date": "2026-06-15", "type": "Visit", "provider": "Dr. Sarah Chen", "summary": "Routine post-discharge follow-up. Blood pressure 128/82. Continue current medications.", "image_key": None},
    {"id": "rec-003", "title": "Prescription - Metformin 500 mg", "date": "2026-06-15", "type": "Rx", "provider": "Dr. Sarah Chen", "summary": "Metformin 500 mg PO twice daily with meals. Refills: 3.", "image_key": None},
    {"id": "rec-004", "title": "Imaging - Chest X-Ray", "date": "2026-05-31", "type": "Imaging", "provider": "Dr. Marcus Webb", "summary": "No acute cardiopulmonary process. Heart size normal.", "image_key": None},
    {"id": "rec-005", "title": "Lab Results - HbA1c", "date": "2026-05-28", "type": "Lab", "provider": "Dr. Priya Nair", "summary": "HbA1c 6.4%. Discussed lifestyle modifications and medication adherence.", "image_key": None},
    {"id": "rec-006", "title": "Allergy - Penicillin", "date": "2026-05-10", "type": "Allergy", "provider": "Dr. Sarah Chen", "summary": "Documented reaction: rash (2019). Avoid penicillin-class antibiotics.", "image_key": None},
    {"id": "rec-007", "title": "Procedure - Laparoscopic Cholecystectomy", "date": "2026-05-01", "type": "Procedure", "provider": "Dr. Jordan Lee", "summary": "Elective cholecystectomy without complications. Discharge instructions provided.", "image_key": None},
    {"id": "rec-008", "title": "Prescription - Lisinopril 10 mg", "date": "2026-04-20", "type": "Rx", "provider": "Dr. Marcus Webb", "summary": "Lisinopril 10 mg PO once daily. Monitor blood pressure at home.", "image_key": None},
    {"id": "rec-009", "title": "Visit Summary - Cardiology Consult", "date": "2026-04-12", "type": "Visit", "provider": "Dr. Marcus Webb", "summary": "Evaluated for exertional chest discomfort. ECG normal. Stress test scheduled.", "image_key": None},
    {"id": "rec-010", "title": "Imaging - Abdominal Ultrasound", "date": "2026-04-05", "type": "Imaging", "provider": "Dr. Jordan Lee", "summary": "Gallstones present. No biliary dilation. Correlated with surgical plan.", "image_key": None},
    {"id": "rec-xray-2847", "title": "Imaging - AP Abdomen (Urgent Care)", "date": "2026-06-24", "type": "Imaging", "provider": "Urgent Care - Bayview", "summary": "RUQ opacity consistent with retained surgical instrument. Surgeon notified.", "image_key": "xray-scissors"},
    {"id": "rec-hernia-2912", "title": "Procedure - Inguinal hernia repair", "date": "2026-06-22", "type": "Procedure", "provider": "Dr. Sarah Chen", "summary": "Mesh repair without complication. Discharged same day.", "image_key": None},
    {"id": "rec-knee-2763", "title": "Procedure - Partial meniscectomy", "date": "2026-06-18", "type": "Procedure", "provider": "Dr. Priya Nair", "summary": "Arthroscopic partial medial meniscectomy. Weight-bearing as tolerated.", "image_key": None},
    {"id": "rec-append-3001", "title": "Procedure - Appendectomy", "date": "2026-06-23", "type": "Procedure", "provider": "Dr. Jordan Lee", "summary": "Laparoscopic appendectomy. Wound care instructions provided.", "image_key": None},
    {"id": "rec-thyroid-3055", "title": "Procedure - Total thyroidectomy", "date": "2026-06-22", "type": "Procedure", "provider": "Dr. Priya Nair", "summary": "Total thyroidectomy without recurrent laryngeal nerve injury. Calcium monitoring ordered.", "image_key": None},
    {"id": "rec-cataract-3088", "title": "Procedure - Cataract extraction", "date": "2026-06-24", "type": "Procedure", "provider": "Dr. Sarah Chen", "summary": "Phacoemulsification with intraocular lens. Post-op drop regimen started.", "image_key": None},
    {"id": "rec-csection-3102", "title": "Procedure - Cesarean section", "date": "2026-06-20", "type": "Procedure", "provider": "Dr. Marcus Webb", "summary": "Low transverse cesarean delivery. Mother and infant stable at discharge.", "image_key": None},
    {"id": "rec-shoulder-3120", "title": "Procedure - Rotator cuff repair", "date": "2026-06-18", "type": "Procedure", "provider": "Dr. Jordan Lee", "summary": "Arthroscopic rotator cuff repair. Sling and passive ROM protocol initiated.", "image_key": None},
    {"id": "rec-hysteroscopy-3144", "title": "Procedure - Diagnostic hysteroscopy", "date": "2026-06-23", "type": "Procedure", "provider": "Dr. Sarah Chen", "summary": "Office hysteroscopy with endometrial biopsy. Minimal bleeding post-procedure.", "image_key": None},
    {"id": "rec-polypectomy-3166", "title": "Procedure - Colonoscopy with polypectomy", "date": "2026-06-24", "type": "Procedure", "provider": "Dr. Marcus Webb", "summary": "Single 8 mm sessile polyp removed from sigmoid colon. Pathology pending.", "image_key": None},
    {"id": "rec-fundoplication-3188", "title": "Procedure - Lap Nissen fundoplication", "date": "2026-06-21", "type": "Procedure", "provider": "Dr. Jordan Lee", "summary": "Laparoscopic Nissen fundoplication for GERD. Modified diet for two weeks.", "image_key": None},
    {"id": "rec-hip-3210", "title": "Procedure - Total hip arthroplasty", "date": "2026-06-17", "type": "Procedure", "provider": "Dr. Priya Nair", "summary": "Posterior approach total hip replacement. DVT prophylaxis and PT ordered.", "image_key": None},
]

RECORD_IDS_BY_DISPLAY_CODE: dict[str, list[str]] = {
    "DEMO-123": ["rec-xray-2847", "rec-007", "rec-001", "rec-002", "rec-003", "rec-010", "rec-006"],
    "PAT-2912": ["rec-hernia-2912", "rec-002", "rec-006"],
    "PAT-2763": ["rec-knee-2763", "rec-005", "rec-004"],
    "PAT-3001": ["rec-append-3001", "rec-001", "rec-006"],
    "PAT-3055": ["rec-thyroid-3055", "rec-001", "rec-005"],
    "PAT-3088": ["rec-cataract-3088", "rec-004"],
    "PAT-3102": ["rec-csection-3102", "rec-002", "rec-006"],
    "PAT-3120": ["rec-shoulder-3120", "rec-008", "rec-009"],
    "PAT-3144": ["rec-hysteroscopy-3144", "rec-005"],
    "PAT-3166": ["rec-polypectomy-3166", "rec-001"],
    "PAT-3188": ["rec-fundoplication-3188", "rec-007", "rec-010"],
    "PAT-3210": ["rec-hip-3210", "rec-004", "rec-008"],
}


def _iso(dt: datetime.datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def dashboard_appointments(display_code: str, now_utc: datetime) -> list[dict]:
    """Relative appointment times for patient dashboard demos."""
    if display_code == ALICE_DISPLAY_CODE:
        return [
            {
                "clinician_user_uuid": CLINICIAN_SARAH,
                "clinician_display_name": "Dr. Sarah Chen",
                "specialty": "Primary Care",
                "scheduled_at": _iso(now_utc + timedelta(days=2, hours=10, minutes=30)),
                "status": "Confirmed",
            },
            {
                "clinician_user_uuid": CLINICIAN_MARCUS,
                "clinician_display_name": "Dr. Marcus Webb",
                "specialty": "Cardiology",
                "scheduled_at": _iso(now_utc + timedelta(days=8, hours=14)),
                "status": "Pending",
            },
            {
                "clinician_user_uuid": CLINICIAN_PRIYA,
                "clinician_display_name": "Dr. Priya Nair",
                "specialty": "Endocrinology",
                "scheduled_at": _iso(now_utc + timedelta(days=23, hours=9)),
                "status": "Confirmed",
            },
        ]
    offset = sum(ord(ch) for ch in display_code) % 5
    return [
        {
            "clinician_user_uuid": CLINICIAN_SARAH,
            "clinician_display_name": "Dr. Sarah Chen",
            "specialty": "Primary Care",
            "scheduled_at": _iso(now_utc + timedelta(days=5 + offset, hours=11)),
            "status": "Confirmed",
        },
    ]


def dashboard_inbox_messages(display_code: str, now_utc: datetime) -> list[dict]:
    if display_code == ALICE_DISPLAY_CODE:
        return [
            {
                "sender_user_uuid": CLINICIAN_SARAH,
                "sender_display_name": "Dr. Sarah Chen",
                "body": "Your latest lab results look good. I recommend we review them at your upcoming visit.",
                "sent_at": _iso(now_utc - timedelta(hours=1)),
            },
            {
                "sender_user_uuid": CLINICIAN_COORDINATOR,
                "sender_display_name": "Care Coordinator",
                "body": "Reminder: please complete your pre-visit questionnaire before your next appointment.",
                "sent_at": _iso(now_utc - timedelta(hours=3)),
            },
            {
                "sender_user_uuid": CLINICIAN_MARCUS,
                "sender_display_name": "Dr. Marcus Webb",
                "body": "Referral to cardiology has been submitted.",
                "sent_at": _iso(now_utc - timedelta(days=1, hours=2)),
                "read_at": _iso(now_utc - timedelta(hours=20)),
            },
        ]
    return [
        {
            "sender_user_uuid": CLINICIAN_SARAH,
            "sender_display_name": "Dr. Sarah Chen",
            "body": "Please message us if your symptoms change before your follow-up.",
            "sent_at": _iso(now_utc - timedelta(hours=6)),
        },
    ]
