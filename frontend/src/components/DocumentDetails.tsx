
import type {
  DocumentContentResponse,
  DocumentResponse,
} from "../types";
import {
  formatBytes,
  formatExtractionMethod,
} from "../utils";
import DocumentStatusBadge from "./DocumentStatusBadge";

interface DocumentDetailsProps {
  document: DocumentResponse | null;
  content: DocumentContentResponse | null;
  onError: (message: string) => void;
}

export default function DocumentDetails({
  document,
  content,
  onError,
}: DocumentDetailsProps) {
  if (!document) return null;

  const isProcessing =
    document.status === "PENDING" ||
    document.status === "PROCESSING";

  const hasContent = content?.id === document.id;

  async function copyExtractedText() {
    if (!hasContent || !content.extracted_text) return;

    try {
      await navigator.clipboard.writeText(content.extracted_text);
    } catch {
      onError(
        "Could not copy text. Check your clipboard permissions.",
      );
    }
  }

  return (
    <section className="result-card" aria-live="polite">
      <div className="result-heading">
        <div className="result-file-icon">DOC</div>

        <div className="result-file-info">
          <h2>{document.filename}</h2>
          <p>
            {formatBytes(document.file_size)}
            {" · "}
            Document #{document.id}
          </p>
        </div>

        <DocumentStatusBadge status={document.status} />
      </div>

      {isProcessing && (
        <div className="processing-panel">
          <div className="spinner" />

          <div className="processing-copy">
            <strong>Extracting document content</strong>
            <p>
              Processing is underway. Scanned PDFs may take longer
              because they require OCR.
            </p>
          </div>

          <div
            className="progress-track"
            aria-label="Document processing in progress"
          >
            <div className="progress-indicator" />
          </div>
        </div>
      )}

      {document.status === "FAILED" && (
        <div className="error-message">
          {document.error_message ||
            "The document could not be processed."}
        </div>
      )}

      {document.status === "COMPLETED" && (
        <>
          <div className="metadata-row">
            <div>
              <span className="metadata-label">EXTRACTION METHOD</span>
              <strong>
                {formatExtractionMethod(document.extraction_method)}
              </strong>
            </div>

            <div>
              <span className="metadata-label">STATUS</span>
              <strong>Ready to view</strong>
            </div>
          </div>

          <div className="content-heading">
            <div>
              <p className="step-label">EXTRACTED RESULT</p>
              <h3>Document text</h3>
            </div>

            <span className="text-tag">Plain text</span>
          </div>

          <div className="extracted-text">
            {hasContent
              ? content.extracted_text?.trim() ||
                "The document was processed, but no text was returned."
              : "Loading extracted text..."}
          </div>

          {hasContent && content.extracted_text && (
            <button
              type="button"
              className="copy-button"
              onClick={() => void copyExtractedText()}
            >
              Copy extracted text
            </button>
          )}
        </>
      )}
    </section>
  );
}