
export type DocumentStatus =
    | "PENDING"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED";

export interface DocumentResponse {
    id: number;
    filename: string;
    mime_type: string;
    status: DocumentStatus;
    extraction_method: string | null;
    file_size: number | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}

export interface PaginatedDocumentsResponse {
  items: DocumentResponse[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentContentResponse {
    id: number;
    filename: string;
    status: DocumentStatus;
    extraction_method: string | null;
    extracted_text: string | null;
}