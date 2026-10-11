import React from "react";
import { Loader2 } from "lucide-react";

export interface SpinnerProps {
  /** Spinner size */
  size?: "sm" | "md" | "lg";
  /** Optional accessible screen-reader description */
  label?: string;
  /** Custom classes for colors */
  className?: string;
}

/**
 * Spinner component for async operations.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  label = "Loading...",
  className = "text-primary-600",
}) => {
  const sizeStyles = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div role="status" className="inline-flex items-center gap-2">
      <Loader2
        className={`animate-spin ${sizeStyles[size]} ${className}`}
        aria-hidden="true"
      />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
};
