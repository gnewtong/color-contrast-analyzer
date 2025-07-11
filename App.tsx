import React, { useState, useRef } from 'react';
import { ContrastGrid } from './components/ContrastGrid';
import { ColorRampEditor } from './components/ColorRampEditor';
import { ColorRampGenerator } from './components/ColorRampGenerator';
import { defaultColorRamps, ColorRamp } from './components/ContrastUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Undo2 } from 'lucide-react';

export default function App() {
  const [colorRamps, setColorRamps] = useState<ColorRamp[]>(defaultColorRamps);
  const [selectedXRampId, setSelectedXRampId] = useState<string>('');
  const [selectedYRampId, setSelectedYRampId] = useState<string>('');
  const [rampAdded, setRampAdded] = useState(false);
  const [rampAddedTimeout, setRampAddedTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  // Remove editingRamp state
  const [activeTab, setActiveTab] = useState('grid');
  
  // Undo functionality
  const [undoHistory, setUndoHistory] = useState<ColorRamp[][]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Update selected ramps when color ramps change
  React.useEffect(() => {
    if (colorRamps.length > 0) {
      if (!selectedXRampId || !colorRamps.find(r => r.id === selectedXRampId)) {
        setSelectedXRampId(colorRamps[0].id);
      }
      if (!selectedYRampId || !colorRamps.find(r => r.id === selectedYRampId)) {
        setSelectedYRampId(colorRamps[0].id);
      }
    }
  }, [colorRamps, selectedXRampId, selectedYRampId]);

  // Add current state to undo history when color ramps change
  const addToUndoHistory = (newRamps: ColorRamp[]) => {
    setUndoHistory(prev => {
      const newHistory = [...prev, colorRamps];
      // Keep only the last 10 states to prevent memory issues
      if (newHistory.length > 10) {
        return newHistory.slice(-10);
      }
      return newHistory;
    });
    setCanUndo(true);
  };

  // Undo function
  const handleUndo = () => {
    if (undoHistory.length > 0) {
      const previousState = undoHistory[undoHistory.length - 1];
      setColorRamps(previousState);
      setUndoHistory(prev => prev.slice(0, -1));
      setCanUndo(undoHistory.length > 1);
    }
  };

  // Wrapper for color ramps changes that includes undo history
  const handleColorRampsChange = (newRamps: ColorRamp[]) => {
    addToUndoHistory(newRamps);
    setColorRamps(newRamps);
  };

  const totalContrastPairs = colorRamps.reduce((total, ramp) => {
    return total + (ramp.stops.length * ramp.stops.length);
  }, 0);

  const selectedXRamp = colorRamps.find(r => r.id === selectedXRampId);
  const selectedYRamp = colorRamps.find(r => r.id === selectedYRampId);
  const currentContrastPairs = selectedXRamp && selectedYRamp 
    ? selectedXRamp.stops.length * selectedYRamp.stops.length 
    : 0;

  // Remove handleEditInGenerator
  // Remove handleGenerateRamp
  // Only keep logic for adding a new ramp in handleGenerateRamp
  const handleGenerateRamp = (newRamp: ColorRamp) => {
    // Add new ramp
    handleColorRampsChange([...colorRamps, newRamp]);
    setRampAdded(true);
    if (rampAddedTimeout) clearTimeout(rampAddedTimeout);
    const timeout = setTimeout(() => setRampAdded(false), 2500);
    setRampAddedTimeout(timeout);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Color Contrast Analyzer
          </h1>
          <p className="text-gray-600 mb-4">
            Analyze contrast ratios between color ramps to ensure accessibility compliance
          </p>
          <div className="flex justify-center gap-4 text-sm" role="status" aria-live="polite">
            <Badge variant="secondary">
              {colorRamps.length} Color Ramp{colorRamps.length !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary">
              {currentContrastPairs} Active Contrast Pair{currentContrastPairs !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="grid">Contrast Grid</TabsTrigger>
            <TabsTrigger value="editor">Configure Colors</TabsTrigger>
            <TabsTrigger value="generator">Generate Ramp</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Contrast Ratio Matrix</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    title="Undo last action"
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Undo
                  </Button>
                </div>
                <div className="flex gap-4 text-sm" role="group" aria-labelledby="legend-title">
                  <div id="legend-title" className="sr-only">Contrast Level Legend</div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#d5efb5] border border-gray-300 rounded" aria-label="AAA/AA level - green background"></div>
                    <span>AAA / AA (&gt;4.5:1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#feecbc] border border-gray-300 rounded" aria-label="AA Large level - yellow background"></div>
                    <span>AA Large (&gt;3:1)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#f6f5f6] border border-gray-300 rounded" aria-label="Fail level - gray background"></div>
                    <span>Fail (&lt;3:1)</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ContrastGrid 
                  colorRamps={colorRamps}
                  selectedXRampId={selectedXRampId}
                  selectedYRampId={selectedYRampId}
                  onXRampChange={setSelectedXRampId}
                  onYRampChange={setSelectedYRampId}
                  onColorRampsChange={handleColorRampsChange}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="editor">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Color Ramp Configuration</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    title="Undo last action"
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Undo
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Add, remove, and edit color stops to create custom color ramps for analysis.
                </p>
              </CardHeader>
              <CardContent>
                <ColorRampEditor 
                  colorRamps={colorRamps} 
                  onColorRampsChange={handleColorRampsChange}
                  // Remove onEditInGenerator
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generator">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {/* Remove editingRamp ? `Edit: ${editingRamp.name}` : 'Generate Color Ramp' */}
                    Generate Color Ramp
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    disabled={!canUndo}
                    title="Undo last action"
                  >
                    <Undo2 className="w-4 h-4 mr-2" />
                    Undo
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Generate color ramps based on contrast ratio targets against a background color.
                </p>
              </CardHeader>
              <CardContent>
                <ColorRampGenerator 
                  onGenerateRamp={handleGenerateRamp}
                  // Remove existingRamp
                />
                {rampAdded && (
                  <div className="mt-4 text-green-600 font-medium animate-fade-in">
                    Ramp added to Configure Colors!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}