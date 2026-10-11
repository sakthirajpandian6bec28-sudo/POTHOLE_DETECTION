export interface NavLink {
  label: string;
  href: string;
}

export interface MapDefaultConfig {
  lat: number;
  lng: number;
  zoom: number;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  logoText: string;
  contactEmail?: string;
  navLinks: NavLink[];
  footerText: string;
  mapDefault: MapDefaultConfig;
}

export const siteConfig: SiteConfig = {
  name: "Smart Assistive Mechanism For Vehicular Network",
  tagline: "Pothole detection and road quality monitoring",
  logoText: "Smart Assistive Mechanism For Vehicular Network",
  contactEmail: "",
  navLinks: [
    { label: "Detector", href: "/" },
    { label: "Map", href: "/map" },
  ],
  footerText:
    "Smart Assistive Mechanism For Vehicular Network provides decision support for road maintenance and hazard inspection.",
  mapDefault: {
    lat: 12.9716, // {{DEFAULT_LAT}}
    lng: 77.5946, // {{DEFAULT_LNG}}
    zoom: 13,
  },
};
