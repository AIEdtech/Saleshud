/**
 * Status Badge Component
 * Displays status indicators with appropriate colors and animations
 */

import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'completed' | 'scheduled' | 'cancelled' | 'failed' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'md', 
  showPulse = false,
  children 
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return 'bg-green-900/50 text-green-300 border-green-700/50';
      case 'completed':
        return 'bg-blue-900/50 text-blue-300 border-blue-700/50';
      case 'scheduled':
        return 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50';
      case 'cancelled':
        return 'bg-red-900/50 text-red-300 border-red-700/50';
      case 'failed':
        return 'bg-red-900/50 text-red-300 border-red-700/50';
      case 'pending':
        return 'bg-gray-900/50 text-gray-300 border-gray-700/50';
      default:
        return 'bg-slate-900/50 text-slate-300 border-slate-700/50';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'md':
        return 'px-3 py-1 text-sm';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const getDotColor = () => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'scheduled':
        return 'bg-yellow-500';
      case 'cancelled':
        return 'bg-red-500';
      case 'failed':
        return 'bg-red-500';
      case 'pending':
        return 'bg-gray-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <span
      className={`
        inline-flex items-center space-x-2 rounded-full border font-medium
        ${getStatusStyles()} ${getSizeStyles()}
        ${showPulse && (status === 'active' || status === 'pending') ? 'animate-pulse' : ''}
      `}
    >
      <div
        className={`
          w-2 h-2 rounded-full
          ${getDotColor()}
          ${showPulse && (status === 'active' || status === 'pending') ? 'animate-ping' : ''}
        `}
      ></div>
      <span className="capitalize">{children || status}</span>
    </span>
  );
};

export default StatusBadge;