/**
 * Electron Builder Configuration
 * Handles app packaging and distribution for all platforms
 */

const { version } = require('./package.json');

module.exports = {
  appId: 'com.saleshud.app',
  productName: 'SalesHud',
  
  // Build directories
  directories: {
    output: 'release',
    buildResources: 'build'
  },
  
  // Files to include in the app
  files: [
    'dist/**/*',
    'node_modules/**/*',
    '!node_modules/@types',
    '!node_modules/typescript',
    '!node_modules/webpack*',
    '!node_modules/@babel',
    '!node_modules/eslint*',
    '!node_modules/postcss*',
    '!node_modules/tailwindcss',
    '!**/*.map',
    '!**/*.ts',
    '!**/*.tsx',
    '!**/tsconfig.json',
    '!**/webpack.*.js'
  ],
  
  // App metadata
  copyright: `Copyright © ${new Date().getFullYear()} SalesHud`,
  
  // Auto-updater configuration
  publish: {
    provider: 'github',
    owner: 'saleshud',
    repo: 'saleshud-app',
    private: false
  },
  
  // Compression and optimization
  compression: 'maximum',
  
  // macOS configuration
  mac: {
    category: 'public.app-category.business',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'build/icon.icns',
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: process.env.NOTARIZE === 'true' ? {
      teamId: process.env.APPLE_TEAM_ID
    } : false,
    extendInfo: {
      NSCameraUsageDescription: 'SalesHud uses camera for video calls and screen sharing',
      NSMicrophoneUsageDescription: 'SalesHud uses microphone for voice calls and transcription',
      NSScreenCaptureDescription: 'SalesHud captures screen content for meeting analysis',
      LSMultipleInstancesProhibited: true
    }
  },
  
  // DMG configuration for macOS
  dmg: {
    title: '${productName} ${version}',
    icon: 'build/icon.icns',
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ],
    window: {
      width: 540,
      height: 380
    },
    format: 'ULFO', // Use UDRW for better compatibility if needed
    backgroundColor: '#1e293b'
  },
  
  // Windows configuration
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      },
      {
        target: 'portable',
        arch: ['x64']
      },
      {
        target: 'zip',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.ico',
    publisherName: 'SalesHud Inc.',
    verifyUpdateCodeSignature: false,
    requestedExecutionLevel: 'asInvoker',
    artifactName: '${productName}-${version}-${os}-${arch}.${ext}'
  },
  
  // NSIS installer configuration for Windows
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'SalesHud',
    include: 'build/installer.nsh',
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico',
    displayLanguageSelector: false,
    installerLanguages: ['en_US'],
    license: 'LICENSE',
    warningsAsErrors: false
  },
  
  // Linux configuration
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      },
      {
        target: 'rpm',
        arch: ['x64']
      },
      {
        target: 'tar.gz',
        arch: ['x64']
      }
    ],
    icon: 'build/icons/',
    category: 'Office',
    desktop: {
      StartupWMClass: 'SalesHud',
      Keywords: 'Sales;CRM;Meeting;AI;Analysis'
    },
    executableArgs: ['--no-sandbox']
  },
  
  // AppImage configuration for Linux
  appImage: {
    license: 'LICENSE',
    category: 'Office',
    synopsis: 'AI-Powered Sales Intelligence Platform'
  },
  
  // Debian package configuration
  deb: {
    priority: 'optional',
    depends: [
      'gconf2',
      'gconf-service',
      'libnotify4',
      'libappindicator1',
      'libxtst6',
      'libnss3',
      'libxss1',
      'libasound2'
    ]
  },
  
  // RPM package configuration
  rpm: {
    depends: [
      'libXScrnSaver',
      'libnotify',
      'libnss3'
    ]
  },
  
  // Build hooks for custom processing
  beforeBuild: async (context) => {
    console.log('📦 Preparing build...');
    
    // Ensure all required build assets exist
    const requiredAssets = [
      'build/icon.icns',
      'build/icon.ico',
      'build/icons/'
    ];
    
    // You can add custom validation here
    return true;
  },
  
  afterSign: async (context) => {
    // macOS notarization would go here
    if (process.platform === 'darwin' && process.env.NOTARIZE === 'true') {
      console.log('🔐 Notarizing macOS build...');
      // Notarization logic would be implemented here
    }
  },
  
  afterPack: async (context) => {
    console.log('📋 Post-processing build...');
    // Additional processing after packaging
  },
  
  // Security configuration
  protocols: [
    {
      name: 'SalesHud Protocol',
      schemes: ['saleshud']
    }
  ],
  
  // File associations (disabled until icons are available)
  // fileAssociations: [
  //   {
  //     ext: 'shud',
  //     name: 'SalesHud Meeting File',
  //     description: 'SalesHud Meeting Recording and Analysis',
  //     icon: 'build/file-icon.ico',
  //     role: 'Editor'
  //   }
  // ],
  
  // Custom build options
  extraMetadata: {
    main: 'dist/main/main.js'
  },
  
  // Environment-specific overrides
  ...(process.env.NODE_ENV === 'development' && {
    // Development overrides
    compression: 'store', // Faster builds
    nsis: {
      ...module.exports?.nsis,
      differentialPackage: false
    }
  }),
  
  // Platform-specific build scripts
  npmRebuild: false, // We handle this manually
  
  // Build artifacts naming
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  
  // Snap configuration (Linux)
  snap: {
    grade: 'stable',
    confinement: 'strict',
    base: 'core20',
    plugs: [
      'default',
      'audio-playback',
      'audio-record',
      'camera',
      'desktop',
      'desktop-legacy',
      'home',
      'network',
      'network-bind',
      'pulseaudio',
      'removable-media',
      'screen-inhibit-control',
      'unity7',
      'wayland',
      'x11'
    ],
    environment: {
      DISABLE_WAYLAND: '1'
    }
  }
};