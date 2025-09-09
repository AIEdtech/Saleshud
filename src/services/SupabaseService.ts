/**
 * SupabaseService - Comprehensive database service for SalesHud
 * Handles all database operations, real-time subscriptions, and data management
 * with proper error handling, retry logic, and TypeScript support
 */

import { createClient, SupabaseClient, RealtimeChannel, User, Session, AuthResponse } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import type {
  SupabaseConfig,
  TranscriptEntry,
  AIInsight,
  EmailTemplate,
  MeetingConfig,
  CRMData
} from '../types';

// ============================================================================
// Database Model Interfaces
// ============================================================================

/**
 * Meeting session data structure
 */
export interface MeetingSessionData {
  id: string;
  user_id: string;
  organization_id?: string;
  title: string;
  meeting_type: 'sales' | 'demo' | 'discovery' | 'follow-up' | 'closing' | 'support';
  platform: 'zoom' | 'teams' | 'meet' | 'webex' | 'other' | 'none';
  scheduled_start?: string; // ISO timestamp
  actual_start?: string;
  scheduled_duration?: number; // minutes
  actual_duration?: number;
  status: 'scheduled' | 'starting' | 'active' | 'completed' | 'cancelled';
  participants: MeetingParticipant[];
  config: MeetingConfig;
  transcript_count: number;
  insights_count: number;
  notes_count: number;
  recording_url?: string;
  recording_duration?: number;
  summary?: string;
  action_items?: string[];
  next_steps?: string[];
  deal_health_score?: number;
  buying_signals_count: number;
  created_at: string;
  updated_at: string;
  ended_at?: string;
}

/**
 * Meeting participant information
 */
export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  name: string;
  email?: string;
  role: 'host' | 'presenter' | 'attendee';
  company?: string;
  title?: string;
  is_decision_maker: boolean;
  join_time?: string;
  leave_time?: string;
  talk_time?: number; // seconds
  engagement_score?: number; // 0-100
  created_at: string;
}

/**
 * Database transcript entry
 */
export interface DBTranscriptEntry {
  id: string;
  meeting_id: string;
  speaker: string;
  speaker_id?: string;
  text: string;
  timestamp: string;
  duration?: number;
  confidence: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  keywords?: string[];
  is_important: boolean;
  word_count: number;
  created_at: string;
}

/**
 * Database AI insight
 */
export interface DBAIInsight {
  id: string;
  meeting_id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  content: string;
  timestamp: string;
  related_transcript_ids?: string[];
  suggested_action?: string;
  confidence: number;
  category?: string;
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
  updated_at: string;
}

/**
 * Meeting note
 */
export interface MeetingNote {
  id: string;
  meeting_id: string;
  user_id: string;
  title?: string;
  content: string;
  note_type: 'general' | 'action' | 'follow-up' | 'concern' | 'opportunity';
  is_private: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Generated email data
 */
export interface GeneratedEmail {
  id: string;
  meeting_id: string;
  user_id: string;
  template_id?: string;
  email_type: 'follow_up' | 'thank_you' | 'proposal' | 'meeting_request' | 'summary';
  subject: string;
  body: string;
  body_html?: string;
  recipients: string[];
  personalization_data?: Record<string, any>;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  scheduled_send_time?: string;
  sent_at?: string;
  open_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Follow-up event
 */
export interface FollowUpEvent {
  id: string;
  meeting_id: string;
  user_id: string;
  title: string;
  description?: string;
  event_type: 'demo' | 'check-in' | 'decision' | 'implementation' | 'review' | 'custom';
  scheduled_time: string;
  duration: number; // minutes
  attendees: string[];
  location?: string;
  meeting_link?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User profile data
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  organization_id?: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'user';
  preferences: Record<string, any>;
  settings: Record<string, any>;
  subscription_plan: 'free' | 'starter' | 'professional' | 'enterprise';
  subscription_status: 'active' | 'cancelled' | 'expired' | 'trial';
  created_at: string;
  updated_at: string;
  last_login: string;
}

/**
 * Organization data
 */
export interface Organization {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  settings: Record<string, any>;
  subscription_id?: string;
  billing_email?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database error types
 */
type SupabaseErrorType = 
  | 'CONNECTION_FAILED'
  | 'AUTH_FAILED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT'
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'SUBSCRIPTION_ERROR'
  | 'UNKNOWN';

/**
 * Custom Supabase error class
 */
class SupabaseError extends Error {
  public readonly type: SupabaseErrorType;
  public readonly code?: string;
  public readonly retryable: boolean;

