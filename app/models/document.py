from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from enum import Enum

class DocumentStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Document(SQLModel, table=True):
    __tablename__ = "documents"

    id: int | None = Field(default=None, primary_key=True)

    filename: str
    mime_type: str
    status: DocumentStatus = Field(default=DocumentStatus.PENDING)

    extraction_method: str | None = None
    file_path: str
    file_size: int | None = None
    extracted_text: str | None = None
    error_message: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))