/**
 * Salesforce CRM Integration Service via Zapier
 * Handles bidirectional sync between SalesHud and Salesforce using Zapier webhooks
 */

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SalesforceContact {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  company?: string;
  accountId?: string;
  ownerId?: string;
  leadSource?: string;
  lastActivityDate?: Date;
  customFields?: Record<string, any>;
}

export interface SalesforceOpportunity {
  id?: string;
  name: string;
  accountId: string;
  amount?: number;
  stage: string;
  probability?: number;
  closeDate: Date;
  ownerId?: string;
  contactId?: string;
  description?: string;
  nextStep?: string;
  leadSource?: string;
  type?: string;
  customFields?: Record<string, any>;
}

export interface SalesforceTask {
  id?: string;
  subject: string;
  description?: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Waiting' | 'Deferred';
  priority: 'High' | 'Normal' | 'Low';
  dueDate?: Date;
  whatId?: string; // Related to (Opportunity/Account)
  whoId?: string; // Related to (Contact/Lead)
  ownerId?: string;
  type?: 'Call' | 'Email' | 'Meeting' | 'Other';
  customFields?: Record<string, any>;
}

export interface SalesforceLead {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  title?: string;
  phone?: string;
  status: string;
  rating?: 'Hot' | 'Warm' | 'Cold';
  source?: string;
  industry?: string;
  numberOfEmployees?: number;
  annualRevenue?: number;
  ownerId?: string;
  convertedDate?: Date;
  customFields?: Record<string, any>;
}

export interface SalesforceActivity {
  id?: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Task' | 'Event';
  subject: string;
  description?: string;
  startDateTime?: Date;
  endDateTime?: Date;
  duration?: number;
  relatedTo?: {
    type: 'Contact' | 'Lead' | 'Opportunity' | 'Account';
    id: string;
  };
  participants?: string[];
  outcome?: string;
  nextSteps?: string;
  recordings?: string[];
  transcripts?: string[];
  customFields?: Record<string, any>;
}

export interface ZapierWebhookPayload {
  webhookId: string;
  eventType: string;
  timestamp: Date;
  data: any;
  metadata?: {
    source: string;
    version: string;
    retryCount?: number;
  };
}

export interface SalesforceSyncConfig {
  zapierWebhookUrl: string;
  zapierApiKey?: string;
  syncInterval?: number; // in milliseconds
  retryAttempts?: number;
  retryDelay?: number; // in milliseconds
  batchSize?: number;
  enableRealTimeSync?: boolean;
  enableBulkOperations?: boolean;
  fieldMapping?: Record<string, string>;
  customWebhooks?: {
    onContactCreate?: string;
    onOpportunityUpdate?: string;
    onTaskComplete?: string;
    onLeadConvert?: string;
    onActivityLog?: string;
  };
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors?: Array<{
    record: any;
    error: string;
    timestamp: Date;
  }>;
  warnings?: string[];
  syncId: string;
  duration: number;
}

export interface MeetingToCRMPayload {
  meetingId: string;
  participants: Array<{
    email: string;
    name: string;
    role?: string;
  }>;
  startTime: Date;
  endTime: Date;
  duration: number;
  summary?: string;
  keyPoints?: string[];
  actionItems?: Array<{
    task: string;
    assignee?: string;
    dueDate?: Date;
  }>;
  sentiment?: {
    overall: number;
    breakdown?: Record<string, number>;
  };
  transcriptUrl?: string;
  recordingUrl?: string;
  nextSteps?: string;
  dealProbability?: number;
  competitorsmentioned?: string[];
  productsDiscussed?: string[];
}

// ============================================================================
// Main Service Class
// ============================================================================

export class SalesforceService extends EventEmitter {
  private config: SalesforceSyncConfig;
  private axios: AxiosInstance;
  private syncQueue: Map<string, any>;
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  private retryQueue: Map<string, { data: any; attempts: number }>;
  private webhookHandlers: Map<string, Function>;