  constructor(message: string, type: SupabaseErrorType, code?: string, retryable = false) {
    super(message);
    this.name = 'SupabaseError';
    this.type = type;
    this.code = code;
    this.retryable = retryable;
  }
}

// ============================================================================
// Main SupabaseService Class
// ============================================================================

export class SupabaseService extends EventEmitter {
  private client: SupabaseClient<any, 'public', any> | null = null;
  private config: SupabaseConfig;
  private isConnected: boolean = false;
  private _reconnectAttempts: number = 0;
  private _maxReconnectAttempts: number = 5;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private currentUser: User | null = null;
  private currentSession: Session | null = null;

  // Retry configuration
  private retryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  };

  // Performance monitoring
  private metrics = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    averageResponseTime: 0,
    activeSubscriptions: 0
  };

  constructor(config?: SupabaseConfig) {
    super();
    this.config = config || this.getDefaultConfig();
    this.setupErrorHandling();
  }

  // ============================================================================
  // Initialization and Connection Management
  // ============================================================================

  /**
   * Initialize Supabase client with configuration
   */
  async initialize(): Promise<void> {
    try {
      if (!this.config.url || !this.config.anonKey) {
        throw new SupabaseError('Supabase URL and anon key are required', 'VALIDATION_ERROR');
      }

      // Create Supabase client
      this.client = createClient(this.config.url, this.config.anonKey, {
        auth: {
          autoRefreshToken: this.config.autoRefreshToken ?? true,
          persistSession: this.config.persistSession ?? true,
          detectSessionInUrl: this.config.detectSessionInUrl ?? false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        },
        db: {
          schema: this.config.schema || 'public'
        }
      });

      // Test connection
      await this.testConnection();
      
      // Setup auth state listener
      this.setupAuthStateListener();
      
      this.isConnected = true;
      this.emit('connected');
      
      console.log('✅ Supabase service initialized successfully');
      
    } catch (error) {
      this.isConnected = false;
      throw new SupabaseError(
        `Failed to initialize Supabase: ${error}`,
        'CONNECTION_FAILED',
        undefined,
        true
      );
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');
    }

    try {
      const { error } = await this.client
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }
    } catch (error) {
      throw new SupabaseError(
        `Connection test failed: ${error}`,
        'CONNECTION_FAILED',
        undefined,
        true
      );
    }
  }

  /**
   * Setup authentication state listener
   */
  private setupAuthStateListener(): void {
    if (!this.client) return;

    this.client.auth.onAuthStateChange((event, session) => {
      this.currentSession = session;
      this.currentUser = session?.user || null;

      switch (event) {
        case 'SIGNED_IN':
          this.emit('userSignedIn', this.currentUser);
          console.log('👤 User signed in:', this.currentUser?.email);
          break;
        case 'SIGNED_OUT':
          this.emit('userSignedOut');
          this.cleanupSubscriptions();
          console.log('👤 User signed out');
          break;
        case 'TOKEN_REFRESHED':
          this.emit('tokenRefreshed', session);
          break;
        case 'USER_UPDATED':
          this.emit('userUpdated', this.currentUser);
          break;
      }
    });
  }

