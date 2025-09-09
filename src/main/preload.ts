/**
 * SalesHud Preload Script
 * Exposes comprehensive APIs to the renderer process using contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import type {
  MeetingConfig,
  MeetingStatus,
  SessionData,
  EmailData,
  FollowUpType,
  EventData,
  ActionItem,
  MeetingSummary,
  BuyingSignal,
  NextStep,
  TranscriptEntry,
  AIInsight,
  ApiKeyConfig,
  CRMData,
  SystemInfo,
  NotificationType
} from '../types';

// ============================================================================
// Meeting Management APIs
// ============================================================================

const meetingAPI = {
  /**
   * Start meeting analysis with configuration
   */
  async startMeetingAnalysis(meetingData: MeetingConfig): Promise<boolean> {
    try {
      const result = await ipcRenderer.invoke('meeting:start-analysis', meetingData);
      return result.success || false;
    } catch (error) {
      console.error('Failed to start meeting analysis:', error);
      return false;
    }
  },

  /**
   * Stop current meeting analysis
   */
  async stopMeetingAnalysis(): Promise<void> {
    try {
      await ipcRenderer.invoke('meeting:stop-analysis');
    } catch (error) {
      console.error('Failed to stop meeting analysis:', error);
      throw error;
    }
  },

  /**
   * Pause transcription temporarily
   */
  async pauseTranscription(): Promise<void> {
    try {
      await ipcRenderer.invoke('meeting:pause-transcription');
    } catch (error) {
      console.error('Failed to pause transcription:', error);
      throw error;
    }
  },

  /**
   * Resume paused transcription
   */
  async resumeTranscription(): Promise<void> {
    try {
      await ipcRenderer.invoke('meeting:resume-transcription');
    } catch (error) {
      console.error('Failed to resume transcription:', error);
      throw error;
    }
  },

  /**
   * Get current meeting status
   */
  async getMeetingStatus(): Promise<MeetingStatus> {
    try {
      return await ipcRenderer.invoke('meeting:get-status');
    } catch (error) {
      console.error('Failed to get meeting status:', error);
      throw error;
    }
  },

  /**
   * Save meeting session data
   */
  async saveMeetingSession(sessionData: SessionData): Promise<string> {
    try {
      const result = await ipcRenderer.invoke('meeting:save-session', sessionData);
      return result.sessionId || '';
    } catch (error) {
      console.error('Failed to save meeting session:', error);
      throw error;
    }
  }
};

// ============================================================================
// Overlay Controls APIs
// ============================================================================

const overlayAPI = {
  /**
   * Toggle overlay display mode
   */
  async toggleOverlayMode(mode: 'minimal' | 'compact' | 'full'): Promise<void> {
    try {
      await ipcRenderer.invoke('overlay:toggle-mode', mode);
    } catch (error) {
      console.error('Failed to toggle overlay mode:', error);
      throw error;
    }
  },

  /**
   * Set overlay position
   */
  async setOverlayPosition(x: number, y: number): Promise<void> {
    try {
      await ipcRenderer.invoke('overlay:set-position', { x, y });
    } catch (error) {
      console.error('Failed to set overlay position:', error);
      throw error;
    }
  },

  /**
   * Toggle click-through mode
   */
  async toggleClickThrough(enabled: boolean): Promise<void> {
    try {
      await ipcRenderer.invoke('overlay:toggle-click-through', enabled);
    } catch (error) {
      console.error('Failed to toggle click-through:', error);
      throw error;
    }
  },

  /**
   * Show specific overlay panel
   */
  async showOverlayPanel(panel: 'crm' | 'notes' | 'insights'): Promise<void> {
    try {
      await ipcRenderer.invoke('overlay:show-panel', panel);
    } catch (error) {
      console.error('Failed to show overlay panel:', error);
      throw error;
    }
  },

  /**
   * Hide specific overlay panel
   */
  async hideOverlayPanel(panel: string): Promise<void> {
    try {
      await ipcRenderer.invoke('overlay:hide-panel', panel);
    } catch (error) {
      console.error('Failed to hide overlay panel:', error);
      throw error;
    }
  },

  /**
   * Minimize overlay window
   */
  async minimizeOverlay(): Promise<void> {
    try {
      await ipcRenderer.invoke('overlay:minimize');
    } catch (error) {
      console.error('Failed to minimize overlay:', error);
      throw error;
    }
  },

  /**
   * Restore minimized overlay
   */
  async restoreOverlay(): Promise<void> {
    try {
      await ipcRenderer.invoke('overlay:restore');
    } catch (error) {
      console.error('Failed to restore overlay:', error);
      throw error;
    }
  }
};

