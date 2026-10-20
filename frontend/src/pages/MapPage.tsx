import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  RefreshCw,
  Trash2,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Flame,
} from "lucide-react";

import {
  Card,
  Badge,
  Button,
  PageHeader,
  Alert,
  Spinner,
  GoogleMapView,
  PotholeItem,
} from "../components";
import { mapContent } from "../config/content/map";
import { siteConfig } from "../config/site.config";
import { getApiBaseUrl } from "../config/api";

export const MapPage: React.FC = () => {
  const [potholes, setPotholes] = useState<PotholeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [panTarget, setPanTarget] = useState<[number, number] | null>(null);

  const fetchPotholes = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const apiUrl = getApiBaseUrl();
      let url = `${apiUrl}/api/potholes?page=1&page_size=100`;
      if (selectedSeverity) {
        url += `&severity=${selectedSeverity}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to fetch potholes from API");
      }

      const data = await res.json();
      setPotholes(data.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Unable to load pothole location records: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSeverity]);

  useEffect(() => {
    fetchPotholes();
  }, [fetchPotholes]);

  // Remove individual pothole record
  const deletePothole = async (id: number) => {
    if (!window.confirm(`Delete pothole record #${id}?`)) {
      return;
    }
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/potholes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to delete record");
      }
      setPotholes((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error deleting record: ${msg}`);
    }
  };

  // Remove all or severity-filtered pothole records
  const deleteSeverityRecords = async (severity: string | null) => {
    const label = severity ? `${severity.toUpperCase()} severity` : "ALL";
    if (!window.confirm(`Are you sure you want to remove ${label} records? This operation cannot be undone.`)) {
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      let url = `${apiUrl}/api/potholes`;
      if (severity) {
        url += `?severity=${severity}`;
      }
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to remove records");
      }
      if (severity) {
        setPotholes((prev) => prev.filter((p) => p.severity !== severity));
      } else {
        setPotholes([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error removing records: ${msg}`);
    }
  };

  // Statistics calculation
  const totalCount = potholes.length;
  const highCount = potholes.filter((p) => p.severity === "high").length;
  const mediumCount = potholes.filter((p) => p.severity === "medium").length;
  const lowCount = potholes.filter((p) => p.severity === "low").length;

  return (
    <div className="max-w-content mx-auto w-full px-4 md:px-6 py-8 md:py-12 space-y-8">
      {/* Plain page header on bg-page per requirement */}
      <PageHeader
        title={mapContent.header.title}
        description={mapContent.header.description}
        badge={<Badge variant="primary">GIS Database</Badge>}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              isLoading={isLoading}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => fetchPotholes()}
            >
              Refresh records
            </Button>
          </div>
        }
      />

      {errorMessage && (
        <Alert
          variant="error"
          title="Data retrieval error"
          actionText="Retry"
          onAction={() => fetchPotholes()}
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {/* Overview Statistics Cards with primary-50 rounded squares and primary-600 icons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-small text-text-muted font-medium block">
              {mapContent.stats.totalPotholes}
            </span>
            <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
              <Layers className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <span className="text-h3 font-semibold text-ink-900 mt-2 block">
            {totalCount}
          </span>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-small text-text-muted font-medium block">
              {mapContent.stats.highSeverityCount}
            </span>
            <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
              <Flame className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <span className="text-h3 font-semibold text-danger mt-2 block">
            {highCount}
          </span>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-small text-text-muted font-medium block">
              {mapContent.stats.mediumSeverityCount}
            </span>
            <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <span className="text-h3 font-semibold text-sev-medium mt-2 block">
            {mediumCount}
          </span>
        </Card>

        <Card padding="sm">
          <div className="flex items-center justify-between">
            <span className="text-small text-text-muted font-medium block">
              {mapContent.stats.lowSeverityCount}
            </span>
            <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <span className="text-h3 font-semibold text-sev-low mt-2 block">
            {lowCount}
          </span>
        </Card>
      </div>

      {/* Severity Filter Controls and Remove Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-small font-medium text-ink-800 mr-2">
            {mapContent.filters.title}:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSeverity(null)}
            className={`min-h-[44px] px-4 rounded text-small font-medium transition-colors ${
              selectedSeverity === null
                ? "bg-ink-900 text-white font-semibold shadow-subtle"
                : "bg-bg-surface text-text-body border border-border-default hover:bg-primary-50"
            }`}
          >
            {mapContent.filters.allSeverities} ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedSeverity("high")}
            className={`min-h-[44px] px-4 rounded text-small font-medium transition-colors ${
              selectedSeverity === "high"
                ? "bg-sev-high-soft text-ink-900 border-2 border-danger font-semibold shadow-subtle"
                : "bg-bg-surface text-text-body border border-border-default hover:bg-primary-50"
            }`}
          >
            {mapContent.filters.highSeverity} ({highCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedSeverity("medium")}
            className={`min-h-[44px] px-4 rounded text-small font-medium transition-colors ${
              selectedSeverity === "medium"
                ? "bg-sev-medium-soft text-ink-900 border-2 border-sev-medium font-semibold shadow-subtle"
                : "bg-bg-surface text-text-body border border-border-default hover:bg-primary-50"
            }`}
          >
            {mapContent.filters.mediumSeverity} ({mediumCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedSeverity("low")}
            className={`min-h-[44px] px-4 rounded text-small font-medium transition-colors ${
              selectedSeverity === "low"
                ? "bg-sev-low-soft text-ink-900 border-2 border-sev-low font-semibold shadow-subtle"
                : "bg-bg-surface text-text-body border border-border-default hover:bg-primary-50"
            }`}
          >
            {mapContent.filters.lowSeverity} ({lowCount})
          </button>
        </div>

        {/* Button to remove severity records */}
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={() => deleteSeverityRecords(selectedSeverity)}
            disabled={potholes.length === 0}
          >
            {selectedSeverity
              ? `Remove ${selectedSeverity} severity records`
              : "Remove severity records"}
          </Button>
        </div>
      </div>

      {/* Google Maps Viewport Container with Custom Severity Markers & Controls */}
      <Card padding="none" className="overflow-hidden border border-border-default shadow-card">
        <div className="h-[480px] md:h-[560px] w-full relative">
          {isLoading && potholes.length === 0 ? (
            <div className="absolute inset-0 z-10 bg-bg-surface/80 flex items-center justify-center">
              <Spinner size="lg" label="Loading geospatial data..." />
            </div>
          ) : null}

          <GoogleMapView
            potholes={potholes}
            panTarget={panTarget}
            defaultCenter={{ lat: siteConfig.mapDefault.lat, lng: siteConfig.mapDefault.lng }}
            defaultZoom={siteConfig.mapDefault.zoom}
            onDeletePothole={deletePothole}
          />
        </div>
      </Card>

      {/* Logged Potholes Inventory Data Table */}
      <Card
        title={mapContent.table.title}
        subtitle="Catalog of all validated pothole hazards transmitted from vehicle cameras"
      >
        {potholes.length === 0 ? (
          <div className="py-8 text-center text-small text-text-muted">
            {mapContent.table.emptyText}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-small">
              <thead>
                <tr className="border-b border-border-default text-text-muted">
                  <th className="py-3 px-3 font-medium">{mapContent.table.idHeader}</th>
                  <th className="py-3 px-3 font-medium">{mapContent.table.severityHeader}</th>
                  <th className="py-3 px-3 font-medium">{mapContent.table.confidenceHeader}</th>
                  <th className="py-3 px-3 font-medium">{mapContent.table.locationHeader}</th>
                  <th className="py-3 px-3 font-medium">{mapContent.table.timeHeader}</th>
                  <th className="py-3 px-3 font-medium">{mapContent.table.typeHeader}</th>
                  <th className="py-3 px-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {potholes.map((item) => (
                  <tr key={item.id} className="hover:bg-primary-50 transition-colors">
                    <td className="py-3 px-3 font-medium text-ink-900">#{item.id}</td>
                    <td className="py-3 px-3">
                      <Badge
                        size="sm"
                        variant={
                          item.severity === "high"
                            ? "severity-high"
                            : item.severity === "medium"
                            ? "severity-medium"
                            : "severity-low"
                        }
                      >
                        {item.severity.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-text-body">
                      {Math.round(item.confidence * 100)}%
                    </td>
                    <td className="py-3 px-3 font-mono text-text-muted">
                      {item.latitude !== null && item.longitude !== null ? (
                        `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                      ) : (
                        <span className="text-text-muted">No GPS</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-text-body">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      {item.is_demo ? (
                        <Badge size="sm" variant="neutral">Demo record</Badge>
                      ) : (
                        <Badge size="sm" variant="primary">Live camera</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.latitude !== null && item.longitude !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setPanTarget([item.latitude!, item.longitude!]);
                              window.scrollTo({ top: 380, behavior: "smooth" });
                            }}
                            className="text-primary-600 hover:text-primary-700 hover:underline text-small font-medium inline-flex items-center gap-1 p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-600"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{mapContent.table.viewOnMapButton}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deletePothole(item.id)}
                          title="Remove record"
                          aria-label={`Remove pothole record #${item.id}`}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-text-muted hover:text-danger rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default MapPage;
