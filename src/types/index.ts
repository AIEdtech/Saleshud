/**
 * SalesHud TypeScript Interface Definitions
 * Comprehensive type definitions for all application data structures
 */

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * Meeting configuration parameters
 */
export interface MeetingConfig {
  id: string;
  title: string;
  meetingType: 'sales' | 'demo' | 'discovery' | 'follow-up' | 'closing' | 'support';
  platform: 'zoom' | 'teams' | 'meet' | 'webex' | 'other' | 'none';
  scheduledStart?: Date;
  scheduledDuration?: number; // in minutes
  participants: Participant[];
  enableTranscription: boolean;
  enableInsights: boolean;
  enableRecording: boolean;
  autoGenerateSummary: boolean;
  crmIntegration?: CRMIntegration;
}

/**
 * Meeting participant information
 */
export interface Participant {
  id: string;
  name: string;
  email?: string;
  role: 'host' | 'presenter' | 'attendee';
  company?: string;
  title?: string;
  isSpeaking?: boolean;
  joinTime?: Date;
  leaveTime?: Date;
}

/**
 * Current meeting state
 */
export interface MeetingStatus {
  state: 'idle' | 'starting' | 'active' | 'paused' | 'ending' | 'ended';
  startTime?: Date;
  endTime?: Date;
  duration: number; // in seconds
  isRecording: boolean;
  isTranscribing: boolean;
  participantCount: number;
  activeSpeaker?: string;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  errors?: string[];
}

/**
 * Meeting session information
 */
export interface SessionData {
  sessionId: string;
  meetingConfig: MeetingConfig;
  status: MeetingStatus;
  transcript: TranscriptEntry[];
  insights: AIInsight[];
  buyingSignals: BuyingSignal[];
  actionItems: ActionItem[];
  nextSteps: NextStep[];
  summary?: MeetingSummary;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Individual transcript entry
 */
export interface TranscriptEntry {
  id: string;
  speaker: string;
  speakerId?: string;
  text: string;
  timestamp: Date;
  duration?: number; // in seconds
  confidence: number; // 0-1
  sentiment?: 'positive' | 'neutral' | 'negative';
  keywords?: string[];
  isImportant?: boolean;
}

/**
 * AI-generated insight
 */
export interface AIInsight {
  id: string;
  type: InsightType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  timestamp: Date;
  relatedTranscriptIds?: string[];
  suggestedAction?: string;
  confidence: number; // 0-1
  category?: InsightCategory;
}

export type InsightType = 
  | 'objection'
  | 'question'
  | 'concern'
  | 'interest'
  | 'competitor_mention'
  | 'budget_discussion'
  | 'timeline'
  | 'decision_maker'
  | 'technical_requirement'
  | 'integration_need';

export type InsightCategory = 
  | 'product'
  | 'pricing'
  | 'implementation'
  | 'support'
  | 'competition'
  | 'timeline'
  | 'budget'
  | 'general';

/**
 * Detected buying signal
 */
export interface BuyingSignal {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  signal: string;
  strength: 'strong' | 'moderate' | 'weak';
  timestamp: Date;
  context: string;
  confidence: number; // 0-1
  relatedTranscriptId?: string;
  suggestedResponse?: string;
}

/**
 * Extracted action item
 */
export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  source?: 'ai' | 'manual';
  relatedTranscriptId?: string;
}

/**
 * Suggested next step
 */
export interface NextStep {
  id: string;
  step: string;
  description?: string;
  recommendedDate?: Date;
  type: 'follow_up' | 'demo' | 'proposal' | 'meeting' | 'email' | 'call';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'suggested' | 'accepted' | 'completed' | 'skipped';
  aiConfidence: number; // 0-1
}

// ============================================================================
// Email System
// ============================================================================

/**
 * Generated email data structure
 */
export interface EmailData {
  id: string;
  type: EmailType;
  template?: EmailTemplate;
  content: EmailContent;
  recipients: EmailRecipient[];
  scheduledSendTime?: Date;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  metadata?: EmailMetadata;
  createdAt: Date;
  sentAt?: Date;
}

export type EmailType = 
  | 'follow_up'
  | 'thank_you'
  | 'proposal'
  | 'meeting_request'
  | 'introduction'
  | 'reminder'
  | 'summary';

/**
 * Email recipient information
 */
export interface EmailRecipient {
  email: string;
  name?: string;
  type: 'to' | 'cc' | 'bcc';
}

/**
 * Email template definition
 */
