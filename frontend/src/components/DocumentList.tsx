
import type { DocumentResponse } from "../types";
import {
  formatBytes,
  formatExtractionMethod,
} from "../utils";
import DocumentStatusBadge from "./DocumentStatusBadge";

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

export default function DocumentList({
  documents,
  selectedDocumentId,
  page,
  pageSize,
  totalDocuments,
  isLoading,
  onSelectDocument,
  onPageChange,
}: DocumentListProps) {
  const totalPages = Math.max(
    1,
    Math.ceil(totalDocuments / pageSize),
  );

  const firstDocument =
    totalDocuments === 0 ? 0 : (page - 1) * pageSize + 1;

  const lastDocument = Math.min(
    page * pageSize,
    totalDocuments,
  );

  return (
    <section className="documents-card">
      <div className="card-heading">
        <div>
          <p className="step-label">YOUR WORKSPACE</p>
          <h2>Your documents</h2>
        </div>

        <span className="count-pill">
          {totalDocuments}{" "}
          {totalDocuments === 1 ? "document" : "documents"}
        </span>
      </div>

      {isLoading ? (
        <p className="empty-state">Loading your documents...</p>
      ) : documents.length === 0 ? (
        <p className="empty-state">
          No documents yet. Upload a PDF or DOCX to get started.
        </p>
      ) : (
        <div className="document-list">
          {documents.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`document-row ${
                selectedDocumentId === item.id ? "selected" : ""
              }`}
              aria-pressed={selectedDocumentId === item.id}
              onClick={() => onSelectDocument(item.id)}
            >
              <span className="document-row-icon">
                {item.filename.split(".").pop()?.toUpperCase() ?? "FILE"}
              </span>

              <span className="document-row-info">
                <strong>{item.filename}</strong>

                <span>
                  {formatBytes(item.file_size)}
                  {" · "}
                  {item.extraction_method
                    ? formatExtractionMethod(item.extraction_method)
                    : `Document #${item.id}`}
                </span>
              </span>

              <DocumentStatusBadge status={item.status} />

              <span className="row-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      )}

      {totalDocuments > 0 && (
        <div className="pagination-controls">
          <span className="pagination-summary">
            Showing {firstDocument}–{lastDocument} of {totalDocuments}
          </span>

          <div className="pagination-actions">
            <button
              type="button"
              className="pagination-button"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </button>

            <span className="page-indicator">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              className="pagination-button"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}