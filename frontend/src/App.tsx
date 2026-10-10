
import { useEffect, useState, type FormEvent } from "react";
import {
  getDocumentContent,
  listDocuments,
  uploadDocument,
} from "./api";
import type {
  DocumentContentResponse,
  DocumentResponse,
} from "./types";
import UploadForm from "./components/UploadForm";
import DocumentList from "./components/DocumentList";
import DocumentDetails from "./components/DocumentDetails";
import { PAGE_SIZE } from "./utils";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] =
    useState<number | null>(null);
  const [content, setContent] =
    useState<DocumentContentResponse | null>(null);

  const [page, setPage] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedDocument =
    documents.find((item) => item.id === selectedDocumentId) ?? null;

  const hasActiveDocuments = documents.some(
    (item) => item.status === "PENDING" || item.status === "PROCESSING",
  );

  // Load the current page from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      setIsLoadingList(true);

      try {
        const result = await listDocuments(page, PAGE_SIZE);

        if (cancelled) return;

        setDocuments(result.items);
        setTotalDocuments(result.total);

        setSelectedDocumentId((current) => {
          if (result.items.some((item) => item.id === current)) {
            return current;
          }

          return result.items[0]?.id ?? null;
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load documents.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingList(false);
        }
      }
    }

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  // Poll the current page while documents are pending or processing.
  useEffect(() => {
    if (!hasActiveDocuments) return;

    let cancelled = false;

    async function refreshDocuments() {
      try {
        const result = await listDocuments(page, PAGE_SIZE);

        if (cancelled) return;

        setDocuments(result.items);
        setTotalDocuments(result.total);
      } catch {
        // Retain the current list and retry at the next interval.
      }
    }

    const timerId = window.setInterval(() => {
      void refreshDocuments();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timerId);
    };
  }, [hasActiveDocuments, page]);

  // Fetch the extracted content of the selected completed document.
  useEffect(() => {
    if (
      selectedDocumentId === null ||
      selectedDocument?.status !== "COMPLETED"
    ) {
      setContent(null);
      return;
    }

    let cancelled = false;
    setContent(null);

    async function loadContent() {
      try {
        const result = await getDocumentContent(selectedDocumentId!);

        if (!cancelled) {
          setContent(result);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load extracted content.",
          );
        }
      }
    }

    void loadContent();

    return () => {
      cancelled = true;
    };
  }, [selectedDocumentId, selectedDocument?.status]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploaded = await uploadDocument(selectedFile);

      setSelectedDocumentId(uploaded.id);
      setSelectedFile(null);

      // New documents appear first because the backend orders newest first.
      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not upload the document.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">F</div>

          <div>
            <div className="brand-name">FLETCHERS AI</div>
            <div className="brand-subtitle">Document workspace</div>
          </div>
        </div>

        <span className="format-pill">PDF · DOCX</span>
      </header>

      <main className="main-content">
        <section className="intro">
          <p className="eyebrow">DOCUMENT INTELLIGENCE</p>

          <h1>
            From documents
            <br />
            to <span>useful information.</span>
          </h1>

          <p className="intro-copy">
            Upload a document to extract its text. Digital PDFs are
            read directly, while scanned PDFs can use OCR.
          </p>
        </section>

        <section className="workspace">
          <UploadForm
            selectedFile={selectedFile}
            isUploading={isUploading}
            onFileChange={(file) => {
              setSelectedFile(file);
              setError(null);
            }}
            onSubmit={handleUpload}
          />

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <DocumentList
            documents={documents}
            selectedDocumentId={selectedDocumentId}
            page={page}
            pageSize={PAGE_SIZE}
            totalDocuments={totalDocuments}
            isLoading={isLoadingList}
            onSelectDocument={(id) => {
              setSelectedDocumentId(id);
              setError(null);
            }}
            onPageChange={setPage}
          />

          <DocumentDetails
            document={selectedDocument}
            content={content}
            onError={setError}
          />
        </section>

        <footer className="page-footer">
          <span>Document extraction prototype</span>
          <span>PDF and Word processing</span>
        </footer>
      </main>
    </div>
  );
}

export default App;