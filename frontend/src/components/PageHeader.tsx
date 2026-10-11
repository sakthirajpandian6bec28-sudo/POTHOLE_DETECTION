import React from "react";

export interface PageHeaderProps {
  /** Page primary heading (H1) */
  title: string;
  /** Secondary explanatory copy */
  description?: string;
  /** Optional badge above or next to title */
  badge?: React.ReactNode;
  /** Header action buttons or filters */
  actions?: React.ReactNode;
  /** Custom class names */
  className?: string;
}

/**
 * Standard PageHeader component providing H1 desktop 48/56,
 * mobile 36/44 type scale on bg-page with clean border-default divider.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className = "",
}) => {
  return (
    <div
      className={`border-b border-border-default pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 ${className}`}
    >
      <div className="space-y-2 max-w-3xl">
        {badge && <div className="mb-2">{badge}</div>}
        <h1 className="text-h1-mobile md:text-h1 font-semibold text-ink-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-body text-text-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
