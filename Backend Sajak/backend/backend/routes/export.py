"""Export routes — generate CSV / Excel / PDF attendance reports.

Endpoint:
    POST /api/admin/export-report
    Body: { "report_type": str, "format": str, "period": str,
            "batch_id": int|null, "class_id": int|null,
            "student_id": int|null, "risk": str|null, "search": str|null }

report_type values  : full | atrisk | class | waiver | weekly | monthly
                      | batch | class_roster | student   ← new in step 8
format values       : csv  | excel  | pdf
period values       : This Week | This Month | Last Month |
                      This Semester | Custom Range
"""

import io
import logging
from datetime import datetime, timezone, timedelta

from flask import Blueprint, Response, g, request, jsonify
from sqlalchemy import func, case

from database import db
from models.attendance import AttendanceRecord
from models.batch import Batch, BatchStudent
from models.batch_class_link import BatchClassLink
from models.class_model import Class, Enrollment
from models.excuse import WaiverRequest
from models.session import Session
from models.student import Student
from models.user import User
from middleware.auth_middleware import require_role

logger = logging.getLogger(__name__)

export_bp = Blueprint("export", __name__)

# ── Period helpers ─────────────────────────────────────────────────────────────

def _period_range(period: str):
    """Return (start_dt, end_dt) UTC datetimes for the selected period.

    Returns (None, None) when period is 'Custom Range' — the caller falls
    back to returning all records (no date filter).
    """
    now = datetime.now(timezone.utc)
    today = now.date()

    if period == "This Week":
        # Monday of current week → today
        start = today - timedelta(days=today.weekday())
        end   = today
    elif period == "This Month":
        start = today.replace(day=1)
        end   = today
    elif period == "Last Month":
        first_this = today.replace(day=1)
        last_prev  = first_this - timedelta(days=1)
        start = last_prev.replace(day=1)
        end   = last_prev
    elif period == "This Semester":
        # Rough split: Jan–Jun = semester 1, Jul–Dec = semester 2
        if today.month <= 6:
            start = today.replace(month=1, day=1)
        else:
            start = today.replace(month=7, day=1)
        end = today
    else:
        # Custom Range — no filter
        return None, None

    start_dt = datetime(start.year, start.month, start.day, 0, 0, 0, tzinfo=timezone.utc)
    end_dt   = datetime(end.year,   end.month,   end.day,   23, 59, 59, tzinfo=timezone.utc)
    return start_dt, end_dt


# ── Data builders — return list of dicts ─────────────────────────────────────

def _get_full_data(start_dt, end_dt):
    """All students × all sessions within the period."""
    rows = []
    students = Student.query.all()
    for s in students:
        name = s.user.fullname if s.user else "Unknown"
        records_q = AttendanceRecord.query.filter_by(student_id=s.student_id)
        if start_dt and end_dt:
            records_q = records_q.join(Session).filter(
                Session.start_time >= start_dt,
                Session.start_time <= end_dt,
            )
        records = records_q.all()
        total   = len(records)
        present = sum(1 for r in records if r.status == "Present")
        pct     = round(present / total * 100, 1) if total else 0.0
        rows.append({
            "Student Name":    name,
            "Roll Number":     s.roll_number,
            "Total Sessions":  total,
            "Present":         present,
            "Absent":          total - present,
            "Attendance %":    pct,
            "At Risk":         "Yes" if pct < 75 else "No",
        })
    return rows


def _get_atrisk_data(start_dt, end_dt):
    rows = [r for r in _get_full_data(start_dt, end_dt) if r["At Risk"] == "Yes"]
    return rows


