import React from "react";

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Section heading title */
  title?: string;
  /** Section descriptive subtitle */
  subtitle?: string;
  /** Action element aligned on right on desktop */
  action?: React.ReactNode;
  /** Background style variant */
  variant?: "default" | "subtle";
  /** Optional container max-width override */
  fullWidth?: boolean;
}

/**
 * Section container enforcing strict 96px desktop / 56px mobile padding
 * and 1200px content max-width.
 */
export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  action,
  variant = "default",
  fullWidth = false,
  children,
  className = "",
  ...props
}) => {
  const bgStyles = {
    default: "bg-transparent",
    subtle: "bg-bg-page border-y border-border-default",
  };

  const hasHeader = Boolean(title || subtitle || action);

  return (
    <section
      className={`py-7 md:py-12 ${bgStyles[variant]} ${className}`}
      {...props}
    >
      <div
        className={`${
          fullWidth ? "w-full px-4 md:px-6" : "max-w-content mx-auto px-4 md:px-6"
        }`}
      >
        {hasHeader && (
          <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              {title && (
                <h2 className="text-h2-mobile md:text-h2 font-semibold text-ink-900 tracking-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-body text-text-muted mt-2 max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
};
