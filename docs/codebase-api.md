# Codebase API and Component Contracts

This document describes how the frontend, backend API, persistence layer, and document extractors communicate.

The goal is to make each part replaceable: callers should need to know a component's inputs, outputs, and error behaviour, not its internal implementation.

> **Contract rule:** keep this document, the FastAPI response schemas, and `frontend/src/types.ts` in sync. The code is the executable source of truth; update this document whenever a contract changes.

## 1. Architecture at a glance

```text
Browser
  └── React UI
      ├── UploadForm.tsx
      ├── DocumentList.tsx
      ├── DocumentDetails.tsx
      └── DocumentStatusBadge.tsx
              │ props and callbacks
              ▼
           App.tsx
       (shared state and orchestration)
              │
              ▼
        frontend/src/api.ts
        (HTTP client functions)
              │ HTTP/JSON + multipart upload
              ▼
         FastAPI endpoints
              │
              ▼
       Document processing service
              │
       DocumentDetector
              │
       ┌──────┴──────┐
       ▼             ▼
 PDFExtractor    DOCXExtractor
       │             │
       └──────┬──────┘
              ▼
       ExtractionResult
              │
              ▼
    SQLModel Document record
    (SQLite in the assessment)
```

### Responsibilities

| Module | Responsibility |
|---|---|
| `App.tsx` | Own shared UI state, call the API client, select documents, coordinate upload and polling. |
| `components/UploadForm.tsx` | Collect a file and report user actions through props. |
| `components/DocumentList.tsx` | Display the current page of documents and report selection/page changes. |
| `components/DocumentDetails.tsx` | Display one document's status, extraction method, and extracted text. |
| `components/DocumentStatusBadge.tsx` | Render a status consistently. |
| `frontend/src/api.ts` | Encapsulate HTTP calls to FastAPI and handle unsuccessful HTTP responses. |
| `frontend/src/types.ts` | Define TypeScript contracts for API data. |
| `app/api/documents.py` | Validate requests and expose document endpoints. |
| `app/extraction/service.py` | Detect a document type and dispatch to the matching extractor. |
| `app/extraction/extractor.py` | Define the common extractor interface and format-specific implementations. |
| `app/models/document.py` | Define the SQLModel document record and processing status. |

## 2. Shared data contracts

These are the public data shapes expected by the frontend. Keep them aligned with the Pydantic/SQLModel response schemas in the backend.

### Document status

```typescript
type DocumentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";
```

Expected lifecycle:

```text
PENDING -> PROCESSING -> COMPLETED
                       -> FAILED
```

A status must not be shown as completed until extraction has succeeded and the extracted result has been persisted. `FAILED` should include an `error_message` when the error is safe and useful to show the user.

### Extraction method

```typescript
type ExtractionMethod = "pdf_text" | "pdf_ocr" | "docx";
```

- `pdf_text`: text was extracted from a PDF's embedded/digital text.
- `pdf_ocr`: OCR was used to extract text from a scanned/image-based PDF.
- `docx`: text was extracted from a Word document.

The backend extractor should return an enum member, and persistence/API responses should use the corresponding string value.

### `DocumentResponse`

Represents document metadata and processing status. It deliberately excludes the stored file path and extracted text.

```typescript
interface DocumentResponse {
  id: number;
  filename: string;
  mime_type: string;
  status: DocumentStatus;
  extraction_method: ExtractionMethod | null;
  file_size: number | null;
  error_message: string | null;
  created_at: string; // ISO 8601 datetime
  updated_at: string; // ISO 8601 datetime
}
```

### `DocumentContentResponse`

Represents the extracted content for a specific document.

```typescript
interface DocumentContentResponse {
  id: number;
  filename: string;
  status: DocumentStatus;
  extraction_method: ExtractionMethod | null;
  extracted_text: string | null;
}
```

`extracted_text` may be `null` while processing is unfinished or if no text was stored. The UI should check the status before treating the content as final.

### `PaginatedDocumentsResponse`

The document-history endpoint returns one page rather than the entire history.

```typescript
interface PaginatedDocumentsResponse {
  items: DocumentResponse[];
  total: number;
  page: number;
  page_size: number;
}
```

- `items`: only the documents for the requested page.
- `total`: number of matching documents across all pages.
- `page`: one-based page number returned by the server.
- `page_size`: maximum number of items requested for that page.

The assessment implementation uses a default page size of 10. The server should enforce `page >= 1` and a sensible maximum `page_size` (currently 100 in the proposed endpoint).

## 3. REST API contract

Base URL for local development: `http://127.0.0.1:8000`.

### `POST /documents/` — upload a document

**Request:** `multipart/form-data` with a file field named `file`.

Example with `curl`:

```bash
curl -X POST http://127.0.0.1:8000/documents/ \
  -F "file=@test_documents/this_is_digital_pdf.pdf"
```

**Success:** `202 Accepted` with a `DocumentResponse`. The initial status should normally be `PENDING`; processing may start shortly afterwards.

