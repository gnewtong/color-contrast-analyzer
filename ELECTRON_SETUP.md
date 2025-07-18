# Electron Setup Guide

This guide explains how to run and build the Color Ramp Generator as a desktop application using Electron.

## Prerequisites

- Node.js 16+ 
- npm or yarn
- Git

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Install Electron dependencies:**
   ```bash
   npm install --save-dev electron electron-builder concurrently wait-on
   ```

## Development

### Run in Development Mode

```bash
npm run electron-dev
```

This will:
- Start the Vite dev server
- Wait for the server to be ready
- Launch Electron pointing to the dev server

### Run Production Build

```bash
npm run build
npm run electron
```

This will:
- Build the React app
- Launch Electron with the built files

## Building for Distribution

### Build for Current Platform

```bash
npm run electron-build
```

### Build for All Platforms

```bash
npm run dist
```

This creates installers for:
- **macOS**: `.dmg` file
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` and `.deb` packages

## Project Structure

```
├── electron/
│   ├── main.js          # Main Electron process
│   ├── preload.js       # Preload script for security
│   └── types.d.ts       # TypeScript definitions
├── assets/              # App icons (create these)
├── dist/                # Built React app
└── dist-electron/       # Built Electron app
```

## Features

### Desktop Integration
- **Native menus** with keyboard shortcuts
- **File dialogs** for save/open operations
- **App icons** and proper window management
- **Security** with context isolation

### Keyboard Shortcuts
- `Cmd/Ctrl + N`: New Color Ramp
- `Cmd/Ctrl + E`: Export SVG
- `Cmd/Ctrl + Q`: Quit (macOS: `Cmd + Q`, Windows/Linux: `Ctrl + Q`)

### Menu Structure
- **File**: New ramp, export, quit
- **Edit**: Standard edit operations
- **View**: Dev tools, zoom, fullscreen
- **Window**: Minimize, close
- **Help**: About dialog

## Configuration

### App Metadata
Edit `package.json` to customize:
- App name and description
- Bundle identifier
- Icons and categories
- Build options

### Window Settings
Modify `electron/main.js` to change:
- Window size and position
- Minimum window size
- Window behavior

## Troubleshooting

### Common Issues

1. **Build fails**: Ensure all dependencies are installed
2. **Window doesn't show**: Check console for errors
3. **Menu not working**: Verify preload script is loaded
4. **File dialogs fail**: Check security settings

### Debug Mode

Run with DevTools open:
```bash
NODE_ENV=development npm run electron-dev
```

## Security Notes

- **Context isolation** is enabled
- **Node integration** is disabled
- **Remote module** is disabled
- **External links** open in default browser

## Next Steps

1. **Add app icons** to `assets/` folder
2. **Customize branding** in `package.json`
3. **Add auto-updater** for distribution
4. **Implement file persistence** for user data
5. **Add crash reporting** and analytics

## Distribution

### Code Signing
For production distribution, you'll need:
- **macOS**: Apple Developer certificate
- **Windows**: Code signing certificate
- **Linux**: GPG key for signing

### Auto Updater
Consider adding `electron-updater` for automatic updates.

## Support

For issues with Electron setup, check:
- [Electron documentation](https://www.electronjs.org/docs)
- [electron-builder documentation](https://www.electron.build/)
- [Vite documentation](https://vitejs.dev/) 