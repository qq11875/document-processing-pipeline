from datetime import datetime

from sqlmodel import SQLModel

from app.models.document import DocumentStatus


class DocumentResponse(SQLModel):
    id: int
    filename: str
    mime_type: str
    status: DocumentStatus
    extraction_method: str | None
    file_size: int | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

class DocumentListResponse(SQLModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int

class DocumentContentResponse(SQLModel):
    id: int
    filename: str
    status: DocumentStatus
    extraction_method: str | None
    extracted_text: str | None