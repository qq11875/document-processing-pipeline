# Document Processing Pipeline

A full-stack document-processing application that supports PDF and DOCX uploads, text extraction, and OCR fallback for scanned PDFs. It provides a REST API and a React frontend for uploading documents, tracking processing status, and viewing extracted text.

## Features

- Upload PDF and DOCX documents.
- Detect supported document types from file content.
- Extract embedded text from digital PDFs.
- Use OCR as a fallback for scanned PDFs.
- Extract text from DOCX documents.
- Track document processing status and extraction method.
- Retrieve document metadata and extracted content through REST API endpoints.
- View uploaded documents and processing results in a React frontend.

## Tech Stack

**Backend**
- Python
- FastAPI
- SQLModel and SQLite
- PyMuPDF for PDF processing
- Tesseract OCR for scanned PDFs, where configured
- DOCX text extraction

**Frontend**
- React
- TypeScript
- Vite

## Prerequisites

Ensure the following are installed on your Mac:

- Git
- Python 3
- Node.js and npm
- Homebrew

Install Tesseract OCR using Homebrew:

```bash
brew install tesseract
```

## Getting Started

### 1. Clone the repository

Open Terminal and run:

```bash
git clone https://github.com/qq11875/document-processing-pipeline.git
cd document-processing-pipeline
```

### 2. Set up the backend

From the project root, create and activate a Python virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the Python dependencies:

```bash
python -m pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

The backend will be available at:

- API base URL: http://127.0.0.1:8000
- Interactive API documentation: http://127.0.0.1:8000/docs

Keep this terminal open while using the application.

### 3. Set up the frontend

Open a second Terminal window and navigate to the frontend directory:

```bash
cd document-processing-pipeline/frontend
```

Install the Node.js dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

Open the following URL in your browser:

http://localhost:5173

Keep the frontend terminal open while using the application.

## How It Works

1. Upload a PDF or DOCX file through the frontend.
2. The API validates the file and saves it locally.
3. Document metadata and the initial processing status are stored in SQLite.
4. Background processing detects the document format and extracts its text.
5. Digital PDFs use embedded text extraction where possible; scanned PDFs use OCR as a fallback.
6. The document's processing status and extracted text are saved.
7. The frontend displays the document status and makes the extracted content available.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/documents/` | Upload a document |
| `GET` | `/documents/` | List documents with pagination |
| `GET` | `/documents/{id}` | Retrieve document metadata and status |
| `GET` | `/documents/{id}/content` | Retrieve extracted text |

Document processing is asynchronous. A newly uploaded document may initially have a `PENDING` status before progressing to `PROCESSING`, `COMPLETED`, or `FAILED`.

## Running Tests

From the project root, activate the virtual environment if it is not already active, then run:

```bash
python -m pytest -q
```

## Frontend Checks

From the `frontend` directory, run the linter:

```bash
npm run lint
```

To verify the production build:

```bash
npm run build
```
