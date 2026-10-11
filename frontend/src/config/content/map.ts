export interface MapContent {
  header: {
    title: string;
    description: string;
  };
  filters: {
    title: string;
    allSeverities: string;
    lowSeverity: string;
    mediumSeverity: string;
    highSeverity: string;
  };
  stats: {
    totalPotholes: string;
    highSeverityCount: string;
    mediumSeverityCount: string;
    lowSeverityCount: string;
  };
  table: {
    title: string;
    idHeader: string;
    timeHeader: string;
    severityHeader: string;
    confidenceHeader: string;
    locationHeader: string;
    typeHeader: string;
    emptyText: string;
    viewOnMapButton: string;
    deleteRecordButton: string;
    clearRecordsButton: string;
  };
  popup: {
    confidenceLabel: string;
    severityLabel: string;
    coordinatesLabel: string;
    loggedAtLabel: string;
    deleteButton: string;
  };
}

export const mapContent: MapContent = {
  header: {
    title: "Pothole location map",
    description: "Geographic distribution of recorded potholes and severity levels across surveyed roads.",
  },
  filters: {
    title: "Filter by severity",
    allSeverities: "All severities",
    lowSeverity: "Low severity",
    mediumSeverity: "Medium severity",
    highSeverity: "High severity",
  },
  stats: {
    totalPotholes: "Total recorded potholes",
    highSeverityCount: "High severity",
    mediumSeverityCount: "Medium severity",
    lowSeverityCount: "Low severity",
  },
  table: {
    title: "Recorded potholes inventory",
    idHeader: "ID",
    timeHeader: "Logged at",
    severityHeader: "Severity",
    confidenceHeader: "Confidence",
    locationHeader: "Coordinates",
    typeHeader: "Data origin",
    emptyText: "No potholes recorded matching the current filter criteria.",
    viewOnMapButton: "Pan to location",
    deleteRecordButton: "Remove record",
    clearRecordsButton: "Remove severity records",
  },
  popup: {
    confidenceLabel: "Confidence",
    severityLabel: "Severity",
    coordinatesLabel: "GPS coordinates",
    loggedAtLabel: "Recorded",
    deleteButton: "Remove record",
  },
};