  constructor(config: SalesforceSyncConfig) {
    super();
    this.config = this.validateConfig(config);
    this.syncQueue = new Map();
    this.retryQueue = new Map();
    this.webhookHandlers = new Map();
    
    // Initialize axios with default configuration
    this.axios = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.zapierApiKey && { 'X-API-Key': config.zapierApiKey })
      }
    });

    this.setupInterceptors();
    this.registerDefaultHandlers();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Salesforce integration via Zapier...');
      
      // Test webhook connection
      await this.testWebhookConnection();
      
      // Start sync interval if configured
      if (this.config.syncInterval && this.config.syncInterval > 0) {
        this.startSyncInterval();
      }

      this.isInitialized = true;
      this.emit('initialized');
      console.log('Salesforce integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Salesforce integration:', error);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: SalesforceSyncConfig): SalesforceSyncConfig {
    if (!config.zapierWebhookUrl) {
      throw new Error('Zapier webhook URL is required');
    }

    return {
      ...config,
      syncInterval: config.syncInterval || 0,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      batchSize: config.batchSize || 50,
      enableRealTimeSync: config.enableRealTimeSync !== false,
      enableBulkOperations: config.enableBulkOperations || false,
      fieldMapping: config.fieldMapping || {},
      customWebhooks: config.customWebhooks || {}
    };
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        console.log(`[Salesforce] API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Salesforce] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        console.log(`[Salesforce] API Response: ${response.status}`);
        return response;
      },
      async (error) => {
        if (error.response?.status === 429) {
          // Rate limited - implement exponential backoff
          const retryAfter = error.response.headers['retry-after'] || 5;
          console.log(`[Salesforce] Rate limited. Retrying after ${retryAfter} seconds`);
          await this.delay(retryAfter * 1000);
          return this.axios.request(error.config);
        }
        console.error('[Salesforce] Response error:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Register default webhook handlers
   */
  private registerDefaultHandlers(): void {
    // Default handlers for common Salesforce events
    this.webhookHandlers.set('contact.created', this.handleContactCreated.bind(this));
    this.webhookHandlers.set('opportunity.updated', this.handleOpportunityUpdated.bind(this));
    this.webhookHandlers.set('task.completed', this.handleTaskCompleted.bind(this));
    this.webhookHandlers.set('lead.converted', this.handleLeadConverted.bind(this));
  }

  // ============================================================================
  // Core Sync Methods
  // ============================================================================

  /**
   * Sync meeting data to Salesforce
   */
  async syncMeetingToCRM(payload: MeetingToCRMPayload): Promise<SyncResult> {
    const startTime = Date.now();
    const syncId = this.generateSyncId();
    
    try {
      console.log(`[Salesforce] Syncing meeting ${payload.meetingId} to CRM`);
      
      // Create or update contacts
      const contactResults = await this.syncContacts(payload.participants);
      
      // Create activity record
      const activity = await this.createActivity({
        type: 'Meeting',
        subject: `Meeting with ${payload.participants.map(p => p.name).join(', ')}`,
        description: payload.summary,
        startDateTime: payload.startTime,
        endDateTime: payload.endTime,
        duration: payload.duration,
        participants: payload.participants.map(p => p.email),
        outcome: payload.summary,
        nextSteps: payload.nextSteps,
        transcripts: payload.transcriptUrl ? [payload.transcriptUrl] : [],
        recordings: payload.recordingUrl ? [payload.recordingUrl] : []
      });
      
      // Create follow-up tasks
      if (payload.actionItems && payload.actionItems.length > 0) {
        await this.createFollowUpTasks(payload.actionItems);
      }
      
      // Update opportunity if applicable
      if (payload.dealProbability !== undefined) {
        await this.updateOpportunityProbability(payload);
      }
      
      // Send to Zapier webhook
      await this.sendToZapier({
        webhookId: this.config.zapierWebhookUrl,
        eventType: 'meeting.synced',
        timestamp: new Date(),
        data: {
          ...payload,
          activityId: activity.id,
          contactResults
        }
      });
      
      return {
        success: true,
        recordsProcessed: 1 + (payload.actionItems?.length || 0),
        recordsFailed: 0,
        syncId,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('[Salesforce] Meeting sync failed:', error);
      
      return {
        success: false,
        recordsProcessed: 0,
        recordsFailed: 1,
        errors: [{
          record: payload,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }],
        syncId,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Create or update contacts
   */
  async syncContacts(participants: Array<{ email: string; name: string; role?: string }>): Promise<any[]> {
    const results = [];
    
    for (const participant of participants) {
      try {
        const [firstName, ...lastNameParts] = participant.name.split(' ');
        const lastName = lastNameParts.join(' ') || '';
        
        const contact: SalesforceContact = {
          firstName,
          lastName,
          email: participant.email,
          title: participant.role
        };
        
        const result = await this.upsertContact(contact);
        results.push(result);
      } catch (error) {
        console.error(`[Salesforce] Failed to sync contact ${participant.email}:`, error);
        results.push({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return results;
  }

  /**
   * Create or update a contact
   */
  async upsertContact(contact: SalesforceContact): Promise<any> {
    const payload: ZapierWebhookPayload = {
      webhookId: this.config.customWebhooks?.onContactCreate || this.config.zapierWebhookUrl,
      eventType: 'contact.upsert',
      timestamp: new Date(),
      data: this.mapFields(contact, 'contact')
    };
    
    return this.sendToZapier(payload);
  }

  /**
   * Create activity record
   */
  async createActivity(activity: SalesforceActivity): Promise<SalesforceActivity> {
    const payload: ZapierWebhookPayload = {
      webhookId: this.config.customWebhooks?.onActivityLog || this.config.zapierWebhookUrl,
      eventType: 'activity.create',
      timestamp: new Date(),
      data: this.mapFields(activity, 'activity')
    };
    
    const result = await this.sendToZapier(payload);
    return { ...activity, id: result.id };
  }

  /**
   * Create follow-up tasks
   */
  async createFollowUpTasks(actionItems: Array<{ task: string; assignee?: string; dueDate?: Date }>): Promise<void> {
    const tasks = actionItems.map(item => ({
      subject: item.task,
      description: `Follow-up task from meeting`,
      status: 'Not Started' as const,
      priority: 'Normal' as const,
      dueDate: item.dueDate,
      type: 'Other' as const
    }));
    
    for (const task of tasks) {
      await this.createTask(task);
    }
  }

  /**
   * Create a task
   */
  async createTask(task: SalesforceTask): Promise<any> {
    const payload: ZapierWebhookPayload = {
      webhookId: this.config.zapierWebhookUrl,
      eventType: 'task.create',
      timestamp: new Date(),
      data: this.mapFields(task, 'task')
    };
    
    return this.sendToZapier(payload);
  }

  /**
   * Update opportunity probability
   */
  async updateOpportunityProbability(payload: MeetingToCRMPayload): Promise<void> {
    if (!payload.dealProbability) return;
    
    const webhookPayload: ZapierWebhookPayload = {
      webhookId: this.config.customWebhooks?.onOpportunityUpdate || this.config.zapierWebhookUrl,
      eventType: 'opportunity.update',
      timestamp: new Date(),
      data: {
        meetingId: payload.meetingId,
        probability: payload.dealProbability,
        competitorsmentioned: payload.competitorsmentioned,
        productsDiscussed: payload.productsDiscussed,
        nextSteps: payload.nextSteps
      }
    };
    
    await this.sendToZapier(webhookPayload);
  }

  // ============================================================================
  // Webhook Methods
  // ============================================================================

  /**
   * Send data to Zapier webhook
   */
  async sendToZapier(payload: ZapierWebhookPayload): Promise<any> {
    const maxRetries = this.config.retryAttempts || 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.axios.post(
          payload.webhookId || this.config.zapierWebhookUrl,
          payload,
          {
            headers: {
              'X-Webhook-Source': 'saleshud',
              'X-Webhook-Version': '1.0.0',
              'X-Event-Type': payload.eventType,
              ...(this.config.zapierApiKey && { 'Authorization': `Bearer ${this.config.zapierApiKey}` })
            }
          }
        );
        
        console.log(`[Salesforce] Successfully sent ${payload.eventType} to Zapier`);
        this.emit('webhook.sent', { payload, response: response.data });
        
        return response.data;
      } catch (error) {
        lastError = error as Error;
        console.error(`[Salesforce] Webhook attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          await this.delay(this.config.retryDelay || 1000 * attempt);
        }
      }
    }
    
    // Add to retry queue if all attempts failed
    this.addToRetryQueue(payload);
    throw lastError;
  }

  /**
   * Handle incoming webhook from Salesforce via Zapier
   */
  async handleIncomingWebhook(eventType: string, data: any): Promise<void> {
    console.log(`[Salesforce] Received webhook: ${eventType}`);
    
    const handler = this.webhookHandlers.get(eventType);
    if (handler) {
      try {
        await handler(data);
        this.emit('webhook.processed', { eventType, data });
      } catch (error) {
        console.error(`[Salesforce] Error processing webhook ${eventType}:`, error);
        this.emit('webhook.error', { eventType, data, error });
      }
    } else {
      console.warn(`[Salesforce] No handler registered for event type: ${eventType}`);
      this.emit('webhook.unhandled', { eventType, data });
    }
  }

  /**
   * Register custom webhook handler
   */
  registerWebhookHandler(eventType: string, handler: Function): void {
    this.webhookHandlers.set(eventType, handler);
    console.log(`[Salesforce] Registered handler for ${eventType}`);
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  private async handleContactCreated(data: any): Promise<void> {
    console.log('[Salesforce] Contact created:', data);
    this.emit('contact.created', data);
  }

  private async handleOpportunityUpdated(data: any): Promise<void> {
    console.log('[Salesforce] Opportunity updated:', data);
    this.emit('opportunity.updated', data);
  }

  private async handleTaskCompleted(data: any): Promise<void> {
    console.log('[Salesforce] Task completed:', data);
    this.emit('task.completed', data);
  }

  private async handleLeadConverted(data: any): Promise<void> {
    console.log('[Salesforce] Lead converted:', data);
    this.emit('lead.converted', data);
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Bulk create or update records
   */
  async bulkUpsert(objectType: string, records: any[]): Promise<SyncResult> {
    if (!this.config.enableBulkOperations) {
      throw new Error('Bulk operations are not enabled');
    }
    
    const startTime = Date.now();
    const syncId = this.generateSyncId();
    const batchSize = this.config.batchSize || 50;
    const results: any[] = [];
    const errors: any[] = [];
    
    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        const payload: ZapierWebhookPayload = {
          webhookId: this.config.zapierWebhookUrl,
          eventType: `${objectType}.bulk.upsert`,
          timestamp: new Date(),
          data: {
            objectType,
            records: batch.map(record => this.mapFields(record, objectType))
          }
        };
        
        const result = await this.sendToZapier(payload);
        results.push(result);
      } catch (error) {
        console.error(`[Salesforce] Bulk upsert batch failed:`, error);
        errors.push(...batch.map(record => ({
          record,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        })));
      }
    }
    
    return {
      success: errors.length === 0,
      recordsProcessed: results.length * batchSize,
      recordsFailed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      syncId,
      duration: Date.now() - startTime
    };
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Query Salesforce records via Zapier
   */
  async query(objectType: string, filters: any): Promise<any[]> {
    const payload: ZapierWebhookPayload = {
      webhookId: this.config.zapierWebhookUrl,
      eventType: `${objectType}.query`,
      timestamp: new Date(),
      data: {
        objectType,
        filters,
        fields: this.getFieldsForObject(objectType)
      }
    };
    
    const response = await this.sendToZapier(payload);
    return response.records || [];
  }

  /**
   * Get a single record
   */
  async getRecord(objectType: string, id: string): Promise<any> {
    const payload: ZapierWebhookPayload = {
      webhookId: this.config.zapierWebhookUrl,
      eventType: `${objectType}.get`,
      timestamp: new Date(),
      data: {
        objectType,
        id
      }
    };
    
    return this.sendToZapier(payload);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Map fields based on configuration
   */
  private mapFields(data: any, _objectType: string): any {
    if (!this.config.fieldMapping || Object.keys(this.config.fieldMapping).length === 0) {
      return data;
    }
    
    const mapped: any = {};
    
    for (const [localField, salesforceField] of Object.entries(this.config.fieldMapping)) {
      if (data[localField] !== undefined) {
        mapped[salesforceField] = data[localField];
      }
    }
    
    // Include unmapped fields
    for (const [key, value] of Object.entries(data)) {
      if (!this.config.fieldMapping[key]) {
        mapped[key] = value;
      }
    }
    
    return mapped;
  }

  /**
   * Get fields for object type
   */
  private getFieldsForObject(objectType: string): string[] {
    const fieldMap: Record<string, string[]> = {
      contact: ['Id', 'FirstName', 'LastName', 'Email', 'Phone', 'Title', 'AccountId'],
      opportunity: ['Id', 'Name', 'Amount', 'StageName', 'CloseDate', 'Probability'],
      task: ['Id', 'Subject', 'Status', 'Priority', 'ActivityDate', 'WhatId', 'WhoId'],
      lead: ['Id', 'FirstName', 'LastName', 'Email', 'Company', 'Status', 'Rating']
    };
    
    return fieldMap[objectType.toLowerCase()] || ['Id', 'Name'];
  }

  /**
   * Test webhook connection
   */
  private async testWebhookConnection(): Promise<void> {
    try {
      const payload: ZapierWebhookPayload = {
        webhookId: this.config.zapierWebhookUrl,
        eventType: 'connection.test',
        timestamp: new Date(),
        data: {
          source: 'saleshud',
          version: '1.0.0'
        }
      };
      
      await this.sendToZapier(payload);
      console.log('[Salesforce] Webhook connection test successful');
    } catch (error) {
      console.error('[Salesforce] Webhook connection test failed:', error);
      throw new Error('Failed to connect to Zapier webhook');
    }
  }

  /**
   * Start sync interval
   */
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
      this.processRetryQueue();
    }, this.config.syncInterval);
    
    console.log(`[Salesforce] Sync interval started (${this.config.syncInterval}ms)`);
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.size === 0) return;
    
    console.log(`[Salesforce] Processing sync queue (${this.syncQueue.size} items)`);
    
    const items = Array.from(this.syncQueue.entries());
    this.syncQueue.clear();
    
    for (const [id, data] of items) {
      try {
        await this.sendToZapier(data);
      } catch (error) {
        console.error(`[Salesforce] Failed to process sync queue item ${id}:`, error);
      }
    }
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.size === 0) return;
    
    console.log(`[Salesforce] Processing retry queue (${this.retryQueue.size} items)`);
    
    const items = Array.from(this.retryQueue.entries());
    
    for (const [id, item] of items) {
      if (item.attempts >= (this.config.retryAttempts || 3)) {
        console.error(`[Salesforce] Max retries exceeded for ${id}, removing from queue`);
        this.retryQueue.delete(id);
        continue;
      }
      
      try {
        await this.sendToZapier(item.data);
        this.retryQueue.delete(id);
      } catch (error) {
        console.error(`[Salesforce] Retry failed for ${id}:`, error);
        item.attempts++;
      }
    }
  }

  /**
   * Add to retry queue
   */
  private addToRetryQueue(payload: ZapierWebhookPayload): void {
    const id = this.generateSyncId();
    this.retryQueue.set(id, {
      data: payload,
      attempts: 0
    });
    console.log(`[Salesforce] Added to retry queue: ${id}`);
  }

  /**
   * Generate sync ID
   */
  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add to sync queue
   */
  queueForSync(data: any): void {
    const id = this.generateSyncId();
    this.syncQueue.set(id, data);
    console.log(`[Salesforce] Queued for sync: ${id}`);
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isInitialized: boolean;
    syncQueueSize: number;
    retryQueueSize: number;
    isSyncing: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      syncQueueSize: this.syncQueue.size,
      retryQueueSize: this.retryQueue.size,
      isSyncing: this.syncInterval !== null
    };
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Salesforce] Shutting down service...');
    
    // Stop sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Process remaining queues
    await this.processSyncQueue();
    await this.processRetryQueue();
    
    // Clear all data
    this.syncQueue.clear();
    this.retryQueue.clear();
    this.webhookHandlers.clear();
    
    this.isInitialized = false;
    this.emit('shutdown');
    
    console.log('[Salesforce] Service shutdown complete');
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

let salesforceServiceInstance: SalesforceService | null = null;

export function initializeSalesforceService(config: SalesforceSyncConfig): SalesforceService {
  if (!salesforceServiceInstance) {
    salesforceServiceInstance = new SalesforceService(config);
  }
  return salesforceServiceInstance;
}

export function getSalesforceService(): SalesforceService {
  if (!salesforceServiceInstance) {
    throw new Error('Salesforce service not initialized. Call initializeSalesforceService first.');
  }
  return salesforceServiceInstance;
}

export default {
  SalesforceService,
  initializeSalesforceService,
  getSalesforceService
};