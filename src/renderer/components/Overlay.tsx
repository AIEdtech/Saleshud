/**
 * SalesHud Overlay Component
 * Sophisticated overlay with search, CRM, and notes panels
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Minimize2, 
  Maximize2, 
  Move, 
  Users, 
  Building2, 
  Phone, 
  Mail, 
  Calendar,
  MessageSquare,
  FileText,
  Lightbulb,
  TrendingUp,
  Clock,
  Mic,
  MicOff,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Grip
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  phone?: string;
  lastContact?: Date;
  dealValue?: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed';
  notes: string;
}

interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  confidence: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface AIInsight {
  id: string;
  type: 'question' | 'objection' | 'opportunity' | 'action' | 'concern';
  title: string;
  description: string;
  suggestion: string;
  confidence: number;
  timestamp: Date;
}

interface OverlayProps {
  isVisible: boolean;
  onToggle: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  transcript: TranscriptSegment[];
  contacts: Contact[];
  insights: AIInsight[];
  onContactSelect: (contactId: string) => void;
  onNotesUpdate: (notes: string) => void;
}

type PanelType = 'search' | 'crm' | 'notes' | 'insights';
type CRMTab = 'contacts' | 'companies' | 'deals' | 'tasks';

export const Overlay: React.FC<OverlayProps> = ({
  isVisible,
  onToggle,
  isRecording,
  onToggleRecording,
  transcript = [],
  contacts = [],
  insights = [],
  onContactSelect,
  onNotesUpdate
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<CRMTab>('contacts');
  const [notes, setNotes] = useState('');
  const [minimizedPanels, setMinimizedPanels] = useState<Set<PanelType>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [clickThrough, setClickThrough] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [panelSizes, setPanelSizes] = useState({
    search: { width: 400, height: 60 },
    crm: { width: 320, height: 500 },
    notes: { width: 380, height: 500 }
  });

  // Refs
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, contacts]);

  // Panel management
  const togglePanel = useCallback((panel: PanelType) => {
    setMinimizedPanels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(panel)) {
        newSet.delete(panel);
      } else {
        newSet.add(panel);
      }
      return newSet;
    });
  }, []);

  // Contact selection
  const handleContactSelect = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    onContactSelect(contact.id);
    setSearchQuery('');
  }, [onContactSelect]);

  // Notes handling
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    onNotesUpdate(value);
  }, [onNotesUpdate]);

  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (clickThrough) return;
    setIsDragging(true);
    e.preventDefault();
  }, [clickThrough]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY
    }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'f':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'r':
            e.preventDefault();
            onToggleRecording();
            break;
          case 'h':
            e.preventDefault();
            onToggle();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onToggle, onToggleRecording]);

  if (!isVisible) return null;

  return (
    <motion.div
      ref={overlayRef}
      className={`fixed inset-0 z-50 pointer-events-none ${clickThrough ? 'pointer-events-none' : 'pointer-events-auto'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Search Bar */}
      <motion.div
        className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto"
        style={{
          transform: `translate(${position.x - 200}px, ${position.y}px)`
        }}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <div className="glass rounded-xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/40 shadow-2xl">
          {!minimizedPanels.has('search') ? (
            <div className="flex items-center space-x-3 p-4" style={{ width: panelSizes.search.width }}>
              {/* Drag Handle */}
              <div
                ref={dragRef}
                onMouseDown={handleMouseDown}
                className="cursor-move p-1 hover:bg-slate-700/50 rounded transition-colors"
              >
                <Grip className="w-4 h-4 text-slate-400" />
              </div>

              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts, companies..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
                
                {/* Search Results Dropdown */}
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      className="absolute top-full left-0 right-0 mt-2 bg-slate-800/90 backdrop-blur-xl rounded-lg border border-slate-600/50 shadow-2xl max-h-64 overflow-y-auto z-10"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      {searchResults.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => handleContactSelect(contact)}
                          className="p-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-600/30 last:border-b-0"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {contact.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{contact.name}</p>
                              <p className="text-xs text-slate-400 truncate">{contact.company} • {contact.title}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Recording Button */}
              <button
                onClick={onToggleRecording}
                className={`p-2 rounded-lg transition-all ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300'
                }`}
              >
                {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              {/* Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setClickThrough(!clickThrough)}
                  className="p-1.5 hover:bg-slate-700/50 rounded transition-colors"
                  title={clickThrough ? "Enable interactions" : "Enable click-through"}
                >
                  {clickThrough ? <Eye className="w-3.5 h-3.5 text-slate-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                <button
                  onClick={() => togglePanel('search')}
                  className="p-1.5 hover:bg-slate-700/50 rounded transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  onClick={onToggle}
                  className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2">
              <button
                onClick={() => togglePanel('search')}
                className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded transition-colors"
              >
                <Search className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">Search</span>
                <Maximize2 className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Left CRM Panel */}
      <motion.div
        className="absolute top-20 left-4 pointer-events-auto"
        style={{
          transform: `translate(${position.x - 100}px, ${position.y + 100}px)`
        }}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="glass rounded-xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/40 shadow-2xl">
          {!minimizedPanels.has('crm') ? (
            <div style={{ width: panelSizes.crm.width, height: panelSizes.crm.height }}>
              {/* CRM Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-600/30">
                <h3 className="text-lg font-semibold text-white">CRM</h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => togglePanel('crm')}
                    className="p-1.5 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* CRM Tabs */}
              <div className="flex border-b border-slate-600/30">
                {[
                  { id: 'contacts', label: 'Contacts', icon: Users },
                  { id: 'companies', label: 'Companies', icon: Building2 },
                  { id: 'deals', label: 'Deals', icon: TrendingUp },
                  { id: 'tasks', label: 'Tasks', icon: FileText }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as CRMTab)}
                      className={`flex-1 flex items-center justify-center space-x-1 py-3 text-xs font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* CRM Content */}
              <div className="flex-1 overflow-y-auto p-4" style={{ height: panelSizes.crm.height - 120 }}>
                {activeTab === 'contacts' && (
                  <div className="space-y-3">
                    {selectedContact && (
                      <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              {selectedContact.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-white text-sm">{selectedContact.name}</h4>
                              <p className="text-xs text-slate-400">{selectedContact.title}</p>
                              <p className="text-xs text-slate-400">{selectedContact.company}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <a
                            href={`mailto:${selectedContact.email}`}
                            className="flex items-center space-x-2 p-2 bg-slate-700/30 rounded text-xs text-slate-300 hover:bg-slate-600/30 transition-colors"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Email</span>
                          </a>
                          {selectedContact.phone && (
                            <a
                              href={`tel:${selectedContact.phone}`}
                              className="flex items-center space-x-2 p-2 bg-slate-700/30 rounded text-xs text-slate-300 hover:bg-slate-600/30 transition-colors"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Call</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-1 rounded-full ${
                            selectedContact.stage === 'closed' ? 'bg-green-500/20 text-green-300' :
                            selectedContact.stage === 'negotiation' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {selectedContact.stage}
                          </span>
                          {selectedContact.dealValue && (
                            <span className="text-slate-300 font-medium">
                              ${selectedContact.dealValue.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {contacts.slice(0, 8).map((contact) => (
                      <div
                        key={contact.id}
                        onClick={() => handleContactSelect(contact)}
                        className="p-3 bg-slate-800/30 rounded-lg border border-slate-600/20 hover:border-slate-500/40 cursor-pointer transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {contact.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{contact.name}</p>
                            <p className="text-xs text-slate-400 truncate">{contact.company}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'companies' && (
                  <div className="space-y-3">
                    <div className="text-center text-slate-400 text-sm py-8">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Companies view coming soon
                    </div>
                  </div>
                )}

                {activeTab === 'deals' && (
                  <div className="space-y-3">
                    <div className="text-center text-slate-400 text-sm py-8">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Deals pipeline coming soon
                    </div>
                  </div>
                )}

                {activeTab === 'tasks' && (
                  <div className="space-y-3">
                    <div className="text-center text-slate-400 text-sm py-8">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Task management coming soon
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3">
              <button
                onClick={() => togglePanel('crm')}
                className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded transition-colors"
              >
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">CRM</span>
                <Maximize2 className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Right Notes/Transcript Panel */}
      <motion.div
        className="absolute top-20 right-4 pointer-events-auto"
        style={{
          transform: `translate(${position.x + 100}px, ${position.y + 100}px)`
        }}
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="glass rounded-xl border border-slate-700/50 backdrop-blur-xl bg-slate-900/40 shadow-2xl">
          {!minimizedPanels.has('notes') ? (
            <div style={{ width: panelSizes.notes.width, height: panelSizes.notes.height }}>
              {/* Notes Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-600/30">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-white">Transcript & Notes</h3>
                  {isRecording && (
                    <div className="flex items-center space-x-1 text-xs text-red-400">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span>Recording</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => togglePanel('notes')}
                    className="p-1.5 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Transcript Section */}
              <div className="flex-1 flex flex-col" style={{ height: panelSizes.notes.height - 60 }}>
                <div className="flex-1 overflow-y-auto p-4 border-b border-slate-600/30">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Live Transcript</h4>
                    {transcript.length > 0 ? (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {transcript.slice(-10).map((segment) => (
                          <div key={segment.id} className="p-2 bg-slate-800/30 rounded text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-300">{segment.speaker}</span>
                              <span className="text-slate-500">
                                {segment.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-slate-200">{segment.text}</p>
                            {segment.sentiment && (
                              <div className={`inline-block px-1.5 py-0.5 rounded mt-1 text-xs ${
                                segment.sentiment === 'positive' ? 'bg-green-500/20 text-green-300' :
                                segment.sentiment === 'negative' ? 'bg-red-500/20 text-red-300' :
                                'bg-gray-500/20 text-gray-300'
                              }`}>
                                {segment.sentiment}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-4">
                        <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No transcript available</p>
                        <p className="text-xs">Start recording to see live transcript</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Insights Section */}
                {insights.length > 0 && (
                  <div className="p-4 border-b border-slate-600/30">
                    <div className="flex items-center space-x-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                      <h4 className="text-sm font-medium text-slate-300">AI Insights</h4>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {insights.slice(-3).map((insight) => (
                        <div key={insight.id} className="p-2 bg-slate-800/40 rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <div className={`px-2 py-0.5 rounded text-xs ${
                              insight.type === 'opportunity' ? 'bg-green-500/20 text-green-300' :
                              insight.type === 'objection' ? 'bg-red-500/20 text-red-300' :
                              insight.type === 'question' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}>
                              {insight.type}
                            </div>
                            <span className="text-xs text-slate-500">
                              {Math.round(insight.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 mb-1">{insight.title}</p>
                          <p className="text-xs text-slate-400">{insight.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                <div className="p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Meeting Notes</h4>
                  <textarea
                    ref={notesRef}
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Add your notes here..."
                    className="w-full h-24 p-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3">
              <button
                onClick={() => togglePanel('notes')}
                className="flex items-center space-x-2 p-2 hover:bg-slate-700/50 rounded transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">Notes</span>
                <Maximize2 className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Actions Floating Button */}
      <motion.div
        className="absolute bottom-6 right-6 pointer-events-auto"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <button
          onClick={() => {
            // Quick actions menu
          }}
          className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <Settings className="w-5 h-5 text-white" />
        </button>
      </motion.div>
    </motion.div>
  );
};