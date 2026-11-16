import os
import shutil
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

DOCS_DIR = r"D:\Centinel Fin AI\docs"
CW_DIR = r"D:\BSC CSAI\security\coursework"
ROOT_DIR = r"D:\Centinel Fin AI"
os.makedirs(DOCS_DIR, exist_ok=True)
os.makedirs(CW_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. GENERATE 4 CREATIVE NEO-BRUTALIST DIAGRAMS (Matplotlib 300 DPI)
# ---------------------------------------------------------------------------
def generate_plan_diagrams():
    # --- DIAGRAM 1: 17-Day (2.5-Week) Visual Sprint Roadmap ---
    fig, ax = plt.subplots(figsize=(10.5, 6.2), dpi=300)
    ax.set_xlim(0, 10.5)
    ax.set_ylim(0, 6.8)
    ax.axis('off')

    phases = [
        ("PHASE 1: Days 1 - 3 (12-15 hrs)", "Classical & Symmetric Crypto + Labs 1-5 + Backend AES-256-GCM",
         "• Learn: Modulo 26, Affine Cipher, Confusion (S-Box) & Diffusion (P-Box), DES vs AES-GCM\n• Build: lab01 to lab05 Python scripts + AesEncryptionService.java in Spring Boot",
         "#8DDAFF", 5.5),
        ("PHASE 2: Days 4 - 6 (12-15 hrs)", "Asymmetric RSA, Hashing, Signatures + Labs 6-10 + CW2 Crypto",
         "• Learn: RSA Math (p, q, n, phi, e, d), SHA-256 Avalanche, Digital Signatures, Hybrid Key Exchange\n• Build: lab07 to lab10 scripts + RsaSignatureService.java & HmacSignatureService.java",
         "#B9A7FF", 4.4),
        ("PHASE 3: Days 7 - 9 (12-15 hrs)", "Coursework 1: System Security Diagram & Technical Report (100% CW1)",
         "• Learn: STRIDE Threat Modeling, NIST/OWASP Standards, Critical Evaluation Rubric\n• Build: CW1 Security & Vulnerability Diagram (ACP/FW/ENC/VULN) + Full CW1 Report (APA 7th)",
         "#FFD64A", 3.3),
        ("PHASE 4: Days 10 - 12 (12-15 hrs)", "Coursework 2: Protocol-Level & System-Level Security Prototype",
         "• Learn: TLS 1.3, HSTS/CSP, OAuth2 JWT (ES256/RS256), Application IDS/Rate-Limiting, 3-2-1 Backups\n• Build: IntrusionDetectionFilter.java, Firewall scripts, automated_encrypted_backup.py, Security UI",
         "#8EF0C0", 2.2),
        ("PHASE 5: Days 13 - 15 (12-15 hrs)", "ParentGuard Chrome Extension (Manifest V3) & Gemini AI Insights",
         "• Learn: Manifest V3 Service Workers, Content Script DOM Injection, Privacy-Preserving AI Tool Calling\n• Build: Chrome Extension (Checkout Lock + RSA Token Verify) + Gemini 3.8 Flash Insights API",
         "#FF8F7C", 1.1),
        ("PHASE 6: Days 16 - 17 (8-10 hrs)", "End-to-End Verification, CW2 Packaging & First-Class Viva Prep",
         "• Verify: 100% Green Maven JUnit + Vitest + Playwright E2E + All 10 Python Security Labs\n• Deliver: CW1 Report + CW2 Prototype Evidence Doc + Rehearse Top 10 Viva Voce Questions",
         "#D9FF3F", 0.05)
    ]

    for badge, title, bullets, color, y in phases:
        # Shadow box (Neo-brutalist offset)
        shadow = patches.FancyBboxPatch((0.45, y - 0.04), 9.6, 0.88, boxstyle="square,pad=0.05",
                                        facecolor="#151515", edgecolor="#151515", linewidth=1)
        ax.add_patch(shadow)
        rect = patches.FancyBboxPatch((0.4, y), 9.6, 0.88, boxstyle="square,pad=0.05",
                                      facecolor=color, edgecolor="#151515", linewidth=2.2)
        ax.add_patch(rect)
        # Badge pill
        badge_rect = patches.FancyBboxPatch((0.55, y + 0.52), 2.65, 0.28, boxstyle="square,pad=0.02",
                                            facecolor="#151515", edgecolor="#151515", linewidth=1)
        ax.add_patch(badge_rect)
        ax.text(1.87, y + 0.66, badge, fontsize=8.2, fontweight='bold', color="#FFFFFF", ha='center', va='center')
        ax.text(3.35, y + 0.66, title, fontsize=9.8, fontweight='bold', color="#151515", va='center')
        ax.text(0.55, y + 0.22, bullets, fontsize=7.8, color="#151515", va='center')

    plt.tight_layout()
    d1_path = os.path.join(DOCS_DIR, "plan_diag1_roadmap_timeline.png")
    plt.savefig(d1_path, bbox_inches='tight')
    plt.close()

    # --- DIAGRAM 2: Cryptography Concept & Learning Map (Labs 1 to 10) ---
    fig, ax = plt.subplots(figsize=(10, 4.8), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5.2)
    ax.axis('off')

    nodes = [
        ("1. Classical Ciphers\n(Labs 1 & 2)", "Additive, Multiplicative\n& Affine (Mod 26)\nKey Space = 312\nBroken by Frequency!", 0.3, 2.7, "#E9E6DD"),
        ("2. Block Primitives\n(Lab 3)", "Shannon's Principles:\nS-Box = Confusion\nP-Box = Diffusion\nNon-linear Bit Mixing", 2.25, 2.7, "#8DDAFF"),
        ("3. Symmetric Crypto\n(Labs 4 & 5)", "DES (56-bit, obsolete)\nvs AES-256-GCM\nFast Bulk Encryption\n+ 128-bit Auth Tag", 4.2, 2.7, "#8EF0C0"),
        ("4. Hashing & Integrity\n(Lab 6 - DONE)", "MD5 (Broken) vs\nSHA-256 & HMAC\nOne-Way Fingerprint\nAvalanche Effect", 6.15, 2.7, "#FFD64A"),
        ("5. Asymmetric RSA\n(Lab 7)", "Public Key (e, n)\nPrivate Key (d, n)\nEncrypt Key / Sign Hash\nPrime Factorization", 8.1, 2.7, "#B9A7FF")
    ]

    for title, desc, x, y, color in nodes:
        ax.add_patch(patches.FancyBboxPatch((x + 0.04, y - 0.04), 1.6, 2.0, boxstyle="square,pad=0.06", facecolor="#151515", edgecolor="#151515", lw=1))
        ax.add_patch(patches.FancyBboxPatch((x, y), 1.6, 2.0, boxstyle="square,pad=0.06", facecolor=color, edgecolor="#151515", lw=2))
        ax.text(x + 0.8, y + 1.65, title, fontsize=8.3, fontweight='bold', ha='center', va='center', color="#151515")
        ax.text(x + 0.8, y + 0.75, desc, fontsize=7.4, ha='center', va='center', color="#222222")
        if x < 8.0:
            ax.annotate('', xy=(x + 1.9, y + 1.0), xytext=(x + 1.65, y + 1.0),
                        arrowprops=dict(arrowstyle="->", color="#151515", lw=2))

    # Bottom Synthesis Bar (Labs 8, 9, 10 + Centinel Fin AI CW2)
    ax.add_patch(patches.FancyBboxPatch((0.34, 0.26), 9.36, 1.6, boxstyle="square,pad=0.06", facecolor="#151515", edgecolor="#151515", lw=1))
    ax.add_patch(patches.FancyBboxPatch((0.3, 0.3), 9.36, 1.6, boxstyle="square,pad=0.06", facecolor="#D9FF3F", edgecolor="#151515", lw=2.2))
    ax.text(5.0, 1.5, "SYNTHESIS: LABS 8, 9 & 10 -> CENTINEL FIN AI COMPLETE HYBRID SECURITY PROTOCOL",
            fontsize=9.5, fontweight='bold', ha='center', va='center', color="#151515")
    ax.text(5.0, 0.85,
            "1. Key Exchange (Lab 8): RSA-2048 Public Key encrypts ephemeral 256-bit AES Session Key\n"
            "2. Confidentiality (Lab 5): AES-256-GCM encrypts sensitive transaction & ledger data at rest/transit\n"
            "3. Integrity & Non-Repudiation (Lab 9 & 10): SHA-256 Hash + RSA-2048 Private Key signs ParentGuard Approval Tokens",
            fontsize=8.0, ha='center', va='center', color="#151515")

    ax.annotate('', xy=(5.0, 1.95), xytext=(5.0, 2.65), arrowprops=dict(arrowstyle="->", color="#151515", lw=2.5))

    plt.tight_layout()
    d2_path = os.path.join(DOCS_DIR, "plan_diag2_cryptography_learning_map.png")
    plt.savefig(d2_path, bbox_inches='tight')
    plt.close()

    # --- DIAGRAM 3: 3-Layer Security Architecture for CW1 & CW2 ---
    fig, ax = plt.subplots(figsize=(10, 5.2), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5.5)
    ax.axis('off')

    layers = [
        ("LAYER 1: ALGORITHM-LEVEL SECURITY (40% of CW1 & CW2)",
         "• Symmetric Encryption: AES-256-GCM (AesEncryptionService.java) for DB sensitive fields (96-bit random IV + 128-bit Auth Tag)\n"
         "• Asymmetric Digital Signatures: RSA-2048 (SHA256withRSA in RsaSignatureService.java) signing ParentApproval tokens\n"
         "• Cryptographic Hashing & Integrity: SHA-256 message deduplication + HMAC-SHA256 webhook verification (constant-time)\n"
         "• Privacy-Preserving AI Masking: Regex & Luhn PAN scrubbing (SensitiveDataMaskingService.java) prior to Gemini LLM calls",
         "#8DDAFF", 3.7),
        ("LAYER 2: PROTOCOL-LEVEL SECURITY (30% of CW1 & CW2)",
         "• Web Content Transfer: HTTPS / TLS 1.3 (ECDHE Forward Secrecy) + Strict HSTS, CSP, X-Frame-Options & CORS headers\n"
         "• Stateless Auth Protocol: OAuth 2.0 / OIDC Bearer JWTs validated via Supabase JWKS (ES256 / RS256) + RBAC (ROLE_PARENT / CHILD)\n"
         "• Secure File & Mail Transfer: Signed Ledger Export (Detached RSA Signature header) + SMTPS/TLS Parent Step-Up Alerts",
         "#FFD64A", 1.95),
        ("LAYER 3: SYSTEM-LEVEL SECURITY (30% of CW1 & CW2)",
         "• Intrusion Detection & Rate-Limiting (IDS): IntrusionDetectionFilter.java blocking SQLi, XSS & brute-force bursts (HTTP 403/429)\n"
         "• Host & Network Firewalls: Default-Deny firewall scripts (configure_firewall.ps1 / ufw_firewall_rules.sh) + DB isolation\n"
         "• Encrypted Disaster Recovery Backups: automated_encrypted_backup.py (PostgreSQL snapshot -> SHA-256 -> AES-256-GCM + RSA Manifest)",
         "#8EF0C0", 0.2)
    ]

    for title, body, color, y in layers:
        ax.add_patch(patches.FancyBboxPatch((0.45, y - 0.05), 9.1, 1.45, boxstyle="square,pad=0.06", facecolor="#151515", edgecolor="#151515", lw=1))
        ax.add_patch(patches.FancyBboxPatch((0.4, y), 9.1, 1.45, boxstyle="square,pad=0.06", facecolor=color, edgecolor="#151515", lw=2.2))
        ax.text(0.65, y + 1.18, title, fontsize=9.8, fontweight='bold', color="#151515")
        ax.text(0.65, y + 0.55, body, fontsize=8.0, color="#151515", va='center')

    plt.tight_layout()
    d3_path = os.path.join(DOCS_DIR, "plan_diag3_cw1_cw2_security_layers.png")
    plt.savefig(d3_path, bbox_inches='tight')
    plt.close()

    # --- DIAGRAM 4: ParentGuard Chrome Extension & RSA Approval Flow ---
    fig, ax = plt.subplots(figsize=(10, 4.2), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 4.4)
    ax.axis('off')

    flow_boxes = [
        ("1. Child Reaches\nCheckout Page", "Content script detects\n/checkout URL or 'Pay'\nDOM button & locks UI", 0.3, "#FF8F7C"),
        ("2. Extension Submits\nPurchase Request", "Popup/Script sends\nPOST /purchase-requests\nwith Child Bearer JWT", 2.25, "#8DDAFF"),
        ("3. Parent Reviews on\nNext.js Dashboard", "ROLE_PARENT views\npending queue & clicks\nApprove or Deny", 4.2, "#FFD64A"),
        ("4. Backend Signs\nApproval Token", "Spring Boot hashes\ndecision (SHA-256) &\nsigns with RSA-2048", 6.15, "#B9A7FF"),
        ("5. Extension Verifies\n& Unlocks Pay", "WebCrypto verifies RSA\nsignature with Public Key\n& enables checkout!", 8.1, "#8EF0C0")
    ]

    for title, desc, x, color in flow_boxes:
        ax.add_patch(patches.FancyBboxPatch((x + 0.04, 1.06), 1.6, 2.2, boxstyle="square,pad=0.06", facecolor="#151515", edgecolor="#151515", lw=1))
        ax.add_patch(patches.FancyBboxPatch((x, 1.1), 1.6, 2.2, boxstyle="square,pad=0.06", facecolor=color, edgecolor="#151515", lw=2))
        ax.text(x + 0.8, 2.8, title, fontsize=8.3, fontweight='bold', ha='center', va='center', color="#151515")
        ax.text(x + 0.8, 1.8, desc, fontsize=7.5, ha='center', va='center', color="#151515")
        if x < 8.0:
            ax.annotate('', xy=(x + 1.9, 2.2), xytext=(x + 1.65, 2.2),
                        arrowprops=dict(arrowstyle="->", color="#151515", lw=2.2))

    plt.tight_layout()
    d4_path = os.path.join(DOCS_DIR, "plan_diag4_parentguard_extension_flow.png")
    plt.savefig(d4_path, bbox_inches='tight')
    plt.close()

    return d1_path, d2_path, d3_path, d4_path


# ---------------------------------------------------------------------------
# 2. GENERATE CREATIVE WORD DOCUMENT (.DOCX)
# ---------------------------------------------------------------------------
def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)


