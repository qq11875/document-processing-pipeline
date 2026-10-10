
import { useEffect, useRef, type FormEvent } from "react";
import { formatBytes } from "../utils";

interface UploadFormProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function UploadForm({
  selectedFile,
  isUploading,
  onFileChange,
  onSubmit,
}: UploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset the actual file input after a successful upload.
  useEffect(() => {
    if (selectedFile === null && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedFile]);

  return (
    <form onSubmit={onSubmit} className="upload-card">
      <div className="card-heading">
        <div>
          <p className="step-label">STEP 01</p>
          <h2>Upload a document</h2>
        </div>

        <span className="file-types">.PDF / .DOCX</span>
      </div>

      <label
        htmlFor="document-file"
        className={`dropzone ${selectedFile ? "has-file" : ""}`}
      >
        <span className="upload-icon">
          <svg
            viewBox="0 0 24 24"
            width="27"
            height="27"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
          </svg>
        </span>

        <strong>
          {selectedFile
            ? selectedFile.name
            : "Choose a file to get started"}
        </strong>

        <span className="dropzone-help">
          {selectedFile
            ? formatBytes(selectedFile.size)
            : "Select a PDF or Word document from your device"}
        </span>

        <span className="browse-link">
          {selectedFile ? "Choose another file" : "Browse files"}
        </span>

        <input
          ref={fileInputRef}
          id="document-file"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          disabled={isUploading}
          onChange={(event) => {
            onFileChange(event.target.files?.[0] ?? null);
          }}
        />
      </label>

      <div className="upload-footer">
        <p>Supported formats: PDF and DOCX</p>

        <button
          type="submit"
          className="primary-button"
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? "Uploading..." : "Upload and extract"}
          {!isUploading && <span aria-hidden="true"> →</span>}
        </button>
      </div>
    </form>
  );
}