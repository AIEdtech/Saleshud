/**
 * Email Service
 * AI-powered email generation and management system
 */

import { EventEmitter } from 'events';

// Types and Interfaces
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'cold_outreach' | 'follow_up' | 'demo_request' | 'proposal' | 'closing' | 'nurturing';
  industry?: string;
  variables: string[];
  performance: {
    openRate: number;
    responseRate: number;
    sentCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailContext {
  contact: {
    name: string;
    email: string;
    company: string;
    title: string;
    industry: string;
    companySize?: string;
  };
  conversation: {
    painPoints: string[];
    interests: string[];
    previousInteractions: number;
    lastInteraction?: Date;
    dealStage: string;
    sentiment: number;
  };
  meeting?: {
    topics: string[];
    actionItems: string[];
    nextSteps: string[];
    duration: number;
    insights: string[];
  };
  company: {
    recentNews?: string[];
    challenges?: string[];
    initiatives?: string[];
    competitors?: string[];
  };
}

export interface EmailGeneration {
  subject: string;
  body: string;
  variables: Record<string, string>;
  confidence: number;
  reasoning: string;
  alternatives?: {
    subject: string[];
    body: string[];
  };
  tone: 'professional' | 'casual' | 'enthusiastic' | 'consultative';
  personalization: {
    level: number;
    elements: string[];
  };
}

export interface EmailValidation {
  score: number;
  issues: {
    type: 'tone' | 'clarity' | 'length' | 'personalization' | 'cta' | 'spam_risk';
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestion: string;
  }[];
  strengths: string[];
  improvements: string[];
  spamRisk: number;
  readabilityScore: number;
}

export interface EmailPerformance {
  templateId: string;
  emailId: string;
  sent: Date;
  opened?: Date;
  clicked?: Date;
  replied?: Date;
  bounced?: boolean;
  unsubscribed?: boolean;
  recipientData: {
    industry: string;
    companySize: string;
    title: string;
  };
}

// Custom Error Classes
export class EmailGenerationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EmailGenerationError';
  }
}

export class TemplateError extends Error {
  constructor(message: string, public templateId?: string) {
    super(message);
    this.name = 'TemplateError';
  }
}

// Main Email Service Class
export class EmailService extends EventEmitter {
  private templates: Map<string, EmailTemplate> = new Map();
  private performanceData: EmailPerformance[] = [];
  private claudeApiKey: string;
  private requestQueue: Array<{ id: string; resolve: Function; reject: Function }> = [];
  private processing = false;
  private rateLimit = { requests: 0, resetTime: Date.now() + 60000 };

  constructor(claudeApiKey: string) {
    super();
    this.claudeApiKey = claudeApiKey;
    
    // Load default templates
    this.loadDefaultTemplates();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Generate AI-powered email content
   */
  async generateEmail(context: EmailContext, templateId?: string): Promise<EmailGeneration> {
    try {
      const template = templateId ? this.templates.get(templateId) : this.selectOptimalTemplate(context);
      
      const prompt = this.buildGenerationPrompt(context, template);
      const response = await this.callClaudeAPI(prompt);
      
      const generation = this.parseGenerationResponse(response);
      
      // Track generation
      this.emit('emailGenerated', {
        context,
        template: template?.id,
        generation,
        timestamp: new Date()
      });
      
      return generation;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new EmailGenerationError(
        `Failed to generate email: ${message}`,
        'GENERATION_FAILED'
      );
    }
  }

  /**
   * Validate email content using AI
   */
  async validateEmail(subject: string, body: string, context: EmailContext): Promise<EmailValidation> {
    try {
      const prompt = this.buildValidationPrompt(subject, body, context);
      const response = await this.callClaudeAPI(prompt);
      
      return this.parseValidationResponse(response);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new EmailGenerationError(
        `Failed to validate email: ${message}`,
        'VALIDATION_FAILED'
      );
    }
  }

  /**
   * Create custom email template
   */
  async createTemplate(templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'performance'>): Promise<EmailTemplate> {
    const template: EmailTemplate = {
      ...templateData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      performance: {
        openRate: 0,
        responseRate: 0,
        sentCount: 0
      }
    };

    // Validate template using AI
    const validation = await this.validateTemplate(template);
    if (validation.score < 70) {
      throw new TemplateError('Template quality too low for production use');
    }

    this.templates.set(template.id, template);
    
    this.emit('templateCreated', template);
    
    return template;
  }

  /**
   * Update existing template
   */
  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new TemplateError('Template not found', templateId);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    // Re-validate updated template
    const validation = await this.validateTemplate(updatedTemplate);
    if (validation.score < 70) {
      throw new TemplateError('Updated template quality too low for production use');
    }

    this.templates.set(templateId, updatedTemplate);
    
    this.emit('templateUpdated', updatedTemplate);
    
    return updatedTemplate;
  }

