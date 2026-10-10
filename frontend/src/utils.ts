
export const PAGE_SIZE = 10;

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "Size unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const methodLabels: Record<string, string> = {
  pdf_text: "Digital PDF text extraction",
  pdf_ocr: "PDF OCR",
  docx: "Word document extraction",
};

export function formatExtractionMethod(
  method: string | null,
): string {
  if (!method) return "Not specified";
  return methodLabels[method] ?? method;
}