export interface EmailTemplate {
  id: string;
  name: string;
  type: EmailType;
  subject: string;
  bodyTemplate: string;
  variables?: TemplateVariable[];
  tone: 'formal' | 'casual' | 'friendly' | 'professional';
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template variable for email templates
 */
export interface TemplateVariable {
  key: string;
  value: string;
  type: 'text' | 'date' | 'number' | 'list';
  required?: boolean;
}

/**
 * Email attachment information
 */
export interface AttachmentData {
  id: string;
  filename: string;
  mimeType: string;
  size: number; // in bytes
  url?: string;
  data?: string; // base64 encoded
}

/**
 * Email content structure
 */
export interface EmailContent {
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments?: AttachmentData[];
  signature?: string;
  replyTo?: string;
}

/**
 * Email metadata
 */
export interface EmailMetadata {
  sessionId?: string;
  meetingId?: string;
  crmDealId?: string;
  tags?: string[];
  trackingEnabled?: boolean;
  trackingId?: string;
}

// ============================================================================
// Scheduling System
// ============================================================================

/**
 * Types of follow-up activities
 */
export type FollowUpType = 'demo' | 'check-in' | 'decision' | 'implementation' | 'review' | 'custom';

/**
 * Calendar event structure
 */
export interface EventData {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: EventAttendee[];
  type: FollowUpType;
  reminders?: EventReminder[];
  recurrence?: RecurrenceRule;
  status: 'tentative' | 'confirmed' | 'cancelled';
  meetingLink?: string;
  relatedSessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event attendee
 */
export interface EventAttendee {
  email: string;
  name?: string;
  status: 'accepted' | 'declined' | 'tentative' | 'pending';
  isOrganizer?: boolean;
  isOptional?: boolean;
}

/**
 * Event reminder
 */
export interface EventReminder {
  method: 'email' | 'popup' | 'sms';
  minutesBefore: number;
}

/**
 * Recurrence rule for events
 */
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  count?: number;
  until?: Date;
  byDay?: string[];
  byMonth?: number[];
}

/**
 * Time availability slot
 */
export interface AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  conflictingEvents?: string[];
  suggestedAlternatives?: Date[];
}

// ============================================================================
// CRM Integration
// ============================================================================

/**
 * CRM integration configuration
 */
export interface CRMIntegration {
  provider: 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'custom';
  enabled: boolean;
  apiKey?: string;
  instanceUrl?: string;
  syncEnabled: boolean;
  lastSyncTime?: Date;
}

/**
 * Customer relationship data
 */
export interface CRMData {
  id: string;
  provider: string;
  contact?: ContactData;
  company?: CompanyData;
  deal?: DealData;
  activities?: ActivityData[];
  notes?: NoteData[];
  customFields?: Record<string, any>;
  lastUpdated: Date;
}

/**
 * Contact information
 */
export interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  title?: string;
  department?: string;
  company?: string;
  companyId?: string;
  linkedinUrl?: string;
  photoUrl?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Company information
 */