  /**
   * Get template performance analytics
   */
  getTemplatePerformance(templateId: string): {
    template: EmailTemplate;
    analytics: {
      totalSent: number;
      openRate: number;
      responseRate: number;
      clickRate: number;
      bestPerformingVariations: string[];
      industryBreakdown: Record<string, number>;
      timeAnalysis: Record<string, number>;
    };
  } {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new TemplateError('Template not found', templateId);
    }

    const performances = this.performanceData.filter(p => p.templateId === templateId);
    
    const analytics = {
      totalSent: performances.length,
      openRate: this.calculateOpenRate(performances),
      responseRate: this.calculateResponseRate(performances),
      clickRate: this.calculateClickRate(performances),
      bestPerformingVariations: this.identifyBestVariations(performances),
      industryBreakdown: this.analyzeIndustryPerformance(performances),
      timeAnalysis: this.analyzeTimePerformance(performances)
    };

    return { template, analytics };
  }

  /**
   * Perform A/B testing on email variations
   */
  async performABTest(
    context: EmailContext,
    variations: { subject?: string; body?: string }[],
    testSize: number = 100
  ): Promise<{
    testId: string;
    variations: Array<{
      id: string;
      content: EmailGeneration;
      performance: { sent: number; opened: number; responded: number };
    }>;
    recommendation: string;
  }> {
    const testId = this.generateId();
    const results = [];

    for (const [index, variation] of variations.entries()) {
      const content = await this.generateEmail(context);
      
      if (variation.subject) content.subject = variation.subject;
      if (variation.body) content.body = variation.body;
      
      results.push({
        id: `${testId}_${index}`,
        content,
        performance: { sent: 0, opened: 0, responded: 0 }
      });
    }

    // Simulate test deployment
    this.emit('abTestStarted', {
      testId,
      variations: results,
      context,
      timestamp: new Date()
    });

    return {
      testId,
      variations: results,
      recommendation: 'Test deployed - results will be available after sufficient data collection'
    };
  }

  /**
   * Generate email sequences for drip campaigns
   */
  async generateEmailSequence(
    context: EmailContext,
    sequenceType: 'cold_outreach' | 'nurturing' | 'onboarding' | 'winback',
    emailCount: number = 5
  ): Promise<EmailGeneration[]> {
    const sequence = [];
    
    for (let i = 0; i < emailCount; i++) {
      const sequenceContext = this.adjustContextForSequence(context, i, sequenceType);
      const email = await this.generateEmail(sequenceContext);
      
      // Add sequence-specific elements
      email.body = this.addSequenceElements(email.body, i, sequenceType);
      
      sequence.push(email);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.emit('sequenceGenerated', {
      context,
      sequenceType,
      sequence,
      timestamp: new Date()
    });

    return sequence;
  }

  /**
   * Private Methods
   */

  private loadDefaultTemplates(): void {
    const defaultTemplates: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Cold Outreach - SaaS',
        subject: 'Quick question about {{company_name}}\'s {{pain_point}}',
        body: `Hi {{first_name}},

I noticed {{company_name}} is {{company_context}}. I've been working with similar {{industry}} companies who struggle with {{pain_point}}.

{{value_proposition}}

Would you be open to a brief 15-minute call to discuss how we might help {{company_name}} {{desired_outcome}}?

Best regards,
{{sender_name}}`,
        category: 'cold_outreach',
        industry: 'saas',
        variables: ['first_name', 'company_name', 'pain_point', 'company_context', 'industry', 'value_proposition', 'desired_outcome', 'sender_name'],
        performance: { openRate: 0, responseRate: 0, sentCount: 0 }
      },
      
      {
        name: 'Follow-up - Post Meeting',
        subject: 'Thank you for the great conversation - Next steps',
        body: `Hi {{first_name}},

Thank you for taking the time to discuss {{meeting_topic}} with me today.

Based on our conversation, I understand that {{key_challenge}} is a priority for {{company_name}}. The {{solution_mentioned}} we discussed could help you {{expected_outcome}}.

Next steps:
{{action_items}}

I'll follow up with {{deliverable}} by {{deadline}}. Please let me know if you have any questions in the meantime.

Best regards,
{{sender_name}}`,
        category: 'follow_up',
        variables: ['first_name', 'meeting_topic', 'key_challenge', 'company_name', 'solution_mentioned', 'expected_outcome', 'action_items', 'deliverable', 'deadline', 'sender_name'],
        performance: { openRate: 0, responseRate: 0, sentCount: 0 }
      }
    ];

    defaultTemplates.forEach(template => {
      const fullTemplate: EmailTemplate = {
        ...template,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.templates.set(fullTemplate.id, fullTemplate);
    });
  }

  private selectOptimalTemplate(context: EmailContext): EmailTemplate | undefined {
    const candidates = Array.from(this.templates.values()).filter(template => {
      if (template.industry && template.industry !== context.contact.industry) return false;
      
      // Score template based on context match
      return true;
    });

    if (candidates.length === 0) return undefined;

    // Select best performing template for the context
    return candidates.reduce((best, current) => {
      const bestScore = best.performance.responseRate * best.performance.openRate;
      const currentScore = current.performance.responseRate * current.performance.openRate;
      return currentScore > bestScore ? current : best;
    });
  }

  private buildGenerationPrompt(context: EmailContext, template?: EmailTemplate): string {
    const templateSection = template ? `Use this template as inspiration but adapt it fully:
${template.body}

Template variables: ${template.variables.join(', ')}` : '';

    return `Generate a professional sales email with the following context:

CONTACT INFORMATION:
- Name: ${context.contact.name}
- Company: ${context.contact.company}
- Title: ${context.contact.title}
- Industry: ${context.contact.industry}

CONVERSATION CONTEXT:
- Pain points: ${context.conversation.painPoints.join(', ')}
- Interests: ${context.conversation.interests.join(', ')}
- Deal stage: ${context.conversation.dealStage}
- Previous interactions: ${context.conversation.previousInteractions}
- Sentiment: ${context.conversation.sentiment > 0.5 ? 'positive' : 'neutral'}

${context.meeting ? `MEETING CONTEXT:
- Duration: ${context.meeting.duration} minutes
- Key topics: ${context.meeting.topics.join(', ')}
- Action items: ${context.meeting.actionItems.join(', ')}
- Next steps: ${context.meeting.nextSteps.join(', ')}` : ''}

${context.company.recentNews ? `COMPANY INSIGHTS:
- Recent news: ${context.company.recentNews.join(', ')}
- Challenges: ${context.company.challenges?.join(', ') || 'N/A'}` : ''}

${templateSection}

REQUIREMENTS:
1. Create a compelling subject line
2. Write personalized email body
3. Include clear call-to-action
4. Maintain professional tone
5. Reference specific pain points and interests
6. Keep length appropriate (150-300 words)
7. Include confidence score (0-100)
8. Provide reasoning for approach

Return JSON format:
{
  "subject": "...",
  "body": "...",
  "confidence": 85,
  "reasoning": "...",
  "tone": "professional",
  "personalization": {
    "level": 8,
    "elements": ["company news reference", "pain point alignment"]
  }
}`;
  }

  private buildValidationPrompt(subject: string, body: string, context: EmailContext): string {
    return `Validate this sales email for effectiveness and potential issues:

SUBJECT: ${subject}

BODY:
${body}

CONTEXT:
- Industry: ${context.contact.industry}
- Deal stage: ${context.conversation.dealStage}
- Company size: ${context.contact.companySize || 'Unknown'}
- Previous interactions: ${context.conversation.previousInteractions}

Evaluate and return JSON:
{
  "score": 85,
  "issues": [
    {
      "type": "personalization",
      "severity": "medium", 
      "message": "Limited personalization",
      "suggestion": "Add company-specific reference"
    }
  ],
  "strengths": ["Clear value proposition", "Strong CTA"],
  "improvements": ["Add social proof", "Shorten introduction"],
  "spamRisk": 15,
  "readabilityScore": 78
}`;
  }

  private async validateTemplate(template: EmailTemplate): Promise<EmailValidation> {
    const mockContext: EmailContext = {
      contact: {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Example Corp',
        title: 'VP Sales',
        industry: template.industry || 'technology'
      },
      conversation: {
        painPoints: ['efficiency', 'scalability'],
        interests: ['automation', 'ROI'],
        previousInteractions: 0,
        dealStage: 'awareness',
        sentiment: 0.7
      },
      company: {
        recentNews: [],
        challenges: []
      }
    };

    return this.validateEmail(template.subject, template.body, mockContext);
  }

  private async callClaudeAPI(prompt: string): Promise<string> {
    await this.enforceRateLimit();

    try {
      // Simulate API call - replace with actual Claude API integration
      const response = await new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(JSON.stringify({
            subject: 'Following up on our conversation about sales efficiency',
            body: `Hi {{first_name}},\n\nI hope this email finds you well. Thank you for the insightful conversation we had about {{company_name}}'s sales challenges.\n\nBased on what you shared about {{pain_point}}, I believe our platform could help {{company_name}} achieve {{desired_outcome}}.\n\nWould you be available for a brief 15-minute demo next week to show you exactly how this could work for your team?\n\nBest regards,\n{{sender_name}}`,
            confidence: 87,
            reasoning: 'Personalized approach referencing specific conversation points while maintaining professional tone',
            tone: 'professional',
            personalization: {
              level: 8,
              elements: ['conversation reference', 'specific pain point', 'company name usage']
            }
          }));
        }, 1000);
      });

      this.rateLimit.requests++;
      return response;
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new EmailGenerationError(`Claude API error: ${message}`, 'API_ERROR');
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    if (now > this.rateLimit.resetTime) {
      this.rateLimit.requests = 0;
      this.rateLimit.resetTime = now + 60000; // Reset every minute
    }
    
    if (this.rateLimit.requests >= 50) { // 50 requests per minute limit
      const waitTime = this.rateLimit.resetTime - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimit.requests = 0;
      this.rateLimit.resetTime = Date.now() + 60000;
    }
  }

  private parseGenerationResponse(response: string): EmailGeneration {
    try {
      return JSON.parse(response);
    } catch (error) {
      throw new EmailGenerationError('Invalid response format from AI', 'PARSE_ERROR');
    }
  }

  private parseValidationResponse(response: string): EmailValidation {
    try {
      return JSON.parse(response);
    } catch (error) {
      throw new EmailGenerationError('Invalid validation response format', 'PARSE_ERROR');
    }
  }

  private calculateOpenRate(performances: EmailPerformance[]): number {
    if (performances.length === 0) return 0;
    const opened = performances.filter(p => p.opened).length;
    return (opened / performances.length) * 100;
  }

  private calculateResponseRate(performances: EmailPerformance[]): number {
    if (performances.length === 0) return 0;
    const replied = performances.filter(p => p.replied).length;
    return (replied / performances.length) * 100;
  }

  private calculateClickRate(performances: EmailPerformance[]): number {
    if (performances.length === 0) return 0;
    const clicked = performances.filter(p => p.clicked).length;
    return (clicked / performances.length) * 100;
  }

  private identifyBestVariations(performances: EmailPerformance[]): string[] {
    // Implement variation analysis logic
    return ['subject_variation_1', 'cta_variation_2'];
  }

  private analyzeIndustryPerformance(performances: EmailPerformance[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    performances.forEach(p => {
      const industry = p.recipientData.industry;
      if (!breakdown[industry]) breakdown[industry] = 0;
      if (p.replied) breakdown[industry]++;
    });
    return breakdown;
  }

  private analyzeTimePerformance(performances: EmailPerformance[]): Record<string, number> {
    const timeBreakdown: Record<string, number> = {};
    performances.forEach(p => {
      const hour = p.sent.getHours();
      const timeSlot = `${hour}:00`;
      if (!timeBreakdown[timeSlot]) timeBreakdown[timeSlot] = 0;
      if (p.opened) timeBreakdown[timeSlot]++;
    });
    return timeBreakdown;
  }

  private adjustContextForSequence(context: EmailContext, sequenceIndex: number, type: string): EmailContext {
    const adjustedContext = { ...context };
    
    // Modify context based on sequence position
    if (sequenceIndex > 0) {
      adjustedContext.conversation.previousInteractions = sequenceIndex;
    }
    
    return adjustedContext;
  }

  private addSequenceElements(body: string, index: number, type: string): string {
    if (index === 0) return body;
    
    const sequencePrefixes = [
      "I wanted to follow up on my previous email...\n\n",
      "I hope you had a chance to review my earlier message...\n\n",
      "This is my final outreach regarding...\n\n"
    ];
    
    return (sequencePrefixes[Math.min(index - 1, sequencePrefixes.length - 1)] || '') + body;
  }

  private startPerformanceMonitoring(): void {
    // Monitor email performance metrics
    setInterval(() => {
      this.emit('performanceUpdate', {
        templateCount: this.templates.size,
        totalSent: this.performanceData.length,
        averageOpenRate: this.calculateAverageOpenRate(),
        timestamp: new Date()
      });
    }, 60000); // Every minute
  }

  private calculateAverageOpenRate(): number {
    if (this.performanceData.length === 0) return 0;
    const opened = this.performanceData.filter(p => p.opened).length;
    return (opened / this.performanceData.length) * 100;
  }

  private generateId(): string {
    return 'email_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public getters
  get templateCount(): number {
    return this.templates.size;
  }

  get allTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  get performanceMetrics(): {
    totalSent: number;
    averageOpenRate: number;
    averageResponseRate: number;
    topPerformingTemplates: string[];
  } {
    return {
      totalSent: this.performanceData.length,
      averageOpenRate: this.calculateAverageOpenRate(),
      averageResponseRate: this.calculateResponseRate(this.performanceData),
      topPerformingTemplates: this.getTopPerformingTemplates()
    };
  }

  private getTopPerformingTemplates(): string[] {
    const templatePerformance = new Map<string, number>();
    
    this.performanceData.forEach(p => {
      const rate = templatePerformance.get(p.templateId) || 0;
      templatePerformance.set(p.templateId, rate + (p.replied ? 1 : 0));
    });
    
    return Array.from(templatePerformance.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([templateId]) => templateId);
  }
}