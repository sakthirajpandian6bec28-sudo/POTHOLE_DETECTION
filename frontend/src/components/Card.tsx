import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional card header title */
  title?: string;
  /** Optional card header secondary description */
  subtitle?: string;
  /** Optional action or control displayed in header */
  headerAction?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Internal padding size */
  padding?: "none" | "sm" | "md" | "lg";
}

/**
 * Reusable Card container with 8px radius, 1px border, and subtle shadow.
 */
export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  footer,
  padding = "md",
  children,
  className = "",
  ...props
}) => {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const hasHeader = Boolean(title || subtitle || headerAction);

  return (
    <div
      className={`bg-bg-surface rounded border border-border-default shadow-card text-text-body ${className}`}
      {...props}
    >
      {hasHeader && (
        <div className="px-6 py-4 border-b border-border-default flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-h4 font-medium text-ink-900 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-small text-text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className={paddingStyles[padding]}>{children}</div>

      {footer && (
        <div className="px-6 py-4 border-t border-border-default bg-bg-page rounded-b">
          {footer}
        </div>
      )}
    </div>
  );
};
