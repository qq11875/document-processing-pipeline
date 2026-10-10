from enum import Enum
from pathlib import Path
import filetype
from .exception import UnsupportedFileTypeError


class DocumentType(Enum):
    PDF = "pdf"
    DOCX = "docx"

class DocumentDetector:
    def detect(self, path: Path) -> DocumentType:
        kind = filetype.guess(path)

        if kind is None:
            raise UnsupportedFileTypeError("Cannot determine the file type.")

        match kind.mime:
            case "application/pdf":
                return DocumentType.PDF
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                return DocumentType.DOCX
            case _:
                raise UnsupportedFileTypeError(f"Unsupported file type: {kind.mime}")