export interface CompanyData {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: CompanySize;
  revenue?: number;
  description?: string;
  website?: string;
  linkedinUrl?: string;
  address?: Address;
  phone?: string;
  numberOfEmployees?: number;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

/**
 * Address structure
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Deal/Opportunity data
 */
export interface DealData {
  id: string;
  name: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number; // 0-100
  closeDate?: Date;
  contactIds?: string[];
  companyId?: string;
  owner?: string;
  description?: string;
  competitorInfo?: CompetitorInfo[];
  nextStep?: string;
  lostReason?: string;
  wonDate?: Date;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type DealStage = 
  | 'prospecting'
  | 'qualification'
  | 'needs_analysis'
  | 'proposal'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

/**
 * Competitor information
 */
export interface CompetitorInfo {
  name: string;
  strengths?: string[];
  weaknesses?: string[];
  notes?: string;
}

/**
 * CRM activity data
 */
export interface ActivityData {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  date: Date;
  duration?: number; // in minutes
  outcome?: string;
  relatedTo?: string;
  createdBy?: string;
}

/**
 * CRM note data
 */
export interface NoteData {
  id: string;
  title?: string;
  content: string;
  relatedTo?: string;
  tags?: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * API key configuration for all services
 */
export interface ApiKeyConfig {
  claude?: string;
  openai?: string;
  deepgram?: string;
  supabase?: {
    url: string;
    anonKey: string;
    serviceKey?: string;
  };
  sendgrid?: string;
  mixpanel?: string;
  sentry?: string;
}

/**
 * User preferences and settings
 */
export interface UserPreferences {
  userId: string;
  theme: 'dark' | 'light' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  overlay: OverlayPreferences;
  transcription: TranscriptionPreferences;
  ai: AIPreferences;
  email: EmailPreferences;
  shortcuts: KeyboardShortcuts;
  privacy: PrivacySettings;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  types: {
    insights: boolean;
    buyingSignals: boolean;
    actionItems: boolean;
    meetings: boolean;
    errors: boolean;
  };
}

/**
 * Overlay preferences
 */
export interface OverlayPreferences {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
  opacity: number; // 0-1
  autoHide: boolean;
  autoHideDelay: number; // in seconds
  showTranscript: boolean;
  showInsights: boolean;
  showControls: boolean;
}

/**
 * Transcription preferences
 */
export interface TranscriptionPreferences {
  enabled: boolean;
  language: string;
  model: 'nova-2' | 'nova' | 'enhanced' | 'base';
  punctuation: boolean;
  profanityFilter: boolean;
  speakerLabels: boolean;
  autoSave: boolean;
}

/**
 * AI preferences
 */
export interface AIPreferences {
  enabled: boolean;
  provider: 'claude' | 'openai' | 'both';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  autoGenerateInsights: boolean;
  autoGenerateSummary: boolean;
  autoGenerateEmails: boolean;
}

/**
 * Email preferences
 */
export interface EmailPreferences {
  signature?: string;
  defaultTemplate?: string;
  trackOpens: boolean;
  trackClicks: boolean;
  sendCopy: boolean;
  defaultTone: 'formal' | 'casual' | 'friendly' | 'professional';
}

/**
 * Keyboard shortcuts
 */
export interface KeyboardShortcuts {
  toggleOverlay?: string;
  toggleTranscription?: string;
  toggleRecording?: string;
  generateSummary?: string;
  generateEmail?: string;
  [key: string]: string | undefined;
}

/**
 * Privacy settings
 */
export interface PrivacySettings {
  shareAnalytics: boolean;
  shareTranscripts: boolean;
  allowRecording: boolean;
  dataRetentionDays?: number;
}

/**
 * Overlay configuration
 */
export interface OverlayConfig {
  visible: boolean;
  minimized: boolean;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  opacity: number;
  locked: boolean;
  alwaysOnTop: boolean;
}

// ============================================================================
// System Types
// ============================================================================

/**
 * Notification types
 */
export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'insight'
  | 'buying_signal'
  | 'action_item'
  | 'meeting'
  | 'system';

/**
 * System notification
 */
export interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actions?: NotificationAction[];
  autoClose?: boolean;
  autoCloseDelay?: number; // in seconds
  read?: boolean;
}

/**
 * Notification action
 */
export interface NotificationAction {
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
}

/**
 * System information
 */
export interface SystemInfo {
  version: string;
  buildNumber: string;
  platform: 'mac' | 'windows' | 'linux';
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  chromeVersion: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    model: string;
    cores: number;
    usage: number;
  };
  network: {
    connected: boolean;
    type?: string;
    speed?: number;
  };
}

/**
 * Application configuration
 */
export interface AppConfig {
  appId: string;
  appName: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  wsBaseUrl: string;
  updateUrl?: string;
  sentryDsn?: string;
  mixpanelToken?: string;
  features: FeatureFlags;
  maintenance?: MaintenanceMode;
}

/**
 * Feature flags
 */
export interface FeatureFlags {
  analytics: boolean;
  debugMode: boolean;
  aiInsights: boolean;
  realTimeTranscription: boolean;
  autoUpdater: boolean;
  betaFeatures: boolean;
  [key: string]: boolean;
}

/**
 * Maintenance mode configuration
 */
export interface MaintenanceMode {
  enabled: boolean;
  message?: string;
  estimatedEndTime?: Date;
  allowedUsers?: string[];
}

// ============================================================================
// Services
// ============================================================================

/**
 * Deepgram configuration
 */
export interface DeepgramConfig {
  apiKey: string;
  apiUrl: string;
  model: 'nova-2' | 'nova' | 'enhanced' | 'base';
  language: string;
  punctuate: boolean;
  profanityFilter: boolean;
  redact?: string[];
  diarize: boolean;
  smartFormat: boolean;
  numerals: boolean;
  searchTerms?: string[];
  replace?: Record<string, string>;
}

/**
 * Claude API configuration
 */
export interface ClaudeConfig {
  apiKey: string;
  apiUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
}

/**
 * Supabase configuration
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
  database?: string;
  schema?: string;
  autoRefreshToken: boolean;
  persistSession: boolean;
  detectSessionInUrl: boolean;
}

// ============================================================================
// UI State
// ============================================================================

/**
 * Overlay display state
 */
export interface OverlayState {
  isVisible: boolean;
  isMinimized: boolean;
  isPinned: boolean;
  activePanel: PanelType;
  position: Position;
  size: Size;
  opacity: number;
  isAnimating: boolean;
}

export type PanelType = 
  | 'transcript'
  | 'insights'
  | 'actions'
  | 'summary'
  | 'email'
  | 'settings';

/**
 * Position coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Size dimensions
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Panel visibility state
 */
export interface PanelState {
  transcript: boolean;
  insights: boolean;
  actions: boolean;
  summary: boolean;
  email: boolean;
  settings: boolean;
  sidebar: boolean;
}

/**
 * Application state
 */
export interface AppState {
  isLoading: boolean;
  isConnected: boolean;
  currentSession?: SessionData;
  activeView: AppView;
  overlay: OverlayState;
  panels: PanelState;
  notifications: SystemNotification[];
  errors: AppError[];
  user?: UserData;
}

export type AppView = 
  | 'dashboard'
  | 'meeting'
  | 'history'
  | 'analytics'
  | 'settings'
  | 'help';

/**
 * Application error
 */
export interface AppError {
  id: string;
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  action?: string;
}

/**
 * User data
 */
export interface UserData {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
  organization?: string;
  preferences?: UserPreferences;
  subscription?: SubscriptionData;
  createdAt: Date;
  lastLogin: Date;
}

/**
 * Subscription data
 */
export interface SubscriptionData {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: Date;
  endDate?: Date;
  features: string[];
  limits?: {
    meetings?: number;
    transcriptionMinutes?: number;
    aiInsights?: number;
    storage?: number;
  };
}

// ============================================================================
// Analysis Types
// ============================================================================

/**
 * Conversation quality metrics
 */
export interface ConversationScore {
  overall: number; // 0-100
  metrics: {
    engagement: number; // 0-100
    sentiment: number; // -100 to 100
    clarity: number; // 0-100
    questionHandling: number; // 0-100
    objectionHandling: number; // 0-100
    closingEffectiveness: number; // 0-100
  };
  strengths: string[];
  improvements: string[];
  timestamp: Date;
}

/**
 * Complete meeting summary
 */
export interface MeetingSummary {
  id: string;
  sessionId: string;
  title: string;
  date: Date;
  duration: number; // in minutes
  participants: Participant[];
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  nextSteps: NextStep[];
  insights: AIInsight[];
  buyingSignals: BuyingSignal[];
  conversationScore?: ConversationScore;
  transcript?: TranscriptEntry[];
  recording?: RecordingData;
  generatedEmails?: EmailData[];
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recording data
 */
export interface RecordingData {
  id: string;
  url?: string;
  size?: number; // in bytes
  duration: number; // in seconds
  format: 'mp4' | 'webm' | 'mp3' | 'wav';
  thumbnailUrl?: string;
  transcriptUrl?: string;
  createdAt: Date;
}

/**
 * AI analysis results
 */
export interface AnalysisResult {
  id: string;
  sessionId: string;
  type: AnalysisType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  confidence?: number; // 0-1
  processingTime?: number; // in milliseconds
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export type AnalysisType = 
  | 'sentiment'
  | 'summary'
  | 'insights'
  | 'buying_signals'
  | 'action_items'
  | 'next_steps'
  | 'conversation_score'
  | 'conversation'
  | 'email_generation';

// ============================================================================
// WebSocket Events
// ============================================================================

/**
 * WebSocket message types
 */
export interface WSMessage<T = any> {
  type: WSMessageType;
  payload: T;
  timestamp: Date;
  sessionId?: string;
}

export type WSMessageType = 
  | 'connection'
  | 'transcript'
  | 'insight'
  | 'buying_signal'
  | 'participant_update'
  | 'meeting_status'
  | 'error'
  | 'ping'
  | 'pong';

/**
 * WebSocket connection state
 */
export interface WSConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  url?: string;
  reconnectAttempts?: number;
  lastError?: string;
  lastConnected?: Date;
}

// ============================================================================
// Export all types
// ============================================================================

export * from './electron';