/**
 * SalesHud Main Process
 * Advanced Electron application with overlay window management
 */

import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  systemPreferences,
  Menu,
  Tray,
  nativeImage,
  shell,
  dialog,
  safeStorage,
  clipboard,
  Notification,
  powerMonitor,
  crashReporter,
  session
} from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { URL } from 'url';

// ============================================================================
// Type Definitions
// ============================================================================

interface MeetingConfig {
  enableTranscription: boolean;
  participants: string[];
  duration?: number;
  platform?: string;
}

interface MeetingStatus {
  state: 'idle' | 'starting' | 'active' | 'paused' | 'ending' | 'ended';
  duration: number;
  isRecording: boolean;
  isTranscribing: boolean;
  participantCount: number;
  connectionQuality: string;
  startTime?: Date;
  endTime?: Date;
}

interface OverlayConfig {
  visible: boolean;
  minimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  opacity: number;
  locked: boolean;
  alwaysOnTop: boolean;
}

interface SystemNotification {
  title: string;
  message: string;
  priority?: 'normal' | 'urgent';
}

interface AppConfig {
  appId: string;
  appName: string;
  version: string;
  environment: string;
  apiBaseUrl: string;
  wsBaseUrl: string;
  updateUrl: string;
  sentryDsn?: string;
  mixpanelToken?: string;
  features: {
    analytics: boolean;
    debugMode: boolean;
    aiInsights: boolean;
    realTimeTranscription: boolean;
    autoUpdater: boolean;
    betaFeatures: boolean;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';
//const isWindows = process.platform === 'win32';
//const isLinux = process.platform === 'linux';

// Window configurations
const WINDOW_CONFIG = {
  dashboard: {
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
  },
  overlay: {
    width: 400,
    height: 600,
    minWidth: 60,
    minHeight: 60,
    offset: { x: 20, y: 80 }
  },
  settings: {
    width: 600,
    height: 400,
    minWidth: 500,
    minHeight: 350
  }
};

// App configuration
const APP_CONFIG: AppConfig = {
  appId: 'com.saleshud.app',
  appName: 'SalesHud',
  version: app.getVersion(),
  environment: isDevelopment ? 'development' : 'production',
  apiBaseUrl: process.env.VITE_API_BASE_URL || 'https://api.saleshud.ai',
  wsBaseUrl: process.env.VITE_WS_BASE_URL || 'wss://ws.saleshud.ai',
  updateUrl: process.env.VITE_UPDATE_FEED_URL || 'https://releases.saleshud.ai',
  sentryDsn: process.env.VITE_SENTRY_DSN,
  mixpanelToken: process.env.VITE_MIXPANEL_TOKEN,
  features: {
    analytics: true,
    debugMode: isDevelopment,
    aiInsights: true,
    realTimeTranscription: true,
    autoUpdater: !isDevelopment,
    betaFeatures: false
  }
};

// ============================================================================
// Global Variables
// ============================================================================

let mainWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

let meetingStatus: MeetingStatus = {
  state: 'idle',
  duration: 0,
  isRecording: false,
  isTranscribing: false,
  participantCount: 0,
  connectionQuality: 'excellent'
};

let overlayConfig: OverlayConfig = {
  visible: true,
  minimized: false,
  position: { x: 0, y: 0 },
  size: { width: WINDOW_CONFIG.overlay.width, height: WINDOW_CONFIG.overlay.height },
  opacity: 0.95,
  locked: false,
  alwaysOnTop: true
};

// Platform detection patterns
const PLATFORM_PATTERNS = {
  zoom: /zoom\.us|zoom/i,
  teams: /teams\.microsoft|teams/i,
  meet: /meet\.google|meet/i,
  webex: /webex\.com|webex/i
};

// ============================================================================
// Crash Reporter and Logging
// ============================================================================

if (!isDevelopment && APP_CONFIG.sentryDsn) {
  crashReporter.start({
    productName: APP_CONFIG.appName,
    companyName: 'SalesHud',
    submitURL: APP_CONFIG.sentryDsn,
    uploadToServer: true,
    ignoreSystemCrashHandler: true
  });
}

// Custom logger
class Logger {
  private logPath: string;

  constructor() {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logPath = path.join(logsDir, `saleshud-${new Date().toISOString().split('T')[0]}.log`);
  }

  private write(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
    
    if (isDevelopment) {
      console.log(logEntry);
    }
    
    try {
      fs.appendFileSync(this.logPath, logEntry);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  info(message: string, data?: any) {
    this.write('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.write('WARN', message, data);
  }

  error(message: string, data?: any) {
    this.write('ERROR', message, data);
  }

  debug(message: string, data?: any) {
    if (isDevelopment) {
      this.write('DEBUG', message, data);
    }
  }
}

const logger = new Logger();

// ============================================================================
// Window Creation Functions
// ============================================================================

/**
 * Create the main dashboard window
 */
function createMainWindow(): void {
  const { width, height } = WINDOW_CONFIG.dashboard;
  const display = screen.getPrimaryDisplay();
  const bounds = display.bounds;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: Math.floor((bounds.width - width) / 2),
    y: Math.floor((bounds.height - height) / 2),
    minWidth: WINDOW_CONFIG.dashboard.minWidth,
    minHeight: WINDOW_CONFIG.dashboard.minHeight,
    show: false,
    frame: isMac,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    backgroundColor: '#0A0A0B',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDevelopment
    }
  });

  // Load the app
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Window events
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      logger.info('Main window ready');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

/**
 * Create the overlay window
 */
function createOverlayWindow(): void {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const targetDisplay = displays.find(d => d.bounds.x > 0) || primaryDisplay;
  
  const { width, height, offset } = WINDOW_CONFIG.overlay;
  const x = targetDisplay.bounds.x + targetDisplay.bounds.width - width - offset.x;
  const y = targetDisplay.bounds.y + offset.y;

  overlayWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth: WINDOW_CONFIG.overlay.minWidth,
    minHeight: WINDOW_CONFIG.overlay.minHeight,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: true,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    backgroundColor: '#00000000',
    vibrancy: isMac ? 'under-window' : undefined,
    visualEffectState: isMac ? 'active' : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false
    }
  });

