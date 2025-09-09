/**
 * Scheduling Service
 * Intelligent calendar integration and meeting optimization
 */

import { EventEmitter } from 'events';

// Types and Interfaces
export interface CalendarProvider {
  id: string;
  name: 'google' | 'outlook' | 'apple' | 'exchange';
  displayName: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
  syncEnabled: boolean;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  timezone: string;
  confidence?: number;
  reasoning?: string;
}

export interface MeetingType {
  id: string;
  name: string;
  duration: number;
  bufferBefore?: number;
  bufferAfter?: number;
  description: string;
  location?: {
    type: 'video' | 'phone' | 'in_person';
    details: string;
  };
  preparation: string[];
  agenda: string[];
}

export interface Participant {
  id: string;
  email: string;
  name: string;
  timezone: string;
  role: 'organizer' | 'required' | 'optional';
  availability?: TimeSlot[];
  preferences?: {
    preferredTimes: string[];
    avoidTimes: string[];
    timezone: string;
  };
}

export interface MeetingRequest {
  id: string;
  title: string;
  description: string;
  type: MeetingType;
  organizer: Participant;
  participants: Participant[];
  preferredDates: Date[];
  timeConstraints: {
    earliestTime: string; // HH:MM format
    latestTime: string;   // HH:MM format
    daysOfWeek: number[]; // 0-6, Sunday = 0
    excludeDates: Date[];
  };
  location?: {
    type: 'video' | 'phone' | 'in_person';
    details: string;
    roomBooking?: boolean;
  };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: Date;
}

export interface ScheduledMeeting {
  id: string;
  calendarEventId: string;
  request: MeetingRequest;
  scheduledTime: TimeSlot;
  confirmations: Record<string, boolean>;
  remindersSent: Date[];
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  meetingUrl?: string;
  roomBooking?: {
    roomId: string;
    roomName: string;
    location: string;
  };
  actualDuration?: number;
  attendanceTracking?: {
    participant: string;
    joinTime?: Date;
    leaveTime?: Date;
  }[];
}

export interface AvailabilityWindow {
  participant: string;
  windows: TimeSlot[];
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  busySlots: TimeSlot[];
  preferences: {
    preferredDuration: number;
    bufferTime: number;
    maxMeetingsPerDay: number;
  };
}

export interface OptimizationResult {
  suggestedTimes: Array<{
    slot: TimeSlot;
    confidence: number;
    reasoning: string;
    participantAvailability: Record<string, boolean>;
    conflictScore: number;
    productivityScore: number;
  }>;
  alternativeTimes: TimeSlot[];
  recommendations: {
    bestTime: TimeSlot;
    reasoning: string;
    riskFactors: string[];
  };
}

// Custom Error Classes
export class SchedulingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SchedulingError';
  }
}

export class CalendarIntegrationError extends Error {
  constructor(message: string, public provider: string) {
    super(message);
    this.name = 'CalendarIntegrationError';
  }
}

// Main Scheduling Service Class
export class SchedulingService extends EventEmitter {
  private calendarProviders: Map<string, CalendarProvider> = new Map();
  private scheduledMeetings: Map<string, ScheduledMeeting> = new Map();
  private availabilityCache: Map<string, AvailabilityWindow> = new Map();
  private optimizationEngine: OptimizationEngine;
  private integrations: CalendarIntegrations;

  constructor() {
    super();
    this.optimizationEngine = new OptimizationEngine();
    this.integrations = new CalendarIntegrations();
    
    // Start background sync
    this.startBackgroundSync();
    this.startMeetingMonitoring();
  }

  /**
   * Add calendar provider integration
   */
  async addCalendarProvider(provider: Omit<CalendarProvider, 'id'>): Promise<CalendarProvider> {
    try {
      const fullProvider: CalendarProvider = {
        ...provider,
        id: this.generateId()
      };

      // Validate and test connection
      await this.integrations.validateConnection(fullProvider);
      
      this.calendarProviders.set(fullProvider.id, fullProvider);
      
      // Initial sync
      await this.syncCalendarProvider(fullProvider.id);
      
      this.emit('providerAdded', fullProvider);
      
      return fullProvider;
      
    } catch (error) {
      throw new CalendarIntegrationError(
        `Failed to add calendar provider: ${error.message}`,
        provider.name
      );
    }
  }

