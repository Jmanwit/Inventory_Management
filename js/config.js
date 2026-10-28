// Public application configuration. Never put privileged secrets in this file.
export const APP_NAME = "Shack Out Back";
export const APP_VERSION = "0.1.0";
export const APP_BASE_URL = ""; // Set to the deployed GitHub Pages URL after publishing.
export const DEFAULT_ROOMS = [
  { name: "Kitchen", prefix: "KIT" },
  { name: "Living Room", prefix: "LIV" },
  { name: "Dining Room", prefix: "DIN" },
  { name: "Bedroom", prefix: "BED" },
  { name: "Playroom", prefix: "PLY" },
  { name: "Bathroom", prefix: "BTH" },
  { name: "Laundry Room", prefix: "LAU" },
  { name: "Office", prefix: "OFF" },
  { name: "Garage", prefix: "GAR" },
  { name: "Storage", prefix: "STO" }
];
export const DEFAULT_LOCATIONS = [
  "Garage", "Moving Truck", "Upstairs Hallway", "Kitchen",
  "Living Room", "Storage Unit", "Attic", "Unknown"
];
export const MAX_LABEL_COPIES = 20;

// Supabase public browser configuration. Paste only your project URL and publishable key here.
export const SUPABASE_URL = "https://ygzmzhaomvbgepayhxki.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
