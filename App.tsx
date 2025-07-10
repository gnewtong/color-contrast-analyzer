import React, { useState } from 'react';
import { ContrastGrid } from './components/ContrastGrid';
import { ColorRampEditor } from './components/ColorRampEditor';
import { defaultColorRamps, ColorRamp } from './components/ContrastUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';

export default function App() {
  const [colorRamps, setColorRamps] = useState<ColorRamp[]>(defaultColorRamps);
  const [selectedXRampId, setSelectedXRampId] = useState<string>('');
  const [selectedYRampId, setSelectedYRampId] = useState<string>('');

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

  const totalContrastPairs = colorRamps.reduce((total, ramp) => {
    return total + (ramp.stops.length * ramp.stops.length);
  }, 0);

  const selectedXRamp = colorRamps.find(r => r.id === selectedXRampId);
  const selectedYRamp = colorRamps.find(r => r.id === selectedYRampId);
  const currentContrastPairs = selectedXRamp && selectedYRamp 
    ? selectedXRamp.stops.length * selectedYRamp.stops.length 
    : 0;

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

        <Tabs defaultValue="grid" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="grid">Contrast Grid</TabsTrigger>
            <TabsTrigger value="editor">Configure Colors</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contrast Ratio Matrix</CardTitle>
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
                  onColorRampsChange={setColorRamps}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="editor">
            <Card>
              <CardHeader>
                <CardTitle>Color Ramp Configuration</CardTitle>
                <p className="text-sm text-gray-600">
                  Add, remove, and edit color stops to create custom color ramps for analysis.
                </p>
              </CardHeader>
              <CardContent>
                <ColorRampEditor 
                  colorRamps={colorRamps} 
                  onColorRampsChange={setColorRamps} 
                />
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}