/**
 * DeepgramService - Comprehensive real-time transcription service
 * Provides advanced speech-to-text capabilities with speaker intelligence,
 * audio processing, and performance optimization for sales meetings
 */

import { EventEmitter } from 'events';
import type {
  TranscriptEntry,
  DeepgramConfig
} from '../types';

// ============================================================================
// TypeScript Interfaces for Deepgram API
// ============================================================================

/**
 * Deepgram WebSocket response types
 */
interface DeepgramTranscriptResponse {
  type: 'Results' | 'Metadata' | 'SpeechStarted' | 'UtteranceEnd' | 'Error';
  channel_index?: number[];
  duration?: number;
  start?: number;
  is_final?: boolean;
  channel?: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
      words?: DeepgramWord[];
      summaries?: Array<{
        summary: string;
        start_word?: number;
        end_word?: number;
      }>;
      paragraphs?: {
        transcript: string;
        paragraphs: Array<{
          sentences: Array<{
            text: string;
            start: number;
            end: number;
          }>;
          speaker?: number;
          num_words: number;
          start: number;
          end: number;
        }>;
      };
    }>;
    detected_language?: string;
    language_confidence?: number;
  };
  speech_final?: boolean;
  metadata?: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
    models: string[];
    model_info: Record<string, any>;
  };
  error?: string;
}

/**
 * Individual word in transcript with timing
 */
interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
  speaker?: number;
  speaker_confidence?: number;
}

/**
 * Speaker diarization result
 */
interface SpeakerInfo {
  speaker: number;
  confidence: number;
  startTime: number;
  endTime: number;
  words: DeepgramWord[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  emotion?: 'excited' | 'concerned' | 'confused' | 'neutral';
  speakingPace: number; // words per minute
}

/**
 * Audio quality metrics
 */
interface AudioQualityMetrics {
  signalToNoiseRatio: number;
  averageAmplitude: number;
  peakAmplitude: number;
  clippingDetected: boolean;
  backgroundNoiseLevel: number;
  qualityScore: number; // 0-100
}

/**
 * Connection performance metrics
 */
interface ConnectionMetrics {
  latency: number;
  bandwidth: number;
  packetsLost: number;
  reconnectCount: number;
  avgProcessingTime: number;
}

/**
 * Custom vocabulary for sales terminology
 */
interface SalesVocabulary {
  terms: string[];
  phrases: string[];
  competitors: string[];
  products: string[];
  boost: number; // confidence boost for these terms
}

/**
 * Export format options
 */
type ExportFormat = 'srt' | 'vtt' | 'json' | 'txt';

/**
 * Error types for detailed error handling
 */
type DeepgramErrorType = 
  | 'CONNECTION_FAILED'
  | 'AUTH_FAILED'
  | 'AUDIO_ERROR'
  | 'RATE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'PROCESSING_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

/**
 * Custom error class for Deepgram errors
 */
class DeepgramError extends Error {
  public readonly type: DeepgramErrorType;
  public readonly code?: string;
  public readonly retryable: boolean;

  constructor(message: string, type: DeepgramErrorType, code?: string, retryable = false) {
    super(message);
    this.name = 'DeepgramError';
    this.type = type;
    this.code = code;
    this.retryable = retryable;
  }
}

// ============================================================================
// Main DeepgramService Class
// ============================================================================

/**
 * Comprehensive Deepgram service for real-time transcription
 */
export class DeepgramService extends EventEmitter {
  private apiKey: string = '';
  private config: DeepgramConfig;
  private websocket: WebSocket | null = null;
  private isConnected: boolean = false;
  private isTranscribing: boolean = false;
  private connectionPool: WebSocket[] = [];
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second

  // Audio processing
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private audioBuffer: ArrayBuffer[] = [];
  private bufferSize: number = 4096;
  private sampleRate: number = 16000;

  // Speaker intelligence
  private speakers: Map<number, SpeakerInfo> = new Map();
  private currentSpeaker: number = -1;
  private speakerChangeThreshold: number = 0.7;
  private talkTimeTracker: Map<number, number> = new Map();
  private interruptionCount: number = 0;

