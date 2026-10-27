import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { LocaleText, Theme } from 'ag-grid-community';
import {
  getCloudscapeGridMetrics,
  getCloudscapeGridTheme,
  type CloudscapeGridColorMode,
  type CloudscapeGridDensity,
  type CloudscapeGridMetrics,
} from './theme.js';
import { ensureCloudscapeGridStyles } from './styles.js';

/**
 * Market colors are supplied by the application (for example from Cloudscape
 * design tokens or application tokens) so the package does not impose a market
 * palette. The package only guarantees that the grid chrome itself is
 * Cloudscape-neutral.
 */
export interface CloudscapeGridMarketColors {
  up: string;
  down: string;
  flat: string;
}

export interface CloudscapeGridSettings {
  mode: CloudscapeGridColorMode;
  density: CloudscapeGridDensity;
  metrics: CloudscapeGridMetrics;
  theme: Theme;
  localeText: LocaleText;
  marketColors: CloudscapeGridMarketColors;
}

const defaultMarketColors: CloudscapeGridMarketColors = {
  up: 'inherit',
  down: 'inherit',
  flat: 'inherit',
};

const CloudscapeGridContext = createContext<CloudscapeGridSettings | null>(null);

const emptyLocaleText: LocaleText = {};

export interface CloudscapeGridProviderProps {
  mode?: CloudscapeGridColorMode;
  density?: CloudscapeGridDensity;
  localeText?: LocaleText;
  /** Optional fully-built theme; density/mode still control metrics. */
  theme?: Theme;
  marketColors?: CloudscapeGridMarketColors;
  children: ReactNode;
}

export function CloudscapeGridProvider({
  mode = 'light',
  density = 'standard',
  localeText = emptyLocaleText,
  theme,
  marketColors = defaultMarketColors,
  children,
}: CloudscapeGridProviderProps) {
  useEffect(() => {
    ensureCloudscapeGridStyles();
  }, []);

  const settings = useMemo<CloudscapeGridSettings>(() => {
    const metrics = getCloudscapeGridMetrics(density);
    return {
      mode,
      density,
      metrics,
      theme: theme ?? getCloudscapeGridTheme(mode, density, metrics),
      localeText,
      marketColors,
    };
  }, [density, localeText, marketColors, mode, theme]);

  return (
    <CloudscapeGridContext.Provider value={settings}>
      {children}
    </CloudscapeGridContext.Provider>
  );
}

export function useCloudscapeGridSettings(): CloudscapeGridSettings {
  const settings = useContext(CloudscapeGridContext);
  if (!settings) {
    throw new Error(
      'CloudscapeGridProvider is missing. Wrap the application with <CloudscapeGridProvider>.',
    );
  }
  return settings;
}

export function useCloudscapeGridMetrics(): CloudscapeGridMetrics {
  return useCloudscapeGridSettings().metrics;
}

export function useCloudscapeGridMarketColors(): CloudscapeGridMarketColors {
  return useCloudscapeGridSettings().marketColors;
}
