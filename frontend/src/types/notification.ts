export type NotificationChannel = 'email' | 'whatsapp' | 'in_app';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export type NotificationType =
  | 'asset_assigned'
  | 'submission_received'
  | 'remote_review_complete'
  | 'dispute_submitted'
  | 'dispute_resolved'
  | 'payout_initiated'
  | 'payout_completed'
  | 'reminder_checkin'
  | 'reminder_stalled'
  | 'info'
  | 'success'
  | 'warning'
  | 'batch_ready';

export interface Notification {
  id: string;
  recipientType: 'user' | 'employee';
  recipientId: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  status: NotificationStatus;
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

export interface CreateNotificationInput {
  recipientType: 'user' | 'employee';
  recipientId: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}

export const notificationTypeLabels: Record<NotificationType, string> = {
  asset_assigned: 'Asset Assigned',
  submission_received: 'Submission Received',
  remote_review_complete: 'Remote Review Complete',
  dispute_submitted: 'Dispute Submitted',
  dispute_resolved: 'Dispute Resolved',
  payout_initiated: 'Payout Initiated',
  payout_completed: 'Payout Completed',
  reminder_checkin: 'Check-in Reminder',
  reminder_stalled: 'Stalled Asset Reminder',
  info: 'Information',
  success: 'Success',
  warning: 'Warning',
  batch_ready: 'Batch Ready',
};
