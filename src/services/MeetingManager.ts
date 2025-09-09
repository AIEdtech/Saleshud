/**
 * MeetingManager - Sophisticated meeting orchestration service
 * Coordinates all SalesHud functionality including Deepgram, Claude, and Supabase
 * Manages meeting lifecycle, audio processing, and real-time intelligence
 */

import { EventEmitter } from 'events';
import { DeepgramService } from './DeepgramService';
import { ClaudeService } from './ClaudeService';
import { SupabaseService, type MeetingSessionData } from './SupabaseService';
import type {
  MeetingConfig,
  MeetingStatus,
  TranscriptEntry,
  AIInsight,
  MeetingSummary,
  BuyingSignal,
  ActionItem,
  NextStep,
  ConversationScore,
  EmailContent
} from '../types';

// ============================================================================
// Meeting Manager Interfaces
// ============================================================================

/**
 * Meeting platform detection result
 */
interface PlatformDetection {
  platform: 'zoom' | 'teams' | 'meet' | 'webex' | 'other' | 'none';
  isActive: boolean;
  windowId?: string;
  processId?: number;
  meetingId?: string;
  participants?: PlatformParticipant[];
  confidence: number; // 0-100
  lastDetected: Date;
}

/**
 * Platform participant information
 */
interface PlatformParticipant {
  id: string;
  name: string;
  role: 'host' | 'presenter' | 'attendee';
  isCurrentUser: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  joinTime: Date;
}

/**
 * Audio device information
 */
interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
  isActive: boolean;
  quality: AudioQualityMetrics;
}

/**
 * Audio quality metrics
 */
interface AudioQualityMetrics {
  signalStrength: number; // 0-100
  noiseLevel: number; // 0-100
  clarity: number; // 0-100
  stability: number; // 0-100
  overallScore: number; // 0-100
}

/**
 * Service health status
 */
interface ServiceHealth {
  deepgram: ServiceStatus;
  claude: ServiceStatus;
  supabase: ServiceStatus;
  overall: ServiceStatus;
}

interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'failed' | 'unknown';
  lastCheck: Date;
  responseTime: number;
  errorCount: number;
  uptime: number;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  successCount: number;
}

/**
 * Processing result
 */
interface ProcessingResult {
  meetingId: string;
  transcriptEntries: number;
  insightsGenerated: number;
  buyingSignals: number;
  actionItems: number;
  processingTime: number;
  qualityScore: number;
  status: 'completed' | 'partial' | 'failed';
  errors?: string[];
}

/**
 * Meeting analytics
 */
interface MeetingAnalytics {
  effectiveness: number; // 0-100
  engagement: number; // 0-100
  conversationQuality: ConversationScore;
  speakerMetrics: SpeakerMetrics[];
  dealProgression: DealProgression;
  nextBestActions: NextStep[];
  riskFactors: RiskFactor[];
  opportunities: Opportunity[];
}

interface SpeakerMetrics {
  speakerId: string;
  name: string;
  talkTime: number; // seconds
  talkRatio: number; // percentage
  engagement: number; // 0-100
  sentiment: 'positive' | 'neutral' | 'negative';
  keyTopics: string[];
  interruptions: number;
}

interface DealProgression {
  stage: 'discovery' | 'qualification' | 'demo' | 'proposal' | 'negotiation' | 'closing';
  progression: number; // 0-100
  confidence: number; // 0-100
  timeToClose: number; // days estimated
  probability: number; // 0-100
}

interface RiskFactor {
  factor: string;
  severity: 'high' | 'medium' | 'low';
  impact: number; // 0-100
  likelihood: number; // 0-100
  mitigation: string;
}

interface Opportunity {
  opportunity: string;
  value: number; // 0-100
  urgency: 'immediate' | 'short-term' | 'long-term';
  effort: 'low' | 'medium' | 'high';
  action: string;
}

/**
 * Meeting manager configuration
 */
interface MeetingManagerConfig {
  deepgram: {
    apiKey: string;
    model: string;
    language: string;
    features: string[];
  };
  claude: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  audio: {
    preferredDeviceId?: string;
    noiseSuppression: boolean;
    echoCancellation: boolean;
    autoGainControl: boolean;
    sampleRate: number;
  };
  features: {
    autoSummary: boolean;
    realTimeCoaching: boolean;
    autoFollowUp: boolean;
    crmSync: boolean;
    calendarIntegration: boolean;
  };
}

/**
 * Custom error for meeting manager
 */
class MeetingManagerError extends Error {
  public readonly type: 'PLATFORM_ERROR' | 'AUDIO_ERROR' | 'SERVICE_ERROR' | 'COORDINATION_ERROR';
  public readonly service?: string;
  public readonly retryable: boolean;

  constructor(message: string, type: MeetingManagerError['type'], service?: string, retryable = false) {
    super(message);
    this.name = 'MeetingManagerError';
    this.type = type;
    this.service = service;
    this.retryable = retryable;
  }
}

// ============================================================================
// Main MeetingManager Class
// ============================================================================

