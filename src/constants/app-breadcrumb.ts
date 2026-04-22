// Configuration for custom labels
export const BREADCRUMB_LABELS: Record<string, string> = {
  // Add custom labels here as needed
  // Example: "crm": "CRM", "api": "API", "ui": "User Interface"
};

// Segments to skip/hide from breadcrumb display
// These segments won't appear in the breadcrumb but are still part of the URL
export const BREADCRUMB_SKIP_SEGMENTS: string[] = [
  "settings", // Example: /dashboard/settings/profile shows as: Home → Profile
  // Add more segments to skip here as needed
];

// Base segment that the home icon represents (e.g., "dashboard")
// If the first segment matches this, it will be skipped
export const BREADCRUMB_BASE_SEGMENT = "dashboard";
