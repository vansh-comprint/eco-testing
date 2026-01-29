import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, ArrowLeft, Save, Database, Mail, Bell, Lock, Globe, Zap } from 'lucide-react';
import { Button, Card, Input, PageHeader, Badge } from '@/components/ui';
import { glass, text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  settings: {
    key: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'toggle' | 'select';
    value: string | boolean | number;
    options?: string[];
    description?: string;
  }[];
}

export function Settings() {
  const navigate = useNavigate();
  const [hasChanges, setHasChanges] = useState(false);

  const [sections, setSections] = useState<SettingSection[]>([
    {
      id: 'database',
      title: 'Database Configuration',
      description: 'Database connection and performance settings',
      icon: <Database className={iconSize.lg} />,
      settings: [
        {
          key: 'db_provider',
          label: 'Database Provider',
          type: 'select',
          value: 'supabase',
          options: ['supabase', 'postgresql', 'mongodb'],
          description: 'Current database provider',
        },
        {
          key: 'db_backup_enabled',
          label: 'Auto Backup',
          type: 'toggle',
          value: true,
          description: 'Automatically backup database daily',
        },
        {
          key: 'db_retention_days',
          label: 'Backup Retention (days)',
          type: 'number',
          value: 30,
          description: 'Number of days to retain backups',
        },
      ],
    },
    {
      id: 'email',
      title: 'Email & Notifications',
      description: 'Email service and notification settings',
      icon: <Mail className={iconSize.lg} />,
      settings: [
        {
          key: 'smtp_host',
          label: 'SMTP Host',
          type: 'text',
          value: 'smtp.gmail.com',
          description: 'Email server hostname',
        },
        {
          key: 'smtp_port',
          label: 'SMTP Port',
          type: 'number',
          value: 587,
          description: 'Email server port',
        },
        {
          key: 'from_email',
          label: 'From Email',
          type: 'email',
          value: 'noreply@ecotribe.io',
          description: 'Default sender email address',
        },
        {
          key: 'email_notifications',
          label: 'Email Notifications',
          type: 'toggle',
          value: true,
          description: 'Send email notifications to users',
        },
      ],
    },
    {
      id: 'security',
      title: 'Security & Authentication',
      description: 'Authentication and security settings',
      icon: <Lock className={iconSize.lg} />,
      settings: [
        {
          key: 'session_timeout',
          label: 'Session Timeout (hours)',
          type: 'number',
          value: 24,
          description: 'Auto logout after inactivity',
        },
        {
          key: 'password_min_length',
          label: 'Min Password Length',
          type: 'number',
          value: 8,
          description: 'Minimum password length requirement',
        },
        {
          key: 'two_factor_enabled',
          label: 'Two-Factor Authentication',
          type: 'toggle',
          value: false,
          description: 'Require 2FA for admin users',
        },
        {
          key: 'ip_whitelist_enabled',
          label: 'IP Whitelist',
          type: 'toggle',
          value: false,
          description: 'Restrict access to specific IPs',
        },
      ],
    },
    {
      id: 'platform',
      title: 'Platform Settings',
      description: 'General platform configuration',
      icon: <Globe className={iconSize.lg} />,
      settings: [
        {
          key: 'platform_name',
          label: 'Platform Name',
          type: 'text',
          value: 'EcoTribe',
          description: 'Display name for the platform',
        },
        {
          key: 'support_email',
          label: 'Support Email',
          type: 'email',
          value: 'support@ecotribe.io',
          description: 'Customer support email address',
        },
        {
          key: 'maintenance_mode',
          label: 'Maintenance Mode',
          type: 'toggle',
          value: false,
          description: 'Put platform in maintenance mode',
        },
      ],
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Third-party integrations and APIs',
      icon: <Zap className={iconSize.lg} />,
      settings: [
        {
          key: 'analytics_enabled',
          label: 'Analytics Tracking',
          type: 'toggle',
          value: true,
          description: 'Enable platform analytics',
        },
        {
          key: 'sms_provider',
          label: 'SMS Provider',
          type: 'select',
          value: 'twilio',
          options: ['twilio', 'aws-sns', 'none'],
          description: 'SMS notification provider',
        },
        {
          key: 'payment_gateway',
          label: 'Payment Gateway',
          type: 'select',
          value: 'razorpay',
          options: ['razorpay', 'stripe', 'paypal'],
          description: 'Payment processing provider',
        },
      ],
    },
  ]);

  const handleSaveSettings = () => {
    console.log('💾 Saving settings...');
    // TODO: Save to database
    setHasChanges(false);
  };

  const handleSettingChange = (sectionId: string, settingKey: string, newValue: any) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              settings: section.settings.map(setting =>
                setting.key === settingKey
                  ? { ...setting, value: newValue }
                  : setting
              ),
            }
          : section
      )
    );
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Super Admin"
        title="Platform Settings"
        subtitle="Configure platform-wide settings and integrations"
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/super')}
              leftIcon={<ArrowLeft className={iconSize.sm} />}
            >
              Back
            </Button>
            {hasChanges && (
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                leftIcon={<Save className={iconSize.sm} />}
              >
                Save Changes
              </Button>
            )}
          </div>
        }
      />

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4 bg-amber-50/80 dark:bg-amber-500/10 border-amber-500/30 dark:border-amber-400/20">
            <div className="flex items-center gap-3">
              <Bell className={`${iconSize.sm} text-amber-600 dark:text-amber-400`} />
              <p className={`font-mono text-sm font-bold text-amber-700 dark:text-amber-300`}>
                You have unsaved changes. Click "Save Changes" to apply.
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {sections.map((section, index) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <Card>
              {/* Section Header */}
              <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 border border-lime-500/30 dark:border-lime-400/20 bg-lime-50/80 dark:bg-lime-500/10 flex items-center justify-center text-lime-700 dark:text-lime-400">
                    {section.icon}
                  </div>
                  <div>
                    <h3 className={`font-brand font-bold text-lg uppercase ${text.primary}`}>
                      {section.title}
                    </h3>
                    <p className={`font-mono text-xs ${text.muted} mt-1`}>
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings List */}
              <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                {section.settings.map((setting) => (
                  <div key={setting.key} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <label className={`font-display text-sm font-bold uppercase ${text.primary} block mb-1`}>
                          {setting.label}
                        </label>
                        {setting.description && (
                          <p className={`font-mono text-xs ${text.muted}`}>
                            {setting.description}
                          </p>
                        )}
                      </div>

                      <div className="w-64">
                        {setting.type === 'toggle' ? (
                          <button
                            onClick={() =>
                              handleSettingChange(section.id, setting.key, !setting.value)
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              setting.value
                                ? 'bg-lime-500'
                                : 'bg-slate-300 dark:bg-zinc-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                setting.value ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : setting.type === 'select' ? (
                          <select
                            value={setting.value as string}
                            onChange={(e) =>
                              handleSettingChange(section.id, setting.key, e.target.value)
                            }
                            className="w-full px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 font-mono text-xs uppercase tracking-widest focus:outline-none focus:border-lime-500 dark:focus:border-lime-400"
                          >
                            {setting.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            type={setting.type}
                            value={setting.value as string | number}
                            onChange={(e) =>
                              handleSettingChange(
                                section.id,
                                setting.key,
                                setting.type === 'number'
                                  ? parseInt(e.target.value) || 0
                                  : e.target.value
                              )
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
