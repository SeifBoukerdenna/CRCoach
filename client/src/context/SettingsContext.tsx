import React, { createContext, useContext, useEffect, useState } from "react";
import {
  SETTINGS_STORAGE_KEY,
  DEFAULT_SAVED_SETTINGS,
  SavedSettings,
} from "./settingsConstants";
import { StreamQuality } from "../types/broadcast";

interface SettingsContextState {
  quality: StreamQuality;
  setQuality: (q: StreamQuality) => void;
  debugMode: boolean;
  setDebugMode: (on: boolean) => void;
  theme: "default" | "dark" | "high-contrast";
  setTheme: (t: "default" | "dark" | "high-contrast") => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
  autoReconnect: boolean;
  setAutoReconnect: (on: boolean) => void;
}

const SettingsContext = createContext<SettingsContextState>({
  quality: DEFAULT_SAVED_SETTINGS.quality,
  setQuality: () => { },
  debugMode: DEFAULT_SAVED_SETTINGS.debugMode,
  setDebugMode: () => { },
  theme: DEFAULT_SAVED_SETTINGS.theme,
  setTheme: () => { },
  isSettingsOpen: false,
  openSettings: () => { },
  closeSettings: () => { },
  toggleSettings: () => { },
  autoReconnect: DEFAULT_SAVED_SETTINGS.autoReconnect,
  setAutoReconnect: () => { },
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // load or fall back
  const saved: SavedSettings = (() => {
    try {
      const json = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return json ? (JSON.parse(json) as SavedSettings) : DEFAULT_SAVED_SETTINGS;
    } catch {
      return DEFAULT_SAVED_SETTINGS;
    }
  })();

  const [quality, setQualityState] = useState<StreamQuality>(saved.quality);
  const [debugMode, setDebugModeState] = useState<boolean>(saved.debugMode);
  const [theme, setThemeState] = useState<SavedSettings["theme"]>(
    saved.theme
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoReconnect, setAutoReconnectState] = useState<boolean>(
    saved.autoReconnect
  );

  // persist on change
  useEffect(() => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ quality, debugMode, theme, autoReconnect })
    );
  }, [quality, debugMode, theme, autoReconnect]);

  // apply theme class
  useEffect(() => {
    document.body.classList.remove(
      "theme-default",
      "theme-dark",
      "theme-high-contrast"
    );
    if (theme !== "default") {
      document.body.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  // validators & setters
  const setQuality = (q: StreamQuality) => {
    if (["low", "medium", "high"].includes(q)) setQualityState(q);
  };
  const setDebugMode = setDebugModeState;
  const setTheme = setThemeState;
  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);
  const toggleSettings = () => setIsSettingsOpen((v) => !v);
  const setAutoReconnect = setAutoReconnectState;

  return (
    <SettingsContext.Provider
      value={{
        quality,
        setQuality,
        debugMode,
        setDebugMode,
        theme,
        setTheme,
        isSettingsOpen,
        openSettings,
        closeSettings,
        toggleSettings,
        autoReconnect,
        setAutoReconnect,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
export default SettingsContext;
