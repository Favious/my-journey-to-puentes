/**
 * Utility functions for generating deterministic variations of holographic colors based on user's full name
 */

// Base holographic colors
const BASE_HOLO_COLORS = ['#00e7ff', '#eb8bff', '#ffffff'] as const;

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a deterministic random number between 0 and 1 based on input
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

/**
 * Convert RGB to hex string
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Apply hue shift to a color
 */
function shiftHue(r: number, g: number, b: number, shift: number): [number, number, number] {
  // Convert RGB to HSL
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const diff = max - min;
  
  let h = 0;
  if (diff !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / diff) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / diff + 2;
    } else {
      h = (rNorm - gNorm) / diff + 4;
    }
  }
  h = (h * 60 + shift) % 360;
  if (h < 0) h += 360;
  
  const l = (max + min) / 2;
  const s = diff === 0 ? 0 : diff / (1 - Math.abs(2 * l - 1));
  
  // Convert back to RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let newR = 0, newG = 0, newB = 0;
  
  if (0 <= h && h < 60) {
    newR = c; newG = x; newB = 0;
  } else if (60 <= h && h < 120) {
    newR = x; newG = c; newB = 0;
  } else if (120 <= h && h < 180) {
    newR = 0; newG = c; newB = x;
  } else if (180 <= h && h < 240) {
    newR = 0; newG = x; newB = c;
  } else if (240 <= h && h < 300) {
    newR = x; newG = 0; newB = c;
  } else if (300 <= h && h < 360) {
    newR = c; newG = 0; newB = x;
  }
  
  return [
    Math.round((newR + m) * 255),
    Math.round((newG + m) * 255),
    Math.round((newB + m) * 255)
  ];
}

/**
 * Adjust brightness of a color
 */
function adjustBrightness(r: number, g: number, b: number, factor: number): [number, number, number] {
  return [
    Math.min(255, Math.max(0, Math.round(r * factor))),
    Math.min(255, Math.max(0, Math.round(g * factor))),
    Math.min(255, Math.max(0, Math.round(b * factor)))
  ];
}

/**
 * Generate variations of the base holographic colors based on user's full name
 * Returns modified versions of the original 3 colors
 */
export function generateNameBasedColors(fullName: string): [string, string, string] {
  if (!fullName || fullName.trim().length === 0) {
    // Return base colors if no name provided
    return [...BASE_HOLO_COLORS];
  }

  const nameHash = hashString(fullName.trim());
  
  // Generate three different seeds for the three colors
  const seed1 = nameHash;
  const seed2 = nameHash + 12345;
  const seed3 = nameHash + 67890;
  
  // Generate variations for each base color
  const variations = BASE_HOLO_COLORS.map((baseColor, index) => {
    const seed = index === 0 ? seed1 : index === 1 ? seed2 : seed3;
    const [r, g, b] = hexToRgb(baseColor);
    
    // Generate hue shift (-30 to +30 degrees)
    const hueShift = (seededRandom(seed) - 0.5) * 60;
    
    // Generate brightness variation (0.7 to 1.3)
    const brightnessFactor = 0.7 + seededRandom(seed + 1) * 0.6;
    
    // Apply hue shift
    const [rShifted, gShifted, bShifted] = shiftHue(r, g, b, hueShift);
    
    // Apply brightness adjustment
    const [rFinal, gFinal, bFinal] = adjustBrightness(rShifted, gShifted, bShifted, brightnessFactor);
    
    return rgbToHex(rFinal, gFinal, bFinal);
  });
  
  return variations as [string, string, string];
}

/**
 * Generate a single color variation based on user's full name
 * Useful for other UI elements that need name-based coloring
 */
export function generateNameBasedColor(fullName: string): string {
  const [color1] = generateNameBasedColors(fullName);
  return color1;
}
