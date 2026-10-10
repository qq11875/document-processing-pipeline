from pathlib import Path
import pymupdf
from .models import ExtractionResult, ExtractionMethod

def has_meaningful_text(text: str) -> bool:
    return len(text.strip()) >= 20

def extract_pdf_embedded_text(path: Path) -> ExtractionResult | None:
    document = pymupdf.open(path)

    text = []

    for page in document:
        text.append(page.get_text())

    extracted_text = "\n".join(text)

    if has_meaningful_text(extracted_text):
        return ExtractionResult(
            text=extracted_text,
            extraction_method=ExtractionMethod.PDF_TEXT,
        )

    else:
        return None

def extract_pdf_text_with_ocr(path: Path) -> ExtractionResult | None:
    document = pymupdf.open(path)
    
    extracted_text = ""
    
    for page in document:
        text_page = page.get_textpage_ocr()
        text = page.get_text(
            "text",
            flags=pymupdf.TEXT_PRESERVE_WHITESPACE,
            textpage=text_page,
        )
    
        extracted_text += text
    
    if extracted_text.strip():
        return ExtractionResult(
            text=extracted_text,
            extraction_method=ExtractionMethod.PDF_OCR,
        )
    
    return None


if __name__ == "__main__":

    file_path = Path(__file__).parent.parent.parent / "test_documents" / "word_extract_sample.pdf"

    extracted_text = extract_pdf_text_with_ocr(file_path)

    print(extracted_text)

