# SalesHud Assets Documentation

## Overview

This directory contains all visual and branding assets for SalesHud - AI-Powered Sales Intelligence platform. The assets are organized to support development, production builds, and multi-platform distribution.

## Directory Structure

```
assets/
├── icons/                    # Application and system icons
│   ├── icon-source.svg       # Master app icon source (512x512)
│   ├── tray-icon-source.svg  # Master tray icon source (32x32)
│   ├── icon.png              # Main app icon (512x512)
│   ├── icon@2x.png           # Retina app icon (1024x1024)
│   ├── tray-icon.png         # System tray icon (16x16)
│   ├── tray-icon@2x.png      # Retina tray icon (32x32)
│   └── installer-icon.png    # Installer dialog icon (256x256)
├── images/                   # Brand images and graphics
│   ├── logo.svg              # SalesHud logo with text
│   ├── background.png        # App background texture
│   └── splash.png            # Loading screen graphic
├── branding/                 # Brand specifications
│   ├── colors.json           # Complete color palette
│   └── fonts.json            # Typography system
└── README.md                 # This documentation
```

## Build Assets

The `build/` directory (created during asset generation) contains platform-specific assets:

```
build/
├── icon.icns                 # macOS app bundle icon
├── icon.ico                  # Windows executable icon
├── icon.png                  # Cross-platform PNG icon
├── entitlements.mac.plist    # macOS app permissions
├── installer.nsh             # Windows installer script
├── dmg-background.png        # macOS DMG installer background
└── icons/                    # Linux icon sizes
    ├── 16x16.png
    ├── 32x32.png
    ├── 48x48.png
    ├── 64x64.png
    ├── 128x128.png
    ├── 256x256.png
    └── 512x512.png
```

## Asset Specifications

### App Icon Requirements