def _get_class_data(start_dt, end_dt):
    rows = []
    classes = Class.query.all()
    for cls in classes:
        sessions_q = Session.query.filter_by(class_id=cls.class_id)
        if start_dt and end_dt:
            sessions_q = sessions_q.filter(
                Session.start_time >= start_dt,
                Session.start_time <= end_dt,
            )
        sessions   = sessions_q.all()
        total_sess = len(sessions)
        sess_ids   = [s.session_id for s in sessions]

        enrollments = Enrollment.query.filter_by(class_id=cls.class_id).all()
        for enr in enrollments:
            student = enr.student
            if not student:
                continue
            name    = student.user.fullname if student.user else "Unknown"
            present = (
                AttendanceRecord.query.filter(
                    AttendanceRecord.student_id == student.student_id,
                    AttendanceRecord.session_id.in_(sess_ids),
                    AttendanceRecord.status == "Present",
                ).count() if sess_ids else 0
            )
            pct = round(present / total_sess * 100, 1) if total_sess else 0.0
            rows.append({
                "Class":           cls.class_name,
                "Subject":         cls.subject,
                "Room":            cls.room or "N/A",
                "Student Name":    name,
                "Roll Number":     student.roll_number,
                "Total Sessions":  total_sess,
                "Present":         present,
                "Absent":          total_sess - present,
                "Attendance %":    pct,
            })
    return rows


def _get_waiver_data(start_dt, end_dt):
    rows = []
    q = WaiverRequest.query
    if start_dt and end_dt:
        q = q.filter(
            WaiverRequest.submitted_at >= start_dt,
            WaiverRequest.submitted_at <= end_dt,
        )
    for w in q.order_by(WaiverRequest.submitted_at.desc()).all():
        student = Student.query.get(w.student_id)
        # Resolve class name via session
        session = Session.query.get(w.session_id) if w.session_id else None
        cls     = Class.query.get(session.class_id) if session else None
        rows.append({
            "Student Name": student.user.fullname if student and student.user else "Unknown",
            "Roll Number":  student.roll_number if student else "N/A",
            "Class":        cls.class_name if cls else "N/A",
            "Reason":       w.reason or "",
            "Status":       w.status or "Pending",
            "Submitted At": w.submitted_at.strftime("%Y-%m-%d %H:%M") if w.submitted_at else "",
        })
    return rows


def _get_weekly_data():
    start_dt, end_dt = _period_range("This Week")
    return _get_full_data(start_dt, end_dt)


def _get_monthly_data():
    start_dt, end_dt = _period_range("This Month")
    return _get_full_data(start_dt, end_dt)


# ── Step 8: scoped data builders ──────────────────────────────────────────────

def _get_batch_data(batch_id: int) -> list:
    """All students in a batch × all classes linked to that batch."""
    batch = Batch.query.get(batch_id)
    if not batch:
        return []

    batch_student_ids = [
        bs.student_id
        for bs in BatchStudent.query.filter_by(batch_id=batch_id).all()
    ]
    linked_class_ids = [
        lnk.class_id
        for lnk in BatchClassLink.query.filter_by(batch_id=batch_id).all()
    ]

    rows = []
    for student_id in batch_student_ids:
        student = Student.query.get(student_id)
        if not student:
            continue
        name = student.user.fullname if student.user else "Unknown"

        for class_id in linked_class_ids:
            cls = Class.query.get(class_id)
            if not cls:
                continue

            sess_ids = [
                s.session_id
                for s in Session.query.filter_by(class_id=class_id).all()
            ]
            total_sess = len(sess_ids)
            present = (
                AttendanceRecord.query.filter(
                    AttendanceRecord.student_id == student_id,
                    AttendanceRecord.session_id.in_(sess_ids),
                    AttendanceRecord.status == "Present",
                ).count() if sess_ids else 0
            )
            pct = round(present / total_sess * 100, 1) if total_sess else 0.0
            rows.append({
                "Batch":           batch.batch_name,
                "Class":           cls.class_name,
                "Subject":         cls.subject,
                "Student Name":    name,
                "Roll Number":     student.roll_number,
                "Total Sessions":  total_sess,
                "Present":         present,
                "Absent":          total_sess - present,
                "Attendance %":    pct,
                "At Risk":         "Yes" if pct < 75 else "No",
            })

    return rows


