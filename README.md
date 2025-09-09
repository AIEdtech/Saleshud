# SalesHud - AI-Powered Sales Intelligence

## Overview

SalesHud is an advanced Electron application that provides real-time AI-powered sales intelligence during video calls. It features a transparent overlay that doesn't obstruct meeting platforms while delivering transcription, insights, and automated follow-up capabilities.

## Key Features

- **Real-time Speech Transcription** - Live conversation capture with speaker identification using Deepgram Nova-3
- **AI-Powered Analysis** - Intelligent conversation insights, buying signals, and objection detection via Claude Sonnet 4.0
- **Smart Email Generation** - Context-aware proposal creation based on meeting content
- **Intelligent Follow-up Scheduling** - AI-recommended meeting types and optimal timing
- **Meeting Summaries** - Comprehensive analysis with action items and deal health scoring
- **CRM Integration** - Zapier webhooks for Salesforce, HubSpot
- **Non-intrusive Overlay** - Peripheral UI design that keeps video calls unobstructed

## Prerequisites

- **Node.js** 18.0.0 or later
- **macOS** 10.15+ (primary target platform)
- **VS Code** with Claude Dev extension
- **API Accounts**: Deepgram, Claude (Anthropic), Supabase

## Quick Start

### 1. Project Setup
```bash
# Navigate to project directory
cd saleshud-app

# Install dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys
VITE_DEEPGRAM_API_KEY=your_deepgram_key_here
VITE_CLAUDE_API_KEY=your_claude_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. Development
```bash
# Start development server
npm run dev

# The app will launch with:
# - Main dashboard at http://localhost:5173
# - Overlay window positioned on screen edge
# - Hot reload enabled for all changes
```

## API Keys Setup

### Deepgram (Transcription)
1. Sign up at https://console.deepgram.com/
2. Get $200 free credit
3. Copy API key to `VITE_DEEPGRAM_API_KEY`

### Claude API (AI Analysis)
1. Create account at https://console.anthropic.com/
2. Add payment method (minimum $5)
3. Generate API key for `VITE_CLAUDE_API_KEY`

### Supabase (Database)
1. Create project at https://supabase.com/dashboard
2. Execute the provided SQL schema
3. Copy URL and anon key to environment

## Project Structure

```
saleshud-app/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Main application logic
│   │   └── preload.ts       # IPC communication bridge
│   ├── renderer/            # React frontend
│   │   ├── App.tsx          # Main dashboard interface
│   │   └── components/      # UI components
│   │       ├── Overlay.tsx  # Main overlay interface
│   │       ├── EmailPreview.tsx
│   │       ├── SchedulingModal.tsx
│   │       └── SummaryModal.tsx
│   ├── services/            # Backend services
│   │   ├── DeepgramService.ts    # Real-time transcription
│   │   ├── ClaudeService.ts      # AI analysis
│   │   ├── SupabaseService.ts    # Database operations
│   │   ├── MeetingManager.ts     # Service orchestration
│   │   ├── EmailService.ts       # Email generation
│   │   └── SchedulingService.ts  # Calendar integration
│   ├── types/               # TypeScript definitions
│   │   └── index.ts         # All interface definitions
│   └── utils/               # Helper functions
├── assets/                  # Icons and images
│   ├── icons/              # App icons (all sizes)
│   ├── images/             # Logos and graphics
│   └── branding/           # Brand assets
├── supabase/               # Database configuration
│   └── functions/          # Edge functions
└── dist/                   # Built application files
```

## Development Commands

```bash
# Development
npm run dev              # Start with hot reload
npm run type-check       # TypeScript validation
npm run lint             # Code quality check
npm run lint:fix         # Auto-fix linting issues

# Building
npm run build            # Production build
npm run dist             # Create macOS DMG installer
npm run dist:mac         # macOS specific build

