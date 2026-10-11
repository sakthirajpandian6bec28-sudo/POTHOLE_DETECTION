export interface DetectorContent {
  header: {
    title: string;
    description: string;
  };
  camera: {
    title: string;
    subtitle: string;
    startCameraText: string;
    stopCameraText: string;
    deviceSelectLabel: string;
    deviceDefaultOption: string;
    hardwareTabBrowser: string;
    hardwareTabStream: string;
    streamUrlLabel: string;
    streamUrlPlaceholder: string;
    streamConnectButton: string;
    streamDisconnectButton: string;
    statusLive: string;
    statusStandby: string;
    statusConnecting: string;
    autoLogLabel: string;
    autoLogDescription: string;
    confidenceLabel: string;
    intervalLabel: string;
    gpsLabel: string;
    gpsSearching: string;
    noCameraDetected: string;
    permissionError: string;
  };
  telemetry: {
    fpsTitle: string;
    latencyTitle: string;
    activeCountTitle: string;
    severityTitle: string;
  };
  history: {
    title: string;
    emptyText: string;
    timeHeader: string;
    severityHeader: string;
    confidenceHeader: string;
    gpsHeader: string;
    actionHeader: string;
    clearButtonText: string;
  };
  results: {
    title: string;
    noDetections: string;
    disclaimer: string;
  };
}

export const detectorContent: DetectorContent = {
  header: {
    title: "Live road pothole detector",
    description: "Connect vehicle camera or hardware stream for real-time pothole identification, severity scoring, and GPS logging.",
  },
  camera: {
    title: "Live camera detection",
    subtitle: "Stream video from vehicle dashcam, USB camera, or hardware IP video feed",
    startCameraText: "Start camera feed",
    stopCameraText: "Stop camera feed",
    deviceSelectLabel: "Video input device",
    deviceDefaultOption: "Primary camera (Default)",
    hardwareTabBrowser: "Hardware / USB camera",
    hardwareTabStream: "IP camera stream (RTSP/HTTP)",
    streamUrlLabel: "Hardware stream address",
    streamUrlPlaceholder: "http://192.168.1.50:8080/video or rtsp://...",
    streamConnectButton: "Connect stream",
    streamDisconnectButton: "Disconnect stream",
    statusLive: "Live detection active",
    statusStandby: "Camera feed inactive",
    statusConnecting: "Connecting to camera hardware...",
    autoLogLabel: "Auto-log to map database",
    autoLogDescription: "Automatically save detected potholes to the GIS map with vehicle coordinates",
    confidenceLabel: "Confidence threshold",
    intervalLabel: "Detection scan rate",
    gpsLabel: "Vehicle GPS location",
    gpsSearching: "Acquiring GPS coordinates...",
    noCameraDetected: "No video input devices found on this system.",
    permissionError: "Camera permission denied. Please allow camera access in your browser.",
  },
  telemetry: {
    fpsTitle: "Processing rate",
    latencyTitle: "Model latency",
    activeCountTitle: "Potholes in view",
    severityTitle: "Maximum severity",
  },
  history: {
    title: "Live detection log",
    emptyText: "No potholes logged in this session yet. Turn on auto-log or activate the camera feed to start logging.",
    timeHeader: "Time",
    severityHeader: "Severity",
    confidenceHeader: "Confidence",
    gpsHeader: "GPS coordinates",
    actionHeader: "Actions",
    clearButtonText: "Clear log",
  },
  results: {
    title: "Detection overview",
    noDetections: "No road damage detected in the active frame.",
    disclaimer:
      "This model can miss some potholes (recall approximately 70%) and serves as decision support, not a replacement for formal road inspection.",
  },
};
