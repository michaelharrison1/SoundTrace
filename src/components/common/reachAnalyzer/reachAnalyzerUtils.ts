export const MAX_BAR_SLOTS = 30;
export const LINE_ANIMATION_DURATION_MS = 3750;
export const CHART_BACKGROUND_COLOR = '#262626'; // Neutral-800
export const GRID_COLOR = 'rgba(128, 128, 128, 0.2)';


export const LEVEL_HEX_COLORS: { [key: number]: string } = {
  1: '#34D399', 2: '#3B82F6', 3: '#A855F7', 4: '#EC4899', 5: '#EF4444',
  6: '#F97316', 7: '#EAB308', 8: '#84CC16', 9: '#10B981', 10: '#06B6D4',
};
export const DEFAULT_LEVEL_HEX_COLOR = '#6366F1';

export const getActiveLevelHexColor = (level: number): string => {
  return LEVEL_HEX_COLORS[level] || DEFAULT_LEVEL_HEX_COLOR;
};

export interface BarConfig {
  barUnit: number;
  numberOfBarsToActivate: number;
  unitLabel: string;
}

export const calculateBarConfig = (followers: number | null | undefined, level: number): BarConfig => {
  let baseUnit = 1000;
  if (level > 1) baseUnit = 1000 * Math.pow(1.5, level - 1);
  baseUnit = Math.max(100, Math.round(baseUnit / 100) * 100);

  let barUnit = baseUnit;
  let unitLabel = `${Math.round(baseUnit/1000)}K`;

  if (typeof followers !== 'number' || followers === null || followers <= 0) {
    return { barUnit: 0, numberOfBarsToActivate: 0, unitLabel: '' };
  }

  const dynamicThresholds = [10, 100, 1000]; // Multipliers for baseUnit
  for(let i = 0; i < dynamicThresholds.length; i++){
      if (followers < baseUnit * dynamicThresholds[i]) {
          // Use the previous threshold's multiplier, or 1 if it's the first one
          barUnit = baseUnit * (dynamicThresholds[i-1] || 1);
          break; // Found the appropriate unit scale
      }
      // If followers exceed even the largest threshold, use that largest threshold's unit
      barUnit = baseUnit * dynamicThresholds[i];
  }
   barUnit = Math.max(baseUnit, barUnit); // Ensure barUnit is at least the baseUnit for the level


  if (barUnit >= 1000000000) unitLabel = `${(barUnit / 1000000000).toFixed(barUnit % 1000000000 === 0 ? 0 : 1)}B`;
  else if (barUnit >= 1000000) unitLabel = `${(barUnit / 1000000).toFixed(barUnit % 1000000 === 0 ? 0 : 1)}M`;
  else if (barUnit >= 1000) unitLabel = `${(barUnit / 1000).toFixed(barUnit % 1000 === 0 ? 0 : 1)}K`;
  else unitLabel = `${barUnit}`;

  const calculatedBars = followers > 0 && barUnit > 0 ? Math.ceil(followers / barUnit) : 0;
  const numberOfBarsToActivate = Math.min(MAX_BAR_SLOTS, Math.max(0, calculatedBars));

  return { barUnit, numberOfBarsToActivate, unitLabel };
};

export const ARTIST_LEVEL_THRESHOLDS = [100, 500, 1000, 5000, 10000];

export const calculateArtistLevel = (artistCount: number): number => {
    let level = 1;
    for (const threshold of ARTIST_LEVEL_THRESHOLDS) {
        if (artistCount >= threshold) level++;
        else break;
    }
    return level;
};

export const formatFollowersDisplay = (count: number | null | undefined, isLoading?: boolean): string => {
    if (isLoading && typeof count === 'undefined') return "Loading...";
    if (typeof count === 'undefined') return "Loading...";
    if (count === null) return "N/A";
    if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