export class MeetingManager extends EventEmitter {
  // Service instances
  private deepgram: DeepgramService | null = null;
  private claude: ClaudeService | null = null;
  private supabase: SupabaseService | null = null;

  // Configuration
  private config: MeetingManagerConfig;
  private initialized: boolean = false;

  // Meeting state
  private activeMeetings: Map<string, MeetingState> = new Map();
  private platformDetection: PlatformDetection = {
    platform: 'none',
    isActive: false,
    confidence: 0,
    lastDetected: new Date()
  };

  // Audio management
  private audioDevices: AudioDevice[] = [];
  private activeAudioDevice: AudioDevice | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;

  // Service health monitoring
  private serviceHealth: ServiceHealth = {
    deepgram: this.createDefaultServiceStatus(),
    claude: this.createDefaultServiceStatus(),
    supabase: this.createDefaultServiceStatus(),
    overall: this.createDefaultServiceStatus()
  };

  // Circuit breakers
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  // Performance metrics
  private metrics = {
    meetingsProcessed: 0,
    totalProcessingTime: 0,
    averageResponseTime: 0,
    errorCount: 0,
    successRate: 0,
    activeStreams: 0
  };

  // Processing queues
  private transcriptQueue: Array<{ meetingId: string; entry: TranscriptEntry }> = [];
  private insightQueue: Array<{ meetingId: string; transcript: TranscriptEntry[] }> = [];
  private processingInProgress: boolean = false;

  constructor(config: MeetingManagerConfig) {
    super();
    this.config = config;
    this.setupCircuitBreakers();
    this.startHealthMonitoring();
    this.startPlatformDetection();
    this.setupAudioDeviceMonitoring();
  }

  // ============================================================================
  // Core Public Methods
  // ============================================================================

  /**
   * Initialize all services and setup coordination
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('MeetingManager already initialized');
      return;
    }

    try {
      this.emit('initialization:started');

      // Initialize services in parallel
      await Promise.all([
        this.initializeDeepgram(),
        this.initializeClaude(),
        this.initializeSupabase()
      ]);

      // Setup service coordination
      this.setupServiceCoordination();

      // Initialize audio system
      await this.initializeAudioSystem();

      // Start background processes
      this.startBackgroundProcessing();

      this.initialized = true;
      this.emit('initialization:completed');
      
      console.log('✅ MeetingManager initialized successfully');

    } catch (error) {
      this.emit('initialization:failed', error);
      throw new MeetingManagerError(
        `Failed to initialize MeetingManager: ${error}`,
        'COORDINATION_ERROR',
        undefined,
        true
      );
    }
  }

  /**
   * Start a new meeting with comprehensive setup
   */
  async startMeeting(config: MeetingConfig): Promise<string> {
    if (!this.initialized) {
      throw new MeetingManagerError('MeetingManager not initialized', 'COORDINATION_ERROR');
    }

    const startTime = Date.now();
    
    try {
      this.emit('meeting:starting', { config });

      // Detect platform and adjust settings
      const platformInfo = await this.detectMeetingPlatform();
      
      // Create meeting session in database
      const meetingId = await this.createMeetingSession(config, platformInfo);
      
      // Initialize meeting state
      const meetingState: MeetingState = {
        id: meetingId,
        config,
        status: 'starting',
        platform: platformInfo.platform,
        startTime: new Date(),
        transcriptEntries: [],
        insights: [],
        participants: config.participants,
        metrics: {
          transcriptCount: 0,
          insightCount: 0,
          processingTime: 0,
          qualityScore: 0
        },
        subscriptions: []
      };

      this.activeMeetings.set(meetingId, meetingState);

      // Start audio capture and transcription
      await this.startAudioCapture(meetingId);
      
      // Start real-time processing
      this.startRealTimeProcessing(meetingId);

      // Update meeting state
      meetingState.status = 'active';
      await this.updateMeetingStatus(meetingId, 'active');

      const initTime = Date.now() - startTime;
      this.metrics.totalProcessingTime += initTime;

      this.emit('meeting:started', {
        meetingId,
        platform: platformInfo.platform,
        initTime
      });

      console.log(`🚀 Meeting started: ${meetingId} on ${platformInfo.platform}`);
      return meetingId;

    } catch (error) {
      this.emit('meeting:start_failed', { config, error });
      throw new MeetingManagerError(
        `Failed to start meeting: ${error}`,
        'COORDINATION_ERROR',
        undefined,
        true
      );
    }
  }

