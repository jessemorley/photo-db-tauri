# Claude Memory: Photographer Image Browser - Tauri 2

## Project Overview
A high-performance desktop application built with Tauri 2 for organizing and viewing photographer portfolios with advanced image analysis tools. Migrated from Electron for better performance, smaller bundle size, and native macOS integration.

## Application Architecture

### Core Technologies
- **Platform**: Tauri 2 (Rust backend + web frontend)
- **Backend**: Rust with modular architecture
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Dependencies**:
  - tauri-plugin-store (settings persistence)
  - tauri-plugin-dialog (file picker)
  - tauri-plugin-shell (system commands)
- **Target**: macOS only (universal binary support)

### Project Structure
```
photo-database-tauri/
├── src/                    # Frontend files
│   ├── css/
│   │   ├── base.css       # Typography, dark mode, global styles
│   │   ├── layout.css     # Header, navigation, main content layout
│   │   └── components.css # Cards, buttons, modals, viewer
│   ├── js/
│   │   ├── constants.js   # Global constants
│   │   ├── dom-helper.js  # DOM utility functions
│   │   └── app.js         # Main application logic (PhotographerBrowser class)
│   └── index.html         # Application UI structure + Tauri IPC bridge
└── src-tauri/             # Rust backend
    ├── src/
    │   ├── main.rs        # Entry point
    │   ├── lib.rs         # Plugin initialization, command registration
    │   ├── commands.rs    # 16 Tauri commands (API handlers)
    │   ├── file_ops.rs    # File system operations (photographers, images)
    │   └── storage.rs     # Settings persistence wrapper
    ├── Cargo.toml         # Rust dependencies
    └── tauri.conf.json    # Tauri configuration
```

### Rust Backend Architecture

#### Modules

**file_ops.rs** - File system operations
- `discover_photographers()`: Scans root directory for photographer folders
- `get_images()`: Lists all images in a photographer's folder
- `get_preview_image()`: Finds first image for preview thumbnails
- `is_image_file()`: Validates image extensions
- Structs: `Photographer`, `ImageFile` (with camelCase serialization)
- Supported formats: JPG, JPEG, PNG, GIF, BMP, WebP, TIFF

**storage.rs** - Settings persistence
- `get_setting()`: Retrieve stored value by key
- `set_setting()`: Store value and save to disk
- `delete_setting()`: Remove stored value
- Uses `tauri-plugin-store` with `settings.json` file

**commands.rs** - Tauri command handlers (16 total)
- `select_directory()`: File picker dialog
- `get_photographers()`: List photographers from root path
- `get_images()`: List images from photographer folder
- `get_stored_folder()`, `clear_stored_folder()`: Root path persistence
- `get_theme()`, `set_theme()`: Theme preference
- `get_show_hex()`, `set_show_hex()`: Eyedropper hex display toggle
- `get_eyedropper_active()`, `set_eyedropper_active()`: Eyedropper state
- `get_histogram_active()`, `set_histogram_active()`: Histogram state
- `get_gallery_style()`, `set_gallery_style()`: Gallery layout style
- `reveal_in_finder()`: macOS Finder integration

**lib.rs** - Application initialization
- Plugin registration (dialog, shell, store)
- Command handler registration
- Dev logging setup

### Frontend Architecture

**index.html** - IPC Bridge
- Uses `window.__TAURI_INTERNALS__.invoke()` for IPC
- `window.electronAPI` compatibility layer (maintains Electron API surface)
- `window.convertFileSrc()` - Converts file paths to Tauri asset protocol URLs
- `data-tauri-drag-region` on header for window dragging

**app.js** - PhotographerBrowser class
- Single class managing all application state
- Key methods:
  - `loadPhotographerImagesAnimated()`: Smooth transitions between views
  - `fadeOutAllCards()`: Quick fade-out animation (150ms)
  - `renderImagesAnimated()`: Staggered fade-in for image grid
  - `generateHistogram()`: ITU-R BT.709 luminosity calculation
  - `handleImageMouseMove()`: Real-time eyedropper color sampling
- File path handling: All paths use `window.convertFileSrc()` before display

### Key Implementation Details

