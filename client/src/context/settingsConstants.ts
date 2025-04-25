import { StreamQuality } from "../types/broadcast";
import { FEATURE_FLAGS, UI } from "../config/constants";

/**
 * The key under which we persist in localStorage
 */
export const SETTINGS_STORAGE_KEY = "royal_trainer_settings";

/**
 * The shape of what we persist
 */
export interface SavedSettings {
  quality: StreamQuality;
  debugMode: boolean;
  theme: "default" | "dark" | "high-contrast";
  autoReconnect: boolean;
}

/**
 * Defaults if nothing is in storage (or JSON.parse fails)
 */
export const DEFAULT_SAVED_SETTINGS: SavedSettings = {
  quality: UI.DEFAULT_QUALITY,
  debugMode: FEATURE_FLAGS.DEBUG_LOGGING,
  theme: "default",
  autoReconnect: true,
};
