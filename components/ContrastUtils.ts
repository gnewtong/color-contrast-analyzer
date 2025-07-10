// Utility functions for calculating color contrast ratios

export interface ColorStop {
  name: string;
  hex: string;
}

export interface ColorRamp {
  id: string;
  name: string;
  stops: ColorStop[];
}

// Convert hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Calculate relative luminance
export function getLuminance(r: number, g: number, b: number): number {
  const getRGBValue = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 
      ? normalized / 12.92 
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * getRGBValue(r) + 0.7152 * getRGBValue(g) + 0.0722 * getRGBValue(b);
}

// Calculate contrast ratio between two colors
export function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) return 1;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

// Format contrast ratio for display
export function formatContrastRatio(ratio: number): string {
  if (ratio < 1.1) return "1:1";
  return `${ratio.toFixed(ratio < 10 ? 2 : 1).replace(/\.?0+$/, '')}:1`;
}

// Get contrast level classification
export function getContrastLevel(ratio: number): 'fail' | 'aa-large' | 'aa' | 'aaa' {
  if (ratio >= 7) return 'aaa';
  if (ratio >= 4.5) return 'aa';
  if (ratio >= 3) return 'aa-large';
  return 'fail';
}

// Get background color for contrast level
export function getContrastLevelColor(level: string): string {
  switch (level) {
    case 'aaa':
      return '#d5efb5'; // Green
    case 'aa':
      return '#d5efb5'; // Green
    case 'aa-large':
      return '#feecbc'; // Yellow
    case 'fail':
      return '#f6f5f6'; // Light gray
    default:
      return '#ffffff'; // White
  }
}

// Default color ramps
export const defaultColorRamps: ColorRamp[] = [
  {
    id: 'gray',
    name: 'Gray',
    stops: [
      { name: '050', hex: '#ffffff' },
      { name: '100', hex: '#f6f6f6' },
      { name: '200', hex: '#ebebeb' },
      { name: '300', hex: '#cacaca' },
      { name: '400', hex: '#919191' },
      { name: '500', hex: '#7a7a7a' },
      { name: '600', hex: '#6b6b6b' },
      { name: '700', hex: '#565656' },
      { name: '800', hex: '#434343' },
      { name: '900', hex: '#2f2f2f' },
      { name: '1000', hex: '#000000' }
    ]
  }
];