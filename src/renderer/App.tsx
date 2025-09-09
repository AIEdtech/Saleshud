/**
 * SalesHud Main Application
 * Professional dashboard interface with glassmorphism design
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';

// TypeScript interfaces for the application
interface MeetingSession {
  id: string;
  title: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  platform: string;
  startTime: Date;
  duration?: number;
  participants: number;
  transcriptCount: number;
  insightCount: number;
  qualityScore: number;
}

interface ApiConfig {
  deepgram: string;
  claude: string;
  supabase: {
    url: string;
    anonKey: string;
  };
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
}

interface AppState {
  isLoading: boolean;
  activeMeeting: MeetingSession | null;
  recentMeetings: MeetingSession[];
  userProfile: UserProfile | null;
  apiConfig: ApiConfig;
  showSettings: boolean;
  showHistory: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  error: string | null;
}

interface LiveTranscript {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  confidence: number;
}

interface MeetingMetrics {
  totalMeetings: number;
  averageDuration: number;
  totalInsights: number;
  averageScore: number;
  thisWeek: {
    meetings: number;
    insights: number;
  };
  thisMonth: {
    meetings: number;
    insights: number;
  };
}

// Header Component
const Header: React.FC<{
  userProfile: UserProfile | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  onSettingsClick: () => void;
  onHistoryClick: () => void;
}> = ({ userProfile, connectionStatus, onSettingsClick, onHistoryClick }) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'disconnected': return 'bg-red-500';
    }
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              SalesHud
            </h1>
            <p className="text-sm text-slate-400">AI Sales Intelligence</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-sm text-slate-300 capitalize">{connectionStatus}</span>
        </div>

        {/* Navigation and User */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onHistoryClick}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
            title="Meeting History"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          <button
            onClick={onSettingsClick}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {userProfile && (
            <div className="flex items-center space-x-3 ml-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{userProfile.name}</p>
                <p className="text-xs text-slate-400 capitalize">{userProfile.plan} Plan</p>
              </div>
              {userProfile.avatar ? (
                <img src={userProfile.avatar} alt="Profile" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-sm text-white font-medium">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Metrics Card Component
const MetricsCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}> = ({ title, value, subtitle, icon, trend }) => (
  <div className="bg-slate-800/40 backdrop-blur-lg border border-slate-700/50 rounded-xl p-6 hover:bg-slate-800/60 transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center space-x-1 text-sm ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
          <svg className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span>{Math.abs(trend.value)}%</span>
        </div>
      )}
    </div>
    <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
    <p className="text-slate-400 text-sm">{title}</p>
    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

// Active Meeting Component
const ActiveMeetingCard: React.FC<{
  meeting: MeetingSession | null;
  liveTranscript: LiveTranscript[];
  onStartMeeting: () => void;
  onStopMeeting: () => void;
}> = ({ meeting, liveTranscript, onStartMeeting, onStopMeeting }) => {
  if (!meeting) {
    return (
      <div className="bg-slate-800/40 backdrop-blur-lg border border-slate-700/50 rounded-xl p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Active Meeting</h3>
          <p className="text-slate-400 mb-6">Start a new meeting to begin real-time transcription and AI insights</p>
          <button
            onClick={onStartMeeting}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
          >
            Start New Meeting
          </button>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800/40 backdrop-blur-lg border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{meeting.title}</h3>
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </span>
            <span>{formatDuration(meeting.duration || 0)}</span>
            <span>{meeting.participants} participants</span>
            <span className="capitalize">{meeting.platform}</span>
          </div>
        </div>
        <button
          onClick={onStopMeeting}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
        >
          Stop Meeting
        </button>
      </div>

      {/* Meeting Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{meeting.transcriptCount}</div>
          <div className="text-xs text-slate-400">Transcripts</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{meeting.insightCount}</div>
          <div className="text-xs text-slate-400">Insights</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{meeting.qualityScore}%</div>
          <div className="text-xs text-slate-400">Quality</div>
        </div>
      </div>

      {/* Live Transcript */}
      <div className="border-t border-slate-700/50 pt-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">Live Transcript</h4>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {liveTranscript.length > 0 ? (
            liveTranscript.slice(-5).map((entry) => (
              <div key={entry.id} className="text-sm">
                <span className="text-blue-400 font-medium">{entry.speaker}:</span>
                <span className="text-slate-300 ml-2">{entry.text}</span>
                <span className="text-xs text-slate-500 ml-2">({entry.confidence}%)</span>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-sm italic">Waiting for audio input...</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Settings Modal Component
const SettingsModal: React.FC<{
  isOpen: boolean;
  apiConfig: ApiConfig;
  onClose: () => void;
  onSave: (config: ApiConfig) => void;
  onTest: (service: string) => Promise<boolean>;
}> = ({ isOpen, apiConfig, onClose, onSave, onTest }) => {
  const [config, setConfig] = useState<ApiConfig>(apiConfig);
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});
  const [testResults, setTestResults] = useState<{ [key: string]: boolean | null }>({});

  useEffect(() => {
    setConfig(apiConfig);
  }, [apiConfig]);

  const handleTest = async (service: string) => {
    setTesting({ ...testing, [service]: true });
    try {
      const result = await onTest(service);
      setTestResults({ ...testResults, [service]: result });
    } catch (error) {
      setTestResults({ ...testResults, [service]: false });
    }
    setTesting({ ...testing, [service]: false });
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Deepgram Configuration */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Deepgram API Key
            </label>
            <div className="flex space-x-2">
              <input
                type="password"
                value={config.deepgram}
                onChange={(e) => setConfig({ ...config, deepgram: e.target.value })}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Deepgram API key"
              />
              <button
                onClick={() => handleTest('deepgram')}
                disabled={testing.deepgram || !config.deepgram}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                {testing.deepgram ? 'Testing...' : 'Test'}
              </button>
            </div>
            {testResults.deepgram !== null && (
              <p className={`text-sm mt-1 ${testResults.deepgram ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.deepgram ? '✓ Connection successful' : '✗ Connection failed'}
              </p>
            )}
          </div>

          {/* Claude Configuration */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Claude API Key
            </label>
            <div className="flex space-x-2">
              <input
                type="password"
                value={config.claude}
                onChange={(e) => setConfig({ ...config, claude: e.target.value })}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Claude API key"
              />
              <button
                onClick={() => handleTest('claude')}
                disabled={testing.claude || !config.claude}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                {testing.claude ? 'Testing...' : 'Test'}
              </button>
            </div>
            {testResults.claude !== null && (
              <p className={`text-sm mt-1 ${testResults.claude ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.claude ? '✓ Connection successful' : '✗ Connection failed'}
              </p>
            )}
          </div>

          {/* Supabase Configuration */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Supabase URL
            </label>
            <input
              type="text"
              value={config.supabase.url}
              onChange={(e) => setConfig({ 
                ...config, 
                supabase: { ...config.supabase, url: e.target.value } 
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://your-project.supabase.co"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Supabase Anon Key
            </label>
            <div className="flex space-x-2">
              <input
                type="password"
                value={config.supabase.anonKey}
                onChange={(e) => setConfig({ 
                  ...config, 
                  supabase: { ...config.supabase, anonKey: e.target.value } 
                })}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Supabase anon key"
              />
              <button
                onClick={() => handleTest('supabase')}
                disabled={testing.supabase || !config.supabase.url || !config.supabase.anonKey}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                {testing.supabase ? 'Testing...' : 'Test'}
              </button>
            </div>
            {testResults.supabase !== null && (
              <p className={`text-sm mt-1 ${testResults.supabase ? 'text-green-400' : 'text-red-400'}`}>
                {testResults.supabase ? '✓ Connection successful' : '✗ Connection failed'}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-8">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// Meeting History Component
const MeetingHistoryModal: React.FC<{
  isOpen: boolean;
  meetings: MeetingSession[];
  onClose: () => void;
  onViewMeeting: (meetingId: string) => void;
}> = ({ isOpen, meetings, onClose, onViewMeeting }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'score'>('date');

  const filteredMeetings = meetings
    .filter(meeting => {
      const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'score':
          return b.qualityScore - a.qualityScore;
        default:
          return 0;
      }
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Meeting History</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'duration' | 'score')}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">Sort by Date</option>
            <option value="duration">Sort by Duration</option>
            <option value="score">Sort by Score</option>
          </select>
        </div>

        {/* Meeting List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-slate-700/50 border border-slate-600/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-white">{meeting.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        meeting.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                        meeting.status === 'active' ? 'bg-blue-900/50 text-blue-300' :
                        meeting.status === 'scheduled' ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-red-900/50 text-red-300'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-400">
                      <span>{new Date(meeting.startTime).toLocaleDateString()} at {new Date(meeting.startTime).toLocaleTimeString()}</span>
                      <span className="capitalize">{meeting.platform}</span>
                      {meeting.duration && <span>{Math.round(meeting.duration / 60)} min</span>}
                      <span>{meeting.participants} participants</span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span className="text-slate-300">{meeting.transcriptCount} transcripts</span>
                      <span className="text-blue-400">{meeting.insightCount} insights</span>
                      <span className="text-purple-400">{meeting.qualityScore}% quality</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onViewMeeting(meeting.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
            
            {filteredMeetings.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-600/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306A7.962 7.962 0 0112 5c-2.34 0-4.29 1.009-5.824 2.562" />
                  </svg>
                </div>
                <p className="text-slate-400">No meetings found matching your criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Error Fallback Component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ error, resetErrorBoundary }) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-slate-400 mb-6">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
      >
        Try Again
      </button>
    </div>
  </div>
);

// Main App Component
const App: React.FC = () => {
  // Application state
  const [state, setState] = useState<AppState>({
    isLoading: true,
    activeMeeting: null,
    recentMeetings: [],
    userProfile: null,
    apiConfig: {
      deepgram: '',
      claude: '',
      supabase: {
        url: '',
        anonKey: ''
      }
    },
    showSettings: false,
    showHistory: false,
    connectionStatus: 'disconnected',
    error: null
  });

  const [liveTranscript, setLiveTranscript] = useState<LiveTranscript[]>([]);
  const [metrics, setMetrics] = useState<MeetingMetrics>({
    totalMeetings: 0,
    averageDuration: 0,
    totalInsights: 0,
    averageScore: 0,
    thisWeek: { meetings: 0, insights: 0 },
    thisMonth: { meetings: 0, insights: 0 }
  });

  const electronAPI = (window as any).electronAPI;
  const updateStateRef = useRef<(updates: Partial<AppState>) => void>();

  // Update state helper
  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  updateStateRef.current = updateState;

  // Initialize application
  useEffect(() => {
    const initializeApp = async () => {
      try {
        updateState({ connectionStatus: 'connecting' });

        // Load saved settings
        const savedConfig = localStorage.getItem('saleshud-config');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          updateState({ apiConfig: parsedConfig });
        }

        // Check if Electron APIs are available
        if (electronAPI) {
          // Get version info
          const version = await electronAPI.getVersion();
          console.log(`SalesHud version: ${version}`);

          // Check if user is signed in
          const userProfile = await electronAPI.data.getStoredApiKeys();
          if (userProfile) {
            updateState({
              userProfile: {
                name: 'Demo User',
                email: 'demo@saleshud.com',
                plan: 'professional'
              }
            });
          }

          updateState({ connectionStatus: 'connected' });
        } else {
          console.warn('Electron APIs not available');
          updateState({ connectionStatus: 'disconnected' });
        }

        // Load demo data
        loadDemoData();

        updateState({ isLoading: false });

      } catch (error) {
        console.error('Failed to initialize app:', error);
        updateState({ 
          isLoading: false, 
          connectionStatus: 'disconnected',
          error: 'Failed to initialize application'
        });
      }
    };

    initializeApp();
  }, [updateState]);

  // Load demo data
  const loadDemoData = () => {
    const demoMeetings: MeetingSession[] = [
      {
        id: '1',
        title: 'Enterprise Sales Discovery - TechCorp',
        status: 'completed',
        platform: 'zoom',
        startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        duration: 3600,
        participants: 3,
        transcriptCount: 42,
        insightCount: 8,
        qualityScore: 92
      },
      {
        id: '2',
        title: 'Product Demo - StartupCo',
        status: 'completed',
        platform: 'teams',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        duration: 2700,
        participants: 2,
        transcriptCount: 31,
        insightCount: 5,
        qualityScore: 87
      },
      {
        id: '3',
        title: 'Follow-up Call - BigCorp',
        status: 'scheduled',
        platform: 'meet',
        startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        duration: 0,
        participants: 4,
        transcriptCount: 0,
        insightCount: 0,
        qualityScore: 0
      }
    ];

    const demoMetrics: MeetingMetrics = {
      totalMeetings: 127,
      averageDuration: 45,
      totalInsights: 342,
      averageScore: 89,
      thisWeek: { meetings: 8, insights: 23 },
      thisMonth: { meetings: 31, insights: 89 }
    };

    updateState({ recentMeetings: demoMeetings });
    setMetrics(demoMetrics);
  };

  // Handle API testing
  const handleTestAPI = async (service: string): Promise<boolean> => {
    if (!electronAPI) {
      throw new Error('Electron APIs not available');
    }

    try {
      switch (service) {
        case 'deepgram':
          // Test Deepgram connection
          return true; // Mock success for demo
        case 'claude':
          // Test Claude connection
          return true; // Mock success for demo
        case 'supabase':
          // Test Supabase connection
          return true; // Mock success for demo
        default:
          return false;
      }
    } catch (error) {
      console.error(`Failed to test ${service}:`, error);
      return false;
    }
  };

  // Handle settings save
  const handleSaveSettings = (config: ApiConfig) => {
    updateState({ apiConfig: config });
    localStorage.setItem('saleshud-config', JSON.stringify(config));
    
    // Show success message
    updateState({ error: null });
  };

  // Handle starting a meeting
  const handleStartMeeting = async () => {
    if (!electronAPI) {
      updateState({ error: 'Electron APIs not available' });
      return;
    }

    try {
      const meetingConfig = {
        id: `meeting_${Date.now()}`,
        title: 'New Sales Call',
        meetingType: 'discovery' as const,
        platform: 'zoom' as const,
        participants: [],
        enableTranscription: true,
        enableInsights: true,
        enableRecording: false,
        autoGenerateSummary: true
      };

      const meetingId = await electronAPI.meeting.startMeetingAnalysis(meetingConfig);
      
      const newMeeting: MeetingSession = {
        id: meetingId,
        title: meetingConfig.title,
        status: 'active',
        platform: meetingConfig.platform,
        startTime: new Date(),
        duration: 0,
        participants: 1,
        transcriptCount: 0,
        insightCount: 0,
        qualityScore: 0
      };

      updateState({ activeMeeting: newMeeting });
      
      // Start transcript simulation
      simulateLiveTranscript();

    } catch (error) {
      console.error('Failed to start meeting:', error);
      updateState({ error: 'Failed to start meeting' });
    }
  };

  // Handle stopping a meeting
  const handleStopMeeting = async () => {
    if (!state.activeMeeting || !electronAPI) return;

    try {
      await electronAPI.meeting.stopMeetingAnalysis();
      
      // Add to recent meetings
      const completedMeeting = {
        ...state.activeMeeting,
        status: 'completed' as const,
        duration: Math.floor((Date.now() - state.activeMeeting.startTime.getTime()) / 1000)
      };

      updateState({
        activeMeeting: null,
        recentMeetings: [completedMeeting, ...state.recentMeetings]
      });

      setLiveTranscript([]);

    } catch (error) {
      console.error('Failed to stop meeting:', error);
      updateState({ error: 'Failed to stop meeting' });
    }
  };

  // Simulate live transcript for demo
  const simulateLiveTranscript = () => {
    const demoTranscripts = [
      { speaker: 'John Smith', text: 'Thanks for taking the time to meet with us today.' },
      { speaker: 'Sales Rep', text: 'Absolutely! I understand you\'re looking to improve your sales process efficiency.' },
      { speaker: 'John Smith', text: 'Yes, we\'re struggling with our current CRM system. It\'s slow and our team finds it difficult to use.' },
      { speaker: 'Sales Rep', text: 'That\'s a common pain point we hear. Our solution provides real-time insights and is much more user-friendly.' },
      { speaker: 'John Smith', text: 'That sounds promising. What\'s the pricing like for a team of 20?' }
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index >= demoTranscripts.length || !state.activeMeeting) {
        clearInterval(interval);
        return;
      }

      const transcript = demoTranscripts[index];
      const newEntry: LiveTranscript = {
        id: `transcript_${Date.now()}_${index}`,
        speaker: transcript.speaker,
        text: transcript.text,
        timestamp: new Date(),
        confidence: 90 + Math.floor(Math.random() * 10)
      };

      setLiveTranscript(prev => [...prev, newEntry]);
      
      // Update meeting stats
      if (updateStateRef.current && state.activeMeeting) {
        updateStateRef.current({
          activeMeeting: {
            ...state.activeMeeting,
            transcriptCount: state.activeMeeting.transcriptCount + 1,
            duration: Math.floor((Date.now() - state.activeMeeting.startTime.getTime()) / 1000)
          }
        });
      }

      index++;
    }, 3000);
  };

  // Handle viewing meeting details
  const handleViewMeeting = (meetingId: string) => {
    console.log('View meeting details:', meetingId);
    // This would navigate to a detailed meeting view
    updateState({ showHistory: false });
  };

  // Show loading screen
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Loading SalesHud</h2>
          <p className="text-slate-400">Initializing AI sales intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="min-h-screen bg-slate-900">
        <Header
          userProfile={state.userProfile}
          connectionStatus={state.connectionStatus}
          onSettingsClick={() => updateState({ showSettings: true })}
          onHistoryClick={() => updateState({ showHistory: true })}
        />

        <main className="p-6">
          {state.error && (
            <div className="mb-6 bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>{state.error}</span>
              </div>
              <button
                onClick={() => updateState({ error: null })}
                className="text-red-400 hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricsCard
              title="Total Meetings"
              value={metrics.totalMeetings}
              subtitle="All time"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              trend={{ value: 12, isPositive: true }}
            />
            
            <MetricsCard
              title="Avg Duration"
              value={`${metrics.averageDuration}min`}
              subtitle="Per meeting"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              trend={{ value: 8, isPositive: false }}
            />
            
            <MetricsCard
              title="AI Insights"
              value={metrics.totalInsights}
              subtitle="Generated"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
              trend={{ value: 24, isPositive: true }}
            />
            
            <MetricsCard
              title="Quality Score"
              value={`${metrics.averageScore}%`}
              subtitle="Average"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              }
              trend={{ value: 5, isPositive: true }}
            />
          </div>

          {/* Active Meeting and Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold text-white mb-4">Active Meeting</h2>
              <ActiveMeetingCard
                meeting={state.activeMeeting}
                liveTranscript={liveTranscript}
                onStartMeeting={handleStartMeeting}
                onStopMeeting={handleStopMeeting}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
              <div className="bg-slate-800/40 backdrop-blur-lg border border-slate-700/50 rounded-xl p-6">
                <div className="space-y-4">
                  {state.recentMeetings.slice(0, 5).map((meeting) => (
                    <div key={meeting.id} className="flex items-center justify-between py-2">
                      <div>
                        <h4 className="font-medium text-white text-sm">{meeting.title}</h4>
                        <p className="text-xs text-slate-400">
                          {new Date(meeting.startTime).toLocaleDateString()} • {meeting.platform}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-300">{meeting.qualityScore}%</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          meeting.status === 'completed' ? 'bg-green-900/50 text-green-300' :
                          meeting.status === 'active' ? 'bg-blue-900/50 text-blue-300' :
                          'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {meeting.status}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {state.recentMeetings.length === 0 && (
                    <p className="text-slate-400 text-sm italic text-center py-8">
                      No recent meetings
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Modals */}
        <SettingsModal
          isOpen={state.showSettings}
          apiConfig={state.apiConfig}
          onClose={() => updateState({ showSettings: false })}
          onSave={handleSaveSettings}
          onTest={handleTestAPI}
        />

        <MeetingHistoryModal
          isOpen={state.showHistory}
          meetings={state.recentMeetings}
          onClose={() => updateState({ showHistory: false })}
          onViewMeeting={handleViewMeeting}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;