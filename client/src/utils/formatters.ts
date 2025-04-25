import { StreamQuality } from "../types/broadcast";

/**
 * Format elapsed time into HH:MM:SS
 * @param seconds Time in seconds
 * @returns Formatted time string
 */
export function formatElapsedTime(seconds: number): string {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/**
 * Format video resolution for display
 * @param resolution Resolution string in format "width×height" or default "—×—"
 * @returns Formatted resolution string
 */
export function formatResolution(resolution: string): string {
  // If it's the default placeholder, return as is
  if (resolution === "—×—") return resolution;

  // Otherwise, ensure proper formatting with "×" character
  return resolution.includes("×") ? resolution : resolution.replace(/x/i, "×");
}

/**
 * Get quality label with proper capitalization
 * @param quality Stream quality level
 * @returns Capitalized quality string
 */
export function formatQualityLabel(quality: StreamQuality): string {
  return quality.charAt(0).toUpperCase() + quality.slice(1);
}

/**
 * Format session code for display (adds spaces for readability)
 * @param code Raw session code
 * @returns Formatted session code
 */
export function formatSessionCode(code: string): string {
  // For display purposes, add spaces between digits
  return code.split("").join(" ");
}

/**
 * Clean session code input (remove non-digits)
 * @param input Raw input string
 * @returns Cleaned session code
 */
export function cleanSessionCode(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Validate session code (must be 4 digits)
 * @param code Session code to validate
 * @returns Whether the code is valid
 */
export function isValidSessionCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

/**
 * Get CSS class name for quality level
 * @param quality Stream quality level
 * @returns CSS class name
 */
export function getQualityColorClass(quality: StreamQuality): string {
  switch (quality) {
    case "low":
      return "quality-low";
    case "high":
      return "quality-high";
    default:
      return "quality-medium";
  }
}
