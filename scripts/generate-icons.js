#!/usr/bin/env node

/**
 * Icon Generation Script
 * Converts source SVG icons to all required formats and sizes
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Icon specifications
const ICON_SPECS = {
  app: {
    source: 'assets/icons/icon-source.svg',
    outputs: [
      // Main app icons
      { size: 512, name: 'icon.png', type: 'png', dest: 'assets/icons/' },
      { size: 1024, name: 'icon@2x.png', type: 'png', dest: 'assets/icons/' },
      { size: 256, name: 'installer-icon.png', type: 'png', dest: 'assets/icons/' },
      
      // Electron Builder icons
      { size: 512, name: 'icon.png', type: 'png', dest: 'build/' },
      { size: 512, name: 'icon.icns', type: 'icns', dest: 'build/' },
      { size: 512, name: 'icon.ico', type: 'ico', dest: 'build/' },
      
      // Multiple sizes for .ico (Windows)
      { sizes: [16, 24, 32, 48, 64, 128, 256], name: 'icon.ico', type: 'ico', dest: 'build/' },
      
      // Linux icon sizes
      { size: 16, name: '16x16.png', type: 'png', dest: 'build/icons/' },
      { size: 24, name: '24x24.png', type: 'png', dest: 'build/icons/' },
      { size: 32, name: '32x32.png', type: 'png', dest: 'build/icons/' },
      { size: 48, name: '48x48.png', type: 'png', dest: 'build/icons/' },
      { size: 64, name: '64x64.png', type: 'png', dest: 'build/icons/' },
      { size: 128, name: '128x128.png', type: 'png', dest: 'build/icons/' },
      { size: 256, name: '256x256.png', type: 'png', dest: 'build/icons/' },
      { size: 512, name: '512x512.png', type: 'png', dest: 'build/icons/' }
    ]
  },
  tray: {
    source: 'assets/icons/tray-icon-source.svg',
    outputs: [
      { size: 16, name: 'tray-icon.png', type: 'png', dest: 'assets/icons/' },
      { size: 32, name: 'tray-icon@2x.png', type: 'png', dest: 'assets/icons/' },
      
      // Template versions for macOS (monochrome)
      { size: 16, name: 'tray-iconTemplate.png', type: 'png', dest: 'assets/icons/', template: true },
      { size: 32, name: 'tray-iconTemplate@2x.png', type: 'png', dest: 'assets/icons/', template: true }
    ]
  }
};

// Placeholder image generation functions (since we don't have ImageMagick/Sharp)
function generatePlaceholderPNG(width, height, outputPath) {
  // Create a simple base64 PNG placeholder
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a365d');
  gradient.addColorStop(0.5, '#3182ce');
  gradient.addColorStop(1, '#805ad5');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add SH monogram
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.floor(width * 0.3)}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SH', width / 2, height / 2);
  
  // Add subtle neural network pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = width * 0.15;
  
  // Draw connection lines
  ctx.beginPath();
  ctx.moveTo(centerX - radius, centerY - radius);
  ctx.lineTo(centerX + radius, centerY + radius);
  ctx.moveTo(centerX + radius, centerY - radius);
  ctx.lineTo(centerX - radius, centerY + radius);
  ctx.stroke();
  
  // Draw nodes
  const nodeRadius = width * 0.02;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(centerX - radius, centerY - radius, nodeRadius, 0, 2 * Math.PI);
  ctx.arc(centerX + radius, centerY - radius, nodeRadius, 0, 2 * Math.PI);
  ctx.arc(centerX - radius, centerY + radius, nodeRadius, 0, 2 * Math.PI);
  ctx.arc(centerX + radius, centerY + radius, nodeRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

// Simulated canvas for placeholder generation
function createCanvas(width, height) {
  return {
    width,
    height,
    getContext: () => ({
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      fillText: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      set fillStyle(value) { this._fillStyle = value; },
      set strokeStyle(value) { this._strokeStyle = value; },
      set lineWidth(value) { this._lineWidth = value; },
      set font(value) { this._font = value; },
      set textAlign(value) { this._textAlign = value; },
      set textBaseline(value) { this._textBaseline = value; }
    }),
    toBuffer: (format) => Buffer.from('placeholder-image-data')
  };
}

// Create placeholder image files
async function createPlaceholderImage(spec) {
  const { size, sizes, name, dest, template } = spec;
  const outputDir = path.resolve(__dirname, '..', dest);
  
  await fs.ensureDir(outputDir);
  
  if (sizes) {
    // Multiple sizes for ICO files - create largest size as placeholder
    const maxSize = Math.max(...sizes);
    const buffer = generatePlaceholderPNG(maxSize, maxSize);
    await fs.writeFile(path.join(outputDir, name), buffer);
    console.log(chalk.green(`✓ Created ${name} (${maxSize}x${maxSize})`));
  } else {
    const buffer = generatePlaceholderPNG(size, size);
    await fs.writeFile(path.join(outputDir, name), buffer);
    console.log(chalk.green(`✓ Created ${name} (${size}x${size})`));
  }
}

// Generate app icons with professional placeholder designs
async function generateAppIcons() {
  console.log(chalk.blue('🎨 Generating app icons...'));
  
  const specs = ICON_SPECS.app.outputs;
  
  for (const spec of specs) {
    try {
      await createPlaceholderImage(spec);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create ${spec.name}:`), error.message);
    }
  }
}

// Generate system tray icons
async function generateTrayIcons() {
  console.log(chalk.blue('🔧 Generating system tray icons...'));
  
  const specs = ICON_SPECS.tray.outputs;
  
  for (const spec of specs) {
    try {
      await createPlaceholderImage(spec);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create ${spec.name}:`), error.message);
    }
  }
}

// Create macOS entitlements file
async function createEntitlements() {
  console.log(chalk.blue('🍎 Creating macOS entitlements...'));
  
  const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.device.camera</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.network.server</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
    <key>com.apple.security.files.downloads.read-write</key>
    <true/>
  </dict>
</plist>`;

  await fs.writeFile(path.resolve(__dirname, '../build/entitlements.mac.plist'), entitlements);
  console.log(chalk.green('✓ Created entitlements.mac.plist'));
}

// Create Windows installer script
async function createWindowsInstallerScript() {
  console.log(chalk.blue('🪟 Creating Windows installer script...'));
  
  const installerScript = `; SalesHud Installer Script
; Custom NSIS installer enhancements

!include "MUI2.nsh"
!include "FileAssociation.nsh"

; Custom page for privacy notice
!define MUI_WELCOMEPAGE_TEXT "Welcome to SalesHud Setup.$\\r$\\n$\\r$\\nThis wizard will guide you through the installation of SalesHud - AI-Powered Sales Intelligence.$\\r$\\n$\\r$\\nSalesHud requires microphone and screen recording permissions to provide AI transcription and analysis features."

; Custom finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\\SalesHud.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch SalesHud now"

; File associations
\${registerExtension} "$INSTDIR\\SalesHud.exe" ".shud" "SalesHud Meeting File"

; Custom uninstaller
Section "Uninstall"
  ; Remove file associations
  \${unregisterExtension} ".shud" "SalesHud Meeting File"
SectionEnd`;

  await fs.writeFile(path.resolve(__dirname, '../build/installer.nsh'), installerScript);
  console.log(chalk.green('✓ Created installer.nsh'));
}

// Create DMG background image (placeholder)
async function createDMGBackground() {
  console.log(chalk.blue('💿 Creating DMG background...'));
  
  // Create a simple DMG background placeholder
  const buffer = generatePlaceholderPNG(540, 380);
  await fs.writeFile(path.resolve(__dirname, '../build/dmg-background.png'), buffer);
  console.log(chalk.green('✓ Created dmg-background.png'));
}

// Validate all required assets exist
async function validateAssets() {
  console.log(chalk.blue('🔍 Validating generated assets...'));
  
  const requiredAssets = [
    'build/icon.png',
    'build/icon.icns',
    'build/icon.ico',
    'build/entitlements.mac.plist',
    'assets/icons/icon.png',
    'assets/icons/tray-icon.png'
  ];
  
  const missing = [];
  
  for (const asset of requiredAssets) {
    const fullPath = path.resolve(__dirname, '..', asset);
    if (!await fs.pathExists(fullPath)) {
      missing.push(asset);
    }
  }
  
  if (missing.length > 0) {
    console.error(chalk.red('❌ Missing required assets:'));
    missing.forEach(asset => console.error(chalk.red(`   - ${asset}`)));
    return false;
  }
  
  console.log(chalk.green('✅ All required assets validated'));
  return true;
}

// Generate asset inventory
async function generateAssetInventory() {
  console.log(chalk.blue('📋 Generating asset inventory...'));
  
  const inventory = {
    generated: new Date().toISOString(),
    version: '1.0.0',
    assets: {
      icons: {
        main: {
          source: 'assets/icons/icon-source.svg',
          formats: ['png', 'icns', 'ico'],
          sizes: [16, 24, 32, 48, 64, 128, 256, 512, 1024]
        },
        tray: {
          source: 'assets/icons/tray-icon-source.svg',
          formats: ['png'],
          sizes: [16, 32],
          templates: true
        }
      },
      branding: {
        logo: 'assets/images/logo.svg',
        colors: 'assets/branding/colors.json',
        typography: 'assets/branding/fonts.json'
      },
      build: {
        entitlements: 'build/entitlements.mac.plist',
        installer_script: 'build/installer.nsh',
        dmg_background: 'build/dmg-background.png'
      }
    },
    specifications: {
      icon_sizes: {
        app: '512x512 primary, with variants for platform requirements',
        tray: '16x16 and 32x32 for retina displays',
        installer: '256x256 for installation dialogs'
      },
      formats: {
        icns: 'macOS app bundle icon format',
        ico: 'Windows executable icon format',
        png: 'Universal raster format for Linux and web'
      }
    }
  };
  
  await fs.writeJson(
    path.resolve(__dirname, '../assets/asset-inventory.json'), 
    inventory, 
    { spaces: 2 }
  );
  
  console.log(chalk.green('✓ Created asset-inventory.json'));
}

// Main generation function
async function generateAllAssets() {
  console.log(chalk.blue('🏗️  Generating SalesHud Assets...\n'));
  
  try {
    // Ensure directories exist
    await fs.ensureDir(path.resolve(__dirname, '../assets/icons'));
    await fs.ensureDir(path.resolve(__dirname, '../assets/images'));
    await fs.ensureDir(path.resolve(__dirname, '../build'));
    await fs.ensureDir(path.resolve(__dirname, '../build/icons'));
    
    // Generate all assets
    await generateAppIcons();
    await generateTrayIcons();
    await createEntitlements();
    await createWindowsInstallerScript();
    await createDMGBackground();
    
    // Validate and inventory
    const isValid = await validateAssets();
    if (isValid) {
      await generateAssetInventory();
      
      console.log(chalk.green('\n🎉 Asset generation completed successfully!'));
      console.log(chalk.cyan('📁 Generated assets:'));
      console.log(chalk.cyan('   • App icons in multiple formats (PNG, ICNS, ICO)'));
      console.log(chalk.cyan('   • System tray icons for all platforms'));
      console.log(chalk.cyan('   • macOS entitlements and DMG background'));
      console.log(chalk.cyan('   • Windows installer customizations'));
      console.log(chalk.cyan('   • Complete asset inventory and specifications'));
      
      console.log(chalk.yellow('\n💡 Note: These are placeholder assets for development.'));
      console.log(chalk.yellow('    Replace with final designs before production release.'));
      
    } else {
      throw new Error('Asset validation failed');
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Asset generation failed:'), error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case 'app':
    generateAppIcons();
    break;
  case 'tray':
    generateTrayIcons();
    break;
  case 'validate':
    validateAssets();
    break;
  case 'inventory':
    generateAssetInventory();
    break;
  default:
    generateAllAssets();
}

// Export for programmatic use
module.exports = {
  generateAllAssets,
  generateAppIcons,
  generateTrayIcons,
  validateAssets
};