  // Performance optimization
  private connectionMetrics: ConnectionMetrics = {
    latency: 0,
    bandwidth: 0,
    packetsLost: 0,
    reconnectCount: 0,
    avgProcessingTime: 0
  };

  // Audio quality
  private audioQuality: AudioQualityMetrics = {
    signalToNoiseRatio: 0,
    averageAmplitude: 0,
    peakAmplitude: 0,
    clippingDetected: false,
    backgroundNoiseLevel: 0,
    qualityScore: 0
  };

  // Sales vocabulary
  private salesVocabulary: SalesVocabulary = {
    terms: [
      'ROI', 'budget', 'decision maker', 'timeline', 'competitor',
      'proposal', 'pricing', 'contract', 'implementation', 'support',
      'features', 'integration', 'scalability', 'enterprise', 'SLA',
      'procurement', 'evaluation', 'pilot', 'trial', 'demo'
    ],
    phrases: [
      'what is the pricing',
      'when can we start',
      'who makes the final decision',
      'what is your budget',
      'competitive analysis',
      'next steps',
      'follow up meeting'
    ],
    competitors: [],
    products: [],
    boost: 1.2
  };

  // Transcript history
  private transcriptHistory: TranscriptEntry[] = [];
  private partialTranscript: string = '';

  constructor() {
    super();
    this.config = this.getDefaultConfig();
    this.setupErrorHandling();
  }

  // ============================================================================
  // Core Public Methods
  // ============================================================================

  /**
   * Initialize the service with API key and configuration
   */
  async initialize(apiKey: string, customConfig?: Partial<DeepgramConfig>): Promise<void> {
    if (!apiKey || apiKey.trim() === '') {
      throw new DeepgramError('API key is required', 'AUTH_FAILED');
    }

    this.apiKey = apiKey;
    this.config = { ...this.config, ...customConfig };

    try {
      // Test connection with a simple request
      await this.testConnection();
      this.emit('initialized', { config: this.config });
    } catch (error) {
      throw new DeepgramError(
        `Failed to initialize Deepgram service: ${error}`,
        'CONNECTION_FAILED',
        undefined,
        true
      );
    }
  }

  /**
   * Start real-time transcription
   */
  async startTranscription(config?: Partial<DeepgramConfig>): Promise<void> {
    if (this.isTranscribing) {
      console.warn('Transcription already in progress');
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      // Initialize audio context
      await this.setupAudioCapture();
      
      // Connect to Deepgram WebSocket
      await this.connectWebSocket();
      
      // Start audio streaming
      await this.startAudioStreaming();
      
      this.isTranscribing = true;
      this.emit('transcriptionStarted', { config: this.config });
      
    } catch (error) {
      this.isTranscribing = false;
      throw new DeepgramError(
        `Failed to start transcription: ${error}`,
        'PROCESSING_ERROR',
        undefined,
        true
      );
    }
  }

  /**
   * Stop transcription and cleanup resources
   */
  async stopTranscription(): Promise<void> {
    if (!this.isTranscribing) {
      return;
    }

    this.isTranscribing = false;

    try {
      // Stop audio streaming
      this.stopAudioStreaming();
      
      // Close WebSocket connection
      this.disconnectWebSocket();
      
      // Cleanup audio resources
      this.cleanupAudioCapture();
      
      this.emit('transcriptionStopped', {
        finalTranscript: this.transcriptHistory,
        metrics: this.connectionMetrics,
        audioQuality: this.audioQuality
      });
      
    } catch (error) {
      console.error('Error stopping transcription:', error);
      this.emit('error', new DeepgramError(
        `Error stopping transcription: ${error}`,
        'PROCESSING_ERROR'
      ));
    }
  }

  /**
   * Process audio buffer for transcription
   */
  processAudio(audioBuffer: ArrayBuffer): void {
    if (!this.isTranscribing || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Analyze audio quality
      this.analyzeAudioQuality(audioBuffer);
      
      // Apply audio processing
      const processedBuffer = this.processAudioBuffer(audioBuffer);
      
      // Send to Deepgram
      this.websocket.send(processedBuffer);
      
      // Update performance metrics
      this.updatePerformanceMetrics();
      
    } catch (error) {
      this.emit('error', new DeepgramError(
        `Error processing audio: ${error}`,
        'AUDIO_ERROR'
      ));
    }
  }

