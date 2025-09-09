/**
 * Summary Modal Component
 * Comprehensive AI-powered meeting analytics and insights dashboard
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Download,
  Share2,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  Star,
  Brain,
  Lightbulb,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Send,
  Save,
  ExternalLink,
  Zap,
  Heart,
  MessageSquare,
  Flag,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  Filter,
  Search,
  Eye,
  Volume2
} from 'lucide-react';

interface MeetingMetrics {
  duration: number;
  participantCount: number;
  wordsSpoken: number;
  talkTimeDistribution: { [speaker: string]: number };
  sentimentScore: number;
  engagementLevel: number;
  interruptionsCount: number;
  questionsAsked: number;
}

interface DealHealth {
  score: number;
  factors: {
    engagement: number;
    interest: number;
    budget: number;
    timeline: number;
    decisionMaker: number;
  };
  riskFactors: string[];
  opportunities: string[];
  nextSteps: string[];
}

interface ActionItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  category: 'follow_up' | 'preparation' | 'research' | 'proposal' | 'internal';
}

interface KeyInsight {
  id: string;
  type: 'opportunity' | 'concern' | 'decision_factor' | 'competitor' | 'timeline';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timestamp: Date;
  relatedQuotes: string[];
}

interface ConversationFlow {
  phases: {
    name: string;
    duration: number;
    sentiment: number;
    keyTopics: string[];
  }[];
  peaks: {
    timestamp: number;
    type: 'engagement' | 'concern' | 'interest';
    description: string;
  }[];
}

interface SummaryData {
  meetingId: string;
  title: string;
  date: Date;
  participants: { name: string; role: string; company: string }[];
  metrics: MeetingMetrics;
  dealHealth: DealHealth;
  actionItems: ActionItem[];
  insights: KeyInsight[];
  conversationFlow: ConversationFlow;
  transcript?: { speaker: string; text: string; timestamp: Date }[];
  recording?: {
    url: string;
    duration: number;
  };
}

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SummaryData;
  onExport?: (format: 'pdf' | 'docx' | 'json') => Promise<void>;
  onShare?: (data: any) => Promise<void>;
  onSaveToCRM?: (data: any) => Promise<void>;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  data,
  onExport,
  onShare,
  onSaveToCRM
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'actions' | 'transcript'>('overview');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle copy to clipboard
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Handle export
  const handleExport = async (format: 'pdf' | 'docx' | 'json') => {
    if (!onExport) return;
    
    try {
      setIsExporting(true);
      await onExport(format);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate deal health color
  const getDealHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Filter insights based on type and search
  const filteredInsights = data.insights.filter(insight => {
    const matchesType = selectedInsightType === 'all' || insight.type === selectedInsightType;
    const matchesSearch = !searchQuery || 
      insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      insight.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
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
          className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-6 h-6 text-blue-400" />
                <div>
                  <h2 className="text-xl font-semibold text-white">{data.title}</h2>
                  <p className="text-sm text-slate-400">
                    {data.date.toLocaleDateString()} • {Math.floor(data.metrics.duration / 60)} min
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800 rounded-lg">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">AI Generated</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Export as PDF"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={() => onShare && onShare(data)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Share summary"
                >
                  <Share2 className="w-4 h-4 text-slate-400" />
                </button>
                <button
                  onClick={() => handleCopy(JSON.stringify(data, null, 2))}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Copy summary"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-700">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'insights', label: 'Insights', icon: Lightbulb },
              { id: 'actions', label: 'Action Items', icon: CheckCircle2 },
              { id: 'transcript', label: 'Transcript', icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-blue-400 bg-blue-500/5'
                      : 'text-slate-400 border-transparent hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-6 h-[calc(90vh-200px)] overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-800/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-slate-400">Duration</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {Math.floor(data.metrics.duration / 60)}m
                      </p>
                      <p className="text-xs text-slate-500">
                        {data.metrics.duration % 60}s remaining
                      </p>
                    </div>

                    <div className="bg-slate-800/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Heart className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-slate-400">Deal Health</span>
                      </div>
                      <p className={`text-2xl font-bold ${getDealHealthColor(data.dealHealth.score)}`}>
                        {data.dealHealth.score}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {data.dealHealth.score >= 80 ? 'Excellent' :
                         data.dealHealth.score >= 60 ? 'Good' : 'Needs Attention'}
                      </p>
                    </div>

                    <div className="bg-slate-800/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-slate-400">Engagement</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {data.metrics.engagementLevel}%
                      </p>
                      <p className="text-xs text-slate-500">
                        Above average
                      </p>
                    </div>

                    <div className="bg-slate-800/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="w-4 h-4 text-orange-400" />
                        <span className="text-sm text-slate-400">Action Items</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {data.actionItems.length}
                      </p>
                      <p className="text-xs text-slate-500">
                        {data.actionItems.filter(item => item.priority === 'high').length} high priority
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Deal Health Breakdown */}
                    <div className="col-span-2">
                      <h3 className="text-lg font-semibold text-white mb-4">Deal Health Analysis</h3>
                      <div className="bg-slate-800/30 rounded-lg p-6">
                        <div className="space-y-4">
                          {Object.entries(data.dealHealth.factors).map(([factor, score]) => (
                            <div key={factor} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-300 capitalize">
                                  {factor.replace('_', ' ')}
                                </span>
                                <span className={`text-sm font-bold ${getDealHealthColor(score)}`}>
                                  {score}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    score >= 80 ? 'bg-green-500' :
                                    score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Risk Factors */}
                        {data.dealHealth.riskFactors.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-slate-700">
                            <h4 className="text-sm font-medium text-white mb-3 flex items-center space-x-2">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span>Risk Factors</span>
                            </h4>
                            <div className="space-y-2">
                              {data.dealHealth.riskFactors.map((risk, index) => (
                                <div key={index} className="text-sm text-red-300 bg-red-500/10 rounded p-2">
                                  {risk}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Opportunities */}
                        {data.dealHealth.opportunities.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-white mb-3 flex items-center space-x-2">
                              <Star className="w-4 h-4 text-green-400" />
                              <span>Opportunities</span>
                            </h4>
                            <div className="space-y-2">
                              {data.dealHealth.opportunities.map((opportunity, index) => (
                                <div key={index} className="text-sm text-green-300 bg-green-500/10 rounded p-2">
                                  {opportunity}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Talk Time & Engagement */}
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4">Conversation Analysis</h3>
                      <div className="bg-slate-800/30 rounded-lg p-6 space-y-4">
                        {/* Talk Time Distribution */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-3">Talk Time</h4>
                          {Object.entries(data.metrics.talkTimeDistribution).map(([speaker, percentage]) => (
                            <div key={speaker} className="space-y-1 mb-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-300">{speaker}</span>
                                <span className="text-slate-400">{percentage}%</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Additional Metrics */}
                        <div className="pt-4 border-t border-slate-700 space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-400">Questions Asked</span>
                            <span className="text-sm text-white">{data.metrics.questionsAsked}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-400">Interruptions</span>
                            <span className="text-sm text-white">{data.metrics.interruptionsCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-400">Words Spoken</span>
                            <span className="text-sm text-white">{data.metrics.wordsSpoken.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-400">Sentiment Score</span>
                            <span className={`text-sm ${
                              data.metrics.sentimentScore > 0.5 ? 'text-green-400' :
                              data.metrics.sentimentScore > 0.3 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {(data.metrics.sentimentScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conversation Flow */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Conversation Flow</h3>
                    <div className="bg-slate-800/30 rounded-lg p-6">
                      <div className="grid grid-cols-4 gap-4">
                        {data.conversationFlow.phases.map((phase, index) => (
                          <div key={index} className="text-center">
                            <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  phase.sentiment > 0.6 ? 'bg-green-500' :
                                  phase.sentiment > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${phase.sentiment * 100}%` }}
                              />
                            </div>
                            <h4 className="text-sm font-medium text-white mb-1">{phase.name}</h4>
                            <p className="text-xs text-slate-400">{phase.duration}m</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Insights Tab */}
              {activeTab === 'insights' && (
                <motion.div
                  key="insights"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Filters */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search insights..."
                          className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <select
                        value={selectedInsightType}
                        onChange={(e) => setSelectedInsightType(e.target.value)}
                        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Types</option>
                        <option value="opportunity">Opportunities</option>
                        <option value="concern">Concerns</option>
                        <option value="decision_factor">Decision Factors</option>
                        <option value="competitor">Competitors</option>
                        <option value="timeline">Timeline</option>
                      </select>
                    </div>
                    
                    <div className="text-sm text-slate-400">
                      {filteredInsights.length} of {data.insights.length} insights
                    </div>
                  </div>

                  {/* Insights Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {filteredInsights.map((insight) => (
                      <motion.div
                        key={insight.id}
                        className="bg-slate-800/30 rounded-lg p-4 hover:bg-slate-800/50 transition-colors"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            insight.type === 'opportunity' ? 'bg-green-500/20 text-green-300' :
                            insight.type === 'concern' ? 'bg-red-500/20 text-red-300' :
                            insight.type === 'decision_factor' ? 'bg-blue-500/20 text-blue-300' :
                            insight.type === 'competitor' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-purple-500/20 text-purple-300'
                          }`}>
                            {insight.type.replace('_', ' ')}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <div className={`px-2 py-1 rounded text-xs ${
                              insight.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                              insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {insight.impact} impact
                            </div>
                            <span className="text-xs text-slate-500">
                              {insight.confidence}%
                            </span>
                          </div>
                        </div>
                        
                        <h4 className="font-medium text-white mb-2">{insight.title}</h4>
                        <p className="text-sm text-slate-300 mb-3">{insight.description}</p>
                        
                        {insight.relatedQuotes.length > 0 && (
                          <div className="border-t border-slate-700 pt-3">
                            <h5 className="text-xs text-slate-400 mb-2">Related Quotes:</h5>
                            <div className="space-y-1">
                              {insight.relatedQuotes.slice(0, 2).map((quote, index) => (
                                <blockquote key={index} className="text-xs text-slate-500 italic border-l-2 border-slate-600 pl-2">
                                  "{quote}"
                                </blockquote>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Action Items Tab */}
              {activeTab === 'actions' && (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Action Items</h3>
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                        <Send className="w-4 h-4 mr-2 inline" />
                        Send to CRM
                      </button>
                    </div>
                  </div>

                  {/* Priority Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    {['high', 'medium', 'low'].map(priority => {
                      const count = data.actionItems.filter(item => item.priority === priority).length;
                      return (
                        <div key={priority} className={`rounded-lg p-4 border ${getPriorityColor(priority)}`}>
                          <div className="text-2xl font-bold mb-1">{count}</div>
                          <div className="text-sm capitalize">{priority} Priority</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Items List */}
                  <div className="space-y-3">
                    {data.actionItems.map((item) => (
                      <div key={item.id} className="bg-slate-800/30 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </div>
                              <div className="text-xs text-slate-400 px-2 py-1 bg-slate-700/50 rounded">
                                {item.category.replace('_', ' ')}
                              </div>
                              {item.dueDate && (
                                <div className="flex items-center space-x-1 text-xs text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  <span>{item.dueDate.toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            
                            <h4 className="font-medium text-white mb-1">{item.title}</h4>
                            <p className="text-sm text-slate-300 mb-2">{item.description}</p>
                            
                            <div className="flex items-center space-x-4 text-xs text-slate-400">
                              <div className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{item.assignee}</span>
                              </div>
                              <div className={`px-2 py-1 rounded ${
                                item.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                                item.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' :
                                'bg-slate-500/20 text-slate-300'
                              }`}>
                                {item.status.replace('_', ' ')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <button className="p-2 hover:bg-slate-700 rounded transition-colors">
                              <ExternalLink className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Transcript Tab */}
              {activeTab === 'transcript' && (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Meeting Transcript</h3>
                    <div className="flex items-center space-x-2">
                      {data.recording && (
                        <button className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors">
                          <Volume2 className="w-4 h-4" />
                          <span>Play Recording</span>
                        </button>
                      )}
                      <button
                        onClick={() => data.transcript && handleCopy(data.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n'))}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                      >
                        <Copy className="w-4 h-4 mr-2 inline" />
                        Copy All
                      </button>
                    </div>
                  </div>

                  {data.transcript ? (
                    <div className="bg-slate-800/30 rounded-lg">
                      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
                        {data.transcript.map((segment, index) => (
                          <div key={index} className="flex space-x-3">
                            <div className="flex-shrink-0 w-16 text-xs text-slate-400 pt-1">
                              {segment.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-300 mb-1">{segment.speaker}</div>
                              <div className="text-slate-200">{segment.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-800/30 rounded-lg p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">No transcript available</p>
                      <p className="text-sm text-slate-500 mt-1">Transcript may still be processing</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-slate-400">
                  Generated at {new Date().toLocaleString()}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onSaveToCRM && onSaveToCRM(data)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save to CRM</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};