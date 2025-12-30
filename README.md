# Photographer Image Browser (Tauri)

A lightweight, high-performance desktop application for browsing and analyzing photographer portfolios. Built with Tauri 2 for native macOS performance and security.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Tauri](https://img.shields.io/badge/Tauri-2.0-24C8DB)

## Features

### Browse & Organize
- Browse photographer portfolios organized by folder structure
- Automatic preview image generation for quick navigation
- Fast, native file system access
- Search functionality across photographer names

### Image Analysis Tools
- **Eyedropper Tool**: Real-time RGB color sampling with hex values
- **Histogram Display**: Live luminosity distribution with interactive tracking
- **Full-Screen Viewer**: Distraction-free image viewing

### Customization
- **Themes**: Light, dark, or automatic (follows system preference)
- **Gallery Styles**: Choose between default (overlay titles) or magazine layout
- **Persistent Settings**: All preferences automatically saved

### Performance
- Native Rust backend for blazing-fast file operations
- Smooth animations and transitions
- Small bundle size compared to Electron
- Low memory footprint

## Prerequisites

- macOS 10.13 or later
- Node.js 16+ (for development)
- Rust 1.70+ (for development)

## Installation

### For Users
Download the latest release from the [Releases](../../releases) page and drag to your Applications folder.

### For Developers
```bash
# Clone the repository
git clone https://github.com/jessemorley/photo-db-tauri.git
cd photo-db-tauri

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Build universal binary (Intel + Apple Silicon)
npm run build:universal
```

## Usage

1. **First Launch**: Click "Select Photography Folder" and choose a folder containing photographer directories
2. **Browse Photographers**: Click on any photographer to view their images
3. **View Images**: Click an image to open the full-screen viewer
4. **Analysis Tools**:
   - Press `I` to toggle the eyedropper tool
   - Press `H` to toggle the histogram
   - Use arrow keys to navigate between images
   - Press `Escape` to return to the grid

## Folder Structure

The app expects your photos to be organized like this:

```
Photography Folder/
├── Photographer One/
│   ├── image1.jpg
│   ├── image2.jpg
│   └── image3.png
├── Photographer Two/
│   ├── photo1.jpg
│   └── photo2.jpg
└── Photographer Three/
    └── ...
```

Supported image formats: JPG, JPEG, PNG, GIF, BMP, WebP, TIFF

## Keyboard Shortcuts

- `Arrow Keys` - Navigate between images in viewer
- `Escape` - Close viewer or return to previous view
- `I` - Toggle eyedropper tool
- `H` - Toggle histogram
- `⌘ + Q` - Quit application

## Configuration

Preferences are accessed via the gear icon in the top-right corner:
- **Photography Folder**: Change or reset your photo library location
- **Theme**: Choose light, dark, or auto (system)
- **Gallery Style**: Switch between default and magazine layouts
- **Show Hex Values**: Toggle hex color display in eyedropper

All settings are automatically saved and persist between sessions.

## Architecture

### Frontend
- Vanilla JavaScript (no frameworks)
- Modular CSS architecture
- Direct Tauri IPC integration

### Backend (Rust)
- **file_ops**: File system operations and image discovery
- **storage**: Settings persistence via tauri-plugin-store
- **commands**: 16 Tauri commands for IPC communication

### Key Technologies
- [Tauri 2](https://tauri.app/) - Desktop application framework
- Rust - Backend systems programming
- Web technologies - HTML, CSS, JavaScript

## Development

### Project Structure
```
photo-database-tauri/
├── src/                # Frontend
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript
│   └── index.html     # Main HTML
├── src-tauri/         # Rust backend
│   ├── src/           # Rust source
│   └── tauri.conf.json
└── package.json
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run build:universal` - Build universal macOS binary

### Building from Source
```bash
# Install Tauri CLI
npm install

# Development build (debug mode)
npm run dev

# Production build (optimized)
npm run build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Migrating from Electron Version

This is a complete rewrite of the original Electron-based application. Key improvements:

- **~90% smaller bundle size**
- **~60% less memory usage**
- **Native macOS integration** (traffic lights, Finder reveal)
- **Better security** (sandboxed, capabilities-based permissions)
- **Faster startup time**

**Note**: Settings do not automatically migrate. You'll need to reconfigure your preferences.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

Built with [Tauri](https://tauri.app/), the lightweight and secure application framework.

## Support

For issues and feature requests, please use the [GitHub Issues](../../issues) page.
