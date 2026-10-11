import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional form field label */
  label?: string;
  /** Explicit error message */
  error?: string;
  /** Descriptive helper text rendered below the input */
  helperText?: string;
  /** Optional icon prefix */
  leftIcon?: React.ReactNode;
  /** Optional icon suffix */
  rightIcon?: React.ReactNode;
}

/**
 * Reusable text input with 44px minimum height, clear focus states,
 * and accessible error handling.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      disabled,
      id,
      className = "",
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-small font-medium text-ink-800"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            className={`w-full min-h-[44px] rounded border bg-bg-surface px-3 text-body text-ink-900 placeholder:text-text-muted transition-colors duration-subtle focus-visible:outline-none focus-visible:ring-2 disabled:bg-bg-page disabled:text-text-muted disabled:cursor-not-allowed ${
              leftIcon ? "pl-10" : ""
            } ${rightIcon ? "pr-10" : ""} ${
              error
                ? "border-danger focus-visible:ring-danger focus-visible:border-danger"
                : "border-border-default focus-visible:ring-primary-600 focus-visible:border-primary-600"
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-text-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-small text-danger">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-small text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