#### Tauri Asset Protocol
- Frontend files served from `src/` directory
- Local images accessed via `https://asset.localhost/` protocol
- `convertFileSrc()` encodes file paths properly for asset protocol
- Asset protocol enabled in tauri.conf.json with scope `["**"]`

#### macOS Integration
- Single-line header (56px height) with traffic light support
- Header drag region via `data-tauri-drag-region` attribute
- 12px left padding in header-left for traffic light clearance
- Overlay title bar style (`titleBarStyle: "Overlay"`)
- Reveal in Finder via `open -R` command

#### Settings Persistence
- All preferences stored in `settings.json` via tauri-plugin-store
- Keys: selectedFolder, theme, showHex, eyedropperActive, histogramActive, galleryStyle
- JSON values automatically serialized/deserialized

#### Security Model
- Capabilities-based permissions in tauri.conf.json
- Permissions: core:default, dialog:default, shell:default, store:default
- No custom CSP (null) - relies on Tauri's built-in security

## Core Features

### Navigation Flow
1. **Initial Setup**: Select photography folder containing photographer directories
2. **Photographer Grid**: Browse photographers with preview images
3. **Image Grid**: View individual photographer's images
4. **Full-Screen Viewer**: Immersive image viewing with analysis tools

### Advanced Analysis Tools
- **Eyedropper Tool**:
  - Real-time RGB/hex color sampling using Canvas ImageData API
  - Crosshair cursor, persistent state across sessions
  - Shows R, G, B, Luminosity, and Hex values
  - Keyboard shortcut: I
- **Histogram Display**:
  - Live luminosity distribution using ITU-R BT.709 calculation
  - Interactive red line tracking current pixel's luminosity
  - Draggable overlay, grid reference lines
  - Performance optimized with pixel sampling
  - Keyboard shortcut: H

### UI/UX Features
- **Theme System**: Light/dark/auto with system detection
- **Gallery Styles**: Default (overlay titles) vs Magazine (below titles)
- **Animations**: Smooth transitions between photographer → image views
- **Persistent Settings**: All preferences saved via tauri-plugin-store
- **Keyboard Navigation**: Arrow keys, escape, H (histogram), I (eyedropper)
- **Window Dragging**: Drag anywhere in header to move window

## Development

### Running the App
```bash
npm run dev      # Start Tauri dev server with hot reload
```

### Building
```bash
npm run build                    # Build for current architecture
npm run build:universal          # Build universal macOS binary (Intel + Apple Silicon)
```

### Architecture Notes
- Dev mode: Rust compiles in ~5-7 seconds with hot reload
- Frontend changes reload automatically
- Backend (Rust) changes trigger recompilation
- No bundler needed - vanilla JS served directly

## Migration from Electron

### Key Changes
1. **IPC System**: `ipcMain.handle()` → `#[tauri::command]` functions
2. **File Paths**: `file://` protocol → Tauri asset protocol
3. **Settings**: electron-store → tauri-plugin-store
4. **Dialogs**: Electron dialog API → tauri-plugin-dialog
5. **Window Dragging**: `-webkit-app-region: drag` → `data-tauri-drag-region`

### Breaking Changes from Electron Version
- No Node.js modules in frontend (security improvement)
- Settings not migrated (fresh start)
- macOS only (no Windows/Linux support in this version)

## Known Issues & Limitations
- macOS only (by design)
- No automatic migration of settings from Electron version
- Requires separate icons for macOS builds

## Future Enhancements
- [ ] Consolidate inspection elements to single toggle
- [ ] Refresh button
- [ ] Click to store RGB values
- [ ] Grid spacing options in Preferences
- [ ] Colour wheel overlay
- [ ] Local storage for image notes, favourites, ordering
- [ ] Windows/Linux support (if needed)

## Key Files to Remember
- `src/index.html:140-170` - Tauri IPC bridge and API compatibility layer
- `src/js/app.js:516` - Photographer card creation with preview images
- `src/js/app.js:79-110` - Histogram generation logic
- `src/js/app.js:753-801` - Eyedropper mouse tracking and color sampling
- `src-tauri/src/commands.rs:8-20` - File picker dialog implementation
- `src-tauri/src/file_ops.rs:29-43` - Preview image discovery
- `src-tauri/tauri.conf.json` - App configuration and permissions
- `src/css/layout.css:4-14` - Header layout with macOS integration
