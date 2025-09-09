/**
 * SalesHud Overlay Entry Point
 * Renders the overlay component in a separate window
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Overlay } from './components/Overlay';
import './styles/index.css';

// Get the overlay root element
const container = document.getElementById('overlay-root');
if (!container) {
  throw new Error('Overlay root element not found');
}

// Create React root and render the overlay
const root = createRoot(container);

// Default props for standalone overlay
const defaultProps = {
  isVisible: true,
  onToggle: () => {},
  isRecording: false,
  onToggleRecording: () => {},
  transcript: [],
  contacts: [],
  insights: [],
  onContactSelect: (contactId: string) => {},
  onNotesUpdate: (notes: string) => {}
};

root.render(<Overlay {...defaultProps} />);