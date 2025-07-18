import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Copy, Lock, Trash2, Unlock } from 'lucide-react';
import { ColorRamp } from './ContrastUtils';
import { isValidHexColor, normalizeHex, sanitizeHexInput } from './hexUtils';

interface ColorRampGeneratorProps {
  onGenerateRamp: (ramp: ColorRamp) => void;
  existingRamp?: ColorRamp;
}

interface RampConfig {
  referenceColors: string[];
  targetRatios: number[];
  backgroundColor: string;
  numStops: number;
  numReferenceColors: number;
}

interface GeneratedColor {
  hex: string;
  targetRatio: number;
  actualRatio: number;
  method: 'interpolation' | 'adjustment' | 'generation';
  confidence: number;
  explanation: string;
  isLocked?: boolean;
}

interface ColorVariation {
  hex: string;
  ratio: number;
  lightness: number;
  hue: number;
  saturation: number;
}

interface RampResult {
  colors: GeneratedColor[];
  overallConfidence: number;
  summary: string;
  debugInfo?: {
    variations: ColorVariation[];
    algorithmSteps: string[];
    warnings: string[];
  };
}

export function ColorRampGenerator({ onGenerateRamp, existingRamp }: ColorRampGeneratorProps) {
  // Single source of truth for configuration
  const [config, setConfig] = useState<RampConfig>({
    referenceColors: existingRamp ? existingRamp.stops.map(s => s.hex) : ['#000000'],
    targetRatios: existingRamp ? existingRamp.stops.map((stop) => {
      // Calculate actual contrast ratio for each stop against background
      const actualRatio = calculateContrastRatio(stop.hex, '#ffffff');
      return Math.round(actualRatio * 10) / 10; // Round to 1 decimal place
    }) : [1.1, 1.3, 1.6, 2.3, 3.3, 5, 7.7, 11.4, 14.2, 17.1],
    backgroundColor: '#ffffff',
    numStops: existingRamp ? existingRamp.stops.length : 10,
    numReferenceColors: existingRamp ? existingRamp.stops.length : 1
  });

  // Track which reference colors are locked (for the generator)
  const [lockedColors, setLockedColors] = useState<Set<number>>(new Set());
  
  // Track which positions in the generated ramp are locked (for other tabs)
  const [lockedRampPositions, setLockedRampPositions] = useState<Set<number>>(new Set(existingRamp?.lockedStops || []));
  const [rampName, setRampName] = useState(existingRamp?.name || 'Generated Ramp');
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [showPasteColorsDialog, setShowPasteColorsDialog] = useState(false);
  const [pasteColorsInput, setPasteColorsInput] = useState('');
  const [pasteColorsError, setPasteColorsError] = useState('');
  const [backgroundColorInput, setBackgroundColorInput] = useState(config.backgroundColor);
  const [referenceColorInputs, setReferenceColorInputs] = useState<string[]>(config.referenceColors);

  // Undo functionality for generator internal state (unused for now)
  // const [undoHistory, setUndoHistory] = useState<{
  //   config: RampConfig;
  //   lockedColors: Set<number>;
  //   rampName: string;
  // }[]>([]);
  // const [canUndoGenerator, setCanUndoGenerator] = useState(false);

  // Add current state to undo history (unused for now)
  // const addToUndoHistory = () => {
  //   setUndoHistory(prev => {
  //     const newHistory = [...prev, {
  //       config: { ...config },
  //       lockedColors: new Set(lockedColors),
  //       rampName
  //     }];
  //     // Keep only the last 10 states to prevent memory issues
  //     if (newHistory.length > 10) {
  //       return newHistory.slice(-10);
  //     }
  //     return newHistory;
  //   });
  //   // setCanUndoGenerator(true);
  // };

  // Undo function for generator (unused for now)
  // const handleUndo = () => {
  //   if (undoHistory.length > 0) {
  //     const previousState = undoHistory[undoHistory.length - 1];
  //     setConfig(previousState.config);
  //     setLockedColors(previousState.lockedColors);
  //     setRampName(previousState.rampName);
  //     setUndoHistory(prev => prev.slice(0, -1));
  //     // setCanUndoGenerator(undoHistory.length > 1);
  //   }
  // };

  // Generate ramp using memoization for performance
  const rampResult = useMemo(() => {
    const result = generateRamp(config, lockedColors);
    
    // Update locked ramp positions based on the generated colors
    const newLockedPositions = new Set<number>();
    result.colors.forEach((color, index) => {
      if (color.isLocked) {
        newLockedPositions.add(index);
      }
    });
    setLockedRampPositions(newLockedPositions);
    
    return result;
  }, [config, lockedColors]);

  const handleConfigChange = (updates: Partial<RampConfig>) => {
    // addToUndoHistory();
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleReferenceColorChange = (index: number, color: string) => {
    const normalizedColor = normalizeHex(color);
    const newReferenceColors = [...config.referenceColors];
    newReferenceColors[index] = normalizedColor;
    handleConfigChange({ referenceColors: newReferenceColors });
  };

  const removeReferenceColor = (index: number) => {
    const newColors = config.referenceColors.filter((_, i) => i !== index);
    const newLockedColors = new Set(lockedColors);
    newLockedColors.delete(index);
    
    // Adjust locked color indices for colors after the removed one
    const adjustedLockedColors = new Set<number>();
    for (const lockedIndex of newLockedColors) {
      if (lockedIndex > index) {
        adjustedLockedColors.add(lockedIndex - 1);
      } else {
        adjustedLockedColors.add(lockedIndex);
      }
    }
    
    handleConfigChange({ 
      referenceColors: newColors,
      numReferenceColors: Math.max(1, newColors.length)
    });
    setLockedColors(adjustedLockedColors);
  };

  const handleTargetRatioChange = (index: number, ratio: number) => {
    const newRatios = [...config.targetRatios];
    newRatios[index] = Math.max(1, Math.min(21, ratio));
    handleConfigChange({ targetRatios: newRatios });
  };

  const toggleLockedColor = (index: number) => {
    // addToUndoHistory();
    const newLocked = new Set(lockedColors);
    if (newLocked.has(index)) {
      newLocked.delete(index);
    } else {
      newLocked.add(index);
    }
    setLockedColors(newLocked);
  };

  const handlePasteRatios = () => {
    try {
      const ratios = parseContrastRatios(pasteInput);
      handleConfigChange({ 
        targetRatios: ratios,
        numStops: ratios.length
      });
      setShowPasteDialog(false);
      setPasteInput('');
      setPasteError('');
    } catch (error) {
      setPasteError(error instanceof Error ? error.message : 'Invalid input');
    }
  };

  const handlePasteColors = () => {
    try {
      const colors = parseReferenceColors(pasteColorsInput);
      handleConfigChange({ 
        referenceColors: colors,
        numReferenceColors: colors.length
      });
      // Update the reference color inputs to match the pasted colors
      setReferenceColorInputs(colors);
      setShowPasteColorsDialog(false);
      setPasteColorsInput('');
      setPasteColorsError('');
    } catch (error) {
      setPasteColorsError(error instanceof Error ? error.message : 'Invalid input');
    }
  };

  const parseContrastRatios = (input: string): number[] => {
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

  const parseReferenceColors = (input: string): string[] => {
    const cleaned = input.trim().replace(/\s+/g, ' ');
    const values = cleaned.split(/[,\s\n]+/).filter(val => val.trim() !== '');
    
    const colors: string[] = [];
    for (const value of values) {
      const color = value.trim();
      if (!isValidHexColor(color)) {
        throw new Error(`Invalid hex color: ${color}. Must be in format #RRGGBB (e.g., #FFCC00).`);
      }
      colors.push(color);
    }
    
    if (colors.length === 0) {
      throw new Error('No valid hex colors found.');
    }
    
    return colors;
  };

  const generateTargetRatios = (numStops: number): number[] => {
    // Generate a range of contrast ratios from 1.1 to 17.1
    // For smaller numbers, use fewer ratios; for larger numbers, use more
    const baseRatios = [1.1, 1.3, 1.6, 2.3, 3.3, 5.0, 7.7, 11.4, 14.2, 17.1];
    
    if (numStops <= baseRatios.length) {
      return baseRatios.slice(0, numStops);
    }
    
    // For more stops, interpolate between the base ratios
    const ratios: number[] = [];
    for (let i = 0; i < numStops; i++) {
      const t = i / (numStops - 1);
      const index = t * (baseRatios.length - 1);
      const lowIndex = Math.floor(index);
      const highIndex = Math.min(lowIndex + 1, baseRatios.length - 1);
      const lowRatio = baseRatios[lowIndex];
      const highRatio = baseRatios[highIndex];
      const interpolationFactor = index - lowIndex;
      
      const ratio = lowRatio + (highRatio - lowRatio) * interpolationFactor;
      ratios.push(Math.round(ratio * 10) / 10); // Round to 1 decimal place
    }
    
    return ratios;
  };

  const generateStopNames = (count: number): string[] => {
    return Array.from({ length: count }, (_, i) => `${(i + 1) * 100}`);
  };

  const handleGenerateRamp = () => {
    const stopNames = generateStopNames(rampResult.colors.length);
    const newRamp: ColorRamp = {
      id: existingRamp?.id || `generated-${Date.now()}`,
      name: rampName,
      stops: rampResult.colors.map((color, index) => ({
        name: stopNames[index] || `${(index + 1) * 100}`,
        hex: color.hex
      })),
      lockedStops: Array.from(lockedRampPositions || new Set())
    };
    onGenerateRamp(newRamp);
  };

  const copyHexValues = async () => {
    try {
      const hexValues = rampResult.colors.map(color => color.hex).join('\n');
      await navigator.clipboard.writeText(hexValues);
    } catch (error) {
      console.error('Failed to copy hex values:', error);
    }
  };

  const copyActualRatios = async () => {
    try {
      const ratioValues = rampResult.colors.map(color => color.actualRatio.toFixed(2)).join('\n');
      await navigator.clipboard.writeText(ratioValues);
    } catch (error) {
      console.error('Failed to copy actual ratios:', error);
    }
  };





  const validateInputs = () => {
    const issues: string[] = [];
    
    // Check reference colors
    config.referenceColors.forEach((color, index) => {
      if (!isValidHexColor(color)) {
        issues.push(`Reference color ${index + 1} is invalid: ${color}`);
      }
    });
    
    // Check target ratios
    config.targetRatios.forEach((ratio, index) => {
      if (ratio < 1 || ratio > 21) {
        issues.push(`Target ratio ${index + 1} is out of range: ${ratio}`);
      }
    });
    
    // Check background color
    if (!isValidHexColor(config.backgroundColor)) {
      issues.push(`Background color is invalid: ${config.backgroundColor}`);
    }
    
    return issues;
  };

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <Card className="w-full p-0">
        <CardHeader>
          <CardTitle>Ramp Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ramp Name */}
          <div className="space-y-2">
            <Label htmlFor="ramp-name">Ramp Name</Label>
            <Input
              id="ramp-name"
              value={rampName}
              onChange={(e) => setRampName(e.target.value)}
              placeholder="Enter ramp name"
            />
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label htmlFor="background-color">Background Color</Label>
            <div className="flex items-end gap-3">
              <div
                className="w-8 h-8 rounded border border-border relative cursor-pointer"
                style={{ backgroundColor: config.backgroundColor }}
                aria-label={`Background color swatch: ${config.backgroundColor}`}
                role="img"
                onClick={() => {
                  const colorInput = document.getElementById('background-color-picker') as HTMLInputElement;
                  if (colorInput) colorInput.click();
                }}
              />
              <input
                id="background-color-picker"
                type="color"
                value={config.backgroundColor}
                onChange={(e) => {
                  const color = e.target.value;
                  setBackgroundColorInput(color);
                  handleConfigChange({ backgroundColor: color });
                }}
                className="sr-only"
              />
              
              <div className="flex items-center gap-2 flex-1">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="background-color-input" className="text-xs">Hex</Label>
                  <Input
                    id="background-color-input"
                    value={backgroundColorInput}
                    onChange={(e) => setBackgroundColorInput(sanitizeHexInput(e.target.value))}
                    onBlur={(e) => {
                      const normalizedColor = normalizeHex(e.target.value);
                      setBackgroundColorInput(normalizedColor);
                      handleConfigChange({ backgroundColor: normalizedColor });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    placeholder="#ffffff"
                    className="h-8 w-24"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Number of Stops */}
          <div className="space-y-2">
            <Label htmlFor="num-stops">Number of Stops</Label>
            <Select 
              value={config.numStops.toString()} 
              onValueChange={(value) => {
                const newNumStops = parseInt(value);
                const newTargetRatios = generateTargetRatios(newNumStops);
                handleConfigChange({ 
                  numStops: newNumStops,
                  targetRatios: newTargetRatios
                });
              }}
            >
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

          {/* Number of Reference Colors */}
          <div className="space-y-2">
            <Label htmlFor="num-reference-colors">Number of Reference Colors</Label>
            <Select 
              value={config.numReferenceColors.toString()} 
              onValueChange={(value) => handleConfigChange({ numReferenceColors: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select number of reference colors" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} colors
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Colors */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Reference Colors</Label>
              <Dialog open={showPasteColorsDialog} onOpenChange={setShowPasteColorsDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Paste Colors</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Paste Reference Colors</DialogTitle>
                    <DialogDescription>
                      Paste comma-separated hex colors (e.g., #FFCC00, #FF6B35, #4ECDC4, #45B7D1, #96CEB4)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="#FFCC00, #FF6B35, #4ECDC4, #45B7D1, #96CEB4"
                      value={pasteColorsInput}
                      onChange={(e) => setPasteColorsInput(e.target.value)}
                    />
                    {pasteColorsError && (
                      <Alert variant="destructive">
                        <AlertDescription>{pasteColorsError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handlePasteColors}>Apply</Button>
                      <Button variant="outline" onClick={() => setShowPasteColorsDialog(false)}>Cancel</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-3">
              {Array.from({ length: config.numReferenceColors }, (_, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div
                    className="w-8 h-8 rounded border border-border relative cursor-pointer"
                    style={{ backgroundColor: config.referenceColors[i] || '#000000' }}
                    aria-label={`Color swatch for reference color ${i + 1}: ${config.referenceColors[i] || '#000000'}`}
                    role="img"
                    onClick={() => {
                      const colorInput = document.getElementById(`ref-color-${i}`) as HTMLInputElement;
                      if (colorInput) colorInput.click();
                    }}
                  >
                    {lockedColors.has(i) && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5">
                        <Lock className="w-3 h-3" />
                      </div>
                    )}
                    <input
                      id={`ref-color-${i}`}
                      type="color"
                      value={config.referenceColors[i] || '#000000'}
                      onChange={(e) => {
                        const color = e.target.value;
                        const newInputs = [...referenceColorInputs];
                        newInputs[i] = color;
                        setReferenceColorInputs(newInputs);
                        handleReferenceColorChange(i, color);
                      }}
                      className="sr-only"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`ref-hex-${i}`} className="text-xs">Hex</Label>
                      <Input
                        id={`ref-hex-${i}`}
                        value={referenceColorInputs[i] || '#000000'}
                        onChange={(e) => {
                          const newInputs = [...referenceColorInputs];
                          newInputs[i] = sanitizeHexInput(e.target.value);
                          setReferenceColorInputs(newInputs);
                        }}
                        onBlur={(e) => {
                          const normalizedColor = normalizeHex(e.target.value);
                          const newInputs = [...referenceColorInputs];
                          newInputs[i] = normalizedColor;
                          setReferenceColorInputs(newInputs);
                          handleReferenceColorChange(i, normalizedColor);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        placeholder="#000000"
                        className="h-8 w-24"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleLockedColor(i)}
                      title={lockedColors.has(i) ? "Unlock reference color" : "Lock reference color"}
                      aria-label={`${lockedColors.has(i) ? Unlock : Lock} reference color ${i + 1}`}
                    >
                      {lockedColors.has(i) ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </Button>
                    {config.numReferenceColors > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeReferenceColor(i)}
                        aria-label={`Remove reference color ${i + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contrast Targets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Contrast Targets</Label>
              <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Paste Ratios</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Paste Contrast Ratios</DialogTitle>
                    <DialogDescription>
                      Paste comma-separated contrast ratios (e.g., 1.1, 1.3, 1.6, 2.3, 3.3, 5, 7.7, 11.4, 14.2, 17.1)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="1.1, 1.3, 1.6, 2.3, 3.3, 5, 7.7, 11.4, 14.2, 17.1"
                      value={pasteInput}
                      onChange={(e) => setPasteInput(e.target.value)}
                    />
                    {pasteError && (
                      <Alert variant="destructive">
                        <AlertDescription>{pasteError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handlePasteRatios}>Apply</Button>
                      <Button variant="outline" onClick={() => setShowPasteDialog(false)}>Cancel</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: config.numStops }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Label className="text-xs w-8">#{i + 1}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="1"
                    max="21"
                    value={config.targetRatios[i] || 3.0}
                    onChange={(e) => {
                      // Don't process immediately, just update local state
                      const newRatios = [...config.targetRatios];
                      newRatios[i] = parseFloat(e.target.value) || 3.0;
                      setConfig(prev => ({ ...prev, targetRatios: newRatios }));
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value) || 3.0;
                      const clampedValue = Math.max(1, Math.min(21, value));
                      handleTargetRatioChange(i, clampedValue);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      <Card className="w-full p-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Generated Ramp</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyHexValues}>
                <Copy className="w-4 h-4 mr-1" />
                Copy Hex
              </Button>
              <Button variant="outline" size="sm" onClick={copyActualRatios}>
                <Copy className="w-4 h-4 mr-1" />
                Copy Ratios
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Input Validation */}
          {(() => {
            const issues = validateInputs();
            if (issues.length > 0) {
              return (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    <div className="font-medium mb-2">Input Validation Issues:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {issues.map((issue, index) => (
                        <li key={index} className="text-sm">{issue}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              );
            }
            return null;
          })()}







          {/* Color Ramp Display */}
          <div className="space-y-2">
            {rampResult.colors.map((color, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div 
                  className="w-12 h-12 rounded border relative"
                  style={{ backgroundColor: color.hex }}
                >
                  {color.isLocked && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{color.hex}</span>
                    {!color.isLocked && (
                      <Badge variant="outline" className="text-xs">
                        {color.method}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Target: {color.targetRatio.toFixed(1)} | Actual: {color.actualRatio.toFixed(1)} | Diff: {Math.abs(color.actualRatio - color.targetRatio).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Generate Button */}
          <div className="mt-6">
            <Button onClick={handleGenerateRamp} className="w-full">
              Generate Ramp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



// Core algorithm functions
function generateRamp(config: RampConfig, lockedColors: Set<number>): RampResult {
  const { referenceColors, targetRatios, backgroundColor } = config;
  
  // Validate background color before processing
  if (!isValidHexColor(backgroundColor)) {
    const defaultConfig = { ...config, backgroundColor: '#ffffff' };
    return generateRamp(defaultConfig, lockedColors);
  }
  
  // Create color variations from reference colors
  const variations = createColorVariations(referenceColors, backgroundColor);
  
  // If no valid variations, return placeholder ramp
  if (variations.length === 0) {
    const placeholder: GeneratedColor = {
      hex: '#cccccc',
      targetRatio: 1,
      actualRatio: 1,
      method: 'generation',
      confidence: 0,
      explanation: 'No valid reference colors. Please enter at least one valid hex color.'
    };
    return {
      colors: Array(targetRatios.length).fill(placeholder),
      overallConfidence: 0,
      summary: 'No valid reference colors. Please enter at least one valid hex color (e.g., #FFCC00).',
      debugInfo: {
        variations: [],
        algorithmSteps: ['No valid reference colors. Please enter at least one valid hex color (e.g., #FFCC00).'],
        warnings: []
      }
    };
  }
  
  // Generate colors for each target ratio
  const colors: GeneratedColor[] = [];
  const algorithmSteps: string[] = [];
  const warnings: string[] = [];

  // Add initial debug info
  algorithmSteps.push(`Starting generation with ${variations.length} color variations`);
  algorithmSteps.push(`Reference colors: ${referenceColors.filter(c => isValidHexColor(c)).join(', ')}`);
  algorithmSteps.push(`Background color: ${backgroundColor}`);
  algorithmSteps.push(`Target ratios: ${targetRatios.map(r => r.toFixed(1)).join(', ')}`);

  // First, handle locked colors by placing them in their best-matching slots
  const lockedColorSlots = new Map<number, { color: string; actualRatio: number }>();
  const availableSlots = new Set(Array.from({ length: targetRatios.length }, (_, i) => i));
  
  for (const lockedIndex of lockedColors) {
    if (lockedIndex < referenceColors.length && isValidHexColor(referenceColors[lockedIndex])) {
      const lockedColor = referenceColors[lockedIndex];
      const actualRatio = calculateContrastRatio(lockedColor, backgroundColor);
      
      // Find the slot that best matches this locked color's actual ratio
      let bestSlot = 0;
      let bestDiff = Math.abs(targetRatios[0] - actualRatio);
      
      for (let i = 1; i < targetRatios.length; i++) {
        const diff = Math.abs(targetRatios[i] - actualRatio);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestSlot = i;
        }
      }
      
      // If the best slot is available, use it; otherwise use the original locked slot
      const finalSlot = availableSlots.has(bestSlot) ? bestSlot : lockedIndex;
      lockedColorSlots.set(finalSlot, { color: lockedColor, actualRatio });
      availableSlots.delete(finalSlot);
      
      algorithmSteps.push(`Locked color ${lockedColor} (ratio: ${actualRatio.toFixed(1)}) placed in slot ${finalSlot + 1} (target: ${targetRatios[finalSlot].toFixed(1)})`);
    }
  }

  // Now generate colors for all slots
  for (let i = 0; i < targetRatios.length; i++) {
    const targetRatio = targetRatios[i];
    
    // Check if this slot has a locked color
    if (lockedColorSlots.has(i)) {
      const { color: lockedColor, actualRatio } = lockedColorSlots.get(i)!;
      colors.push({
        hex: lockedColor,
        targetRatio,
        actualRatio,
        method: 'interpolation',
        confidence: calculateConfidence(actualRatio, targetRatio),
        explanation: `Using locked reference color`,
        isLocked: true
      });
      continue;
    }
    
    // Find the best color for this target ratio
    const bestColor = findBestColor(targetRatio, variations, backgroundColor);
    colors.push(bestColor);
    algorithmSteps.push(`Slot ${i + 1}: Best color for target ${targetRatio.toFixed(1)} is ${bestColor.hex} (Actual: ${bestColor.actualRatio.toFixed(1)}, Method: ${bestColor.method})`);
    
    // Add warnings for poor matches
    if (bestColor.confidence < 0.5) {
      warnings.push(`Slot ${i + 1}: Poor match for target ${targetRatio.toFixed(1)} (confidence: ${(bestColor.confidence * 100).toFixed(1)}%)`);
    }
  }
  
  // Calculate overall confidence
  const overallConfidence = colors.reduce((sum, color) => sum + color.confidence, 0) / colors.length;
  
  // Generate summary
  const summary = generateSummary(colors, variations);
  
  return {
    colors,
    overallConfidence,
    summary,
    debugInfo: {
      variations,
      algorithmSteps,
      warnings
    }
  };
}

function createColorVariations(referenceColors: string[], backgroundColor: string): ColorVariation[] {
  const variations: ColorVariation[] = [];
  
  // Check if any reference colors are grayscale (saturation = 0 or very low)
  // If any are grayscale, we should preserve grayscale throughout
  const hasGrayscale = referenceColors.some(color => {
    if (!isValidHexColor(color)) return false;
    const hsl = hexToHsl(color);
    return hsl.s <= 5; // Allow very slight saturation for near-grayscale colors
  });
  
  // If we have any grayscale colors, treat all as grayscale to preserve consistency
  const allGrayscale = hasGrayscale;
  
  for (const color of referenceColors) {
    if (!isValidHexColor(color)) continue; // Skip invalid colors
    const hsl = hexToHsl(color);
    const ratio = calculateContrastRatio(color, backgroundColor);
    
    // Add the original color
    variations.push({
      hex: color,
      ratio,
      lightness: hsl.l,
      hue: hsl.h,
      saturation: hsl.s
    });
    
    // Create finer lightness variations (every 2% instead of 5%)
    for (let lightness = 5; lightness <= 95; lightness += 2) {
      // Skip the original color's lightness to avoid duplicates
      if (Math.abs(lightness - hsl.l) < 2) continue;
      
      // If all colors are grayscale, preserve grayscale (saturation = 0)
      const saturation = allGrayscale ? 0 : hsl.s;
      const variationColor = hslToHex(hsl.h, saturation, lightness);
      const variationRatio = calculateContrastRatio(variationColor, backgroundColor);
      variations.push({
        hex: variationColor,
        ratio: variationRatio,
        lightness,
        hue: hsl.h,
        saturation
      });
    }
    
    // Only create saturation variations if NOT grayscale
    if (!allGrayscale) {
      // Create saturation variations that preserve vibrancy
      // For vibrant colors, prefer higher saturations
      const isVibrant = hsl.s > 60;
      const saturationRange = isVibrant ? [80, 90, 100] : [40, 60, 80, 100];
      
      for (const saturation of saturationRange) {
        if (Math.abs(saturation - hsl.s) < 15) continue; // Skip too close to original
        
        const saturationColor = hslToHex(hsl.h, saturation, hsl.l);
        const saturationRatio = calculateContrastRatio(saturationColor, backgroundColor);
        variations.push({
          hex: saturationColor,
          ratio: saturationRatio,
          lightness: hsl.l,
          hue: hsl.h,
          saturation
        });
      }
      
      // Create additional lightness variations that maintain vibrancy
      // For darker colors, try to maintain higher saturation to preserve vibrancy
      for (let lightness = 10; lightness <= 90; lightness += 5) {
        if (Math.abs(lightness - hsl.l) < 5) continue; // Skip too close to original
        
        // For darker colors, use higher saturation to maintain vibrancy
        let targetSaturation = hsl.s;
        if (lightness < 30) {
          // Dark colors: boost saturation to maintain vibrancy
          targetSaturation = Math.min(100, hsl.s + 20);
        } else if (lightness > 70) {
          // Light colors: slightly reduce saturation to avoid oversaturation
          targetSaturation = Math.max(60, hsl.s - 10);
        }
        
        const comboColor = hslToHex(hsl.h, targetSaturation, lightness);
        const comboRatio = calculateContrastRatio(comboColor, backgroundColor);
        variations.push({
          hex: comboColor,
          ratio: comboRatio,
          lightness,
          hue: hsl.h,
          saturation: targetSaturation
        });
      }
    }
  }
  
  return variations;
}

function findBestColor(targetRatio: number, variations: ColorVariation[], backgroundColor: string): GeneratedColor {
  if (variations.length === 0) {
    return {
      hex: '#cccccc',
      targetRatio,
      actualRatio: 1,
      method: 'generation',
      confidence: 0,
      explanation: 'No valid reference colors. Please enter at least one valid hex color.'
    };
  }
  
  // 1. Try interpolation first (most predictable)
  const interpolated = tryInterpolation(targetRatio, variations, backgroundColor);
  if (interpolated && interpolated.confidence > 0.8) {
    return interpolated;
  }
  
  // 2. Try lightness adjustment (preserves hue/saturation)
  const adjusted = tryLightnessAdjustment(targetRatio, variations, backgroundColor);
  if (adjusted && adjusted.confidence > 0.7) {
    return adjusted;
  }
  
  // 3. If interpolation had low confidence, try adjustment anyway
  if (interpolated && interpolated.confidence > 0.5) {
    return interpolated;
  }
  
  // 4. Generate new color (last resort)
  return generateNewColor(targetRatio, variations, backgroundColor);
}

function tryInterpolation(targetRatio: number, variations: ColorVariation[], backgroundColor: string): GeneratedColor | null {
  if (variations.length < 2) return null;
  
  // Find multiple variations around the target ratio for better interpolation
  const sorted = [...variations].sort((a, b) => Math.abs(a.ratio - targetRatio) - Math.abs(b.ratio - targetRatio));
  
  // Look for pairs that bracket the target ratio
  let bestPair: [ColorVariation, ColorVariation] | null = null;
  let bestBracket = Infinity;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const color1 = sorted[i];
      const color2 = sorted[j];
      
      // Check if they bracket the target ratio
      const minRatio = Math.min(color1.ratio, color2.ratio);
      const maxRatio = Math.max(color1.ratio, color2.ratio);
      
      if (targetRatio >= minRatio && targetRatio <= maxRatio) {
        const bracketSize = maxRatio - minRatio;
        if (bracketSize < bestBracket) {
          bestBracket = bracketSize;
          bestPair = [color1, color2];
        }
      }
    }
  }
  
  // If we found a good bracket, interpolate
  if (bestPair) {
    const [color1, color2] = bestPair.sort((a, b) => a.ratio - b.ratio);
    const t = (targetRatio - color1.ratio) / (color2.ratio - color1.ratio);
    
    const interpolatedColor = interpolateLAB(color1.hex, color2.hex, t);
    const actualRatio = calculateContrastRatio(interpolatedColor, backgroundColor);
    const confidence = calculateConfidence(actualRatio, targetRatio);
    
    return {
      hex: interpolatedColor,
      targetRatio,
      actualRatio,
      method: 'interpolation',
      confidence,
      explanation: `Blended two similar colors to create this shade`
    };
  }
  
  // If no good bracket found, try extrapolation with the two closest colors
  const closest = sorted.slice(0, 2);
  const [color1, color2] = closest.sort((a, b) => a.ratio - b.ratio);
  const t = (targetRatio - color1.ratio) / (color2.ratio - color1.ratio);
  
  // Only allow extrapolation if the target is reasonably close to the available range
  const minRatio = Math.min(color1.ratio, color2.ratio);
  const maxRatio = Math.max(color1.ratio, color2.ratio);
  const range = maxRatio - minRatio;
  
  // If target is too far outside the range, don't extrapolate
  if (targetRatio < minRatio - range * 0.5 || targetRatio > maxRatio + range * 0.5) {
    return null;
  }
  
  // Clamp t to reasonable bounds for extrapolation
  const clampedT = Math.max(-0.3, Math.min(1.3, t));
  
  const interpolatedColor = interpolateLAB(color1.hex, color2.hex, clampedT);
  const actualRatio = calculateContrastRatio(interpolatedColor, backgroundColor);
  const confidence = calculateConfidence(actualRatio, targetRatio);
  
  return {
    hex: interpolatedColor,
    targetRatio,
    actualRatio,
    method: 'interpolation',
    confidence,
    explanation: `Blended two similar colors to create this shade`
  };
}

function tryLightnessAdjustment(targetRatio: number, variations: ColorVariation[], backgroundColor: string): GeneratedColor | null {
  if (variations.length === 0) return null;
  
  // Check if any variations are grayscale (saturation = 0 or very low)
  // If any are grayscale, preserve grayscale throughout
  const hasGrayscale = variations.some(v => v.saturation <= 5);
  const allGrayscale = hasGrayscale;
  
  // Find the variation closest to the target ratio
  const closest = variations.reduce((best, current) => 
    Math.abs(current.ratio - targetRatio) < Math.abs(best.ratio - targetRatio) ? current : best
  );
  
  // If the closest variation is already very close, use it
  if (Math.abs(closest.ratio - targetRatio) < 0.2) {
    return {
      hex: closest.hex,
      targetRatio,
      actualRatio: closest.ratio,
      method: 'adjustment',
      confidence: calculateConfidence(closest.ratio, targetRatio),
      explanation: `Found a color that closely matches the desired contrast`
    };
  }
  
  // Try adjusting the lightness of the closest color with finer granularity
  const hsl = hexToHsl(closest.hex);
  let bestColor = closest.hex;
  let bestRatio = closest.ratio;
  let bestDiff = Math.abs(closest.ratio - targetRatio);
  
  // Try finer lightness adjustments (every 1% instead of 2%)
  for (let lightness = 5; lightness <= 95; lightness += 1) {
    // If all colors are grayscale, preserve grayscale (saturation = 0)
    const saturation = allGrayscale ? 0 : hsl.s;
    const testColor = hslToHex(hsl.h, saturation, lightness);
    const testRatio = calculateContrastRatio(testColor, backgroundColor);
    const testDiff = Math.abs(testRatio - targetRatio);
    
    if (testDiff < bestDiff) {
      bestDiff = testDiff;
      bestColor = testColor;
      bestRatio = testRatio;
    }
    
    // If we're very close, stop searching
    if (testDiff < 0.05) break;
  }
  
  // Only try saturation adjustments if NOT grayscale
  if (!allGrayscale) {
    // Also try saturation adjustments for better matches
    for (let saturation = 10; saturation <= 100; saturation += 2) {
      const testColor = hslToHex(hsl.h, saturation, hsl.l);
      const testRatio = calculateContrastRatio(testColor, backgroundColor);
      const testDiff = Math.abs(testRatio - targetRatio);
      
      if (testDiff < bestDiff) {
        bestDiff = testDiff;
        bestColor = testColor;
        bestRatio = testRatio;
      }
      
      if (testDiff < 0.05) break;
    }
    
    // Try combinations of lightness and saturation for even better matches
    // Prioritize higher saturation for darker colors to maintain vibrancy
    for (let lightness = 5; lightness <= 95; lightness += 2) {
      // For darker colors, prefer higher saturation to maintain vibrancy
      let saturationRange: number[];
      if (lightness < 30) {
        // Dark colors: focus on high saturation (80-100%)
        saturationRange = [80, 85, 90, 95, 100];
      } else if (lightness > 70) {
        // Light colors: moderate saturation (60-80%)
        saturationRange = [60, 65, 70, 75, 80];
      } else {
        // Mid-tones: balanced saturation (70-90%)
        saturationRange = [70, 75, 80, 85, 90];
      }
      
      for (const saturation of saturationRange) {
        const testColor = hslToHex(hsl.h, saturation, lightness);
        const testRatio = calculateContrastRatio(testColor, backgroundColor);
        const testDiff = Math.abs(testRatio - targetRatio);
        
        if (testDiff < bestDiff) {
          bestDiff = testDiff;
          bestColor = testColor;
          bestRatio = testRatio;
        }
        
        if (testDiff < 0.05) break;
      }
      if (bestDiff < 0.05) break;
    }
  }
  
  const confidence = calculateConfidence(bestRatio, targetRatio);
  
  return {
    hex: bestColor,
    targetRatio,
    actualRatio: bestRatio,
    method: 'adjustment',
    confidence,
    explanation: `Adjusted brightness${!allGrayscale ? ' and saturation' : ''} to match the desired contrast`
  };
}

function generateNewColor(targetRatio: number, variations: ColorVariation[], backgroundColor: string): GeneratedColor {
  // Use the average hue and saturation from variations
  const avgHue = variations.reduce((sum, v) => sum + v.hue, 0) / variations.length;
  const avgSaturation = variations.reduce((sum, v) => sum + v.saturation, 0) / variations.length;
  
  // Find the best lightness value
  let bestColor = '#808080';
  let bestRatio = calculateContrastRatio(bestColor, backgroundColor);
  let bestDiff = Math.abs(bestRatio - targetRatio);
  
  for (let lightness = 5; lightness <= 95; lightness += 1) {
    const testColor = hslToHex(avgHue, avgSaturation, lightness);
    const testRatio = calculateContrastRatio(testColor, backgroundColor);
    const testDiff = Math.abs(testRatio - targetRatio);
    
    if (testDiff < bestDiff) {
      bestDiff = testDiff;
      bestColor = testColor;
      bestRatio = testRatio;
    }
    
    // If we're close enough, stop searching
    if (testDiff < 0.1) break;
  }
  
  const confidence = calculateConfidence(bestRatio, targetRatio);
  
  return {
    hex: bestColor,
    targetRatio,
    actualRatio: bestRatio,
    method: 'generation',
    confidence,
    explanation: `Created a new color based on your reference colors`
  };
}

function calculateConfidence(actualRatio: number, targetRatio: number): number {
  const diff = Math.abs(actualRatio - targetRatio);
  // Perfect match = 1.0, difference of 1.0 or more = 0.0
  // This makes the algorithm more strict about what constitutes a good match
  return Math.max(0, 1 - diff);
}

function generateSummary(colors: GeneratedColor[], variations: ColorVariation[]): string {
  const methods = colors.map(c => c.method);
  const avgConfidence = colors.reduce((sum, c) => sum + c.confidence, 0) / colors.length;
  
  const interpolationCount = methods.filter(m => m === 'interpolation').length;
  const adjustmentCount = methods.filter(m => m === 'adjustment').length;
  const generationCount = methods.filter(m => m === 'generation').length;
  
  let summary = `Generated ${colors.length} colors using ${variations.length} variations. `;
  summary += `Methods: ${interpolationCount} interpolation, ${adjustmentCount} adjustment, ${generationCount} generation. `;
  summary += `Average confidence: ${(avgConfidence * 100).toFixed(1)}%.`;
  
  return summary;
}

// Utility functions (keeping the existing ones)
function calculateContrastRatio(color1: string, color2: string): number {
  // Validate both colors before processing
  if (!isValidHexColor(color1) || !isValidHexColor(color2)) {
    console.warn('Invalid hex color in contrast calculation, using default ratio');
    return 1.0;
  }
  
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
  if (!result) {
    // Return a default color instead of throwing an error
    console.warn(`Invalid hex color: ${hex}, using default`);
    return { r: 128, g: 128, b: 128 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const rgb = hexToRgb(hex);
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return {
    h: h * 360,
    s: s * 100,
    l: l * 100
  };
}

function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 1/6) {
    r = c; g = x; b = 0;
  } else if (h < 2/6) {
    r = x; g = c; b = 0;
  } else if (h < 3/6) {
    r = 0; g = c; b = x;
  } else if (h < 4/6) {
    r = 0; g = x; b = c;
  } else if (h < 5/6) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

function interpolateLAB(color1: string, color2: string, t: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  // Check if both colors are grayscale (all RGB values are equal)
  const isGrayscale1 = rgb1.r === rgb1.g && rgb1.g === rgb1.b;
  const isGrayscale2 = rgb2.r === rgb2.g && rgb2.g === rgb2.b;
  
  if (isGrayscale1 && isGrayscale2) {
    // For grayscale colors, use simple RGB interpolation to avoid color shifts
    const interpolatedRgb = {
      r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * t),
      g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * t),
      b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * t)
    };
    return rgbToHex(interpolatedRgb.r, interpolatedRgb.g, interpolatedRgb.b);
  }
  
  // For non-grayscale colors, use LAB interpolation
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);
  
  const interpolatedLab = {
    l: lab1.l + (lab2.l - lab1.l) * t,
    a: lab1.a + (lab2.a - lab1.a) * t,
    b: lab1.b + (lab2.b - lab1.b) * t
  };
  
  return labToHex(interpolatedLab);
}

function rgbToLab(rgb: {r: number, g: number, b: number}): {l: number, a: number, b: number} {
  const xyz = rgbToXyz(rgb);
  return xyzToLab(xyz);
}

function labToRgb(lab: {l: number, a: number, b: number}): {r: number, g: number, b: number} {
  const xyz = labToXyz(lab);
  return xyzToRgb(xyz);
}

function labToHex(lab: {l: number, a: number, b: number}): string {
  const rgb = labToRgb(lab);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function rgbToXyz(rgb: {r: number, g: number, b: number}): {x: number, y: number, z: number} {
  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map(c => {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return {
    x: 0.4124 * r + 0.3576 * g + 0.1805 * b,
    y: 0.2126 * r + 0.7152 * g + 0.0722 * b,
    z: 0.0193 * r + 0.1192 * g + 0.9505 * b
  };
}

function xyzToRgb(xyz: {x: number, y: number, z: number}): {r: number, g: number, b: number} {
  const r = 3.2406 * xyz.x - 1.5372 * xyz.y - 0.4986 * xyz.z;
  const g = -0.9689 * xyz.x + 1.8758 * xyz.y + 0.0415 * xyz.z;
  const b = 0.0557 * xyz.x - 0.2040 * xyz.y + 1.0570 * xyz.z;
  
  return {
    r: Math.max(0, Math.min(255, r * 255)),
    g: Math.max(0, Math.min(255, g * 255)),
    b: Math.max(0, Math.min(255, b * 255))
  };
}

function xyzToLab(xyz: {x: number, y: number, z: number}): {l: number, a: number, b: number} {
  const xn = 0.95047, yn = 1.00000, zn = 1.08883;
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

function labToXyz(lab: {l: number, a: number, b: number}): {x: number, y: number, z: number} {
  const fy = (lab.l + 16) / 116;
  const fx = lab.a / 500 + fy;
  const fz = fy - lab.b / 200;
  
  const xn = 0.95047, yn = 1.00000, zn = 1.08883;
  
  const x = xn * (fx > 0.206897 ? Math.pow(fx, 3) : (fx - 16/116) / 7.787);
  const y = yn * (fy > 0.206897 ? Math.pow(fy, 3) : (fy - 16/116) / 7.787);
  const z = zn * (fz > 0.206897 ? Math.pow(fz, 3) : (fz - 16/116) / 7.787);
  
  return { x, y, z };
} 