import React, { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { MapPin, Key, AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface PotholeItem {
  id: number;
  latitude: number | null;
  longitude: number | null;
  confidence: number;
  severity: string;
  class_name: string;
  box_x1: number | null;
  box_y1: number | null;
  box_x2: number | null;
  box_y2: number | null;
  image_path: string | null;
  timestamp: string;
  is_demo: boolean;
  notes: string | null;
}

export interface GoogleMapViewProps {
  potholes: PotholeItem[];
  panTarget: [number, number] | null;
  defaultCenter: { lat: number; lng: number };
  defaultZoom: number;
  onDeletePothole: (id: number) => Promise<void>;
  className?: string;
}

// Generate SVG marker icon based on severity design tokens
function getSeverityPinSvg(severity: string): string {
  // WCAG AA colors matching tokens.css
  let fillColor = "#15803D"; // sev-low
  let strokeColor = "#14532D";
  if (severity === "medium") {
    fillColor = "#D97706"; // sev-medium
    strokeColor = "#92400E";
  } else if (severity === "high") {
    fillColor = "#DC2626"; // sev-high
    strokeColor = "#991B1B";
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.5 14 24.5 15.1 25.6.5.5 1.3.5 1.8 0C18 40.5 32 26.5 32 16 32 7.16 24.84 0 16 0z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"/>
      <circle cx="16" cy="15" r="7" fill="#FFFFFF"/>
      <text x="16" y="19" font-size="11" font-weight="bold" fill="${fillColor}" text-anchor="middle" font-family="Inter, sans-serif">!</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  potholes,
  panTarget,
  defaultCenter,
  defaultZoom,
  onDeletePothole,
  className = "",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const activeInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [apiKey, setApiKey] = useState<string>(() => {
    const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (envKey && typeof envKey === "string" && envKey.trim().length > 0) {
      return envKey.trim();
    }
    return localStorage.getItem("google_maps_api_key") || "";
  });

  const [inputKey, setInputKey] = useState<string>("");
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);

  // 1. Initialize Google Map with API Key
  useEffect(() => {
    if (!apiKey || !apiKey.trim() || !mapContainerRef.current) {
      setIsMapLoaded(false);
      return;
    }

    setLoadError(null);
    setOptions({
      key: apiKey.trim(),
      v: "weekly",
    });

    let isSubscribed = true;

    Promise.all([
      importLibrary("maps") as Promise<google.maps.MapsLibrary>,
      importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
    ])
      .then(([mapsLib]) => {
        if (!isSubscribed || !mapContainerRef.current) return;

        const map = new mapsLib.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_LEFT,
          },
          fullscreenControl: true,
          streetViewControl: true,
          zoomControl: true,
          scaleControl: true,
          gestureHandling: "cooperative",
        });

        mapInstanceRef.current = map;
        setIsMapLoaded(true);
      })
      .catch((err: unknown) => {
        if (!isSubscribed) return;
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(`Failed to load Google Maps: ${msg}. Please verify your API key.`);
        setIsMapLoaded(false);
      });

    return () => {
      isSubscribed = false;
      mapInstanceRef.current = null;
    };
  }, [apiKey, defaultCenter, defaultZoom]);

  // 2. Sync Pothole Markers on the Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded || typeof google === "undefined") return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    const validPotholes = potholes.filter(
      (p) => p.latitude !== null && p.longitude !== null && !isNaN(p.latitude) && !isNaN(p.longitude)
    );

    validPotholes.forEach((item) => {
      const position = { lat: item.latitude!, lng: item.longitude! };
      const iconUrl = getSeverityPinSvg(item.severity);

      const marker = new google.maps.Marker({
        position,
        map,
        title: `Pothole #${item.id} (${item.severity.toUpperCase()})`,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(32, 42),
          anchor: new google.maps.Point(16, 42),
        },
      });

      // Construct InfoWindow with WCAG AA token styles
      const formattedDate = item.timestamp ? new Date(item.timestamp).toLocaleString() : "Recently logged";
      const confPercent = Math.round(item.confidence * 100);
      const sevBadgeClass =
        item.severity === "high"
          ? "background-color:#FEE2E2; color:#0B1220; border:1px solid #DC2626;"
          : item.severity === "medium"
          ? "background-color:#FEF3C7; color:#0B1220; border:1px solid #D97706;"
          : "background-color:#DCFCE7; color:#0B1220; border:1px solid #15803D;";

      const infoContent = `
        <div style="font-family:Inter,system-ui,sans-serif; font-size:13px; line-height:1.5; color:#0B1220; padding:4px; max-width:260px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #DDE5F2; padding-bottom:6px;">
            <strong style="font-size:14px; color:#0B1220;">Pothole #${item.id}</strong>
            <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; text-transform:uppercase; ${sevBadgeClass}">
              ${item.severity}
            </span>
          </div>
          <div style="margin-bottom:6px;">
            <div style="color:#5B6B82; font-size:11px; text-transform:uppercase; font-weight:600;">Detection Confidence</div>
            <div style="font-size:13px; font-weight:600; color:#0B1220;">${confPercent}% certainty</div>
          </div>
          <div style="margin-bottom:6px;">
            <div style="color:#5B6B82; font-size:11px; text-transform:uppercase; font-weight:600;">Exact Coordinates</div>
            <div style="font-family:monospace; font-size:12px; color:#0B1220; background-color:#F5F8FF; padding:2px 6px; border-radius:4px; display:inline-block;">
              ${item.latitude!.toFixed(6)}, ${item.longitude!.toFixed(6)}
            </div>
          </div>
          <div style="margin-bottom:8px;">
            <div style="color:#5B6B82; font-size:11px; text-transform:uppercase; font-weight:600;">Logged Timestamp</div>
            <div style="font-size:12px; color:#334155;">${formattedDate}</div>
          </div>
          <div style="padding-top:6px; border-top:1px solid #DDE5F2; text-align:right;">
            <button id="infowindow-del-${item.id}" style="background-color:#DC2626; color:#ffffff; border:none; padding:4px 10px; border-radius:4px; font-size:12px; font-weight:500; cursor:pointer;">
              Delete Record
            </button>
          </div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent,
      });

      marker.addListener("click", () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
        }
        infoWindow.open(map, marker);
        activeInfoWindowRef.current = infoWindow;

        // Attach delete event listener once DOM is ready
        google.maps.event.addListenerOnce(infoWindow, "domready", () => {
          const btn = document.getElementById(`infowindow-del-${item.id}`);
          if (btn) {
            btn.onclick = () => {
              infoWindow.close();
              onDeletePothole(item.id);
            };
          }
        });
      });

      markersRef.current.set(item.id, marker);
    });
  }, [potholes, isMapLoaded, onDeletePothole]);

  // 3. Smooth Pan & FlyTo Target
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded || !panTarget) return;

    const [lat, lng] = panTarget;
    map.panTo({ lat, lng });
    map.setZoom(17);

    // Find and trigger marker info window if present
    const matchingPothole = potholes.find(
      (p) =>
        p.latitude !== null &&
        p.longitude !== null &&
        Math.abs(p.latitude - lat) < 0.0001 &&
        Math.abs(p.longitude - lng) < 0.0001
    );

    if (matchingPothole && markersRef.current.has(matchingPothole.id)) {
      const marker = markersRef.current.get(matchingPothole.id);
      if (marker) {
        google.maps.event.trigger(marker, "click");
      }
    }
  }, [panTarget, isMapLoaded, potholes]);

  // Save manual API key to state & localStorage
  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputKey.trim();
    if (cleanKey) {
      localStorage.setItem("google_maps_api_key", cleanKey);
      setApiKey(cleanKey);
      setIsKeySaved(true);
      setTimeout(() => setIsKeySaved(false), 2500);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem("google_maps_api_key");
    setApiKey("");
    setInputKey("");
  };

  return (
    <div className={`relative w-full h-full min-h-[480px] md:min-h-[560px] bg-bg-page ${className}`}>
      {/* If Google Maps API key is not yet configured, show setup banner */}
      {!apiKey && (
        <div className="absolute inset-0 z-20 bg-bg-surface flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600">
            <MapPin className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="text-h4 font-semibold text-ink-900">Google Maps Integration</h3>
            <p className="text-small text-text-muted leading-relaxed">
              OpenStreetMap has been removed. To display real-time satellite, street, and terrain GIS mapping of damaged roads, please provide your Google Maps JavaScript API key.
            </p>
          </div>

          <form onSubmit={handleSaveApiKey} className="w-full max-w-md space-y-3 pt-2">
            <div className="relative">
              <input
                type="text"
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-small rounded border border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 font-mono"
              />
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button type="submit" variant="primary" size="md" disabled={!inputKey.trim()} leftIcon={<Key className="w-4 h-4" />}>
                Activate Google Maps
              </Button>
              {isKeySaved && (
                <span className="text-caption font-semibold text-sev-low">Key Saved!</span>
              )}
            </div>
          </form>

          <p className="text-caption text-text-muted">
            You can also configure this permanently in <code className="bg-primary-50 px-1 py-0.5 rounded text-primary-700 font-mono">frontend/.env</code> as <code className="bg-primary-50 px-1 py-0.5 rounded text-primary-700 font-mono">VITE_GOOGLE_MAPS_API_KEY</code>.
          </p>
        </div>
      )}

      {/* Load Error State */}
      {loadError && apiKey && (
        <div className="absolute inset-0 z-20 bg-bg-surface/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-sev-high-soft text-danger flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-h4 font-semibold text-ink-900">Google Maps Authentication Error</h4>
          <p className="text-small text-danger max-w-md">{loadError}</p>
          <div className="flex items-center gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={handleClearKey}>
              Enter Different API Key
            </Button>
          </div>
        </div>
      )}

      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] md:min-h-[560px] z-0" />

      {/* Severity Legend Overlay */}
      {apiKey && isMapLoaded && (
        <div className="absolute bottom-4 left-4 z-10 bg-bg-surface border border-border-default rounded p-2.5 shadow-card flex items-center gap-3 text-caption font-medium">
          <span className="text-text-muted font-semibold">Severity:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sev-low-soft border border-sev-low inline-block" />
            <span className="text-ink-900">Low</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sev-medium-soft border border-sev-medium inline-block" />
            <span className="text-ink-900">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sev-high-soft border border-danger inline-block" />
            <span className="text-ink-900">High</span>
          </div>
        </div>
      )}
    </div>
  );
};
