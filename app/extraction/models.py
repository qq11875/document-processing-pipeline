from dataclasses import dataclass
from enum import Enum

class ExtractionMethod(str, Enum):
    PDF_TEXT = "pdf_text"
    PDF_OCR = "pdf_ocr"
    DOCX = "docx"

@dataclass
class ExtractionResult:
    text: str
    extraction_method: ExtractionMethod