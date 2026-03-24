import json
import re
from http.server import BaseHTTPRequestHandler
from io import BytesIO
from typing import Optional

import fitz

MONTH_PATTERN = re.compile(r"(20\d{2})\s*年\s*([01]?\d)\s*月")
INLINE_NUMBER_PATTERN = re.compile(r"([^:：\n]+?)\s*[:：]\s*([+-]?[0-9][0-9,]*(?:\.\d+)?)")
TRAILING_NUMBER_PATTERN = re.compile(r"^(.+?)(?:[:：\s]+)([+-]?[0-9][0-9,]*(?:\.\d+)?)$")
NUMBER_ONLY_PATTERN = re.compile(r"^[+-]?[0-9][0-9,]*(?:\.\d+)?$")

NOISE_LABELS = {
    "支給",
    "控除",
    "勤怠",
    "備考",
    "摘要",
    "所属",
    "社員番号",
    "氏名",
    "明細",
}


def normalize_text(value: str) -> str:
    return (value or "").replace("\u3000", " ").replace("¥", "").strip()


def clean_number(value: str) -> str:
    return normalize_text(value).replace(",", "")


def clean_label(value: str) -> str:
    return re.sub(r"^[:：\-\s]+|[:：\-\s]+$", "", normalize_text(value))


def is_valid_label(label: str) -> bool:
    return bool(label) and len(label) <= 40 and not NUMBER_ONLY_PATTERN.match(label) and label not in NOISE_LABELS


def extract_month(text: str) -> Optional[str]:
    match = MONTH_PATTERN.search(normalize_text(text))
    if not match:
        return None
    year = int(match.group(1))
    month = int(match.group(2))
    if month < 1 or month > 12:
        return None
    return f"{year:04d}-{month:02d}-01"


def classify_slip_type(file_name: str) -> str:
    return "賞与" if file_name.upper().startswith("SYO") else "給与"


def extract_details(text: str) -> dict[str, str]:
    details: dict[str, str] = {}
    pending_label: Optional[str] = None

    for raw_line in text.splitlines():
      line = normalize_text(raw_line)
      if not line:
          continue

      if pending_label and NUMBER_ONLY_PATTERN.match(line):
          details[pending_label] = clean_number(line)
          pending_label = None
          continue

      for label, number in INLINE_NUMBER_PATTERN.findall(line):
          normalized_label = clean_label(label)
          if is_valid_label(normalized_label):
              details[normalized_label] = clean_number(number)

      trailing = TRAILING_NUMBER_PATTERN.match(line)
      if trailing:
          normalized_label = clean_label(trailing.group(1))
          if is_valid_label(normalized_label):
              details[normalized_label] = clean_number(trailing.group(2))
              pending_label = None
              continue

      if line.endswith(":") or line.endswith("："):
          normalized_label = clean_label(line[:-1])
          pending_label = normalized_label if is_valid_label(normalized_label) else None
          continue

      pending_label = None

    return details


def parse_pdf_bytes(pdf_bytes: bytes, file_name: str):
    with fitz.open(stream=BytesIO(pdf_bytes), filetype="pdf") as document:
        if len(document) == 0:
            raise ValueError("PARSER_EXTRACTION_FAILED")

        page = document[0]
        text = page.get_text("text", sort=True)
        details = extract_details(text)
        if not details:
            raise ValueError("PARSER_EXTRACTION_FAILED")

        return {
            "month": extract_month(text),
            "type": classify_slip_type(file_name),
            "details": details,
        }


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("content-length", "0"))
            file_name = self.headers.get("x-payroll-filename", "payroll.pdf")
            body = self.rfile.read(content_length)

            if not body:
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": "NO_FILE_PROVIDED"}).encode("utf-8"))
                return

            result = parse_pdf_bytes(body, file_name)

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "data": result}, ensure_ascii=False).encode("utf-8"))
        except ValueError as error:
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(error)}, ensure_ascii=False).encode("utf-8"))
        except Exception as error:
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                json.dumps({"success": False, "error": f"UNEXPECTED_PAYROLL_ERROR:{error}"}, ensure_ascii=False).encode("utf-8")
            )
