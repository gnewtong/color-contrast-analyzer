# Color Contrast Analyzer Grid

A React-based desktop application for analyzing color contrast ratios between different color ramps. Built with Vite, TypeScript, and Tailwind CSS.

## Features

- **Contrast Grid Analysis**: Visualize contrast ratios between different color ramps
- **Color Ramp Management**: Create and edit color ramps with multiple stops
- **Inline Editing**: Edit color names and hex values directly in the grid
- **Responsive Design**: Grid adapts to container width with smooth scaling
- **Export Functionality**: Export contrast grids as SVG files
- **Accessibility Focused**: Built with WCAG contrast guidelines in mind

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Radix UI** components for accessible UI elements

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd color-contrast-analyzer-grid
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173` (or the port shown in the terminal)

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### Creating Color Ramps

1. Navigate to the "Configure Colors" tab
2. Add new color ramps using the interface
3. Each ramp can have multiple color stops with names and hex values

### Analyzing Contrast

1. Select color ramps for the X and Y axes in the "Contrast Grid" tab
2. The grid will display contrast ratios between all color combinations
3. Colors are automatically chosen for optimal readability (black or white text)

### Editing Colors

- Click on any color name or hex value in the grid to edit inline
- Changes are automatically saved
- Invalid hex values will revert to the original value

### Exporting

- Use the "Export SVG" button to download the current grid as an SVG file
- The exported file includes all color information and contrast ratios

## Project Structure

```
├── components/
│   ├── ContrastGrid.tsx          # Main grid component
│   ├── ContrastUtils.ts          # Contrast calculation utilities
│   ├── ColorRampEditor.tsx       # Color ramp editing interface
│   └── ui/                       # Reusable UI components
├── styles/
│   └── globals.css               # Global styles
├── App.tsx                       # Main application component
└── main.tsx                      # Application entry point
```

## Development

### Key Components

- **ContrastGrid**: Renders the main contrast analysis grid with inline editing
- **ColorRampEditor**: Manages color ramp creation and editing
- **ContrastUtils**: Contains utility functions for contrast calculations

### Responsive Design

The grid uses CSS Grid with `minmax(80px, 1fr)` columns to ensure:
- Minimum cell size for usability
- Automatic scaling to fit container width
- Consistent square aspect ratios

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with accessibility in mind following WCAG guidelines
- Uses modern React patterns and TypeScript for type safety
- Responsive design principles for cross-device compatibility 