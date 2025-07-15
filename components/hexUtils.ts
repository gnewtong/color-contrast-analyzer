// Utility functions for hex color handling
export function normalizeHex(hex: string): string {
  // Remove # if present
  const clean = hex.replace('#', '');
  
  // Handle partial inputs by padding with zeros
  if (clean.length < 6) {
    const padded = clean.padEnd(6, '0');
    return `#${padded.toUpperCase()}`;
  }
  
  // Convert 3-digit to 6-digit (if exactly 3 characters)
  if (clean.length === 3) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`.toUpperCase();
  }
  
  // Return 6-digit with #
  return `#${clean.toUpperCase()}`;
}

export function isValidHexColor(hex: string): boolean {
  // Accept all formats: #FF0000, #F00, FF0000, F00
  // Also accept partial inputs for better UX while typing
  const hexRegex = /^#?([A-Fa-f0-9]{1,6})$/;
  return hexRegex.test(hex);
}

export function parseHexValues(input: string): string[] {
  // Remove whitespace and split by lines or commas
  const lines = input.trim().split(/[\n,\s]+/).filter(line => line.length > 0);
  
  const validHexValues: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (isValidHexColor(trimmed)) {
      // Normalize to 6-digit format
      validHexValues.push(normalizeHex(trimmed));
    }
  }
  
  return validHexValues;
} 