// ============================================================================
// Smart Features APIs
// ============================================================================

const smartAPI = {
  /**
   * Generate email proposal based on meeting
   */
  async generateEmailProposal(meetingId: string): Promise<EmailData> {
    try {
      return await ipcRenderer.invoke('smart:generate-email-proposal', meetingId);
    } catch (error) {
      console.error('Failed to generate email proposal:', error);
      throw error;
    }
  },

  /**
   * Schedule follow-up meeting
   */
  async scheduleFollowUp(type: FollowUpType, datetime: Date): Promise<EventData> {
    try {
      return await ipcRenderer.invoke('smart:schedule-follow-up', { type, datetime });
    } catch (error) {
      console.error('Failed to schedule follow-up:', error);
      throw error;
    }
  },

  /**
   * Extract action items from current session
   */
  async extractActionItems(): Promise<ActionItem[]> {
    try {
      return await ipcRenderer.invoke('smart:extract-action-items');
    } catch (error) {
      console.error('Failed to extract action items:', error);
      return [];
    }
  },

  /**
   * Generate comprehensive meeting summary
   */
  async generateMeetingSummary(): Promise<MeetingSummary> {
    try {
      return await ipcRenderer.invoke('smart:generate-meeting-summary');
    } catch (error) {
      console.error('Failed to generate meeting summary:', error);
      throw error;
    }
  },

  /**
   * Detect buying signals from conversation
   */
  async detectBuyingSignals(): Promise<BuyingSignal[]> {
    try {
      return await ipcRenderer.invoke('smart:detect-buying-signals');
    } catch (error) {
      console.error('Failed to detect buying signals:', error);
      return [];
    }
  },

  /**
   * Get AI-suggested next steps
   */
  async suggestNextSteps(): Promise<NextStep[]> {
    try {
      return await ipcRenderer.invoke('smart:suggest-next-steps');
    } catch (error) {
      console.error('Failed to suggest next steps:', error);
      return [];
    }
  }
};

// ============================================================================
// Data Management APIs
// ============================================================================

const dataAPI = {
  /**
   * Save API keys securely
   */
  async saveApiKeys(keys: ApiKeyConfig): Promise<boolean> {
    try {
      const result = await ipcRenderer.invoke('data:save-api-keys', keys);
      return result.success || false;
    } catch (error) {
      console.error('Failed to save API keys:', error);
      return false;
    }
  },

  /**
   * Retrieve stored API keys
   */
  async getStoredApiKeys(): Promise<ApiKeyConfig> {
    try {
      return await ipcRenderer.invoke('data:get-stored-api-keys');
    } catch (error) {
      console.error('Failed to get stored API keys:', error);
      return {};
    }
  },

  /**
   * Sync data from CRM source
   */
  async syncCRMData(source: string): Promise<CRMData> {
    try {
      return await ipcRenderer.invoke('data:sync-crm-data', source);
    } catch (error) {
      console.error('Failed to sync CRM data:', error);
      throw error;
    }
  },

  /**
   * Export meeting data in specified format
   */
  async exportMeetingData(format: 'pdf' | 'json'): Promise<string> {
    try {
      const result = await ipcRenderer.invoke('data:export-meeting-data', format);
      return result.filePath || '';
    } catch (error) {
      console.error('Failed to export meeting data:', error);
      throw error;
    }
  }
};

// ============================================================================
// Real-time Events APIs
// ============================================================================

