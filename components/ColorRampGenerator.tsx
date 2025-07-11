import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Lock, Unlock, Repeat } from 'lucide-react';
import { ColorRamp } from './ContrastUtils';
import ReactDOM from 'react-dom';

interface ColorRampGeneratorProps {
  onGenerateRamp: (ramp: ColorRamp) => void;
  existingRamp?: ColorRamp;
}

interface ContrastStop {
  index: number;
  targetRatio: number;
  actualRatio: number;
  color: string;
  isAnchored: boolean;
}

export function ColorRampGenerator({ onGenerateRamp, existingRamp }: ColorRampGeneratorProps) {
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [numStops, setNumStops] = useState(5);
  const [numReferenceColors, setNumReferenceColors] = useState(3);
  const [contrastTargets, setContrastTargets] = useState<number[]>([1.5, 3, 4.5, 7, 21]);
  const [referenceColors, setReferenceColors] = useState<string[]>(['#000000', '#666666', '#999999']);
  const [lockedColors, setLockedColors] = useState<Set<number>>(new Set());
  const [generatedStops, setGeneratedStops] = useState<ContrastStop[]>([]);
  const [rampName, setRampName] = useState('Generated Ramp');
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [pasteColorsDialogOpen, setPasteColorsDialogOpen] = useState(false);
  const [pasteColorsInput, setPasteColorsInput] = useState('');
  const [pasteColorsError, setPasteColorsError] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const MAX_REFERENCE_COLORS = 10;

  // Handle existing ramp data for editing
  useEffect(() => {
    if (existingRamp) {
      setRampName(existingRamp.name);
      setNumStops(existingRamp.stops.length);
      
      // Extract colors from the existing ramp
      const colors = existingRamp.stops.map(stop => stop.hex);
      setReferenceColors(colors);
      setNumReferenceColors(colors.length);
      
      // Calculate contrast targets based on the existing colors
      // This is a simplified approach - you might want to make this more sophisticated
      const targets = existingRamp.stops.map((_, index) => {
        // Generate a reasonable contrast target progression
        return 1.5 + (index * 2);
      });
      setContrastTargets(targets);
      
      // Restore locked colors from existing ramp
      setLockedColors(existingRamp.lockedStops || new Set());
    } else {
      // Clear locked colors for new ramp generation
      setLockedColors(new Set());
    }
  }, [existingRamp]);

  // Expand arrays when numStops changes
  useEffect(() => {
    if (numStops < 3 || numStops > 20) return;
    
    // Expand contrast targets array if needed
    if (contrastTargets.length < numStops) {
      const newTargets = [...contrastTargets];
      while (newTargets.length < numStops) {
        newTargets.push(3 + (newTargets.length * 1.5)); // Default progression
      }
      setContrastTargets(newTargets);
    }
  }, [numStops]);

  // Update reference colors when numReferenceColors changes
  useEffect(() => {
    if (numReferenceColors < 1 || numReferenceColors > MAX_REFERENCE_COLORS) return;
    
    const newColors = [...referenceColors];
    while (newColors.length < numReferenceColors) {
      // Generate additional reference colors
      const lastColor = newColors[newColors.length - 1];
      const newColor = generateIntermediateColor(lastColor, '#ffffff');
      newColors.push(newColor);
    }
    setReferenceColors(newColors.slice(0, numReferenceColors));
  }, [numReferenceColors]);

  // Generate color ramp based on current settings
  useEffect(() => {
    if (numStops < 3 || numStops > 20) return;

    const stops: ContrastStop[] = [];
    const sortedTargets = [...contrastTargets].sort((a: number, b: number) => a - b);

    // Calculate contrast ratios for reference colors
    const referenceColorContrasts = referenceColors.map((color: string, index: number) => ({
      color,
      contrastRatio: calculateContrastRatio(color, backgroundColor),
      index,
      isLocked: lockedColors.has(index)
    }));

    // 1. Place locked colors, sorted by contrast ratio, as anchors
    const locked = referenceColorContrasts.filter(c => c.isLocked).sort((a, b) => a.contrastRatio - b.contrastRatio);
    const unlocked = referenceColorContrasts.filter(c => !c.isLocked).sort((a, b) => a.contrastRatio - b.contrastRatio);

    // 2. Build anchor points: locked colors, plus any unlocked colors that fall between locked colors
    let anchors: Array<{ color: string, contrastRatio: number, slot?: number }> = [];
    if (locked.length === 0) {
      // No locked colors: use all reference colors as anchors
      anchors = [...unlocked];
    } else {
      // Always include locked colors as anchors
      anchors = [...locked];
      // For each unlocked color, if it falls between two locked colors, add as anchor
      unlocked.forEach(u => {
        for (let i = 0; i < locked.length - 1; i++) {
          if (u.contrastRatio > locked[i].contrastRatio && u.contrastRatio < locked[i + 1].contrastRatio) {
            anchors.push(u);
            break;
          }
        }
      });
      // Sort anchors by contrast ratio
      anchors.sort((a, b) => a.contrastRatio - b.contrastRatio);
    }

    // 3. Assign anchor points to closest slots, in order, and record their slot index
    const usedSlots = new Set<number>();
    anchors.forEach(anchor => {
      let bestSlot = -1;
      let bestDiff = Infinity;
      for (let i = 0; i < sortedTargets.length; i++) {
        if (usedSlots.has(i)) continue;
        const diff = Math.abs(sortedTargets[i] - anchor.contrastRatio);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestSlot = i;
        }
      }
      if (bestSlot !== -1) {
        anchor.slot = bestSlot;
        usedSlots.add(bestSlot);
      }
    });
    // Sort anchors by slot
    anchors = anchors.filter(a => a.slot !== undefined).sort((a, b) => (a.slot! - b.slot!));

    // 4. Fill ramp by interpolating between anchors
    for (let i = 0; i < numStops; i++) {
      const targetRatio = sortedTargets[i];
      // If this slot is an anchor, use its color
      const anchor = anchors.find(a => a.slot === i);
      if (anchor) {
        stops.push({
          index: i,
          targetRatio,
          actualRatio: calculateContrastRatio(anchor.color, backgroundColor),
          color: anchor.color,
          isAnchored: locked.some(l => l.color === anchor.color),
        });
      } else {
        // Find the two anchors this slot falls between
        let left = null, right = null;
        for (let j = 0; j < anchors.length - 1; j++) {
          if (i > anchors[j].slot! && i < anchors[j + 1].slot!) {
            left = anchors[j];
            right = anchors[j + 1];
            break;
          }
        }
        if (!left && anchors.length > 0 && i < anchors[0].slot!) {
          // Before first anchor: extrapolate from first anchor
          right = anchors[0];
        } else if (!right && anchors.length > 0 && i > anchors[anchors.length - 1].slot!) {
          // After last anchor: extrapolate from last anchor
          left = anchors[anchors.length - 1];
        }
        let interpColor = '#cccccc';
        if (left && right) {
          // Interpolate between left and right anchors
          const t = (i - left.slot!) / (right.slot! - left.slot!);
          interpColor = interpolateLAB(left.color, right.color, t);
        } else if (left) {
          // Extrapolate from left
          interpColor = createDarkerVariation(left.color, i - left.slot!);
        } else if (right) {
          // Extrapolate from right
          interpColor = createLighterVariation(right.color, right.slot! - i);
        }
        stops.push({
          index: i,
          targetRatio,
          actualRatio: calculateContrastRatio(interpColor, backgroundColor),
          color: interpColor,
          isAnchored: false,
        });
      }
    }

    setGeneratedStops(stops);
  }, [backgroundColor, numStops, contrastTargets, referenceColors, lockedColors]);

  const handleContrastTargetChange = (index: number, value: number) => {
    const newTargets = [...contrastTargets];
    newTargets[index] = Math.max(1, value);
    setContrastTargets(newTargets);
  };

  const handleReferenceColorChange = (index: number, color: string) => {
    const newColors = [...referenceColors];
    newColors[index] = color;
    setReferenceColors(newColors);
  };

  const toggleLockedColor = (index: number) => {
    const newLockedColors = new Set(lockedColors);
    if (newLockedColors.has(index)) {
      newLockedColors.delete(index);
    } else {
      newLockedColors.add(index);
    }
    setLockedColors(newLockedColors);
  };

  const parseContrastRatios = (input: string): number[] => {
    // Remove extra whitespace and split by multiple possible delimiters
    const cleaned = input.trim().replace(/\s+/g, ' ');
    const values = cleaned.split(/[,\s\n]+/).filter(val => val.trim() !== '');
    
    const ratios: number[] = [];
    for (const value of values) {
      const num = parseFloat(value.trim());
      if (isNaN(num) || num < 1 || num > 21) {
        throw new Error(`Invalid contrast ratio: ${value}. Must be between 1 and 21.`);
      }
      ratios.push(num);
    }
    
    if (ratios.length === 0) {
      throw new Error('No valid contrast ratios found.');
    }
    
    return ratios;
  };

  const handlePasteContrastRatios = () => {
    try {
      setPasteError('');
      const ratios = parseContrastRatios(pasteInput);
      
      // Update number of stops to match the pasted ratios
      setNumStops(ratios.length);
      
      // Replace all contrast targets with the pasted ratios
      setContrastTargets(ratios);
      
      // Close dialog and clear input
      setPasteDialogOpen(false);
      setPasteInput('');
    } catch (error) {
      setPasteError(error instanceof Error ? error.message : 'Invalid input');
    }
  };

  const parseReferenceColors = (input: string): string[] => {
    // Remove extra whitespace and split by multiple possible delimiters
    const cleaned = input.trim().replace(/\s+/g, ' ');
    const values = cleaned.split(/[,\s\n]+/).filter(val => val.trim() !== '');
    
    const colors: string[] = [];
    for (const value of values) {
      const color = value.trim();
      // Validate hex color format
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new Error(`Invalid color format: ${color}. Must be a valid hex color (e.g., #000000).`);
      }
      colors.push(color);
    }
    
    if (colors.length === 0) {
      throw new Error('No valid colors found.');
    }
    
    return colors;
  };

  const handlePasteReferenceColors = () => {
    try {
      setPasteColorsError('');
      let colors = parseReferenceColors(pasteColorsInput);
      let warning = '';
      if (colors.length > MAX_REFERENCE_COLORS) {
        colors = colors.slice(0, MAX_REFERENCE_COLORS);
        warning = `Only the first ${MAX_REFERENCE_COLORS} colors will be used.`;
      }
      // Update number of reference colors to match the pasted colors
      setNumReferenceColors(colors.length);
      // Replace all reference colors with the pasted colors
      setReferenceColors(colors);
      // Close dialog and clear input
      setPasteColorsDialogOpen(false);
      setPasteColorsInput('');
      if (warning) {
        setTimeout(() => alert(warning), 100); // Show warning after dialog closes
      }
    } catch (error) {
      setPasteColorsError(error instanceof Error ? error.message : 'Invalid color format');
    }
  };

  const handleGenerateRamp = () => {
    const newRamp: ColorRamp = {
      id: existingRamp?.id || `generated-${Date.now()}`,
      name: rampName,
      stops: generatedStops.map(stop => ({
        name: `Stop ${stop.index + 1}`,
        hex: stop.color
      })),
      lockedStops: lockedColors // Preserve locked states
    };
    onGenerateRamp(newRamp);
    showToast();
  };

  const getContrastLevel = (ratio: number) => {
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    if (ratio >= 3) return 'AA Large';
    return 'Fail';
  };

  const getContrastColor = (ratio: number) => {
    if (ratio >= 4.5) return 'bg-[#d5efb5]';
    if (ratio >= 3) return 'bg-[#feecbc]';
    return 'bg-[#f6f5f6]';
  };

  const showToast = () => {
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 3000);
  };

  // Helper to get the (possibly flipped) order
  const getOrdered = (arr: any[]) => flipped ? [...arr].slice(0, numStops).reverse() : arr.slice(0, numStops);
  const getOrderedRefColors = (arr: any[]) => flipped ? [...arr].slice(0, numReferenceColors).reverse() : arr.slice(0, numReferenceColors);

  return (
    <>
      <div className="space-y-6">
        {/* Configuration Section */}
        <Card>
          <CardHeader>
            <CardTitle>Ramp Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Background Color */}
            <div className="space-y-2">
              <Label htmlFor="background-color">Background Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="background-color"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Number of Stops */}
            <div className="space-y-2">
              <Label htmlFor="num-stops">Number of Stops</Label>
              <Select value={numStops.toString()} onValueChange={(value) => setNumStops(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select number of stops" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 18 }, (_, i) => i + 3).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} stops
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contrast Targets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contrast Ratio Targets</Label>
                <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm">
                      Paste List
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Paste Contrast Ratios</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="paste-input">Paste your contrast ratios</Label>
                        <p className="text-xs text-gray-500 mb-1">Maximum 20 contrast ratio targets. If more are pasted, only the first 20 will be used.</p>
                        <Textarea
                          id="paste-input"
                          placeholder="1.5, 3, 4.5, 7, 21&#10;or&#10;1.5 3 4.5 7 21&#10;or&#10;1.5&#10;3&#10;4.5&#10;7&#10;21"
                          value={pasteInput}
                          onChange={(e) => setPasteInput(e.target.value)}
                          rows={6}
                        />
                        {pasteError && (
                          <div className="text-sm text-red-600">
                            {pasteError}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPasteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handlePasteContrastRatios}>
                          Apply
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {getOrdered(contrastTargets).map((target, index) => (
                  <div key={index} className="flex-shrink-0 flex-grow min-w-0">
                    <Label className="text-xs block mb-1">Stop {flipped ? contrastTargets.length - index : index + 1}</Label>
                    <Input
                      type="number"
                      value={target}
                      onChange={(e) => {
                        const idx = flipped ? contrastTargets.length - 1 - index : index;
                        handleContrastTargetChange(idx, parseFloat(e.target.value));
                      }}
                      min={1}
                      max={21}
                      step={0.1}
                      className="text-sm w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Number of Reference Colors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="num-reference-colors">Number of Reference Colors</Label>
                <Dialog open={pasteColorsDialogOpen} onOpenChange={setPasteColorsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm">
                      Paste Colors
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Paste Reference Colors</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="paste-colors-input">Paste your reference colors</Label>
                        <p className="text-xs text-gray-500 mb-1">Maximum {MAX_REFERENCE_COLORS} colors. If more are pasted, only the first {MAX_REFERENCE_COLORS} will be used.</p>
                        <Textarea
                          id="paste-colors-input"
                          placeholder="#000000, #666666, #999999&#10;or&#10;#000000 #666666 #999999&#10;or&#10;#000000&#10;#666666&#10;#999999"
                          value={pasteColorsInput}
                          onChange={(e) => setPasteColorsInput(e.target.value)}
                          rows={6}
                        />
                        {pasteColorsError && (
                          <div className="text-sm text-red-600">
                            {pasteColorsError}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPasteColorsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handlePasteReferenceColors}>
                          Apply
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Select value={numReferenceColors.toString()} onValueChange={(value) => setNumReferenceColors(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select number of reference colors" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: MAX_REFERENCE_COLORS }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} color{num !== 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Maximum {MAX_REFERENCE_COLORS} reference colors.</p>
            </div>

            {/* Reference Colors */}
            <div className="space-y-2">
              <Label>Reference Colors</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {getOrderedRefColors(referenceColors).map((color: string, index: number) => {
                  const actualIndex = flipped ? referenceColors.length - 1 - index : index;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Color {flipped ? referenceColors.length - index : index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLockedColor(actualIndex)}
                          className="h-6 w-6 p-0"
                        >
                          {lockedColors.has(actualIndex) ? (
                            <Lock className="h-3 w-3 text-blue-600" />
                          ) : (
                            <Unlock className="h-3 w-3 text-gray-400" />
                          )}
                        </Button>
                      </div>
                      <Input
                        value={color}
                        onChange={(e) => handleReferenceColorChange(actualIndex, e.target.value)}
                        placeholder="#000000"
                        className="text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Ramp Preview</CardTitle>
            <Button
              variant={flipped ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFlipped(f => !f)}
              className={flipped ? 'bg-blue-600 text-white' : ''}
              aria-pressed={flipped}
              aria-label="Flip order"
            >
              <Repeat className="w-4 h-4" />
              {flipped && <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">Flipped</span>}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Color Ramp Display */}
              <div className="flex items-center gap-1">
                {getOrdered(generatedStops).map((stop, index) => (
                  <div
                    key={index}
                    className="relative flex-1 h-16 rounded border-2 border-gray-300"
                    style={{ backgroundColor: stop.color }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white bg-opacity-90 px-1 py-0.5 rounded text-xs font-mono">
                        {flipped ? generatedStops.length - index : index + 1}
                      </div>
                    </div>
                    {stop.isAnchored && (
                      <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 rounded-bl">
                        A
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Contrast Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {getOrdered(generatedStops).map((stop, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border ${getContrastColor(stop.actualRatio)}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">Stop {flipped ? generatedStops.length - index : index + 1}</span>
                      <Badge variant="secondary">{getContrastLevel(stop.actualRatio)}</Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Target: {stop.targetRatio}:1</div>
                      <div>Actual: {stop.actualRatio.toFixed(2)}:1</div>
                      <div className="font-mono text-xs">{stop.color}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ramp-name">Ramp Name</Label>
                <Input
                  id="ramp-name"
                  value={rampName}
                  onChange={(e) => setRampName(e.target.value)}
                  placeholder="Enter ramp name"
                />
              </div>
              <Button 
                onClick={handleGenerateRamp}
                className="w-full"
                disabled={generatedStops.length === 0}
              >
                Add to Configure Colors Tab
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {toastOpen && ReactDOM.createPortal(
        <div className="fixed top-6 right-6 z-[9999] bg-black text-white px-6 py-3 rounded shadow-lg text-base font-medium animate-fade-in-out" style={{ pointerEvents: 'none', minWidth: 220, textAlign: 'center' }}>
          Ramp generated and added!
        </div>,
        document.body
      )}
    </>
  );
}

// Utility functions for color manipulation and contrast calculation
function calculateContrastRatio(color1: string, color2: string): number {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(color: string): number {
  const rgb = hexToRgb(color);
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(c => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function interpolateBetweenReferenceColors(
  targetSlot: number, 
  referenceAssignments: Array<{color: string, slot: number, targetRatio: number}>, 
  backgroundColor: string
): string {
  // If no reference colors, create a default gradient
  if (referenceAssignments.length === 0) {
    return '#cccccc'; // Fallback color
  }
  
  // If only one reference color, create a gradient based on that color
  if (referenceAssignments.length === 1) {
    const refColor = referenceAssignments[0].color;
    const refSlot = referenceAssignments[0].slot;
    const slotDiff = targetSlot - refSlot;
    
    // Create lighter or darker variations based on position relative to reference
    if (slotDiff < 0) {
      // Create lighter variations
      return createLighterVariation(refColor, Math.abs(slotDiff));
    } else if (slotDiff > 0) {
      // Create darker variations
      return createDarkerVariation(refColor, slotDiff);
    } else {
      return refColor;
    }
  }
  
  // For multiple reference colors, find the appropriate interpolation/extrapolation
  let leftColor = null;
  let rightColor = null;
  let leftSlot = -1;
  let rightSlot = -1;
  
  // Find the closest reference colors on either side
  for (let i = 0; i < referenceAssignments.length; i++) {
    if (referenceAssignments[i].slot <= targetSlot) {
      leftColor = referenceAssignments[i].color;
      leftSlot = referenceAssignments[i].slot;
    }
    if (referenceAssignments[i].slot >= targetSlot) {
      rightColor = referenceAssignments[i].color;
      rightSlot = referenceAssignments[i].slot;
      break;
    }
  }
  
  // If target slot is exactly on a reference color, use that color
  if (leftSlot === targetSlot) {
    return leftColor!;
  }
  if (rightSlot === targetSlot) {
    return rightColor!;
  }
  
  // If we have both left and right colors, interpolate between them
  if (leftColor && rightColor) {
    const t = (targetSlot - leftSlot) / (rightSlot - leftSlot);
    return interpolateLAB(leftColor, rightColor, t);
  }
  
  // If we only have one color (extrapolation case)
  if (leftColor && !rightColor) {
    // Extrapolate darker
    const slotDiff = targetSlot - leftSlot;
    return createDarkerVariation(leftColor, slotDiff);
  }
  
  if (rightColor && !leftColor) {
    // Extrapolate lighter
    const slotDiff = rightSlot - targetSlot;
    return createLighterVariation(rightColor, slotDiff);
  }
  
  return '#cccccc'; // Fallback
}

function createLighterVariation(color: string, steps: number): string {
  const lab = rgbToLab(hexToRgb(color));
  const maxLightness = 95; // Maximum lightness in LAB
  const lightnessStep = Math.min(15, (maxLightness - lab.l) / Math.max(1, steps));
  
  const newLab = {
    l: Math.min(maxLightness, lab.l + (lightnessStep * steps)),
    a: lab.a * 0.8, // Reduce saturation slightly
    b: lab.b * 0.8
  };
  
  return labToHex(newLab);
}

function createDarkerVariation(color: string, steps: number): string {
  const lab = rgbToLab(hexToRgb(color));
  const minLightness = 5; // Minimum lightness in LAB
  const lightnessStep = Math.min(15, (lab.l - minLightness) / Math.max(1, steps));
  
  const newLab = {
    l: Math.max(minLightness, lab.l - (lightnessStep * steps)),
    a: lab.a * 0.8, // Reduce saturation slightly
    b: lab.b * 0.8
  };
  
  return labToHex(newLab);
}

function labToHex(lab: {l: number, a: number, b: number}): string {
  const rgb = labToRgb(lab);
  return rgbToHex(
    Math.round(rgb.r), 
    Math.round(rgb.g), 
    Math.round(rgb.b)
  );
}

function interpolateLAB(color1: string, color2: string, t: number): string {
  // Convert hex to LAB
  const lab1 = rgbToLab(hexToRgb(color1));
  const lab2 = rgbToLab(hexToRgb(color2));
  
  // Interpolate in LAB space
  const labResult = {
    l: lab1.l + (lab2.l - lab1.l) * t,
    a: lab1.a + (lab2.a - lab1.a) * t,
    b: lab1.b + (lab2.b - lab1.b) * t
  };
  
  // Convert back to RGB and then to hex
  const rgbResult = labToRgb(labResult);
  return rgbToHex(
    Math.round(rgbResult.r), 
    Math.round(rgbResult.g), 
    Math.round(rgbResult.b)
  );
}

function rgbToLab(rgb: {r: number, g: number, b: number}): {l: number, a: number, b: number} {
  // Convert RGB to XYZ
  const xyz = rgbToXyz(rgb);
  
  // Convert XYZ to LAB
  const xn = 0.95047;
  const yn = 1.00000;
  const zn = 1.08883;
  
  const x = xyz.x / xn;
  const y = xyz.y / yn;
  const z = xyz.z / zn;
  
  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);
  
  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

function labToRgb(lab: {l: number, a: number, b: number}): {r: number, g: number, b: number} {
  // Convert LAB to XYZ
  const xn = 0.95047;
  const yn = 1.00000;
  const zn = 1.08883;
  
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;
  
  const x = xn * (fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16/116) / 7.787);
  const y = yn * (fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16/116) / 7.787);
  const z = zn * (fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16/116) / 7.787);
  
  // Convert XYZ to RGB
  return xyzToRgb({x, y, z});
}

function rgbToXyz(rgb: {r: number, g: number, b: number}): {x: number, y: number, z: number} {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const r1 = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  const g1 = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  const b1 = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  
  return {
    x: r1 * 0.4124 + g1 * 0.3576 + b1 * 0.1805,
    y: r1 * 0.2126 + g1 * 0.7152 + b1 * 0.0722,
    z: r1 * 0.0193 + g1 * 0.1192 + b1 * 0.9505
  };
}

function xyzToRgb(xyz: {x: number, y: number, z: number}): {r: number, g: number, b: number} {
  const r1 = xyz.x * 3.2406 + xyz.y * -1.5372 + xyz.z * -0.4986;
  const g1 = xyz.x * -0.9689 + xyz.y * 1.8758 + xyz.z * 0.0415;
  const b1 = xyz.x * 0.0557 + xyz.y * -0.2040 + xyz.z * 1.0570;
  
  const r = r1 > 0.0031308 ? 1.055 * Math.pow(r1, 1/2.4) - 0.055 : 12.92 * r1;
  const g = g1 > 0.0031308 ? 1.055 * Math.pow(g1, 1/2.4) - 0.055 : 12.92 * g1;
  const b = b1 > 0.0031308 ? 1.055 * Math.pow(b1, 1/2.4) - 0.055 : 12.92 * b1;
  
  return {
    r: Math.max(0, Math.min(255, r * 255)),
    g: Math.max(0, Math.min(255, g * 255)),
    b: Math.max(0, Math.min(255, b * 255))
  };
}

function generateIntermediateColor(color1: string, color2: string): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const intermediateRgb = {
    r: Math.round((rgb1.r + rgb2.r) / 2),
    g: Math.round((rgb1.g + rgb2.g) / 2),
    b: Math.round((rgb1.b + rgb2.b) / 2)
  };
  
  return rgbToHex(intermediateRgb.r, intermediateRgb.g, intermediateRgb.b);
} 

// Utility to adjust a color to better match a target contrast ratio
function adjustColorToContrast(color: string, backgroundColor: string, targetRatio: number): string {
  // Use LAB color space to adjust lightness only
  let rgb = hexToRgb(color);
  let lab = rgbToLab(rgb);
  let bgL = getLuminance(backgroundColor);
  let bestHex = color;
  let bestDiff = Math.abs(calculateContrastRatio(color, backgroundColor) - targetRatio);
  // Try adjusting lightness up and down
  for (let delta = -30; delta <= 30; delta += 2) {
    let newL = Math.max(0, Math.min(100, lab.l + delta));
    let newLab = { l: newL, a: lab.a, b: lab.b };
    let newRgb = labToRgb(newLab);
    let newHex = rgbToHex(Math.round(newRgb.r), Math.round(newRgb.g), Math.round(newRgb.b));
    let newContrast = calculateContrastRatio(newHex, backgroundColor);
    let diff = Math.abs(newContrast - targetRatio);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestHex = newHex;
    }
  }
  return bestHex;
} 