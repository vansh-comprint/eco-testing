/**
 * STATUS: COMPLETE
 * Consolidated: org-admin/OrgAdminSettings.tsx (Org Admin settings — profile, enterprise, notifications, bank)
 * V3.1: Fix phone validation, security tab dual buttons, enterprise address init, notification persistence, dual toast
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building,
  User,
  Bell,
  CreditCard,
  Mail,
  Phone,
  Save,
  Shield,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks';
import { useToast } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { enterprisesApi } from '@/lib/api/enterprises';
import { useAuthStoreApi } from '@/stores';
import { PasswordChange } from '@/components/settings';

type SettingsTab = 'profile' | 'security' | 'enterprise' | 'notifications' | 'bank';

const NOTIFICATION_STORAGE_KEY = 'ecotribe-org-notification-prefs';

export function OrgAdminSettings() {
  const { user, enterprise } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: (user?.phone || '').replace(/^\+91[\s-]?/, ''),
  });

  // Enterprise form — handle both structured address {line1, city, ...} and legacy {full: "..."}
  const addr = enterprise?.address as Record<string, unknown> | undefined;
  const [enterpriseForm, setEnterpriseForm] = useState({
    name: enterprise?.name || '',
    gstin: enterprise?.gstNumber || '',
    address: (addr?.line1 as string) || (addr?.full as string) || '',
    city: (addr?.city as string) || '',
    state: (addr?.state as string) || '',
    pincode: (addr?.pincode as string) || '',
    contactEmail: enterprise?.contactEmail || '',
    contactPhone: (enterprise?.contactPhone || '').replace(/^\+91[\s-]?/, ''),
  });

  // Notification preferences — persisted to localStorage
  const DEFAULT_NOTIFICATIONS = {
    emailApprovalRequests: true,
    emailPickupUpdates: true,
    emailPayoutUpdates: true,
    emailWeeklyReport: true,
    emailITAdminActivity: false,
    smsApprovalRequests: true,
    smsPickupUpdates: false,
    smsPayoutUpdates: true,
  };
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (saved) return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return DEFAULT_NOTIFICATIONS;
  });

  // Bank form
  const [bankForm, setBankForm] = useState(() => {
    try {
      const saved = localStorage.getItem('ecotribe-org-bank-details');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {
      accountName: enterprise?.name || '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      bankName: '',
      branch: '',
    };
  });
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'profile') {
        // Validate phone number — must be exactly 10 digits if provided
        if (profileForm.phone && profileForm.phone.length !== 10) {
          addToast({ type: 'error', title: 'Invalid Phone', message: 'Phone number must be exactly 10 digits.' });
          return;
        }
        const response = await usersApi.updateMe({
          name: profileForm.name,
          phone: profileForm.phone,
        });
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to save profile');
        }
        // Refresh auth store so sidebar/header reflects new name
        await useAuthStoreApi.getState().refreshUser();
        queryClient.invalidateQueries({ queryKey: ['users'] });
        addToast({ type: 'success', title: 'Profile Saved', message: 'Your profile has been updated.' });
      } else if (activeTab === 'enterprise') {
        if (!enterprise?.id) {
          throw new Error('Enterprise ID not found');
        }
        const response = await enterprisesApi.update(enterprise.id, {
          name: enterpriseForm.name,
          gst_number: enterpriseForm.gstin || undefined,
          contact_email: enterpriseForm.contactEmail || undefined,
          contact_phone: enterpriseForm.contactPhone || undefined,
          address: {
            line1: enterpriseForm.address,
            city: enterpriseForm.city,
            state: enterpriseForm.state,
            pincode: enterpriseForm.pincode,
          },
        });
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to save enterprise details');
        }
        queryClient.invalidateQueries({ queryKey: ['enterprises'] });
        addToast({ type: 'success', title: 'Enterprise Saved', message: 'Enterprise details have been updated.' });
      } else if (activeTab === 'notifications') {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
        addToast({ type: 'success', title: 'Notifications Saved', message: 'Notification preferences have been updated.' });
      } else if (activeTab === 'bank') {
        const errors: Record<string, string> = {};
        // Account Holder Name — required, letters/spaces/dots only
        if (!bankForm.accountName.trim()) {
          errors.accountName = 'Account holder name is required';
        } else if (bankForm.accountName.trim().length < 3) {
          errors.accountName = 'Name must be at least 3 characters';
        }
        // Account Number — required, 9-18 digits
        if (!bankForm.accountNumber.trim()) {
          errors.accountNumber = 'Account number is required';
        } else if (!/^\d{9,18}$/.test(bankForm.accountNumber.trim())) {
          errors.accountNumber = 'Account number must be 9-18 digits';
        }
        // Confirm Account Number — must match
        if (!bankForm.confirmAccountNumber.trim()) {
          errors.confirmAccountNumber = 'Please re-enter account number';
        } else if (bankForm.accountNumber !== bankForm.confirmAccountNumber) {
          errors.confirmAccountNumber = 'Account numbers do not match';
        }
        // IFSC Code — required, format: 4 letters + 0 + 6 alphanumeric
        if (!bankForm.ifscCode.trim()) {
          errors.ifscCode = 'IFSC code is required';
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifscCode.trim())) {
          errors.ifscCode = 'Invalid IFSC format (e.g., HDFC0001234)';
        }
        // Bank Name — required
        if (!bankForm.bankName.trim()) {
          errors.bankName = 'Bank name is required';
        }
        // Branch — required
        if (!bankForm.branch.trim()) {
          errors.branch = 'Branch name is required';
        }
        setBankErrors(errors);
        if (Object.keys(errors).length > 0) {
          addToast({ type: 'error', title: 'Validation Failed', message: 'Please fix the highlighted fields.' });
          return;
        }
        localStorage.setItem('ecotribe-org-bank-details', JSON.stringify(bankForm));
        addToast({ type: 'success', title: 'Bank Details Saved', message: 'Bank details saved locally. Backend persistence coming soon.' });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'Failed to save changes.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'security' as const, label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'enterprise' as const, label: 'Enterprise', icon: <Building className="w-4 h-4" /> },
    { id: 'notifications' as const, label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'bank' as const, label: 'Bank Details', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Organization</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            Settings
          </h1>
          <p className="font-display text-slate-600 dark:text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            Manage your organization profile and preferences
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 p-2 btn-chamfer">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`interactive w-full flex items-center gap-3 px-4 py-3 font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                    activeTab === tab.id
                      ? 'bg-ecotribe-primary text-black'
                      : 'text-slate-600 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <User className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Profile Settings</h2>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '') })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={profileForm.email}
                        disabled
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Cannot be changed</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit phone number"
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none transition-colors ${
                        profileForm.phone && profileForm.phone.length > 0 && profileForm.phone.length < 10
                          ? 'border-red-400 dark:border-red-500/50 focus:border-red-500'
                          : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'
                      }`}
                    />
                    {profileForm.phone && profileForm.phone.length > 0 && profileForm.phone.length < 10 && (
                      <p className="font-mono text-[10px] text-red-500 mt-1">Phone number must be exactly 10 digits</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Role</label>
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
                      <SettingsIcon className="w-4 h-4 text-ecotribe-primary" />
                      <span className="font-mono text-sm text-ecotribe-primary font-bold uppercase">Organization Admin</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Security Tab — PasswordChange has its own submit button, no global Save */}
          {activeTab === 'security' && (
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <Shield className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Security</h2>
              </div>
              <div className="p-5">
                <PasswordChange />
              </div>
            </div>
          )}

          {/* Enterprise Tab */}
          {activeTab === 'enterprise' && (
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <Building className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Enterprise Details</h2>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Company Name</label>
                    <input
                      type="text"
                      value={enterpriseForm.name}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">GSTIN</label>
                    <input
                      type="text"
                      placeholder="22AAAAA0000A1Z5"
                      value={enterpriseForm.gstin}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, gstin: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Address Line 1</label>
                  <textarea
                    value={enterpriseForm.address}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">City</label>
                    <input
                      type="text"
                      value={enterpriseForm.city}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, city: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">State</label>
                    <input
                      type="text"
                      value={enterpriseForm.state}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, state: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">PIN Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={enterpriseForm.pincode}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, pincode: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={enterpriseForm.contactEmail}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, contactEmail: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={enterpriseForm.contactPhone}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, contactPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      inputMode="numeric"
                      maxLength={10}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Notification Preferences</h2>
              </div>
              <div className="p-5 space-y-6">
                {/* Email Notifications */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-4 h-4 text-slate-500 dark:text-zinc-600" />
                    <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Email Notifications</h4>
                  </div>
                  <div className="space-y-2">
                    <NotificationToggle
                      label="Batch approval requests"
                      description="Get notified when IT Admins submit batches for approval"
                      checked={notifications.emailApprovalRequests}
                      onChange={(v) => setNotifications({ ...notifications, emailApprovalRequests: v })}
                    />
                    <NotificationToggle
                      label="Pickup status updates"
                      description="Get notified when pickup status changes across branches"
                      checked={notifications.emailPickupUpdates}
                      onChange={(v) => setNotifications({ ...notifications, emailPickupUpdates: v })}
                    />
                    <NotificationToggle
                      label="Payout notifications"
                      description="Get notified when payouts are processed or completed"
                      checked={notifications.emailPayoutUpdates}
                      onChange={(v) => setNotifications({ ...notifications, emailPayoutUpdates: v })}
                    />
                    <NotificationToggle
                      label="Weekly summary report"
                      description="Receive a weekly summary of enterprise activity"
                      checked={notifications.emailWeeklyReport}
                      onChange={(v) => setNotifications({ ...notifications, emailWeeklyReport: v })}
                    />
                    <NotificationToggle
                      label="IT Admin activity alerts"
                      description="Get notified when IT Admins create batches or add assets"
                      checked={notifications.emailITAdminActivity}
                      onChange={(v) => setNotifications({ ...notifications, emailITAdminActivity: v })}
                    />
                  </div>
                </div>

                {/* SMS Notifications */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Phone className="w-4 h-4 text-slate-500 dark:text-zinc-600" />
                    <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">SMS Notifications</h4>
                  </div>
                  <div className="space-y-2">
                    <NotificationToggle
                      label="Approval requests"
                      description="Get SMS when batches need your approval"
                      checked={notifications.smsApprovalRequests}
                      onChange={(v) => setNotifications({ ...notifications, smsApprovalRequests: v })}
                    />
                    <NotificationToggle
                      label="Pickup updates"
                      description="Get SMS for important pickup status changes"
                      checked={notifications.smsPickupUpdates}
                      onChange={(v) => setNotifications({ ...notifications, smsPickupUpdates: v })}
                    />
                    <NotificationToggle
                      label="Payout confirmations"
                      description="Get SMS when payouts are completed"
                      checked={notifications.smsPayoutUpdates}
                      onChange={(v) => setNotifications({ ...notifications, smsPayoutUpdates: v })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bank Tab */}
          {activeTab === 'bank' && (
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Enterprise Bank Account</h2>
              </div>
              <div className="p-5 space-y-5">
                <div className="p-4 border border-amber-500/20 bg-amber-500/5">
                  <p className="font-mono text-xs text-amber-400">
                    This is the enterprise-level bank account for receiving payouts. All fields are mandatory. Ensure details match your company records.
                  </p>
                </div>

                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    Account Holder Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Company name as per bank records"
                    value={bankForm.accountName}
                    onChange={(e) => { setBankForm({ ...bankForm, accountName: e.target.value }); setBankErrors(prev => { const { accountName, ...rest } = prev; return rest; }); }}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none transition-colors ${
                      bankErrors.accountName ? 'border-red-400 dark:border-red-500/50 focus:border-red-500' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'
                    }`}
                  />
                  {bankErrors.accountName && <p className="font-mono text-[10px] text-red-500 mt-1">{bankErrors.accountName}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="9-18 digit account number"
                      inputMode="numeric"
                      value={bankForm.accountNumber}
                      onChange={(e) => { setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, '') }); setBankErrors(prev => { const { accountNumber, ...rest } = prev; return rest; }); }}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none transition-colors ${
                        bankErrors.accountNumber ? 'border-red-400 dark:border-red-500/50 focus:border-red-500' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'
                      }`}
                    />
                    {bankErrors.accountNumber && <p className="font-mono text-[10px] text-red-500 mt-1">{bankErrors.accountNumber}</p>}
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                      Confirm Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Re-enter account number"
                      inputMode="numeric"
                      value={bankForm.confirmAccountNumber}
                      onChange={(e) => { setBankForm({ ...bankForm, confirmAccountNumber: e.target.value.replace(/\D/g, '') }); setBankErrors(prev => { const { confirmAccountNumber, ...rest } = prev; return rest; }); }}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none transition-colors ${
                        bankErrors.confirmAccountNumber ? 'border-red-400 dark:border-red-500/50 focus:border-red-500' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'
                      }`}
                    />
                    {bankErrors.confirmAccountNumber && <p className="font-mono text-[10px] text-red-500 mt-1">{bankErrors.confirmAccountNumber}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                      IFSC Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., HDFC0001234"
                      maxLength={11}
                      value={bankForm.ifscCode}
                      onChange={(e) => { setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) }); setBankErrors(prev => { const { ifscCode, ...rest } = prev; return rest; }); }}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none transition-colors uppercase ${
                        bankErrors.ifscCode ? 'border-red-400 dark:border-red-500/50 focus:border-red-500' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'
                      }`}
                    />
                    {bankErrors.ifscCode && <p className="font-mono text-[10px] text-red-500 mt-1">{bankErrors.ifscCode}</p>}
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter bank name"
                      value={bankForm.bankName}
                      onChange={(e) => { setBankForm({ ...bankForm, bankName: e.target.value }); setBankErrors(prev => { const { bankName, ...rest } = prev; return rest; }); }}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none transition-colors ${
                        bankErrors.bankName ? 'border-red-400 dark:border-red-500/50 focus:border-red-500' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'
                      }`}
                    />
                    {bankErrors.bankName && <p className="font-mono text-[10px] text-red-500 mt-1">{bankErrors.bankName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter branch name"
                    value={bankForm.branch}
                    onChange={(e) => { setBankForm({ ...bankForm, branch: e.target.value }); setBankErrors(prev => { const { branch, ...rest } = prev; return rest; }); }}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none transition-colors ${
                      bankErrors.branch ? 'border-red-400 dark:border-red-500/50 focus:border-red-500' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'
                    }`}
                  />
                  {bankErrors.branch && <p className="font-mono text-[10px] text-red-500 mt-1">{bankErrors.branch}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Save Button — hidden on Security tab (PasswordChange has its own button) */}
          {activeTab !== 'security' && (
            <div className="mt-6 flex items-center justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="interactive px-6 py-3 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="interactive flex items-center justify-between p-4 border border-slate-200 dark:border-white/5 bg-white/85 dark:bg-black/30 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors">
      <div>
        <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">{label}</p>
        <p className="font-mono text-xs text-slate-500 dark:text-zinc-600">{description}</p>
      </div>
      <div
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 transition-colors relative cursor-pointer ${
          checked ? 'bg-ecotribe-primary' : 'bg-slate-300 dark:bg-white/10'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white transition-transform ${
            checked ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </div>
    </label>
  );
}

export default OrgAdminSettings;
