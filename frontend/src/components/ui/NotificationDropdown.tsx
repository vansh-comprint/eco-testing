import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useNotificationStore, useThemeStore } from '@/stores';
import { useAuth } from '@/hooks';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types';

const typeIcons: Record<NotificationType, string> = {
  asset_assigned: '📦',
  submission_received: '📥',
  remote_review_complete: '✅',
  dispute_submitted: '⚠️',
  dispute_resolved: '✔️',
  payout_initiated: '💰',
  payout_completed: '💵',
  reminder_checkin: '🔔',
  reminder_stalled: '⏰',
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  batch_ready: '📋',
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
};

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // V3: Use React Query hook for auth
  const { user } = useAuth();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotificationStore();

  // Fetch notifications for current user
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
    }
  }, [user?.id, fetchNotifications]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.status !== 'read') {
      markAsRead(notification.id);
    }
  };

  return (
    <div className="relative z-[200]" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'interactive p-2.5 border border-transparent transition-all relative',
          isDark
            ? 'text-zinc-600 hover:text-white hover:border-white/10 hover:bg-white/5'
            : 'text-slate-500 hover:text-slate-900 hover:border-slate-200 hover:bg-slate-100'
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-ecotribe-primary text-[10px] flex items-center justify-center text-black font-mono font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute right-0 z-[300] mt-2 w-80 sm:w-96',
              'shadow-xl overflow-hidden',
              isDark
                ? 'bg-[#0c0c0d] border border-white/10 shadow-black/50'
                : 'bg-white border border-slate-200 shadow-slate-200/50'
            )}
          >
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between px-4 py-3 border-b',
              isDark ? 'border-white/10' : 'border-slate-200'
            )}>
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  'font-display font-bold text-sm uppercase tracking-wide',
                  isDark ? 'text-white' : 'text-slate-900'
                )}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className={cn(
                    'font-mono text-[10px] font-bold px-1.5 py-0.5',
                    isDark
                      ? 'bg-ecotribe-primary/20 text-ecotribe-primary'
                      : 'bg-ecotribe-light-primary/20 text-ecotribe-light-primary'
                  )}>
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className={cn(
                      'p-1.5 transition-colors',
                      isDark
                        ? 'text-zinc-500 hover:text-ecotribe-primary hover:bg-white/5'
                        : 'text-slate-400 hover:text-ecotribe-light-primary hover:bg-slate-100'
                    )}
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'p-1.5 transition-colors',
                    isDark
                      ? 'text-zinc-500 hover:text-white hover:bg-white/5'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className={cn(
                  'px-4 py-8 text-center',
                  isDark ? 'text-zinc-500' : 'text-slate-400'
                )}>
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-mono text-xs uppercase tracking-wider">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'group relative px-4 py-3 border-b cursor-pointer transition-colors',
                      isDark
                        ? 'border-white/5 hover:bg-white/5'
                        : 'border-slate-100 hover:bg-slate-50',
                      notification.status !== 'read' && (isDark ? 'bg-white/[0.02]' : 'bg-blue-50/50')
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={cn(
                        'flex-shrink-0 w-9 h-9 flex items-center justify-center text-lg',
                        isDark ? 'bg-white/5' : 'bg-slate-100'
                      )}>
                        {typeIcons[notification.type]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'font-display font-bold text-xs uppercase tracking-wide truncate',
                            isDark ? 'text-white' : 'text-slate-900'
                          )}>
                            {notification.title}
                          </p>
                          {notification.status !== 'read' && (
                            <span className={cn(
                              'flex-shrink-0 w-2 h-2 rounded-full mt-1',
                              isDark ? 'bg-ecotribe-primary' : 'bg-ecotribe-light-primary'
                            )} />
                          )}
                        </div>
                        <p className={cn(
                          'text-xs mt-0.5 line-clamp-2',
                          isDark ? 'text-zinc-400' : 'text-slate-500'
                        )}>
                          {notification.message}
                        </p>
                        <p className={cn(
                          'font-mono text-[10px] mt-1.5 uppercase tracking-wider',
                          isDark ? 'text-zinc-600' : 'text-slate-400'
                        )}>
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className={cn(
                      'absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                    )}>
                      {notification.status !== 'read' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className={cn(
                            'p-1.5 transition-colors',
                            isDark
                              ? 'text-zinc-500 hover:text-ecotribe-primary hover:bg-white/10'
                              : 'text-slate-400 hover:text-ecotribe-light-primary hover:bg-slate-200'
                          )}
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className={cn(
                          'p-1.5 transition-colors',
                          isDark
                            ? 'text-zinc-500 hover:text-red-400 hover:bg-white/10'
                            : 'text-slate-400 hover:text-red-500 hover:bg-slate-200'
                        )}
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className={cn(
                'px-4 py-2 border-t',
                isDark ? 'border-white/10' : 'border-slate-200'
              )}>
                <p className={cn(
                  'font-mono text-[10px] uppercase tracking-wider text-center',
                  isDark ? 'text-zinc-600' : 'text-slate-400'
                )}>
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Mobile version of notification dropdown
export const NotificationDropdownMobile: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // V3: Use React Query hook for auth
  const { user } = useAuth();
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotificationStore();

  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
    }
  }, [user?.id, fetchNotifications]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className="relative z-[200]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'interactive p-2 relative',
          isDark ? 'text-zinc-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-ecotribe-primary text-[10px] flex items-center justify-center text-black font-mono font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className={cn(
              'absolute right-0 z-50 mt-2 w-80',
              'shadow-xl overflow-hidden',
              isDark
                ? 'bg-[#0c0c0d] border border-white/10'
                : 'bg-white border border-slate-200'
            )}
          >
            {/* Header */}
            <div className={cn(
              'flex items-center justify-between px-3 py-2 border-b',
              isDark ? 'border-white/10' : 'border-slate-200'
            )}>
              <span className={cn(
                'font-display font-bold text-xs uppercase',
                isDark ? 'text-white' : 'text-slate-900'
              )}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className={cn(
                    'font-mono text-[10px] uppercase',
                    isDark ? 'text-ecotribe-primary' : 'text-ecotribe-light-primary'
                  )}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className={cn(
                  'px-3 py-6 text-center',
                  isDark ? 'text-zinc-500' : 'text-slate-400'
                )}>
                  <p className="font-mono text-xs">No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (notification.status !== 'read') markAsRead(notification.id);
                    }}
                    className={cn(
                      'px-3 py-2.5 border-b cursor-pointer',
                      isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50',
                      notification.status !== 'read' && (isDark ? 'bg-white/[0.02]' : 'bg-blue-50/50')
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm">{typeIcons[notification.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-display text-xs font-bold truncate',
                          isDark ? 'text-white' : 'text-slate-900'
                        )}>
                          {notification.title}
                        </p>
                        <p className={cn(
                          'text-[11px] truncate',
                          isDark ? 'text-zinc-400' : 'text-slate-500'
                        )}>
                          {notification.message}
                        </p>
                      </div>
                      {notification.status !== 'read' && (
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full mt-1.5',
                          isDark ? 'bg-ecotribe-primary' : 'bg-ecotribe-light-primary'
                        )} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
