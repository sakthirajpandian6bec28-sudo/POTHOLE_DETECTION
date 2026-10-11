import React, { useState } from "react";
import {
  Button,
  Card,
  Badge,
  Input,
  Section,
  PageHeader,
  Alert,
  Spinner,
  EmptyState,
} from "../components";
import { Search, MapPin, UploadCloud, ShieldAlert, ArrowRight } from "lucide-react";

export const DevComponentsPage: React.FC = () => {
  const [inputValue, setInputValue] = useState("");
  const [showAlert, setShowAlert] = useState(true);

  return (
    <div className="max-w-content mx-auto w-full px-4 md:px-6 py-8 md:py-12 space-y-12 pb-16">
      <PageHeader
        title="Component system & typography"
        description="Design system inspection page displaying tokens, components, type scale, and accessibility states."
        badge={<Badge variant="primary" dot>Dev review</Badge>}
        actions={
          <Button variant="secondary" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Scroll to top
          </Button>
        }
      />

      {/* 1. TYPOGRAPHY SCALE */}
      <section className="space-y-4">
        <h2 className="text-h3 font-semibold text-ink-900 border-b border-border-default pb-2">
          1. Typography scale
        </h2>
        <Card>
          <div className="space-y-6">
            <div className="border-b border-border-default pb-4">
              <span className="text-caption text-text-muted uppercase tracking-wider block mb-1">
                H1 Desktop 48px / 56px (Semibold) &bull; Mobile 36px / 44px
              </span>
              <h1 className="text-h1-mobile md:text-h1 font-semibold text-ink-900">
                Pothole detection infrastructure
              </h1>
            </div>

            <div className="border-b border-border-default pb-4">
              <span className="text-caption text-text-muted uppercase tracking-wider block mb-1">
                H2 Desktop 36px / 44px (Semibold) &bull; Mobile 28px / 36px
              </span>
              <h2 className="text-h2-mobile md:text-h2 font-semibold text-ink-900">
                Road hazard analysis and mapping
              </h2>
            </div>

            <div className="border-b border-border-default pb-4">
              <span className="text-caption text-text-muted uppercase tracking-wider block mb-1">
                H3 24px / 32px (Semibold)
              </span>
              <h3 className="text-h3 font-semibold text-ink-900">
                Verified detections across municipal sectors
              </h3>
            </div>

            <div className="border-b border-border-default pb-4">
              <span className="text-caption text-text-muted uppercase tracking-wider block mb-1">
                H4 20px / 28px (Medium)
              </span>
              <h4 className="text-h4 font-medium text-ink-900">
                Inspection sensor feed parameters
              </h4>
            </div>

            <div className="border-b border-border-default pb-4">
              <span className="text-caption text-text-muted uppercase tracking-wider block mb-1">
                Body 16px / 24px (Regular)
              </span>
              <p className="text-body text-text-body max-w-3xl">
                The detection engine processes road frames using a custom-trained YOLO model,
                recording spatial coordinates and assigning severity levels based on surface damage area.
              </p>
            </div>

            <div className="border-b border-border-default pb-4">
              <span className="text-caption text-text-muted uppercase tracking-wider block mb-1">
                Small 14px / 20px (Regular) &mdash; Minimum Readable Size
              </span>
              <p className="text-small text-text-muted max-w-3xl">
                This model can miss some potholes (recall approximately 70%) and serves as decision support,
                not a replacement for formal road inspection.
              </p>
            </div>

            <div>
              <span className="text-caption text-text-muted uppercase tracking-wider block mb-1">
                Caption 12px / 16px (Metadata / Badges only)
              </span>
              <p className="text-caption text-text-muted">
                GPS COORDINATES: 12.9716 N, 77.5946 E &bull; TIMESTAMP: 2026-10-11T12:00:00Z
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* 2. BUTTONS */}
      <section className="space-y-4">
        <h2 className="text-h3 font-semibold text-ink-900 border-b border-border-default pb-2">
          2. Buttons (&gt;= 44px touch target)
        </h2>
        <Card title="Button variants and interactive states">
          <div className="space-y-6">
            <div>
              <h4 className="text-small font-medium text-text-muted mb-3 uppercase tracking-wider">
                Variants (Default Size: md)
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary button</Button>
                <Button variant="secondary">Secondary button</Button>
                <Button variant="ghost">Ghost button</Button>
                <Button variant="danger">Danger button</Button>
              </div>
            </div>

            <div>
              <h4 className="text-small font-medium text-text-muted mb-3 uppercase tracking-wider">
                Sizes (All &gt;= 44px min height)
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small size</Button>
                <Button size="md">Medium size</Button>
                <Button size="lg">Large size</Button>
              </div>
            </div>

            <div>
              <h4 className="text-small font-medium text-text-muted mb-3 uppercase tracking-wider">
                States: Loading &amp; Disabled
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" isLoading>
                  Analyzing media
                </Button>
                <Button variant="secondary" isLoading>
                  Saving record
                </Button>
                <Button variant="primary" disabled>
                  Disabled primary
                </Button>
                <Button variant="secondary" disabled>
                  Disabled secondary
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-small font-medium text-text-muted mb-3 uppercase tracking-wider">
                With icons (Rounded squares filled with primary-50, icon in primary-600)
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" leftIcon={<UploadCloud className="w-4 h-4" />}>
                  Upload road media
                </Button>
                <Button variant="secondary" leftIcon={<MapPin className="w-4 h-4" />}>
                  GPS location
                </Button>
                <Button variant="danger" leftIcon={<ShieldAlert className="w-4 h-4" />}>
                  Hazard report
                </Button>
                <Button variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View map detections
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. BADGES & SEVERITY */}
      <section className="space-y-4">
        <h2 className="text-h3 font-semibold text-ink-900 border-b border-border-default pb-2">
          3. Badges and severity levels
        </h2>
        <Card title="WCAG AA compliant severity badges (soft background with dark text)">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="neutral">Neutral badge</Badge>
              <Badge variant="primary">Primary badge</Badge>
              <Badge variant="severity-low">Low severity</Badge>
              <Badge variant="severity-medium">Medium severity</Badge>
              <Badge variant="severity-high">High severity</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="neutral" dot>Neutral with dot</Badge>
              <Badge variant="primary" dot>Primary with dot</Badge>
              <Badge variant="severity-low" dot>Low severity (active)</Badge>
              <Badge variant="severity-medium" dot>Medium severity (active)</Badge>
              <Badge variant="severity-high" dot>High severity (urgent)</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="severity-low" size="sm">Low sm</Badge>
              <Badge variant="severity-medium" size="sm">Med sm</Badge>
              <Badge variant="severity-high" size="sm">High sm</Badge>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. FORM INPUTS */}
      <section className="space-y-4">
        <h2 className="text-h3 font-semibold text-ink-900 border-b border-border-default pb-2">
          4. Form inputs (&gt;= 44px min height)
        </h2>
        <Card title="Input fields with accessible states">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Standard road identifier"
              placeholder="e.g. MG Road Sector 4"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              helperText="Enter the name or stretch identifier for the road."
            />

            <Input
              label="Search coordinates"
              placeholder="Search by latitude, longitude..."
              leftIcon={<Search className="w-4 h-4" />}
            />

            <Input
              label="Input with error state"
              value="Invalid coordinates"
              readOnly
              error="Latitude must be between -90.0 and 90.0 degrees."
            />

            <Input
              label="Disabled input"
              value="Read-only model checkpoint"
              disabled
              helperText="Model parameters cannot be edited at runtime."
            />
          </div>
        </Card>
      </section>

      {/* 5. ALERTS & FEEDBACK */}
      <section className="space-y-4">
        <h2 className="text-h3 font-semibold text-ink-900 border-b border-border-default pb-2">
          5. Alerts (Visible errors, warnings, notices per Rule 4)
        </h2>
        <div className="space-y-4">
          <Alert variant="info" title="System inspection ready">
            Model weights loaded successfully from backend/models/best.pt. Ready for single-image or short-video inference.
          </Alert>

          <Alert
            variant="warning"
            title="Recall performance notice"
            actionText="Read model documentation"
            onAction={() => alert("Refer to PROJECT_RULES.md for exact model benchmarks.")}
          >
            The model achieves 69.8% recall at epoch 150. Some smaller or shallow road depressions may not be detected.
          </Alert>

          {showAlert && (
            <Alert
              variant="error"
              title="Upload failed: unsupported media format"
              actionText="Retry with supported JPG, PNG or MP4"
              onAction={() => alert("Please choose a valid JPG/PNG/MP4 file.")}
              onClose={() => setShowAlert(false)}
            >
              Uploaded file format 'image/gif' is not accepted. Supported formats are JPG, PNG, WEBP, and MP4 up to 25MB.
            </Alert>
          )}

          <Alert variant="success" title="Pothole logged successfully">
            Detection record saved with GPS coordinates (12.9716, 77.5946) and assigned high severity status.
          </Alert>
        </div>
      </section>

      {/* 6. CARDS & SECTIONS */}
      <Section
        title="6. Cards and section containers"
        subtitle="Demonstrating Section padding (96px desktop / 56px mobile) and Card layouts."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title="Detection summary card"
            subtitle="Analyzed batch results"
            headerAction={<Badge variant="primary">Batch #104</Badge>}
            footer={
              <div className="flex items-center justify-between text-small text-text-muted">
                <span>Inference time: 42ms</span>
                <span className="font-medium text-ink-900">4 potholes found</span>
              </div>
            }
          >
            <p className="text-body text-text-body">
              The card container provides a 1px neutral border, 8px corner radius, and subtle shadow
              without harsh outlines or glassmorphism.
            </p>
          </Card>

          <Card
            title="Card without footer"
            subtitle="Compact data presentation"
          >
            <div className="flex items-center justify-between py-2 border-b border-border-default text-small">
              <span className="text-text-muted">Confidence threshold</span>
              <span className="font-medium text-ink-900">0.25</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border-default text-small">
              <span className="text-text-muted">IoU threshold</span>
              <span className="font-medium text-ink-900">0.45</span>
            </div>
            <div className="flex items-center justify-between py-2 text-small">
              <span className="text-text-muted">Max upload limit</span>
              <span className="font-medium text-ink-900">25 MB</span>
            </div>
          </Card>
        </div>
      </Section>

      {/* 7. SPINNER & UPLOAD DROPZONE / EMPTY STATE */}
      <section className="space-y-4">
        <h2 className="text-h3 font-semibold text-ink-900 border-b border-border-default pb-2">
          7. Spinner and upload dropzone / empty state
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <Card title="Loading spinners">
            <div className="flex items-center gap-6 py-4">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
          </Card>

          <EmptyState
            title="Upload road imagery"
            description="Drag and drop road photos or videos here. Dashed primary-600 border on primary-50, switching to primary-100 on drag."
            icon={<UploadCloud className="w-6 h-6 text-primary-600" aria-hidden="true" />}
            action={
              <Button variant="primary" size="sm">
                Browse files
              </Button>
            }
          />
        </div>
      </section>
    </div>
  );
};

export default DevComponentsPage;
