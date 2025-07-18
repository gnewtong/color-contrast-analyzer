
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

interface HowItWorksProps {
  tabType: 'grid' | 'generator';
}

export function HowItWorks({ tabType }: HowItWorksProps) {
  if (tabType === 'grid') {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">How the Contrast Grid Works</h2>
          <p className="text-gray-600 mb-6">
            The contrast grid helps you analyze color combinations for accessibility compliance.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How to Use the Grid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">1</Badge>
                <div>
                  <div className="font-medium">Select Color Ramps</div>
                  <div className="text-sm text-gray-600">
                    Choose which color ramps to compare on the X and Y axes using the dropdown menus.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">2</Badge>
                <div>
                  <div className="font-medium">Read the Matrix</div>
                  <div className="text-sm text-gray-600">
                    Each cell shows the contrast ratio between the colors from the X and Y ramps. The background color indicates the accessibility level.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">3</Badge>
                <div>
                  <div className="font-medium">Edit Colors</div>
                  <div className="text-sm text-gray-600">
                    Click on any color name or hex value to edit it inline. Changes are saved automatically.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">4</Badge>
                <div>
                  <div className="font-medium">Export Results</div>
                  <div className="text-sm text-gray-600">
                    Use the "Export SVG" button to download the current grid as an image file.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Understanding Contrast Ratios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Contrast ratio measures the difference in luminance between two colors. Higher ratios mean better readability:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li><strong>21:1</strong> - Maximum contrast (black on white)</li>
                <li><strong>7:1</strong> - AAA level for normal text</li>
                <li><strong>4.5:1</strong> - AA level for normal text</li>
                <li><strong>3:1</strong> - AA level for large text</li>
                <li><strong>1:1</strong> - No contrast (same color)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tabType === 'generator') {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">How the Color Ramp Generator Works</h2>
          <p className="text-gray-600 mb-6">
            The generator creates color ramps based on contrast ratio targets against a background color.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>The Algorithm Explained</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Color Variation Generation</h4>
                <p className="text-sm text-gray-600 mb-2">
                  The algorithm creates hundreds of color variations from your reference colors by adjusting brightness, saturation, and lightness while preserving the original color character. These variations serve as the building blocks for all other methods.
                </p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Example:</strong> A vibrant green reference color generates variations from very light to very dark, all maintaining the green hue and vibrancy. These variations are then used for interpolation and adjustment methods.
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">2. Smart Color Selection</h4>
                <p className="text-sm text-gray-600 mb-2">
                  For each target contrast ratio, the algorithm finds the best color using three methods in order of preference:
                </p>
                <ul className="text-sm text-gray-600 space-y-1 ml-4">
                  <li><strong>Interpolation:</strong> Mixes two color variations (created from your reference colors) to create the perfect shade</li>
                  <li><strong>Adjustment:</strong> Uses existing color variations or tweaks the brightness and saturation of a reference color to find the best match</li>
                  <li><strong>Generation:</strong> Creates completely new colors using the average hue and saturation from your reference colors</li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">3. Vibrancy Preservation</h4>
                <p className="text-sm text-gray-600 mb-2">
                  The algorithm intelligently maintains the vibrancy of your reference colors throughout the ramp, especially for darker shades where vibrancy is most likely to be lost.
                </p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>How it works:</strong> Darker colors get boosted saturation, lighter colors get moderate saturation, ensuring the ramp maintains visual consistency.
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">4. Locked Color Placement</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Locked colors are automatically placed in the slots that best match their actual contrast ratios, ensuring they appear where they make the most sense in the ramp.
                </p>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <strong>Example:</strong> A locked color with 3.2:1 contrast will be placed in the 3.3:1 slot, not necessarily slot 1.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Use the Generator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">1</Badge>
                <div>
                  <div className="font-medium">Set Background Color</div>
                  <div className="text-sm text-gray-600">
                    Choose the background color that your ramp will be used against (usually white or black).
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">2</Badge>
                <div>
                  <div className="font-medium">Define Contrast Targets</div>
                  <div className="text-sm text-gray-600">
                    Set the contrast ratios you want to achieve. Common targets: 1.5, 3, 4.5, 7, 21.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">3</Badge>
                <div>
                  <div className="font-medium">Add Reference Colors</div>
                  <div className="text-sm text-gray-600">
                    Provide specific colors you want to include in the ramp. These will be preserved exactly.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">4</Badge>
                <div>
                  <div className="font-medium">Lock Important Colors</div>
                  <div className="text-sm text-gray-600">
                    Use the lock icon to prevent specific colors from being modified during generation.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="secondary" className="mt-1">5</Badge>
                <div>
                  <div className="font-medium">Generate and Review</div>
                  <div className="text-sm text-gray-600">
                    Click "Generate Ramp" to create your color ramp and add it to your collection.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Understanding the Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                The preview shows each generated color with detailed information:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li><strong>Target Ratio:</strong> The contrast ratio you specified for this slot</li>
                <li><strong>Actual Ratio:</strong> The real contrast ratio of the generated color</li>
                <li><strong>Method:</strong> How the color was created (interpolation, adjustment, or generation)</li>
                <li><strong>Lock Icon:</strong> Shows when a color is locked and won't be modified</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                Don't worry if actual ratios don't exactly match targets - the algorithm prioritizes creating usable, visually pleasing color ramps.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 