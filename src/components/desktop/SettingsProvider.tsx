"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { desktopConfig } from "@/config/desktop";

type ThemeMode = "light" | "dark";

type SettingsState = {
  theme: ThemeMode;
  soundEnabled: boolean;
};

type SettingsContextValue = SettingsState & {
  toggleTheme: () => void;
  toggleSound: () => void;
  playSound: (
    name: "click" | "notify" | "startup" | "shutdown" | "start" | "minimize" | "restore"
  ) => Promise<void>;
};

const STORAGE_KEY = "desktop.settings";
const THEME_KEY = "theme";

const SettingsContext = createContext<SettingsContextValue | null>(null);

const defaultSettings: SettingsState = {
  theme: "dark",
  soundEnabled: true,
};

function resolveStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return defaultSettings.theme;
  }

  const explicit = window.localStorage.getItem(THEME_KEY);
  if (explicit === "light" || explicit === "dark") {
    return explicit;
  }

  try {
    const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as Partial<SettingsState>;
      if (legacy.theme === "light" || legacy.theme === "dark") {
        window.localStorage.setItem(THEME_KEY, legacy.theme);
        return legacy.theme;
      }
    }
  } catch {
    // ignore legacy parse errors
  }

  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
}

function resolveStoredSound(): boolean {
  if (typeof window === "undefined") {
    return defaultSettings.soundEnabled;
  }

  try {
    const legacyRaw = window.localStorage.getItem(STORAGE_KEY);
    if (!legacyRaw) {
      return defaultSettings.soundEnabled;
    }
    const legacy = JSON.parse(legacyRaw) as Partial<SettingsState>;
    return typeof legacy.soundEnabled === "boolean"
      ? legacy.soundEnabled
      : defaultSettings.soundEnabled;
  } catch {
    return defaultSettings.soundEnabled;
  }
}

function loadSettings(): SettingsState {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  return {
    theme: resolveStoredTheme(),
    soundEnabled: resolveStoredSound(),
  };
}

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(() => loadSettings());
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(THEME_KEY, settings.theme);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  useEffect(() => {
    const handler = () => setAudioReady(true);
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  const playFallbackBeep = useCallback(() => {
    if (!audioReady) {
      return;
    }
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 520;
    gain.gain.value = 0.03;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.08);
    oscillator.onended = () => context.close();
  }, [audioReady]);

  const playSound = useCallback(
    async (
      name: "click" | "notify" | "startup" | "shutdown" | "start" | "minimize" | "restore"
    ) => {
      if (!settings.soundEnabled || !audioReady) {
        return;
      }
      const sources: Record<string, string | null> = {
        click: null,
        notify: null,
        startup: desktopConfig.sounds.startup ?? null,
        shutdown: desktopConfig.sounds.shutdown ?? null,
        start: desktopConfig.sounds.start ?? null,
        minimize: desktopConfig.sounds.minimize ?? null,
        restore: desktopConfig.sounds.restore ?? null,
      };
      const source = sources[name];
      if (!source) {
        if (name === "click" || name === "notify") {
          return;
        }
        playFallbackBeep();
        return;
      }

      await new Promise<void>((resolve) => {
        const audio = new Audio(source);
        audio.volume = 0.6;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.onabort = () => resolve();
        audio.play().catch(() => {
          playFallbackBeep();
          resolve();
        });
      });
    },
    [audioReady, playFallbackBeep, settings.soundEnabled]
  );


  const value = useMemo<SettingsContextValue>(
    () => ({
      ...settings,
      toggleTheme: () =>
        setSettings((prev) => ({
          ...prev,
          theme: prev.theme === "light" ? "dark" : "light",
        })),
      toggleSound: () =>
        setSettings((prev) => ({
          ...prev,
          soundEnabled: !prev.soundEnabled,
        })),
      playSound,
    }),
    [playSound, settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return context;
}