Example response:

```json
{
  "id": 12,
  "filename": "this_is_digital_pdf.pdf",
  "mime_type": "application/pdf",
  "status": "PENDING",
  "extraction_method": null,
  "file_size": 48210,
  "error_message": null,
  "created_at": "2026-10-10T10:00:00Z",
  "updated_at": "2026-10-10T10:00:00Z"
}
```

The values above are illustrative, not a real response.

Expected failures:

- `400 Bad Request`: required filename or request data is missing, if handled that way by the implementation.
- `415 Unsupported Media Type`: file type is not supported or detected content does not match the supported formats.
- `422 Unprocessable Entity`: request validation failed.

Supported formats for this assessment are PDF and DOCX. The HTML `accept` attribute is only a user-interface hint; the backend must validate files independently.

### `GET /documents/` — list documents

**Query parameters:**

| Parameter | Type | Default | Constraints |
|---|---|---:|---|
| `page` | integer | `1` | At least 1 |
| `page_size` | integer | `10` | Between 1 and 100 |

Example:

```bash
curl "http://127.0.0.1:8000/documents/?page=1&page_size=10"
```

**Success:** `200 OK` with `PaginatedDocumentsResponse`.

Example response:

```json
{
  "items": [
    {
      "id": 12,
      "filename": "claim.pdf",
      "mime_type": "application/pdf",
      "status": "COMPLETED",
      "extraction_method": "pdf_text",
      "file_size": 48210,
      "error_message": null,
      "created_at": "2026-10-10T10:00:00Z",
      "updated_at": "2026-10-10T10:00:03Z"
    }
  ],
  "total": 27,
  "page": 1,
  "page_size": 10
}
```

The backend orders results newest first, preferably by `created_at DESC` and then `id DESC` for a deterministic order when timestamps match. SQL `OFFSET` and `LIMIT` should restrict the number of records fetched for the page.

### `GET /documents/{document_id}` — retrieve status and metadata

Example:

```bash
curl http://127.0.0.1:8000/documents/12
```

**Success:** `200 OK` with `DocumentResponse`.

**Failure:** `404 Not Found` when no document has that ID.

The frontend uses this endpoint to retrieve the latest status when polling an individual document. If the frontend instead refreshes the paginated list to update statuses, the response contract remains the same for each item.

### `GET /documents/{document_id}/content` — retrieve extracted text

Example:

```bash
curl http://127.0.0.1:8000/documents/12/content
```

**Success:** `200 OK` with `DocumentContentResponse`.

**Failure:** `404 Not Found` when the document does not exist.

The frontend should display the extraction method and text after processing is complete. Large document content could later be exposed through a separate content/chunks endpoint if needed.

### Error response convention

FastAPI commonly returns an error body shaped like:

```json
{
  "detail": "Human-readable error message"
}
```

The frontend API client should check `response.ok` and throw an `Error` for unsuccessful responses. UI components should display a safe, useful message rather than silently swallowing failures.

## 4. Frontend component APIs

Component props are the internal APIs of the UI. Components should not reach into another component's state. A parent passes data down as props; child components report events through callbacks.

### `UploadForm.tsx`

```typescript
interface UploadFormProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
```

**Responsibilities:** file selection, filename/size display, and submitting the form.

**Does not:** call FastAPI or decide what happens after a successful upload.

### `DocumentList.tsx`

```typescript
interface DocumentListProps {
  documents: DocumentResponse[];
  selectedDocumentId: number | null;
  page: number;
  pageSize: number;
  totalDocuments: number;
  isLoading: boolean;
  onSelectDocument: (id: number) => void;
  onPageChange: (page: number) => void;
}
```

**Responsibilities:** render the current page, highlight the selected row, show statuses, and render Previous/Next controls.

**Does not:** fetch documents or own the current page state.

### `DocumentDetails.tsx`

```typescript
interface DocumentDetailsProps {
  document: DocumentResponse | null;
  content: DocumentContentResponse | null;
  onError: (message: string) => void;
}
```

**Responsibilities:** show metadata, processing state, extraction method, extracted text, and a copy action.

**Does not:** choose the selected document or fetch its content.

### `DocumentStatusBadge.tsx`

```typescript
interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}
```

**Responsibilities:** consistently display one status and its visual style. It is a presentational component with no API calls and no own state.

### `App.tsx`

`App` is the coordinator and currently takes no props. It owns shared state, including the selected file, page, document list, selected document ID, fetched content, loading state, and user-facing error message. It calls `api.ts` functions and passes data/callbacks to child components.

## 5. Frontend HTTP-client contract (`frontend/src/api.ts`)

The UI should use these functions instead of calling `fetch()` directly from individual components.

