import argparse
import base64
import io
import json
import os
import re
import sys
import unicodedata
from typing import Any, Dict, Iterable, Optional

import fitz

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

MONTH_PATTERN = re.compile(r"(20\d{2})\s*年\s*([01]?\d)\s*月")
TRAILING_NUMBER_PATTERN = re.compile(
    r"^(?P<label>.+?)(?:[:：\s]+)(?P<number>[+-]?[0-9][0-9,]*(?:\.[0-9]+)?)$"
)
INLINE_NUMBER_PATTERN = re.compile(
    r"(?P<label>[^:：\n]+?)\s*[:：]\s*(?P<number>[+-]?[0-9][0-9,]*(?:\.[0-9]+)?)"
)
NUMBER_ONLY_PATTERN = re.compile(r"^[+-]?[0-9][0-9,]*(?:\.[0-9]+)?$")

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
    normalized = unicodedata.normalize("NFKC", value or "")
    normalized = normalized.replace("\u3000", " ")
    normalized = normalized.replace("¥", "")
    return normalized.strip()


def clean_number(value: str) -> str:
    return normalize_text(value).replace(",", "")


def clean_label(value: str) -> str:
    label = normalize_text(value)
    label = re.sub(r"\s+", " ", label)
    return label.strip(" :：-")


def is_valid_label(label: str) -> bool:
    if not label or len(label) > 40:
      return False
    if NUMBER_ONLY_PATTERN.fullmatch(label):
      return False
    return label not in NOISE_LABELS


def extract_month_iso(text: str) -> Optional[str]:
    match = MONTH_PATTERN.search(normalize_text(text))
    if not match:
        return None

    year = int(match.group(1))
    month = int(match.group(2))
    if not 1 <= month <= 12:
        return None

    return f"{year:04d}-{month:02d}-01"


def classify_slip_type(pdf_path: str) -> str:
    filename = os.path.basename(pdf_path).upper()
    if filename.startswith("SYO"):
        return "賞与"
    return "給与"


def iter_lines(page_text: str) -> Iterable[str]:
    for raw_line in page_text.splitlines():
        line = normalize_text(raw_line)
        if line:
            yield line


def extract_details(page_text: str) -> Dict[str, str]:
    details: Dict[str, str] = {}
    pending_label: Optional[str] = None

    for line in iter_lines(page_text):
        if pending_label and NUMBER_ONLY_PATTERN.fullmatch(line):
            details[pending_label] = clean_number(line)
            pending_label = None
            continue

        for match in INLINE_NUMBER_PATTERN.finditer(line):
            label = clean_label(match.group("label"))
            number = clean_number(match.group("number"))
            if is_valid_label(label):
                details[label] = number

        trailing_match = TRAILING_NUMBER_PATTERN.match(line)
        if trailing_match:
            label = clean_label(trailing_match.group("label"))
            number = clean_number(trailing_match.group("number"))
            if is_valid_label(label):
                details[label] = number
                pending_label = None
                continue

        if line.endswith(":") or line.endswith("："):
            label = clean_label(line[:-1])
            pending_label = label if is_valid_label(label) else None
            continue

        pending_label = None

    return details


def parse_pdf(pdf_path: str) -> Optional[Dict[str, Any]]:
    if not os.path.exists(pdf_path):
        return None

    with fitz.open(pdf_path) as document:
        if len(document) == 0:
            return None

        page = document[0]
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        snapshot = base64.b64encode(pixmap.tobytes("png")).decode("utf-8")
        page_text = page.get_text("text", sort=True)
        month = extract_month_iso(page_text)
        details = extract_details(page_text)

        if not details:
            return {"error": "No payroll fields found"}

        return {
            "month": month,
            "type": classify_slip_type(pdf_path),
            "snapshot": f"data:image/png;base64,{snapshot}",
            "details": details,
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    args = parser.parse_args()

    result = parse_pdf(args.pdf_path)
    print(json.dumps(result or {"error": "Failed to parse PDF"}, ensure_ascii=False))
