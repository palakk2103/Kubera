import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo
} from "react";
import axiosInstance from "@core/api/axios";
import { getWithDedupe } from "@core/api/dedupe";
import { DEFAULT_SETTINGS, applyThemeVariables } from "./SettingsDefaults";

// Create context with null so we can check if it's provided
const SettingsContext = createContext(null);

const getInitialSettings = () => {
  try {
    const cached = typeof window !== "undefined" ? localStorage.getItem("app_settings_cache") : null;
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (_) {}
  return DEFAULT_SETTINGS;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getInitialSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Apply theme variables immediately on mount from initial settings
  useEffect(() => {
    applyThemeVariables(settings);
  }, []);

  const fetchSettings = useCallback(async (options = {}) => {
    try {
      setError(null);
      // Use deduplicated fetch for app settings
      const res = await getWithDedupe("/settings", { _t: Date.now() }, { 
        ttl: 5 * 1000,
        forceRefresh: true 
      });
      const data = res.data?.result || res.data;
      if (data && typeof data === "object") {
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        applyThemeVariables(merged);
        try {
          localStorage.setItem("app_settings_cache", JSON.stringify(merged));
        } catch (_) {}
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to load settings",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // UseMemo to avoid rerenders of children if values haven't changed
  const value = useMemo(() => ({
    settings,
    loading,
    error,
    refetch: fetchSettings,
  }), [settings, loading, error, fetchSettings]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

export default SettingsContext;
