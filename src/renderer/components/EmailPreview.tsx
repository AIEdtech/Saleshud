/**
 * Email Preview Component
 * Rich email composition modal with AI validation and context integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Edit3,
  Paperclip,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  User,
  Building2,
  Calendar,
  Clock,
  Star,
  Target,
  TrendingUp,
  FileText,
  Download,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface EmailRecipient {
  email: string;
  name: string;
  company?: string;
  title?: string;
}

interface EmailAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  preview?: string;
}

interface AIValidation {
  score: number;
  issues: {
    type: 'tone' | 'clarity' | 'length' | 'personalization' | 'cta';
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestion: string;
  }[];
  strengths: string[];
  improvements: string[];
}

interface ConversationContext {
  painPoints: string[];
  interests: string[];
  companyData: {
    name: string;
    industry: string;
    size: string;
    challenges: string[];
  };
  dealStage: string;
  previousInteractions: number;
}

interface EmailPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emailData: any) => Promise<void>;
  initialData?: {
    to: EmailRecipient[];
    cc?: EmailRecipient[];
    subject: string;
    body: string;
    attachments?: EmailAttachment[];
  };
  context: ConversationContext;
  templates?: any[];
}

export const EmailPreview: React.FC<EmailPreviewProps> = ({
  isOpen,
  onClose,
  onSend,
  initialData,
  context,
  templates = []
}) => {
  // State management
  const [emailData, setEmailData] = useState({
    to: initialData?.to || [],
    cc: initialData?.cc || [],
    subject: initialData?.subject || '',
    body: initialData?.body || '',
    attachments: initialData?.attachments || []
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [validation, setValidation] = useState<AIValidation | null>(null);
  const [showValidation, setShowValidation] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<'preview' | 'validation' | 'context'>('preview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['suggestions']));
  
  // Refs
  const bodyRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // AI Validation simulation
  useEffect(() => {
    if (emailData.body && emailData.subject) {
      const mockValidation: AIValidation = {
        score: 85,
        issues: [
          {
            type: 'personalization',
            severity: 'medium',
            message: 'Email could benefit from more personalization',
            suggestion: 'Include specific company challenges or recent achievements'
          },
          {
            type: 'cta',
            severity: 'low',
            message: 'Call-to-action could be more specific',
            suggestion: 'Suggest specific time slots for the meeting'
          }
        ],
        strengths: [
          'Clear and professional tone',
          'Relevant industry insights included',
          'Appropriate length for initial outreach'
        ],
        improvements: [
          'Add reference to recent company news',
          'Include case study relevant to their industry',
          'Strengthen the value proposition'
        ]
      };
      setValidation(mockValidation);
    }
  }, [emailData.body, emailData.subject]);

  // Handle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Handle email sending
  const handleSend = async () => {
    try {
      setIsSending(true);
      await onSend(emailData);
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailData.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Render validation score
  const renderValidationScore = () => {
    if (!validation) return null;
    
    const scoreColor = 
      validation.score >= 80 ? 'text-green-400' :
      validation.score >= 60 ? 'text-yellow-400' : 'text-red-400';
    
    return (
      <div className="flex items-center space-x-2">
        <div className={`text-2xl font-bold ${scoreColor}`}>
          {validation.score}
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-300">AI Validation Score</div>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-1">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                validation.score >= 80 ? 'bg-green-500' :
                validation.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${validation.score}%` }}
            />
          </div>
        </div>
      </div>
    );
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
          className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Send className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Email Preview</h2>
              </div>
              {validation && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800 rounded-lg">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-slate-300">AI Enhanced</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowValidation(!showValidation)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Toggle validation panel"
              >
                {showValidation ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Copy email content"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="flex">
            {/* Main Email Preview */}
            <div className={`flex-1 ${showValidation ? 'border-r border-slate-700' : ''}`}>
              <div className="p-6 h-[calc(90vh-180px)] overflow-y-auto">
                {/* Email Headers */}
                <div className="space-y-4 mb-6">
                  {/* To Field */}
                  <div className="flex items-start space-x-3">
                    <label className="text-sm font-medium text-slate-400 w-12 mt-2">To:</label>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        {emailData.to.map((recipient, index) => (
                          <div key={index} className="flex items-center space-x-2 bg-slate-800 rounded-lg px-3 py-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                              {recipient.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{recipient.name}</div>
                              {recipient.company && (
                                <div className="text-xs text-slate-400">{recipient.company}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CC Field */}
                  {emailData.cc && emailData.cc.length > 0 && (
                    <div className="flex items-start space-x-3">
                      <label className="text-sm font-medium text-slate-400 w-12 mt-2">CC:</label>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2">
                          {emailData.cc.map((recipient, index) => (
                            <div key={index} className="flex items-center space-x-2 bg-slate-800 rounded-lg px-3 py-2">
                              <div className="text-sm text-white">{recipient.name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subject Field */}
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-slate-400 w-12">Subject:</label>
                    <div className="flex-1">
                      {isEditing ? (
                        <input
                          ref={subjectRef}
                          value={emailData.subject}
                          onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="px-3 py-2 bg-slate-800/50 rounded-lg text-white">
                          {emailData.subject}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachments */}
                  {emailData.attachments && emailData.attachments.length > 0 && (
                    <div className="flex items-start space-x-3">
                      <label className="text-sm font-medium text-slate-400 w-12 mt-2">Files:</label>
                      <div className="flex-1">
                        <div className="space-y-2">
                          {emailData.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center space-x-3 bg-slate-800 rounded-lg p-3">
                              <Paperclip className="w-4 h-4 text-slate-400" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-white">{attachment.name}</div>
                                <div className="text-xs text-slate-400">
                                  {(attachment.size / 1024).toFixed(1)} KB • {attachment.type}
                                </div>
                              </div>
                              <button className="p-1 hover:bg-slate-700 rounded transition-colors">
                                <Download className="w-4 h-4 text-slate-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Email Body */}
                <div className="border-t border-slate-700 pt-6">
                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={emailData.body}
                        onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                        className="w-full h-96 p-4 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Write your email content here..."
                      />
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-400">
                          {emailData.body.length} characters • ~{Math.ceil(emailData.body.split(' ').length / 200)} min read
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      <div 
                        className="text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-800/30 rounded-lg p-6"
                        dangerouslySetInnerHTML={{ __html: emailData.body.replace(/\n/g, '<br>') }}
                      />
                    </div>
                  )}
                </div>

                {/* Context Highlights */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Target className="w-4 h-4 text-green-400" />
                      <h4 className="text-sm font-medium text-white">Pain Points Addressed</h4>
                    </div>
                    <div className="space-y-2">
                      {context.painPoints.map((point, index) => (
                        <div key={index} className="text-xs text-slate-300 bg-slate-700/50 rounded px-2 py-1">
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <h4 className="text-sm font-medium text-white">Interests Mentioned</h4>
                    </div>
                    <div className="space-y-2">
                      {context.interests.map((interest, index) => (
                        <div key={index} className="text-xs text-slate-300 bg-slate-700/50 rounded px-2 py-1">
                          {interest}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>{isEditing ? 'Preview' : 'Edit'}</span>
                    </button>
                    
                    <div className="text-sm text-slate-400">
                      Deal Stage: <span className="text-white font-medium">{context.dealStage}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={onClose}
                      className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={isSending}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors"
                    >
                      {isSending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>{isSending ? 'Sending...' : 'Send Email'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation & Context Panel */}
            {showValidation && (
              <div className="w-80 bg-slate-800/30 p-6 overflow-y-auto h-[calc(90vh-120px)]">
                <div className="space-y-6">
                  {/* AI Validation Score */}
                  {validation && (
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      {renderValidationScore()}
                    </div>
                  )}

                  {/* Issues */}
                  {validation && validation.issues.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('issues')}
                        className="flex items-center justify-between w-full mb-3 text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-orange-400" />
                          <h3 className="text-sm font-medium text-white">Issues to Address</h3>
                        </div>
                        {expandedSections.has('issues') ? 
                          <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        }
                      </button>
                      
                      <AnimatePresence>
                        {expandedSections.has('issues') && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-3"
                          >
                            {validation.issues.map((issue, index) => (
                              <div key={index} className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-start space-x-2 mb-2">
                                  <div className={`w-2 h-2 rounded-full mt-2 ${
                                    issue.severity === 'high' ? 'bg-red-400' :
                                    issue.severity === 'medium' ? 'bg-orange-400' : 'bg-yellow-400'
                                  }`} />
                                  <div className="flex-1">
                                    <p className="text-sm text-white">{issue.message}</p>
                                    <p className="text-xs text-slate-400 mt-1">{issue.suggestion}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Suggestions */}
                  {validation && validation.improvements.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('suggestions')}
                        className="flex items-center justify-between w-full mb-3 text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <Lightbulb className="w-4 h-4 text-yellow-400" />
                          <h3 className="text-sm font-medium text-white">AI Suggestions</h3>
                        </div>
                        {expandedSections.has('suggestions') ? 
                          <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        }
                      </button>
                      
                      <AnimatePresence>
                        {expandedSections.has('suggestions') && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-2"
                          >
                            {validation.improvements.map((improvement, index) => (
                              <div key={index} className="text-sm text-slate-300 bg-slate-800/30 rounded p-2">
                                {improvement}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Strengths */}
                  {validation && validation.strengths.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleSection('strengths')}
                        className="flex items-center justify-between w-full mb-3 text-left"
                      >
                        <div className="flex items-center space-x-2">
                          <Check className="w-4 h-4 text-green-400" />
                          <h3 className="text-sm font-medium text-white">Strengths</h3>
                        </div>
                        {expandedSections.has('strengths') ? 
                          <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        }
                      </button>
                      
                      <AnimatePresence>
                        {expandedSections.has('strengths') && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-2"
                          >
                            {validation.strengths.map((strength, index) => (
                              <div key={index} className="text-sm text-green-300 bg-green-500/10 rounded p-2">
                                {strength}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Company Context */}
                  <div>
                    <button
                      onClick={() => toggleSection('context')}
                      className="flex items-center justify-between w-full mb-3 text-left"
                    >
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-medium text-white">Company Context</h3>
                      </div>
                      {expandedSections.has('context') ? 
                        <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      }
                    </button>
                    
                    <AnimatePresence>
                      {expandedSections.has('context') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-slate-800/50 rounded-lg p-4 space-y-3"
                        >
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Company</p>
                            <p className="text-sm text-white">{context.companyData.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Industry</p>
                            <p className="text-sm text-white">{context.companyData.industry}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Size</p>
                            <p className="text-sm text-white">{context.companyData.size}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Previous Interactions</p>
                            <p className="text-sm text-white">{context.previousInteractions}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};