  /**
   * Find optimal meeting times using AI
   */
  async findOptimalTimes(request: MeetingRequest): Promise<OptimizationResult> {
    try {
      // Gather availability data for all participants
      const availability = await this.gatherParticipantAvailability(request.participants, request.preferredDates);
      
      // Apply AI optimization
      const optimization = await this.optimizationEngine.optimize(request, availability);
      
      // Validate suggestions against real-time calendar data
      const validatedSuggestions = await this.validateSuggestions(optimization.suggestedTimes, request.participants);
      
      const result: OptimizationResult = {
        ...optimization,
        suggestedTimes: validatedSuggestions
      };
      
      this.emit('timesOptimized', {
        requestId: request.id,
        result,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      throw new SchedulingError(
        `Failed to find optimal times: ${error.message}`,
        'OPTIMIZATION_FAILED'
      );
    }
  }

  /**
   * Schedule meeting at specific time
   */
  async scheduleMeeting(request: MeetingRequest, selectedTime: TimeSlot): Promise<ScheduledMeeting> {
    try {
      // Final availability check
      const availability = await this.checkRealTimeAvailability(request.participants, selectedTime);
      const conflicts = availability.filter(a => !a.available);
      
      if (conflicts.length > 0) {
        throw new SchedulingError(
          `Conflicts detected for participants: ${conflicts.map(c => c.participant).join(', ')}`,
          'SCHEDULING_CONFLICT'
        );
      }

      // Create calendar events
      const calendarEventId = await this.createCalendarEvent(request, selectedTime);
      
      // Book room if needed
      let roomBooking;
      if (request.location?.roomBooking) {
        roomBooking = await this.bookMeetingRoom(selectedTime, request.participants.length);
      }

      // Generate meeting URL for video calls
      let meetingUrl;
      if (request.location?.type === 'video') {
        meetingUrl = await this.generateMeetingUrl(request);
      }

      const scheduledMeeting: ScheduledMeeting = {
        id: this.generateId(),
        calendarEventId,
        request,
        scheduledTime: selectedTime,
        confirmations: {},
        remindersSent: [],
        status: 'scheduled',
        meetingUrl,
        roomBooking
      };

      this.scheduledMeetings.set(scheduledMeeting.id, scheduledMeeting);
      
      // Send invitations
      await this.sendMeetingInvitations(scheduledMeeting);
      
      // Schedule reminders
      await this.scheduleReminders(scheduledMeeting);
      
      this.emit('meetingScheduled', scheduledMeeting);
      
      return scheduledMeeting;
      
    } catch (error) {
      throw new SchedulingError(
        `Failed to schedule meeting: ${error.message}`,
        'SCHEDULING_FAILED'
      );
    }
  }

  /**
   * Get participant availability
   */
  async getParticipantAvailability(
    participants: Participant[],
    dateRange: { start: Date; end: Date }
  ): Promise<AvailabilityWindow[]> {
    try {
      const availability = [];
      
      for (const participant of participants) {
        const window = await this.getIndividualAvailability(participant, dateRange);
        availability.push(window);
      }
      
      return availability;
      
    } catch (error) {
      throw new SchedulingError(
        `Failed to get availability: ${error.message}`,
        'AVAILABILITY_FAILED'
      );
    }
  }

  /**
   * Reschedule existing meeting
   */
  async rescheduleMeeting(meetingId: string, newTime: TimeSlot, reason?: string): Promise<ScheduledMeeting> {
    const meeting = this.scheduledMeetings.get(meetingId);
    if (!meeting) {
      throw new SchedulingError('Meeting not found', 'MEETING_NOT_FOUND');
    }

    try {
      // Check new time availability
      const availability = await this.checkRealTimeAvailability(meeting.request.participants, newTime);
      const conflicts = availability.filter(a => !a.available);
      
      if (conflicts.length > 0) {
        throw new SchedulingError(
          `Cannot reschedule due to conflicts: ${conflicts.map(c => c.participant).join(', ')}`,
          'RESCHEDULE_CONFLICT'
        );
      }

      // Update calendar event
      await this.updateCalendarEvent(meeting.calendarEventId, newTime, reason);
      
      // Update room booking if needed
      if (meeting.roomBooking) {
        await this.updateRoomBooking(meeting.roomBooking.roomId, meeting.scheduledTime, newTime);
      }

      const updatedMeeting: ScheduledMeeting = {
        ...meeting,
        scheduledTime: newTime,
        status: 'scheduled',
        confirmations: {} // Reset confirmations
      };

      this.scheduledMeetings.set(meetingId, updatedMeeting);
      
      // Notify participants
      await this.sendRescheduleNotifications(updatedMeeting, meeting.scheduledTime, reason);
      
      this.emit('meetingRescheduled', {
        meeting: updatedMeeting,
        originalTime: meeting.scheduledTime,
        reason
      });
      
      return updatedMeeting;
      
    } catch (error) {
      throw new SchedulingError(
        `Failed to reschedule meeting: ${error.message}`,
        'RESCHEDULE_FAILED'
      );
    }
  }

  /**
   * Cancel meeting
   */
  async cancelMeeting(meetingId: string, reason?: string): Promise<void> {
    const meeting = this.scheduledMeetings.get(meetingId);
    if (!meeting) {
      throw new SchedulingError('Meeting not found', 'MEETING_NOT_FOUND');
    }

    try {
      // Cancel calendar event
      await this.cancelCalendarEvent(meeting.calendarEventId, reason);
      
      // Release room booking
      if (meeting.roomBooking) {
        await this.cancelRoomBooking(meeting.roomBooking.roomId, meeting.scheduledTime);
      }

      // Update meeting status
      const cancelledMeeting = {
        ...meeting,
        status: 'cancelled' as const
      };
      
      this.scheduledMeetings.set(meetingId, cancelledMeeting);
      
      // Notify participants
      await this.sendCancellationNotifications(meeting, reason);
      
      this.emit('meetingCancelled', { meeting: cancelledMeeting, reason });
      
    } catch (error) {
      throw new SchedulingError(
        `Failed to cancel meeting: ${error.message}`,
        'CANCELLATION_FAILED'
      );
    }
  }

  /**
   * Track meeting attendance
   */
  async trackAttendance(meetingId: string, participantEmail: string, action: 'join' | 'leave'): Promise<void> {
    const meeting = this.scheduledMeetings.get(meetingId);
    if (!meeting) return;

    if (!meeting.attendanceTracking) {
      meeting.attendanceTracking = [];
    }

    let attendance = meeting.attendanceTracking.find(a => a.participant === participantEmail);
    if (!attendance) {
      attendance = { participant: participantEmail };
      meeting.attendanceTracking.push(attendance);
    }

    if (action === 'join') {
      attendance.joinTime = new Date();
    } else {
      attendance.leaveTime = new Date();
    }

    this.scheduledMeetings.set(meetingId, meeting);
    
    this.emit('attendanceTracked', {
      meetingId,
      participant: participantEmail,
      action,
      timestamp: new Date()
    });
  }

  /**
   * Get meeting analytics
   */
  getMeetingAnalytics(dateRange?: { start: Date; end: Date }): {
    totalMeetings: number;
    averageDuration: number;
    attendanceRate: number;
    cancellationRate: number;
    mostActiveHours: string[];
    participantEngagement: Record<string, number>;
    roomUtilization: Record<string, number>;
  } {
    const meetings = Array.from(this.scheduledMeetings.values());
    const filteredMeetings = dateRange 
      ? meetings.filter(m => m.scheduledTime.start >= dateRange.start && m.scheduledTime.start <= dateRange.end)
      : meetings;

    return {
      totalMeetings: filteredMeetings.length,
      averageDuration: this.calculateAverageDuration(filteredMeetings),
      attendanceRate: this.calculateAttendanceRate(filteredMeetings),
      cancellationRate: this.calculateCancellationRate(filteredMeetings),
      mostActiveHours: this.getMostActiveHours(filteredMeetings),
      participantEngagement: this.analyzeParticipantEngagement(filteredMeetings),
      roomUtilization: this.analyzeRoomUtilization(filteredMeetings)
    };
  }

  /**
   * Private Methods
   */

  private async gatherParticipantAvailability(
    participants: Participant[],
    dates: Date[]
  ): Promise<AvailabilityWindow[]> {
    const availability = [];
    
    for (const participant of participants) {
      const dateRange = {
        start: new Date(Math.min(...dates.map(d => d.getTime()))),
        end: new Date(Math.max(...dates.map(d => d.getTime())))
      };
      
      const window = await this.getIndividualAvailability(participant, dateRange);
      availability.push(window);
    }
    
    return availability;
  }

  private async getIndividualAvailability(
    participant: Participant,
    dateRange: { start: Date; end: Date }
  ): Promise<AvailabilityWindow> {
    // Check cache first
    const cacheKey = `${participant.id}_${dateRange.start.getTime()}_${dateRange.end.getTime()}`;
    if (this.availabilityCache.has(cacheKey)) {
      return this.availabilityCache.get(cacheKey)!;
    }

    // Fetch from calendar providers
    const busySlots = await this.fetchBusySlots(participant.email, dateRange);
    const workingHours = participant.preferences || { 
      start: '09:00', 
      end: '17:00', 
      timezone: participant.timezone 
    };

    const availabilityWindow: AvailabilityWindow = {
      participant: participant.id,
      windows: this.calculateAvailableWindows(dateRange, busySlots, workingHours),
      workingHours: {
        start: workingHours.start,
        end: workingHours.end,
        timezone: participant.timezone
      },
      busySlots,
      preferences: {
        preferredDuration: 60,
        bufferTime: 15,
        maxMeetingsPerDay: 8
      }
    };

    // Cache for 15 minutes
    this.availabilityCache.set(cacheKey, availabilityWindow);
    setTimeout(() => this.availabilityCache.delete(cacheKey), 15 * 60 * 1000);

    return availabilityWindow;
  }

  private calculateAvailableWindows(
    dateRange: { start: Date; end: Date },
    busySlots: TimeSlot[],
    workingHours: any
  ): TimeSlot[] {
    const windows: TimeSlot[] = [];
    const currentDate = new Date(dateRange.start);

    while (currentDate <= dateRange.end) {
      // Create working hour slots for each day
      const dayStart = new Date(currentDate);
      const [startHour, startMinute] = workingHours.start.split(':').map(Number);
      dayStart.setHours(startHour, startMinute, 0, 0);

      const dayEnd = new Date(currentDate);
      const [endHour, endMinute] = workingHours.end.split(':').map(Number);
      dayEnd.setHours(endHour, endMinute, 0, 0);

      // Find available slots within working hours
      let currentSlot = new Date(dayStart);
      
      while (currentSlot < dayEnd) {
        const slotEnd = new Date(currentSlot.getTime() + 30 * 60 * 1000); // 30-minute slots
        
        // Check if this slot conflicts with any busy time
        const hasConflict = busySlots.some(busy => 
          (currentSlot < busy.end && slotEnd > busy.start)
        );

        if (!hasConflict) {
          windows.push({
            start: new Date(currentSlot),
            end: slotEnd,
            available: true,
            timezone: workingHours.timezone
          });
        }

        currentSlot = slotEnd;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return windows;
  }

  private async fetchBusySlots(email: string, dateRange: { start: Date; end: Date }): Promise<TimeSlot[]> {
    const busySlots: TimeSlot[] = [];

    // Fetch from all connected calendar providers
    for (const provider of this.calendarProviders.values()) {
      if (provider.syncEnabled) {
        try {
          const providerBusy = await this.integrations.fetchBusyTimes(provider, email, dateRange);
          busySlots.push(...providerBusy);
        } catch (error) {
          console.warn(`Failed to fetch busy slots from ${provider.name}:`, error);
        }
      }
    }

    // Merge overlapping slots
    return this.mergeOverlappingSlots(busySlots);
  }

  private mergeOverlappingSlots(slots: TimeSlot[]): TimeSlot[] {
    if (slots.length === 0) return [];

    const sorted = slots.sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: TimeSlot[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start <= last.end) {
        // Overlapping slots - merge them
        last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  private async validateSuggestions(
    suggestions: Array<{ slot: TimeSlot; confidence: number; reasoning: string }>,
    participants: Participant[]
  ): Promise<Array<{ slot: TimeSlot; confidence: number; reasoning: string; participantAvailability: Record<string, boolean>; conflictScore: number; productivityScore: number }>> {
    const validated = [];

    for (const suggestion of suggestions) {
      const availability = await this.checkRealTimeAvailability(participants, suggestion.slot);
      
      const participantAvailability: Record<string, boolean> = {};
      availability.forEach(a => {
        participantAvailability[a.participant] = a.available;
      });

      const conflictScore = availability.filter(a => !a.available).length / participants.length;
      const productivityScore = this.calculateProductivityScore(suggestion.slot);

      validated.push({
        ...suggestion,
        participantAvailability,
        conflictScore,
        productivityScore
      });
    }

    return validated.sort((a, b) => 
      (b.confidence * (1 - b.conflictScore) * b.productivityScore) - 
      (a.confidence * (1 - a.conflictScore) * a.productivityScore)
    );
  }

  private calculateProductivityScore(slot: TimeSlot): number {
    const hour = slot.start.getHours();
    
    // Peak productivity hours (9-11 AM, 2-4 PM)
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      return 1.0;
    }
    
    // Good productivity hours
    if (hour >= 8 && hour <= 17) {
      return 0.8;
    }
    
    // Lower productivity hours
    return 0.6;
  }

  private async checkRealTimeAvailability(
    participants: Participant[],
    timeSlot: TimeSlot
  ): Promise<Array<{ participant: string; available: boolean; conflicts: string[] }>> {
    const results = [];

    for (const participant of participants) {
      const busySlots = await this.fetchBusySlots(participant.email, {
        start: timeSlot.start,
        end: timeSlot.end
      });

      const conflicts = busySlots.filter(busy =>
        timeSlot.start < busy.end && timeSlot.end > busy.start
      );

      results.push({
        participant: participant.id,
        available: conflicts.length === 0,
        conflicts: conflicts.map(c => `Busy from ${c.start.toLocaleTimeString()} to ${c.end.toLocaleTimeString()}`)
      });
    }

    return results;
  }

  private async syncCalendarProvider(providerId: string): Promise<void> {
    const provider = this.calendarProviders.get(providerId);
    if (!provider || !provider.syncEnabled) return;

    try {
      await this.integrations.syncProvider(provider);
      this.emit('providerSynced', { providerId, timestamp: new Date() });
    } catch (error) {
      this.emit('syncError', { providerId, error: error.message });
    }
  }

  private startBackgroundSync(): void {
    // Sync all providers every 15 minutes
    setInterval(async () => {
      for (const provider of this.calendarProviders.values()) {
        if (provider.syncEnabled) {
          await this.syncCalendarProvider(provider.id);
        }
      }
    }, 15 * 60 * 1000);
  }

  private startMeetingMonitoring(): void {
    // Check for upcoming meetings and send reminders
    setInterval(() => {
      const now = new Date();
      const upcoming = Array.from(this.scheduledMeetings.values()).filter(meeting => {
        const timeDiff = meeting.scheduledTime.start.getTime() - now.getTime();
        return timeDiff > 0 && timeDiff <= 60 * 60 * 1000 && // Within 1 hour
               !meeting.remindersSent.some(sent => now.getTime() - sent.getTime() < 60 * 60 * 1000);
      });

      upcoming.forEach(meeting => {
        this.sendMeetingReminder(meeting);
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async createCalendarEvent(request: MeetingRequest, timeSlot: TimeSlot): Promise<string> {
    // Use primary calendar provider
    const primaryProvider = Array.from(this.calendarProviders.values())[0];
    if (!primaryProvider) {
      throw new SchedulingError('No calendar provider configured', 'NO_PROVIDER');
    }

    return this.integrations.createEvent(primaryProvider, {
      title: request.title,
      description: request.description,
      start: timeSlot.start,
      end: timeSlot.end,
      attendees: request.participants.map(p => ({ email: p.email, name: p.name })),
      location: request.location?.details
    });
  }

  private async updateCalendarEvent(eventId: string, newTime: TimeSlot, reason?: string): Promise<void> {
    const primaryProvider = Array.from(this.calendarProviders.values())[0];
    if (!primaryProvider) return;

    await this.integrations.updateEvent(primaryProvider, eventId, {
      start: newTime.start,
      end: newTime.end,
      description: reason ? `Rescheduled: ${reason}` : undefined
    });
  }

  private async cancelCalendarEvent(eventId: string, reason?: string): Promise<void> {
    const primaryProvider = Array.from(this.calendarProviders.values())[0];
    if (!primaryProvider) return;

    await this.integrations.cancelEvent(primaryProvider, eventId, reason);
  }

  private async bookMeetingRoom(timeSlot: TimeSlot, participantCount: number): Promise<any> {
    // Mock room booking - integrate with actual room booking system
    return {
      roomId: 'room_' + Math.random().toString(36).substr(2, 9),
      roomName: 'Conference Room A',
      location: 'Floor 3, Building A'
    };
  }

  private async updateRoomBooking(roomId: string, oldTime: TimeSlot, newTime: TimeSlot): Promise<void> {
    // Mock room booking update
    console.log(`Room ${roomId} rescheduled from ${oldTime.start} to ${newTime.start}`);
  }

  private async cancelRoomBooking(roomId: string, timeSlot: TimeSlot): Promise<void> {
    // Mock room booking cancellation
    console.log(`Room ${roomId} booking cancelled for ${timeSlot.start}`);
  }

  private async generateMeetingUrl(request: MeetingRequest): Promise<string> {
    // Mock video meeting URL generation
    return `https://meet.saleshud.com/room/${this.generateId()}`;
  }

  private async sendMeetingInvitations(meeting: ScheduledMeeting): Promise<void> {
    // Mock invitation sending
    console.log(`Invitations sent for meeting ${meeting.id}`);
  }

  private async scheduleReminders(meeting: ScheduledMeeting): Promise<void> {
    // Mock reminder scheduling
    console.log(`Reminders scheduled for meeting ${meeting.id}`);
  }

  private async sendRescheduleNotifications(meeting: ScheduledMeeting, originalTime: TimeSlot, reason?: string): Promise<void> {
    // Mock reschedule notifications
    console.log(`Reschedule notifications sent for meeting ${meeting.id}`);
  }

  private async sendCancellationNotifications(meeting: ScheduledMeeting, reason?: string): Promise<void> {
    // Mock cancellation notifications
    console.log(`Cancellation notifications sent for meeting ${meeting.id}`);
  }

  private async sendMeetingReminder(meeting: ScheduledMeeting): Promise<void> {
    // Mock reminder sending
    meeting.remindersSent.push(new Date());
    this.scheduledMeetings.set(meeting.id, meeting);
    console.log(`Reminder sent for meeting ${meeting.id}`);
  }

  private calculateAverageDuration(meetings: ScheduledMeeting[]): number {
    const completedMeetings = meetings.filter(m => m.actualDuration);
    if (completedMeetings.length === 0) return 0;
    
    const totalDuration = completedMeetings.reduce((sum, m) => sum + (m.actualDuration || 0), 0);
    return totalDuration / completedMeetings.length;
  }

  private calculateAttendanceRate(meetings: ScheduledMeeting[]): number {
    const meetingsWithTracking = meetings.filter(m => m.attendanceTracking);
    if (meetingsWithTracking.length === 0) return 0;

    let totalExpected = 0;
    let totalAttended = 0;

    meetingsWithTracking.forEach(meeting => {
      totalExpected += meeting.request.participants.length;
      totalAttended += meeting.attendanceTracking!.filter(a => a.joinTime).length;
    });

    return totalExpected > 0 ? (totalAttended / totalExpected) * 100 : 0;
  }

  private calculateCancellationRate(meetings: ScheduledMeeting[]): number {
    if (meetings.length === 0) return 0;
    const cancelled = meetings.filter(m => m.status === 'cancelled').length;
    return (cancelled / meetings.length) * 100;
  }

  private getMostActiveHours(meetings: ScheduledMeeting[]): string[] {
    const hourCounts: Record<string, number> = {};
    
    meetings.forEach(meeting => {
      const hour = meeting.scheduledTime.start.getHours();
      const hourStr = `${hour.toString().padStart(2, '0')}:00`;
      hourCounts[hourStr] = (hourCounts[hourStr] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => hour);
  }

  private analyzeParticipantEngagement(meetings: ScheduledMeeting[]): Record<string, number> {
    const engagement: Record<string, number> = {};

    meetings.forEach(meeting => {
      meeting.request.participants.forEach(participant => {
        if (!engagement[participant.email]) engagement[participant.email] = 0;
        
        const attendance = meeting.attendanceTracking?.find(a => a.participant === participant.email);
        if (attendance?.joinTime) {
          engagement[participant.email]++;
        }
      });
    });

    return engagement;
  }

  private analyzeRoomUtilization(meetings: ScheduledMeeting[]): Record<string, number> {
    const utilization: Record<string, number> = {};

    meetings.forEach(meeting => {
      if (meeting.roomBooking) {
        const roomName = meeting.roomBooking.roomName;
        utilization[roomName] = (utilization[roomName] || 0) + 1;
      }
    });

    return utilization;
  }

  private generateId(): string {
    return 'sched_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public getters
  get connectedProviders(): CalendarProvider[] {
    return Array.from(this.calendarProviders.values());
  }

  get upcomingMeetings(): ScheduledMeeting[] {
    const now = new Date();
    return Array.from(this.scheduledMeetings.values())
      .filter(meeting => meeting.scheduledTime.start > now)
      .sort((a, b) => a.scheduledTime.start.getTime() - b.scheduledTime.start.getTime());
  }
}

// Helper Classes
class OptimizationEngine {
  async optimize(request: MeetingRequest, availability: AvailabilityWindow[]): Promise<OptimizationResult> {
    // AI-powered optimization logic
    const suggestedTimes = this.findBestTimes(availability, request);
    
    return {
      suggestedTimes: suggestedTimes.map(slot => ({
        slot,
        confidence: this.calculateConfidence(slot, availability),
        reasoning: this.generateReasoning(slot, availability),
        participantAvailability: {},
        conflictScore: 0,
        productivityScore: 0
      })),
      alternativeTimes: this.findAlternativeTimes(availability, request),
      recommendations: {
        bestTime: suggestedTimes[0],
        reasoning: 'Optimal time based on all participants\' availability and productivity patterns',
        riskFactors: []
      }
    };
  }

  private findBestTimes(availability: AvailabilityWindow[], request: MeetingRequest): TimeSlot[] {
    // Mock implementation - find common available slots
    const commonSlots: TimeSlot[] = [];
    
    // Get all possible slots from first participant
    if (availability.length === 0) return [];
    
    const firstParticipant = availability[0];
    
    for (const window of firstParticipant.windows) {
      if (window.end.getTime() - window.start.getTime() >= request.type.duration * 60 * 1000) {
        // Check if all other participants are available
        const allAvailable = availability.every(avail => 
          avail.windows.some(w => 
            w.start <= window.start && w.end >= window.end
          )
        );
        
        if (allAvailable) {
          commonSlots.push({
            start: window.start,
            end: new Date(window.start.getTime() + request.type.duration * 60 * 1000),
            available: true,
            timezone: window.timezone
          });
        }
      }
    }
    
    return commonSlots.slice(0, 5); // Return top 5 suggestions
  }

  private findAlternativeTimes(availability: AvailabilityWindow[], request: MeetingRequest): TimeSlot[] {
    // Find times where most (but not all) participants are available
    return [];
  }

  private calculateConfidence(slot: TimeSlot, availability: AvailabilityWindow[]): number {
    // Calculate confidence based on various factors
    const baseConfidence = 85;
    const hourOfDay = slot.start.getHours();
    
    // Prefer business hours
    if (hourOfDay >= 9 && hourOfDay <= 17) {
      return Math.min(baseConfidence + 10, 100);
    }
    
    return baseConfidence;
  }

  private generateReasoning(slot: TimeSlot, availability: AvailabilityWindow[]): string {
    return `Optimal time slot with all participants available during productive hours`;
  }
}

class CalendarIntegrations {
  async validateConnection(provider: CalendarProvider): Promise<void> {
    // Mock validation
    if (!provider.accessToken) {
      throw new Error('Invalid access token');
    }
  }

  async syncProvider(provider: CalendarProvider): Promise<void> {
    // Mock sync operation
    console.log(`Syncing ${provider.name} calendar`);
  }

  async fetchBusyTimes(
    provider: CalendarProvider,
    email: string,
    dateRange: { start: Date; end: Date }
  ): Promise<TimeSlot[]> {
    // Mock busy times - return sample data
    return [
      {
        start: new Date(dateRange.start.getTime() + 2 * 60 * 60 * 1000), // 2 hours after start
        end: new Date(dateRange.start.getTime() + 3 * 60 * 60 * 1000),   // 1 hour meeting
        available: false,
        timezone: 'UTC'
      }
    ];
  }

  async createEvent(provider: CalendarProvider, eventData: any): Promise<string> {
    // Mock event creation
    return 'event_' + Math.random().toString(36).substr(2, 9);
  }

  async updateEvent(provider: CalendarProvider, eventId: string, updates: any): Promise<void> {
    // Mock event update
    console.log(`Updated event ${eventId} on ${provider.name}`);
  }

  async cancelEvent(provider: CalendarProvider, eventId: string, reason?: string): Promise<void> {
    // Mock event cancellation
    console.log(`Cancelled event ${eventId} on ${provider.name}: ${reason || 'No reason provided'}`);
  }
}