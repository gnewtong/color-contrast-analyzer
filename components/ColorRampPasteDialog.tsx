import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { ColorRamp } from './ContrastUtils';
import { Upload } from 'lucide-react';
import { DialogDescription } from './ui/dialog';

interface ColorRampPasteDialogProps {
  onCreateRamp: (ramp: ColorRamp) => void;
  children: React.ReactNode;
}

export function ColorRampPasteDialog({ onCreateRamp, children }: ColorRampPasteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rampName, setRampName] = useState('');
  const [hexValues, setHexValues] = useState('');
  const [error, setError] = useState('');

  const parseHexValues = (input: string): string[] => {
    // Remove whitespace and split by lines or commas
    const lines = input.trim().split(/[\n,\s]+/).filter(line => line.length > 0);
    
    const hexPattern = /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const validHexValues: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (hexPattern.test(trimmed)) {
        // Ensure it starts with #
        const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
        // Convert 3-digit hex to 6-digit
        if (hex.length === 4) {
          const [, r, g, b] = hex;
          validHexValues.push(`#${r}${r}${g}${g}${b}${b}`);
        } else {
          validHexValues.push(hex.toUpperCase());
        }
      }
    }
    
    return validHexValues;
  };

  const generateStopNames = (count: number): string[] => {
    if (count === 1) return ['500'];
    if (count === 2) return ['400', '600'];
    if (count === 3) return ['300', '500', '700'];
    if (count === 4) return ['200', '400', '600', '800'];
    if (count === 5) return ['100', '300', '500', '700', '900'];
    
    // For more than 5 colors, use incremental numbers
    const step = Math.floor(900 / (count - 1));
    return Array.from({ length: count }, (_, i) => `${100 + i * step}`);
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