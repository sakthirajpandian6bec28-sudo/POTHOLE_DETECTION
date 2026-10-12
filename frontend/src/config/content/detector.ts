export interface DetectorContent {
  header: {
    title: string;
    description: string;
    badgeLabel: string;
  };
  camera: {
    title: string;
    subtitle: string;
    startCameraText: string;
    stopCameraText: string;
    switchCameraText: string;
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
    statusScanning: string;
    autoLogLabel: string;
    autoLogDescription: string;
    confidenceLabel: string;
    intervalLabel: string;
    gpsLabel: string;
    gpsActive: string;
    gpsSearching: string;
    noCameraDetected: string;
    permissionError: string;
    httpsNotice: string;
    landscapeModeText: string;
    portraitModeText: string;
  };
  upload: {
    tabTitle: string;
    dropzoneTitle: string;
    dropzoneDescription: string;
    uploadButtonText: string;
    analyzingText: string;
    acceptedFormats: string;
    resultsTitle: string;
    logPotholesButtonText: string;
  };
  cloudApi: {
    title: string;
    subtitle: string;
    modalTitle: string;
    modalSubtitle: string;
    urlLabel: string;
    urlPlaceholder: string;
    statusOnline: string;
    statusOffline: string;
    statusChecking: string;
    testConnectionText: string;
    saveUrlText: string;
    resetDefaultText: string;
    cloudHelpText: string;
    mixedContentWarning: string;
  };
  telemetry: {
    fpsTitle: string;
    latencyTitle: string;
    activeCountTitle: string;
    severityTitle: string;
    serverStatusTitle: string;
  };
  history: {
    title: string;
    subtitle: string;
    emptyText: string;
    timeHeader: string;
    potholesHeader: string;
    severityHeader: string;
    confidenceHeader: string;
    gpsHeader: string;
    statusHeader: string;
    actionHeader: string;
    clearButtonText: string;
    loggedBadge: string;
    streamOnlyBadge: string;
  };
  results: {
    title: string;
    noDetections: string;
    disclaimer: string;
  };
}

export const detectorContent: DetectorContent = {
  header: {
    title: "Vehicular road pothole detector",
    description: "Real-time AI telemetry for mobile dashcams, vehicular cameras, and road surface hazard monitoring with live GIS mapping.",
    badgeLabel: "ROAD HAZARD AI • VEHICULAR TELEMETRY",
  },
  camera: {
    title: "Live camera detection",
    subtitle: "Real-time road scanning via device camera or vehicle dashcam feed",
    startCameraText: "Start camera feed",
    stopCameraText: "Stop camera feed",
    switchCameraText: "Flip camera",
    deviceSelectLabel: "Video input device",
    deviceDefaultOption: "Primary camera (Default)",
    hardwareTabBrowser: "Live camera feed",
    hardwareTabStream: "Inspect road media",
    streamUrlLabel: "Hardware stream address",
    streamUrlPlaceholder: "https://your-backend.onrender.com/api",
    streamConnectButton: "Connect stream",
    streamDisconnectButton: "Disconnect stream",
    statusLive: "LIVE ROAD SCAN",
    statusStandby: "CAMERA STANDBY",
    statusConnecting: "Initializing camera...",
    statusScanning: "Scanning road",
    autoLogLabel: "Auto-log to GIS map",
    autoLogDescription: "Automatically save detected potholes with vehicle GPS coordinates into database",
    confidenceLabel: "Confidence threshold",
    intervalLabel: "Detection scan rate",
    gpsLabel: "Vehicle GPS location",
    gpsActive: "Hardware GPS lock acquired",
    gpsSearching: "Acquiring GPS coordinates...",
    noCameraDetected: "No video input devices found on this system.",
    permissionError: "Camera permission denied. Please allow camera access in browser site settings.",
    httpsNotice: "Mobile cameras require a secure HTTPS connection. Please ensure this site is served over HTTPS.",
    landscapeModeText: "Landscape cockpit",
    portraitModeText: "Standard view",
  },
  upload: {
    tabTitle: "Inspect road photo / video",
    dropzoneTitle: "Upload road imagery for inspection",
    dropzoneDescription: "Drag and drop a road photo or recorded video, or click to browse files (JPEG, PNG, WEBP, MP4 up to 25 MB).",
    uploadButtonText: "Select road file",
    analyzingText: "Analyzing road imagery...",
    acceptedFormats: "Supported formats: JPEG, PNG, WEBP, MP4 (max 25 MB)",
    resultsTitle: "Inspection results",
    logPotholesButtonText: "Save detections to map",
  },
  cloudApi: {
    title: "Cloud detection API",
    subtitle: "Backend connectivity and model inference status",
    modalTitle: "Cloud API configuration",
    modalSubtitle: "Manage the backend API endpoint for cloud deployments and edge devices",
    urlLabel: "Backend API URL",
    urlPlaceholder: "https://your-backend.onrender.com",
    statusOnline: "Cloud API online",
    statusOffline: "API unreachable",
    statusChecking: "Testing connection...",
    testConnectionText: "Test health",
    saveUrlText: "Save endpoint",
    resetDefaultText: "Reset to default",
    cloudHelpText: "When hosting on cloud platforms (such as Render, Railway, or AWS), enter the hosted backend URL here so the browser can send camera frames for inference.",
    mixedContentWarning: "Mixed Content Warning: Browsers on HTTPS block calls to unencrypted HTTP backends. Your hosted backend must use HTTPS.",
  },
  telemetry: {
    fpsTitle: "Processing rate",
    latencyTitle: "Cloud inference latency",
    activeCountTitle: "Potholes in view",
    severityTitle: "Maximum severity",
    serverStatusTitle: "Backend API status",
  },
  history: {
    title: "Live detection log",
    subtitle: "Real-time log of road hazard events recorded during active monitoring session",
    emptyText: "No potholes logged in this session yet. Activate the camera feed to monitor road surfaces in real time.",
    timeHeader: "Time",
    potholesHeader: "Potholes",
    severityHeader: "Severity",
    confidenceHeader: "Confidence",
    gpsHeader: "GPS coordinates",
    statusHeader: "Map status",
    actionHeader: "Actions",
    clearButtonText: "Clear log",
    loggedBadge: "Logged to database",
    streamOnlyBadge: "Live monitor only",
  },
  results: {
    title: "Detection overview",
    noDetections: "No road damage detected in the active frame.",
    disclaimer:
      "This model can miss some potholes (recall approximately 70%) and serves as decision support, not a replacement for formal road inspection.",
  },
};
