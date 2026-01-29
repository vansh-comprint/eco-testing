/**
 * ReviewHistory Component
 * Displays audit trail/history for review actions on an entity
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  History,
  ChevronDown,
  ChevronUp,
  User,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAuditHistory,
  formatAuditAction,
  getAuditActionColor,
} from '@/hooks/useAuditLogs';
import type { AuditLog } from '@/hooks/useAuditLogs';

// Entity type mapping for display
const entityTypeLabels: Record<string, string> = {
  application: 'Application',
  asset: 'Asset',
  batch: 'Batch',
  pickup: 'Pickup',
  enterprise: 'Enterprise',
  review: 'Review',
  facility_qc: 'Facility QC',
  document: 'Document',
  dispute: 'Dispute',
};

// Action icons
const actionIcons: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="w-4 h-4" />,
  accepted: <CheckCircle className="w-4 h-4" />,
  completed: <CheckCircle className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  requested: <Clock className="w-4 h-4" />,
  assigned: <Truck className="w-4 h-4" />,
  reassigned: <Truck className="w-4 h-4" />,
  reviewed: <FileText className="w-4 h-4" />,
  updated: <FileText className="w-4 h-4" />,
};

function getActionIcon(action: string): React.ReactNode {
  for (const [key, icon] of Object.entries(actionIcons)) {
    if (action.toLowerCase().includes(key)) {
      return icon;
    }
  }
  return <AlertCircle className="w-4 h-4" />;
}

interface ReviewHistoryProps {
  entityType: string;
  entityId: string;
  title?: string;
  maxItems?: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export const ReviewHistory: React.FC<ReviewHistoryProps> = ({
  entityType,
  entityId,
  title = 'Review History',
  maxItems,
  collapsible = true,
  defaultExpanded = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { data: history = [], isLoading, error } = useAuditHistory(entityType, entityId);

  const displayedHistory = maxItems ? history.slice(0, maxItems) : history;

  if (error) {
    return (
      <div className={cn('border border-red-200 dark:border-red-500/20 rounded-lg p-4', className)}>
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load history</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        className={cn(
          'w-full px-4 py-3 flex items-center justify-between',
          'bg-slate-50 dark:bg-white/[0.02]',
          collapsible && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors'
        )}
        disabled={!collapsible}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500 dark:text-white/50" />
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-white/70 uppercase tracking-widest">
            {title}
          </span>
          {history.length > 0 && (
            <span className="px-2 py-0.5 bg-slate-200 dark:bg-white/10 rounded-full text-[10px] font-mono text-slate-600 dark:text-white/60">
              {history.length}
            </span>
          )}
        </div>
        {collapsible && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/40" />
          </motion.div>
        )}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {(isExpanded || !collapsible) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 border-t border-slate-200 dark:border-white/10">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-3/4" />
                        <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayedHistory.length === 0 ? (
                <div className="text-center py-6">
                  <History className="w-8 h-8 text-slate-300 dark:text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-white/40">No history available</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {displayedHistory.map((log, index) => (
                    <HistoryItem key={log.id} log={log} index={index} />
                  ))}
                  {maxItems && history.length > maxItems && (
                    <div className="pt-2 text-center">
                      <span className="text-xs text-slate-500 dark:text-white/40">
                        +{history.length - maxItems} more entries
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface HistoryItemProps {
  log: AuditLog;
  index: number;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ log, index }) => {
  const [showDetails, setShowDetails] = useState(false);
  const formattedAction = formatAuditAction(log.action);
  const actionColor = getAuditActionColor(log.action);
  const logDate = new Date(log.created_at);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group"
    >
      <div
        className={cn(
          'flex items-start gap-3 p-2 rounded-lg',
          'hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors',
          showDetails && 'bg-slate-50 dark:bg-white/[0.02]'
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
            'bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10',
            actionColor
          )}
        >
          {getActionIcon(log.action)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-sm font-medium', actionColor)}>
              {formattedAction}
            </span>
            {log.from_status && log.to_status && (
              <span className="text-xs text-slate-400 dark:text-white/40">
                {log.from_status} → {log.to_status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-white/50">
            {log.actor && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {log.actor.name}
              </span>
            )}
            <span className="text-slate-400 dark:text-white/30">
              {formatDistanceToNow(logDate, { addSuffix: true })}
            </span>
          </div>

          {/* Metadata preview */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="mt-1 text-xs text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/60 flex items-center gap-1"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
          )}

          {/* Expanded details */}
          <AnimatePresence>
            {showDetails && log.metadata && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className="p-2 bg-slate-100 dark:bg-white/[0.03] rounded border border-slate-200 dark:border-white/10">
                  <MetadataDisplay metadata={log.metadata} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Timestamp */}
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-slate-400 dark:text-white/30 tabular-nums">
            {format(logDate, 'MMM d, yyyy')}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-white/30 tabular-nums">
            {format(logDate, 'HH:mm:ss')}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

interface MetadataDisplayProps {
  metadata: Record<string, unknown>;
}

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ metadata }) => {
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="space-y-1">
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="flex justify-between gap-4 text-xs">
          <span className="text-slate-500 dark:text-white/50">{formatKey(key)}:</span>
          <span className="text-slate-700 dark:text-white/70 text-right truncate max-w-[200px]">
            {formatValue(value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ReviewHistory;
