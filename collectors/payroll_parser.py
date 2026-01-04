import argparse
import json
import os
import re
import sys
import base64
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF

# Windowsでの文字化け対策: 標準出力をUTF-8に強制
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- Constants & Configuration ---

_RE_NUMBER_TOKEN = re.compile(r'[+-]?[0-9][0-9,]*(?:\.[0-9]+)?')
_RE_LABEL_NUM = re.compile(r'(?P<label>[^:\s][^:]*?)\s*:\s*(?P<num>[+-]?[0-9][0-9,]*(?:\.[0-9]+)?)')
_RE_NUMBER_FULL = re.compile(r"[+-]?[0-9]+(?:\.[0-9]+)?")
_RE_DATE_YM = re.compile(r"(20\d{2})年[ \u3000]*([01]?\d)月")
_LABEL_ALLOWED = re.compile(r"^[\wぁ-んァ-ヶ一-龠\[\]［］（）()・\-＋~\sA-Za-z0-9【】《》●]+$")

_TRANSLATE_MAP = str.maketrans({
    "０": "0", "１": "1", "２": "2", "３": "3", "４": "4",
    "５": "5", "６": "6", "７": "7", "８": "8", "９": "9",
    "，": ",", "．": ".", "：": ":", "　": " ",
    "（": "(", "）": ")",
    "￥": "", "¥": "", "−": "-", "―": "-"
})
_DECORATIVE_MAP = str.maketrans({
    "［": "", "］": "", "[": "", "]": "",
    "【": "", "】": "", "《": "", "》": "", "●": ""
})

# --- Helper Functions ---

def _normalize(s: str) -> str:
    return s.translate(_TRANSLATE_MAP).strip()

def _sanitize_label(label: str) -> str:
    t = _normalize(label).translate(_DECORATIVE_MAP).strip()
    return re.sub(r"\s+", " ", t)

def _is_valid_label(label: str) -> bool:
    t = _sanitize_label(label)
    if not t or len(t) > 40: return False
    if "、" in t or "。" in t: return False
    return bool(_LABEL_ALLOWED.fullmatch(t))

def _is_heading_line(s: str) -> bool:
    t = _normalize(s).lstrip()
    if t.startswith(("《", "◆", "【", "●")): return True
    if t and all(ch in "《》◆【】●" for ch in t): return True
    return False

def _extract_month_iso(blocks) -> Optional[str]:
    texts = []
    for b in blocks:
        t = str(b[4]) if len(b) > 5 else ""
        texts.append(t)
        mm = _RE_DATE_YM.search(t)
        if mm:
            y, m = int(mm.group(1)), int(mm.group(2))
            if 1 <= m <= 12: return f"{y:04d}-{m:02d}-01"
    return None

def _kubun_from_filename(path: str) -> str:
    head = os.path.basename(path)[:3].upper()
    if head == "SYO": return "賞与"
    return "給与"

def extract_kvs_from_text(text: str) -> Dict[str, str]:
    kvs: Dict[str, str] = {}
    pending_label = None
    lines = str(text).splitlines()

    for raw in lines:
        if _is_heading_line(raw): continue
        s = _normalize(raw)
        if pending_label:
            m0 = _RE_NUMBER_TOKEN.match(s)
            if m0:
                kvs[pending_label] = _normalize(m0.group(0)).replace(",", "")
                pending_label = None
                s = s[m0.end():].lstrip()

        for m in _RE_LABEL_NUM.finditer(s):
            label = _sanitize_label(m.group('label'))
            num = _normalize(m.group('num')).replace(",", "")
            if _RE_NUMBER_FULL.fullmatch(num) and _is_valid_label(label):
                kvs[label] = num

        if s.endswith(":"):
            idx = s.rfind(':')
            label_candidate = s[:idx].strip()
            if label_candidate and _is_valid_label(label_candidate):
                pending_label = _sanitize_label(label_candidate)
    return kvs

def parse_pdf(pdf_path: str) -> Optional[Dict[str, Any]]:
    if not os.path.exists(pdf_path): return None
    kubun = _kubun_from_filename(pdf_path)
    
    with fitz.open(pdf_path) as doc:
        if len(doc) == 0: return None
        page = doc[0]
        
        # スナップショット作成 (高解像度)
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        img_bytes = pix.tobytes("png")
        base64_img = base64.b64encode(img_bytes).decode('utf-8')
        
        # テキスト解析
        blocks = page.get_text("blocks", sort=True)
        month_iso = _extract_month_iso(blocks)
        
        extracted_data = {}
        for block in blocks:
            text = str(block[4]).strip()
            kvs = extract_kvs_from_text(text)
            for k, v in kvs.items():
                extracted_data[k] = v

        return {
            "month": month_iso,
            "type": kubun,
            "snapshot": f"data:image/png;base64,{base64_img}",
            "details": extracted_data
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    args = parser.parse_args()
    
    result = parse_pdf(args.pdf_path)
    if result:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(json.dumps({"error": "Failed to parse PDF"}, ensure_ascii=False))