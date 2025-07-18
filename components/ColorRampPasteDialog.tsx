import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { ColorRamp } from './ContrastUtils';
import { DialogDescription } from './ui/dialog';
import { parseHexValues } from './hexUtils';

interface ColorRampPasteDialogProps {
  onCreateRamp: (ramp: ColorRamp) => void;
  children: React.ReactNode;
}

export function ColorRampPasteDialog({ onCreateRamp, children }: ColorRampPasteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rampName, setRampName] = useState('');
  const [hexValues, setHexValues] = useState('');
  const [error, setError] = useState('');

  const generateStopNames = (count: number): string[] => {
    return Array.from({ length: count }, (_, i) => `${(i + 1) * 100}`);
  };

  const handleCreate = () => {
    setError('');
    
    if (!rampName.trim()) {
      setError('Please enter a name for the color ramp');
      return;
    }
    
    const parsedHexValues = parseHexValues(hexValues);
    
    if (parsedHexValues.length === 0) {
      setError('Please enter at least one valid hex color value');
      return;
    }
    
    const stopNames = generateStopNames(parsedHexValues.length);
    
    const newRamp: ColorRamp = {
      id: `ramp-${Date.now()}`,
      name: rampName.trim(),
      stops: parsedHexValues.map((hex, index) => ({
        name: stopNames[index] || `${(index + 1) * 100}`,
        hex
      }))
    };
    
    onCreateRamp(newRamp);
    
    // Reset form
    setRampName('');
    setHexValues('');
    setError('');
    setIsOpen(false);
  };

  const handleCancel = () => {
    setRampName('');
    setHexValues('');
    setError('');
    setIsOpen(false);
  };

  const exampleText = `#FF0000
#FF3300
#FF6600
#FF9900
#FFCC00
#FFFF00`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Color Ramp from Hex Values</DialogTitle>
          <DialogDescription>
            Paste a list of hex color values, one per line, to create a new color ramp. Supports formats: #FF0000, FF0000, #F00
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ramp-name">Color Ramp Name</Label>
            <Input
              id="ramp-name"
              value={rampName}
              onChange={(e) => setRampName(e.target.value)}
              placeholder="e.g., Brand Colors, Fire Gradient"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="hex-values">Hex Color Values</Label>
            <Textarea
              id="hex-values"
              value={hexValues}
              onChange={(e) => setHexValues(e.target.value)}
              placeholder={exampleText}
              className="h-32 font-mono text-sm"
            />
            <p className="text-xs text-gray-600">
              Enter hex values one per line. Supports formats: #FF0000, FF0000, #F00
            </p>
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Color Ramp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}