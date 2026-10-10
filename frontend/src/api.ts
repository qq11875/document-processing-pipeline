
import type {
    DocumentResponse,
    DocumentContentResponse,
    PaginatedDocumentsResponse,
} from "./types";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let message = `Request failed (${response.status})`;

        try {
            const body: { detail?: unknown } = await response.json();

            if (typeof body.detail === "string") {
                message = body.detail;
            }
        } catch {

        }

        throw new Error(message);
    }

    return (await response.json()) as T;
}

export async function listDocuments(
  page: number = 1,
  pageSize: number = 10,
): Promise<PaginatedDocumentsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  const response = await fetch(
    `${API_BASE_URL}/documents/?${params}`,
  );

  return parseResponse<PaginatedDocumentsResponse>(response);
}

export async function uploadDocument(file: File): Promise<DocumentResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/documents/`, {
        method: "POST",
        body: formData,
    });

    return parseResponse<DocumentResponse>(response);
}

export async function getDocumentContent(documentId: number): Promise<DocumentContentResponse> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/content/`);

    return parseResponse<DocumentContentResponse>(response);
}