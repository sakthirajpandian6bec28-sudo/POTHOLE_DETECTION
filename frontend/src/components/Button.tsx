import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant style */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** Size variant - all meet the min 44px height touch requirement */
  size?: "sm" | "md" | "lg";
  /** Whether the button is in an asynchronous loading state */
  isLoading?: boolean;
  /** Optional icon rendered before the children */
  leftIcon?: React.ReactNode;
  /** Optional icon rendered after the children */
  rightIcon?: React.ReactNode;
}

/**
 * Reusable Button component adhering to 44px touch target guidelines,
 * WCAG AA contrast, and documented state transitions.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded transition-colors duration-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px]";

    const sizeStyles = {
      sm: "px-3 py-2 text-small gap-1.5",
      md: "px-4 py-2.5 text-small gap-2",
      lg: "px-6 py-3 text-body gap-2.5",
    };

    const variantStyles = {
      primary:
        "bg-primary-600 text-white hover:bg-primary-700 active:bg-ink-800 border border-transparent shadow-subtle",
      secondary:
        "bg-bg-surface text-primary-600 border border-primary-600 hover:bg-primary-50 active:bg-primary-100 shadow-subtle",
      ghost:
        "bg-transparent text-text-body hover:bg-primary-50 active:bg-primary-100 border border-transparent",
      danger:
        "bg-danger text-white hover:brightness-90 active:bg-ink-900 border border-transparent shadow-subtle",
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0" aria-hidden="true">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
