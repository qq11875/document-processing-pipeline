from pathlib import Path

import pytest

from app.extraction.detector import DocumentDetector, DocumentType
from app.extraction.exception import UnsupportedFileTypeError
from app.extraction.extractor import DOCXExtractor, PDFExtractor
from app.extraction.models import ExtractionMethod, ExtractionResult


PROJECT_ROOT = Path(__file__).resolve().parents[1]
TEST_DOCUMENTS = PROJECT_ROOT / "test_documents"


def test_detect_digital_pdf():
    detector = DocumentDetector()

    result = detector.detect(
        TEST_DOCUMENTS / "this_is_digital_pdf.pdf"
    )

    assert result == DocumentType.PDF


def test_detect_scanned_pdf():
    detector = DocumentDetector()

    result = detector.detect(
        TEST_DOCUMENTS / "this_is_scanned_pdf.pdf"
    )

    assert result == DocumentType.PDF


def test_detect_docx():
    detector = DocumentDetector()

    result = detector.detect(
        TEST_DOCUMENTS / "this_is_docx.docx"
    )

    assert result == DocumentType.DOCX


def test_reject_unsupported_file(tmp_path):
    unsupported_file = tmp_path / "notes.txt"
    unsupported_file.write_text("Some plain text")

    detector = DocumentDetector()

    with pytest.raises(UnsupportedFileTypeError):
        detector.detect(unsupported_file)


def test_extract_digital_pdf():
    extractor = PDFExtractor()

    result = extractor.extract(
        TEST_DOCUMENTS / "this_is_digital_pdf.pdf"
    )

    assert isinstance(result, ExtractionResult)
    assert result.text.strip()
    assert result.extraction_method == ExtractionMethod.PDF_TEXT


def test_extract_docx():
    extractor = DOCXExtractor()

    result = extractor.extract(
        TEST_DOCUMENTS / "this_is_docx.docx"
    )

    assert isinstance(result, ExtractionResult)
    assert result.text.strip()
    assert result.extraction_method == ExtractionMethod.DOCX


def test_scanned_pdf_uses_ocr_fallback(monkeypatch):
    from app.extraction import pdf as pdf_module

    # Simulate a PDF with no embedded text.
    monkeypatch.setattr(
        pdf_module,
        "extract_pdf_embedded_text",
        lambda path: None,
    )

    # Simulate successful OCR without requiring an OCR installation.
    monkeypatch.setattr(
        pdf_module,
        "extract_pdf_text_with_ocr",
        lambda path: ExtractionResult(
            text="Text extracted through OCR",
            extraction_method=ExtractionMethod.PDF_OCR,
        ),
    )

    extractor = PDFExtractor()

    result = extractor.extract(
        TEST_DOCUMENTS / "this_is_scanned_pdf.pdf"
    )

    assert result.text == "Text extracted through OCR"
    assert result.extraction_method == ExtractionMethod.PDF_OCR