# Testing
npm test                 # Run test suite
npm run test:e2e         # End-to-end tests
```

## Overlay Interface

### Layout Design
```
Top: Minimizable search bar (center, 400px)
Left: CRM panel (320px) - Prospect/Company tabs
Right: Notes panel (380px) - Transcript/AI insights
Bottom: Status bar - Meeting timer and info
```

### Key Components
- **Search Bar**: Universal search with AI suggestions
- **CRM Panel**: Live prospect data, pain points, deal info
- **Transcript Panel**: Real-time conversation with speaker ID
- **AI Insights**: Color-coded suggestions (red=urgent, orange=important, blue=info)
- **Smart Notes**: Auto-generated key facts and action items

## Database Schema

### Core Tables
- `meeting_sessions` - Meeting metadata and participants
- `meeting_transcripts` - Real-time conversation data
- `meeting_insights` - AI-generated analysis
- `meeting_notes` - Manual and auto-generated notes
- `generated_emails` - AI-created proposals
- `follow_up_events` - Scheduled meetings
- `deal_context` - CRM integration data

## API Integration

### Deepgram Configuration
```typescript
Model: nova-3 (highest accuracy)
Language: en-US
Features: Speaker diarization, sentiment analysis
Connection: WebSocket for real-time streaming
```

### Claude AI Features
- Conversation analysis and coaching
- Buying signal detection
- Objection handling suggestions
- Email proposal generation
- Meeting summarization

### Supabase Setup
- Real-time subscriptions for live updates
- Row Level Security for data protection
- Edge functions for webhook processing
- Automatic backups and scaling

## CRM Integration (Zapier)

### Supported Platforms
- **Salesforce**: Contacts, Opportunities, Tasks
- **HubSpot**: Contacts, Deals, Companies

### Webhook Configuration
```
Trigger: New/Updated record in CRM
Action: POST to Supabase edge function
URL: https://your-project.supabase.co/crm-webhook
Data: Contact info, deal details, company data
```

## Building for Distribution

### macOS DMG Creation
```bash
# Build production version
npm run build

# Create signed DMG (requires certificates)
npm run dist:mac

# Output: dist/SalesHud-1.0.0-beta.dmg
```

### Distribution Structure
```
SalesHud-Beta/
├── SalesHud-1.0.0-beta.dmg
├── Setup-Instructions.md
├── Beta-Testing-Guide.md
└── Release-Notes.md
```

## Troubleshooting

### Common Issues

**App Won't Start**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Overlay Not Visible**
- Grant screen recording permission in macOS System Preferences
- Check Security & Privacy → Screen Recording → SalesHud

**No Audio Transcription**
- Verify microphone permissions granted
- Test Deepgram API key with curl command
- Check audio device selection in app settings

**TypeScript Errors**
```bash
# Check configuration
npx tsc --noEmit

# Update TypeScript
npm install -D typescript@latest
```

**Build Failures**
```bash
# Install Xcode command line tools
xcode-select --install

# Check Python version for node-gyp
python3 --version
```

### Debug Mode
```bash
# Enable detailed logging
export DEBUG=saleshud:*
export NODE_ENV=development
npm run dev
```

### Log Locations
- **Application Logs**: `~/Library/Application Support/SalesHud/logs/`
- **Crash Reports**: `~/Library/Application Support/SalesHud/crashes/`
- **Settings**: `~/Library/Application Support/SalesHud/config/`

## Permissions (macOS)

### Required Permissions
1. **Microphone Access** - For real-time transcription
2. **Screen Recording** - For overlay display
3. **Accessibility** - For global hotkeys (optional)

### Grant Permissions
System Preferences → Security & Privacy → Privacy:
- Add SalesHud to Microphone
- Add SalesHud to Screen Recording

## Performance Optimization

### Resource Usage
- **Memory**: ~200-400MB typical usage
- **CPU**: <10% during active transcription
- **Network**: Minimal except during API calls
- **Battery**: Optimized for MacBook usage

### Optimization Tips
- Close unused browser tabs during meetings
- Use wired internet connection for best transcription
- Position overlay on secondary monitor if available

## Security

### Data Protection
- API keys encrypted using Electron safeStorage
- Local data stored with user permissions
- No sensitive data transmitted unnecessarily
- HTTPS/WSS for all external connections

### Privacy
- Audio processed in real-time, not stored locally
- Transcripts saved only if user enables
- User controls all data retention policies

## Contributing

### Development Workflow
1. Follow TypeScript strict mode
2. Use Prettier for code formatting
3. Test on macOS before submitting
4. Update documentation for new features

### Code Standards
- Use semantic commit messages
- Maintain test coverage above 80%
- Follow React and Electron best practices
- Document all public APIs

## License

Proprietary Software - All Rights Reserved

## Version History

### v1.0.0-beta
- Initial release with core overlay functionality
- Real-time transcription and AI insights
- Email generation and scheduling
- CRM integration via Zapier

---

**SalesHud v1.0.0-beta** - Built with Electron, React, TypeScript, and AI