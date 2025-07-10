import React from 'react';
import { ColorRamp, ColorStop } from './ContrastUtils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader } from './ui/card';
import { ColorRampPasteDialog } from './ColorRampPasteDialog';
import { Plus, Trash2, Upload, Download } from 'lucide-react';

interface ColorRampEditorProps {
  colorRamps: ColorRamp[];
  onColorRampsChange: (ramps: ColorRamp[]) => void;
}

export function ColorRampEditor({ colorRamps, onColorRampsChange }: ColorRampEditorProps) {
  const addColorRamp = () => {
    const newRamp: ColorRamp = {
      id: `ramp-${Date.now()}`,
      name: `Color Ramp ${colorRamps.length + 1}`,
      stops: [
        { name: '500', hex: '#7a7a7a' }
      ]
    };
    onColorRampsChange([...colorRamps, newRamp]);
  };

  const removeColorRamp = (rampId: string) => {
    onColorRampsChange(colorRamps.filter(ramp => ramp.id !== rampId));
  };

  const updateRampName = (rampId: string, newName: string) => {
    onColorRampsChange(
      colorRamps.map(ramp =>
        ramp.id === rampId ? { ...ramp, name: newName } : ramp
      )
    );
  };

  const addColorStop = (rampId: string) => {
    onColorRampsChange(
      colorRamps.map(ramp =>
        ramp.id === rampId
          ? {
              ...ramp,
              stops: [...ramp.stops, { name: `${ramp.stops.length * 100}`, hex: '#7a7a7a' }]
            }
          : ramp
      )
    );
  };

  const removeColorStop = (rampId: string, stopIndex: number) => {
    onColorRampsChange(
      colorRamps.map(ramp =>
        ramp.id === rampId
          ? {
              ...ramp,
              stops: ramp.stops.filter((_, index) => index !== stopIndex)
            }
          : ramp
      )
    );
  };

  const updateColorStop = (rampId: string, stopIndex: number, field: 'name' | 'hex', value: string) => {
    onColorRampsChange(
      colorRamps.map(ramp =>
        ramp.id === rampId
          ? {
              ...ramp,
              stops: ramp.stops.map((stop, index) =>
                index === stopIndex ? { ...stop, [field]: value } : stop
              )
            }
          : ramp
      )
    );
  };

  // Export color ramp as JSON
  const exportColorRamp = (ramp: ColorRamp) => {
    const data = {
      name: ramp.name,
      stops: ramp.stops.map(stop => ({ name: stop.name, hex: stop.hex }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ramp.name || 'color-ramp'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Color Ramps</h2>
        <div className="flex gap-2">
          <ColorRampPasteDialog onCreateRamp={(ramp) => onColorRampsChange([...colorRamps, ramp])}>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Paste Hex Values
            </Button>
          </ColorRampPasteDialog>
          <Button onClick={addColorRamp} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Ramp
          </Button>
        </div>
      </div>

      {colorRamps.map((ramp) => (
        <Card key={ramp.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                <Label htmlFor={`ramp-name-${ramp.id}`} className="text-sm font-medium shrink-0">
                  Name:
                </Label>
                <Input
                  id={`ramp-name-${ramp.id}`}
                  value={ramp.name}
                  onChange={(e) => updateRampName(ramp.id, e.target.value)}
                  className="h-8 max-w-xs"
                  placeholder="Color ramp name"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportColorRamp(ramp)}
                  title="Export as JSON"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeColorRamp(ramp.id)}
                  className="bg-red-500 hover:bg-red-600 text-white border border-red-600"
                  title="Delete color ramp"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ramp.stops.map((stop, stopIndex) => (
                <div key={stopIndex} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ backgroundColor: stop.hex }}
                  />
                  
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`name-${ramp.id}-${stopIndex}`} className="text-xs">Name</Label>
                      <Input
                        id={`name-${ramp.id}-${stopIndex}`}
                        value={stop.name}
                        onChange={(e) => updateColorStop(ramp.id, stopIndex, 'name', e.target.value)}
                        className="h-8 w-20"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`hex-${ramp.id}-${stopIndex}`} className="text-xs">Hex</Label>
                      <Input
                        id={`hex-${ramp.id}-${stopIndex}`}
                        value={stop.hex}
                        onChange={(e) => updateColorStop(ramp.id, stopIndex, 'hex', e.target.value)}
                        className="h-8 w-24"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeColorStop(ramp.id, stopIndex)}
                    disabled={ramp.stops.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => addColorStop(ramp.id)}
                className="w-full mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Color Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {colorRamps.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No color ramps configured.</p>
          <p className="text-sm mt-1">Add a color ramp to get started.</p>
        </div>
      )}
    </div>
  );
}