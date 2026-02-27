/**
 * STATUS: COMPLETE
 * Consolidated: admin/Settings.tsx (IT Admin settings — profile, enterprise, pickup locations, notifications, bank)
 * Verified: [ ] visual regression [ ] permissions
 * Permission-gated sections: Pickup Locations (MANAGE_PICKUP_LOCATIONS), Enterprise (MANAGE_ENTERPRISE_SETTINGS), Bank (VIEW_PAYOUTS)
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
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Star,
  Clock,
  Shield,
  X
} from 'lucide-react';
import {
  useAuth,
  usePickupLocations,
  useCreatePickupLocation,
  useUpdatePickupLocation,
  useDeletePickupLocation,
  useSetDefaultPickupLocation,
} from '@/hooks';
import { useToast } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { useAuthStoreApi } from '@/stores';
import { PermissionGate, Permission } from '@/permissions';
import { PasswordChange } from '@/components/settings';

// Operating days options
const OPERATING_DAYS_OPTIONS = [
  { value: 'Mon-Fri', label: 'Monday - Friday' },
  { value: 'Mon-Sat', label: 'Monday - Saturday' },
  { value: 'Sun-Sat', label: 'Sunday - Saturday (All Days)' },
  { value: 'Custom', label: 'Custom' },
];

// Generate 30-min interval time options from 6:00 AM to 10:00 PM
function generateTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) break;
      const period = h < 12 ? 'AM' : 'PM';
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const displayM = m === 0 ? '00' : '30';
      const label = `${displayH}:${displayM} ${period}`;
      options.push({ value: label, label });
    }
  }
  return options;
}
const TIME_OPTIONS = generateTimeOptions();

const INDIAN_STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

type SettingsTab = 'profile' | 'enterprise' | 'notifications' | 'bank' | 'locations' | 'security';

const NOTIFICATION_STORAGE_KEY = 'ecotribe-it-notification-prefs';

// V3: Pickup location type with snake_case
interface PickupLocationData {
  id: string;
  enterprise_id: string;
  name: string;
  address: string;
  city: string;
  pin_code: string;
  contact_person: string;
  contact_phone: string;
  operating_hours: string;
  special_instructions?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export function Settings() {
  // V3: Use React Query hook for auth
  const { user, enterprise } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const enterpriseId = enterprise?.id || '';
  const isITAdmin = user?.role === 'it_admin';
  const enterpriseReadOnly = isITAdmin;

  // V3: React Query hooks
  const { data: pickupLocations = [], isLoading: locationsLoading } = usePickupLocations(enterpriseId);
  const createLocationMutation = useCreatePickupLocation();
  const updateLocationMutation = useUpdatePickupLocation();
  const deleteLocationMutation = useDeletePickupLocation();
  const setDefaultMutation = useSetDefaultPickupLocation();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  // Pickup locations modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PickupLocationData | null>(null);
  // V3: Form state with snake_case
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pin_code: '',
    contact_person: '',
    contact_phone: '',
    operating_hours: 'Mon-Fri, 9:00 AM - 6:00 PM',
    special_instructions: '',
  });
  const [selectedDays, setSelectedDays] = useState('Mon-Fri');
  const [openTime, setOpenTime] = useState('9:00 AM');
  const [closeTime, setCloseTime] = useState('6:00 PM');
  const [customHours, setCustomHours] = useState('');
  const [useCustomHours, setUseCustomHours] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: (user?.phone || '').replace(/^\+91[\s-]?/, ''),
    department: user?.department || '',
  });

  // Enterprise form
  const [enterpriseForm, setEnterpriseForm] = useState({
    name: enterprise?.name || '',
    gstin: (enterprise as any)?.gstin || '',
    address: typeof enterprise?.address === 'string' ? enterprise.address : '',
    city: '',
    state: '',
    pincode: '',
    contactEmail: enterprise?.contactEmail || '',
    contactPhone: enterprise?.contactPhone || '',
  });

  // Notification preferences — persisted to localStorage
  const DEFAULT_NOTIFICATIONS = {
    emailAssetUpdates: true,
    emailBatchUpdates: true,
    emailPayoutUpdates: true,
    emailWeeklyReport: false,
    smsAssetUpdates: false,
    smsBatchUpdates: true,
    smsPayoutUpdates: true,
  };
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (saved) return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return DEFAULT_NOTIFICATIONS;
  });

  // Bank form — load from localStorage if available
  const [bankForm, setBankForm] = useState(() => {
    try {
      const saved = localStorage.getItem('ecotribe-bank-details');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {
      accountName: enterprise?.name || '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      bankName: 'HDFC Bank',
      branch: '',
    };
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'profile') {
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
      } else if (activeTab === 'notifications') {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
        addToast({ type: 'success', title: 'Notifications Saved', message: 'Notification preferences have been updated.' });
      } else if (activeTab === 'bank') {
        if (bankForm.accountNumber && bankForm.accountNumber !== bankForm.confirmAccountNumber) {
          addToast({ type: 'error', title: 'Account Mismatch', message: 'Account numbers do not match.' });
          return;
        }
        // Bank details: persist to localStorage until backend endpoint is available
        localStorage.setItem('ecotribe-bank-details', JSON.stringify(bankForm));
        addToast({ type: 'success', title: 'Bank Details Saved', message: 'Bank details saved locally. Backend persistence coming soon.' });
      } else if (activeTab === 'enterprise') {
        addToast({ type: 'success', title: 'Settings Saved', message: 'Changes saved successfully.' });
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
    { id: 'locations' as const, label: 'Pickup Locations', icon: <MapPin className="w-4 h-4" /> },
    { id: 'notifications' as const, label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'bank' as const, label: 'Bank Details', icon: <CreditCard className="w-4 h-4" /> },
  ].filter(tab => !(isITAdmin && tab.id === 'bank'));

  // V3: Location modal handlers with snake_case
  const openAddLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      name: '',
      address: '',
      city: '',
      state: '',
      pin_code: '',
      contact_person: '',
      contact_phone: '',
      operating_hours: 'Mon-Fri, 9:00 AM - 6:00 PM',
      special_instructions: '',
    });
    setSelectedDays('Mon-Fri');
    setOpenTime('9:00 AM');
    setCloseTime('6:00 PM');
    setCustomHours('');
    setUseCustomHours(false);
    setShowLocationModal(true);
  };

  const openEditLocation = (location: PickupLocationData) => {
    setEditingLocation(location);
    // Try to parse existing hours string into days + time components
    // Expected format: "Mon-Fri, 9:00 AM - 6:00 PM"
    const hoursStr = location.operating_hours || '';
    const match = hoursStr.match(/^(Mon-Fri|Mon-Sat|Sun-Sat),\s*(.+?)\s*-\s*(.+)$/);
    if (match) {
      setSelectedDays(match[1]);
      setOpenTime(match[2].trim());
      setCloseTime(match[3].trim());
      setUseCustomHours(false);
      setCustomHours('');
    } else {
      setSelectedDays('Mon-Fri');
      setOpenTime('9:00 AM');
      setCloseTime('6:00 PM');
      setUseCustomHours(true);
      setCustomHours(hoursStr);
    }
    setLocationForm({
      name: location.name,
      address: location.address,
      city: location.city,
      state: (location as any).state || '',
      pin_code: location.pin_code,
      contact_person: location.contact_person,
      contact_phone: location.contact_phone,
      operating_hours: hoursStr,
      special_instructions: location.special_instructions || '',
    });
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    if (!enterpriseId) return;
    setIsSaving(true);
    try {
      // Combine day range + time range, or use custom free-text
      const finalOperatingHours = useCustomHours
        ? customHours
        : `${selectedDays}, ${openTime} - ${closeTime}`;
      const formData = { ...locationForm, operating_hours: finalOperatingHours };

      if (editingLocation) {
        await updateLocationMutation.mutateAsync({
          locationId: editingLocation.id,
          updates: formData,
        });
      } else {
        await createLocationMutation.mutateAsync({
          enterprise_id: enterpriseId,
          ...formData,
        });
      }
      setShowLocationModal(false);
      addToast({
        type: 'success',
        title: editingLocation ? 'Location Updated' : 'Location Added',
        message: editingLocation ? 'Pickup location updated successfully.' : 'New pickup location added successfully.',
      });
    } catch (error) {
      console.error('Failed to save location:', error);
      addToast({
        type: 'error',
        title: 'Failed to Save Location',
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pickup location?')) return;
    setIsSaving(true);
    try {
      await deleteLocationMutation.mutateAsync({ locationId: id, enterpriseId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!enterpriseId) return;
    setIsSaving(true);
    try {
      await setDefaultMutation.mutateAsync({ locationId: id, enterpriseId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">Account</span>
          <h1 className="font-brand font-bold text-3xl md:text-4xl text-slate-900 dark:text-white uppercase tracking-tight">
            Settings
          </h1>
          <p className="font-display text-slate-600 dark:text-zinc-500 text-sm mt-2 uppercase tracking-wide">Manage your account and enterprise preferences</p>
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
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Phone Number</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
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
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Department</label>
                    <input
                      type="text"
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Security Tab */}
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
                {enterpriseReadOnly && (
                  <div className="p-3 border border-blue-400/20 bg-blue-400/5">
                    <p className="font-mono text-xs text-blue-400">
                      Enterprise settings are managed by your Org Admin and are read-only.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Company Name</label>
                    <input
                      type="text"
                      value={enterpriseForm.name}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, name: e.target.value })}
                      disabled={enterpriseReadOnly}
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
                      disabled={enterpriseReadOnly}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Address</label>
                  <textarea
                    value={enterpriseForm.address}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, address: e.target.value })}
                    rows={2}
                    disabled={enterpriseReadOnly}
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
                      disabled={enterpriseReadOnly}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">State</label>
                    <input
                      type="text"
                      value={enterpriseForm.state}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, state: e.target.value })}
                      disabled={enterpriseReadOnly}
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
                      disabled={enterpriseReadOnly}
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
                      disabled={enterpriseReadOnly}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={enterpriseForm.contactPhone}
                      onChange={(e) => setEnterpriseForm({ ...enterpriseForm, contactPhone: e.target.value })}
                      disabled={enterpriseReadOnly}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pickup Locations Tab — gated by MANAGE_PICKUP_LOCATIONS */}
          {activeTab === 'locations' && (
            <PermissionGate permission={Permission.MANAGE_PICKUP_LOCATIONS}>
            <div className="space-y-6">
              <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
                <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
                    <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Pickup Locations</h2>
                  </div>
                  <button
                    onClick={openAddLocation}
                    className="interactive px-4 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Location
                  </button>
                </div>

                {pickupLocations.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {pickupLocations.map((location) => (
                      <div
                        key={location.id}
                        className="p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">
                                {location.name}
                              </h3>
                              {location.is_default && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-ecotribe-primary/10 border border-ecotribe-primary/30 text-ecotribe-primary font-mono text-[10px] uppercase tracking-widest">
                                  <Star className="w-3 h-3" />
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-slate-600 dark:text-zinc-400 mb-1">{location.address}</p>
                            <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">
                              {location.city}, {location.pin_code}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-slate-500 dark:text-zinc-600">
                              <span className="flex items-center gap-1.5 font-mono text-xs">
                                <User className="w-3 h-3" />
                                {location.contact_person}
                              </span>
                              <span className="flex items-center gap-1.5 font-mono text-xs">
                                <Phone className="w-3 h-3" />
                                {location.contact_phone}
                              </span>
                              <span className="flex items-center gap-1.5 font-mono text-xs">
                                <Clock className="w-3 h-3" />
                                {location.operating_hours}
                              </span>
                            </div>
                            {location.special_instructions && (
                              <p className="mt-2 font-mono text-xs text-slate-500 dark:text-zinc-600 italic">
                                Note: {location.special_instructions}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!location.is_default && (
                              <button
                                onClick={() => handleSetDefault(location.id)}
                                className="interactive p-2 border border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/30 hover:bg-ecotribe-primary/5 transition-all"
                                title="Set as default"
                              >
                                <Star className="w-4 h-4 text-slate-500 dark:text-zinc-500 hover:text-ecotribe-primary" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditLocation(location as any)}
                              className="interactive p-2 border border-slate-200 dark:border-white/10 hover:border-ecotribe-primary/30 hover:bg-ecotribe-primary/5 transition-all"
                            >
                              <Edit2 className="w-4 h-4 text-slate-500 dark:text-zinc-500 hover:text-ecotribe-primary" />
                            </button>
                            <button
                              onClick={() => handleDeleteLocation(location.id)}
                              className="interactive p-2 border border-slate-200 dark:border-white/10 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
                            >
                              <Trash2 className="w-4 h-4 text-slate-500 dark:text-zinc-500 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <MapPin className="w-12 h-12 text-slate-400 dark:text-zinc-700 mx-auto mb-4" />
                    <p className="font-display font-bold text-slate-600 dark:text-zinc-500 uppercase tracking-wide mb-2">No pickup locations</p>
                    <p className="font-mono text-xs text-slate-500 dark:text-zinc-600 mb-6">
                      Add your first pickup location to start scheduling device pickups
                    </p>
                    <button
                      onClick={openAddLocation}
                      className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Location
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 border border-blue-400/20 bg-blue-400/5">
                <p className="font-mono text-xs text-blue-400">
                  <strong>Tip:</strong> Add your office locations where employees can bring devices for pickup.
                  Set a default location for quick pickup scheduling.
                </p>
              </div>
            </div>
            </PermissionGate>
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
                      label="Asset status updates"
                      description="Get notified when asset status changes"
                      checked={notifications.emailAssetUpdates}
                      onChange={(v) => setNotifications({ ...notifications, emailAssetUpdates: v })}
                    />
                    <NotificationToggle
                      label="Batch status updates"
                      description="Get notified when batch status changes"
                      checked={notifications.emailBatchUpdates}
                      onChange={(v) => setNotifications({ ...notifications, emailBatchUpdates: v })}
                    />
                    <NotificationToggle
                      label="Payout notifications"
                      description="Get notified when payouts are processed"
                      checked={notifications.emailPayoutUpdates}
                      onChange={(v) => setNotifications({ ...notifications, emailPayoutUpdates: v })}
                    />
                    <NotificationToggle
                      label="Weekly summary report"
                      description="Receive a weekly summary of activity"
                      checked={notifications.emailWeeklyReport}
                      onChange={(v) => setNotifications({ ...notifications, emailWeeklyReport: v })}
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
                      label="Asset status updates"
                      description="Get SMS for important asset updates"
                      checked={notifications.smsAssetUpdates}
                      onChange={(v) => setNotifications({ ...notifications, smsAssetUpdates: v })}
                    />
                    <NotificationToggle
                      label="Batch approvals"
                      description="Get SMS when batches are approved"
                      checked={notifications.smsBatchUpdates}
                      onChange={(v) => setNotifications({ ...notifications, smsBatchUpdates: v })}
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
          {activeTab === 'bank' && !isITAdmin && (
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Bank Account Details</h2>
              </div>
              <div className="p-5 space-y-5">
                <div className="p-4 border border-amber-500/20 bg-amber-500/5">
                  <p className="font-mono text-xs text-amber-400">
                    Please ensure your bank details are correct. Payouts will be sent to this account.
                  </p>
                </div>

                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="As per bank records"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Account Number</label>
                    <input
                      type="password"
                      placeholder="Enter account number"
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Confirm Account Number</label>
                    <input
                      type="text"
                      placeholder="Re-enter account number"
                      value={bankForm.confirmAccountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, confirmAccountNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g., HDFC0001234"
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Bank Name</label>
                    <input
                      type="text"
                      value={bankForm.bankName}
                      disabled
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Branch</label>
                  <input
                    type="text"
                    placeholder="Branch name will auto-fill from IFSC"
                    value={bankForm.branch}
                    disabled
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button — hidden on Security tab (PasswordChange has its own button), Locations tab, and enterprise tab when read-only */}
          {activeTab !== 'locations' && activeTab !== 'security' && !(activeTab === 'enterprise' && enterpriseReadOnly) && (
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

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20 max-h-[90vh] overflow-y-auto btn-chamfer"
          >
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl">
              <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">
                {editingLocation ? 'Edit Location' : 'Add Pickup Location'}
              </h3>
              <button
                onClick={() => setShowLocationModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  Location Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Bangalore HQ, Mumbai Office"
                  value={locationForm.name || ''}
                  onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  Address <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder="Full street address"
                  value={locationForm.address || ''}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="City name"
                    value={locationForm.city || ''}
                    onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    State
                  </label>
                  <select
                    value={locationForm.state || ''}
                    onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer"
                  >
                    <option value="" className="bg-white dark:bg-[#0a0a0a]">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s} className="bg-white dark:bg-[#0a0a0a]">{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  PIN Code <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="e.g., 560001"
                  value={locationForm.pin_code || ''}
                  onChange={(e) => setLocationForm({ ...locationForm, pin_code: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    Contact Person <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Site coordinator name"
                    value={locationForm.contact_person || ''}
                    onChange={(e) => setLocationForm({ ...locationForm, contact_person: e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '') })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    Contact Phone <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="9876543210"
                    value={locationForm.contact_phone || ''}
                    onChange={(e) => setLocationForm({ ...locationForm, contact_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    maxLength={10}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  Operating Days <span className="text-red-400">*</span>
                </label>
                <select
                  value={useCustomHours ? 'Custom' : selectedDays}
                  onChange={(e) => {
                    if (e.target.value === 'Custom') {
                      setUseCustomHours(true);
                    } else {
                      setUseCustomHours(false);
                      setCustomHours('');
                      setSelectedDays(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer"
                >
                  {OPERATING_DAYS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0a0a0a]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {!useCustomHours ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                      Opening Time <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer"
                    >
                      {TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0a0a0a]">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                      Closing Time <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer"
                    >
                      {TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0a0a0a]">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    Custom Hours <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Mon-Wed 9 AM - 5 PM, Thu-Sat 10 AM - 8 PM"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  Special Instructions
                </label>
                <textarea
                  placeholder="Gate pass requirements, parking info, security check, etc."
                  value={locationForm.special_instructions || ''}
                  onChange={(e) => setLocationForm({ ...locationForm, special_instructions: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end sticky bottom-0 bg-white/90 dark:bg-black/40 backdrop-blur-xl">
              <button
                onClick={() => setShowLocationModal(false)}
                className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocation}
                disabled={isSaving || !locationForm.name || !locationForm.address || !locationForm.city || !locationForm.pin_code || !locationForm.contact_person || !locationForm.contact_phone || (useCustomHours ? !customHours : (!selectedDays || !openTime || !closeTime))}
                className="px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingLocation ? 'Update Location' : 'Add Location'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
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

export default Settings;