| Function | Input | Return type | Failure behaviour |
|---|---|---|---|
| `uploadDocument(file)` | `File` | `Promise<DocumentResponse>` | Throws if upload fails or API returns a non-success status. |
| `listDocuments(page, pageSize)` | Page number and page size | `Promise<PaginatedDocumentsResponse>` | Throws if the list request fails. |
| `getDocument(documentId)` | Numeric document ID | `Promise<DocumentResponse>` | Throws, including for a 404 response. |
| `getDocumentContent(documentId)` | Numeric document ID | `Promise<DocumentContentResponse>` | Throws, including for a 404 response. |

For file upload, use `FormData` and append the file under the key `file`. Do not manually set the multipart `Content-Type` header; the browser must add the boundary.

Local development can use `VITE_API_URL` to configure the backend URL, with a fallback such as `http://127.0.0.1:8000`. If the frontend and backend use different origins, configure FastAPI CORS for the actual frontend origin.

## 6. Python extraction contracts

### `DocumentDetector`

```python
def detect(self, path: Path) -> DocumentType:
    ...
```

**Input:** path to the saved file.

**Success:** a supported `DocumentType` such as `DocumentType.PDF` or `DocumentType.DOCX`.

**Failure:** raises `UnsupportedFileTypeError` when the file type cannot be identified or is unsupported.

The detector inspects file content/signature; file extensions and browser MIME types alone should not be trusted as proof of file type.

### `Extractor` and format-specific extractors

```python
class Extractor:
    def extract(self, path: Path) -> ExtractionResult:
        raise NotImplementedError
```

Each concrete extractor follows the same contract:

- Input: path to a saved file of its supported format.
- Success: `ExtractionResult` containing extracted text and an `ExtractionMethod` enum member.
- Failure: raises an extraction exception rather than reporting success with an invalid result.

Current implementations:

| Extractor | Input | Successful method value |
|---|---|---|
| `PDFExtractor` | PDF path | `pdf_text` or `pdf_ocr` |
| `DOCXExtractor` | DOCX path | `docx` |

`PDFExtractor` first attempts embedded text extraction. If the PDF contains too little meaningful text, it attempts OCR. OCR depends on the local OCR tooling being installed/configured, or can be replaced with a mock/service adapter for the assessment.

### `DocumentService`

```python
def extract_text(self, path: Path) -> ExtractionResult:
    ...
```

**Responsibility:** call the detector, find the matching extractor from the registry, and return its result.

It should not know about HTTP requests or frontend rendering. That separation allows a new format to be added by implementing a compatible extractor and registering its `DocumentType`.

### Processing and persistence

The processing workflow is responsible for updating the database status and saving the result:

1. Create the document record with `PENDING`.
2. Set status to `PROCESSING` before extraction starts.
3. Call `DocumentService.extract_text(path)`.
4. On success, persist `extracted_text` and `extraction_method`, then set `COMPLETED`.
5. On failure, persist a useful `error_message` and set `FAILED`.

The background processor should create its own SQLModel `Session`; it should not rely on reusing the HTTP request's session after the response has been returned.

## 7. Error handling and validation principles

- Validate accepted file types on the backend, even when the browser file input uses an `accept` attribute.
- Generate a server-side storage name rather than trusting the uploaded filename as a filesystem path.
- Configure a reasonable maximum upload size; the frontend's file selector is not a security boundary.
- Return appropriate HTTP status codes and safe error messages.
- Do not report `COMPLETED` until the result is persisted.
- Do not expose internal server paths or stack traces in API responses.
- Treat extracted document content as untrusted input. It may contain sensitive legal/medical information and should not be logged unnecessarily.
- In production, add authentication/authorization, secure object storage, retention/deletion rules, and audit logging before handling real legal documents.

## 8. Local development and smoke tests

Start the backend from the repository root:

```bash
uvicorn app.main:app --reload
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

FastAPI's interactive API documentation is available at `http://127.0.0.1:8000/docs`.

Suggested smoke-test sequence:

1. Call `GET /documents/?page=1&page_size=10` and check the paginated response shape.
2. Upload `test_documents/this_is_digital_pdf.pdf` and check the status transitions to `COMPLETED` with method `pdf_text`.
3. Upload `test_documents/this_is_scanned_pdf.pdf` and check OCR is selected and configured correctly.
4. Upload `test_documents/this_is_docx.docx` and check method `docx`.
5. Call `GET /documents/{id}/content` and check extracted text is returned.
6. Navigate between pages and select an older document in the frontend.
7. Try an unsupported or malformed file and confirm the API returns an appropriate error.

## 9. Current scope and future extensions

This assessment implementation is intentionally small: FastAPI, SQLModel/SQLite, local file storage, background processing, and PDF/DOCX extraction. It is not yet a production distributed processing system.

Possible extensions include:

- Add a text extractor by implementing the existing `Extractor` contract and registering a `TXT` document type.
- Store content as pages or chunks with metadata rather than one large text field.
- Use object storage for original files and PostgreSQL for persistent metadata.
- Move extraction to a durable queue and separate worker processes for retries, isolation, and scaling.
- Add cursor-based pagination if offset pagination becomes inefficient for very large histories.
- Add integration tests for HTTP response schemas and unit tests for each extractor.