  /**
   * Set up transcript received callback
   */
  onTranscriptReceived(callback: (transcript: TranscriptEntry) => void): void {
    this.on('transcriptReceived', callback);
  }

  /**
   * Set up error callback
   */
  onError(callback: (error: DeepgramError) => void): void {
    this.on('error', callback);
  }

  // ============================================================================
  // WebSocket Connection Management
  // ============================================================================

  /**
   * Connect to Deepgram WebSocket with connection pooling
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.buildWebSocketUrl();
        this.websocket = new WebSocket(wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (this.websocket) {
            this.websocket.close();
          }
          reject(new DeepgramError('Connection timeout', 'TIMEOUT', undefined, true));
        }, 10000);

        this.websocket.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000; // Reset delay
          this.connectionMetrics.reconnectCount++;
          
          this.emit('connected');
          resolve();
        };

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.websocket.onerror = (error) => {
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.emit('error', new DeepgramError(
            'WebSocket connection error',
            'CONNECTION_FAILED',
            undefined,
            true
          ));
          reject(error);
        };

        this.websocket.onclose = (event) => {
          this.isConnected = false;
          this.handleConnectionClose(event);
        };

      } catch (error) {
        reject(new DeepgramError(
          `Failed to create WebSocket connection: ${error}`,
          'CONNECTION_FAILED',
          undefined,
          true
        ));
      }
    });
  }

  /**
   * Handle WebSocket connection close with automatic reconnection
   */
  private handleConnectionClose(event: CloseEvent): void {
    this.isConnected = false;
    
    if (this.isTranscribing && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      setTimeout(() => {
        this.attemptReconnection();
      }, this.reconnectDelay);
      
      // Exponential backoff
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      
      this.emit('reconnecting', {
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        delay: this.reconnectDelay
      });
    } else {
      this.emit('disconnected', { code: event.code, reason: event.reason });
    }
  }

