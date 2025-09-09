/**
 * Scheduling Modal Component
 * AI-powered follow-up scheduling with intelligent time suggestions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Clock,
  Users,
  MapPin,
  Video,
  Phone,
  Coffee,
  Presentation,
  CheckCircle,
  Settings,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Star,
  Brain,
  Zap,
  Target,
  FileText,
  Send,
  Copy,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  User,
  Building2,
  Globe
} from 'lucide-react';

interface TimeSlot {
  id: string;
  start: Date;
  end: Date;
  confidence: number;
  reasoning: string;
  timezone: string;
  available: boolean;
}

interface MeetingType {
  id: string;
  name: string;
  description: string;
  duration: number;
  icon: any;
  color: string;
  preparation: string[];
  agenda: string[];
}

interface Participant {
  id: string;
  name: string;
  email: string;
  company?: string;
  title?: string;
  timezone: string;
  availability?: TimeSlot[];
}

interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  available: boolean;
}

interface SchedulingData {
  type: MeetingType;
  participants: Participant[];
  suggestedTimes: TimeSlot[];
  selectedTime?: TimeSlot;
  room?: MeetingRoom;
  agenda: string;
  preparation: string[];
  notes: string;
}

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (data: SchedulingData) => Promise<void>;
  contactData?: {
    name: string;
    email: string;
    company: string;
    timezone: string;
  };
  meetingContext?: {
    dealStage: string;
    previousMeetings: number;
    lastInteraction: Date;
    topics: string[];
  };
}

const MEETING_TYPES: MeetingType[] = [
  {
    id: 'demo',
    name: 'Product Demo',
    description: 'Showcase product features and capabilities',
    duration: 60,
    icon: Presentation,
    color: 'bg-blue-500',
    preparation: [
      'Prepare demo environment',
      'Customize demo to client needs',
      'Review previous conversations'
    ],
    agenda: [
      'Welcome and introductions (5 min)',
      'Product demo tailored to needs (35 min)',
      'Q&A and discussion (15 min)',
      'Next steps (5 min)'
    ]
  },
  {
    id: 'checkin',
    name: 'Check-in Call',
    description: 'Regular progress review and relationship building',
    duration: 30,
    icon: Coffee,
    color: 'bg-green-500',
    preparation: [
      'Review account status',
      'Prepare progress updates',
      'Identify blockers'
    ],
    agenda: [
      'Project status update (10 min)',
      'Address concerns (10 min)',
      'Plan next activities (10 min)'
    ]
  },
  {
    id: 'decision',
    name: 'Decision Meeting',
    description: 'Final presentation for decision makers',
    duration: 45,
    icon: Target,
    color: 'bg-purple-500',
    preparation: [
      'Prepare executive summary',
      'Review ROI calculations',
      'Anticipate objections'
    ],
    agenda: [
      'Executive summary (10 min)',
      'ROI and value proposition (15 min)',
      'Implementation timeline (10 min)',
      'Decision and next steps (10 min)'
    ]
  },
  {
    id: 'implementation',
    name: 'Implementation Planning',
    description: 'Technical setup and onboarding planning',
    duration: 90,
    icon: Settings,
    color: 'bg-orange-500',
    preparation: [
      'Technical requirements review',
      'Implementation timeline',
      'Resource allocation'
    ],
    agenda: [
      'Technical requirements (20 min)',
      'Implementation roadmap (30 min)',
      'Resource planning (20 min)',
      'Timeline and milestones (20 min)'
    ]
  }
];

export const SchedulingModal: React.FC<SchedulingModalProps> = ({
  isOpen,
  onClose,
  onSchedule,
  contactData,
  meetingContext
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState<'type' | 'time' | 'details' | 'review'>('type');
  const [schedulingData, setSchedulingData] = useState<Partial<SchedulingData>>({
    participants: contactData ? [{
      id: '1',
      name: contactData.name,
      email: contactData.email,
      company: contactData.company,
      timezone: contactData.timezone
    }] : [],
    notes: ''
  });
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isGeneratingTimes, setIsGeneratingTimes] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate AI-powered time suggestions
  const generateTimeSlots = useCallback(async (date: Date, meetingType: MeetingType) => {
    setIsGeneratingTimes(true);
    
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const suggestions: TimeSlot[] = [
      {
        id: '1',
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10 + meetingType.duration / 60, 0),
        confidence: 95,
        reasoning: 'Optimal time based on both participants\' peak productivity hours and availability',
        timezone: 'EST',
        available: true
      },
      {
        id: '2',
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, 0),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14 + meetingType.duration / 60, 0),
        confidence: 88,
        reasoning: 'Good alternative slot with high attention levels after lunch break',
        timezone: 'EST',
        available: true
      },
      {
        id: '3',
        start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 16, 0),
        end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 16 + meetingType.duration / 60, 0),
        confidence: 75,
        reasoning: 'Late afternoon slot - may compete with end-of-day priorities',
        timezone: 'EST',
        available: true
      }
    ];
    
    setSchedulingData(prev => ({ ...prev, suggestedTimes: suggestions }));
    setIsGeneratingTimes(false);
  }, []);

  // Handle meeting type selection
  const handleTypeSelect = (type: MeetingType) => {
    setSchedulingData(prev => ({ 
      ...prev, 
      type,
      agenda: type.agenda.join('\n'),
      preparation: type.preparation
    }));
    setCurrentStep('time');
    generateTimeSlots(selectedDate, type);
  };

  // Handle time slot selection
  const handleTimeSelect = (timeSlot: TimeSlot) => {
    setSchedulingData(prev => ({ ...prev, selectedTime: timeSlot }));
  };

  // Handle scheduling
  const handleSchedule = async () => {
    if (!schedulingData.type || !schedulingData.selectedTime) return;
    
    try {
      setIsScheduling(true);
      await onSchedule(schedulingData as SchedulingData);
      onClose();
    } catch (error) {
      console.error('Failed to schedule meeting:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  // Navigation helpers
  const canProceed = () => {
    switch (currentStep) {
      case 'type':
        return !!schedulingData.type;
      case 'time':
        return !!schedulingData.selectedTime;
      case 'details':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (!canProceed()) return;
    
    switch (currentStep) {
      case 'type':
        setCurrentStep('time');
        break;
      case 'time':
        setCurrentStep('details');
        break;
      case 'details':
        setCurrentStep('review');
        break;
    }
  };

  const prevStep = () => {
    switch (currentStep) {
      case 'time':
        setCurrentStep('type');
        break;
      case 'details':
        setCurrentStep('time');
        break;
      case 'review':
        setCurrentStep('details');
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Schedule Follow-up</h2>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800 rounded-lg">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">AI Optimized</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Progress Indicator */}
              <div className="flex items-center space-x-2">
                {['type', 'time', 'details', 'review'].map((step, index) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep === step 
                        ? 'bg-blue-600 text-white' 
                        : index < ['type', 'time', 'details', 'review'].indexOf(currentStep)
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-700 text-slate-400'
                    }`}>
                      {index < ['type', 'time', 'details', 'review'].indexOf(currentStep) ? 
                        <CheckCircle className="w-4 h-4" /> : index + 1
                      }
                    </div>
                    {index < 3 && (
                      <div className={`w-8 h-0.5 mx-1 ${
                        index < ['type', 'time', 'details', 'review'].indexOf(currentStep) 
                          ? 'bg-green-600' : 'bg-slate-700'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 h-[calc(90vh-200px)] overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* Step 1: Meeting Type Selection */}
              {currentStep === 'type' && (
                <motion.div
                  key="type"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Select Meeting Type</h3>
                    <p className="text-slate-400">
                      Choose the type of follow-up meeting based on your conversation and deal stage.
                    </p>
                  </div>

                  {meetingContext && (
                    <div className="bg-slate-800/30 rounded-lg p-4 mb-6">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Deal Stage:</span>
                          <p className="text-white font-medium">{meetingContext.dealStage}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Previous Meetings:</span>
                          <p className="text-white font-medium">{meetingContext.previousMeetings}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Last Interaction:</span>
                          <p className="text-white font-medium">
                            {meetingContext.lastInteraction.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {MEETING_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <motion.div
                          key={type.id}
                          className={`p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            schedulingData.type?.id === type.id
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
                          }`}
                          onClick={() => handleTypeSelect(type)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 ${type.color} rounded-lg flex items-center justify-center`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-white mb-1">{type.name}</h4>
                              <p className="text-sm text-slate-400 mb-2">{type.description}</p>
                              <div className="flex items-center space-x-2 text-xs text-slate-500">
                                <Clock className="w-3 h-3" />
                                <span>{type.duration} minutes</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Time Selection */}
              {currentStep === 'time' && (
                <motion.div
                  key="time"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Choose Optimal Time</h3>
                    <p className="text-slate-400">
                      AI-generated time suggestions based on participant availability and productivity patterns.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div className="col-span-1">
                      <h4 className="text-sm font-medium text-white mb-4">Select Date</h4>
                      <div className="bg-slate-800/30 rounded-lg p-4">
                        <div className="text-center mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <button
                              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                              className="p-1 hover:bg-slate-700 rounded"
                            >
                              <ChevronLeft className="w-4 h-4 text-slate-400" />
                            </button>
                            <span className="font-medium text-white">
                              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                              className="p-1 hover:bg-slate-700 rounded"
                            >
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Simple date grid */}
                        <div className="grid grid-cols-7 gap-1 text-center text-sm">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="p-2 text-slate-500 font-medium">{day}</div>
                          ))}
                          {Array.from({ length: 35 }, (_, i) => {
                            const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i - 6);
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  setSelectedDate(date);
                                  if (schedulingData.type) {
                                    generateTimeSlots(date, schedulingData.type);
                                  }
                                }}
                                className={`p-2 rounded hover:bg-slate-700 transition-colors ${
                                  isSelected ? 'bg-blue-600 text-white' :
                                  isToday ? 'bg-slate-700 text-blue-400' :
                                  date.getMonth() !== selectedDate.getMonth() ? 'text-slate-600' :
                                  'text-slate-300'
                                }`}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Time Suggestions */}
                    <div className="col-span-2">
                      <h4 className="text-sm font-medium text-white mb-4">AI Time Suggestions</h4>
                      
                      {isGeneratingTimes ? (
                        <div className="bg-slate-800/30 rounded-lg p-8 text-center">
                          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-slate-400">Analyzing optimal meeting times...</p>
                          <p className="text-sm text-slate-500 mt-1">Considering availability, productivity patterns, and timezone preferences</p>
                        </div>
                      ) : schedulingData.suggestedTimes ? (
                        <div className="space-y-3">
                          {schedulingData.suggestedTimes.map((timeSlot) => (
                            <motion.div
                              key={timeSlot.id}
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                schedulingData.selectedTime?.id === timeSlot.id
                                  ? 'border-blue-500 bg-blue-500/10'
                                  : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
                              }`}
                              onClick={() => handleTimeSelect(timeSlot)}
                              whileHover={{ scale: 1.01 }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <div className="text-lg font-semibold text-white">
                                      {timeSlot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      {' - '}
                                      {timeSlot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Star className="w-4 h-4 text-yellow-400" />
                                      <span className="text-sm text-slate-400">{timeSlot.confidence}% confidence</span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-slate-400">{timeSlot.reasoning}</p>
                                </div>
                                
                                <div className="ml-4">
                                  <Zap className={`w-5 h-5 ${
                                    timeSlot.confidence >= 90 ? 'text-green-400' :
                                    timeSlot.confidence >= 75 ? 'text-yellow-400' : 'text-orange-400'
                                  }`} />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                          
                          <button
                            onClick={() => schedulingData.type && generateTimeSlots(selectedDate, schedulingData.type)}
                            className="w-full p-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
                          >
                            Generate more suggestions
                          </button>
                        </div>
                      ) : (
                        <div className="bg-slate-800/30 rounded-lg p-8 text-center">
                          <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                          <p className="text-slate-400">Select a date to see time suggestions</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Meeting Details */}
              {currentStep === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Meeting Details</h3>
                    <p className="text-slate-400">
                      Customize the agenda and add any specific notes or requirements.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {/* Participants */}
                      <div>
                        <h4 className="text-sm font-medium text-white mb-3">Participants</h4>
                        <div className="space-y-2">
                          {schedulingData.participants?.map((participant) => (
                            <div key={participant.id} className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-lg">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {participant.name.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">{participant.name}</p>
                                <p className="text-xs text-slate-400">{participant.email}</p>
                              </div>
                            </div>
                          ))}
                          <button className="w-full p-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors">
                            <Plus className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>

                      {/* Meeting Location */}
                      <div>
                        <h4 className="text-sm font-medium text-white mb-3">Meeting Type</h4>
                        <div className="space-y-2">
                          {[
                            { id: 'video', label: 'Video Call', icon: Video, description: 'Zoom, Teams, or Google Meet' },
                            { id: 'phone', label: 'Phone Call', icon: Phone, description: 'Audio only conference' },
                            { id: 'inperson', label: 'In Person', icon: MapPin, description: 'Face-to-face meeting' }
                          ].map((option) => {
                            const Icon = option.icon;
                            return (
                              <div
                                key={option.id}
                                className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors"
                              >
                                <Icon className="w-4 h-4 text-slate-400" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">{option.label}</p>
                                  <p className="text-xs text-slate-400">{option.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {/* Agenda */}
                      <div>
                        <h4 className="text-sm font-medium text-white mb-3">Meeting Agenda</h4>
                        <textarea
                          value={schedulingData.agenda || ''}
                          onChange={(e) => setSchedulingData(prev => ({ ...prev, agenda: e.target.value }))}
                          rows={8}
                          className="w-full p-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Meeting agenda items..."
                        />
                      </div>

                      {/* Preparation Items */}
                      <div>
                        <h4 className="text-sm font-medium text-white mb-3">Preparation Checklist</h4>
                        <div className="space-y-2">
                          {schedulingData.preparation?.map((item, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-slate-300">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <h4 className="text-sm font-medium text-white mb-3">Additional Notes</h4>
                        <textarea
                          value={schedulingData.notes}
                          onChange={(e) => setSchedulingData(prev => ({ ...prev, notes: e.target.value }))}
                          rows={4}
                          className="w-full p-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Any special requirements or notes..."
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review */}
              {currentStep === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Review & Schedule</h3>
                    <p className="text-slate-400">
                      Review all meeting details before sending the calendar invitation.
                    </p>
                  </div>

                  <div className="bg-slate-800/30 rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-8">
                      {/* Meeting Summary */}
                      <div>
                        <h4 className="text-sm font-medium text-white mb-4">Meeting Summary</h4>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            {schedulingData.type && (
                              <>
                                <div className={`w-8 h-8 ${schedulingData.type.color} rounded-lg flex items-center justify-center`}>
                                  <schedulingData.type.icon className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">{schedulingData.type.name}</p>
                                  <p className="text-xs text-slate-400">{schedulingData.type.duration} minutes</p>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {schedulingData.selectedTime && (
                            <div className="flex items-center space-x-3">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-sm text-white">
                                  {schedulingData.selectedTime.start.toLocaleDateString()}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {schedulingData.selectedTime.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {' - '}
                                  {schedulingData.selectedTime.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-3">
                            <Users className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-sm text-white">
                                {schedulingData.participants?.length} participant(s)
                              </p>
                              <p className="text-xs text-slate-400">
                                {schedulingData.participants?.map(p => p.name).join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Agenda Preview */}
                      <div>
                        <h4 className="text-sm font-medium text-white mb-4">Agenda</h4>
                        <div className="bg-slate-900/50 rounded-lg p-4">
                          <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                            {schedulingData.agenda}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Confidence */}
                  {schedulingData.selectedTime && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Brain className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            AI Confidence: {schedulingData.selectedTime.confidence}%
                          </p>
                          <p className="text-xs text-slate-400">
                            {schedulingData.selectedTime.reasoning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={currentStep === 'type'}
                className="flex items-center space-x-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>

                {currentStep === 'review' ? (
                  <button
                    onClick={handleSchedule}
                    disabled={isScheduling || !canProceed()}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
                  >
                    {isScheduling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Scheduling...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Schedule Meeting</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};