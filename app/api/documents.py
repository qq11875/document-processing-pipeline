from pathlib import Path
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
    Query,
)

from sqlalchemy import func
from sqlmodel import Session, select

from app.database import get_session
from app.extraction.detector import DocumentDetector, DocumentType
from app.models.document import Document, DocumentStatus
from app.schemas.document import (
    DocumentContentResponse,
    DocumentResponse,
    DocumentListResponse,
)
from app.services.document_processing import process_document

router = APIRouter(
    prefix="/documents",
    tags=["documents"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {
    DocumentType.PDF: "application/pdf",
    DocumentType.DOCX: (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ),
}

detector = DocumentDetector()

@router.post(
    "/",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    extension = Path(file.filename).suffix.lower()

    if extension not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. Only PDF and DOCX are supported.",
        )

    document_id = uuid4()
    saved_file_path = UPLOAD_DIR / f"{document_id}{extension}"

    file_size = 0

    with open(saved_file_path, "wb") as f:
        while content := await file.read(1024 * 1024):
            f.write(content)
            file_size += len(content)

    try:
        document_type = detector.detect(saved_file_path)
    except Exception as e:
        saved_file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {e}",
        )

    mime_type = ALLOWED_TYPES.get(document_type)

    document = Document(
        filename=file.filename,
        mime_type=mime_type,
        status=DocumentStatus.PENDING,
        file_path=str(saved_file_path),
        file_size=file_size,
    )

    session.add(document)
    session.commit()
    session.refresh(document)

    background_tasks.add_task(process_document, document.id)

    return document

@router.get("/", response_model=DocumentListResponse)
def list_documents(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    session: Session = Depends(get_session),
):
    total = session.exec(
        select(func.count()).select_from(Document)
    ).one()

    statement = (
        select(Document)
        .order_by(Document.created_at.desc(), Document.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    documents = session.exec(statement).all()

    return DocumentListResponse(
        items=documents,
        total=total,
        page=page,
        page_size=page_size,
    )

@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
)
def get_document(document_id: int, session: Session = Depends(get_session)):
    document = session.get(Document, document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return document

@router.get(
    "/{document_id}/content",
    response_model=DocumentContentResponse,
)
def get_document_content(document_id: int, session: Session = Depends(get_session)):
    document = session.get(Document, document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    return DocumentContentResponse(
        id=document.id,
        filename=document.filename,
        status=document.status,
        extraction_method=document.extraction_method,
        extracted_text=document.extracted_text,
    )