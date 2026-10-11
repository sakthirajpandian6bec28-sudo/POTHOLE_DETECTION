import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type AlertVariant = "info" | "warning" | "error" | "success";

export interface AlertProps {
  /** Alert semantic category */
  variant: AlertVariant;
  /** Primary alert heading or concise summary */
  title?: string;
  /** Primary error message (what happened) and guidance (what to do next) */
  children: React.ReactNode;
  /** Optional action button text */
  actionText?: string;
  /** Optional action handler */
  onAction?: () => void;
  /** Optional dismiss handler */
  onClose?: () => void;
  /** Custom classes */
  className?: string;
}

/**
 * Alert banner ensuring errors and warnings are visible with clear explanation
 * and actionable next steps (per Rule 4).
 * Uses token colors only with dark ink-900 text for WCAG AA compliance.
 */
export const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  children,
  actionText,
  onAction,
  onClose,
  className = "",
}) => {
  const variantConfig = {
    info: {
      container: "bg-primary-50 border-primary-100 text-ink-900",
      icon: <Info className="w-5 h-5 text-primary-600 shrink-0" aria-hidden="true" />,
    },
    warning: {
      container: "bg-sev-medium-soft border-border-default text-ink-900",
      icon: <AlertTriangle className="w-5 h-5 text-sev-medium shrink-0" aria-hidden="true" />,
    },
    error: {
      container: "bg-sev-high-soft border-border-default text-ink-900",
      icon: <AlertCircle className="w-5 h-5 text-danger shrink-0" aria-hidden="true" />,
    },
    success: {
      container: "bg-sev-low-soft border-border-default text-ink-900",
      icon: <CheckCircle2 className="w-5 h-5 text-success shrink-0" aria-hidden="true" />,
    },
  };

  const current = variantConfig[variant];

  return (
    <div
      role="alert"
      className={`rounded border p-4 flex items-start gap-3 text-small ${current.container} ${className}`}
    >
      <div className="pt-0.5">{current.icon}</div>
      <div className="flex-1 space-y-1">
        {title && <h4 className="font-semibold text-small leading-5 text-ink-900">{title}</h4>}
        <div className="text-small leading-normal text-text-body">{children}</div>
        {actionText && onAction && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onAction}
              className="text-small font-semibold underline text-primary-700 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-600 rounded"
            >
              {actionText}
            </button>
          </div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="text-text-muted hover:text-ink-900 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
