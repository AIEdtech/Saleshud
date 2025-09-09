/**
 * Global TypeScript declarations for Electron APIs
 * This file provides type safety for the electronAPI exposed via contextBridge
 */

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
} from './index';

/**
 * Meeting Management API interface
 */
interface MeetingAPI {
  startMeetingAnalysis(meetingData: MeetingConfig): Promise<boolean>;
  stopMeetingAnalysis(): Promise<void>;
  pauseTranscription(): Promise<void>;
  resumeTranscription(): Promise<void>;
  getMeetingStatus(): Promise<MeetingStatus>;
  saveMeetingSession(sessionData: SessionData): Promise<string>;
}

/**
 * Overlay Controls API interface
 */
interface OverlayAPI {
  toggleOverlayMode(mode: 'minimal' | 'compact' | 'full'): Promise<void>;
  setOverlayPosition(x: number, y: number): Promise<void>;
  toggleClickThrough(enabled: boolean): Promise<void>;
  showOverlayPanel(panel: 'crm' | 'notes' | 'insights'): Promise<void>;
  hideOverlayPanel(panel: string): Promise<void>;
  minimizeOverlay(): Promise<void>;
  restoreOverlay(): Promise<void>;
}

/**
 * Smart Features API interface
 */
interface SmartAPI {
  generateEmailProposal(meetingId: string): Promise<EmailData>;
  scheduleFollowUp(type: FollowUpType, datetime: Date): Promise<EventData>;
  extractActionItems(): Promise<ActionItem[]>;
  generateMeetingSummary(): Promise<MeetingSummary>;
  detectBuyingSignals(): Promise<BuyingSignal[]>;
  suggestNextSteps(): Promise<NextStep[]>;
}

/**
 * Data Management API interface
 */
interface DataAPI {
  saveApiKeys(keys: ApiKeyConfig): Promise<boolean>;
  getStoredApiKeys(): Promise<ApiKeyConfig>;
  syncCRMData(source: string): Promise<CRMData>;
  exportMeetingData(format: 'pdf' | 'json'): Promise<string>;
}

/**
 * Real-time Events API interface
 */
interface EventsAPI {
  onTranscriptUpdate(callback: (data: TranscriptEntry) => void): () => void;
  onInsightGenerated(callback: (insight: AIInsight) => void): () => void;
  onMeetingTimeUpdate(callback: (timeLeft: number) => void): () => void;
  onBuyingSignalDetected(callback: (signal: BuyingSignal) => void): () => void;
  onActionItemIdentified(callback: (item: ActionItem) => void): () => void;
}

/**
 * System Integration API interface
 */
interface SystemAPI {
  showNotification(message: string, type?: NotificationType): Promise<void>;
  openExternalLink(url: string): Promise<void>;
  copyToClipboard(text: string): Promise<boolean>;
  saveFile(filename: string, content: string): Promise<string>;
  getSystemInfo(): Promise<SystemInfo>;
}

/**
 * Main Electron API interface
 */
interface ElectronAPI {
  // Core API modules
  meeting: MeetingAPI;
  overlay: OverlayAPI;
  smart: SmartAPI;
  data: DataAPI;
  events: EventsAPI;
  system: SystemAPI;

  // Utility methods
  removeAllListeners(channel: string): void;
  
  // Version and app control
  getVersion(): Promise<string>;
  quit(): Promise<void>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  unmaximize(): Promise<void>;
  close(): Promise<void>;
  
  // Window state queries
  isMaximized(): Promise<boolean>;
  isMinimized(): Promise<boolean>;
  
  // Development helpers
  openDevTools(): Promise<void>;
  reloadApp(): Promise<void>;
}

/**
 * Global window interface extension
 * This makes electronAPI available on window object with proper typing
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

/**
 * Export the ElectronAPI type for use in renderer process
 */
export type { ElectronAPI };