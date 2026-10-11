import React from "react";
import { Link } from "react-router-dom";
import { siteConfig } from "../config/site.config";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ink-900 text-white py-6 mt-auto">
      <div className="max-w-content mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-small">
        <span className="font-medium text-white">{siteConfig.name}</span>
        <div className="flex items-center gap-6">
          {siteConfig.navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className="text-text-muted hover:text-white transition-colors duration-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded px-1"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
};
