import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  Play,
  Square,
  SwitchCamera,
  MapPin,
  ExternalLink,
  Trash2,
  UploadCloud,
  Activity,
  Check,
  Maximize2,
  Minimize2,
  Smartphone,
  Wifi,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import {
  Button,
  Card,
  Badge,
  Input,
  Alert,
  Spinner,
  EmptyState,
} from "../components";
import { detectorContent } from "../config/content/detector";
import { siteConfig } from "../config/site.config";
import {
  getApiBaseUrl,
  checkApiHealth,
} from "../config/api";

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

interface UploadDetection {
  box: number[];
  confidence: number;
  class_name: string;
  severity: string;
}

interface UploadResult {
  filename: string;
  total_detections: number;
  detections: UploadDetection[];
  highest_severity: string | null;
  inference_time_ms: number;
  annotated_image_url?: string;
  saved_pothole_ids?: number[];
}

export const DetectorPage: React.FC = () => {
  // Page mode: Live Camera (Webcam/DroidCam Client) vs Wi-Fi IP Stream vs Media Upload
  const [activeTab, setActiveTab] = useState<"camera" | "ipcam" | "upload">("camera");

  // Camera feed states
  const [isStreaming, setIsStreaming] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // DroidCam Detection helper
  const droidCamDevice = devices.find(
    (d) => d.label && d.label.toLowerCase().includes("droidcam")
  );
  const isDroidCamActive = Boolean(
    droidCamDevice && selectedDeviceId === droidCamDevice.deviceId
  );

  // Wi-Fi IP Camera / DroidCam Stream state
  const [ipStreamUrl, setIpStreamUrl] = useState<string>("http://192.168.29.8:4747");
  const [isIpStreaming, setIsIpStreaming] = useState<boolean>(false);
  const [ipFrameBase64, setIpFrameBase64] = useState<string | null>(null);
  const isIpStreamingRef = useRef<boolean>(false);
  isIpStreamingRef.current = isIpStreaming;
  const ipLoopTimeoutRef = useRef<number | null>(null);
  const [isDroidCamGreenScreen, setIsDroidCamGreenScreen] = useState<boolean>(false);

  // Phone Orientation & Cockpit Landscape Mode
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth > window.innerHeight;
    }
    return false;
  });
  const [isCockpitMode, setIsCockpitMode] = useState<boolean>(false);

  // Detection parameters (0.45 default for 80-90% high precision)
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.45);
  const [scanInterval, setScanInterval] = useState<number>(400); // ms
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

  // Errors and notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const consecutiveErrorsRef = useRef<number>(0);

  // Detection event history log
  const [detectionLogs, setDetectionLogs] = useState<DetectionLogEntry[]>([]);

  // Media upload state
  const [isAnalyzingFile, setIsAnalyzingFile] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for camera loop
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const loopTimeoutRef = useRef<number | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  isStreamingRef.current = isStreaming;
  const isProcessingRef = useRef<boolean>(false);
  const lastLogTimeRef = useRef<number>(0);

  // 1. Phone Orientation Listener (Auto-landscape on phone rotation)
  useEffect(() => {
    const handleOrientation = () => {
      const landscape =
        window.innerWidth > window.innerHeight ||
        (window.screen?.orientation
          ? window.screen.orientation.type.includes("landscape")
          : false);
      setIsLandscape(landscape);
    };

    window.addEventListener("resize", handleOrientation);
    window.addEventListener("orientationchange", handleOrientation);

    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener("change", handleOrientation);
    }

    handleOrientation();

    return () => {
      window.removeEventListener("resize", handleOrientation);
      window.removeEventListener("orientationchange", handleOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener("change", handleOrientation);
      }
    };
  }, []);

  // 2. Initial silent health check on backend
  useEffect(() => {
    const runCheck = async () => {
      const res = await checkApiHealth();
      if (!res.ok) {
        console.warn("Backend health check:", res.message);
      }
    };
    runCheck();
  }, []);

  // 3. Enumerate video input devices & prioritize DroidCam
  const enumerateCameras = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      const devList = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devList.filter((d) => d.kind === "videoinput");
      setDevices(videoInputs);

      // Detect DroidCam (e.g. "DroidCam Video", "DroidCam Source 2", "DroidCam Source 3")
      const droidCam = videoInputs.find(
        (d) => d.label && d.label.toLowerCase().includes("droidcam")
      );

      // Prioritize DroidCam if detected and user hasn't explicitly locked onto another camera
      if (droidCam) {
        setSelectedDeviceId((current) => {
          if (!current || !videoInputs.some((v) => v.deviceId === current)) {
            return droidCam.deviceId;
          }
          return current;
        });
      } else if (videoInputs.length > 0) {
        setSelectedDeviceId((current) => {
          if (!current || !videoInputs.some((v) => v.deviceId === current)) {
            return videoInputs[0].deviceId;
          }
          return current;
        });
      }
    } catch (err) {
      console.warn("Could not enumerate video devices:", err);
    }
  }, []);

  useEffect(() => {
    enumerateCameras();

    // Listen to USB and Virtual Webcam device changes (like DroidCam Client connecting)
    if (navigator.mediaDevices && "addEventListener" in navigator.mediaDevices) {
      const handleDeviceChange = () => {
        enumerateCameras();
      };
      navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      };
    }
  }, [enumerateCameras]);

  // 4. Track High-Accuracy GPS coordinates using Geolocation API
  const requestHighAccuracyGps = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: parseFloat(position.coords.latitude.toFixed(6)),
            lng: parseFloat(position.coords.longitude.toFixed(6)),
          });
          setGpsActive(true);
        },
        (err) => {
          console.warn("High-accuracy GPS fix failed:", err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    requestHighAccuracyGps();

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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [requestHighAccuracyGps]);

  // 5. Clear canvas overlays
  const clearOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // 6. Start camera stream with orientation optimization & DroidCam support
  const startCamera = async (overrideFacingMode?: "environment" | "user", overrideDeviceId?: string) => {
    setErrorMessage(null);
    setApiErrorMessage(null);
    consecutiveErrorsRef.current = 0;

    const targetFacing = overrideFacingMode || facingMode;
    const targetDeviceId = overrideDeviceId !== undefined ? overrideDeviceId : selectedDeviceId;
    setIsDroidCamGreenScreen(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(detectorContent.camera.permissionError);
      return;
    }

    // Stop existing stream if running
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    try {
      const useWide = isLandscape || isCockpitMode;
      const targetDev = devices.find((d) => d.deviceId === targetDeviceId);
      const isDroidCam = targetDev?.label?.toLowerCase().includes("droidcam");

      let constraints: MediaStreamConstraints;
      if (isDroidCam && targetDeviceId) {
        // DroidCam virtual webcam: avoid rigid 1080p constraints which cause DirectShow chroma-green fallback
        constraints = {
          video: {
            deviceId: { exact: targetDeviceId },
          },
          audio: false,
        };
      } else {
        constraints = {
          video: targetDeviceId && !overrideFacingMode
            ? {
                deviceId: { exact: targetDeviceId },
                width: { ideal: useWide ? 1920 : 1280 },
                height: { ideal: useWide ? 1080 : 720 },
              }
            : {
                facingMode: { ideal: targetFacing },
                width: { ideal: useWide ? 1920 : 1280 },
                height: { ideal: useWide ? 1080 : 720 },
              },
          audio: false,
        };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: unknown) {
        // Fallback without exact deviceId constraint if device configuration changed
        if (targetDeviceId) {
          constraints = {
            video: { deviceId: targetDeviceId },
            audio: false,
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } else {
          throw err;
        }
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsStreaming(true);
            enumerateCameras();
          });
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (window.location.protocol === "http:" && window.location.hostname !== "localhost") {
        setErrorMessage(detectorContent.camera.httpsNotice);
      } else {
        setErrorMessage(
          `${detectorContent.camera.permissionError} (${msg}). Please allow camera access in browser site settings.`
        );
      }
      setIsStreaming(false);
    }
  };

  // 7. Stop camera stream
  const stopCamera = useCallback(() => {
    if (loopTimeoutRef.current) {
      window.clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setIsDroidCamGreenScreen(false);
    setActivePotholesCount(0);
    setMaxSeverity(null);
    clearOverlay();
  }, [clearOverlay]);

  // Stop Wi-Fi DroidCam / IP camera stream
  const stopIpStream = useCallback(() => {
    if (ipLoopTimeoutRef.current) {
      window.clearTimeout(ipLoopTimeoutRef.current);
      ipLoopTimeoutRef.current = null;
    }
    setIsIpStreaming(false);
    setIpFrameBase64(null);
    setActivePotholesCount(0);
    setMaxSeverity(null);
  }, []);

  // Process IP camera / DroidCam stream frame from backend
  const processIpFrame = useCallback(async () => {
    if (!isIpStreamingRef.current) return;

    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/detect/ip-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stream_url: ipStreamUrl,
          confidence_threshold: confidenceThreshold,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          auto_log: autoLog,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${response.status} connecting to DroidCam stream`);
      }

      const data = await response.json();
      setLatencyMs(data.inference_time_ms);
      setActivePotholesCount(data.total_detections);
      setMaxSeverity(data.highest_severity);
      setIpFrameBase64(data.frame_base64);

      if (data.total_detections > 0 && autoLog) {
        const timeStr = new Date().toLocaleTimeString();
        setDetectionLogs((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: timeStr,
            count: data.total_detections,
            maxSeverity: data.highest_severity || "low",
            confidence: Math.max(...data.detections.map((d: { confidence: number }) => d.confidence)),
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            savedToDb: true,
          },
          ...prev.slice(0, 24),
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setIsIpStreaming(false);
      return;
    }

    if (isIpStreamingRef.current) {
      ipLoopTimeoutRef.current = window.setTimeout(processIpFrame, scanInterval);
    }
  }, [ipStreamUrl, confidenceThreshold, coordinates.lat, coordinates.lng, autoLog, scanInterval]);

  useEffect(() => {
    if (isIpStreaming) {
      processIpFrame();
    } else {
      if (ipLoopTimeoutRef.current) {
        window.clearTimeout(ipLoopTimeoutRef.current);
        ipLoopTimeoutRef.current = null;
      }
    }
    return () => {
      if (ipLoopTimeoutRef.current) {
        window.clearTimeout(ipLoopTimeoutRef.current);
        ipLoopTimeoutRef.current = null;
      }
    };
  }, [isIpStreaming, processIpFrame]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopIpStream();
    };
  }, [stopCamera, stopIpStream]);

  // 8. Toggle between rear environment camera and front selfie camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (isStreaming) {
      startCamera(nextMode);
    }
  };

  // 9. Toggle Cockpit Landscape mode manually
  const toggleCockpitLandscape = async () => {
    const nextCockpit = !isCockpitMode;
    setIsCockpitMode(nextCockpit);

    if (nextCockpit) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
        if (window.screen?.orientation && "lock" in window.screen.orientation) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (window.screen.orientation as any).lock("landscape").catch(() => {});
        }
      } catch {
        // Fallback gracefully if fullscreen/lock is restricted
      }
    } else {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
        if (window.screen?.orientation && "unlock" in window.screen.orientation) {
          window.screen.orientation.unlock();
        }
      } catch {
        // Fallback gracefully
      }
    }
  };

  // 10. Draw bounding boxes on canvas overlay
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
        const colorLow = rootStyle.getPropertyValue("--color-sev-low").trim() || "#15803D";
        const colorMed = rootStyle.getPropertyValue("--color-sev-medium").trim() || "#D97706";
        const colorHigh = rootStyle.getPropertyValue("--color-sev-high").trim() || "#DC2626";
        const colorInk900 = rootStyle.getPropertyValue("--color-ink-900").trim() || "#0B1220";

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

  // 11. Process single live video frame (Adaptive Loop - No Swallowed Errors)
  const processLiveFrame = useCallback(async () => {
    if (!isStreamingRef.current || isProcessingRef.current) {
      return;
    }

    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      if (isStreamingRef.current) {
        loopTimeoutRef.current = window.setTimeout(processLiveFrame, scanInterval);
      }
      return;
    }

    isProcessingRef.current = true;
    setIsProcessingFrame(true);

    const sourceW = video.videoWidth;
    const sourceH = video.videoHeight;

    try {
      // Downscale to max 480px for low-latency transfer and lightweight cloud inference
      const maxDim = 480;
      const scale = Math.min(1, maxDim / Math.max(sourceW, sourceH));
      const targetW = Math.round(sourceW * scale);
      const targetH = Math.round(sourceH * scale);

      const offscreen = document.createElement("canvas");
      offscreen.width = targetW;
      offscreen.height = targetH;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, targetW, targetH);

      // Check for DroidCam green standby / inactive test frame (bright green chroma key)
      try {
        const imgData = ctx.getImageData(0, 0, targetW, targetH).data;
        const samplePoints = [
          Math.floor((targetW * 0.5) + (targetH * 0.5) * targetW) * 4,
          Math.floor((targetW * 0.25) + (targetH * 0.25) * targetW) * 4,
          Math.floor((targetW * 0.75) + (targetH * 0.25) * targetW) * 4,
          Math.floor((targetW * 0.25) + (targetH * 0.75) * targetW) * 4,
          Math.floor((targetW * 0.75) + (targetH * 0.75) * targetW) * 4,
        ];
        const isSolidGreen = samplePoints.every((idx) => {
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          return g > 150 && r < 60 && b < 60;
        });
        setIsDroidCamGreenScreen(isSolidGreen);
      } catch {
        // Ignore sampling errors
      }

      const frameBase64 = offscreen.toDataURL("image/jpeg", 0.55);

      const nowMs = Date.now();
      const shouldLogToDb = autoLog && nowMs - lastLogTimeRef.current > 3000;
      const apiUrl = getApiBaseUrl();

      const controller = new AbortController();
      // Generous 30s timeout for cloud inference cold-start to prevent premature abort
      const fetchTimer = setTimeout(() => controller.abort(), 30000);

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
        signal: controller.signal,
      });
      clearTimeout(fetchTimer);

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error("Render detection service is currently suspended by its owner. Please resume the service in Render dashboard.");
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${response.status} from detection API`);
      }

      const result = await response.json();

      consecutiveErrorsRef.current = 0;
      if (apiErrorMessage) setApiErrorMessage(null);

      setLatencyMs(result.inference_time_ms);
      setActivePotholesCount(result.total_detections);
      setMaxSeverity(result.highest_severity);

      if (shouldLogToDb && result.total_detections > 0) {
        lastLogTimeRef.current = nowMs;
      }

      // Scale coordinates back to original video dimensions
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
      consecutiveErrorsRef.current += 1;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isAbort =
        (err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error &&
          (err.name === "AbortError" || err.message.toLowerCase().includes("aborted")));

      let friendlyMsg = errMsg;
      if (
        isAbort ||
        errMsg.toLowerCase().includes("failed to fetch") ||
        errMsg.toLowerCase().includes("networkerror")
      ) {
        friendlyMsg =
          "Connecting to cloud AI detection service (waking up free-tier server). Auto-reconnecting...";
      }

      if (consecutiveErrorsRef.current >= 4) {
        setApiErrorMessage(friendlyMsg);
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessingFrame(false);

      if (isStreamingRef.current) {
        const delay =
          consecutiveErrorsRef.current > 0
            ? Math.min(3000, scanInterval * (consecutiveErrorsRef.current + 1))
            : scanInterval;
        loopTimeoutRef.current = window.setTimeout(processLiveFrame, delay);
      }
    }
  }, [
    autoLog,
    confidenceThreshold,
    coordinates.lat,
    coordinates.lng,
    scanInterval,
    renderDetections,
    apiErrorMessage,
  ]);

  // Trigger loop on isStreaming change
  useEffect(() => {
    if (isStreaming) {
      processLiveFrame();
    } else {
      if (loopTimeoutRef.current) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
    }
    return () => {
      if (loopTimeoutRef.current) {
        window.clearTimeout(loopTimeoutRef.current);
        loopTimeoutRef.current = null;
      }
    };
  }, [isStreaming, processLiveFrame]);

  // 12. Handle Road Media File Upload Inspection
  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadResult(null);
    setIsAnalyzingFile(true);

    const apiUrl = getApiBaseUrl();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("confidence", String(confidenceThreshold));

    try {
      const response = await fetch(`${apiUrl}/api/detect`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new Error("Render detection service is currently suspended by its owner. Please resume the service in Render dashboard.");
        }
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${response.status} during media analysis`);
      }

      const result = await response.json();
      setUploadResult({
        filename: file.name,
        total_detections: result.total_detections,
        detections: result.detections,
        highest_severity: result.highest_severity,
        inference_time_ms: result.inference_time_ms,
        annotated_image_url: result.annotated_image_url
          ? (result.annotated_image_url.startsWith("http")
              ? result.annotated_image_url
              : `${apiUrl}${result.annotated_image_url}`)
          : undefined,
      });

      if (result.total_detections > 0) {
        const timeStr = new Date().toLocaleTimeString();
        setDetectionLogs((prev) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            timestamp: timeStr,
            count: result.total_detections,
            maxSeverity: result.highest_severity || "low",
            confidence: Math.max(...result.detections.map((d: UploadDetection) => d.confidence)),
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            savedToDb: false,
          },
          ...prev.slice(0, 24),
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadError(msg);
    } finally {
      setIsAnalyzingFile(false);
    }
  };

  // 13. Save uploaded detections to GIS Database
  const logUploadToDatabase = async () => {
    if (!uploadResult || uploadResult.detections.length === 0) return;

    const apiUrl = getApiBaseUrl();
    try {
      for (const det of uploadResult.detections) {
        await fetch(`${apiUrl}/api/potholes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            confidence: det.confidence,
            severity: det.severity,
            class_name: det.class_name,
            box_x1: det.box[0],
            box_y1: det.box[1],
            box_x2: det.box[2],
            box_y2: det.box[3],
            notes: `Inspected from uploaded road file: ${uploadResult.filename}`,
          }),
        });
      }
      alert(`Successfully saved ${uploadResult.detections.length} road hazard record(s) to GIS map database.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Could not save detections: ${msg}`);
    }
  };

  const isWideFormat = isLandscape || isCockpitMode;

  return (
    <div className="w-full flex flex-col">
      {/* Full-width Hero Gradient Header Band */}
      <section className="w-full bg-hero-gradient text-white py-10 md:py-14 border-b border-ink-800">
        <div className="max-w-content mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <span className="text-caption font-semibold tracking-wider uppercase text-accent-400 block">
                {detectorContent.header.badgeLabel}
              </span>
              <h1 className="text-h1-mobile md:text-h1 font-semibold text-white tracking-tight">
                {detectorContent.header.title}
              </h1>
              <p className="text-body text-slate-200 leading-relaxed max-w-2xl">
                {detectorContent.header.description}
              </p>
            </div>

            {/* GIS Map Navigation */}
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/map">
                <Button variant="secondary" size="sm" rightIcon={<ExternalLink className="w-4 h-4" />}>
                  View GIS map
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <div className="max-w-content mx-auto w-full px-4 md:px-6 py-8 md:py-12 space-y-8">
        {/* Visible Error Banner if camera fails */}
        {errorMessage && (
          <Alert
            variant="error"
            title="Camera initialization notice"
            actionText="Retry camera initialization"
            onAction={() => startCamera()}
            onClose={() => setErrorMessage(null)}
          >
            {errorMessage}
          </Alert>
        )}

        {/* Visible Alert Banner if Cloud API encounters connection issues */}
        {apiErrorMessage && (
          <Alert
            variant="warning"
            title="Cloud detection service connection"
            actionText="Dismiss"
            onAction={() => setApiErrorMessage(null)}
            onClose={() => setApiErrorMessage(null)}
          >
            {apiErrorMessage}
          </Alert>
        )}

        {/* Telemetry Metric KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="flex items-center justify-between">
              <span className="text-small text-text-muted font-medium block">
                {detectorContent.telemetry.activeCountTitle}
              </span>
              <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
                <Activity className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <span className="text-h3 font-semibold text-ink-900 mt-2 block">
              {activeTab === "camera"
                ? activePotholesCount
                : uploadResult
                ? uploadResult.total_detections
                : 0}
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
              ) : uploadResult?.highest_severity ? (
                <Badge
                  variant={
                    uploadResult.highest_severity === "high"
                      ? "severity-high"
                      : uploadResult.highest_severity === "medium"
                      ? "severity-medium"
                      : "severity-low"
                  }
                >
                  {uploadResult.highest_severity.toUpperCase()}
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
              {latencyMs > 0
                ? `${latencyMs}ms`
                : uploadResult
                ? `${uploadResult.inference_time_ms}ms`
                : "\u2014"}
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
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  gpsActive ? "bg-sev-low animate-pulse" : "bg-text-muted"
                }`}
                title={gpsActive ? "High-precision GPS Active" : "Searching GPS"}
              />
              <span className="font-mono text-small">
                {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </span>
            </div>
          </Card>
        </div>

        {/* Tab Selection Header (Live Camera vs Wi-Fi DroidCam vs Upload Inspection) */}
        <div className="border-b border-border-default flex gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              if (activeTab !== "camera") {
                stopIpStream();
                setActiveTab("camera");
              }
            }}
            className={`pb-3 text-body font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "camera"
                ? "border-primary-600 text-primary-600 font-semibold"
                : "border-transparent text-text-muted hover:text-ink-900"
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Camera (Webcam / DroidCam Client)</span>
            {droidCamDevice && (
              <span className="w-2 h-2 rounded-full bg-sev-low animate-pulse" title="DroidCam available" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeTab !== "ipcam") {
                stopCamera();
                setActiveTab("ipcam");
              }
            }}
            className={`pb-3 text-body font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "ipcam"
                ? "border-primary-600 text-primary-600 font-semibold"
                : "border-transparent text-text-muted hover:text-ink-900"
            }`}
          >
            <Wifi className="w-5 h-5" />
            <span>Wi-Fi DroidCam / IP Stream</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (activeTab !== "upload") {
                stopCamera();
                stopIpStream();
                setActiveTab("upload");
              }
            }}
            className={`pb-3 text-body font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "upload"
                ? "border-primary-600 text-primary-600 font-semibold"
                : "border-transparent text-text-muted hover:text-ink-900"
            }`}
          >
            <UploadCloud className="w-5 h-5" />
            <span>{detectorContent.upload.tabTitle}</span>
          </button>
        </div>

        {/* Mode 1: LIVE VEHICLE CAMERA STUDIO */}
        {activeTab === "camera" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Live Video HUD Viewport (Expands in Landscape Cockpit Mode) */}
            <div className={`space-y-4 ${isWideFormat ? "lg:col-span-3" : "lg:col-span-2"}`}>
              <div
                className={`rounded border border-border-default shadow-card overflow-hidden bg-ink-900 relative transition-all duration-300 ${
                  isWideFormat ? "w-full max-h-[85vh] aspect-video" : "w-full aspect-video"
                }`}
              >
                <div className="relative w-full h-full flex items-center justify-center bg-ink-900 overflow-hidden">
                  {/* Camera Video Stream */}
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-contain ${isStreaming ? "block" : "hidden"}`}
                  />

                  {/* Canvas Overlay for YOLO Bounding Boxes */}
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${
                      isStreaming ? "block" : "hidden"
                    }`}
                  />

                  {/* Standby View (When Camera is Inactive) */}
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
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <Button
                          variant="primary"
                          size="lg"
                          leftIcon={<Play className="w-5 h-5" />}
                          onClick={() => startCamera()}
                        >
                          {detectorContent.camera.startCameraText}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Telemetry HUD Overlay (When Camera is Active) */}
                  {isStreaming && (
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-2">
                        <Badge variant="severity-low" dot>
                          {detectorContent.camera.statusLive}
                        </Badge>
                        {isProcessingFrame && (
                          <div className="flex items-center gap-1.5 bg-ink-900/90 text-white px-2 py-0.5 rounded text-caption border border-ink-800">
                            <Spinner size="sm" className="text-primary-600" />
                            <span>{detectorContent.camera.statusScanning}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isWideFormat && (
                          <span className="hidden sm:inline-block bg-ink-900/90 text-accent-400 px-2.5 py-1 rounded text-caption border border-ink-800 font-semibold tracking-wider uppercase">
                            COCKPIT HUD
                          </span>
                        )}
                        <div className="bg-ink-900/90 text-white px-2.5 py-1 rounded text-caption border border-ink-800 font-mono text-xs">
                          {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                        </div>
                        {/* High-visibility Stop button directly inside the video feed overlay */}
                        <button
                          type="button"
                          onClick={stopCamera}
                          aria-label="Stop live camera stream"
                          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-danger text-white text-caption font-semibold shadow hover:brightness-90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-danger min-h-[36px]"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop stream</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DroidCam Green Screen Detection Overlay Card */}
                  {isStreaming && isDroidCamGreenScreen && (
                    <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center">
                      <div className="max-w-lg bg-bg-surface text-ink-900 border-2 border-sev-medium rounded-lg p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-center gap-2 text-sev-medium">
                          <AlertTriangle className="w-6 h-6 text-sev-medium shrink-0" />
                          <h4 className="text-h4 font-bold text-ink-900">
                            DroidCam Green Screen Detected
                          </h4>
                        </div>
                        <p className="text-small text-ink-700 leading-relaxed">
                          Your phone is connected via DroidCam, but the video feed is showing a standby green screen. Follow these 3 quick steps:
                        </p>

                        <div className="text-left bg-primary-50/70 border border-primary-200 rounded p-3 space-y-2 text-small text-ink-900">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-primary-700 shrink-0">1.</span>
                            <span><strong>Phone Screen:</strong> Unlock your phone and ensure the <strong>DroidCam app is open on screen</strong> (do not lock or minimize).</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-primary-700 shrink-0">2.</span>
                            <span><strong>DroidCam PC Client:</strong> In the DroidCam Client window on your laptop, click <strong>Stop</strong> then <strong>Start</strong> to refresh the link.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-primary-700 shrink-0">3.</span>
                            <span><strong>Chrome Hardware Acceleration:</strong> If video is visible in the PC Client but green in Chrome, open <code className="bg-slate-200 px-1 py-0.5 rounded text-caption font-mono">chrome://settings/system</code>, toggle <strong>OFF</strong> <em>&quot;Use graphics acceleration when available&quot;</em>, and relaunch Chrome.</span>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              stopCamera();
                              setActiveTab("ipcam");
                              setIsIpStreaming(true);
                            }}
                            leftIcon={<Wifi className="w-4 h-4" />}
                          >
                            Switch to Direct Wi-Fi IP Stream
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setIsDroidCamGreenScreen(false);
                              startCamera();
                            }}
                            leftIcon={<RefreshCw className="w-4 h-4" />}
                          >
                            Retry Camera
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Viewport Control Toolbar */}
                <div className="p-4 bg-bg-surface border-t border-border-default flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Start Camera Feed Button */}
                    <Button
                      variant="primary"
                      size="md"
                      disabled={isStreaming}
                      leftIcon={<Play className="w-4 h-4" />}
                      onClick={() => startCamera()}
                    >
                      {detectorContent.camera.startCameraText}
                    </Button>

                    {/* Stop Camera Feed Button */}
                    <Button
                      variant="danger"
                      size="md"
                      disabled={!isStreaming}
                      leftIcon={<Square className="w-4 h-4" />}
                      onClick={stopCamera}
                    >
                      {detectorContent.camera.stopCameraText}
                    </Button>

                    {/* Camera Flip / Switch Button */}
                    <Button
                      variant="secondary"
                      size="md"
                      leftIcon={<SwitchCamera className="w-4 h-4" />}
                      onClick={toggleFacingMode}
                      title="Switch between rear road camera and front camera"
                    >
                      {detectorContent.camera.switchCameraText} (
                      {facingMode === "environment" ? "Rear" : "Front"})
                    </Button>

                    {/* Landscape Cockpit Toggle Button */}
                    <Button
                      variant="secondary"
                      size="md"
                      leftIcon={isCockpitMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      onClick={toggleCockpitLandscape}
                      title="Toggle wide vehicular landscape cockpit layout"
                    >
                      {isCockpitMode ? detectorContent.camera.portraitModeText : detectorContent.camera.landscapeModeText}
                    </Button>
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

            {/* Right Column: Camera & Sensor Parameters (Only in non-wide format or below viewport) */}
            <div className={`space-y-6 ${isWideFormat ? "lg:col-span-3" : ""}`}>
              <Card title="Sensor & vehicle calibration" subtitle="Live stream parameters and GPS positioning">
                <div className="space-y-5">
                  {/* Video Input Device Picker with DroidCam Integration */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-small font-medium text-ink-800">
                        {detectorContent.camera.deviceSelectLabel}
                      </label>
                      <button
                        type="button"
                        onClick={enumerateCameras}
                        className="text-caption font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 underline focus-visible:outline-none"
                        title="Scan system for newly connected cameras or DroidCam"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Scan for DroidCam
                      </button>
                    </div>

                    {/* DroidCam Status Indicator & Quick Connect */}
                    {droidCamDevice && (
                      <div
                        className={`p-3 rounded border flex items-center justify-between text-small ${
                          isDroidCamActive
                            ? "bg-sev-low-soft border-sev-low text-ink-900"
                            : "bg-primary-50 border-primary-200 text-ink-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Smartphone
                            className={`w-4 h-4 ${
                              isDroidCamActive ? "text-sev-low" : "text-primary-600"
                            }`}
                          />
                          <div>
                            <span className="font-semibold block text-small">
                              {droidCamDevice.label || "DroidCam Video"}
                            </span>
                            <span className="text-caption text-text-muted">
                              {isDroidCamActive
                                ? "Active: Streaming from phone camera"
                                : "Detected on PC: Click to activate"}
                            </span>
                          </div>
                        </div>
                        {!isDroidCamActive && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedDeviceId(droidCamDevice.deviceId);
                              if (isStreaming) {
                                startCamera(undefined, droidCamDevice.deviceId);
                              }
                            }}
                          >
                            Use DroidCam
                          </Button>
                        )}
                      </div>
                    )}

                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedDeviceId(newId);
                        if (isStreaming) {
                          startCamera(undefined, newId);
                        }
                      }}
                      className="w-full min-h-[44px] rounded border border-border-default bg-bg-surface px-3 text-body text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                    >
                      {devices.length === 0 && (
                        <option value="">{detectorContent.camera.deviceDefaultOption}</option>
                      )}
                      {devices.map((device, idx) => {
                        const isDroid = device.label?.toLowerCase().includes("droidcam");
                        return (
                          <option key={device.deviceId || idx} value={device.deviceId}>
                            {isDroid ? `📱 ${device.label} (DroidCam Phone)` : device.label || `Camera ${idx + 1}`}
                          </option>
                        );
                      })}
                    </select>

                    {/* DroidCam Quick Setup & Green Screen Troubleshooting */}
                    <details className="text-caption text-text-muted bg-bg-page border border-border-default rounded p-3 select-none">
                      <summary className="font-medium text-ink-800 hover:text-primary-600 cursor-pointer flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-primary-600" />
                          <span>Using DroidCam? Quick setup &amp; Green Screen fix</span>
                        </div>
                        <span className="text-xs text-primary-600 font-normal">View steps</span>
                      </summary>
                      <div className="mt-2.5 space-y-2 pl-3 border-l-2 border-primary-600 text-ink-800">
                        <p>1. Open <strong>DroidCam</strong> on your Android / iOS phone.</p>
                        <p>2. Open <strong>DroidCam Client</strong> on this PC.</p>
                        <p>3. Enter your phone&apos;s Wi-Fi IP (<code className="bg-slate-100 px-1 rounded font-mono">192.168.29.8</code>) and click <strong>Start</strong> in DroidCam Client.</p>
                        <p>4. In the camera dropdown above, select <strong>DroidCam Video</strong>.</p>
                        <div className="pt-1.5 border-t border-border-default/60 space-y-1">
                          <span className="font-semibold text-sev-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-sev-medium" />
                            Fixing Solid Green Screen:
                          </span>
                          <p className="text-caption text-ink-700">
                            &bull; <strong>Keep phone awake:</strong> If your phone screen sleeps or minimizes DroidCam, the driver outputs pure green. Keep the app open on screen.
                          </p>
                          <p className="text-caption text-ink-700">
                            &bull; <strong>Restart PC Client stream:</strong> Click <em>Stop</em> then <em>Start</em> in the DroidCam Client window.
                          </p>
                          <p className="text-caption text-ink-700">
                            &bull; <strong>Chrome GPU Acceleration:</strong> In Chrome, open <code className="bg-slate-100 px-1 rounded font-mono">chrome://settings/system</code> &rarr; toggle <em>&quot;Use graphics acceleration when available&quot;</em> to <strong>OFF</strong> &rarr; click <strong>Relaunch</strong>.
                          </p>
                        </div>
                      </div>
                    </details>
                  </div>

                  {/* Confidence Slider */}
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

                  {/* Scan Rate Sensitivity */}
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
                          {ms === 250 ? "Fast (250ms)" : ms === 400 ? "Balanced" : "Eco (800ms)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle GPS Coordinates Override */}
                  <div className="space-y-3 pt-2 border-t border-border-default">
                    <div className="flex items-center justify-between">
                      <span className="text-small font-medium text-ink-800">
                        {detectorContent.camera.gpsLabel} (Exact Fix)
                      </span>
                      <button
                        type="button"
                        onClick={requestHighAccuracyGps}
                        className="text-caption font-medium text-primary-600 hover:text-primary-700 underline focus-visible:outline-none"
                      >
                        Refresh GPS
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Latitude"
                        type="number"
                        step="0.000001"
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
                        step="0.000001"
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
                        {gpsActive ? `${detectorContent.camera.gpsActive} (High Accuracy)` : detectorContent.camera.gpsSearching}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Mode 2: WI-FI DROIDCAM / IP STREAM STUDIO */}
        {activeTab === "ipcam" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className={`space-y-4 ${isWideFormat ? "lg:col-span-3" : "lg:col-span-2"}`}>
              <div
                className={`rounded border border-border-default shadow-card overflow-hidden bg-ink-900 relative transition-all duration-300 ${
                  isWideFormat ? "w-full max-h-[85vh] aspect-video" : "w-full aspect-video"
                }`}
              >
                <div className="relative w-full h-full flex items-center justify-center bg-ink-900 overflow-hidden">
                  {isIpStreaming && ipFrameBase64 ? (
                    <img
                      src={ipFrameBase64}
                      alt="Live DroidCam Stream Feed"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center p-8 space-y-4 text-white">
                      <div className="w-16 h-16 rounded-full bg-ink-800 border border-ink-800 flex items-center justify-center mx-auto text-accent-400">
                        <Wifi className="w-8 h-8" aria-hidden="true" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h3 className="text-h4 font-medium text-white">
                          Wi-Fi DroidCam / IP Stream Standby
                        </h3>
                        <p className="text-small text-ink-400 mt-1">
                          Connect directly to your phone&apos;s DroidCam stream over local Wi-Fi without needing USB cables or client drivers.
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="lg"
                        leftIcon={<Play className="w-5 h-5 fill-current" />}
                        onClick={() => setIsIpStreaming(true)}
                        disabled={!ipStreamUrl.trim()}
                      >
                        Start DroidCam Wi-Fi Stream
                      </Button>
                    </div>
                  )}

                  {isIpStreaming && (
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-ink-950/80 backdrop-blur-sm px-3 py-1.5 rounded text-white text-small">
                      <span className="w-2.5 h-2.5 rounded-full bg-sev-low animate-pulse" />
                      <span className="font-semibold">DROIDCAM LIVE</span>
                      <span className="text-caption text-ink-300 font-mono truncate max-w-[200px]">
                        {ipStreamUrl}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* IP Stream Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {!isIpStreaming ? (
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<Play className="w-4 h-4 fill-current" />}
                      onClick={() => setIsIpStreaming(true)}
                      disabled={!ipStreamUrl.trim()}
                    >
                      Connect &amp; Scan Road
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="md"
                      leftIcon={<Square className="w-4 h-4 fill-current" />}
                      onClick={stopIpStream}
                    >
                      Stop DroidCam Stream
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

            {/* Right Column: IP Stream Parameters */}
            <div className={`space-y-6 ${isWideFormat ? "lg:col-span-3" : ""}`}>
              <Card title="Wi-Fi stream configuration" subtitle="Direct phone connection parameters">
                <div className="space-y-4">
                  <div>
                    <label className="block text-small font-medium text-ink-800 mb-1.5">
                      Phone DroidCam Stream URL
                    </label>
                    <Input
                      type="text"
                      value={ipStreamUrl}
                      onChange={(e) => setIpStreamUrl(e.target.value)}
                      placeholder="http://192.168.29.X:4747"
                    />
                    <p className="text-caption text-text-muted mt-1.5">
                      Open DroidCam on your phone and copy the <strong>Wi-Fi IP</strong> and <strong>Port</strong> shown on screen.
                    </p>
                  </div>

                  <div className="p-3 rounded bg-primary-50 border border-primary-200 text-small text-ink-900 space-y-1">
                    <span className="font-semibold block flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-primary-600" />
                      DroidCam Direct Wi-Fi Guide
                    </span>
                    <p className="text-caption text-text-muted">
                      1. Connect your phone and PC to the same Wi-Fi network.
                    </p>
                    <p className="text-caption text-text-muted">
                      2. Open DroidCam on phone; check the <strong>WiFi IP</strong> (e.g. 192.168.29.X).
                    </p>
                    <p className="text-caption text-text-muted">
                      3. Click <strong>Connect &amp; Scan Road</strong> to stream directly through our backend AI!
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Mode 3: ROAD MEDIA FILE UPLOAD INSPECTION */}
        {activeTab === "upload" && (
          <div className="space-y-8">
            <Card title="Road media inspection" subtitle="Upload pavement photos or dashcam videos to run YOLO hazard detection">
              <div className="space-y-6">
                {/* Upload Dropzone using EmptyState component */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                <EmptyState
                  title={detectorContent.upload.dropzoneTitle}
                  description={detectorContent.upload.dropzoneDescription}
                  icon={<UploadCloud className="w-6 h-6 text-primary-600" aria-hidden="true" />}
                  onFileDrop={(file) => handleFileUpload(file)}
                  action={
                    <Button
                      variant="primary"
                      size="md"
                      disabled={isAnalyzingFile}
                      leftIcon={<UploadCloud className="w-4 h-4" />}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isAnalyzingFile
                        ? detectorContent.upload.analyzingText
                        : detectorContent.upload.uploadButtonText}
                    </Button>
                  }
                />

                {uploadError && (
                  <Alert variant="error" title="Media analysis failed">
                    {uploadError}
                  </Alert>
                )}

                {/* Upload Inspection Results */}
                {uploadResult && (
                  <div className="mt-8 pt-6 border-t border-border-default space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-h4 font-medium text-ink-900">
                          {detectorContent.upload.resultsTitle}: {uploadResult.filename}
                        </h3>
                        <p className="text-small text-text-muted mt-0.5">
                          Detected {uploadResult.total_detections} road hazard(s) in {uploadResult.inference_time_ms}ms
                        </p>
                      </div>

                      {uploadResult.total_detections > 0 && (
                        <Button
                          variant="primary"
                          size="md"
                          leftIcon={<Check className="w-4 h-4" />}
                          onClick={logUploadToDatabase}
                        >
                          {detectorContent.upload.logPotholesButtonText}
                        </Button>
                      )}
                    </div>

                    {/* Annotated Image Preview */}
                    {uploadResult.annotated_image_url && (
                      <div className="rounded border border-border-default overflow-hidden bg-ink-900 max-w-2xl mx-auto shadow-card">
                        <img
                          src={uploadResult.annotated_image_url}
                          alt="Annotated detection preview"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    )}

                    {/* Detected Items Table */}
                    {uploadResult.detections.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-small">
                          <thead>
                            <tr className="border-b border-border-default text-text-muted">
                              <th className="py-2.5 px-3 font-medium">Index</th>
                              <th className="py-2.5 px-3 font-medium">Class</th>
                              <th className="py-2.5 px-3 font-medium">Confidence</th>
                              <th className="py-2.5 px-3 font-medium">Severity</th>
                              <th className="py-2.5 px-3 font-medium">Bounding Box (X1, Y1, X2, Y2)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-default">
                            {uploadResult.detections.map((det, idx) => (
                              <tr key={idx} className="hover:bg-primary-50 transition-colors">
                                <td className="py-2.5 px-3 font-medium text-ink-900">#{idx + 1}</td>
                                <td className="py-2.5 px-3 font-medium text-ink-900">{det.class_name}</td>
                                <td className="py-2.5 px-3 font-mono">{Math.round(det.confidence * 100)}%</td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    size="sm"
                                    variant={
                                      det.severity === "high"
                                        ? "severity-high"
                                        : det.severity === "medium"
                                        ? "severity-medium"
                                        : "severity-low"
                                    }
                                  >
                                    {det.severity.toUpperCase()}
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-text-muted">
                                  [{det.box.join(", ")}]
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Real-time Detection Event Log Table */}
        <Card
          title={detectorContent.history.title}
          subtitle={detectorContent.history.subtitle}
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
                    <th className="py-2.5 px-3 font-medium">{detectorContent.history.potholesHeader}</th>
                    <th className="py-2.5 px-3 font-medium">{detectorContent.history.severityHeader}</th>
                    <th className="py-2.5 px-3 font-medium">{detectorContent.history.confidenceHeader}</th>
                    <th className="py-2.5 px-3 font-medium">{detectorContent.history.gpsHeader}</th>
                    <th className="py-2.5 px-3 font-medium">{detectorContent.history.statusHeader}</th>
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
                            {detectorContent.history.loggedBadge}
                          </span>
                        ) : (
                          <span className="text-text-muted">
                            {detectorContent.history.streamOnlyBadge}
                          </span>
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