  /**
   * Attempt to reconnect with graceful degradation
   */
  private async attemptReconnection(): Promise<void> {
    try {
      await this.connectWebSocket();
      this.emit('reconnected', { attempts: this.reconnectAttempts });
    } catch (error) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('error', new DeepgramError(
          'Max reconnection attempts exceeded',
          'CONNECTION_FAILED',
          undefined,
          false
        ));
      }
    }
  }

  /**
   * Disconnect WebSocket
   */
  private disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
  }

  /**
   * Build WebSocket URL with configuration parameters
   */
  private buildWebSocketUrl(): string {
    const baseUrl = this.config.apiUrl || 'wss://api.deepgram.com/v1/listen';
    const params = new URLSearchParams();

    // Core parameters
    params.append('model', this.config.model || 'nova-2');
    params.append('language', this.config.language || 'en-US');
    params.append('punctuate', this.config.punctuate ? 'true' : 'false');
    params.append('diarize', this.config.diarize ? 'true' : 'false');
    params.append('smart_format', this.config.smartFormat ? 'true' : 'false');
    params.append('numerals', this.config.numerals ? 'true' : 'false');

    // Advanced features for sales meetings
    params.append('interim_results', 'true');
    params.append('endpointing', '300'); // 300ms silence threshold
    params.append('vad_events', 'true'); // Voice activity detection
    params.append('filler_words', 'true'); // Include "um", "uh", etc.
    params.append('multichannel', 'false');
    params.append('alternatives', '3'); // Get alternative transcriptions
    params.append('profanity_filter', this.config.profanityFilter ? 'true' : 'false');
    
    // Sentiment analysis
    params.append('sentiment', 'true');
    params.append('sentiment_threshold', '0.25');
    
    // Summarization for insights
    params.append('summarize', 'v2');
    
    // Custom vocabulary boost
    if (this.salesVocabulary.terms.length > 0) {
      params.append('search', this.salesVocabulary.terms.join(','));
    }

    return `${baseUrl}?${params.toString()}&Authorization=Token ${this.apiKey}`;
  }

  // ============================================================================
  // Audio Processing and Streaming
  // ============================================================================

  /**
   * Setup audio capture from microphone
   */
  private async setupAudioCapture(): Promise<void> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      });

      // Create audio source
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create processor for audio data
      this.processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        const audioData = this.convertFloat32ToInt16(inputBuffer);
        this.processAudio(audioData.buffer);
      };

      // Connect audio graph
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

    } catch (error) {
      throw new DeepgramError(
        `Failed to setup audio capture: ${error}`,
        'AUDIO_ERROR'
      );
    }
  }

  /**
   * Start audio streaming to Deepgram
   */
  private async startAudioStreaming(): Promise<void> {
    if (!this.audioContext || !this.processor) {
      throw new DeepgramError('Audio context not initialized', 'AUDIO_ERROR');
    }

    try {
      await this.audioContext.resume();
      this.emit('audioStreamingStarted');
    } catch (error) {
      throw new DeepgramError(
        `Failed to start audio streaming: ${error}`,
        'AUDIO_ERROR'
      );
    }
  }

  /**
   * Stop audio streaming
   */
  private stopAudioStreaming(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
  }

  /**
   * Cleanup audio capture resources
   */
  private cleanupAudioCapture(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Convert Float32 audio data to Int16 for Deepgram
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
   * Process audio buffer with noise reduction and quality enhancement
   */
  private processAudioBuffer(audioBuffer: ArrayBuffer): ArrayBuffer {
    // Apply basic audio processing
    const processedBuffer = this.applyNoiseReduction(audioBuffer);
    return this.applyAutoGainControl(processedBuffer);
  }

  /**
   * Apply noise reduction to audio buffer
   */
  private applyNoiseReduction(buffer: ArrayBuffer): ArrayBuffer {
    // Simple noise gate implementation
    const int16Array = new Int16Array(buffer);
    const threshold = 500; // Noise threshold
    
    for (let i = 0; i < int16Array.length; i++) {
      if (Math.abs(int16Array[i]) < threshold) {
        int16Array[i] = 0;
      }
    }
    
    return int16Array.buffer;
  }

  /**
   * Apply automatic gain control
   */
  private applyAutoGainControl(buffer: ArrayBuffer): ArrayBuffer {
    const int16Array = new Int16Array(buffer);
    const targetLevel = 16384; // Target amplitude
    
    // Calculate current peak
    let peak = 0;
    for (let i = 0; i < int16Array.length; i++) {
      peak = Math.max(peak, Math.abs(int16Array[i]));
    }
    
    if (peak === 0) return buffer;
    
    // Calculate gain adjustment
    const gain = Math.min(2.0, targetLevel / peak);
    
    // Apply gain
    for (let i = 0; i < int16Array.length; i++) {
      int16Array[i] = Math.max(-32768, Math.min(32767, int16Array[i] * gain));
    }
    
    return int16Array.buffer;
  }

  /**
   * Analyze audio quality metrics
   */
  private analyzeAudioQuality(buffer: ArrayBuffer): void {
    const int16Array = new Int16Array(buffer);
    const length = int16Array.length;
    
    let sum = 0;
    let peak = 0;
    let clipping = 0;
    
    for (let i = 0; i < length; i++) {
      const sample = Math.abs(int16Array[i]);
      sum += sample;
      peak = Math.max(peak, sample);
      
      if (sample >= 32767) {
        clipping++;
      }
    }
    
    this.audioQuality.averageAmplitude = sum / length;
    this.audioQuality.peakAmplitude = peak;
    this.audioQuality.clippingDetected = clipping > (length * 0.01); // 1% clipping threshold
    
    // Calculate quality score (0-100)
    let qualityScore = 100;
    qualityScore -= this.audioQuality.clippingDetected ? 20 : 0;
    qualityScore -= this.audioQuality.averageAmplitude < 1000 ? 15 : 0; // Too quiet
    qualityScore -= this.audioQuality.backgroundNoiseLevel > 2000 ? 10 : 0; // Too noisy
    
    this.audioQuality.qualityScore = Math.max(0, qualityScore);
    
    // Emit quality update if significant change
    if (Math.abs(this.audioQuality.qualityScore - qualityScore) > 5) {
      this.emit('audioQualityUpdate', this.audioQuality);
    }
  }

  // ============================================================================
  // Message Processing and Speaker Intelligence
  // ============================================================================

  /**
   * Handle WebSocket messages from Deepgram
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data: DeepgramTranscriptResponse = JSON.parse(event.data);
      
      switch (data.type) {
        case 'Results':
          this.processTranscriptResults(data);
          break;
          
        case 'Metadata':
          this.processMetadata(data);
          break;
          
        case 'SpeechStarted':
          this.emit('speechStarted', data);
          break;
          
        case 'UtteranceEnd':
          this.processUtteranceEnd(data);
          break;
          
        case 'Error':
          this.handleDeepgramError(data);
          break;
          
        default:
          console.debug('Unknown message type:', data.type);
      }
      
    } catch (error) {
      this.emit('error', new DeepgramError(
        `Error processing WebSocket message: ${error}`,
        'PROCESSING_ERROR'
      ));
    }
  }

  /**
   * Process transcript results with speaker intelligence
   */
  private processTranscriptResults(data: DeepgramTranscriptResponse): void {
    if (!data.channel?.alternatives?.length) return;
    
    const alternative = data.channel.alternatives[0];
    const transcript = alternative.transcript.trim();
    
    if (!transcript) return;
    
    // Create transcript entry
    const entry: TranscriptEntry = {
      id: `transcript_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      speaker: this.determineSpeaker(alternative),
      speakerId: this.currentSpeaker.toString(),
      text: transcript,
      timestamp: new Date(),
      duration: data.duration || 0,
      confidence: alternative.confidence || 0,
      sentiment: this.analyzeSentiment(alternative),
      keywords: this.extractKeywords(transcript),
      isImportant: this.isImportantContent(transcript)
    };
    
    // Update speaker intelligence
    this.updateSpeakerIntelligence(entry, alternative);
    
    // Add to history
    if (data.is_final) {
      this.transcriptHistory.push(entry);
      this.partialTranscript = '';
    } else {
      this.partialTranscript = transcript;
    }
    
    // Emit transcript update
    this.emit('transcriptReceived', entry);
    
    // Check for buying signals
    const buyingSignals = this.detectBuyingSignals(transcript);
    if (buyingSignals.length > 0) {
      buyingSignals.forEach(signal => {
        this.emit('buyingSignalDetected', signal);
      });
    }
  }

  /**
   * Determine speaker from transcript alternative
   */
  private determineSpeaker(alternative: any): string {
    // Use speaker diarization if available
    if (alternative.words?.length > 0) {
      const speakerCounts = new Map<number, number>();
      
      alternative.words.forEach((word: DeepgramWord) => {
        if (typeof word.speaker === 'number') {
          speakerCounts.set(word.speaker, (speakerCounts.get(word.speaker) || 0) + 1);
        }
      });
      
      // Find dominant speaker
      let dominantSpeaker = 0;
      let maxCount = 0;
      
      speakerCounts.forEach((count, speaker) => {
        if (count > maxCount) {
          maxCount = count;
          dominantSpeaker = speaker;
        }
      });
      
      this.currentSpeaker = dominantSpeaker;
      return `Speaker ${dominantSpeaker + 1}`;
    }
    
    return 'Speaker 1';
  }

  /**
   * Analyze sentiment from transcript
   */
  private analyzeSentiment(alternative: any): 'positive' | 'neutral' | 'negative' {
    const transcript = alternative.transcript.toLowerCase();
    
    // Simple sentiment analysis keywords
    const positiveWords = ['great', 'excellent', 'perfect', 'love', 'amazing', 'fantastic', 'yes', 'absolutely', 'definitely'];
    const negativeWords = ['bad', 'terrible', 'hate', 'no', 'never', 'problem', 'issue', 'concern', 'worry'];
    
    const positiveCount = positiveWords.reduce((count, word) => 
      count + (transcript.includes(word) ? 1 : 0), 0);
    const negativeCount = negativeWords.reduce((count, word) => 
      count + (transcript.includes(word) ? 1 : 0), 0);
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Extract keywords from transcript
   */
  private extractKeywords(transcript: string): string[] {
    const words = transcript.toLowerCase().split(/\s+/);
    const keywords: string[] = [];
    
    // Check for sales vocabulary terms
    this.salesVocabulary.terms.forEach(term => {
      if (transcript.toLowerCase().includes(term.toLowerCase())) {
        keywords.push(term);
      }
    });
    
    // Check for sales phrases
    this.salesVocabulary.phrases.forEach(phrase => {
      if (transcript.toLowerCase().includes(phrase.toLowerCase())) {
        keywords.push(phrase);
      }
    });
    
    return keywords;
  }

  /**
   * Determine if content is important based on keywords and context
   */
  private isImportantContent(transcript: string): boolean {
    const importantKeywords = [
      'budget', 'price', 'cost', 'timeline', 'decision', 'contract',
      'competitor', 'proposal', 'next steps', 'follow up', 'meeting'
    ];
    
    return importantKeywords.some(keyword => 
      transcript.toLowerCase().includes(keyword));
  }

  /**
   * Update speaker intelligence metrics
   */
  private updateSpeakerIntelligence(entry: TranscriptEntry, alternative: any): void {
    const speakerId = parseInt(entry.speakerId || '0');
    
    if (!this.speakers.has(speakerId)) {
      this.speakers.set(speakerId, {
        speaker: speakerId,
        confidence: 0,
        startTime: Date.now(),
        endTime: Date.now(),
        words: [],
        speakingPace: 0
      });
    }
    
    const speaker = this.speakers.get(speakerId)!;
    
    // Update speaking time
    const currentTime = (this.talkTimeTracker.get(speakerId) || 0) + (entry.duration || 0);
    this.talkTimeTracker.set(speakerId, currentTime);
    
    // Calculate speaking pace (words per minute)
    const wordCount = entry.text.split(/\s+/).length;
    const durationMinutes = (entry.duration || 0) / 60;
    if (durationMinutes > 0) {
      speaker.speakingPace = wordCount / durationMinutes;
    }
    
    // Update emotion detection (simplified)
    speaker.emotion = this.detectEmotion(entry.text, entry.sentiment);
    
    // Update speaker info
    speaker.endTime = Date.now();
    speaker.confidence = entry.confidence;
    
    this.speakers.set(speakerId, speaker);
  }

  /**
   * Detect speaker emotion from text and sentiment
   */
  private detectEmotion(text: string, sentiment?: string): 'excited' | 'concerned' | 'confused' | 'neutral' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('!') || lowerText.includes('wow') || lowerText.includes('amazing')) {
      return 'excited';
    }
    
    if (lowerText.includes('?') && lowerText.includes('how') || lowerText.includes('what')) {
      return 'confused';
    }
    
    if (sentiment === 'negative' || lowerText.includes('concern') || lowerText.includes('worry')) {
      return 'concerned';
    }
    
    return 'neutral';
  }

  /**
   * Detect buying signals in transcript
   */
  private detectBuyingSignals(transcript: string): any[] {
    const signals: any[] = [];
    const lowerText = transcript.toLowerCase();
    
    // Positive buying signals
    const positiveTriggers = [
      { pattern: /when (can|could) we (start|begin)/i, strength: 'strong', signal: 'Ready to start' },
      { pattern: /what.*pricing/i, strength: 'moderate', signal: 'Pricing inquiry' },
      { pattern: /send.*proposal/i, strength: 'strong', signal: 'Requesting proposal' },
      { pattern: /next steps/i, strength: 'moderate', signal: 'Interested in progression' },
      { pattern: /sounds (good|great|perfect)/i, strength: 'moderate', signal: 'Positive feedback' },
    ];
    
    // Negative buying signals
    const negativeTriggers = [
      { pattern: /too expensive/i, strength: 'strong', signal: 'Price objection' },
      { pattern: /need to think/i, strength: 'moderate', signal: 'Hesitation' },
      { pattern: /not sure/i, strength: 'weak', signal: 'Uncertainty' },
    ];
    
    [...positiveTriggers, ...negativeTriggers].forEach(trigger => {
      if (trigger.pattern.test(transcript)) {
        signals.push({
          id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: positiveTriggers.includes(trigger) ? 'positive' : 'negative',
          signal: trigger.signal,
          strength: trigger.strength,
          timestamp: new Date(),
          context: transcript,
          suggestedResponse: this.getSuggestedResponse(trigger.signal)
        });
      }
    });
    
    return signals;
  }

  /**
   * Get suggested response for buying signal
   */
  private getSuggestedResponse(signal: string): string {
    const responses: Record<string, string> = {
      'Ready to start': 'That\'s great to hear! Let me outline the next steps for getting started.',
      'Pricing inquiry': 'I\'d be happy to discuss our pricing options. Let me walk you through our packages.',
      'Requesting proposal': 'I\'ll prepare a customized proposal for you. When would be a good time to review it?',
      'Price objection': 'I understand pricing is important. Let me show you the ROI this solution provides.',
      'Hesitation': 'I completely understand. What specific concerns can I address for you?'
    };
    
    return responses[signal] || 'Thank you for sharing that. How can I help address your needs?';
  }

  /**
   * Process utterance end for speaker change detection
   */
  private processUtteranceEnd(data: DeepgramTranscriptResponse): void {
    this.emit('utteranceEnd', {
      timestamp: new Date(),
      speaker: this.currentSpeaker,
      duration: data.duration
    });
  }

  /**
   * Process metadata from Deepgram
   */
  private processMetadata(data: DeepgramTranscriptResponse): void {
    if (data.metadata) {
      this.emit('metadata', data.metadata);
    }
  }

  /**
   * Handle Deepgram API errors
   */
  private handleDeepgramError(data: DeepgramTranscriptResponse): void {
    const errorMessage = data.error || 'Unknown Deepgram error';
    this.emit('error', new DeepgramError(
      errorMessage,
      'PROCESSING_ERROR',
      undefined,
      true
    ));
  }

  // ============================================================================
  // Performance Optimization
  // ============================================================================

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const now = Date.now();
    const processingStart = now;
    
    // Simulate processing time calculation
    setTimeout(() => {
      const processingTime = Date.now() - processingStart;
      this.connectionMetrics.avgProcessingTime = 
        (this.connectionMetrics.avgProcessingTime + processingTime) / 2;
    }, 0);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): ConnectionMetrics {
    return { ...this.connectionMetrics };
  }

  /**
   * Get audio quality metrics
   */
  getAudioQualityMetrics(): AudioQualityMetrics {
    return { ...this.audioQuality };
  }

  /**
   * Get speaker analytics
   */
  getSpeakerAnalytics(): Map<number, SpeakerInfo> {
    return new Map(this.speakers);
  }

  /**
   * Get talk time ratios
   */
  getTalkTimeRatios(): Record<string, number> {
    const totalTime = Array.from(this.talkTimeTracker.values()).reduce((sum, time) => sum + time, 0);
    const ratios: Record<string, number> = {};
    
    this.talkTimeTracker.forEach((time, speakerId) => {
      ratios[`Speaker ${speakerId + 1}`] = totalTime > 0 ? (time / totalTime) * 100 : 0;
    });
    
    return ratios;
  }

  // ============================================================================
  // Export and Integration Features
  // ============================================================================

  /**
   * Export transcript in specified format
   */
  async exportTranscript(format: ExportFormat, filename?: string): Promise<string> {
    try {
      let content = '';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = `transcript_${timestamp}`;
      
      switch (format) {
        case 'json':
          content = JSON.stringify({
            transcript: this.transcriptHistory,
            speakers: Array.from(this.speakers.values()),
            metrics: this.connectionMetrics,
            audioQuality: this.audioQuality,
            exportedAt: new Date().toISOString()
          }, null, 2);
          break;
          
        case 'srt':
          content = this.generateSRT();
          break;
          
        case 'vtt':
          content = this.generateVTT();
          break;
          
        case 'txt':
          content = this.generatePlainText();
          break;
          
        default:
          throw new Error('Unsupported export format');
      }
      
      // In a real implementation, this would save to file system
      // For now, return the content
      return content;
      
    } catch (error) {
      throw new DeepgramError(
        `Failed to export transcript: ${error}`,
        'PROCESSING_ERROR'
      );
    }
  }

  /**
   * Generate SRT format subtitle file
   */
  private generateSRT(): string {
    let srt = '';
    let index = 1;
    
    this.transcriptHistory.forEach(entry => {
      const startTime = this.formatSRTTime(entry.timestamp);
      const endTime = this.formatSRTTime(new Date(entry.timestamp.getTime() + (entry.duration || 0) * 1000));
      
      srt += `${index}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${entry.speaker}: ${entry.text}\n\n`;
      
      index++;
    });
    
    return srt;
  }

  /**
   * Generate VTT format subtitle file
   */
  private generateVTT(): string {
    let vtt = 'WEBVTT\n\n';
    
    this.transcriptHistory.forEach(entry => {
      const startTime = this.formatVTTTime(entry.timestamp);
      const endTime = this.formatVTTTime(new Date(entry.timestamp.getTime() + (entry.duration || 0) * 1000));
      
      vtt += `${startTime} --> ${endTime}\n`;
      vtt += `<v ${entry.speaker}>${entry.text}\n\n`;
    });
    
    return vtt;
  }

  /**
   * Generate plain text format
   */
  private generatePlainText(): string {
    let text = 'Meeting Transcript\n';
    text += '================\n\n';
    
    this.transcriptHistory.forEach(entry => {
      const time = entry.timestamp.toLocaleTimeString();
      text += `[${time}] ${entry.speaker}: ${entry.text}\n`;
    });
    
    return text;
  }

  /**
   * Format time for SRT format
   */
  private formatSRTTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
  }

  /**
   * Format time for VTT format
   */
  private formatVTTTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  // ============================================================================
  // Configuration and Utilities
  // ============================================================================

  /**
   * Get default Deepgram configuration
   */
  private getDefaultConfig(): DeepgramConfig {
    return {
      apiKey: '',
      apiUrl: 'wss://api.deepgram.com/v1/listen',
      model: 'nova-2',
      language: 'en-US',
      punctuate: true,
      profanityFilter: false,
      diarize: true,
      smartFormat: true,
      numerals: true
    };
  }

  /**
   * Test connection to Deepgram API
   */
  private async testConnection(): Promise<void> {
    // This would typically make a test API call
    // For now, we'll just validate the API key format
    if (!this.apiKey.match(/^[a-zA-Z0-9]+$/)) {
      throw new Error('Invalid API key format');
    }
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling(): void {
    this.on('error', (error: DeepgramError) => {
      console.error('DeepgramService error:', error);
      
      // Attempt recovery for retryable errors
      if (error.retryable && this.isTranscribing) {
        setTimeout(() => {
          this.attemptReconnection();
        }, 2000);
      }
    });
  }

  /**
   * Update sales vocabulary
   */
  updateSalesVocabulary(vocabulary: Partial<SalesVocabulary>): void {
    this.salesVocabulary = { ...this.salesVocabulary, ...vocabulary };
  }

  /**
   * Get current transcript history
   */
  getTranscriptHistory(): TranscriptEntry[] {
    return [...this.transcriptHistory];
  }

  /**
   * Clear transcript history
   */
  clearTranscriptHistory(): void {
    this.transcriptHistory = [];
    this.speakers.clear();
    this.talkTimeTracker.clear();
  }

  /**
   * Get service status
   */
  getStatus(): {
    isConnected: boolean;
    isTranscribing: boolean;
    reconnectAttempts: number;
    transcriptEntries: number;
    speakers: number;
  } {
    return {
      isConnected: this.isConnected,
      isTranscribing: this.isTranscribing,
      reconnectAttempts: this.reconnectAttempts,
      transcriptEntries: this.transcriptHistory.length,
      speakers: this.speakers.size
    };
  }
}

// Export error class and types
export { DeepgramError, type DeepgramErrorType, type SpeakerInfo, type AudioQualityMetrics };