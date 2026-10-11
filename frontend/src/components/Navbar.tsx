import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { siteConfig } from "../config/site.config";

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        toggleButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="border-b border-border-default bg-bg-surface sticky top-0 z-40">
      <div className="max-w-content mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Product Name */}
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-h4 font-semibold text-ink-900 tracking-tight flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded p-1"
          >
            {/* Studio-grade geometric road emblem icon - pure inline SVG */}
            <svg
              className="w-6 h-6 text-primary-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19L9 5" />
              <path d="M20 19L15 5" />
              <path d="M12 9v2" />
              <path d="M12 15v2" />
            </svg>
            <span>{siteConfig.logoText}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {siteConfig.navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-h-[44px] px-3.5 flex items-center text-small font-medium transition-colors duration-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 ${
                    isActive
                      ? "text-primary-600 border-b-2 border-primary-600 font-semibold rounded-none"
                      : "text-text-muted hover:text-ink-900 hover:bg-primary-50 rounded"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Tagline */}
        <div className="hidden lg:block text-small text-text-muted">
          <span>{siteConfig.tagline}</span>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          ref={toggleButtonRef}
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-ink-800 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" aria-hidden="true" />
          ) : (
            <Menu className="w-6 h-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          ref={menuRef}
          id="mobile-navigation"
          className="md:hidden border-t border-border-default bg-bg-surface px-4 py-3 space-y-1 shadow-card"
        >
          {siteConfig.navLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`min-h-[44px] px-4 flex items-center text-body font-medium transition-colors duration-subtle ${
                  isActive
                    ? "text-primary-600 border-b-2 border-primary-600 font-semibold rounded-none"
                    : "text-text-body hover:bg-primary-50 rounded"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-2 pb-1 px-4 text-small text-text-muted border-t border-border-default mt-2">
            {siteConfig.tagline}
          </div>
        </div>
      )}
    </header>
  );
};
