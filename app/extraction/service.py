
from .detector import DocumentType, DocumentDetector
from .extractor import Extractor, PDFExtractor, DOCXExtractor
from pathlib import Path
from .models import ExtractionResult
from .exception import UnsupportedFileTypeError

EXTRACTORS: dict[DocumentType, Extractor] = {
    DocumentType.PDF: PDFExtractor(),
    DocumentType.DOCX: DOCXExtractor(),
}

class DocumentService:
    def __init__(
            self,
            detector: DocumentDetector,
            extractors: dict[DocumentType, Extractor] = EXTRACTORS,
            ):
        self.detector = detector
        self.extractors = extractors

    def extract_text(self, path: Path) -> ExtractionResult:
        document_type = self.detector.detect(path)

        extractor = self.extractors.get(document_type)

        if extractor is None:
            raise UnsupportedFileTypeError(
                f"No extractor found for document type: {document_type}"
            )

        return extractor.extract(path)