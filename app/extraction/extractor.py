
from pathlib import Path
from .models import ExtractionResult
from pathlib import Path
from .exception import ExtractionError, NoTextExtractedError


class Extractor:
    def extract(self, path: Path) -> ExtractionResult:
        raise NotImplementedError("Subclasses must implement the extract method.")


class PDFExtractor(Extractor):
    def extract(self, path: Path) -> ExtractionResult:

        try:
            from .pdf import extract_pdf_embedded_text
            result = extract_pdf_embedded_text(path)
        except Exception as e:
            raise ExtractionError(f"PDF extraction failed: {e}")

        if result is not None:
            return result

        try:
            from .pdf import extract_pdf_text_with_ocr
            result = extract_pdf_text_with_ocr(path)
        except Exception as e:
            raise ExtractionError(f"PDF extraction and OCR failed: {e}")

        if result is None:
            raise NoTextExtractedError("No text could be extracted from the PDF.")

        return result

class DOCXExtractor(Extractor):
    def extract(self, path: Path) -> ExtractionResult:
        try:
            from .docx import extract_docx_text
            result = extract_docx_text(path)
        except Exception as e:
            raise ExtractionError(f"DOCX extraction failed: {e}")

        if result is None:
            raise NoTextExtractedError("No text could be extracted from the DOCX file.")

        return result