#### Main Application Icon
- **Format**: SVG source → PNG, ICNS, ICO outputs
- **Primary Size**: 512x512px
- **Design**: Professional, recognizable at small sizes
- **Elements**: SH monogram, neural network pattern, gradient background
- **Colors**: Brand gradient (#1a365d → #3182ce → #805ad5)

#### Size Variants
| Platform | Format | Sizes | Usage |
|----------|--------|-------|--------|
| macOS | ICNS | 16,32,64,128,256,512,1024 | App bundle, Dock, Finder |
| Windows | ICO | 16,24,32,48,64,128,256 | Executable, taskbar, Alt+Tab |
| Linux | PNG | 16,24,32,48,64,128,256,512 | Desktop environments |
| Web/Electron | PNG | 512,1024 | About dialogs, web views |

### System Tray Icon

#### Requirements
- **Size**: 16x16px primary, 32x32px retina
- **Style**: Monochrome, high contrast
- **Format**: PNG with alpha channel
- **Template**: macOS template versions for automatic theme adaptation

#### Design Principles
- Simple, recognizable silhouette
- Clear at 16x16 pixel size
- Works in both light and dark menu bars
- Maintains brand recognition

### Brand Colors

#### Primary Palette
```json
{
  "primary": "#1a365d",     // SalesHud Blue
  "secondary": "#3182ce",   // Electric Blue  
  "tertiary": "#805ad5",    // Neural Purple
  "accent": "#10b981"       // Success Green
}
```

#### Semantic Colors
```json
{
  "success": "#10b981",     // Positive actions
  "warning": "#f59e0b",     // Caution states
  "error": "#ef4444",       // Error states
  "info": "#3b82f6"         // Information
}
```

#### Glassmorphism
```json
{
  "glass-light": "rgba(255,255,255,0.1)",
  "glass-medium": "rgba(255,255,255,0.05)",
  "glass-dark": "rgba(0,0,0,0.1)"
}
```

### Typography

#### Font Stack
- **Primary**: Inter (300-900 weights)
- **Monospace**: JetBrains Mono (400-600 weights)
- **Fallback**: system-ui, -apple-system, sans-serif

#### Scale
- Base: 16px (1rem)
- Ratio: 1.25 (Major Third)
- Range: 12px - 48px
- Line heights: 1.25 - 2.0

## Asset Generation

### Automated Generation

Use the provided script to generate all required assets:

```bash
# Generate all assets
npm run generate:assets

# Or use the script directly
node scripts/generate-icons.js

# Generate specific asset types
node scripts/generate-icons.js app     # App icons only
node scripts/generate-icons.js tray    # Tray icons only
node scripts/generate-icons.js validate # Validate existing assets
```

### Manual Asset Creation

#### Prerequisites
- Design software (Sketch, Figma, Adobe Illustrator)
- Icon generation tools (ImageMagick, Sharp, or online converters)
- SVG optimization tools

#### Process
1. **Design Source Icons**
   - Create 512x512 SVG for app icon
   - Create 32x32 SVG for tray icon
   - Use brand colors and design guidelines

2. **Generate Raster Formats**
   ```bash
   # Using ImageMagick (if available)
   convert icon-source.svg -resize 512x512 icon.png
   convert icon-source.svg -resize 1024x1024 icon@2x.png
   ```

3. **Create Platform-Specific Formats**
   - **macOS ICNS**: Use `iconutil` or online converter
   - **Windows ICO**: Include multiple sizes (16,32,48,256)
   - **Linux PNG**: Create standard FreeDesktop sizes

### Quality Guidelines

#### Design Standards
- **Clarity**: Readable at 16x16 pixels
- **Contrast**: Minimum 4.5:1 ratio for accessibility
- **Consistency**: Cohesive visual style across all sizes
- **Platform Integration**: Follows OS design guidelines

#### Technical Standards
- **PNG**: 24-bit color with alpha channel
- **SVG**: Optimized, no external dependencies
- **ICO**: Multiple embedded sizes
- **ICNS**: Complete size set for retina displays

## Usage in Application

### Electron Configuration

```javascript
// Main process icon configuration
const iconPath = path.join(__dirname, 'assets/icons/icon.png');
const trayIconPath = path.join(__dirname, 'assets/icons/tray-icon.png');

const mainWindow = new BrowserWindow({
  icon: iconPath,
  // ... other options
});

const tray = new Tray(trayIconPath);
```

### CSS Integration

```css
/* Brand colors as CSS custom properties */
:root {
  --color-primary: #1a365d;
  --color-secondary: #3182ce;
  --color-tertiary: #805ad5;
  --glass-bg: rgba(255, 255, 255, 0.05);
}

/* Logo usage */
.logo {
  background-image: url('../images/logo.svg');
  background-size: contain;
  background-repeat: no-repeat;
}
```

### React Component Usage

```tsx
import logoSvg from '../assets/images/logo.svg';

export const Logo: React.FC = () => (
  <img 
    src={logoSvg} 
    alt="SalesHud" 
    className="h-8 w-auto" 
  />
);
```

## Platform-Specific Considerations

### macOS
- **Retina Support**: Provide @2x variants for high-DPI displays
- **Template Icons**: Use for menu bar items that adapt to system theme
- **Entitlements**: Camera, microphone, screen recording permissions
- **Notarization**: Icons embedded in signed bundles

### Windows  
- **Multiple Sizes**: ICO files should contain 16,24,32,48,256 pixel variants
- **High-DPI**: Windows scales icons automatically
- **Installer**: Custom icon for NSIS installer dialogs
- **Taskbar**: Icon appears in taskbar and Alt+Tab switcher

### Linux
- **FreeDesktop**: Follow XDG icon theme specification
- **Size Range**: Provide 16-512px range for different desktop environments
- **Installation**: Icons placed in system icon directories
- **Themes**: Work with both light and dark system themes

## Asset Optimization

### File Size Optimization
- **SVG**: Remove unnecessary elements, optimize paths
- **PNG**: Compress with tools like OptiPNG, TinyPNG
- **ICO**: Balance quality vs. file size for embedded sizes

### Performance Considerations
- **Loading**: Critical assets loaded synchronously at app start
- **Caching**: Static assets cached by Electron's resource management
- **Memory**: Large icons kept in memory during app lifetime

## Brand Guidelines

### Logo Usage

#### Do's ✅
- Use official logo files provided in this directory
- Maintain aspect ratio and proportions
- Ensure adequate clear space around logo
- Use on backgrounds that provide sufficient contrast

#### Don'ts ❌
- Stretch, skew, or modify the logo proportions
- Change colors outside of approved brand palette
- Use on busy backgrounds that obscure readability
- Modify the neural network or monogram elements

### Color Applications

#### Primary Uses
- **Brand Blue (#1a365d)**: Headers, primary buttons, brand elements
- **Electric Blue (#3182ce)**: Accents, hover states, progress indicators  
- **Neural Purple (#805ad5)**: AI features, analytics, smart suggestions

#### Accessibility
- All color combinations tested for WCAG AA compliance
- Minimum 4.5:1 contrast ratio for normal text
- Minimum 3:1 contrast ratio for large text (18pt+)

## Development Workflow

### Asset Updates
1. Update source SVG files in `assets/icons/`
2. Run `npm run generate:assets` to regenerate all formats
3. Test icons in development build
4. Commit both source and generated assets

### Version Control
- **Include**: Source SVG files, brand specifications
- **Generated**: Include in repository for build consistency
- **Ignore**: Temporary files, optimization artifacts

### Build Integration
- Assets automatically copied during build process
- Platform-specific formats generated for distribution
- Asset integrity validated before packaging

## Troubleshooting

### Common Issues

#### Icon Not Displaying
- Check file paths are correct
- Verify icon format is supported by platform
- Ensure assets are included in build output

#### Blurry Icons
- Provide appropriate size variants for target display
- Use vector formats (SVG) where possible
- Check DPI scaling on high-resolution displays

#### Build Errors
- Validate all required assets exist using `npm run validate:assets`
- Check file permissions and directory structure
- Verify icon formats meet platform requirements

### Asset Validation
```bash
# Validate all required assets exist
node scripts/generate-icons.js validate

# Check asset inventory
cat assets/asset-inventory.json | jq '.assets'
```

## Future Improvements

### Planned Enhancements
- [ ] Animated logo variant for loading screens
- [ ] Dark mode logo alternatives
- [ ] Additional icon sizes for future platforms
- [ ] Brand illustration library
- [ ] Icon automation with CI/CD pipeline

### Design System Evolution
- [ ] Expanded color palette for new features
- [ ] Typography scale refinements
- [ ] Accessibility improvements
- [ ] Brand guidelines documentation
- [ ] Asset optimization automation

---

## Support

For questions about assets, brand guidelines, or technical implementation:

- **Design**: Review brand specification files in `branding/`
- **Technical**: Check asset generation scripts in `scripts/`
- **Issues**: File bug reports for missing or incorrect assets

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: SalesHud Development Team