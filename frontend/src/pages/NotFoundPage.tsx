import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../components/Button";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-12 md:py-16 text-center">
      <div className="rounded border border-border-default bg-bg-surface p-8 shadow-card space-y-4">
        <span className="text-small font-semibold tracking-wider text-primary-600 uppercase">
          Error 404
        </span>
        <h1 className="text-h2 font-semibold text-ink-900 tracking-tight">
          Page not found
        </h1>
        <p className="text-body text-text-muted">
          The requested page does not exist or has been relocated.
        </p>
        <div className="pt-4 flex justify-center">
          <Link to="/">
            <Button variant="primary" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to detector
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
