import { useState } from 'react';
import { ColorRamp } from './ContrastUtils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader } from './ui/card';
import { ColorRampPasteDialog } from './ColorRampPasteDialog';
import { Plus, Trash2, Upload, Copy, Edit3, Lock, Unlock, Check } from 'lucide-react';
import { isValidHexColor, normalizeHex } from './hexUtils';

interface ColorRampEditorProps {
  colorRamps: ColorRamp[];
  onColorRampsChange: (ramps: ColorRamp[]) => void;
  onDuplicateRamp?: (ramp: ColorRamp) => void;
}

export function ColorRampEditor({ colorRamps, onColorRampsChange, onDuplicateRamp }: ColorRampEditorProps) {
  const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [editingStates, setEditingStates] = useState<{ [key: string]: { name: string; hex: string } }>({});

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

  const duplicateColorRamp = (ramp: ColorRamp) => {
    if (onDuplicateRamp) {
      onDuplicateRamp(ramp);
    }
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

  const handleStopChange = (rampId: string, stopIndex: number, field: 'name' | 'hex', value: string) => {
    const key = `${rampId}-${stopIndex}`;
    setEditingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleStopBlur = (rampId: string, stopIndex: number, field: 'name' | 'hex') => {
    const key = `${rampId}-${stopIndex}`;
    const editingState = editingStates[key];
    if (!editingState) return;

    const value = editingState[field];
    
    // Validate hex color before updating
    if (field === 'hex') {
      if (!isValidHexColor(value)) {
        // Revert to previous valid value by clearing editing state
        setEditingStates(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
        return; // Don't update if invalid
      }
      // Normalize hex value
      const normalizedValue = normalizeHex(value);
      updateColorStop(rampId, stopIndex, field, normalizedValue);
    } else {
      updateColorStop(rampId, stopIndex, field, value);
    }
    
    // Clear editing state
    setEditingStates(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  // Copy color ramp as JSON
  const copyColorRampAsJSON = async (ramp: ColorRamp) => {
    const buttonId = `json-${ramp.id}`;
    setLoadingStates(prev => ({ ...prev, [buttonId]: true }));
    try {
      const data = {
        name: ramp.name,
        stops: ramp.stops.map(stop => ({ name: stop.name, hex: stop.hex }))
      };
      const jsonText = JSON.stringify(data, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = jsonText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedStates(prev => ({ ...prev, [buttonId]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [buttonId]: false })), 1500);
    } catch (error) {
      console.error('Failed to copy JSON:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [buttonId]: false }));
    }
  };

  // Copy HEX values
  const copyHexValues = async (ramp: ColorRamp) => {
    const buttonId = `hex-${ramp.id}`;
    setLoadingStates(prev => ({ ...prev, [buttonId]: true }));
    try {
      const hexValues = ramp.stops.map(stop => stop.hex).join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(hexValues);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = hexValues;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedStates(prev => ({ ...prev, [buttonId]: true }));
      setTimeout(() => setCopiedStates(prev => ({ ...prev, [buttonId]: false })), 1500);
    } catch (error) {
      console.error('Failed to copy HEX values:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [buttonId]: false }));
    }
  };

  const toggleLockedStop = (rampId: string, stopIndex: number) => {
    const ramp = colorRamps.find(r => r.id === rampId);
    if (!ramp) return;

    const lockedStops = new Set(ramp.lockedStops || []);
    if (lockedStops.has(stopIndex)) {
      lockedStops.delete(stopIndex);
    } else {
      lockedStops.add(stopIndex);
    }

    onColorRampsChange(
      colorRamps.map(r =>
        r.id === rampId ? { ...r, lockedStops } : r
      )
    );
  };

  const isStopLocked = (rampId: string, stopIndex: number) => {
    const ramp = colorRamps.find(r => r.id === rampId);
    return ramp?.lockedStops?.has(stopIndex) || false;
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
                  onClick={() => copyColorRampAsJSON(ramp)}
                  title="Copy as JSON"
                  aria-label={`Copy ${ramp.name} color ramp as JSON data`}
                  disabled={loadingStates[`json-${ramp.id}`]}
                  className={loadingStates[`json-${ramp.id}`] ? 'loading' : ''}
                >
                  {loadingStates[`json-${ramp.id}`]
                    ? <div className="loading-spinner mr-1" />
                    : copiedStates[`json-${ramp.id}`]
                      ? <Check className="w-4 h-4 mr-1 text-green-600" />
                      : <Copy className="w-4 h-4 mr-1" />}
                  {copiedStates[`json-${ramp.id}`] ? 'Copied!' : 'JSON'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyHexValues(ramp)}
                  title="Copy HEX values"
                  aria-label={`Copy ${ramp.name} color ramp HEX values`}
                  disabled={loadingStates[`hex-${ramp.id}`]}
                  className={loadingStates[`hex-${ramp.id}`] ? 'loading' : ''}
                >
                  {loadingStates[`hex-${ramp.id}`]
                    ? <div className="loading-spinner mr-1" />
                    : copiedStates[`hex-${ramp.id}`]
                      ? <Check className="w-4 h-4 mr-1 text-green-600" />
                      : <Copy className="w-4 h-4 mr-1" />}
                  {copiedStates[`hex-${ramp.id}`] ? 'Copied!' : 'HEX'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => duplicateColorRamp(ramp)}
                  title="Duplicate color ramp"
                  aria-label={`Duplicate ${ramp.name} color ramp`}
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeColorRamp(ramp.id)}
                  className="bg-red-500 hover:bg-red-600 text-white border border-red-600"
                  title="Delete color ramp"
                  aria-label={`Delete ${ramp.name} color ramp`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ramp.stops.map((stop, stopIndex) => {
                const isLocked = isStopLocked(ramp.id, stopIndex);
                return (
                  <div key={stopIndex} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded border border-gray-300 relative"
                      style={{ backgroundColor: stop.hex }}
                      aria-label={`Color swatch for ${stop.name}: ${stop.hex}`}
                      role="img"
                    >
                      {isLocked && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5">
                          <Lock className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`name-${ramp.id}-${stopIndex}`} className="text-xs">Name</Label>
                        <Input
                          id={`name-${ramp.id}-${stopIndex}`}
                          value={editingStates[`${ramp.id}-${stopIndex}`]?.name ?? stop.name}
                          onChange={(e) => handleStopChange(ramp.id, stopIndex, 'name', e.target.value)}
                          onBlur={() => handleStopBlur(ramp.id, stopIndex, 'name')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-8 w-20"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`hex-${ramp.id}-${stopIndex}`} className="text-xs">Hex</Label>
                        <Input
                          id={`hex-${ramp.id}-${stopIndex}`}
                          value={editingStates[`${ramp.id}-${stopIndex}`]?.hex ?? stop.hex}
                          onChange={(e) => handleStopChange(ramp.id, stopIndex, 'hex', e.target.value)}
                          onBlur={() => handleStopBlur(ramp.id, stopIndex, 'hex')}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-8 w-24"
                          placeholder="#000000"
                          disabled={isLocked}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleLockedStop(ramp.id, stopIndex)}
                        title={isLocked ? "Unlock color stop" : "Lock color stop"}
                        aria-label={`${isLocked ? 'Unlock' : 'Lock'} color stop ${stop.name}`}
                      >
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeColorStop(ramp.id, stopIndex)}
                        disabled={ramp.stops.length <= 1}
                        aria-label={`Remove color stop ${stop.name} from ${ramp.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
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