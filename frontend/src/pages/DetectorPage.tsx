import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  Play,
  Square,
  Radio,
  MapPin,
  ExternalLink,
  Trash2,
} from "lucide-react";

import {
  Button,
  Card,
  Badge,
  Input,
  Alert,
  Spinner,
} from "../components";
import { detectorContent } from "../config/content/detector";
import { siteConfig } from "../config/site.config";

interface DetectionLogEntry {
  id: string;
  timestamp: string;
  count: number;
  maxSeverity: string;
  confidence: number;
  latitude: number;
  longitude: number;
  savedToDb: boolean;
}

export const DetectorPage: React.FC = () => {
  // Camera feed states
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTab, setActiveTab] = useState<"browser" | "stream">("browser");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [ipFrameBase64, setIpFrameBase64] = useState<string | null>(null);

  // Detection parameters
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.25);
  const [scanInterval, setScanInterval] = useState<number>(400); // ms (~2.5 FPS)
  const [autoLog, setAutoLog] = useState<boolean>(true);

  // Vehicle GPS Coordinates
  const [coordinates, setCoordinates] = useState({
    lat: siteConfig.mapDefault.lat,
    lng: siteConfig.mapDefault.lng,
  });
  const [gpsActive, setGpsActive] = useState<boolean>(false);

  // Real-time telemetry
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [activePotholesCount, setActivePotholesCount] = useState<number>(0);
  const [maxSeverity, setMaxSeverity] = useState<string | null>(null);
  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false);

  // Errors and notification
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Detection event history log
  const [detectionLogs, setDetectionLogs] = useState<DetectionLogEntry[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  isStreamingRef.current = isStreaming;
  const isProcessingRef = useRef<boolean>(false);
  const lastLogTimeRef = useRef<number>(0);

  // 1. Enumerate video input devices on mount
  useEffect(() => {
    async function loadDevices() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          return;
        }
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devList.filter((d) => d.kind === "videoinput");
        setDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      } catch (err) {
        console.warn("Could not enumerate video devices:", err);
      }
    }
    loadDevices();
  }, [selectedDeviceId]);

  // 2. Track GPS coordinates using Geolocation API
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setCoordinates({
            lat: parseFloat(position.coords.latitude.toFixed(6)),
            lng: parseFloat(position.coords.longitude.toFixed(6)),
          });
          setGpsActive(true);
        },
        () => {
          setGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // 3. Clear canvas overlays
  const clearOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // 4. Start camera stream
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (activeTab === "stream") {
        let clean = streamUrl.trim();
        if (!clean) {
          setErrorMessage("Please enter your phone's IP address (e.g. http://192.168.29.8:8080)");
          return;
        }
        if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.startsWith("rtsp://")) {
          clean = "http://" + clean;
          setStreamUrl(clean);
        }
        setIsStreaming(true);
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage(detectorContent.camera.permissionError);
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsStreaming(true);
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (window.location.protocol === "http:" && window.location.hostname !== "localhost") {
        setErrorMessage(
          `Mobile Camera requires HTTPS: Please visit https://${window.location.host} on your phone, accept the SSL certificate, and grant camera permissions.`
        );
      } else {
        setErrorMessage(
          `${detectorContent.camera.permissionError} (${msg}). If blocked, tap the lock or settings icon in your mobile browser URL bar and set Camera to 'Allow'.`
        );
      }
      setIsStreaming(false);
    }
  };

  // 5. Stop camera stream
  const stopCamera = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIpFrameBase64(null);
    setActivePotholesCount(0);
    setMaxSeverity(null);
    clearOverlay();
  }, [clearOverlay]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // 6. Draw bounding boxes on canvas overlay
  const renderDetections = useCallback(
    (
      detections: Array<{
        box: number[];
        confidence: number;
        class_name: string;
        severity: string;
      }>,
      videoWidth: number,
      videoHeight: number
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, videoWidth, videoHeight);

      detections.forEach((det) => {
        const [x1, y1, x2, y2] = det.box;
        const w = x2 - x1;
        const h = y2 - y1;

        // Read semantic severity colors directly from CSS tokens
        const rootStyle = getComputedStyle(document.documentElement);
        const colorLow = rootStyle.getPropertyValue("--color-sev-low").trim();
        const colorMed = rootStyle.getPropertyValue("--color-sev-medium").trim();
        const colorHigh = rootStyle.getPropertyValue("--color-sev-high").trim();
        const colorInk900 = rootStyle.getPropertyValue("--color-ink-900").trim();

        let strokeColor = colorLow;
        let bgColor = "rgba(220, 252, 231, 0.95)";
        const textColor = colorInk900;

        if (det.severity === "medium") {
          strokeColor = colorMed;
          bgColor = "rgba(254, 243, 199, 0.95)";
        } else if (det.severity === "high") {
          strokeColor = colorHigh;
          bgColor = "rgba(254, 226, 226, 0.95)";
        }

        // Bounding box border
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, w, h);

        // Header label
        const confPct = Math.round(det.confidence * 100);
        const label = `${det.class_name} ${confPct}% [${det.severity.toUpperCase()}]`;

        ctx.font = "600 13px Inter, sans-serif";
        const textWidth = ctx.measureText(label).width;
        const badgeHeight = 22;
        const badgeY = Math.max(0, y1 - badgeHeight);

        ctx.fillStyle = bgColor;
        ctx.fillRect(x1, badgeY, textWidth + 12, badgeHeight);

        ctx.fillStyle = textColor;
        ctx.fillText(label, x1 + 6, badgeY + 16);
      });
    },
    []
  );

  // 7. Capture single frame from video or IP stream and send to backend
  const processLiveFrame = useCallback(async () => {
    if (!isStreamingRef.current || isProcessingRef.current) {
      return;
    }

    // Branch A: Hardware IP Camera Stream
    if (activeTab === "stream") {
      if (!streamUrl || !streamUrl.trim()) return;

      isProcessingRef.current = true;
      setIsProcessingFrame(true);

      try {
        const nowMs = Date.now();
        const shouldLogToDb = autoLog && nowMs - lastLogTimeRef.current > 3000;
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const response = await fetch(`${apiUrl}/api/detect/ip-stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stream_url: streamUrl.trim(),
            confidence_threshold: confidenceThreshold,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            auto_log: shouldLogToDb,
          }),
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(
            errJson.error?.message ||
              `Could not connect to camera stream at '${streamUrl}'. Please check: 1) IP Webcam app is open and 'Start Server' is running. 2) Keep the phone screen ON. 3) Phone and computer are on the same Wi-Fi.`
          );
        }

        const result = await response.json();
        setLatencyMs(result.inference_time_ms);
        setActivePotholesCount(result.total_detections);
        setMaxSeverity(result.highest_severity);
        setIpFrameBase64(result.frame_base64);

        if (shouldLogToDb && result.total_detections > 0) {
          lastLogTimeRef.current = nowMs;
        }

        // Render detections on canvas overlay
        const img = new Image();
        img.onload = () => {
          renderDetections(result.detections, img.naturalWidth || 640, img.naturalHeight || 480);
        };
        img.src = result.frame_base64;

        if (result.total_detections > 0) {
          const timeStr = new Date().toLocaleTimeString();
          setDetectionLogs((prev) => [
            {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              timestamp: timeStr,
              count: result.total_detections,
              maxSeverity: result.highest_severity || "low",
              confidence: Math.max(...result.detections.map((d: { confidence: number }) => d.confidence)),
              latitude: coordinates.lat,
              longitude: coordinates.lng,
              savedToDb: shouldLogToDb,
            },
            ...prev.slice(0, 24),
          ]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        stopCamera();
      } finally {
        isProcessingRef.current = false;
        setIsProcessingFrame(false);
      }
      return;
    }

    // Branch B: Local webcam / browser media stream
    let sourceW = 0;
    let sourceH = 0;
    let sourceElement: CanvasImageSource | null = null;

    if (activeTab === "browser" && videoRef.current) {
      const video = videoRef.current;
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        sourceW = video.videoWidth;
        sourceH = video.videoHeight;
        sourceElement = video;
      }
    }

    if (!sourceElement || sourceW === 0 || sourceH === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsProcessingFrame(true);

    try {
      // High-performance downscale to max 640px dimension for ultra-low latency inference
      const maxDim = 640;
      const scale = Math.min(1, maxDim / Math.max(sourceW, sourceH));
      const targetW = Math.round(sourceW * scale);
      const targetH = Math.round(sourceH * scale);

      const offscreen = document.createElement("canvas");
      offscreen.width = targetW;
      offscreen.height = targetH;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(sourceElement, 0, 0, targetW, targetH);

      let frameBase64: string;
      try {
        frameBase64 = offscreen.toDataURL("image/jpeg", 0.65);
      } catch (canvasErr: unknown) {
        const msg = canvasErr instanceof Error ? canvasErr.message : String(canvasErr);
        if (msg.includes("Tainted") || msg.includes("SecurityError")) {
          setErrorMessage(
            "CORS Access Restricted: The camera stream does not permit reading video frames. On your phone app, enable 'CORS / Access-Control-Allow-Origin', or connect using 'Connected hardware camera' directly from your phone."
          );
          setIsStreaming(false);
          return;
        }
        throw canvasErr;
      }

      // Throttle database logging to once every 3 seconds
      const nowMs = Date.now();
      const shouldLogToDb = autoLog && nowMs - lastLogTimeRef.current > 3000;

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/detect/frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: frameBase64,
          confidence_threshold: confidenceThreshold,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          auto_log: shouldLogToDb,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Frame detection request failed");
      }

      const result = await response.json();

      setLatencyMs(result.inference_time_ms);
      setActivePotholesCount(result.total_detections);
      setMaxSeverity(result.highest_severity);

      if (shouldLogToDb && result.total_detections > 0) {
        lastLogTimeRef.current = nowMs;
      }

      // Scale coordinates back to original video dimensions for pixel-perfect overlay
      const scaleBackX = sourceW / targetW;
      const scaleBackY = sourceH / targetH;
      const scaledDetections = result.detections.map((det: {
        box: number[];
        confidence: number;
        class_name: string;
        severity: string;
      }) => ({
        ...det,
        box: [
          Math.round(det.box[0] * scaleBackX),
          Math.round(det.box[1] * scaleBackY),
          Math.round(det.box[2] * scaleBackX),
          Math.round(det.box[3] * scaleBackY),
        ],
      }));

      // Render detection boxes on active video overlay
      renderDetections(scaledDetections, sourceW, sourceH);

      // Log event if potholes detected
      if (result.total_detections > 0) {
        const timeStr = new Date().toLocaleTimeString();
        setDetectionLogs((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: timeStr,
            count: result.total_detections,
            maxSeverity: result.highest_severity || "low",
            confidence: Math.max(...result.detections.map((d: { confidence: number }) => d.confidence)),
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            savedToDb: shouldLogToDb,
          },
          ...prev.slice(0, 24),
        ]);
      }
    } catch (err: unknown) {
      console.warn("Live frame processing error:", err);
    } finally {
      isProcessingRef.current = false;
      setIsProcessingFrame(false);
    }
  }, [
    activeTab,
    confidenceThreshold,
    coordinates.lat,
    coordinates.lng,
    autoLog,
    renderDetections,
  ]);

  // 8. Recurring interval scanning loop
  useEffect(() => {
    if (isStreaming) {
      timerRef.current = window.setInterval(() => {
        processLiveFrame();
      }, scanInterval);
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isStreaming, scanInterval, processLiveFrame]);

  return (
    <div className="w-full flex flex-col">
      {/* Full-width Hero Gradient Header Band per design theme */}
      <section className="w-full bg-hero-gradient text-white py-10 md:py-14 border-b border-ink-800">
        <div className="max-w-content mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <span className="text-caption font-semibold tracking-wider uppercase text-accent-400 block">
                ROAD HAZARD AI &bull; LIVE SENSOR STREAM
              </span>
              <h1 className="text-h1-mobile md:text-h1 font-semibold text-white tracking-tight">
                {detectorContent.header.title}
              </h1>
              <p className="text-body text-slate-200 leading-relaxed max-w-2xl">
                {detectorContent.header.description}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {isStreaming ? (
                <Badge variant="severity-low" dot>
                  {detectorContent.camera.statusLive}
                </Badge>
              ) : (
                <Badge variant="neutral" dot>
                  {detectorContent.camera.statusStandby}
                </Badge>
              )}
              <Link to="/map">
                <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="w-4 h-4" />}>
                  View GIS map
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-content mx-auto w-full px-4 md:px-6 py-8 md:py-12 space-y-8">
        {/* Visible Error Banner if any */}
        {errorMessage && (
          <Alert
            variant="error"
            title="Camera connection error"
            actionText="Retry camera initialization"
            onAction={startCamera}
            onClose={() => setErrorMessage(null)}
          >
            {errorMessage}
          </Alert>
        )}

        {/* Telemetry Indicator Row with primary-50 rounded squares and primary-600 icons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <span className="text-small text-text-muted font-medium block">
                {detectorContent.telemetry.activeCountTitle}
              </span>
              <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                <Radio className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <span className="text-h3 font-semibold text-ink-900 mt-2 block">
              {activePotholesCount}
            </span>
          </Card>

          <Card padding="sm">
            <div className="flex items-center justify-between">
              <span className="text-small text-text-muted font-medium block">
                {detectorContent.telemetry.severityTitle}
              </span>
              <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                <Square className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-2">
              {maxSeverity ? (
                <Badge
                  variant={
                    maxSeverity === "high"
                      ? "severity-high"
                      : maxSeverity === "medium"
                      ? "severity-medium"
                      : "severity-low"
                  }
                >
                  {maxSeverity.toUpperCase()}
                </Badge>
              ) : (
                <span className="text-small text-text-muted">None</span>
              )}
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center justify-between">
              <span className="text-small text-text-muted font-medium block">
                {detectorContent.telemetry.latencyTitle}
              </span>
              <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                <Play className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <span className="text-h3 font-semibold text-ink-900 mt-2 block">
              {latencyMs > 0 ? `${latencyMs}ms` : "\u2014"}
            </span>
          </Card>

          <Card padding="sm">
            <div className="flex items-center justify-between">
              <span className="text-small text-text-muted font-medium block">
                {detectorContent.camera.gpsLabel}
              </span>
              <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                <MapPin className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-small text-ink-800">
              <span className="font-mono text-small">
                {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </span>
            </div>
          </Card>
        </div>

        {/* Main Live Detection Studio Viewport */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Live Video Canvas Monitor (Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded border border-border-default shadow-card overflow-hidden bg-ink-900 relative">
              <div className="relative aspect-video w-full flex items-center justify-center bg-ink-900 overflow-hidden">
                {/* Underlying Video Stream for browser webcam */}
                {activeTab === "browser" && (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-contain ${isStreaming ? "block" : "hidden"}`}
                  />
                )}

                {/* Underlying Image Stream for IP camera */}
                {activeTab === "stream" && (
                  <img
                    src={isStreaming && ipFrameBase64 ? ipFrameBase64 : undefined}
                    alt="IP Camera Live Feed"
                    className={`w-full h-full object-contain ${isStreaming && ipFrameBase64 ? "block" : "hidden"}`}
                  />
                )}

                {/* Real-time Bounding Box Canvas Overlay */}
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${
                    isStreaming ? "block" : "hidden"
                  }`}
                />

                {/* Inactive Standby View */}
                {!isStreaming && (
                  <div className="text-center p-8 space-y-4 text-white">
                    <div className="w-16 h-16 rounded-full bg-ink-800 border border-ink-800 flex items-center justify-center mx-auto text-accent-400">
                      <Camera className="w-8 h-8" aria-hidden="true" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-h4 font-medium text-white">
                        {detectorContent.camera.title}
                      </h3>
                      <p className="text-small text-slate-300 mt-1">
                        {detectorContent.camera.subtitle}
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button
                        variant="primary"
                        size="lg"
                        leftIcon={<Play className="w-5 h-5" />}
                        onClick={startCamera}
                      >
                        {detectorContent.camera.startCameraText}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Stream Telemetry Overlay Header */}
                {isStreaming && (
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2">
                      <Badge variant="severity-low" dot>
                        LIVE FEED
                      </Badge>
                      {isProcessingFrame && (
                        <div className="flex items-center gap-1.5 bg-ink-900/90 text-white px-2 py-0.5 rounded text-caption border border-ink-800">
                          <Spinner size="sm" className="text-primary-600" />
                          <span>Scanning</span>
                        </div>
                      )}
                    </div>
                    <div className="bg-ink-900/90 text-white px-2.5 py-1 rounded text-caption border border-ink-800 font-mono">
                      {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Monitor Control Toolbar */}
              <div className="p-4 bg-bg-surface border-t border-border-default flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {isStreaming ? (
                    <Button
                      variant="danger"
                      size="md"
                      leftIcon={<Square className="w-4 h-4" />}
                      onClick={stopCamera}
                    >
                      {detectorContent.camera.stopCameraText}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<Play className="w-4 h-4" />}
                      onClick={startCamera}
                    >
                      {detectorContent.camera.startCameraText}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-small font-medium text-ink-800">
                    <input
                      type="checkbox"
                      checked={autoLog}
                      onChange={(e) => setAutoLog(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded border-border-default focus:ring-primary-600"
                    />
                    <span>{detectorContent.camera.autoLogLabel}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hardware & Stream Configuration Settings */}
          <div className="space-y-6">
            <Card title="Hardware camera settings" subtitle="Input devices and sensor calibration">
              <div className="space-y-5">
                {/* Hardware Input Tabs */}
                <div className="border-b border-border-default flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("browser")}
                    className={`pb-2.5 text-small font-medium border-b-2 transition-colors ${
                      activeTab === "browser"
                        ? "border-primary-600 text-primary-600 font-semibold"
                        : "border-transparent text-text-muted hover:text-ink-900"
                    }`}
                  >
                    {detectorContent.camera.hardwareTabBrowser}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("stream")}
                    className={`pb-2.5 text-small font-medium border-b-2 transition-colors ${
                      activeTab === "stream"
                        ? "border-primary-600 text-primary-600 font-semibold"
                        : "border-transparent text-text-muted hover:text-ink-900"
                    }`}
                  >
                    {detectorContent.camera.hardwareTabStream}
                  </button>
                </div>

                {/* Tab 1: Connected Video Devices */}
                {activeTab === "browser" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-small font-medium text-ink-800 mb-1.5">
                        {detectorContent.camera.deviceSelectLabel}
                      </label>
                      <select
                        value={selectedDeviceId}
                        disabled={isStreaming}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="w-full min-h-[44px] rounded border border-border-default bg-bg-surface px-3 text-body text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 disabled:bg-bg-page disabled:text-text-muted disabled:cursor-not-allowed"
                      >
                        {devices.length === 0 && (
                          <option value="">{detectorContent.camera.deviceDefaultOption}</option>
                        )}
                        {devices.map((device, idx) => (
                          <option key={device.deviceId || idx} value={device.deviceId}>
                            {device.label || `Camera ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  /* Tab 2: Hardware Network Stream */
                  <div className="space-y-4">
                    <Input
                      label={detectorContent.camera.streamUrlLabel}
                      placeholder="http://192.168.1.100:8080/video"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      helperText="Install 'IP Webcam' on Android or 'IP Camera' on iOS, tap 'Start Server', and paste the video URL."
                      leftIcon={<Radio className="w-4 h-4" />}
                    />
                    <div className="bg-primary-50 border border-primary-100 rounded p-3 text-caption text-ink-800 space-y-1">
                      <span className="font-semibold block text-primary-700">Direct Mobile Option:</span>
                      <p>
                        You can also open this webpage directly on your mobile phone browser at{" "}
                        <span className="font-mono font-semibold text-ink-900 bg-bg-surface px-1 py-0.5 rounded border border-border-default">
                          https://192.168.29.11:5173
                        </span>{" "}
                        (same Wi-Fi) to stream using your phone's rear camera and built-in vehicle GPS!
                      </p>
                    </div>
                  </div>
                )}

                {/* Model Confidence Calibration Slider */}
                <div className="space-y-2 pt-2 border-t border-border-default">
                  <div className="flex items-center justify-between text-small">
                    <span className="font-medium text-ink-800">
                      {detectorContent.camera.confidenceLabel}
                    </span>
                    <span className="font-mono text-ink-900 font-semibold">
                      {Math.round(confidenceThreshold * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.90"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-full accent-primary-600 h-2 bg-border-default rounded cursor-pointer"
                  />
                </div>

                {/* Detection Scan Rate Frequency */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-small">
                    <span className="font-medium text-ink-800">
                      {detectorContent.camera.intervalLabel}
                    </span>
                    <span className="font-mono text-ink-900 font-semibold">
                      {scanInterval}ms (~{(1000 / scanInterval).toFixed(1)} FPS)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[250, 400, 800].map((ms) => (
                      <button
                        key={ms}
                        type="button"
                        onClick={() => setScanInterval(ms)}
                        className={`min-h-[44px] rounded border text-small font-medium transition-colors ${
                          scanInterval === ms
                            ? "border-primary-600 bg-primary-50 text-primary-600 font-semibold"
                            : "border-border-default bg-bg-surface text-text-body hover:bg-primary-50"
                        }`}
                      >
                        {ms === 250 ? "Fast (250ms)" : ms === 400 ? "Balanced" : "Low CPU (800ms)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vehicle Coordinates Manual Override */}
                <div className="space-y-3 pt-2 border-t border-border-default">
                  <span className="text-small font-medium text-ink-800 block">
                    Vehicle GPS coordinates
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Latitude"
                      type="number"
                      step="0.0001"
                      value={coordinates.lat}
                      onChange={(e) =>
                        setCoordinates((prev) => ({
                          ...prev,
                          lat: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                    <Input
                      label="Longitude"
                      type="number"
                      step="0.0001"
                      value={coordinates.lng}
                      onChange={(e) =>
                        setCoordinates((prev) => ({
                          ...prev,
                          lng: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="text-caption text-text-muted flex items-center gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        gpsActive ? "bg-sev-low" : "bg-text-muted"
                      }`}
                    />
                    <span>
                      {gpsActive ? "Hardware GPS active" : detectorContent.camera.gpsSearching}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Real-time Detection Event Log Table */}
        <Card
          title={detectorContent.history.title}
          subtitle="Recent road hazard detection events recorded from live camera stream"
          headerAction={
            detectionLogs.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setDetectionLogs([])}
              >
                {detectorContent.history.clearButtonText}
              </Button>
            ) : undefined
          }
        >
          {detectionLogs.length === 0 ? (
            <div className="py-8 text-center text-small text-text-muted">
              {detectorContent.history.emptyText}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-small">
                <thead>
                  <tr className="border-b border-border-default text-text-muted">
                    <th className="py-2.5 px-3 font-medium">{detectorContent.history.timeHeader}</th>
                    <th className="py-2.5 px-3 font-medium">Potholes</th>
                    <th className="py-2.5 px-3 font-medium">{detectorContent.history.severityHeader}</th>
                    <th className="py-2.5 px-3 font-medium">{detectorContent.history.confidenceHeader}</th>
                    <th className="py-2.5 px-3 font-medium">{detectorContent.history.gpsHeader}</th>
                    <th className="py-2.5 px-3 font-medium">Map status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {detectionLogs.map((entry) => (
                    <tr key={entry.id} className="hover:bg-primary-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-text-body">{entry.timestamp}</td>
                      <td className="py-2.5 px-3 font-medium text-ink-900">{entry.count}</td>
                      <td className="py-2.5 px-3">
                        <Badge
                          size="sm"
                          variant={
                            entry.maxSeverity === "high"
                              ? "severity-high"
                              : entry.maxSeverity === "medium"
                              ? "severity-medium"
                              : "severity-low"
                          }
                        >
                          {entry.maxSeverity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-text-body">
                        {Math.round(entry.confidence * 100)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono text-text-muted">
                        {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3">
                        {entry.savedToDb ? (
                          <span className="inline-flex items-center gap-1 text-sev-low font-medium">
                            Logged to database
                          </span>
                        ) : (
                          <span className="text-text-muted">Stream only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Mandatory Inspection Disclaimer per PROJECT_RULES.md */}
        <footer className="text-small text-text-muted border-t border-border-default pt-4">
          <p>{detectorContent.results.disclaimer}</p>
        </footer>
      </div>
    </div>
  );
};

export default DetectorPage;
