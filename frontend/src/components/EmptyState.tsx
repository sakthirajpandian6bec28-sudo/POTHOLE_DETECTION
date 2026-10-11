import React, { useState } from "react";
import { Inbox } from "lucide-react";

export interface EmptyStateProps {
  /** Empty state heading */
  title: string;
  /** Clear explanation of why no items are shown and what to do next */
  description: string;
  /** Optional icon; defaults to Inbox */
  icon?: React.ReactNode;
  /** Primary action button or trigger */
  action?: React.ReactNode;
  /** Custom class names */
  className?: string;
  /** Optional file drag/drop support */
  onFileDrop?: (file: File) => void;
}

/**
 * EmptyState and Upload Dropzone container.
 * Meets requirement: dashed primary-600 border on primary-50,
 * switching to primary-100 while a file is dragged over it.
 * Icons sit in rounded squares filled with primary-50, with the icon in primary-600.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = "",
  onFileDrop,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0] && onFileDrop) {
          onFileDrop(e.dataTransfer.files[0]);
        }
      }}
      className={`rounded border border-dashed border-primary-600 p-8 md:p-12 text-center max-w-lg mx-auto transition-colors duration-subtle ${
        isDragging ? "bg-primary-100" : "bg-primary-50"
      } ${className}`}
    >
      <div className="mx-auto w-12 h-12 rounded bg-primary-50 border border-border-default flex items-center justify-center text-primary-600 mb-4 shadow-subtle">
        {icon || <Inbox className="w-6 h-6 text-primary-600" aria-hidden="true" />}
      </div>
      <h3 className="text-h4 font-medium text-ink-900 tracking-tight">
        {title}
      </h3>
      <p className="text-small text-text-muted mt-2 max-w-sm mx-auto">
        {description}
      </p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
};
