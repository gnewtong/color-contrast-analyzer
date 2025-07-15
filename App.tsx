import React, { useState, useRef } from 'react';
import { ContrastGrid } from './components/ContrastGrid';
import { ColorRampEditor } from './components/ColorRampEditor';
import { ColorRampGenerator } from './components/ColorRampGenerator';
import { HowItWorks } from './components/HowItWorks';
import { defaultColorRamps, ColorRamp } from './components/ContrastUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from './components/ui/drawer';
import { Undo2, HelpCircle } from 'lucide-react';

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

  // Duplicate functionality
  const [duplicatedRamp, setDuplicatedRamp] = useState<ColorRamp | undefined>(undefined);

  // How it works drawer state
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

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
  const addToUndoHistory = () => {
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
    addToUndoHistory();
    setColorRamps(newRamps);
  };

  // Handle duplicate ramp functionality
  const handleDuplicateRamp = (ramp: ColorRamp) => {
    // Create a copy of the ramp with "Copy of" prefix
    const duplicatedRamp: ColorRamp = {
      ...ramp,
      id: `ramp-${Date.now()}`,
      name: `Copy of ${ramp.name}`,
      stops: [...ramp.stops], // Deep copy the stops
      lockedStops: new Set() // Reset locked stops for the duplicate
    };
    
    // Set the duplicated ramp for the generator
    setDuplicatedRamp(duplicatedRamp);
    
    // Navigate to the generator tab
    setActiveTab('generator');
  };

  // Handle when a ramp is generated from the generator
  const handleGenerateRamp = (newRamp: ColorRamp) => {
    // Add new ramp
    handleColorRampsChange([...colorRamps, newRamp]);
    setRampAdded(true);
    if (rampAddedTimeout) clearTimeout(rampAddedTimeout);
    const timeout = setTimeout(() => setRampAdded(false), 2500);
    setRampAddedTimeout(timeout);
    
    // Clear the duplicated ramp state
    setDuplicatedRamp(undefined);
  };

  // Handle tab change to close how it works drawer
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setHowItWorksOpen(false);
  };

  // Ref to store generator undo function
  const generatorUndoRef = useRef<(() => void) | null>(null);
  const generatorCanUndoRef = useRef<boolean>(false);



  const selectedXRamp = colorRamps.find(r => r.id === selectedXRampId);
  const selectedYRamp = colorRamps.find(r => r.id === selectedYRampId);
  const currentContrastPairs = selectedXRamp && selectedYRamp 
    ? selectedXRamp.stops.length * selectedYRamp.stops.length 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Color Ramp Generator
          </h1>
          <p className="text-gray-600 mb-4">
            Generate and analyze color ramps for design systems with accessibility in mind
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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="grid">Inspect</TabsTrigger>
            <TabsTrigger value="editor">Saved Ramps</TabsTrigger>
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
                  <CardTitle>Saved Ramps</CardTitle>
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
                  Manage your saved color ramps. Edit, duplicate, or create new ramps for contrast analysis.
                </p>
              </CardHeader>
              <CardContent>
                <ColorRampEditor 
                  colorRamps={colorRamps} 
                  onColorRampsChange={handleColorRampsChange}
                  onDuplicateRamp={handleDuplicateRamp}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generator">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>
                      {/* Remove editingRamp ? `Edit: ${editingRamp.name}` : 'Generate Color Ramp' */}
                      Generate Color Ramp
                    </CardTitle>
                    <Drawer open={howItWorksOpen && activeTab === 'generator'} onOpenChange={setHowItWorksOpen}>
                      <DrawerTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="How it works"
                          aria-label="Learn how the color ramp generator works"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <HowItWorks tabType="generator" />
                      </DrawerContent>
                    </Drawer>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Generate color ramps based on contrast ratio targets against a background color.
                </p>
              </CardHeader>
              <CardContent>
                <ColorRampGenerator 
                  onGenerateRamp={handleGenerateRamp}
                  existingRamp={duplicatedRamp}
                />
                {rampAdded && (
                  <div className="mt-4 text-green-600 font-medium animate-fade-in">
                    Ramp added to Saved Ramps!
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