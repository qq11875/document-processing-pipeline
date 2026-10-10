
import type { DocumentStatus } from "../types";

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}

const statusLabels: Record<DocumentStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export default function DocumentStatusBadge({
  status,
}: DocumentStatusBadgeProps) {
  return (
    <span className={`status-badge ${status.toLowerCase()}`}>
      {statusLabels[status]}
    </span>
  );
}