def _get_class_roster_data(class_id: int, risk: str = "all", search: str = "") -> list:
    """Roster for a single class, optionally filtered by risk tier and search.

    This mirrors the logic in GET /api/admin/classes/<class_id>/students so
    the export always matches exactly what the admin sees on screen.
    """
    cls = Class.query.get(class_id)
    if not cls:
        return []

    sess_ids = [
        s.session_id
        for s in Session.query.filter_by(class_id=class_id).all()
    ]
    total_sess = len(sess_ids)

    enrollments = Enrollment.query.filter_by(class_id=class_id).all()
    rows = []
    search_lower = (search or "").strip().lower()

    for enr in enrollments:
        student = enr.student
        if not student:
            continue
        name = student.user.fullname if student.user else "Unknown"
        roll = student.roll_number or ""

        # Search filter
        if search_lower and search_lower not in name.lower() and search_lower not in roll.lower():
            continue

        present = (
            AttendanceRecord.query.filter(
                AttendanceRecord.student_id == student.student_id,
                AttendanceRecord.session_id.in_(sess_ids),
                AttendanceRecord.status == "Present",
            ).count() if sess_ids else 0
        )
        pct = round(present / total_sess * 100, 1) if total_sess else 0.0
        is_at_risk = pct < 75 if total_sess > 0 else False

        # Risk filter
        if risk == "at_risk" and not is_at_risk:
            continue
        if risk == "good" and is_at_risk:
            continue

        rows.append({
            "Class":          cls.class_name,
            "Subject":        cls.subject,
            "Student Name":   name,
            "Roll Number":    roll,
            "Total Sessions": total_sess,
            "Present":        present,
            "Absent":         total_sess - present,
            "Attendance %":   pct,
            "At Risk":        "Yes" if is_at_risk else "No",
        })

    # Default sort: attendance ascending (at-risk students first)
    rows.sort(key=lambda r: r["Attendance %"])
    return rows


def _get_student_data(student_id: int) -> list:
    """Full class breakdown + all session records for a single student."""
    student = Student.query.get(student_id)
    if not student:
        return []

    name = student.user.fullname if student.user else "Unknown"
    enrollments = Enrollment.query.filter_by(student_id=student_id).all()

    rows = []
    for enr in enrollments:
        cls = enr.class_
        if not cls:
            continue

        sess_ids = [
            s.session_id
            for s in Session.query.filter_by(class_id=cls.class_id).all()
        ]
        total_sess = len(sess_ids)
        present = (
            AttendanceRecord.query.filter(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.session_id.in_(sess_ids),
                AttendanceRecord.status == "Present",
            ).count() if sess_ids else 0
        )
        pct = round(present / total_sess * 100, 1) if total_sess else 0.0

        rows.append({
            "Student Name":   name,
            "Roll Number":    student.roll_number,
            "Class":          cls.class_name,
            "Subject":        cls.subject,
            "Total Sessions": total_sess,
            "Present":        present,
            "Absent":         total_sess - present,
            "Attendance %":   pct,
            "At Risk":        "Yes" if (total_sess > 0 and pct < 75) else "No",
        })

    rows.sort(key=lambda r: r["Class"].lower())
    return rows


# ── Format builders ───────────────────────────────────────────────────────────