const eventsAPI = {
  /**
   * Listen for transcript updates
   */
  onTranscriptUpdate(callback: (data: TranscriptEntry) => void): () => void {
    const listener = (_event: any, data: TranscriptEntry) => callback(data);
    ipcRenderer.on('transcript:update', listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('transcript:update', listener);
    };
  },

  /**
   * Listen for AI insights
   */
  onInsightGenerated(callback: (insight: AIInsight) => void): () => void {
    const listener = (_event: any, insight: AIInsight) => callback(insight);
    ipcRenderer.on('insight:generated', listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('insight:generated', listener);
    };
  },

  /**
   * Listen for meeting time updates
   */
  onMeetingTimeUpdate(callback: (timeLeft: number) => void): () => void {
    const listener = (_event: any, timeLeft: number) => callback(timeLeft);
    ipcRenderer.on('meeting:time-update', listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('meeting:time-update', listener);
    };
  },

  /**
   * Listen for buying signal detection
   */
  onBuyingSignalDetected(callback: (signal: BuyingSignal) => void): () => void {
    const listener = (_event: any, signal: BuyingSignal) => callback(signal);
    ipcRenderer.on('buying-signal:detected', listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('buying-signal:detected', listener);
    };
  },

  /**
   * Listen for action item identification
   */
  onActionItemIdentified(callback: (item: ActionItem) => void): () => void {
    const listener = (_event: any, item: ActionItem) => callback(item);
    ipcRenderer.on('action-item:identified', listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('action-item:identified', listener);
    };
  }
};

// ============================================================================
// System Integration APIs
// ============================================================================

const systemAPI = {
  /**
   * Show system notification
   */
  async showNotification(message: string, type: NotificationType = 'info'): Promise<void> {
    try {
      await ipcRenderer.invoke('system:show-notification', { message, type });
    } catch (error) {
      console.error('Failed to show notification:', error);
      throw error;
    }
  },

  /**
   * Open external link in default browser
   */
  async openExternalLink(url: string): Promise<void> {
    try {
      await ipcRenderer.invoke('system:open-external-link', url);
    } catch (error) {
      console.error('Failed to open external link:', error);
      throw error;
    }
  },

  /**
   * Copy text to system clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      const result = await ipcRenderer.invoke('system:copy-to-clipboard', text);
      return result.success || false;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  },

  /**
   * Save file to user's system
   */
  async saveFile(filename: string, content: string): Promise<string> {
    try {
      const result = await ipcRenderer.invoke('system:save-file', { filename, content });
      return result.filePath || '';
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  },

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      return await ipcRenderer.invoke('system:get-system-info');
    } catch (error) {
      console.error('Failed to get system info:', error);
      throw error;
    }
  }
};

// ============================================================================
// Expose APIs to Renderer Process
// ============================================================================

/**
 * Main Electron API object exposed to renderer process
 * Contains all functionality needed for SalesHud application
 */
const electronAPI = {
  // Meeting Management
  meeting: meetingAPI,
  
  // Overlay Controls
  overlay: overlayAPI,
  
  // Smart Features
  smart: smartAPI,
  
  // Data Management
  data: dataAPI,
  
  // Real-time Events
  events: eventsAPI,
  
  // System Integration
  system: systemAPI,

  // Utility Methods
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // Version information
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  
  // App control
  quit: () => ipcRenderer.invoke('app:quit'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  unmaximize: () => ipcRenderer.invoke('app:unmaximize'),
  close: () => ipcRenderer.invoke('app:close'),
  
  // Window state
  isMaximized: () => ipcRenderer.invoke('app:is-maximized'),
  isMinimized: () => ipcRenderer.invoke('app:is-minimized'),
  
  // Development helpers
  openDevTools: () => ipcRenderer.invoke('app:open-dev-tools'),
  reloadApp: () => ipcRenderer.invoke('app:reload'),
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Also expose the types for TypeScript support in renderer
export type ElectronAPI = typeof electronAPI;

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in preload script:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection in preload script:', reason, 'at promise', promise);
});

// Log successful preload script initialization
console.log('SalesHud preload script loaded successfully');