def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)


def add_callout_box(doc, title_text, body_text, bg_hex="FFFDF2", border_hex="151515"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.rows[0].cells[0]
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(4)
    r_title = p.add_run(title_text + "\n")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(10.5)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(21, 21, 21)
    r_body = p.add_run(body_text)
    r_body.font.name = "Calibri"
    r_body.font.size = Pt(10)
    r_body.font.color.rgb = RGBColor(30, 30, 30)
    doc.add_paragraph().paragraph_format.space_after = Pt(6)


def build_master_plan_docx(d1_path, d2_path, d3_path, d4_path):
    doc = Document()

    for section in doc.sections:
        section.top_margin = Inches(0.85)
        section.bottom_margin = Inches(0.85)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

    INK = RGBColor(21, 21, 21)
    MUTED = RGBColor(90, 90, 90)

    # --- HEADER BANNER ---
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(4)
    r_title = title_p.add_run("CENTINEL FIN AI & NB6005CEM SECURITY")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = INK

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(12)
    r_sub = sub_p.add_run(
        "The Complete 2.5-Week (17-Day) Study, Cryptography Concept Guide & Project Execution Roadmap\n"
        "Designed for BSc (Hons) Computer Science with AI — Working 4 to 5 Hours Per Day"
    )
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(11.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = MUTED

    # --- METADATA TABLE ---
    meta_table = doc.add_table(rows=5, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_rows = [
        ("Degree & Module:", "BSc (Hons) Computer Science with AI — NB6005CEM Security (CW1 + CW2 + 10 Labs)"),
        ("Project Name:", "Centinel Fin AI – ParentGuard (Browser Purchase Approval + Expense Intelligence)"),
        ("Schedule Pace:", "17 Days (2.5 Weeks) @ 4 to 5 Focused Hours/Day (~75 Hours Total)"),
        ("Current Repo Progress:", "Backend (129 Tests Pass), Supabase JWT Auth, Next.js UI & Lab 06 Already Done!"),
        ("Target Grade Outcome:", "First Class Honours (80% – 100% Distinction Band)")
    ]
    for idx, (k, v) in enumerate(meta_rows):
        row = meta_table.rows[idx]
        c0, c1 = row.cells[0], row.cells[1]
        c0.width, c1.width = Inches(2.1), Inches(4.6)
        c0.text, c1.text = k, v
        set_cell_background(c0, "D9FF3F" if idx == 4 else "E9E6DD")
        set_cell_background(c1, "FFFDF7")
        set_cell_margins(c0, 70, 70, 120, 120)
        set_cell_margins(c1, 70, 70, 120, 120)
        c0.paragraphs[0].runs[0].font.bold = True
        c0.paragraphs[0].runs[0].font.size = Pt(9.5)
        c1.paragraphs[0].runs[0].font.size = Pt(9.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    def add_h1(num, text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(f"{num}. {text}")
        r.font.name = "Arial"
        r.font.size = Pt(14.5)
        r.font.bold = True
        r.font.color.rgb = INK
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(11)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(text)
        r.font.name = "Arial"
        r.font.size = Pt(11.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor(35, 35, 35)
        return p

    def add_p(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(text)
        r.font.name = "Calibri"
        r.font.size = Pt(10.5)
        r.font.color.rgb = INK
        return p

    def add_bullet(prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.12
        rb = p.add_run(prefix + " ")
        rb.font.name = "Calibri"
        rb.font.size = Pt(10)
        rb.font.bold = True
        rb.font.color.rgb = INK
        rt = p.add_run(text)
        rt.font.name = "Calibri"
        rt.font.size = Pt(10)
        rt.font.color.rgb = INK
        return p

    # =========================================================================
    # SECTION 1: VISUAL OVERVIEW & AUDIT
    # =========================================================================
    add_h1("1", "Executive Overview: Why 2.5 Weeks (17 Days) Is Your Sweet Spot")
    add_p(
        "Because you have already completed the heavy foundational lifting in your repository (Spring Boot 3 domain models, "
        "Supabase PostgreSQL integration, OAuth2 JWT validation, PAN regex masking, Next.js 15 authentication portal, 129 unit tests, "
        "5 Playwright E2E tests, and Lab 6 on SHA-256 hashing), you do not need a slow 30-day schedule. By dedicating 4 to 5 focused "
        "hours a day, you can complete all 10 Security Labs, Coursework 1, Coursework 2, and the remaining Centinel Fin AI ParentGuard "
        "features in exactly 17 days (2.5 weeks)."
    )

    doc.add_picture(d1_path, width=Inches(6.6))
    cap1 = doc.add_paragraph()
    cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rc1 = cap1.add_run("Figure 1: Your 17-Day (2.5-Week) 6-Phase Master Sprint Roadmap (4–5 Hours/Day)")
    rc1.font.italic = True
    rc1.font.size = Pt(9)
    cap1.paragraph_format.space_after = Pt(10)

    # Audit Table
    audit_tbl = doc.add_table(rows=7, cols=3)
    audit_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    for j, h in enumerate(["Deliverable Area", "What Is Already Built", "What We Will Build in Days 1–17"]):
        c = audit_tbl.rows[0].cells[j]
        c.text = h
        set_cell_background(c, "151515")
        set_cell_margins(c, 80, 80, 100, 100)
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        c.paragraphs[0].runs[0].font.size = Pt(9.5)

    audit_data = [
        ("10 Weekly Security Labs", "Lab 6 (lab06_hashing.py) complete", "Labs 1–5 (Ciphers, S-Box, DES, AES) & Labs 7–10 (RSA + 3-Part Hybrid Protocol)"),
        ("Coursework 1 (CW1 Report)", "Base system diagrams in docs/", "Annotated Security & Vulnerability Diagram (1a/1b) + Full Technical Report (1c/2a/2b)"),
        ("CW2 Algorithm Level (40%)", "Luhn PAN Masking & SHA-256 dedup", "AesEncryptionService (AES-256-GCM), RsaSignatureService (RSA-2048), HmacSignatureService"),
        ("CW2 Protocol Level (30%)", "Supabase JWT (ES256/RS256) & API Key", "TLS/HTTPS Config, HSTS/CSP Security Headers, Signed Export Protocol & SMTPS Alerts"),
        ("CW2 System Level (30%)", "Role-Based Access Control (RBAC)", "IntrusionDetectionFilter (SQLi/XSS/Rate-Limit IDS), Firewall Scripts & AES Backup Tool"),
        ("Centinel Fin AI Product", "Backend APIs + Next.js Auth & Portal", "ParentGuard Chrome Extension (Manifest V3) + Gemini 3.8 Flash Insights & Charts")
    ]
    for idx, (col1, col2, col3) in enumerate(audit_data, start=1):
        row = audit_tbl.rows[idx]
        row.cells[0].text, row.cells[1].text, row.cells[2].text = col1, col2, col3
        for ci, cell in enumerate(row.cells):
            set_cell_margins(cell, 70, 70, 100, 100)
            cell.paragraphs[0].runs[0].font.size = Pt(9)
            if ci == 0:
                cell.paragraphs[0].runs[0].font.bold = True
                set_cell_background(cell, "E9E6DD")
            elif ci == 1:
                set_cell_background(cell, "F2FFF8")
            else:
                set_cell_background(cell, "FFFDF2")

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # =========================================================================
    # SECTION 2: WHAT YOU NEED TO LEARN FIRST (CS WITH AI CONCEPT PRIMER)
    # =========================================================================
    add_h1("2", "CS with AI Undergraduate Concept Guide: What to Learn First (No Fluff)")
    add_p(
        "You do not need to memorize pure-mathematics proofs to get a First-Class grade. Instead, as a Computer Science with AI "
        "student, you only need to understand the core intuition behind each cryptographic building block, why older algorithms "
        "failed, and how modern algorithms work together inside Centinel Fin AI."
    )

    doc.add_picture(d2_path, width=Inches(6.6))
    cap2 = doc.add_paragraph()
    cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rc2 = cap2.add_run("Figure 2: How Your 10 Cryptography Labs Connect Directly to Centinel Fin AI")
    rc2.font.italic = True
    rc2.font.size = Pt(9)
    cap2.paragraph_format.space_after = Pt(10)

    concepts = [
        ("Concept 1: Modular Arithmetic & Classical Ciphers (Labs 1 & 2 — Learn on Day 1)",
         "• The Core Idea: Map letters A–Z to numbers 0–25. Modulo 26 (% 26) just wraps numbers around 25 like a clock.\n"
         "• Additive Cipher: C = (P + K) mod 26. Multiplicative Cipher: C = (P * K1) mod 26. Affine Cipher combines both: C = (K1 * P + K2) mod 26.\n"
         "• What You Must Know for Viva: To decrypt a Multiplicative or Affine cipher, you cannot divide—you multiply by the Modular Inverse K1^-1 (in Python: pow(K1, -1, 26)). K1 must be coprime to 26 (gcd(K1, 26) = 1), leaving only 12 valid values for K1 and 26 for K2 (312 total keys). Because 312 keys can be brute-forced in under 1 millisecond and every 'E' always becomes the same ciphertext letter (Frequency Analysis), classical ciphers are broken.",
         "E8F7FF"),
        ("Concept 2: Confusion, Diffusion, DES & AES-256-GCM (Labs 3, 4 & 5 — Learn on Day 2)",
         "• Shannon's Two Rules: Modern block ciphers defeat frequency analysis using (1) Confusion (S-Box: a non-linear lookup table that hides the relationship between the Key and Ciphertext) and (2) Diffusion (P-Box / ShiftRows / MixColumns: shuffling bits so changing 1 bit of plaintext changes ~50% of ciphertext bits).\n"
         "• DES vs. AES: DES (Lab 4) uses a 56-bit key, which modern computers brute-force in hours. AES (Lab 5) uses 128-bit blocks with 128, 192, or 256-bit keys ($2^{256}$ possibilities).\n"
         "• Why AES-GCM Mode Matters for Centinel Fin AI: Never use ECB mode (identical input blocks create identical output blocks). In Centinel Fin AI, we use AES-256-GCM (Galois/Counter Mode), which generates a random 12-byte Initialization Vector (IV) and a 128-bit Authentication Tag—giving you both Encryption (Confidentiality) and Tamper Detection (Integrity) at once.",
         "EAFFEA"),
        ("Concept 3: Cryptographic Hashing & HMAC (Lab 6 — Review on Day 5)",
         "• Hashing (SHA-256): A one-way mathematical fingerprint. Any input size produces a fixed 256-bit (64-hex character) output. It is irreversible and has the Avalanche Effect (changing $15.00 to $15.01 scrambles the entire hash).\n"
         "• Why MD5 Is Dead: Attackers can generate MD5 collisions (two different messages with the exact same hash) in seconds.\n"
         "• Hashing vs. HMAC: A raw SHA-256 hash only checks if data changed accidentally; an attacker who intercepts a message can change the text AND recalculate a new SHA-256 hash. HMAC-SHA256 mixes a secret key into the hash, proving both Integrity and Authenticity for your n8n webhooks.",
         "FFFBE6"),
        ("Concept 4: Asymmetric RSA & Digital Signatures (Labs 7, 8, 9 & 10 — Learn on Days 4 & 5)",
         "• Symmetric vs. Asymmetric: AES is like a physical safe where both people need the exact same key (fast, but hard to share the key safely over the internet). RSA uses two mathematically linked keys: a Public Key (shared with everyone) and a Private Key (kept secret).\n"
         "• Rule of Thumb — Encryption vs. Digital Signatures:\n"
         "   1. To Encrypt a Secret (Lab 8 Key Exchange): Encrypt with Receiver's PUBLIC Key -> Only Receiver's PRIVATE Key can decrypt.\n"
         "   2. To Sign an Approval (Lab 9 & ParentGuard): Hash message with SHA-256 -> Sign hash with Sender's PRIVATE Key -> Anyone can verify with Sender's PUBLIC Key.\n"
         "• Hybrid Encryption (Lab 10): Because RSA math ($C = M^e \\pmod n$) is ~1000x slower than AES, real-world systems (like TLS and Centinel Fin AI) use RSA to exchange/sign keys and AES-GCM to encrypt bulk data.",
         "F3EEFF"),
        ("Concept 5: Protocol-Level & System-Level Security + Privacy AI (Days 10–15)",
         "• Protocol Level (CW1/CW2 30%): Secures data in transit between Next.js, Chrome Extension, n8n, and Spring Boot using HTTPS/TLS 1.3, OAuth2/JWT Bearer tokens (signed with ES256/RS256), HSTS/CSP headers, and signed file exports.\n"
         "• System Level (CW1/CW2 30%): Protects the server and database using Host/Network Firewalls (Default-Deny ingress), an Application Intrusion Detection System (IDS filter blocking SQLi, XSS, and brute-force floods), and AES-256-GCM Encrypted Database Backups.\n"
         "• AI Security (Your BSc CS with AI Edge): SensitiveDataMaskingService scrubs Luhn credit card numbers BEFORE calling Gemini 3.8 Flash, preventing LLM data leakage.",
         "FFEFEF")
    ]

    for c_title, c_body, c_color in concepts:
        add_callout_box(doc, c_title, c_body, bg_hex=c_color)

    # =========================================================================
    # SECTION 3: 3-LAYER SECURITY MAPPING FOR CW1 & CW2
    # =========================================================================
    add_h1("3", "How Coursework 1 & Coursework 2 Map to Centinel Fin AI")
    add_p(
        "Both Coventry University briefs (CW1 and CW2) evaluate your system across three exact architectural layers: "
        "Algorithm Level (40%), Protocol Level (30% in CW2), and System Level (30% in CW2). Figure 3 illustrates your exact "
        "implementation stack across all three layers."
    )

    doc.add_picture(d3_path, width=Inches(6.6))
    cap3 = doc.add_paragraph()
    cap3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rc3 = cap3.add_run("Figure 3: Three-Layer Defense-in-Depth Architecture for CW1 Report & CW2 Prototype")
    rc3.font.italic = True
    rc3.font.size = Pt(9)
    cap3.paragraph_format.space_after = Pt(10)

    doc.add_picture(d4_path, width=Inches(6.6))
    cap4 = doc.add_paragraph()
    cap4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rc4 = cap4.add_run("Figure 4: ParentGuard Browser Extension & RSA-2048 Cryptographic Approval Workflow")
    rc4.font.italic = True
    rc4.font.size = Pt(9)
    cap4.paragraph_format.space_after = Pt(10)

    # =========================================================================
    # SECTION 4: DAY-BY-DAY (DAYS 1 TO 17) STEP-BY-STEP EXECUTION PLAN
    # =========================================================================
    add_h1("4", "Day-by-Day Master Execution Plan (Days 1 to 17 @ 4–5 Hours/Day)")
    add_p(
        "Follow this schedule day by day. Every single day begins with a focused 'Learn First' session so you understand the theory "
        "before writing a single line of Python, Java, TypeScript, or academic report prose."
    )

    days_plan = [
        # PHASE 1
        ("DAY 1 (4.5 hrs)", "Phase 1: Classical Ciphers & Cryptanalysis (Labs 1 & 2)", "8DDAFF",
         "Learn First (1.5 hrs): Modular arithmetic (mod 26), Additive (Caesar) shift, Multiplicative cipher & coprime rule gcd(k, 26)=1, Modular Inverse pow(k, -1, 26), Affine cipher C = (k1*P + k2) mod 26, and why a 312-key space is broken via Frequency Analysis.",
         "Coursework / Lab Task (2 hrs): Create security_labs/lab01_classical_ciphers.py (Additive, Multiplicative, Affine encrypt/decrypt) and security_labs/lab02_cryptanalyse_affine.py (automated frequency-scoring attack that breaks Affine cipher without the key).",
         "Project & Viva Link (1 hr): Test both scripts on mock Centinel Fin AI messages ('APPROVE PURCHASE 150 USD'). Save terminal outputs for CW1/CW2 comparison showing why monoalphabetic ciphers cannot protect financial data."),

        ("DAY 2 (5.0 hrs)", "Phase 1: Block Cipher Primitives — S-Box, P-Box, DES & AES (Labs 3, 4 & 5)", "8DDAFF",
         "Learn First (1.5 hrs): Claude Shannon's Confusion (non-linear S-Box substitution) and Diffusion (P-Box bit permutation). Compare DES (64-bit block, 56-bit key—brute-forceable) vs. AES-256 (128-bit block, 256-bit key). Understand why GCM mode beats ECB and CBC.",
         "Coursework / Lab Task (2.5 hrs): Create security_labs/lab03_sbox_pbox.py (4-bit S-Box & 8-bit P-Box with inverse verification), lab04_des_familiarization.py (DES PKCS7 demo), and lab05_aes_familiarization.py (AES-256-GCM encryption + tamper detection).",
         "Project & Viva Link (1 hr): Document the benchmark & security comparison table (Affine vs. DES vs. AES-256-GCM) to paste directly into Section 3 of your CW1 Technical Report."),

        ("DAY 3 (4.5 hrs)", "Phase 1: Integrating AES-256-GCM Encryption at Rest in Spring Boot (CW2 1a)", "8DDAFF",
         "Learn First (1 hr): Understand field-level encryption at rest in Java using javax.crypto.Cipher ('AES/GCM/NoPadding'), generating a unique 12-byte SecureRandom IV per record, and prepending the IV to the Base64 ciphertext.",
         "Coursework / Lab Task (0.5 hr): Map CW2 Brief Task 1a (Algorithm-Level Symmetric Encryption — part of 40% grade) to your Spring Boot entities.",
         "Project Task (3 hrs): Build com.centinel.finai.security.AesEncryptionService.java and integrate it so sensitive raw message payloads / notes in IngestedMessage & PurchaseRequest are AES-256-GCM encrypted in PostgreSQL. Add AesEncryptionServiceTest.java."),

        # PHASE 2
        ("DAY 4 (4.5 hrs)", "Phase 2: RSA Asymmetric Cryptography & Hybrid Key Exchange (Labs 7 & 8)", "B9A7FF",
         "Learn First (1.5 hrs): Public vs. Private keys. Master the 5-step RSA math recipe: primes p & q -> modulus n = p*q -> totient phi = (p-1)*(q-1) -> public e -> private d = e^-1 mod phi. Understand the Key Distribution Problem and Hybrid Encryption.",
         "Coursework / Lab Task (2 hrs): Create security_labs/lab07_rsa_algorithm.py (educational math implementation + 2048-bit RSA) and lab08_key_distribution_protocol.py (Part 1 of 3: RSA-OAEP exchange of an ephemeral 256-bit AES session key between Backend & Extension).",
         "Project & Viva Link (1 hr): Run Labs 7 & 8 and capture outputs. Be ready to explain in your Viva why RSA encrypts the 32-byte AES key rather than the entire multi-megabyte ledger."),

        ("DAY 5 (4.5 hrs)", "Phase 2: Hashing, Digital Signatures & Complete Protocol (Labs 6, 9 & 10)", "B9A7FF",
         "Learn First (1.5 hrs): Review Lab 6 (SHA-256 Avalanche Effect vs. broken MD5). Learn how RSA Digital Signatures work: Hash message with SHA-256 -> Sign hash with Signer's PRIVATE key -> Verify with Signer's PUBLIC key (Integrity + Non-Repudiation).",
         "Coursework / Lab Task (2.5 hrs): Create security_labs/lab09_digital_signatures_protocol.py (Part 2 of 3: SHA-256 + RSA-PSS signing of a ParentGuard approval decision) and lab10_complete_protocol.py (Part 3 of 3: Combined AES-GCM + RSA Key Exchange + RSA Digital Signature).",
         "Project & Viva Link (0.5 hr): Create security_labs/README.md indexing all 10 completed weekly labs (Labs 1–10 are now 100% finished!)."),

        ("DAY 6 (4.5 hrs)", "Phase 2: RSA Approval Token Signing & HMAC Webhooks in Spring Boot (CW2 1a)", "B9A7FF",
         "Learn First (1 hr): Understand Java Signature ('SHA256withRSA') for signing ParentGuard approval decisions, and javax.crypto.Mac ('HmacSHA256') with constant-time MessageDigest.isEqual() to prevent webhook timing attacks.",
         "Coursework / Lab Task (0.5 hr): Complete CW2 Task 1a (Algorithm-Level 40%): Symmetric AES + Asymmetric RSA + SHA-256 Hashing + Digital Signatures all live in production Java code.",
         "Project Task (3 hrs): Implement RsaSignatureService.java (attaches a cryptographic signature when ROLE_PARENT approves a PurchaseRequest and exposes GET /api/v1/security/public-key) + HmacSignatureService.java in IngestionApiKeyInterceptor. Write unit tests."),

        # PHASE 3
        ("DAY 7 (4.5 hrs)", "Phase 3: Coursework 1 — System Design & Security Vulnerability Diagram (CW1 1a & 1b)", "FFD64A",
         "Learn First (1 hr): Review CW1 Brief rules: treat the PostgreSQL database as a single unit (no ER diagram needed) and show network topology, switches, routers, firewalls, access control points, encryption points, and vulnerability points.",
         "Coursework Task (3.5 hrs): Build docs/generate_cw1_security_diagram.py and draw your high-res CW1 System Security Architecture Diagram labeling FW-1/FW-2 (Firewalls), ACP-1 to ACP-4 (Access Control), ENC-1 to ENC-5 (Encryption), and VULN-1 to VULN-6 (Vulnerabilities). (Covers 60% of CW1 Task 1!).",
         "Project Link: Uses your exact Centinel Fin AI tiers (n8n Webhook, Spring Boot Resource Server, Gemini AI Masking Perimeter, Chrome Extension, Next.js Portal, and Supabase DB Unit)."),

        ("DAY 8 (5.0 hrs)", "Phase 3: Coursework 1 Technical Report — Abstract, Threat Matrix & Algorithm Analysis", "FFD64A",
         "Learn First (1 hr): How to write at Coventry University First-Class (80–100%) level: use STRIDE Threat Modeling and critical comparisons (Affine vs. DES vs. AES-GCM; MD5 vs. SHA-256; RSA vs. ECDSA) backed by NIST & OWASP citations.",
         "Coursework Task (4 hrs): Draft CW1 Technical Report Part 1: Executive Abstract (Task 2a, 20%), Section 1 (Architecture Overview), Section 2 (Part 1b Vulnerability & STRIDE Analysis), and Section 3 (Part 1c Algorithm-Level Critical Evaluation with Lab 1–10 evidence).",
         "Project Link: Cite your actual Java classes (AesEncryptionService, RsaSignatureService, SensitiveDataMaskingService) and lab benchmarks as empirical evidence."),

        ("DAY 9 (4.5 hrs)", "Phase 3: Coursework 1 Technical Report — Protocol, System Level & Final Polish", "FFD64A",
         "Learn First (1 hr): Review Protocol-Level security (TLS 1.3 ECDHE forward secrecy, OAuth2/JWT JWKS validation, CORS/CSP) and System-Level security (Host/Network Firewalls, IDS rate-limiting, 3-2-1 Encrypted Backups).",
         "Coursework Task (3.5 hrs): Draft CW1 Report Part 2: Section 4 (Protocol-Level Evaluation), Section 5 (System-Level Evaluation), Conclusion, and 15+ APA 7th Edition references. Export final NB6005CEM_CW1_Security_Evaluation_Report.docx & .pdf.",
         "Milestone Achieved: Coursework 1 is 100% complete and ready for submission by the end of Day 9!"),

        # PHASE 4
        ("DAY 10 (4.5 hrs)", "Phase 4: Coursework 2 — Protocol-Level Security Implementation (CW2 1b - 30%)", "8EF0C0",
         "Learn First (1 hr): How HTTP security headers (HSTS, Content-Security-Policy, X-Frame-Options), strict CORS, Signed File Transfers, and SMTPS notification protocols protect financial web apps.",
         "Coursework / Project Task (3.5 hrs): Upgrade SecurityConfig.java with HSTS, CSP, and Chrome Extension CORS rules. Build SignedExportController.java (GET /api/v1/transactions/export/signed with detached SHA256withRSA signature header) & SecureNotificationService.java. Add MockMvc tests.",
         "Milestone: Satisfies 100% of CW2 Task 1b (Protocol-Level Security: web content transfer, secure mail/alerting, and signed file transfer)."),

        ("DAY 11 (4.5 hrs)", "Phase 4: Coursework 2 — System-Level Security: IDS Filter & Firewalls (CW2 1c - 30%)", "8EF0C0",
         "Learn First (1 hr): How an Application-Layer Intrusion Detection System (IDS) detects SQL Injection ('UNION SELECT', 'OR 1=1'), XSS ('<script>'), and brute-force rate floods, and how stateful host firewalls enforce Default-Deny.",
         "Coursework / Project Task (3.5 hrs): Implement IntrusionDetectionFilter.java + SecurityAuditController.java (logs & blocks SQLi/XSS probes and rate-limit violations with 403/429). Create security_ops/configure_firewall.ps1 & ufw_firewall_rules.sh. Write IntrusionDetectionFilterTest.java.",
         "Milestone: Gives you live, demonstrable IDS intrusion blocking and firewall rules for CW2 Task 1c."),

        ("DAY 12 (4.5 hrs)", "Phase 4: Coursework 2 — Encrypted Backups & Live Security Dashboard Panel (CW2 1c)", "8EF0C0",
         "Learn First (1 hr): Disaster recovery and why database backups must be encrypted (AES-256-GCM) and checksummed (SHA-256 + RSA signature) to prevent offline data breaches.",
         "Coursework / Project Task (3.5 hrs): Create security_ops/automated_encrypted_backup.py (snapshots ledger -> SHA-256 -> AES-256-GCM encryption + RSA-signed manifest + restore verifier). Add a Neo-Brutalist 'Security & Compliance Status' panel on the Next.js Dashboard.",
         "Milestone: Coursework 2's Algorithm (40%), Protocol (30%), and System (30%) security layers are now 100% built and visible on screen!"),

        # PHASE 5
        ("DAY 13 (4.5 hrs)", "Phase 5: ParentGuard Chrome Extension (Manifest V3) — Popup & Service Worker", "FF8F7C",
         "Learn First (1 hr): Chrome Extension Manifest V3 architecture: manifest.json permissions, background service workers (background.js), and extension popup UI state management.",
         "Project Task (3.5 hrs): Build D:\\Centinel Fin AI\\chrome-extension\\ with manifest.json, Neo-Brutalist popup.html/popup.js (reads tab URL/title, lets child submit amount & reason to POST /api/v1/purchase-requests), and background.js service worker (Stories PG-5 & PG-6).",
         "Milestone: Child can submit live purchase approval requests directly from the Chrome toolbar."),

        ("DAY 14 (4.5 hrs)", "Phase 5: Chrome Extension Checkout Detection & RSA Signature Unlock (Story PG-7)", "FF8F7C",
         "Learn First (1 hr): Content scripts (content.js), DOM mutation observers for checkout/payment detection, and browser Web Crypto API (crypto.subtle.verify) for verifying RSA-2048 signatures.",
         "Project Task (3.5 hrs): Implement content.js to detect checkout pages, inject the 'ParentGuard: Approval Required' lock overlay over the Pay button, verify the parent's RSA-2048 signed approval token from the backend, and unlock checkout. Create /demo-checkout test page.",
         "Milestone: Complete end-to-end ParentGuard loop (Child Checkout Blocked -> Request Sent -> Parent Approves -> RSA Signature Unlocks Pay Button)."),

        ("DAY 15 (4.5 hrs)", "Phase 5: Gemini 3.8 Flash Categorization Fallback & Conversational Insights (PG-8/PG-9)", "FF8F7C",
         "Learn First (1 hr): Structured JSON output prompting with Gemini 3.8 Flash and grounded tool-calling (passing exact BigDecimal rollups from SummaryService so the AI never hallucinates financial numbers).",
         "Project Task (3.5 hrs): Implement GeminiCategorizationClient.java (Tier 2 fallback for unknown merchants after PII masking) and AiInsightController.java (POST /api/v1/insights/query). Wire Spend Analytics Charts & AI Q&A Panel into Next.js Dashboard.",
         "Milestone: Centinel Fin AI – ParentGuard is 100% feature-complete across Backend, Frontend, Chrome Extension, Security, and AI!"),

        # PHASE 6
        ("DAY 16 (4.5 hrs)", "Phase 6: Full-Stack Verification & CW2 Prototype Evidence Packaging", "D9FF3F",
         "Verification Task (2 hrs): Run ./mvnw.cmd test (140+ JUnit tests pass), Vitest unit tests, Playwright E2E multi-portal tests, and all 10 Python scripts in security_labs/ (lab01 to lab10).",
         "Coursework 2 Packaging (2.5 hrs): Generate docs/CW2_Security_Prototype_Walkthrough.docx mapping every CW2 marking criterion (1a: 40%, 1b: 30%, 1c: 30%) to exact code snippets, terminal outputs, and dashboard screenshots.",
         "Milestone: Both CW1 and CW2 packages and the complete codebase are tested, documented, and ready to submit."),

        ("DAY 17 (4.0 hrs)", "Phase 6: Final Demo Rehearsal & First-Class Viva Voce Preparation", "D9FF3F",
         "Demo Rehearsal (2 hrs): Practice the 5-minute live walkthrough: (1) Run feed_mock_data.ps1 -> show PAN masking & AES encryption, (2) Trigger child checkout in Chrome Extension -> approve as Parent -> show RSA signature verification, (3) Show IDS blocking SQLi & Encrypted Backup script.",
         "Viva Voce Mastery (2 hrs): Review the Top 10 Viva Voce questions & answers in Section 5 below so you can explain every line of your Python labs and Java security services with total confidence.",
         "FINAL OUTCOME: Complete Project + CW1 + CW2 + 10 Labs finished in 2.5 Weeks!")
    ]

    for day_badge, day_title, color_hex, learn_txt, cw_txt, proj_txt in days_plan:
        tbl = doc.add_table(rows=4, cols=2)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        # Row 0: Header
        c0 = tbl.rows[0].cells[0]
        c1 = tbl.rows[0].cells[1]
        c0.width, c1.width = Inches(1.6), Inches(5.1)
        c0.text = day_badge
        c1.text = day_title
        set_cell_background(c0, "151515")
        set_cell_background(c1, color_hex)
        set_cell_margins(c0, 80, 80, 100, 100)
        set_cell_margins(c1, 80, 80, 100, 100)
        c0.paragraphs[0].runs[0].font.bold = True
        c0.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        c0.paragraphs[0].runs[0].font.size = Pt(9.5)
        c1.paragraphs[0].runs[0].font.bold = True
        c1.paragraphs[0].runs[0].font.color.rgb = INK
        c1.paragraphs[0].runs[0].font.size = Pt(10)

        rows_content = [
            ("1. Learn First\n(CS with AI Concept)", learn_txt, "FFFDF2"),
            ("2. Coursework & Labs\n(NB6005CEM)", cw_txt, "FFFFFF"),
            ("3. Centinel Fin AI\n(Code & Integration)", proj_txt, "F7FFF9")
        ]
        for r_idx, (label, val, bg) in enumerate(rows_content, start=1):
            r = tbl.rows[r_idx]
            r.cells[0].width, r.cells[1].width = Inches(1.6), Inches(5.1)
            r.cells[0].text = label
            r.cells[1].text = val
            set_cell_background(r.cells[0], "E9E6DD")
            set_cell_background(r.cells[1], bg)
            set_cell_margins(r.cells[0], 65, 65, 100, 100)
            set_cell_margins(r.cells[1], 65, 65, 100, 100)
            r.cells[0].paragraphs[0].runs[0].font.bold = True
            r.cells[0].paragraphs[0].runs[0].font.size = Pt(8.8)
            r.cells[1].paragraphs[0].runs[0].font.size = Pt(9.2)

        doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # =========================================================================
    # SECTION 5: TOP 10 VIVA VOCE QUESTIONS & ANSWERS
    # =========================================================================
    add_h1("5", "Viva Voce Cheat Sheet: Top 10 Examiner Questions & Model Answers")
    add_p(
        "Coventry University's assessment brief highlights that you may be asked to explain how your security mechanisms work "
        "in a Viva Voce. Use this reference table to answer with clarity and authority."
    )

    viva_tbl = doc.add_table(rows=11, cols=2)
    viva_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    viva_headers = ["Examiner Question", "Your First-Class Answer (Grounded in Centinel Fin AI)"]
    for j, h in enumerate(viva_headers):
        cell = viva_tbl.rows[0].cells[j]
        cell.text = h
        set_cell_background(cell, "151515")
        set_cell_margins(cell, 80, 80, 100, 100)
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        cell.paragraphs[0].runs[0].font.size = Pt(9.5)

    viva_qa = [
        ("1. Why did you choose AES-256-GCM over DES or AES-ECB?",
         "DES only has a 56-bit key (brute-forced in hours), and AES-ECB encrypts identical blocks into identical ciphertexts, leaking patterns. We use AES/GCM/NoPadding with a 256-bit key and a random 12-byte IV per record, providing both confidentiality and a 128-bit authentication tag that detects tampering."),
        ("2. How do RSA Encryption and RSA Digital Signatures differ in your project?",
         "In Lab 8 (Encryption), the sender encrypts a session key with the receiver's Public Key so only the receiver's Private Key can decrypt it. In Lab 9 & RsaSignatureService (Digital Signatures), our backend hashes the parent's approval decision with SHA-256 and signs it with the backend's Private Key, so the Chrome Extension can verify authenticity with the Public Key."),
        ("3. Why do we hash with SHA-256 before signing with RSA?",
         "First, RSA cannot directly sign payloads larger than its modulus n (256 bytes for RSA-2048), whereas SHA-256 compresses any size data into a fixed 32-byte digest. Second, hashing destroys algebraic relationships that attackers could exploit to forge raw RSA signatures."),
        ("4. Why is MD5 insecure and why do you use HMAC-SHA256 on webhooks?",
         "MD5 suffers from fast collision attacks (Lab 6). Furthermore, a plain SHA-256 hash without a secret key can be recalculated by a Man-in-the-Middle attacker. HMAC-SHA256 mixes a shared secret key into the hash, and we verify it using constant-time MessageDigest.isEqual() to prevent timing attacks."),
        ("5. Why does Lab 10 combine AES and RSA instead of using RSA for everything?",
         "RSA relies on large modular exponentiation (C = M^e mod n), making it roughly 1000x slower than AES bitwise/matrix operations. Hybrid cryptography uses RSA to securely exchange or sign keys, and AES-256-GCM to encrypt the payload at high speed."),
        ("6. Why is the Affine Cipher in Lab 1 & 2 easily broken?",
         "Because gcd(k1, 26) must equal 1 for a modular inverse to exist, there are only 12 valid values for k1 and 26 for k2—giving just 312 total keys. Lab 2 brute-forces all 312 keys and uses English letter frequency analysis to recover the plaintext in under 1 millisecond."),
        ("7. How do S-Boxes and P-Boxes protect modern block ciphers (Lab 3)?",
         "They implement Claude Shannon's Confusion and Diffusion. The S-Box performs non-linear substitution so attackers cannot set up linear equations to solve for the key, while the P-Box permutes bit positions so changing 1 plaintext bit cascades across the entire block."),
        ("8. How does Centinel Fin AI prevent a Child from approving their own purchase?",
         "SecurityConfig.java validates the Supabase JWT signature (ES256/RS256) via JWKS, resolves the user's authoritative role from PostgreSQL (AC-82), and enforces hasAuthority('ROLE_PARENT') on /approve and /deny endpoints, while PurchaseRequestService verifies family ownership."),
        ("9. How do you ensure sensitive financial data is not leaked to the Gemini AI model?",
         "Every incoming notification passes through SensitiveDataMaskingService first, which strips Luhn-valid credit card numbers (PANs), account numbers, and phone numbers via regex before the text ever reaches MerchantCategorizationService or the Gemini API."),
        ("10. How did you implement System-Level Security for CW2 Task 1c?",
         "Through three layers: (1) IntrusionDetectionFilter.java scanning requests for SQLi/XSS signatures and rate-limiting brute-force bursts, (2) host firewall scripts enforcing Default-Deny ingress, and (3) automated_encrypted_backup.py creating AES-256-GCM encrypted, RSA-signed database backups.")
    ]

    for idx, (q, a) in enumerate(viva_qa, start=1):
        row = viva_tbl.rows[idx]
        row.cells[0].width, row.cells[1].width = Inches(2.2), Inches(4.5)
        row.cells[0].text, row.cells[1].text = q, a
        set_cell_margins(row.cells[0], 65, 65, 100, 100)
        set_cell_margins(row.cells[1], 65, 65, 100, 100)
        set_cell_background(row.cells[0], "E9E6DD" if idx % 2 == 1 else "F4F2EC")
        set_cell_background(row.cells[1], "FFFDF7" if idx % 2 == 1 else "FFFFFF")
        row.cells[0].paragraphs[0].runs[0].font.bold = True
        row.cells[0].paragraphs[0].runs[0].font.size = Pt(8.8)
        row.cells[1].paragraphs[0].runs[0].font.size = Pt(8.8)

    # Save to all 3 locations for easy access
    out_docs = os.path.join(DOCS_DIR, "NB6005CEM_Centinel_Fin_AI_17_Day_Master_Plan.docx")
    out_cw = os.path.join(CW_DIR, "NB6005CEM_Centinel_Fin_AI_17_Day_Master_Plan.docx")
    out_root = os.path.join(ROOT_DIR, "NB6005CEM_Centinel_Fin_AI_17_Day_Master_Plan.docx")

    doc.save(out_docs)
    shutil.copyfile(out_docs, out_cw)
    shutil.copyfile(out_docs, out_root)
    print(f"Saved Word Document to:\n  1. {out_docs}\n  2. {out_cw}\n  3. {out_root}")


if __name__ == "__main__":
    d1, d2, d3, d4 = generate_plan_diagrams()
    build_master_plan_docx(d1, d2, d3, d4)