def _build_csv(rows: list, title: str) -> bytes:
    import csv

    if not rows:
        return f"{title}\nNo data available for the selected period.\n".encode("utf-8")

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def _build_excel(rows: list, title: str) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]  # Excel sheet name max 31 chars

    if not rows:
        ws["A1"] = title
        ws["A2"] = "No data available for the selected period."
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    # ── Header row ────────────────────────────────────────────────────
    HEADER_FILL  = PatternFill("solid", fgColor="2952E3")
    HEADER_FONT  = Font(bold=True, color="FFFFFF", size=11)
    ALT_FILL     = PatternFill("solid", fgColor="EEF2FF")
    BORDER_SIDE  = Side(style="thin", color="C8CEDE")
    CELL_BORDER  = Border(
        left=BORDER_SIDE, right=BORDER_SIDE,
        top=BORDER_SIDE,  bottom=BORDER_SIDE,
    )

    headers = list(rows[0].keys())
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font      = HEADER_FONT
        cell.fill      = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border    = CELL_BORDER

    # ── Data rows ─────────────────────────────────────────────────────
    for row_idx, row_data in enumerate(rows, start=2):
        fill = ALT_FILL if row_idx % 2 == 0 else None
        for col_idx, key in enumerate(headers, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=row_data[key])
            if fill:
                cell.fill = fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border    = CELL_BORDER

    # ── Auto-fit column widths ────────────────────────────────────────
    for col_idx, header in enumerate(headers, start=1):
        col_letter = get_column_letter(col_idx)
        max_len = max(
            len(str(header)),
            *(len(str(rows[r][header])) for r in range(len(rows))),
        )
        ws.column_dimensions[col_letter].width = min(max_len + 4, 40)

    # Freeze header row
    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _build_pdf(rows: list, title: str) -> bytes:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=15 * mm,  bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    BLUE   = colors.HexColor("#2952E3")
    LTBLUE = colors.HexColor("#EEF2FF")

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=16,
        textColor=BLUE,
        spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        "ReportSub",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.grey,
        spaceAfter=10,
    )

    story = [
        Paragraph(title, title_style),
        Paragraph(
            f"Generated: {datetime.now().strftime('%d %B %Y, %H:%M')}",
            sub_style,
        ),
        Spacer(1, 4 * mm),
    ]

    if not rows:
        story.append(Paragraph("No data available for the selected period.", styles["Normal"]))
        doc.build(story)
        return buf.getvalue()

    headers  = list(rows[0].keys())
    n_cols   = len(headers)
    page_w   = landscape(A4)[0] - 30 * mm   # usable width
    col_w    = page_w / n_cols

    table_data = [headers] + [[str(r[h]) for h in headers] for r in rows]

    tbl = Table(table_data, colWidths=[col_w] * n_cols, repeatRows=1)
    tbl.setStyle(TableStyle([
        # Header
        ("BACKGROUND",  (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0), 9),
        ("ALIGN",       (0, 0), (-1, 0), "CENTER"),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING",  (0, 0), (-1, 0), 6),
        # Alternating rows
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LTBLUE]),
        # Data cells
        ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",    (0, 1), (-1, -1), 8),
        ("ALIGN",       (0, 1), (-1, -1), "CENTER"),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",  (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        # Grid
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.HexColor("#C8CEDE")),
    ]))
    story.append(tbl)

    doc.build(story)
    return buf.getvalue()


# ── Report type router ────────────────────────────────────────────────────────

REPORT_LABELS = {
    "full":         "Full Attendance Report",
    "atrisk":       "At-Risk Students Report",
    "class":        "Per Class Attendance Report",
    "waiver":       "Waiver Summary",
    "weekly":       "Weekly Attendance Summary",
    "monthly":      "Monthly Attendance Report",
    # Step 8 additions
    "batch":        "Batch Attendance Report",
    "class_roster": "Class Roster Report",
    "student":      "Student Attendance Report",
}


def _get_rows(report_type: str, start_dt, end_dt,
              batch_id=None, class_id=None, student_id=None,
              risk="all", search="") -> tuple:
    """Return (rows, title)."""
    label = REPORT_LABELS.get(report_type, "Attendance Report")
    if report_type == "full":
        return _get_full_data(start_dt, end_dt), label
    elif report_type == "atrisk":
        return _get_atrisk_data(start_dt, end_dt), label
    elif report_type == "class":
        return _get_class_data(start_dt, end_dt), label
    elif report_type == "waiver":
        return _get_waiver_data(start_dt, end_dt), label
    elif report_type == "weekly":
        return _get_weekly_data(), label
    elif report_type == "monthly":
        return _get_monthly_data(), label
    # ── Step 8 scoped types ───────────────────────────────────────────
    elif report_type == "batch":
        return _get_batch_data(batch_id), label
    elif report_type == "class_roster":
        return _get_class_roster_data(class_id, risk=risk, search=search), label
    elif report_type == "student":
        return _get_student_data(student_id), label
    else:
        return [], label


# ── Endpoint ──────────────────────────────────────────────────────────────────

