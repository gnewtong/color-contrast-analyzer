import React, { useEffect, useState, useRef } from 'react';
import { ColorRamp, getContrastRatio, formatContrastRatio, getContrastLevel, getContrastLevelColor } from './ContrastUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Download, Lock, Unlock, Copy } from 'lucide-react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface ContrastGridProps {
  colorRamps: ColorRamp[];
  selectedXRampId?: string;
  selectedYRampId?: string;
  onXRampChange?: (rampId: string) => void;
  onYRampChange?: (rampId: string) => void;
  onColorRampsChange?: (ramps: ColorRamp[]) => void;
}

interface ContrastAdjustmentOption {
  type: 'x-only' | 'y-only' | 'both';
  xColor?: string;
  yColor?: string;
  newContrastRatio: number;
  description: string;
  isPossible: boolean;
  reason?: string;
}

export function ContrastGrid({ 
  colorRamps, 
  selectedXRampId, 
  selectedYRampId, 
  onXRampChange, 
  onYRampChange,
  onColorRampsChange
}: ContrastGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    xColor: string;
    yColor: string;
    xRampId: string;
    yRampId: string;
    xStopIndex: number;
    yStopIndex: number;
    currentRatio: number;
  } | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<'AA_LARGE' | 'AA' | 'AAA'>('AA');
  const [adjustmentOptions, setAdjustmentOptions] = useState<ContrastAdjustmentOption[]>([]);
  // Add state for lock warning dialog
  const [lockWarningOpen, setLockWarningOpen] = useState(false);
  const [lockedStops, setLockedStops] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [copied, setCopied] = useState(false);

  // Regenerate adjustment options when target changes
  useEffect(() => {
    if (selectedCell) {
      generateAdjustmentOptions();
    }
  }, [selectedTarget, selectedCell]);

  // Hex color validation
  const isValidHexColor = (color: string): boolean => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  };

  // Get accessible text colors with proper contrast calculation
  const getAccessibleTextColors = (backgroundColor: string) => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance using WCAG formula
    const getLuminance = (r: number, g: number, b: number) => {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };
    
    const bgLuminance = getLuminance(r, g, b);
    
    // Calculate contrast ratios against black and white
    const blackLuminance = 0;
    const whiteLuminance = 1;
    
    const contrastWithBlack = (Math.max(bgLuminance, blackLuminance) + 0.05) / (Math.min(bgLuminance, blackLuminance) + 0.05);
    const contrastWithWhite = (Math.max(bgLuminance, whiteLuminance) + 0.05) / (Math.min(bgLuminance, whiteLuminance) + 0.05);
    
    // Choose the better contrast option
    const useWhiteText = contrastWithWhite > contrastWithBlack;
    const bestContrast = useWhiteText ? contrastWithWhite : contrastWithBlack;
    
    // Check if we need text shadow for borderline cases
    const minContrast = 4.5; // WCAG AA standard for normal text
    const needsShadow = bestContrast < minContrast;
    
    // For very dark backgrounds, always use white text
    if (bgLuminance < 0.1) {
      return {
        textColor: 'text-white',
        hexColor: 'text-white/70',
        textShadow: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
      };
    }
    
    // For very light backgrounds, always use black text
    if (bgLuminance > 0.8) {
      return {
        textColor: 'text-black',
        hexColor: 'text-black/70',
        textShadow: 'none'
      };
    }
    
    return {
      textColor: useWhiteText ? 'text-white' : 'text-black',
      hexColor: useWhiteText ? 'text-white/70' : 'text-black/70',
      textShadow: needsShadow ? 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' : 'none'
    };
  };



  // Update color stop
  const updateColorStop = (rampId: string, stopIndex: number, field: 'name' | 'hex', value: string) => {
    if (!onColorRampsChange) return;

    const updatedRamps = colorRamps.map(ramp => {
      if (ramp.id === rampId) {
        const updatedStops = [...ramp.stops];
        updatedStops[stopIndex] = {
          ...updatedStops[stopIndex],
          [field]: value
        };
        return { ...ramp, stops: updatedStops };
      }
      return ramp;
    });

    onColorRampsChange(updatedRamps);
  };

  // Use first ramp as default if no selection
  const xRamp = colorRamps.find(ramp => ramp.id === selectedXRampId) || colorRamps[0];
  const yRamp = colorRamps.find(ramp => ramp.id === selectedYRampId) || colorRamps[0];



  const exportToSVG = () => {
    if (!xRamp || !yRamp) return;

    const gridSize = 100; // Fixed size for export
    const gap = 2;
    const totalWidth = (xRamp.stops.length + 1) * gridSize + xRamp.stops.length * gap;
    const totalHeight = (yRamp.stops.length + 1) * gridSize + yRamp.stops.length * gap;

    let svgContent = `<svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add styles
    const nameSize = gridSize >= 100 ? '14' : gridSize >= 80 ? '12' : '10';
    const hexSize = gridSize >= 100 ? '11' : gridSize >= 80 ? '10' : '9';
    const ratioSize = gridSize >= 100 ? '14' : gridSize >= 80 ? '12' : '10';
    
    svgContent += `<defs><style>
      .color-name { font-family: system-ui, -apple-system, sans-serif; font-size: ${nameSize}px; font-weight: 500; }
      .color-hex { font-family: system-ui, -apple-system, sans-serif; font-size: ${hexSize}px; opacity: 0.7; }
      .contrast-ratio { font-family: system-ui, -apple-system, sans-serif; font-size: ${ratioSize}px; fill: black; }
    </style></defs>`;

    // Top-left empty cell
    svgContent += `<rect x="0" y="0" width="${gridSize}" height="${gridSize}" fill="white" stroke="#d1d5db" stroke-width="1"/>`;

    // Top row - X ramp headers
    xRamp.stops.forEach((stop, i) => {
      const x = (i + 1) * (gridSize + gap);
      const textColor = getContrastRatio(stop.hex, '#000000') > getContrastRatio(stop.hex, '#ffffff') ? 'black' : 'white';
      
      svgContent += `<rect x="${x}" y="0" width="${gridSize}" height="${gridSize}" fill="${stop.hex}" stroke="#d1d5db" stroke-width="1"/>`;
      svgContent += `<text x="${x + gridSize/2}" y="${gridSize - 20}" text-anchor="middle" class="color-name" fill="${textColor}">${stop.name}</text>`;
      svgContent += `<text x="${x + gridSize/2}" y="${gridSize - 6}" text-anchor="middle" class="color-hex" fill="${textColor}">${stop.hex}</text>`;
    });

    // Left column and grid cells
    yRamp.stops.forEach((rowStop, i) => {
      const y = (i + 1) * (gridSize + gap);
      const textColor = getContrastRatio(rowStop.hex, '#000000') > getContrastRatio(rowStop.hex, '#ffffff') ? 'black' : 'white';
      
      // Left column header
      svgContent += `<rect x="0" y="${y}" width="${gridSize}" height="${gridSize}" fill="${rowStop.hex}" stroke="#d1d5db" stroke-width="1"/>`;
      svgContent += `<text x="${gridSize/2}" y="${y + gridSize - 20}" text-anchor="middle" class="color-name" fill="${textColor}">${rowStop.name}</text>`;
      svgContent += `<text x="${gridSize/2}" y="${y + gridSize - 6}" text-anchor="middle" class="color-hex" fill="${textColor}">${rowStop.hex}</text>`;

      // Grid cells
      xRamp.stops.forEach((colStop, j) => {
        const x = (j + 1) * (gridSize + gap);
        const ratio = getContrastRatio(rowStop.hex, colStop.hex);
        const level = getContrastLevel(ratio);
        const bgColor = getContrastLevelColor(level);
        
        svgContent += `<rect x="${x}" y="${y}" width="${gridSize}" height="${gridSize}" fill="${bgColor}" stroke="#d1d5db" stroke-width="1"/>`;
        svgContent += `<text x="${x + gridSize/2}" y="${y + gridSize - 10}" text-anchor="middle" class="contrast-ratio">${formatContrastRatio(ratio)}</text>`;
      });
    });

    svgContent += '</svg>';

    // Create download
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrast-grid-${xRamp.name}-vs-${yRamp.name}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!xRamp || !yRamp) return;

    const gridSize = 100; // Fixed size for copy
    const gap = 2;
    const totalWidth = (xRamp.stops.length + 1) * gridSize + xRamp.stops.length * gap;
    const totalHeight = (yRamp.stops.length + 1) * gridSize + yRamp.stops.length * gap;

    let svgContent = `<svg width="${totalWidth}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add styles
    const nameSize = gridSize >= 100 ? '14' : gridSize >= 80 ? '12' : '10';
    const hexSize = gridSize >= 100 ? '11' : gridSize >= 80 ? '10' : '9';
    const ratioSize = gridSize >= 100 ? '14' : gridSize >= 80 ? '12' : '10';
    
    svgContent += `<defs><style>
      .color-name { font-family: system-ui, -apple-system, sans-serif; font-size: ${nameSize}px; font-weight: 500; }
      .color-hex { font-family: system-ui, -apple-system, sans-serif; font-size: ${hexSize}px; opacity: 0.7; }
      .contrast-ratio { font-family: system-ui, -apple-system, sans-serif; font-size: ${ratioSize}px; fill: black; }
    </style></defs>`;

    // Top-left empty cell
    svgContent += `<rect x="0" y="0" width="${gridSize}" height="${gridSize}" fill="white" stroke="#d1d5db" stroke-width="1"/>`;

    // Top row - X ramp headers
    xRamp.stops.forEach((stop, i) => {
      const x = (i + 1) * (gridSize + gap);
      const textColor = getContrastRatio(stop.hex, '#000000') > getContrastRatio(stop.hex, '#ffffff') ? 'black' : 'white';
      
      svgContent += `<rect x="${x}" y="0" width="${gridSize}" height="${gridSize}" fill="${stop.hex}" stroke="#d1d5db" stroke-width="1"/>`;
      svgContent += `<text x="${x + gridSize/2}" y="${gridSize - 20}" text-anchor="middle" class="color-name" fill="${textColor}">${stop.name}</text>`;
      svgContent += `<text x="${x + gridSize/2}" y="${gridSize - 6}" text-anchor="middle" class="color-hex" fill="${textColor}">${stop.hex}</text>`;
    });

    // Left column and grid cells
    yRamp.stops.forEach((rowStop, i) => {
      const y = (i + 1) * (gridSize + gap);
      const textColor = getContrastRatio(rowStop.hex, '#000000') > getContrastRatio(rowStop.hex, '#ffffff') ? 'black' : 'white';
      
      // Left column header
      svgContent += `<rect x="0" y="${y}" width="${gridSize}" height="${gridSize}" fill="${rowStop.hex}" stroke="#d1d5db" stroke-width="1"/>`;
      svgContent += `<text x="${gridSize/2}" y="${y + gridSize - 20}" text-anchor="middle" class="color-name" fill="${textColor}">${rowStop.name}</text>`;
      svgContent += `<text x="${gridSize/2}" y="${y + gridSize - 6}" text-anchor="middle" class="color-hex" fill="${textColor}">${rowStop.hex}</text>`;

      // Grid cells
      xRamp.stops.forEach((colStop, j) => {
        const x = (j + 1) * (gridSize + gap);
        const ratio = getContrastRatio(rowStop.hex, colStop.hex);
        const level = getContrastLevel(ratio);
        const bgColor = getContrastLevelColor(level);
        
        svgContent += `<rect x="${x}" y="${y}" width="${gridSize}" height="${gridSize}" fill="${bgColor}" stroke="#d1d5db" stroke-width="1"/>`;
        svgContent += `<text x="${x + gridSize/2}" y="${y + gridSize/2 + 4}" text-anchor="middle" class="contrast-ratio">${formatContrastRatio(ratio)}</text>`;
      });
    });

    svgContent += '</svg>';

    try {
      await navigator.clipboard.writeText(svgContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy SVG to clipboard:', error);
    }
  };

  const handleCellClick = (xColor: string, yColor: string, xRampId: string, yRampId: string, xStopIndex: number, yStopIndex: number) => {
    // Check for locked stops before opening adjustment dialog
    const xRamp = colorRamps.find(r => r.id === xRampId);
    const yRamp = colorRamps.find(r => r.id === yRampId);
    const locked: string[] = [];
    if (xRamp?.lockedStops?.has(xStopIndex)) {
      locked.push(xRamp.stops[xStopIndex]?.name || 'X');
    }
    if (yRamp?.lockedStops?.has(yStopIndex)) {
      locked.push(yRamp.stops[yStopIndex]?.name || 'Y');
    }
    if (locked.length > 0) {
      setLockedStops(locked);
      setLockWarningOpen(true);
      return;
    }
    const currentRatio = getContrastRatio(xColor, yColor);
    setSelectedCell({
      xColor,
      yColor,
      xRampId,
      yRampId,
      xStopIndex,
      yStopIndex,
      currentRatio
    });
    setSelectedTarget('AA'); // Reset to AA when dialog opens
    setAdjustmentDialogOpen(true);
    // Generate options will be called by useEffect when selectedCell changes
  };

  const generateAdjustmentOptions = () => {
    if (!selectedCell) return;

    const targetRatio = selectedTarget === 'AA_LARGE' ? 3.0 : selectedTarget === 'AA' ? 4.5 : 7.0;
    const options: ContrastAdjustmentOption[] = [];

    // Get stop names and ramps
    const xRamp = colorRamps.find(r => r.id === selectedCell.xRampId);
    const yRamp = colorRamps.find(r => r.id === selectedCell.yRampId);
    const xStopName = xRamp?.stops[selectedCell.xStopIndex]?.name || 'X';
    const yStopName = yRamp?.stops[selectedCell.yStopIndex]?.name || 'Y';
    const xCurrent = selectedCell.xColor.toLowerCase();
    const yCurrent = selectedCell.yColor.toLowerCase();

    // Determine which is lighter and darker
    let lighterIdx = getLuminance(xCurrent) > getLuminance(yCurrent) ? 'x' : 'y';
    let darkerIdx = lighterIdx === 'x' ? 'y' : 'x';
    let lighterColor = lighterIdx === 'x' ? xCurrent : yCurrent;
    let darkerColor = darkerIdx === 'x' ? xCurrent : yCurrent;
    let lighterStopName = lighterIdx === 'x' ? xStopName : yStopName;
    let darkerStopName = darkerIdx === 'x' ? xStopName : yStopName;

    // Option 1: Adjust lighter stop only
    const lighterAdjusted = adjustColorToContrast(lighterColor, darkerColor, targetRatio).toLowerCase();
    const lighterChanged = lighterAdjusted !== lighterColor;
    const lighterRatio = getContrastRatio(lighterAdjusted, darkerColor);
    
    options.push({
      type: lighterIdx === 'x' ? 'x-only' : 'y-only',
      xColor: lighterIdx === 'x' ? lighterAdjusted : xCurrent,
      yColor: lighterIdx === 'y' ? lighterAdjusted : yCurrent,
      newContrastRatio: lighterRatio,
      description: `Adjust ${lighterStopName} to ${lighterAdjusted}`,
      isPossible: lighterChanged && lighterRatio >= targetRatio,
      reason: !lighterChanged || lighterRatio < targetRatio ? 'No lighter color can achieve the target contrast' : undefined
    });

    // Option 2: Adjust darker stop only
    const darkerAdjusted = adjustColorToContrast(darkerColor, lighterColor, targetRatio).toLowerCase();
    const darkerChanged = darkerAdjusted !== darkerColor;
    const darkerRatio = getContrastRatio(lighterColor, darkerAdjusted);
    
    options.push({
      type: darkerIdx === 'x' ? 'x-only' : 'y-only',
      xColor: darkerIdx === 'x' ? darkerAdjusted : xCurrent,
      yColor: darkerIdx === 'y' ? darkerAdjusted : yCurrent,
      newContrastRatio: darkerRatio,
      description: `Adjust ${darkerStopName} to ${darkerAdjusted}`,
      isPossible: darkerChanged && darkerRatio >= targetRatio,
      reason: !darkerChanged || darkerRatio < targetRatio ? 'No darker color can achieve the target contrast' : undefined
    });

    // Option 3: Adjust both stops (middleground)
    const lighterLab = hexToLab(lighterColor);
    const darkerLab = hexToLab(darkerColor);
    let t = 0.5;
    let found = false;
    let bestLighter = lighterColor;
    let bestDarker = darkerColor;
    
    for (let i = 0; i <= 100; i++) {
      // Interpolate both toward midpoint, then move apart
      const midL = (lighterLab.l + darkerLab.l) / 2;
      const lighterNewLab = { ...lighterLab, l: midL + t * (lighterLab.l - midL) };
      const darkerNewLab = { ...darkerLab, l: midL - t * (midL - darkerLab.l) };
      const lighterHex = labToHex(lighterNewLab).toLowerCase();
      const darkerHex = labToHex(darkerNewLab).toLowerCase();
      const ratio = getContrastRatio(lighterHex, darkerHex);
      if (ratio >= targetRatio) {
        bestLighter = lighterHex;
        bestDarker = darkerHex;
        found = true;
        break;
      }
      t += 0.01;
    }
    
    const bothChanged = bestLighter !== lighterColor || bestDarker !== darkerColor;
    const bothRatio = getContrastRatio(bestLighter, bestDarker);
    
    options.push({
      type: 'both',
      xColor: lighterIdx === 'x' ? bestLighter : bestDarker,
      yColor: lighterIdx === 'y' ? bestLighter : bestDarker,
      newContrastRatio: bothRatio,
      description: `Adjust ${xStopName} to ${lighterIdx === 'x' ? bestLighter : bestDarker}, ${yStopName} to ${lighterIdx === 'y' ? bestLighter : bestDarker}`,
      isPossible: found && bothChanged && bothRatio >= targetRatio,
      reason: !found || !bothChanged || bothRatio < targetRatio ? 'Cannot reach target by adjusting both stops' : undefined
    });

    setAdjustmentOptions(options);
  };

  // Helper for readable text color
  const getReadableTextColor = (hex: string) => {
    const rgb = hexToRgb(hex);
    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#222' : '#fff';
  };

  const applyAdjustment = (option: ContrastAdjustmentOption) => {
    if (!selectedCell || !onColorRampsChange) return;

    // Check if any stop being adjusted is locked
    const xRamp = colorRamps.find(r => r.id === selectedCell.xRampId);
    const yRamp = colorRamps.find(r => r.id === selectedCell.yRampId);
    const locked: string[] = [];
    if (option.xColor && xRamp?.lockedStops?.has(selectedCell.xStopIndex)) {
      locked.push(xRamp.stops[selectedCell.xStopIndex]?.name || 'X');
    }
    if (option.yColor && yRamp?.lockedStops?.has(selectedCell.yStopIndex)) {
      locked.push(yRamp.stops[selectedCell.yStopIndex]?.name || 'Y');
    }
    if (locked.length > 0) {
      setLockedStops(locked);
      setLockWarningOpen(true);
      return;
    }

    const updatedRamps = [...colorRamps];

    if (option.xColor) {
      const xRampIndex = updatedRamps.findIndex(r => r.id === selectedCell.xRampId);
      if (xRampIndex !== -1) {
        updatedRamps[xRampIndex] = {
          ...updatedRamps[xRampIndex],
          stops: updatedRamps[xRampIndex].stops.map((stop, index) =>
            index === selectedCell.xStopIndex ? { ...stop, hex: option.xColor! } : stop
          )
        };
      }
    }

    if (option.yColor) {
      const yRampIndex = updatedRamps.findIndex(r => r.id === selectedCell.yRampId);
      if (yRampIndex !== -1) {
        updatedRamps[yRampIndex] = {
          ...updatedRamps[yRampIndex],
          stops: updatedRamps[yRampIndex].stops.map((stop, index) =>
            index === selectedCell.yStopIndex ? { ...stop, hex: option.yColor! } : stop
          )
        };
      }
    }

    onColorRampsChange(updatedRamps);
    setAdjustmentDialogOpen(false);
    setSelectedCell(null);
  };

  // Color adjustment utility functions
  const adjustColorToContrast = (color: string, backgroundColor: string, targetRatio: number): string => {
    const currentRatio = getContrastRatio(color, backgroundColor);
    
    if (currentRatio >= targetRatio) {
      return color; // Already meets target
    }

    // Convert to LAB for better color adjustments
    const colorLab = hexToLab(color);
    const bgLab = hexToLab(backgroundColor);
    
    // Try adjusting lightness first (most common approach)
    let adjustedLab = { ...colorLab };
    let step = 0.1;
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const testColor = labToHex(adjustedLab);
      const testRatio = getContrastRatio(testColor, backgroundColor);
      
      if (testRatio >= targetRatio) {
        return testColor;
      }
      
      // Adjust lightness based on whether we need more or less contrast
      if (testRatio < targetRatio) {
        // Need more contrast - make color darker if background is light, lighter if background is dark
        const bgLuminance = getLuminance(backgroundColor);
        if (bgLuminance > 0.5) {
          adjustedLab.l = Math.max(0, adjustedLab.l - step);
        } else {
          adjustedLab.l = Math.min(100, adjustedLab.l + step);
        }
      }
      
      step *= 1.1; // Increase step size for faster convergence
      attempts++;
    }

    return color; // Fallback to original if we can't achieve target
  };

  const hexToLab = (hex: string) => {
    const rgb = hexToRgb(hex);
    return rgbToLab(rgb);
  };

  const labToHex = (lab: {l: number, a: number, b: number}) => {
    const rgb = labToRgb(lab);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const rgbToLab = (rgb: {r: number, g: number, b: number}) => {
    const xyz = rgbToXyz(rgb);
    return xyzToLab(xyz);
  };

  const labToRgb = (lab: {l: number, a: number, b: number}) => {
    const xyz = labToXyz(lab);
    return xyzToRgb(xyz);
  };

  const rgbToXyz = (rgb: {r: number, g: number, b: number}) => {
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    r *= 100;
    g *= 100;
    b *= 100;

    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

    return { x, y, z };
  };

  const xyzToLab = (xyz: {x: number, y: number, z: number}) => {
    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    let x = xyz.x / xn;
    let y = xyz.y / yn;
    let z = xyz.z / zn;

    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

    const l = (116 * y) - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);

    return { l, a, b };
  };

  const labToXyz = (lab: {l: number, a: number, b: number}) => {
    let y = (lab.l + 16) / 116;
    let x = lab.a / 500 + y;
    let z = y - lab.b / 200;

    x = x > 0.2069 ? Math.pow(x, 3) : (x - 16 / 116) / 7.787;
    y = y > 0.2069 ? Math.pow(y, 3) : (y - 16 / 116) / 7.787;
    z = z > 0.2069 ? Math.pow(z, 3) : (z - 16 / 116) / 7.787;

    const xn = 95.047;
    const yn = 100.000;
    const zn = 108.883;

    return {
      x: x * xn,
      y: y * yn,
      z: z * zn
    };
  };

  const xyzToRgb = (xyz: {x: number, y: number, z: number}) => {
    let x = xyz.x / 100;
    let y = xyz.y / 100;
    let z = xyz.z / 100;

    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b = x * 0.0557 + y * -0.2040 + z * 1.0570;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1/2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1/2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1/2.4) - 0.055 : 12.92 * b;

    return {
      r: Math.max(0, Math.min(255, Math.round(r * 255))),
      g: Math.max(0, Math.min(255, Math.round(g * 255))),
      b: Math.max(0, Math.min(255, Math.round(b * 255)))
    };
  };

  const getLuminance = (color: string) => {
    const rgb = hexToRgb(color);
    const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  useEffect(() => {
    if (adjustmentDialogOpen && selectedCell) {
      generateAdjustmentOptions();
    }
  }, [adjustmentDialogOpen, selectedCell, selectedTarget]);

  if (colorRamps.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        Add color ramps to see the contrast matrix
      </div>
    );
  }

  const showRampSelectors = colorRamps.length > 1 && onXRampChange && onYRampChange;

  // Adjust font sizes based on container width
  const getFontSizes = () => {
    return { name: 'text-sm', hex: 'text-xs', ratio: 'text-sm' };
  };

  const fontSizes = getFontSizes();

  // Adjust padding based on container width
  const getPadding = () => {
    return 'p-2';
  };

  const padding = getPadding();

  // Add this function inside the ContrastGrid component
  const toggleLockedStop = (rampId: string, stopIndex: number) => {
    if (!onColorRampsChange) return;
    const updatedRamps = colorRamps.map(ramp => {
      if (ramp.id === rampId) {
        const lockedStops = new Set(ramp.lockedStops || []);
        if (lockedStops.has(stopIndex)) {
          lockedStops.delete(stopIndex);
        } else {
          lockedStops.add(stopIndex);
        }
        return { ...ramp, lockedStops };
      }
      return ramp;
    });
    onColorRampsChange(updatedRamps);
  };

  // Editable Color Swatch Component
  const EditableColorSwatch = React.memo(({ 
    stop, 
    rampId, 
    stopIndex, 
    textColor, 
    hexColor, 
    textShadow, 
    fontSizes, 
    padding,
    isLocked = false,
    onToggleLock
  }: {
    stop: { name: string; hex: string };
    rampId: string;
    stopIndex: number;
    textColor: string;
    hexColor: string;
    textShadow: string;
    fontSizes: { name: string; hex: string };
    padding: string;
    isLocked?: boolean;
    onToggleLock?: (rampId: string, stopIndex: number) => void;
  }) => {
    const [nameValue, setNameValue] = useState(stop.name);
    const [hexValue, setHexValue] = useState(stop.hex);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingHex, setIsEditingHex] = useState(false);

    // Update local state when prop changes, but only if not currently editing
    useEffect(() => {
      if (!isEditingName) {
        setNameValue(stop.name);
      }
    }, [stop.name, isEditingName]);

    useEffect(() => {
      if (!isEditingHex) {
        setHexValue(stop.hex);
      }
    }, [stop.hex, isEditingHex]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNameValue(value);
    };

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setHexValue(value);
    };

    const handleNameFocus = () => {
      setIsEditingName(true);
    };

    const handleHexFocus = () => {
      setIsEditingHex(true);
    };

    const handleNameBlur = () => {
      setIsEditingName(false);
      if (nameValue !== stop.name) {
        updateColorStop(rampId, stopIndex, 'name', nameValue);
      }
    };

    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNameBlur();
      }
    };

    const handleHexBlur = () => {
      setIsEditingHex(false);
      if (hexValue !== stop.hex) {
        if (isValidHexColor(hexValue)) {
          updateColorStop(rampId, stopIndex, 'hex', hexValue);
        } else {
          // Reset to original value if invalid
          setHexValue(stop.hex);
        }
      }
    };

    const handleHexKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleHexBlur();
      }
    };

    return (
      <div
        className={`relative border border-gray-200 flex items-end justify-center ${padding} overflow-hidden aspect-square`}
        style={{ 
          backgroundColor: stop.hex
        }}
      >
        <button
          type="button"
          className={`absolute top-1 right-1 rounded-full p-0.5 z-10 ${isLocked ? 'bg-blue-500' : ''}`}
          aria-label={isLocked ? 'Unlock color stop' : 'Lock color stop'}
          onClick={e => {
            e.stopPropagation();
            if (onToggleLock) onToggleLock(rampId, stopIndex);
          }}
          tabIndex={0}
          style={{ background: isLocked ? undefined : 'transparent' }}
        >
          {isLocked ? <Lock className="w-3 h-3 text-white" /> : <Unlock className="w-3 h-3 text-gray-400" />}
        </button>
        <div className={`text-center leading-tight ${fontSizes.name} w-full h-full flex flex-col justify-center items-center`}>
          <Input
            value={nameValue}
            onChange={handleNameChange}
            onFocus={handleNameFocus}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className={`text-xs h-6 w-[95%] text-center px-1 ${textColor} bg-transparent border-none focus:ring-1 focus:ring-white/50 mb-1`}
            style={{ 
              color: textColor === 'text-white' ? '#fff' : '#000',
              textShadow: textShadow
            }}
          />
          <Input
            value={hexValue}
            onChange={handleHexChange}
            onFocus={handleHexFocus}
            onBlur={handleHexBlur}
            onKeyDown={handleHexKeyDown}
            className={`text-xs h-6 w-[95%] text-center px-1 ${hexColor} bg-transparent border-none focus:ring-1 focus:ring-white/50`}
            style={{ 
              color: hexColor === 'text-white/70' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
              textShadow: textShadow
            }}
            disabled={isLocked}
            readOnly={isLocked}
          />
        </div>
      </div>
    );
  });

  return (
    <div ref={containerRef} className="w-full space-y-4" style={{ scrollBehavior: 'auto' }}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        {showRampSelectors && (
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2">
              <Label htmlFor="x-ramp-select">Horizontal Axis (X)</Label>
              <Select value={xRamp.id} onValueChange={onXRampChange}>
                <SelectTrigger id="x-ramp-select" className="min-w-0 w-auto max-w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" className="min-w-fit">
                  {colorRamps.map((ramp) => (
                    <SelectItem key={ramp.id} value={ramp.id}>
                      {ramp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="y-ramp-select">Vertical Axis (Y)</Label>
              <Select value={yRamp.id} onValueChange={onYRampChange}>
                <SelectTrigger id="y-ramp-select" className="min-w-0 w-auto max-w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" className="min-w-fit">
                  {colorRamps.map((ramp) => (
                    <SelectItem key={ramp.id} value={ramp.id}>
                      {ramp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={exportToSVG} 
            variant="outline" 
            size="sm" 
            className="shrink-0"
            aria-label="Export contrast grid as SVG image"
          >
            <Download className="w-4 h-4 mr-2" />
            Export SVG
          </Button>
          <Button
            onClick={copyToClipboard}
            variant="outline"
            size="sm"
            className="shrink-0"
            aria-label="Copy contrast grid as SVG to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 mr-2 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy SVG'}
          </Button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div 
          className="grid gap-2 mx-auto" 
          style={{ 
            gridTemplateColumns: `repeat(${xRamp.stops.length + 1}, minmax(60px, 1fr))`
          }}
          role="grid"
          aria-label={`Contrast ratio matrix comparing ${xRamp.name} (horizontal) and ${yRamp.name} (vertical) color ramps`}
        >
          {/* Top-left empty cell */}
          <div 
            className="bg-white border border-gray-200 aspect-square" 
            aria-label="Empty cell - top left corner"
          />
          
          {/* Top row - X ramp color swatches */}
          {xRamp.stops.map((stop, index) => {
            const { textColor, hexColor, textShadow } = getAccessibleTextColors(stop.hex);
            const isLocked = xRamp.lockedStops?.has(index) || false;
            
            return (
              <EditableColorSwatch
                key={`header-${stop.name}`}
                stop={stop}
                rampId={xRamp.id}
                stopIndex={index}
                textColor={textColor}
                hexColor={hexColor}
                textShadow={textShadow}
                fontSizes={fontSizes}
                padding={padding}
                isLocked={isLocked}
                onToggleLock={toggleLockedStop}
              />
            );
          })}

          {/* Left column and grid cells */}
          {yRamp.stops.map((rowStop) => {
            const { textColor, hexColor, textShadow } = getAccessibleTextColors(rowStop.hex);
            const stopIndex = yRamp.stops.findIndex(s => s.name === rowStop.name);
            const isLocked = yRamp.lockedStops?.has(stopIndex) || false;
            
            return (
              <React.Fragment key={`row-${rowStop.name}`}>
                {/* Left column - Y ramp color swatch */}
                <EditableColorSwatch
                  stop={rowStop}
                  rampId={yRamp.id}
                  stopIndex={stopIndex}
                  textColor={textColor}
                  hexColor={hexColor}
                  textShadow={textShadow}
                  fontSizes={fontSizes}
                  padding={padding}
                  isLocked={isLocked}
                  onToggleLock={toggleLockedStop}
                />
                
                {/* Grid cells - contrast ratios */}
                {xRamp.stops.map((colStop) => {
                  const ratio = getContrastRatio(rowStop.hex, colStop.hex);
                  const level = getContrastLevel(ratio);
                  const bgColor = getContrastLevelColor(level);
                  
                  return (
                    <div
                      key={`cell-${rowStop.name}-${colStop.name}`}
                      className={`border border-gray-200 flex items-center justify-center ${padding} aspect-square cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all`}
                      style={{ 
                        backgroundColor: bgColor
                      }}
                      role="gridcell"
                      aria-label={`Contrast ratio between ${rowStop.name} (${rowStop.hex}) and ${colStop.name} (${colStop.hex}): ${formatContrastRatio(ratio)}`}
                      onClick={() => handleCellClick(
                        rowStop.hex, 
                        colStop.hex, 
                        yRamp.id, 
                        xRamp.id, 
                        yRamp.stops.findIndex(s => s.name === rowStop.name),
                        xRamp.stops.findIndex(s => s.name === colStop.name)
                      )}
                    >
                      <div className={`text-center text-black ${fontSizes.ratio}`}>
                        {formatContrastRatio(ratio)}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Contrast Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Contrast Ratio</DialogTitle>
            <DialogDescription>
              Choose how to adjust the contrast ratio to meet accessibility standards.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCell && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Ratio: {formatContrastRatio(selectedCell.currentRatio)}</Label>
                <div className="space-y-2">
                  <div className="text-sm font-medium mb-1">Target Level</div>
                  <RadioGroup value={selectedTarget} onValueChange={(value) => setSelectedTarget(value as 'AA_LARGE' | 'AA' | 'AAA')}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AA_LARGE" id="target-aa-large" />
                      <Label htmlFor="target-aa-large">AA Large (≥3:1)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AA" id="target-aa" />
                      <Label htmlFor="target-aa">AA (≥4.5:1)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="AAA" id="target-aaa" />
                      <Label htmlFor="target-aaa">AAA (≥7:1)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Adjustment Options</Label>
                {adjustmentOptions.map((option, index) => {
                  const xRamp = colorRamps.find(r => r.id === selectedCell.xRampId);
                  const yRamp = colorRamps.find(r => r.id === selectedCell.yRampId);
                  const xStopName = xRamp?.stops[selectedCell.xStopIndex]?.name || 'X';
                  const yStopName = yRamp?.stops[selectedCell.yStopIndex]?.name || 'Y';
                  const xBefore = selectedCell.xColor.toLowerCase();
                  const yBefore = selectedCell.yColor.toLowerCase();
                  const xAfter = option.xColor || xBefore;
                  const yAfter = option.yColor || yBefore;
                  const isBoth = option.type === 'both';
                  const isXOnly = option.type === 'x-only';
                  const isYOnly = option.type === 'y-only';
                  return (
                    <div 
                      key={index} 
                      className={`p-3 border rounded-lg ${option.isPossible ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60 cursor-not-allowed bg-gray-50'}`} 
                      onClick={() => option.isPossible && applyAdjustment(option)}
                    >
                      <div className="flex items-center justify-between mb-2 gap-2">
                        {/* X stop preview */}
                        {(isBoth || isXOnly) && (
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col items-center">
                              <div className="text-xs mb-0.5">{xStopName}</div>
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-7 rounded border flex items-center justify-center text-xs font-mono" style={{ backgroundColor: xBefore, color: getReadableTextColor(xBefore) }}>{xBefore}</div>
                                <span className="mx-1">→</span>
                                <div className="w-12 h-7 rounded border flex items-center justify-center text-xs font-mono" style={{ backgroundColor: xAfter, color: getReadableTextColor(xAfter) }}>{xAfter}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Y stop preview */}
                        {(isBoth || isYOnly) && (
                          <div className="flex items-center gap-1">
                            <div className="flex flex-col items-center">
                              <div className="text-xs mb-0.5">{yStopName}</div>
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-7 rounded border flex items-center justify-center text-xs font-mono" style={{ backgroundColor: yBefore, color: getReadableTextColor(yBefore) }}>{yBefore}</div>
                                <span className="mx-1">→</span>
                                <div className="w-12 h-7 rounded border flex items-center justify-center text-xs font-mono" style={{ backgroundColor: yAfter, color: getReadableTextColor(yAfter) }}>{yAfter}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <Badge variant={option.newContrastRatio >= (selectedTarget === 'AA_LARGE' ? 3.0 : selectedTarget === 'AA' ? 4.5 : 7.0) ? 'default' : 'secondary'}>
                          {formatContrastRatio(option.newContrastRatio)}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                      {!option.isPossible && option.reason && (
                        <div className="text-xs text-red-600 mt-1 italic">{option.reason}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lock Warning Dialog */}
      <Dialog open={lockWarningOpen} onOpenChange={setLockWarningOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Unlock Required</DialogTitle>
            <DialogDescription>
              Some color stops are locked and must be unlocked before making adjustments.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 text-sm">
            {lockedStops.length === 1
              ? `You must unlock stop "${lockedStops[0]}" before making this adjustment.`
              : `You must unlock these stops before making this adjustment:`}
            {lockedStops.length > 1 && (
              <ul className="list-disc ml-5 mt-2">
                {lockedStops.map(name => <li key={name}>{name}</li>)}
              </ul>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setLockWarningOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30,41,59,0.95)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 9999,
          fontSize: 16,
          fontWeight: 500,
          pointerEvents: 'none',
          transition: 'opacity 0.3s',
        }}>
          SVG copied to clipboard!
        </div>
      )}
    </div>
  );
}