  // ============================================================================
  // Authentication & User Management
  // ============================================================================

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<AuthResponse> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    try {
      const response = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (response.error) {
        throw response.error;
      }

      this.emit('userSignedUp', response.data.user);
      return response;

    } catch (error) {
      throw new SupabaseError(
        `Sign up failed: ${error}`,
        'AUTH_FAILED'
      );
    }
  }

  /**
   * Sign in user
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    try {
      const response = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (response.error) {
        throw response.error;
      }

      this.emit('userSignedIn', response.data.user);
      return response;

    } catch (error) {
      throw new SupabaseError(
        `Sign in failed: ${error}`,
        'AUTH_FAILED'
      );
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    try {
      await this.client.auth.signOut();
      this.emit('userSignedOut');
    } catch (error) {
      throw new SupabaseError(
        `Sign out failed: ${error}`,
        'AUTH_FAILED'
      );
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Create or update user profile
   */
  async upsertUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');
    if (!this.currentUser) throw new SupabaseError('User not authenticated', 'AUTH_FAILED');

    try {
      const profileData = {
        id: this.currentUser.id,
        email: this.currentUser.email,
        updated_at: new Date().toISOString(),
        ...profile
      };

      const { data, error } = await this.client
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      this.emit('profileUpdated', data);
      return data;

    } catch (error) {
      throw new SupabaseError(
        `Profile update failed: ${error}`,
        'DATABASE_ERROR'
      );
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId?: string): Promise<UserProfile | null> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');
    
    const targetUserId = userId || this.currentUser?.id;
    if (!targetUserId) throw new SupabaseError('User ID required', 'VALIDATION_ERROR');

    try {
      const { data, error } = await this.client
        .from('user_profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        throw error;
      }

      return data;

    } catch (error) {
      throw new SupabaseError(
        `Failed to get profile: ${error}`,
        'DATABASE_ERROR'
      );
    }
  }

  // ============================================================================
  // Meeting Management
  // ============================================================================

  /**
   * Create new meeting session
   */
  async createMeetingSession(data: Omit<MeetingSessionData, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');
    if (!this.currentUser) throw new SupabaseError('User not authenticated', 'AUTH_FAILED');

    return this.withRetry(async () => {
      const meetingData = {
        ...data,
        user_id: this.currentUser!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: meeting, error } = await this.client!
        .from('meeting_sessions')
        .insert(meetingData)
        .select()
        .single();

      if (error) throw error;

      this.emit('meetingCreated', meeting);
      return meeting.id;
    });
  }

  /**
   * Update meeting session
   */
  async updateMeetingSession(id: string, updates: Partial<MeetingSessionData>): Promise<void> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.client!
        .from('meeting_sessions')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      this.emit('meetingUpdated', { id, updates });
    });
  }

  /**
   * End meeting session
   */
  async endMeetingSession(id: string): Promise<void> {
    return this.updateMeetingSession(id, {
      status: 'completed',
      ended_at: new Date().toISOString()
    });
  }

  /**
   * Get meeting session
   */
  async getMeetingSession(id: string): Promise<MeetingSessionData> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const { data, error } = await this.client!
        .from('meeting_sessions')
        .select(`
          *,
          participants:meeting_participants(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new SupabaseError('Meeting not found', 'NOT_FOUND');
        }
        throw error;
      }

      return data;
    });
  }

  /**
   * Get meeting history for user
   */
  async getMeetingHistory(userId?: string, limit: number = 50): Promise<MeetingSessionData[]> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    const targetUserId = userId || this.currentUser?.id;
    if (!targetUserId) throw new SupabaseError('User ID required', 'VALIDATION_ERROR');

    return this.withRetry(async () => {
      const { data, error } = await this.client!
        .from('meeting_sessions')
        .select(`
          *,
          participants:meeting_participants(*)
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    });
  }

  // ============================================================================
  // Real-time Transcript Operations
  // ============================================================================

  /**
   * Save transcript entry
   */
  async saveTranscript(meetingId: string, entry: TranscriptEntry): Promise<void> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const transcriptData: Omit<DBTranscriptEntry, 'id' | 'created_at'> = {
        meeting_id: meetingId,
        speaker: entry.speaker,
        speaker_id: entry.speakerId,
        text: entry.text,
        timestamp: entry.timestamp.toISOString(),
        duration: entry.duration,
        confidence: entry.confidence,
        sentiment: entry.sentiment,
        keywords: entry.keywords || [],
        is_important: entry.isImportant || false,
        word_count: entry.text.split(' ').length
      };

      const { error } = await this.client!
        .from('transcripts')
        .insert(transcriptData);

      if (error) throw error;

      // Update meeting session transcript count
      await this.client!.rpc('increment_transcript_count', {
        meeting_id: meetingId
      });

      this.emit('transcriptSaved', { meetingId, entry });
    });
  }

  /**
   * Get transcripts for meeting
   */
  async getTranscripts(meetingId: string, limit?: number): Promise<TranscriptEntry[]> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      let query = this.client!
        .from('transcripts')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: true });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Convert DB format to TranscriptEntry format
      return (data || []).map((dbEntry: DBTranscriptEntry): TranscriptEntry => ({
        id: dbEntry.id,
        speaker: dbEntry.speaker,
        speakerId: dbEntry.speaker_id,
        text: dbEntry.text,
        timestamp: new Date(dbEntry.timestamp),
        duration: dbEntry.duration,
        confidence: dbEntry.confidence,
        sentiment: dbEntry.sentiment,
        keywords: dbEntry.keywords,
        isImportant: dbEntry.is_important
      }));
    });
  }

  /**
   * Subscribe to real-time transcript updates
   */
  subscribeToTranscripts(meetingId: string, callback: (entry: TranscriptEntry) => void): () => void {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    const channelName = `transcripts:${meetingId}`;
    
    const channel = this.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transcripts',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          const dbEntry = payload.new as DBTranscriptEntry;
          const entry: TranscriptEntry = {
            id: dbEntry.id,
            speaker: dbEntry.speaker,
            speakerId: dbEntry.speaker_id,
            text: dbEntry.text,
            timestamp: new Date(dbEntry.timestamp),
            duration: dbEntry.duration,
            confidence: dbEntry.confidence,
            sentiment: dbEntry.sentiment,
            keywords: dbEntry.keywords,
            isImportant: dbEntry.is_important
          };
          callback(entry);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    this.metrics.activeSubscriptions++;

    // Return cleanup function
    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(channelName);
      this.metrics.activeSubscriptions--;
    };
  }

  // ============================================================================
  // AI Insights Management
  // ============================================================================

  /**
   * Save AI insight
   */
  async saveInsight(meetingId: string, insight: AIInsight): Promise<void> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const insightData: Omit<DBAIInsight, 'id' | 'created_at' | 'updated_at'> = {
        meeting_id: meetingId,
        type: insight.type,
        priority: insight.priority,
        title: insight.title,
        content: insight.content,
        timestamp: insight.timestamp.toISOString(),
        related_transcript_ids: insight.relatedTranscriptIds,
        suggested_action: insight.suggestedAction,
        confidence: insight.confidence,
        category: insight.category,
        status: 'new'
      };

      const { error } = await this.client!
        .from('ai_insights')
        .insert(insightData);

      if (error) throw error;

      // Update meeting session insights count
      await this.client!.rpc('increment_insights_count', {
        meeting_id: meetingId
      });

      this.emit('insightSaved', { meetingId, insight });
    });
  }

  /**
   * Get insights for meeting
   */
  async getInsights(meetingId: string): Promise<AIInsight[]> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const { data, error } = await this.client!
        .from('ai_insights')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Convert DB format to AIInsight format
      return (data || []).map((dbInsight: DBAIInsight): AIInsight => ({
        id: dbInsight.id,
        type: dbInsight.type as any,
        priority: dbInsight.priority,
        title: dbInsight.title,
        content: dbInsight.content,
        timestamp: new Date(dbInsight.timestamp),
        relatedTranscriptIds: dbInsight.related_transcript_ids,
        suggestedAction: dbInsight.suggested_action,
        confidence: dbInsight.confidence,
        category: dbInsight.category as any
      }));
    });
  }

  /**
   * Subscribe to real-time insight updates
   */
  subscribeToInsights(meetingId: string, callback: (insight: AIInsight) => void): () => void {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    const channelName = `insights:${meetingId}`;
    
    const channel = this.client
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_insights',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          const dbInsight = payload.new as DBAIInsight;
          const insight: AIInsight = {
            id: dbInsight.id,
            type: dbInsight.type as any,
            priority: dbInsight.priority,
            title: dbInsight.title,
            content: dbInsight.content,
            timestamp: new Date(dbInsight.timestamp),
            relatedTranscriptIds: dbInsight.related_transcript_ids,
            suggestedAction: dbInsight.suggested_action,
            confidence: dbInsight.confidence,
            category: dbInsight.category as any
          };
          callback(insight);
        }
      )
      .subscribe();

    this.subscriptions.set(channelName, channel);
    this.metrics.activeSubscriptions++;

    return () => {
      channel.unsubscribe();
      this.subscriptions.delete(channelName);
      this.metrics.activeSubscriptions--;
    };
  }

  // ============================================================================
  // Notes System
  // ============================================================================

  /**
   * Save meeting note
   */
  async saveNote(meetingId: string, note: Omit<MeetingNote, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');
    if (!this.currentUser) throw new SupabaseError('User not authenticated', 'AUTH_FAILED');

    return this.withRetry(async () => {
      const noteData = {
        ...note,
        meeting_id: meetingId,
        user_id: this.currentUser!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await this.client!
        .from('meeting_notes')
        .insert(noteData);

      if (error) throw error;

      this.emit('noteSaved', { meetingId, note });
    });
  }

  /**
   * Get notes for meeting
   */
  async getNotes(meetingId: string): Promise<MeetingNote[]> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const { data, error } = await this.client!
        .from('meeting_notes')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    });
  }

  /**
   * Update note
   */
  async updateNote(noteId: string, content: string): Promise<void> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const { error } = await this.client!
        .from('meeting_notes')
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (error) throw error;

      this.emit('noteUpdated', { noteId, content });
    });
  }

  /**
   * Delete note
   */
  async deleteNote(noteId: string): Promise<void> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const { error } = await this.client!
        .from('meeting_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      this.emit('noteDeleted', { noteId });
    });
  }

  // ============================================================================
  // Email Management
  // ============================================================================

  /**
   * Save email template
   */
  async saveEmailTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');
    if (!this.currentUser) throw new SupabaseError('User not authenticated', 'AUTH_FAILED');

    return this.withRetry(async () => {
      const templateData = {
        ...template,
        user_id: this.currentUser!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client!
        .from('email_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;

      this.emit('templateSaved', data);
      return data.id;
    });
  }

  /**
   * Get email templates for user
   */
  async getEmailTemplates(userId?: string): Promise<EmailTemplate[]> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    const targetUserId = userId || this.currentUser?.id;
    if (!targetUserId) throw new SupabaseError('User ID required', 'VALIDATION_ERROR');

    return this.withRetry(async () => {
      const { data, error } = await this.client!
        .from('email_templates')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    });
  }

  /**
   * Save generated email
   */
  async saveGeneratedEmail(email: Omit<GeneratedEmail, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');
    if (!this.currentUser) throw new SupabaseError('User not authenticated', 'AUTH_FAILED');

    return this.withRetry(async () => {
      const emailData = {
        ...email,
        user_id: this.currentUser!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client!
        .from('generated_emails')
        .insert(emailData)
        .select()
        .single();

      if (error) throw error;

      this.emit('emailSaved', data);
      return data.id;
    });
  }

  /**
   * Get generated emails for meeting
   */
  async getGeneratedEmails(meetingId: string): Promise<GeneratedEmail[]> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const { data, error } = await this.client!
        .from('generated_emails')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    });
  }

  // ============================================================================
  // Follow-up Scheduling
  // ============================================================================

  /**
   * Create follow-up event
   */
  async createFollowUpEvent(event: Omit<FollowUpEvent, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');
    if (!this.currentUser) throw new SupabaseError('User not authenticated', 'AUTH_FAILED');

    return this.withRetry(async () => {
      const eventData = {
        ...event,
        user_id: this.currentUser!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client!
        .from('follow_up_events')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;

      this.emit('followUpCreated', data);
      return data.id;
    });
  }

  /**
   * Get follow-up events for meeting
   */
  async getFollowUpEvents(meetingId: string): Promise<FollowUpEvent[]> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const { data, error } = await this.client!
        .from('follow_up_events')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      return data || [];
    });
  }

  /**
   * Update follow-up event
   */
  async updateFollowUpEvent(eventId: string, updates: Partial<FollowUpEvent>): Promise<void> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.client!
        .from('follow_up_events')
        .update(updateData)
        .eq('id', eventId);

      if (error) throw error;

      this.emit('followUpUpdated', { eventId, updates });
    });
  }

  // ============================================================================
  // CRM Integration
  // ============================================================================

  /**
   * Save CRM data
   */
  async saveCRMData(data: CRMData): Promise<void> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const crmData = {
        ...data,
        last_updated: new Date().toISOString()
      };

      const { error } = await this.client!
        .from('crm_data')
        .upsert(crmData, { onConflict: 'id' });

      if (error) throw error;

      this.emit('crmDataSaved', data);
    });
  }

  /**
   * Get CRM data by external ID
   */
  async getCRMData(externalId: string): Promise<CRMData | null> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const { data, error } = await this.client!
        .from('crm_data')
        .select('*')
        .eq('id', externalId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    });
  }

  /**
   * Sync CRM data from source
   */
  async syncCRMData(source: string): Promise<CRMData[]> {
    if (!this.client) throw new SupabaseError('Client not initialized', 'CONNECTION_FAILED');

    return this.withRetry(async () => {
      const { data, error } = await this.client!
        .from('crm_data')
        .select('*')
        .eq('provider', source)
        .order('last_updated', { ascending: false });

      if (error) throw error;

      return data || [];
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Execute operation with retry logic
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      const startTime = Date.now();
      
      try {
        this.metrics.totalQueries++;
        const result = await operation();
        
        // Update success metrics
        this.metrics.successfulQueries++;
        const responseTime = Date.now() - startTime;
        this.metrics.averageResponseTime = 
          (this.metrics.averageResponseTime + responseTime) / 2;
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        this.metrics.failedQueries++;
        
        // Don't retry certain types of errors
        if (error instanceof SupabaseError && !error.retryable) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new SupabaseError(
      `Operation failed after ${this.retryConfig.maxAttempts} attempts: ${lastError?.message}`,
      'DATABASE_ERROR',
      undefined,
      false
    );
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalQueries > 0 ? 
        (this.metrics.successfulQueries / this.metrics.totalQueries) * 100 : 0,
      isConnected: this.isConnected,
      activeUser: this.currentUser?.email || null
    };
  }

  /**
   * Cleanup all subscriptions
   */
  private cleanupSubscriptions(): void {
    this.subscriptions.forEach(channel => {
      channel.unsubscribe();
    });
    this.subscriptions.clear();
    this.metrics.activeSubscriptions = 0;
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.on('error', (error: SupabaseError) => {
      console.error('SupabaseService error:', error);
    });
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): SupabaseConfig {
    return {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    this.cleanupSubscriptions();
    
    if (this.client) {
      await this.signOut();
    }
    
    this.isConnected = false;
    this.client = null;
    this.emit('disconnected');
  }
}

// Export types and error class
export { SupabaseError, type SupabaseErrorType };