import React from "react";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "severity-low"
  | "severity-medium"
  | "severity-high";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual variant, including semantic severity styles */
  variant?: BadgeVariant;
  /** Badge size */
  size?: "sm" | "md";
  /** Optional status indicator dot */
  dot?: boolean;
}

/**
 * Reusable Badge component with strict WCAG AA contrast colors
 * and semantic severity mapping.
 * Per design rules: badges use soft backgrounds with dark text (ink-900).
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  size = "md",
  dot = false,
  children,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center font-medium rounded border select-none tracking-normal";

  const sizeStyles = {
    sm: "px-2 py-0.5 text-caption gap-1",
    md: "px-2.5 py-1 text-small gap-1.5",
  };

  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    neutral: {
      container: "bg-bg-page text-text-body border-border-default",
      dot: "bg-text-muted",
    },
    primary: {
      container: "bg-primary-50 text-ink-900 border-border-default",
      dot: "bg-primary-600",
    },
    "severity-low": {
      container: "bg-sev-low-soft text-ink-900 border-border-default",
      dot: "bg-sev-low",
    },
    "severity-medium": {
      container: "bg-sev-medium-soft text-ink-900 border-border-default",
      dot: "bg-sev-medium",
    },
    "severity-high": {
      container: "bg-sev-high-soft text-ink-900 border-border-default",
      dot: "bg-sev-high",
    },
  };

  const currentVariant = variantStyles[variant];

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${currentVariant.container} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${currentVariant.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};