@export_bp.route("/export-report", methods=["POST"])
@require_role("admin")
def export_report():
    """Generate and return a report file.

    Body (JSON):
      {
        "report_type": "full" | "atrisk" | "class" | "waiver" | "weekly" | "monthly"
                       | "batch" | "class_roster" | "student",
        "format":      "csv"  | "excel"  | "pdf",
        "period":      "This Week" | "This Month" | "Last Month" |
                       "This Semester" | "Custom Range",

        -- Scoped report params (only required for their respective type) --
        "batch_id":    int,      -- required for report_type="batch"
        "class_id":    int,      -- required for report_type="class_roster"
        "student_id":  int,      -- required for report_type="student"
        "risk":        "all" | "at_risk" | "good",   -- optional, class_roster only
        "search":      str,      -- optional, class_roster only
      }

    Returns the file as a binary download response.
    """
    data = request.get_json(silent=True) or {}

    report_type = (data.get("report_type") or "full").strip().lower()
    fmt         = (data.get("format")      or "csv" ).strip().lower()
    period      = (data.get("period")      or "This Month").strip()

    # Scoped params
    batch_id   = data.get("batch_id")
    class_id   = data.get("class_id")
    student_id = data.get("student_id")
    risk       = (data.get("risk")   or "all").strip().lower()
    search     = (data.get("search") or "").strip()

    valid_reports = {
        "full", "atrisk", "class", "waiver", "weekly", "monthly",
        "batch", "class_roster", "student",
    }
    valid_formats = {"csv", "excel", "pdf"}
    valid_risk    = {"all", "at_risk", "good"}

    if report_type not in valid_reports:
        return jsonify({"error": f"Invalid report_type. Must be one of: {', '.join(sorted(valid_reports))}"}), 400
    if fmt not in valid_formats:
        return jsonify({"error": f"Invalid format. Must be one of: {', '.join(sorted(valid_formats))}"}), 400
    if risk not in valid_risk:
        return jsonify({"error": f"Invalid risk. Must be one of: {', '.join(sorted(valid_risk))}"}), 400

    # Validate required scoping IDs
    if report_type == "batch" and not batch_id:
        return jsonify({"error": "batch_id is required for report_type='batch'"}), 400
    if report_type == "class_roster" and not class_id:
        return jsonify({"error": "class_id is required for report_type='class_roster'"}), 400
    if report_type == "student" and not student_id:
        return jsonify({"error": "student_id is required for report_type='student'"}), 400

    # Override period for fixed-range types
    if report_type == "weekly":
        period = "This Week"
    elif report_type == "monthly":
        period = "This Month"

    start_dt, end_dt = _period_range(period)
    rows, title      = _get_rows(
        report_type, start_dt, end_dt,
        batch_id=batch_id, class_id=class_id, student_id=student_id,
        risk=risk, search=search,
    )

    # Build a clean filename incorporating scope context
    period_slug = period.replace(" ", "_")
    if report_type == "batch" and batch_id:
        batch = Batch.query.get(batch_id)
        scope_slug = f"Batch_{(batch.batch_name if batch else str(batch_id)).replace(' ', '_')}"
    elif report_type == "class_roster" and class_id:
        cls = Class.query.get(class_id)
        scope_slug = f"Class_{(cls.class_name if cls else str(class_id)).replace(' ', '_')}"
        if risk != "all":
            scope_slug += f"_{risk}"
    elif report_type == "student" and student_id:
        student = Student.query.get(student_id)
        scope_slug = f"Student_{(student.roll_number if student else str(student_id)).replace(' ', '_')}"
    else:
        scope_slug = period_slug

    base_name = f"{report_type.capitalize()}_Report_{scope_slug}"

    try:
        if fmt == "csv":
            file_bytes = _build_csv(rows, title)
            mime       = "text/csv"
            filename   = f"{base_name}.csv"

        elif fmt == "excel":
            file_bytes = _build_excel(rows, title)
            mime       = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename   = f"{base_name}.xlsx"

        else:  # pdf
            file_bytes = _build_pdf(rows, title)
            mime       = "application/pdf"
            filename   = f"{base_name}.pdf"

    except Exception as exc:
        logger.exception("export-report: file generation failed: %s", exc)
        return jsonify({"error": "Failed to generate report file", "detail": str(exc)}), 500

    logger.info(
        "export-report: type=%s format=%s scope=batch:%s class:%s student:%s risk=%s rows=%d",
        report_type, fmt, batch_id, class_id, student_id, risk, len(rows),
    )

    return Response(
        file_bytes,
        status=200,
        mimetype=mime,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length":      str(len(file_bytes)),
        },
    )
