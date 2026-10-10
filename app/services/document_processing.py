from datetime import datetime, timezone
from pathlib import Path

from sqlmodel import Session

from app.database import engine
from app.extraction.detector import DocumentDetector
from app.extraction.service import DocumentService
from app.models.document import Document, DocumentStatus

detector = DocumentDetector()
document_service = DocumentService(detector)

def process_document(document_id: int) -> Document:
    with Session(engine) as session:
        document = session.get(Document, document_id)

        if document is None:
            return

        document.status = DocumentStatus.PROCESSING
        document.updated_at = datetime.now(timezone.utc)

        file_path = Path(document.file_path)

        session.add(document)
        session.commit()

    try:
        result = document_service.extract_text(file_path)

        with Session(engine) as session:
            document = session.get(Document, document_id)

            if document is None:
                return

            document.extracted_text = result.text
            document.extraction_method = result.extraction_method.value
            document.status = DocumentStatus.COMPLETED
            document.updated_at = datetime.now(timezone.utc)

            session.add(document)
            session.commit()

    except Exception as e:
        with Session(engine) as session:
            document = session.get(Document, document_id)

            if document is None:
                return

            document.status = DocumentStatus.FAILED
            document.error_message = str(e)
            document.updated_at = datetime.now(timezone.utc)

            session.add(document)
            session.commit()