  // Store initial position
  overlayConfig.position = { x, y };

  // Load overlay page
  if (isDevelopment) {
    overlayWindow.loadURL('http://localhost:3000/overlay.html');
  } else {
    overlayWindow.loadFile(path.join(__dirname, '../renderer/overlay.html'));
  }

  // Set click-through initially
  overlayWindow.setIgnoreMouseEvents(false, { forward: true });

  // Window events
  overlayWindow.on('moved', () => {
    if (overlayWindow) {
      const [x, y] = overlayWindow.getPosition();
      overlayConfig.position = { x, y };
      saveOverlayConfig();
    }
  });

  overlayWindow.on('resized', () => {
    if (overlayWindow) {
      const [width, height] = overlayWindow.getSize();
      overlayConfig.size = { width, height };
      saveOverlayConfig();
    }
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  // Adjust position based on detected platform
  adjustOverlayPosition();

  logger.info('Overlay window created', { position: { x, y } });
}

/**
 * Create the settings window
 */
function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  const parent = mainWindow || undefined;
  const { width, height } = WINDOW_CONFIG.settings;

  settingsWindow = new BrowserWindow({
    width,
    height,
    minWidth: WINDOW_CONFIG.settings.minWidth,
    minHeight: WINDOW_CONFIG.settings.minHeight,
    parent,
    modal: !!parent,
    show: false,
    frame: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    backgroundColor: '#0A0A0B',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDevelopment) {
    settingsWindow.loadURL('http://localhost:3000');
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  settingsWindow.once('ready-to-show', () => {
    if (settingsWindow) {
      settingsWindow.show();
    }
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect active meeting platform
 */
async function detectMeetingPlatform(): Promise<string | null> {
  const windows = BrowserWindow.getAllWindows();
  
  for (const window of windows) {
    const title = window.getTitle();
    const url = window.webContents.getURL();
    
    for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
      if (pattern.test(title) || pattern.test(url)) {
        logger.info(`Detected platform: ${platform}`);
        return platform;
      }
    }
  }
  
  return null;
}

/**
 * Avoid overlapping with video platform UI
 */
async function adjustOverlayPosition(): Promise<void> {
  if (!overlayWindow) return;

  const platform = await detectMeetingPlatform();
  const display = screen.getDisplayNearestPoint(overlayConfig.position);
  const { width, offset } = WINDOW_CONFIG.overlay;
  
  let x = display.bounds.x + display.bounds.width - width - offset.x;
  let y = display.bounds.y + offset.y;

  // Platform-specific adjustments
  switch (platform) {
    case 'zoom':
      y += 100; // Avoid Zoom controls
      break;
    case 'teams':
      y += 120; // Avoid Teams toolbar
      break;
    case 'meet':
      y += 80; // Avoid Meet controls
      break;
  }

  overlayWindow.setPosition(x, y);
  overlayConfig.position = { x, y };
}

// ============================================================================
// System Permissions (macOS)
// ============================================================================

/**
 * Request system permissions
 */
async function requestSystemPermissions(): Promise<void> {
  if (!isMac) return;

  try {
    // Microphone permission
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    if (micStatus === 'not-determined') {
      await systemPreferences.askForMediaAccess('microphone');
    } else if (micStatus === 'denied') {
      logger.warn('Microphone access denied');
      showPermissionDialog('microphone');
    }

    // Screen recording permission
    const screenStatus = systemPreferences.getMediaAccessStatus('screen');
    if (screenStatus === 'denied') {
      logger.warn('Screen recording access denied');
      showPermissionDialog('screen');
    }
  } catch (error) {
    logger.error('Error requesting permissions', error);
  }
}

/**
 * Show permission dialog
 */
function showPermissionDialog(type: 'microphone' | 'screen'): void {
  const message = type === 'microphone' 
    ? 'SalesHud needs microphone access for real-time transcription.'
    : 'SalesHud needs screen recording permission to display the overlay.';

  dialog.showMessageBox({
    type: 'warning',
    title: 'Permission Required',
    message,
    detail: 'Please grant permission in System Preferences > Security & Privacy',
    buttons: ['Open System Preferences', 'Later'],
    defaultId: 0
  }).then(result => {
    if (result.response === 0) {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
    }
  }).catch(error => {
    logger.error('Error showing permission dialog', error);
  });
}

// ============================================================================
// IPC Handlers
// ============================================================================

/**
 * Setup IPC communication handlers
 */
function setupIPCHandlers(): void {
  
  // Meeting management
  ipcMain.handle('meeting:start', async (_, config: MeetingConfig) => {
    try {
      meetingStatus.state = 'starting';
      logger.info('Starting meeting', config);
      
      // Request permissions if needed
      await requestSystemPermissions();
      
      // Update status
      meetingStatus = {
        ...meetingStatus,
        state: 'active',
        startTime: new Date(),
        isTranscribing: config.enableTranscription,
        participantCount: config.participants.length
      };
      
      // Show overlay if configured
      if (config.enableTranscription && overlayWindow) {
        overlayWindow.show();
        // Adjust position based on detected platform
        await adjustOverlayPosition();
      }
      
      return { success: true, status: meetingStatus };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start meeting', error);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('meeting:stop', async () => {
    try {
      meetingStatus = {
        ...meetingStatus,
        state: 'ending',
        endTime: new Date()
      };
      
      // Process and save meeting data
      await processMeetingEnd();
      
      meetingStatus.state = 'ended';
      
      return { success: true, status: meetingStatus };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to stop meeting', error);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('meeting:pause', async () => {
    meetingStatus.state = 'paused';
    meetingStatus.isTranscribing = false;
    return { success: true, status: meetingStatus };
  });

  ipcMain.handle('meeting:resume', async () => {
    meetingStatus.state = 'active';
    meetingStatus.isTranscribing = true;
    return { success: true, status: meetingStatus };
  });

  // Overlay controls
  ipcMain.handle('overlay:toggle', async () => {
    if (!overlayWindow) {
      createOverlayWindow();
      return { visible: true };
    }
    
    if (overlayWindow.isVisible()) {
      overlayWindow.hide();
      overlayConfig.visible = false;
    } else {
      overlayWindow.show();
      overlayConfig.visible = true;
    }
    
    return { visible: overlayConfig.visible };
  });

  ipcMain.handle('overlay:minimize', async () => {
    if (!overlayWindow) return { minimized: false };
    
    const { minWidth, minHeight } = WINDOW_CONFIG.overlay;
    
    if (overlayConfig.minimized) {
      overlayWindow.setSize(overlayConfig.size.width, overlayConfig.size.height);
      overlayConfig.minimized = false;
    } else {
      overlayWindow.setSize(minWidth, minHeight);
      overlayConfig.minimized = true;
    }
    
    return { minimized: overlayConfig.minimized };
  });

  ipcMain.handle('overlay:setClickThrough', async (_, enabled: boolean) => {
    if (!overlayWindow) return { clickThrough: false };
    
    overlayWindow.setIgnoreMouseEvents(enabled, { forward: true });
    overlayConfig.locked = enabled;
    
    return { clickThrough: enabled };
  });

  ipcMain.handle('overlay:setPosition', async (_, x: number, y: number) => {
    if (!overlayWindow) return { position: { x: 0, y: 0 } };
    
    overlayWindow.setPosition(x, y);
    overlayConfig.position = { x, y };
    saveOverlayConfig();
    
    return { position: { x, y } };
  });

  ipcMain.handle('overlay:setOpacity', async (_, opacity: number) => {
    if (!overlayWindow) return { opacity: 1 };
    
    const clampedOpacity = Math.max(0.3, Math.min(1, opacity));
    overlayWindow.setOpacity(clampedOpacity);
    overlayConfig.opacity = clampedOpacity;
    saveOverlayConfig();
    
    return { opacity: clampedOpacity };
  });

  // Settings management
  ipcMain.handle('settings:open', async () => {
    createSettingsWindow();
    return { success: true };
  });

  ipcMain.handle('settings:saveApiKey', async (_, service: string, key: string) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption not available');
      }
      
      const encrypted = safeStorage.encryptString(key);
      const keyPath = path.join(app.getPath('userData'), 'keys', `${service}.key`);
      
      // Ensure directory exists
      const keysDir = path.dirname(keyPath);
      if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
      }
      
      fs.writeFileSync(keyPath, encrypted);
      logger.info(`API key saved for ${service}`);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to save API key', error);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('settings:getApiKey', async (_, service: string) => {
    try {
      const keyPath = path.join(app.getPath('userData'), 'keys', `${service}.key`);
      
      if (!fs.existsSync(keyPath)) {
        return { success: false, error: 'Key not found' };
      }
      
      const encrypted = fs.readFileSync(keyPath);
      const decrypted = safeStorage.decryptString(encrypted);
      
      return { success: true, key: decrypted };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get API key', error);
      return { success: false, error: errorMessage };
    }
  });

  // System integration
  ipcMain.handle('system:notification', async (_, notification: SystemNotification) => {
    try {
      if (!Notification.isSupported()) {
        return { success: false, error: 'Notifications not supported' };
      }
      
      const notify = new Notification({
        title: notification.title,
        body: notification.message,
        silent: false,
        urgency: notification.priority === 'urgent' ? 'critical' : 'normal'
      });
      
      notify.on('click', () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
      
      notify.show();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('system:clipboard', async (_, action: 'read' | 'write', data?: string) => {
    try {
      if (action === 'write' && data) {
        clipboard.writeText(data);
        return { success: true };
      } else if (action === 'read') {
        const text = clipboard.readText();
        return { success: true, text };
      }
      return { success: false, error: 'Invalid action' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('system:info', async () => {
    try {
      return {
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        memory: process.getSystemMemoryInfo(),
        cpu: os.cpus()[0]?.model || 'Unknown',
        cores: os.cpus().length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { error: errorMessage };
    }
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Save overlay configuration
 */
function saveOverlayConfig(): void {
  const configPath = path.join(app.getPath('userData'), 'overlay-config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(overlayConfig, null, 2));
  } catch (error) {
    logger.error('Failed to save overlay config', error);
  }
}

/**
 * Load overlay configuration
 */
function loadOverlayConfig(): void {
  const configPath = path.join(app.getPath('userData'), 'overlay-config.json');
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      overlayConfig = { ...overlayConfig, ...JSON.parse(data) };
    }
  } catch (error) {
    logger.error('Failed to load overlay config', error);
  }
}

/**
 * Process meeting end
 */
async function processMeetingEnd(): Promise<void> {
  // Save meeting data, generate summary, etc.
  logger.info('Processing meeting end');
  // Implementation would go here
}

// ============================================================================
// Menu and Tray
// ============================================================================

/**
 * Create application menu
 */
function createMenu(): void {
  const template: any[] = [
    {
      label: 'SalesHud',
      submenu: [
        { label: 'About SalesHud', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences', accelerator: 'Cmd+,', click: () => createSettingsWindow() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Cmd+Q', role: 'quit' }
      ]
    },
    {
      label: 'Meeting',
      submenu: [
        { label: 'Start Meeting', accelerator: 'Cmd+M', click: () => mainWindow?.webContents.send('menu:startMeeting') },
        { label: 'Stop Meeting', accelerator: 'Cmd+Shift+M', click: () => mainWindow?.webContents.send('menu:stopMeeting') },
        { type: 'separator' },
        { label: 'Toggle Overlay', accelerator: 'Cmd+Shift+H', click: () => ipcMain.emit('overlay:toggle') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Cmd+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'Cmd+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'Cmd+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'Cmd+-', role: 'zoomOut' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Create system tray
 */
function createTray(): void {
  try {
    const iconPath = path.join(__dirname, '../../assets/icons/tray-icon.png');
    
    // Check if icon exists, use default if not
    let icon: Electron.NativeImage;
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    } else {
      icon = nativeImage.createEmpty();
    }
    
    tray = new Tray(icon);
    tray.setToolTip('SalesHud');
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Dashboard', click: () => mainWindow?.show() },
      { label: 'Toggle Overlay', click: () => ipcMain.emit('overlay:toggle') },
      { type: 'separator' },
      { label: 'Start Meeting', click: () => mainWindow?.webContents.send('menu:startMeeting') },
      { label: 'Stop Meeting', click: () => mainWindow?.webContents.send('menu:stopMeeting') },
      { type: 'separator' },
      { label: 'Settings', click: () => createSettingsWindow() },
      { label: 'Quit', click: () => app.quit() }
    ]);
    
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      }
    });
  } catch (error) {
    logger.error('Failed to create tray', error);
  }
}

// ============================================================================
// Global Shortcuts
// ============================================================================

/**
 * Register global shortcuts
 */
function registerGlobalShortcuts(): void {
  try {
    // Toggle overlay
    globalShortcut.register('CommandOrControl+Shift+H', () => {
      ipcMain.emit('overlay:toggle');
    });
    
    // Quick start/stop meeting
    globalShortcut.register('CommandOrControl+Shift+M', () => {
      if (meetingStatus.state === 'active') {
        mainWindow?.webContents.send('menu:stopMeeting');
      } else {
        mainWindow?.webContents.send('menu:startMeeting');
      }
    });
    
    logger.info('Global shortcuts registered');
  } catch (error) {
    logger.error('Failed to register global shortcuts', error);
  }
}

// ============================================================================
// Auto Updater
// ============================================================================

/**
 * Setup auto updater
 */
function setupAutoUpdater(): void {
  if (isDevelopment || !APP_CONFIG.features.autoUpdater) return;
  
  try {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // Check for updates
    autoUpdater.checkForUpdates();
    
    // Auto updater events
    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for updates');
    });
    
    autoUpdater.on('update-available', (info) => {
      logger.info('Update available', info);
      
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. Would you like to download it?`,
        buttons: ['Download', 'Later'],
        defaultId: 0
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      }).catch(error => {
        logger.error('Error showing update dialog', error);
      });
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Update downloaded', info);
      
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update has been downloaded. Restart to apply?',
        buttons: ['Restart', 'Later'],
        defaultId: 0
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      }).catch(error => {
        logger.error('Error showing restart dialog', error);
      });
    });
    
    autoUpdater.on('error', (error) => {
      logger.error('Auto updater error', error);
    });
    
    // Check for updates periodically
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 1000 * 60 * 60 * 4); // Every 4 hours
  } catch (error) {
    logger.error('Failed to setup auto updater', error);
  }
}

// ============================================================================
// Deep Links
// ============================================================================

/**
 * Setup deep link handling
 */
function setupDeepLinks(): void {
  try {
    // Register protocol
    if (!app.isDefaultProtocolClient('saleshud')) {
      app.setAsDefaultProtocolClient('saleshud');
    }
    
    // Handle protocol on Windows/Linux
    app.on('second-instance', (_, commandLine) => {
      // Focus existing window
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
      
      // Parse deep link
      const url = commandLine.find(arg => arg.startsWith('saleshud://'));
      if (url) {
        handleDeepLink(url);
      }
    });
    
    // Handle protocol on macOS
    app.on('open-url', (event, url) => {
      event.preventDefault();
      handleDeepLink(url);
    });
  } catch (error) {
    logger.error('Failed to setup deep links', error);
  }
}

/**
 * Handle deep link
 */
function handleDeepLink(url: string): void {
  logger.info('Handling deep link', url);
  
  try {
    const parsed = new URL(url);
    const action = parsed.hostname;
    const params = Object.fromEntries(parsed.searchParams);
    
    switch (action) {
      case 'meeting':
        mainWindow?.webContents.send('deeplink:meeting', params);
        break;
      case 'settings':
        createSettingsWindow();
        break;
      default:
        logger.warn('Unknown deep link action', action);
    }
  } catch (error) {
    logger.error('Failed to parse deep link', error);
  }
}

// ============================================================================
// App Event Handlers
// ============================================================================

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  
  // App ready
  app.whenReady().then(async () => {
    logger.info('App starting', { version: app.getVersion(), platform: process.platform });
    
    try {
      // Load configurations
      loadOverlayConfig();
      
      // Setup security
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https:"]
          }
        });
      });
      
      // Create windows
      createMainWindow();
      createOverlayWindow();
      
      // Setup system
      createMenu();
      createTray();
      registerGlobalShortcuts();
      setupIPCHandlers();
      setupAutoUpdater();
      setupDeepLinks();
      
      // Request permissions
      await requestSystemPermissions();
      
      // Monitor power events
      powerMonitor.on('suspend', () => {
        logger.info('System suspended');
        if (meetingStatus.state === 'active') {
          mainWindow?.webContents.send('system:suspended');
        }
      });
      
      powerMonitor.on('resume', () => {
        logger.info('System resumed');
        if (meetingStatus.state === 'active') {
          mainWindow?.webContents.send('system:resumed');
        }
      });
    } catch (error) {
      logger.error('Error during app initialization', error);
    }
  }).catch(error => {
    logger.error('Failed to initialize app', error);
  });
  
  // Window all closed
  app.on('window-all-closed', () => {
    if (!isMac) {
      app.quit();
    }
  });
  
  // Activate (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
  
  // Before quit
  app.on('before-quit', () => {
    logger.info('App quitting');
    globalShortcut.unregisterAll();
  });
  
  // Will quit
  app.on('will-quit', (event) => {
    if (meetingStatus.state === 'active') {
      event.preventDefault();
      
      dialog.showMessageBox({
        type: 'warning',
        title: 'Meeting in Progress',
        message: 'A meeting is currently active. Are you sure you want to quit?',
        buttons: ['Quit', 'Cancel'],
        defaultId: 1
      }).then(result => {
        if (result.response === 0) {
          meetingStatus.state = 'ended';
          app.quit();
        }
      }).catch(error => {
        logger.error('Error showing quit dialog', error);
      });
    }
  });
}

// ============================================================================
// Export
// ============================================================================

export { app, mainWindow, overlayWindow };