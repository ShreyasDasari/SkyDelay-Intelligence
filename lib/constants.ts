// Airport coordinates for the 3D globe and map visualizations
export const AIRPORT_COORDS: Record<
  string,
  { lat: number; lon: number; name: string }
> = {
  ORD: { lat: 41.98, lon: -87.9, name: "Chicago O'Hare" },
  ATL: { lat: 33.64, lon: -84.43, name: "Atlanta" },
  DFW: { lat: 32.9, lon: -97.04, name: "Dallas/Fort Worth" },
  DEN: { lat: 39.86, lon: -104.67, name: "Denver" },
  LAX: { lat: 33.94, lon: -118.41, name: "Los Angeles" },
  JFK: { lat: 40.64, lon: -73.78, name: "New York JFK" },
  SFO: { lat: 37.62, lon: -122.38, name: "San Francisco" },
  SEA: { lat: 47.45, lon: -122.31, name: "Seattle" },
  MIA: { lat: 25.79, lon: -80.29, name: "Miami" },
  BOS: { lat: 42.36, lon: -71.01, name: "Boston" },
  EWR: { lat: 40.69, lon: -74.17, name: "Newark" },
  CLT: { lat: 35.21, lon: -80.94, name: "Charlotte" },
  PHX: { lat: 33.44, lon: -112.01, name: "Phoenix" },
  IAH: { lat: 29.98, lon: -95.34, name: "Houston" },
  MSP: { lat: 44.88, lon: -93.22, name: "Minneapolis" },
  DTW: { lat: 42.21, lon: -83.35, name: "Detroit" },
  LGA: { lat: 40.77, lon: -73.87, name: "LaGuardia" },
  PHL: { lat: 39.87, lon: -75.24, name: "Philadelphia" },
  DCA: { lat: 38.85, lon: -77.04, name: "Washington DCA" },
  SLC: { lat: 40.79, lon: -111.98, name: "Salt Lake City" },
  LAS: { lat: 36.08, lon: -115.15, name: "Las Vegas" },
  MCO: { lat: 28.43, lon: -81.31, name: "Orlando" },
  BNA: { lat: 36.12, lon: -86.68, name: "Nashville" },
  SAN: { lat: 32.73, lon: -117.19, name: "San Diego" },
  TPA: { lat: 27.98, lon: -82.53, name: "Tampa" },
  PDX: { lat: 45.59, lon: -122.6, name: "Portland" },
};

// FAA/NEXTOR cost methodology parameters (inflation-adjusted 2025)
export const COST_PARAMS = {
  passengerCostPerMinute: 0.74,
  airlineOpsCostPerMinute: 68.48,
  avgLoadFactor: 0.87,
  avgSeatsPerFlight: 160,
  avgPassengersPerFlight: 160 * 0.87, // 139.2
};

// Chart color palette
export const CHART_COLORS = {
  primary: "#4F46E5", // indigo-600
  secondary: "#0EA5E9", // sky-500
  accent: "#F59E0B", // amber-500
  sequence: [
    "#4F46E5",
    "#0EA5E9",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
    "#059669",
  ],
  risk: {
    high: "#DC2626",
    moderate: "#D97706",
    low: "#059669",
  },
  riskBg: {
    high: "#FEF2F2",
    moderate: "#FFFBEB",
    low: "#ECFDF5",
  },
  delayCause: {
    Weather: "#4F46E5",
    Carrier: "#DC2626",
    "NAS/ATC": "#059669",
    "Late Aircraft": "#D97706",
  } as Record<string, string>,
};

// Hub connections for 3D globe arcs
export const HUB_CONNECTIONS: [string, string][] = [
  ["ORD", "ATL"],
  ["ORD", "DFW"],
  ["ORD", "JFK"],
  ["ORD", "LAX"],
  ["ORD", "DEN"],
  ["ATL", "JFK"],
  ["ATL", "MIA"],
  ["ATL", "DFW"],
  ["ATL", "LAX"],
  ["DFW", "LAX"],
  ["DFW", "DEN"],
  ["DFW", "JFK"],
  ["JFK", "LAX"],
  ["JFK", "SFO"],
  ["JFK", "MIA"],
  ["DEN", "LAX"],
  ["DEN", "SEA"],
  ["DEN", "SFO"],
  ["LAX", "SFO"],
  ["LAX", "SEA"],
];

// Day ordering for heatmap
export const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Navigation items
export const NAV_ITEMS = [
  { label: "Overview", href: "/", icon: "BarChart3" },
  { label: "Cascade Analyzer", href: "/cascade", icon: "Zap" },
  { label: "Route Economics", href: "/routes", icon: "Route" },
  { label: "Delay Patterns", href: "/patterns", icon: "Calendar" },
] as const;