  /**
   * Stop meeting and generate comprehensive summary
   */
  async stopMeeting(meetingId: string): Promise<MeetingSummary> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState) {
      throw new MeetingManagerError('Meeting not found', 'COORDINATION_ERROR');
    }

    const stopTime = Date.now();

    try {
      this.emit('meeting:stopping', { meetingId });

      // Stop audio capture
      await this.stopAudioCapture(meetingId);

      // Process final transcripts and insights
      await this.processFinalMeetingData(meetingId);

      // Generate comprehensive summary
      const summary = await this.generateMeetingSummary(meetingId);

      // Update meeting state
      meetingState.status = 'completed';
      meetingState.endTime = new Date();
      
      // Save final meeting data
      await this.saveFinalMeetingData(meetingId, summary);

      // Cleanup resources
      this.cleanupMeetingResources(meetingId);
      this.activeMeetings.delete(meetingId);

      const processingTime = Date.now() - stopTime;
      this.metrics.meetingsProcessed++;

      this.emit('meeting:stopped', {
        meetingId,
        summary,
        processingTime
      });

      console.log(`🏁 Meeting stopped: ${meetingId}`);
      return summary;

    } catch (error) {
      this.emit('meeting:stop_failed', { meetingId, error });
      throw new MeetingManagerError(
        `Failed to stop meeting: ${error}`,
        'COORDINATION_ERROR'
      );
    }
  }

  /**
   * Pause meeting processing
   */
  async pauseMeeting(meetingId: string): Promise<void> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState) {
      throw new MeetingManagerError('Meeting not found', 'COORDINATION_ERROR');
    }

    try {
      // Pause transcription
      if (this.deepgram) {
        await this.deepgram.stopTranscription();
      }

      meetingState.status = 'paused';
      await this.updateMeetingStatus(meetingId, 'paused');

      this.emit('meeting:paused', { meetingId });
      console.log(`⏸️ Meeting paused: ${meetingId}`);

    } catch (error) {
      throw new MeetingManagerError(
        `Failed to pause meeting: ${error}`,
        'COORDINATION_ERROR'
      );
    }
  }

  /**
   * Resume meeting processing
   */
  async resumeMeeting(meetingId: string): Promise<void> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState) {
      throw new MeetingManagerError('Meeting not found', 'COORDINATION_ERROR');
    }

    try {
      // Resume transcription
      if (this.deepgram) {
        await this.deepgram.startTranscription();
      }

      meetingState.status = 'active';
      await this.updateMeetingStatus(meetingId, 'active');

      this.emit('meeting:resumed', { meetingId });
      console.log(`▶️ Meeting resumed: ${meetingId}`);

    } catch (error) {
      throw new MeetingManagerError(
        `Failed to resume meeting: ${error}`,
        'COORDINATION_ERROR'
      );
    }
  }

  /**
   * Update meeting context dynamically
   */
  async updateMeetingContext(meetingId: string, context: any): Promise<void> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState) {
      throw new MeetingManagerError('Meeting not found', 'COORDINATION_ERROR');
    }

    try {
      meetingState.context = { ...meetingState.context, ...context };
      
      // Update database
      if (this.supabase) {
        await this.supabase.updateMeetingSession(meetingId, {
          config: { ...meetingState.config, ...context }
        });
      }

      this.emit('meeting:context_updated', { meetingId, context });

    } catch (error) {
      throw new MeetingManagerError(
        `Failed to update meeting context: ${error}`,
        'COORDINATION_ERROR'
      );
    }
  }

  /**
   * Get current meeting status
   */
  async getMeetingStatus(meetingId: string): Promise<MeetingStatus> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState) {
      throw new MeetingManagerError('Meeting not found', 'COORDINATION_ERROR');
    }

    const now = new Date();
    const duration = meetingState.startTime ? 
      Math.floor((now.getTime() - meetingState.startTime.getTime()) / 1000) : 0;

    return {
      state: meetingState.status as any,
      startTime: meetingState.startTime,
      endTime: meetingState.endTime,
      duration,
      isRecording: false, // Would be determined by platform
      isTranscribing: meetingState.status === 'active',
      participantCount: meetingState.participants.length,
      activeSpeaker: this.getActiveSpeaker(meetingId),
      connectionQuality: this.getConnectionQuality(),
      errors: meetingState.errors
    };
  }

  /**
   * Process meeting data and generate insights
   */
  async processMeetingData(meetingId: string): Promise<ProcessingResult> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState) {
      throw new MeetingManagerError('Meeting not found', 'COORDINATION_ERROR');
    }

    const startTime = Date.now();

    try {
      // Process transcripts for insights
      const insights = await this.generateInsights(meetingId);
      
      // Extract buying signals
      const buyingSignals = await this.extractBuyingSignals(meetingId);
      
      // Generate action items
      const actionItems = await this.extractActionItems(meetingId);

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(meetingState);

      const processingTime = Date.now() - startTime;

      const result: ProcessingResult = {
        meetingId,
        transcriptEntries: meetingState.transcriptEntries.length,
        insightsGenerated: insights.length,
        buyingSignals: buyingSignals.length,
        actionItems: actionItems.length,
        processingTime,
        qualityScore,
        status: 'completed'
      };

      this.emit('meeting:processed', result);
      return result;

    } catch (error) {
      return {
        meetingId,
        transcriptEntries: meetingState.transcriptEntries.length,
        insightsGenerated: 0,
        buyingSignals: 0,
        actionItems: 0,
        processingTime: Date.now() - startTime,
        qualityScore: 0,
        status: 'failed',
        errors: [error.message]
      };
    }
  }

  // ============================================================================
  // Service Initialization
  // ============================================================================

  /**
   * Initialize Deepgram service
   */
  private async initializeDeepgram(): Promise<void> {
    try {
      this.deepgram = new DeepgramService();
      await this.deepgram.initialize(this.config.deepgram.apiKey, {
        model: this.config.deepgram.model as any,
        language: this.config.deepgram.language,
        punctuate: true,
        diarize: true,
        smartFormat: true
      });

      this.serviceHealth.deepgram.status = 'healthy';
      this.serviceHealth.deepgram.lastCheck = new Date();

      console.log('✅ Deepgram service initialized');

    } catch (error) {
      this.serviceHealth.deepgram.status = 'failed';
      throw error;
    }
  }

  /**
   * Initialize Claude service
   */
  private async initializeClaude(): Promise<void> {
    try {
      this.claude = new ClaudeService();
      await this.claude.initialize(this.config.claude.apiKey, {
        model: this.config.claude.model,
        maxTokens: this.config.claude.maxTokens,
        temperature: this.config.claude.temperature
      });

      this.serviceHealth.claude.status = 'healthy';
      this.serviceHealth.claude.lastCheck = new Date();

      console.log('✅ Claude service initialized');

    } catch (error) {
      this.serviceHealth.claude.status = 'failed';
      throw error;
    }
  }

  /**
   * Initialize Supabase service
   */
  private async initializeSupabase(): Promise<void> {
    try {
      this.supabase = new SupabaseService({
        url: this.config.supabase.url,
        anonKey: this.config.supabase.anonKey,
        autoRefreshToken: true,
        persistSession: true
      });
      await this.supabase.initialize();

      this.serviceHealth.supabase.status = 'healthy';
      this.serviceHealth.supabase.lastCheck = new Date();

      console.log('✅ Supabase service initialized');

    } catch (error) {
      this.serviceHealth.supabase.status = 'failed';
      throw error;
    }
  }

  // ============================================================================
  // Service Coordination
  // ============================================================================

  /**
   * Setup service coordination and event handlers
   */
  private setupServiceCoordination(): void {
    if (!this.deepgram || !this.claude || !this.supabase) {
      throw new MeetingManagerError('Services not initialized', 'COORDINATION_ERROR');
    }

    // Deepgram transcript handling
    this.deepgram.onTranscriptReceived((transcript: TranscriptEntry) => {
      this.handleTranscriptReceived(transcript);
    });

    // Deepgram error handling
    this.deepgram.onError((error) => {
      this.handleServiceError('deepgram', error);
    });

    // Claude service events
    this.claude.on('analysisComplete', (data) => {
      this.handleInsightGenerated(data);
    });

    this.claude.on('error', (error) => {
      this.handleServiceError('claude', error);
    });

    // Supabase events
    this.supabase.on('connected', () => {
      this.serviceHealth.supabase.status = 'healthy';
    });

    this.supabase.on('error', (error) => {
      this.handleServiceError('supabase', error);
    });

    console.log('🔗 Service coordination established');
  }

  /**
   * Handle transcript received from Deepgram
   */
  private handleTranscriptReceived(transcript: TranscriptEntry): void {
    // Find active meeting for this transcript
    const activeMeeting = Array.from(this.activeMeetings.values())
      .find(meeting => meeting.status === 'active');

    if (!activeMeeting) {
      console.warn('No active meeting found for transcript');
      return;
    }

    // Add to meeting state
    activeMeeting.transcriptEntries.push(transcript);
    activeMeeting.metrics.transcriptCount++;

    // Queue for AI processing
    this.transcriptQueue.push({
      meetingId: activeMeeting.id,
      entry: transcript
    });

    // Save to database
    if (this.supabase) {
      this.supabase.saveTranscript(activeMeeting.id, transcript)
        .catch(error => console.error('Failed to save transcript:', error));
    }

    // Emit real-time update
    this.emit('transcript:received', {
      meetingId: activeMeeting.id,
      transcript
    });

    // Trigger real-time insights if enabled
    if (this.config.features.realTimeCoaching) {
      this.scheduleInsightGeneration(activeMeeting.id);
    }
  }

  /**
   * Handle service errors with circuit breaker pattern
   */
  private handleServiceError(service: string, error: any): void {
    console.error(`Service error [${service}]:`, error);

    // Update service health
    if (service in this.serviceHealth) {
      (this.serviceHealth as any)[service].status = 'degraded';
      (this.serviceHealth as any)[service].errorCount++;
    }

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(service);
    if (breaker) {
      breaker.failureCount++;
      breaker.lastFailureTime = new Date();

      // Open circuit if threshold exceeded
      if (breaker.failureCount >= 5) {
        breaker.state = 'open';
        breaker.nextRetryTime = new Date(Date.now() + 60000); // 1 minute
      }
    }

    this.emit('service:error', { service, error });
  }

  // ============================================================================
  // Platform Detection
  // ============================================================================

  /**
   * Detect active meeting platform
   */
  private async detectMeetingPlatform(): Promise<PlatformDetection> {
    try {
      // In a real implementation, this would use OS-specific APIs
      // For now, we'll simulate detection
      const platforms = ['zoom', 'teams', 'meet', 'webex'];
      const detectedPlatform = platforms[Math.floor(Math.random() * platforms.length)] as any;

      const detection: PlatformDetection = {
        platform: detectedPlatform,
        isActive: true,
        confidence: 85,
        lastDetected: new Date(),
        participants: this.simulateParticipantDetection()
      };

      this.platformDetection = detection;
      this.emit('platform:detected', detection);

      return detection;

    } catch (error) {
      console.error('Platform detection failed:', error);
      return {
        platform: 'other',
        isActive: false,
        confidence: 0,
        lastDetected: new Date()
      };
    }
  }

  /**
   * Start platform detection monitoring
   */
  private startPlatformDetection(): void {
    setInterval(async () => {
      const detection = await this.detectMeetingPlatform();
      
      if (detection.isActive !== this.platformDetection.isActive) {
        this.emit('platform:changed', detection);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Simulate participant detection (would be platform-specific in reality)
   */
  private simulateParticipantDetection(): PlatformParticipant[] {
    return [
      {
        id: 'user1',
        name: 'Current User',
        role: 'host',
        isCurrentUser: true,
        isMuted: false,
        isVideoOn: true,
        joinTime: new Date()
      },
      {
        id: 'user2',
        name: 'Meeting Participant',
        role: 'attendee',
        isCurrentUser: false,
        isMuted: false,
        isVideoOn: true,
        joinTime: new Date()
      }
    ];
  }

  // ============================================================================
  // Audio Management
  // ============================================================================

  /**
   * Initialize audio system
   */
  private async initializeAudioSystem(): Promise<void> {
    try {
      // Get available audio devices
      await this.enumerateAudioDevices();

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.audio.sampleRate
      });

      // Setup device change monitoring
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.enumerateAudioDevices();
      });

      console.log('🎤 Audio system initialized');

    } catch (error) {
      throw new MeetingManagerError(
        `Failed to initialize audio system: ${error}`,
        'AUDIO_ERROR'
      );
    }
  }

  /**
   * Enumerate available audio devices
   */
  private async enumerateAudioDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      this.audioDevices = await Promise.all(
        devices
          .filter(device => device.kind === 'audioinput')
          .map(async (device): Promise<AudioDevice> => {
            const quality = await this.testAudioDevice(device.deviceId);
            
            return {
              deviceId: device.deviceId,
              label: device.label || 'Unknown Microphone',
              kind: 'audioinput',
              isDefault: device.deviceId === 'default',
              isActive: this.activeAudioDevice?.deviceId === device.deviceId,
              quality
            };
          })
      );

      this.emit('audio:devices_updated', this.audioDevices);

    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
    }
  }

  /**
   * Test audio device quality
   */
  private async testAudioDevice(deviceId: string): Promise<AudioQualityMetrics> {
    // Simulate audio quality testing
    // In reality, this would analyze actual audio input
    return {
      signalStrength: 80 + Math.random() * 20,
      noiseLevel: Math.random() * 30,
      clarity: 70 + Math.random() * 30,
      stability: 85 + Math.random() * 15,
      overallScore: 75 + Math.random() * 25
    };
  }

  /**
   * Start audio capture for meeting
   */
  private async startAudioCapture(meetingId: string): Promise<void> {
    try {
      const constraints = {
        audio: {
          deviceId: this.config.audio.preferredDeviceId,
          echoCancellation: this.config.audio.echoCancellation,
          noiseSuppression: this.config.audio.noiseSuppression,
          autoGainControl: this.config.audio.autoGainControl,
          sampleRate: this.config.audio.sampleRate
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Start Deepgram transcription with audio stream
      if (this.deepgram) {
        await this.deepgram.startTranscription();
        
        // Setup audio processing
        this.setupAudioProcessing(meetingId);
      }

      this.emit('audio:capture_started', { meetingId });

    } catch (error) {
      throw new MeetingManagerError(
        `Failed to start audio capture: ${error}`,
        'AUDIO_ERROR'
      );
    }
  }

  /**
   * Setup audio processing pipeline
   */
  private setupAudioProcessing(meetingId: string): void {
    if (!this.audioContext || !this.mediaStream) return;

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      const inputBuffer = event.inputBuffer.getChannelData(0);
      const audioData = this.convertFloat32ToInt16(inputBuffer);
      
      // Send to Deepgram
      if (this.deepgram) {
        this.deepgram.processAudio(audioData.buffer);
      }

      // Monitor audio quality
      this.monitorAudioQuality(inputBuffer);
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  /**
   * Convert Float32 audio data to Int16
   */
  private convertFloat32ToInt16(buffer: Float32Array): Int16Array {
    const length = buffer.length;
    const result = new Int16Array(length);
    
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    return result;
  }

  /**
   * Monitor audio quality in real-time
   */
  private monitorAudioQuality(buffer: Float32Array): void {
    const rms = this.calculateRMS(buffer);
    const snr = this.calculateSNR(buffer);
    
    if (rms < 0.01) {
      this.emit('audio:low_signal', { level: rms });
    }
    
    if (snr < 10) {
      this.emit('audio:high_noise', { snr });
    }
  }

  /**
   * Calculate RMS (Root Mean Square) for audio level
   */
  private calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * Calculate Signal-to-Noise Ratio
   */
  private calculateSNR(buffer: Float32Array): number {
    // Simplified SNR calculation
    const rms = this.calculateRMS(buffer);
    const noise = this.estimateNoiseFloor(buffer);
    return 20 * Math.log10(rms / noise);
  }

  /**
   * Estimate noise floor
   */
  private estimateNoiseFloor(buffer: Float32Array): number {
    // Simple noise floor estimation
    const sorted = Array.from(buffer).map(Math.abs).sort();
    return sorted[Math.floor(sorted.length * 0.1)]; // 10th percentile
  }

  // ============================================================================
  // Meeting Lifecycle Management
  // ============================================================================

  /**
   * Create meeting session in database
   */
  private async createMeetingSession(config: MeetingConfig, platform: PlatformDetection): Promise<string> {
    if (!this.supabase) {
      throw new MeetingManagerError('Supabase service not available', 'SERVICE_ERROR');
    }

    const sessionData: Omit<MeetingSessionData, 'id' | 'created_at' | 'updated_at'> = {
      user_id: 'default-user', // Would be determined from auth context
      organization_id: 'default-org', // Would be determined from user context
      title: config.title,
      meeting_type: config.meetingType,
      platform: platform.platform,
      scheduled_start: config.scheduledStart?.toISOString(),
      scheduled_duration: config.scheduledDuration,
      status: 'starting',
      participants: config.participants.map(p => ({
        id: p.id,
        meeting_id: '', // Will be set after creation
        name: p.name,
        email: p.email,
        role: p.role,
        company: p.company,
        title: p.title,
        is_decision_maker: false, // Would be determined from context
        created_at: new Date().toISOString()
      })),
      config,
      transcript_count: 0,
      insights_count: 0,
      notes_count: 0,
      buying_signals_count: 0
    };

    return await this.supabase.createMeetingSession(sessionData);
  }

  /**
   * Update meeting status
   */
  private async updateMeetingStatus(meetingId: string, status: string): Promise<void> {
    if (this.supabase) {
      await this.supabase.updateMeetingSession(meetingId, {
        status: status as any,
        updated_at: new Date().toISOString()
      });
    }
  }

  /**
   * Stop audio capture
   */
  private async stopAudioCapture(meetingId: string): Promise<void> {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.deepgram) {
      await this.deepgram.stopTranscription();
    }

    this.emit('audio:capture_stopped', { meetingId });
  }

  // ============================================================================
  // Smart Features & Processing
  // ============================================================================

  /**
   * Generate insights from transcripts
   */
  private async generateInsights(meetingId: string): Promise<AIInsight[]> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState || !this.claude) {
      return [];
    }

    try {
      const analysis = await this.claude.analyzeConversation(meetingState.transcriptEntries);
      
      // Convert analysis to insights
      const insights: AIInsight[] = [];
      
      // Add insights based on analysis results
      if (analysis.result) {
        // This would be implemented based on the actual analysis result structure
        insights.push({
          id: `insight_${Date.now()}`,
          type: 'interest',
          priority: 'medium',
          title: 'Analysis Complete',
          content: 'Meeting analysis completed successfully',
          timestamp: new Date(),
          confidence: analysis.confidence || 0,
          category: 'general'
        });
      }

      // Save insights to database
      for (const insight of insights) {
        if (this.supabase) {
          await this.supabase.saveInsight(meetingId, insight);
        }
      }

      return insights;

    } catch (error) {
      console.error('Failed to generate insights:', error);
      return [];
    }
  }

  /**
   * Extract buying signals
   */
  private async extractBuyingSignals(meetingId: string): Promise<BuyingSignal[]> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState || !this.claude) {
      return [];
    }

    try {
      const conversation = meetingState.transcriptEntries
        .map(entry => `${entry.speaker}: ${entry.text}`)
        .join('\n');

      return await this.claude.detectBuyingSignals(conversation);

    } catch (error) {
      console.error('Failed to extract buying signals:', error);
      return [];
    }
  }

  /**
   * Extract action items
   */
  private async extractActionItems(meetingId: string): Promise<ActionItem[]> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState || !this.claude) {
      return [];
    }

    try {
      return await this.claude.extractActionItems(meetingState.transcriptEntries);

    } catch (error) {
      console.error('Failed to extract action items:', error);
      return [];
    }
  }

  /**
   * Generate comprehensive meeting summary
   */
  private async generateMeetingSummary(meetingId: string): Promise<MeetingSummary> {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState) {
      throw new MeetingManagerError('Meeting not found', 'COORDINATION_ERROR');
    }

    try {
      // Generate summary using Claude
      let summary: MeetingSummary;
      
      if (this.claude) {
        const meetingData = {
          meetingId,
          meetingType: meetingState.config.meetingType,
          participants: meetingState.participants,
          transcript: meetingState.transcriptEntries,
          duration: this.calculateMeetingDuration(meetingState),
          objectives: []
        };

        summary = await this.claude.generateSummary(meetingData);
      } else {
        // Fallback summary
        summary = {
          id: `summary_${meetingId}`,
          sessionId: meetingId,
          title: meetingState.config.title,
          date: meetingState.startTime || new Date(),
          duration: this.calculateMeetingDuration(meetingState),
          participants: meetingState.participants,
          keyPoints: this.extractKeyPoints(meetingState),
          decisions: [],
          actionItems: [],
          nextSteps: [],
          insights: meetingState.insights,
          buyingSignals: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      return summary;

    } catch (error) {
      console.error('Failed to generate meeting summary:', error);
      throw error;
    }
  }

  /**
   * Calculate meeting duration in minutes
   */
  private calculateMeetingDuration(meetingState: MeetingState): number {
    if (!meetingState.startTime) return 0;
    
    const endTime = meetingState.endTime || new Date();
    return Math.floor((endTime.getTime() - meetingState.startTime.getTime()) / 60000);
  }

  /**
   * Extract key points from meeting state
   */
  private extractKeyPoints(meetingState: MeetingState): string[] {
    // Simple extraction based on important transcripts
    return meetingState.transcriptEntries
      .filter(entry => entry.isImportant)
      .map(entry => entry.text)
      .slice(0, 5); // Top 5 key points
  }

  // ============================================================================
  // Background Processing & Monitoring
  // ============================================================================

  /**
   * Start background processing
   */
  private startBackgroundProcessing(): void {
    // Process queues every 2 seconds
    setInterval(() => {
      this.processQueues();
    }, 2000);

    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateMetrics();
    }, 30000);

    console.log('🔄 Background processing started');
  }

  /**
   * Process transcript and insight queues
   */
  private async processQueues(): Promise<void> {
    if (this.processingInProgress) return;
    
    this.processingInProgress = true;

    try {
      // Process transcript queue
      while (this.transcriptQueue.length > 0) {
        const item = this.transcriptQueue.shift();
        if (item) {
          await this.processTranscriptItem(item);
        }
      }

      // Process insight queue
      while (this.insightQueue.length > 0) {
        const item = this.insightQueue.shift();
        if (item) {
          await this.processInsightItem(item);
        }
      }

    } finally {
      this.processingInProgress = false;
    }
  }

  /**
   * Process individual transcript item
   */
  private async processTranscriptItem(item: { meetingId: string; entry: TranscriptEntry }): Promise<void> {
    const meetingState = this.activeMeetings.get(item.meetingId);
    if (!meetingState) return;

    // Update meeting metrics
    meetingState.metrics.transcriptCount++;

    // Check for important keywords or patterns
    if (this.isImportantContent(item.entry.text)) {
      item.entry.isImportant = true;
      this.emit('transcript:important', {
        meetingId: item.meetingId,
        entry: item.entry
      });
    }
  }

  /**
   * Process individual insight item
   */
  private async processInsightItem(item: { meetingId: string; transcript: TranscriptEntry[] }): Promise<void> {
    // Generate insights would be called here
    // This is a placeholder for the actual insight generation logic
  }

  /**
   * Check if content is important
   */
  private isImportantContent(text: string): boolean {
    const importantKeywords = [
      'budget', 'price', 'cost', 'timeline', 'decision', 'contract',
      'proposal', 'next steps', 'follow up', 'competitor'
    ];

    return importantKeywords.some(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase()));
  }

  /**
   * Schedule insight generation
   */
  private scheduleInsightGeneration(meetingId: string): void {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState) return;

    // Add to insight queue if we have enough new transcripts
    const recentTranscripts = meetingState.transcriptEntries.slice(-5);
    if (recentTranscripts.length >= 3) {
      this.insightQueue.push({
        meetingId,
        transcript: recentTranscripts
      });
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Setup circuit breakers for all services
   */
  private setupCircuitBreakers(): void {
    const services = ['deepgram', 'claude', 'supabase'];
    
    services.forEach(service => {
      this.circuitBreakers.set(service, {
        state: 'closed',
        failureCount: 0,
        successCount: 0
      });
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkServiceHealth();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check health of all services
   */
  private async checkServiceHealth(): Promise<void> {
    const services = ['deepgram', 'claude', 'supabase'] as const;
    
    for (const service of services) {
      const startTime = Date.now();
      
      try {
        // Service-specific health checks would go here
        const responseTime = Date.now() - startTime;
        
        this.serviceHealth[service] = {
          status: 'healthy',
          lastCheck: new Date(),
          responseTime,
          errorCount: this.serviceHealth[service].errorCount,
          uptime: this.serviceHealth[service].uptime + 30
        };

        // Reset circuit breaker on successful health check
        const breaker = this.circuitBreakers.get(service);
        if (breaker && breaker.state === 'half-open') {
          breaker.successCount++;
          if (breaker.successCount >= 3) {
            breaker.state = 'closed';
            breaker.failureCount = 0;
          }
        }

      } catch (error) {
        this.serviceHealth[service].status = 'failed';
        this.serviceHealth[service].errorCount++;
      }
    }

    // Update overall health
    const healthyServices = services.filter(s => this.serviceHealth[s].status === 'healthy');
    this.serviceHealth.overall.status = healthyServices.length === services.length ? 
      'healthy' : healthyServices.length > 0 ? 'degraded' : 'failed';
  }

  /**
   * Setup audio device monitoring
   */
  private setupAudioDeviceMonitoring(): void {
    setInterval(() => {
      this.enumerateAudioDevices();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Create default service status
   */
  private createDefaultServiceStatus(): ServiceStatus {
    return {
      status: 'unknown',
      lastCheck: new Date(),
      responseTime: 0,
      errorCount: 0,
      uptime: 0
    };
  }

  /**
   * Get active speaker (placeholder)
   */
  private getActiveSpeaker(meetingId: string): string | undefined {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState || meetingState.transcriptEntries.length === 0) {
      return undefined;
    }

    // Return the speaker of the most recent transcript entry
    return meetingState.transcriptEntries[meetingState.transcriptEntries.length - 1].speaker;
  }

  /**
   * Get connection quality
   */
  private getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const overallHealth = this.serviceHealth.overall.status;
    
    switch (overallHealth) {
      case 'healthy': return 'excellent';
      case 'degraded': return 'good';
      case 'failed': return 'poor';
      default: return 'fair';
    }
  }

  /**
   * Calculate quality score for meeting
   */
  private calculateQualityScore(meetingState: MeetingState): number {
    let score = 100;

    // Deduct points for errors
    if (meetingState.errors && meetingState.errors.length > 0) {
      score -= meetingState.errors.length * 10;
    }

    // Adjust based on transcript quality
    const avgConfidence = meetingState.transcriptEntries.length > 0 ?
      meetingState.transcriptEntries.reduce((sum, entry) => sum + entry.confidence, 0) / meetingState.transcriptEntries.length :
      100;
    
    score = (score + avgConfidence) / 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const activeMeetingCount = this.activeMeetings.size;
    const totalErrors = Object.values(this.serviceHealth).reduce((sum, health) => sum + health.errorCount, 0);
    
    this.metrics.activeStreams = activeMeetingCount;
    this.metrics.errorCount = totalErrors;
    this.metrics.successRate = this.metrics.meetingsProcessed > 0 ?
      ((this.metrics.meetingsProcessed - totalErrors) / this.metrics.meetingsProcessed) * 100 : 100;

    this.emit('metrics:updated', this.metrics);
  }

  /**
   * Process final meeting data
   */
  private async processFinalMeetingData(meetingId: string): Promise<void> {
    // Process any remaining items in queues for this meeting
    const remainingTranscripts = this.transcriptQueue.filter(item => item.meetingId === meetingId);
    const remainingInsights = this.insightQueue.filter(item => item.meetingId === meetingId);

    // Process remaining items
    for (const item of remainingTranscripts) {
      await this.processTranscriptItem(item);
    }

    for (const item of remainingInsights) {
      await this.processInsightItem(item);
    }

    // Remove processed items from queues
    this.transcriptQueue = this.transcriptQueue.filter(item => item.meetingId !== meetingId);
    this.insightQueue = this.insightQueue.filter(item => item.meetingId !== meetingId);
  }

  /**
   * Save final meeting data
   */
  private async saveFinalMeetingData(meetingId: string, summary: MeetingSummary): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.updateMeetingSession(meetingId, {
        status: 'completed',
        ended_at: new Date().toISOString(),
        summary: JSON.stringify(summary)
      });
    } catch (error) {
      console.error('Failed to save final meeting data:', error);
    }
  }

  /**
   * Cleanup meeting resources
   */
  private cleanupMeetingResources(meetingId: string): void {
    const meetingState = this.activeMeetings.get(meetingId);
    if (!meetingState) return;

    // Cleanup subscriptions
    meetingState.subscriptions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });

    // Clear queues for this meeting
    this.transcriptQueue = this.transcriptQueue.filter(item => item.meetingId !== meetingId);
    this.insightQueue = this.insightQueue.filter(item => item.meetingId !== meetingId);

    console.log(`🧹 Cleaned up resources for meeting: ${meetingId}`);
  }

  /**
   * Get service health status
   */
  getServiceHealth(): ServiceHealth {
    return { ...this.serviceHealth };
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get active meetings
   */
  getActiveMeetings(): string[] {
    return Array.from(this.activeMeetings.keys());
  }
}

// ============================================================================
// Meeting State Interface
// ============================================================================

interface MeetingState {
  id: string;
  config: MeetingConfig;
  status: 'starting' | 'active' | 'paused' | 'stopping' | 'completed';
  platform: string;
  startTime?: Date;
  endTime?: Date;
  transcriptEntries: TranscriptEntry[];
  insights: AIInsight[];
  participants: any[];
  context?: any;
  errors?: string[];
  metrics: {
    transcriptCount: number;
    insightCount: number;
    processingTime: number;
    qualityScore: number;
  };
  subscriptions: Array<() => void>;
}

// Export types and error class
export { 
  MeetingManagerError, 
  type MeetingManagerConfig, 
  type PlatformDetection, 
  type AudioDevice, 
  type ServiceHealth,
  type ProcessingResult,
  type MeetingAnalytics
};