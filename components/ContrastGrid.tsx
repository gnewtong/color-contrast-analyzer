import React, { useEffect, useState, useRef } from 'react';
import { ColorRamp, getContrastRatio, formatContrastRatio, getContrastLevel, getContrastLevelColor } from './ContrastUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Download } from 'lucide-react';

interface ContrastGridProps {
  colorRamps: ColorRamp[];
  selectedXRampId?: string;
  selectedYRampId?: string;
  onXRampChange?: (rampId: string) => void;
  onYRampChange?: (rampId: string) => void;
  onColorRampsChange?: (ramps: ColorRamp[]) => void;
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

  // Hex color validation
  const isValidHexColor = (color: string): boolean => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
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

  // Editable Color Swatch Component
  const EditableColorSwatch = React.memo(({ 
    stop, 
    rampId, 
    stopIndex, 
    isLightBackground, 
    textColor, 
    hexColor, 
    fontSizes, 
    padding
  }: {
    stop: { name: string; hex: string };
    rampId: string;
    stopIndex: number;
    isLightBackground: boolean;
    textColor: string;
    hexColor: string;
    fontSizes: { name: string; hex: string };
    padding: string;
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

    return (
      <div
        className={`relative border border-gray-200 flex items-end justify-center ${padding} overflow-hidden aspect-square`}
        style={{ 
          backgroundColor: stop.hex
        }}
      >
        <div className={`text-center leading-tight ${fontSizes.name} w-full h-full flex flex-col justify-center items-center`}>
          <Input
            value={nameValue}
            onChange={handleNameChange}
            onFocus={handleNameFocus}
            onBlur={handleNameBlur}
            className={`text-xs h-6 w-[95%] text-center px-1 ${textColor} bg-transparent border-none focus:ring-1 focus:ring-white/50 mb-1`}
            style={{ color: isLightBackground ? '#000' : '#fff' }}
          />
          <Input
            value={hexValue}
            onChange={handleHexChange}
            onFocus={handleHexFocus}
            onBlur={handleHexBlur}
            className={`text-xs h-6 w-[95%] text-center px-1 ${hexColor} bg-transparent border-none focus:ring-1 focus:ring-white/50`}
            style={{ color: isLightBackground ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }}
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
                <SelectTrigger className="w-40" id="x-ramp-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                <SelectTrigger className="w-40" id="y-ramp-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
        
        <Button onClick={exportToSVG} variant="outline" size="sm" className="shrink-0">
          <Download className="w-4 h-4 mr-2" />
          Export SVG
        </Button>
      </div>

      <div className="w-full">
        <div 
          className="grid gap-2 mx-auto" 
          style={{ 
            gridTemplateColumns: `repeat(${xRamp.stops.length + 1}, minmax(80px, 1fr))`
          }}
        >
          {/* Top-left empty cell */}
          <div 
            className="bg-white border border-gray-200 aspect-square" 
          />
          
          {/* Top row - X ramp color swatches */}
          {xRamp.stops.map((stop, index) => {
            const isLightBackground = getContrastRatio(stop.hex, '#000000') > getContrastRatio(stop.hex, '#ffffff');
            const textColor = isLightBackground ? 'text-black' : 'text-white';
            const hexColor = isLightBackground ? 'text-black/70' : 'text-white/70';
            
            return (
              <EditableColorSwatch
                key={`header-${stop.name}`}
                stop={stop}
                rampId={xRamp.id}
                stopIndex={index}
                isLightBackground={isLightBackground}
                textColor={textColor}
                hexColor={hexColor}
                fontSizes={fontSizes}
                padding={padding}
              />
            );
          })}

          {/* Left column and grid cells */}
          {yRamp.stops.map((rowStop) => {
            const isLightBackground = getContrastRatio(rowStop.hex, '#000000') > getContrastRatio(rowStop.hex, '#ffffff');
            const textColor = isLightBackground ? 'text-black' : 'text-white';
            const hexColor = isLightBackground ? 'text-black/70' : 'text-white/70';
            
            return (
              <React.Fragment key={`row-${rowStop.name}`}>
                {/* Left column - Y ramp color swatch */}
                <EditableColorSwatch
                  stop={rowStop}
                  rampId={yRamp.id}
                  stopIndex={yRamp.stops.findIndex(s => s.name === rowStop.name)}
                  isLightBackground={isLightBackground}
                  textColor={textColor}
                  hexColor={hexColor}
                  fontSizes={fontSizes}
                  padding={padding}
                />
                
                {/* Grid cells - contrast ratios */}
                {xRamp.stops.map((colStop) => {
                  const ratio = getContrastRatio(rowStop.hex, colStop.hex);
                  const level = getContrastLevel(ratio);
                  const bgColor = getContrastLevelColor(level);
                  
                  return (
                    <div
                      key={`cell-${rowStop.name}-${colStop.name}`}
                      className={`border border-gray-200 flex items-center justify-center ${padding} aspect-square`}
                      style={{ 
                        backgroundColor: bgColor
                      }}
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
    </div>
  );
}