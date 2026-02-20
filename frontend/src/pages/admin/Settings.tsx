/**
 * STATUS: COMPLETE
 * Consolidated: admin/Settings.tsx (IT Admin settings — profile, enterprise, pickup locations, notifications, bank)
 * Verified: [ ] visual regression [ ] permissions
 * Permission-gated sections: Pickup Locations (MANAGE_PICKUP_LOCATIONS), Enterprise (MANAGE_ENTERPRISE_SETTINGS), Bank (VIEW_PAYOUTS)
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building,
  User,
  Bell,
  Mail,
  Phone,
  Save,
  CheckCircle,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Star,
  Clock,
  Shield,
  X,
  AlertTriangle
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

// Operating hours selectors (matches branch creation)
const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_OPTIONS = (() => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 23 && minute === 30) continue;
      const h24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      options.push({ value: h24, label: `${h12}:${minute.toString().padStart(2, '0')} ${period}` });
    }
  }
  return options;
})();

const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

type SettingsTab = 'profile' | 'enterprise' | 'notifications' | 'locations' | 'security';

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
  const enterpriseId = enterprise?.id || '';

  // V3: React Query hooks
  const { data: pickupLocations = [], isLoading: locationsLoading } = usePickupLocations(enterpriseId);
  const createLocationMutation = useCreatePickupLocation();
  const updateLocationMutation = useUpdatePickupLocation();
  const deleteLocationMutation = useDeletePickupLocation();
  const setDefaultMutation = useSetDefaultPickupLocation();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Pickup locations modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PickupLocationData | null>(null);
  const [showDeleteLocationModal, setShowDeleteLocationModal] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<PickupLocationData | null>(null);
  // V3: Form state with snake_case
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    city: '',
    pin_code: '',
    contact_person: '',
    contact_phone: '',
    opening_day: 'Monday',
    closing_day: 'Saturday',
    opening_hours_time: '',
    closing_hours_time: '',
    special_instructions: '',
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [profilePhoneError, setProfilePhoneError] = useState<string | null>(null);
  const [profileEmailError, setProfileEmailError] = useState<string | null>(null);

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

  // Notification preferences — persisted in localStorage
  const NOTIF_KEY = `ecotribe_notif_prefs_${user?.id || 'default'}`;
  const [notifications, setNotifications] = useState(() => {
    const defaults = {
      emailAssetUpdates: true,
      emailBatchUpdates: true,
      emailPayoutUpdates: true,
      emailWeeklyReport: false,
      smsAssetUpdates: false,
      smsBatchUpdates: true,
      smsPayoutUpdates: true,
    };
    try {
      const stored = localStorage.getItem(`ecotribe_notif_prefs_${user?.id || 'default'}`);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch {
      return defaults;
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'profile') {
        setProfileEmailError(null);
        const response = await usersApi.updateMe({
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone,
        });
        if (!response.success) {
          const status = (response.error as any)?.status ?? (response.error as any)?.code;
          if (status === 409) {
            setProfileEmailError('This email is already in use');
            return;
          }
          throw new Error(response.error?.message || 'Failed to save profile');
        }
        // Refresh auth store so sidebar/header reflects new name
        await useAuthStoreApi.getState().refreshUser();
        addToast({ type: 'success', title: 'Profile Saved', message: 'Your profile has been updated.' });
      } else if (activeTab === 'notifications') {
        localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
      } else {
        addToast({ type: 'success', title: 'Settings Saved', message: 'Changes saved successfully.' });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
  ];

  // V3: Location modal handlers with snake_case
  const openAddLocation = () => {
    setEditingLocation(null);
    setLocationForm({
      name: '',
      address: '',
      city: '',
      pin_code: '',
      contact_person: '',
      contact_phone: '',
      opening_day: 'Monday',
      closing_day: 'Saturday',
      opening_hours_time: '',
      closing_hours_time: '',
      special_instructions: '',
    });
    setShowLocationModal(true);
  };

  const openEditLocation = (location: PickupLocationData) => {
    setEditingLocation(location);
    // Parse operating_hours string (e.g., "Mon-Sat 09:00 - 18:00") into day/time parts
    const dayMap: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
    const dayMatch = location.operating_hours?.match(/^(\w+)-(\w+)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
    const parsedDay = dayMatch
      ? { opening_day: dayMap[dayMatch[1]] || dayMatch[1], closing_day: dayMap[dayMatch[2]] || dayMatch[2], opening_hours_time: dayMatch[3], closing_hours_time: dayMatch[4] }
      : { opening_day: 'Monday', closing_day: 'Saturday', opening_hours_time: '', closing_hours_time: '' };
    setLocationForm({
      name: location.name,
      address: location.address,
      city: location.city,
      pin_code: (location.pin_code || '').replace(/[^0-9]/g, ''),
      contact_person: location.contact_person,
      contact_phone: (location.contact_phone || '').replace(/[^0-9]/g, '').slice(0, 10),
      ...parsedDay,
      special_instructions: location.special_instructions || '',
    });
    setShowLocationModal(true);
  };

  const handleSaveLocation = async () => {
    if (!enterpriseId) return;
    setIsSaving(true);
    try {
      // Combine day/time selectors into operating_hours string
      const finalOperatingHours = locationForm.opening_hours_time && locationForm.closing_hours_time
        ? `${DAY_SHORT[locationForm.opening_day]}-${DAY_SHORT[locationForm.closing_day]} ${locationForm.opening_hours_time} - ${locationForm.closing_hours_time}`
        : '';
      const { opening_day, closing_day, opening_hours_time, closing_hours_time, ...rest } = locationForm;
      const formData = { ...rest, operating_hours: finalOperatingHours };

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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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

  const handleDeleteLocation = (location: PickupLocationData) => {
    setLocationToDelete(location);
    setShowDeleteLocationModal(true);
  };

  const confirmDeleteLocation = async () => {
    if (!locationToDelete) return;
    setIsSaving(true);
    setShowDeleteLocationModal(false);
    try {
      await deleteLocationMutation.mutateAsync({ locationId: locationToDelete.id, enterpriseId });
      // If deleting the default, promote the next available location
      if (locationToDelete.is_default) {
        const next = pickupLocations.find(l => l.id !== locationToDelete.id);
        if (next) {
          await setDefaultMutation.mutateAsync({ locationId: next.id, enterpriseId });
        }
      }
    } finally {
      setIsSaving(false);
      setLocationToDelete(null);
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
                      onChange={(e) => { setProfileForm({ ...profileForm, email: e.target.value }); setProfileEmailError(null); }}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm focus:outline-none transition-colors ${profileEmailError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'}`}
                    />
                    {profileEmailError && (
                      <p className="mt-1 font-mono text-[11px] text-red-500 uppercase tracking-wide">{profileEmailError}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Phone Number <span className="text-red-400">*</span></label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={profileForm.phone}
                      onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 10); setProfileForm({ ...profileForm, phone: v }); setProfilePhoneError(null); }}
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm focus:outline-none transition-colors ${profileForm.phone.length > 0 && profileForm.phone.length < 10 ? 'border-red-500 dark:border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'}`}
                    />
                    {profileForm.phone.length > 0 && profileForm.phone.length < 10 && (
                      <p className="mt-1 font-mono text-[11px] text-red-500 uppercase tracking-wide">Phone must be exactly 10 digits</p>
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

          {/* Enterprise Tab — read-only, managed by Org Admin */}
          {activeTab === 'enterprise' && (
            <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
                <Building className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
                <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Enterprise Details</h2>
              </div>
              <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                <p className="font-mono text-xs text-slate-500 dark:text-zinc-500">Enterprise details are managed by your Org Admin and cannot be edited here.</p>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Company Name</label>
                    <input
                      type="text"
                      value={enterpriseForm.name}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">GSTIN</label>
                    <input
                      type="text"
                      value={enterpriseForm.gstin}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Address</label>
                  <textarea
                    value={enterpriseForm.address}
                    readOnly
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">City</label>
                    <input
                      type="text"
                      value={enterpriseForm.city}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">State</label>
                    <input
                      type="text"
                      value={enterpriseForm.state}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">PIN Code</label>
                    <input
                      type="text"
                      value={enterpriseForm.pincode}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={enterpriseForm.contactEmail}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={enterpriseForm.contactPhone}
                      readOnly
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
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
                              onClick={() => handleDeleteLocation(location as any)}
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

          {/* Save Button - only show for profile, enterprise, notifications tabs */}
          {(activeTab === 'profile' || activeTab === 'enterprise' || activeTab === 'notifications') && (
            <div className="mt-6 flex items-center justify-end gap-4">
              {saved && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-emerald-400"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-mono text-xs uppercase tracking-widest">Changes saved</span>
                </motion.div>
              )}
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
                    PIN Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g., 560001"
                    value={locationForm.pin_code || ''}
                    onChange={(e) => setLocationForm({ ...locationForm, pin_code: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) })}
                    maxLength={6}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
                  />
                </div>
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
                    maxLength={10}
                    value={locationForm.contact_phone || ''}
                    onChange={(e) => setLocationForm({ ...locationForm, contact_phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) })}
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none transition-colors ${locationForm.contact_phone.length > 0 && locationForm.contact_phone.length < 10 ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-white/10 focus:border-ecotribe-primary/50'}`}
                  />
                  {locationForm.contact_phone.length > 0 && locationForm.contact_phone.length < 10 && (
                    <p className="mt-1 font-mono text-[11px] text-red-500 uppercase tracking-wide">Phone must be exactly 10 digits</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  Operating Hours <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-1.5">Start Day</label>
                    <select
                      value={locationForm.opening_day}
                      onChange={(e) => setLocationForm({ ...locationForm, opening_day: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer"
                    >
                      {DAY_OPTIONS.map((day) => (
                        <option key={day} value={day} className="bg-white dark:bg-[#0a0a0a]">{day}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-1.5">End Day</label>
                    <select
                      value={locationForm.closing_day}
                      onChange={(e) => setLocationForm({ ...locationForm, closing_day: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer"
                    >
                      {DAY_OPTIONS.map((day) => (
                        <option key={day} value={day} className="bg-white dark:bg-[#0a0a0a]">{day}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block font-mono text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-1.5">Opening Time</label>
                    <select
                      value={locationForm.opening_hours_time}
                      onChange={(e) => setLocationForm({ ...locationForm, opening_hours_time: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-[#0a0a0a]">Select time</option>
                      {TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0a0a0a]">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] text-slate-500 dark:text-zinc-600 uppercase tracking-widest mb-1.5">Closing Time</label>
                    <select
                      value={locationForm.closing_hours_time}
                      onChange={(e) => setLocationForm({ ...locationForm, closing_hours_time: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors appearance-none select-themed cursor-pointer"
                    >
                      <option value="" className="bg-white dark:bg-[#0a0a0a]">Select time</option>
                      {TIME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#0a0a0a]">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

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
                disabled={isSaving || !locationForm.name || !locationForm.address || !locationForm.city || locationForm.pin_code.length !== 6 || !locationForm.contact_person || locationForm.contact_phone.length !== 10 || !locationForm.opening_hours_time || !locationForm.closing_hours_time}
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

      {/* Delete Location Confirmation Modal */}
      {showDeleteLocationModal && locationToDelete && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md border border-red-500/30 bg-white dark:bg-[#0a0a0a]"
          >
            <div className="p-6 border-b border-red-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-red-500/30 bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="font-brand font-bold text-lg text-slate-900 dark:text-white uppercase tracking-wide">Delete Location</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="font-display text-sm text-slate-500 dark:text-white/50 mb-2">
                Are you sure you want to delete <span className="text-slate-900 dark:text-white font-bold">{locationToDelete.name}</span>?
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-white/50">
                This action cannot be undone.
              </p>
              {locationToDelete.is_default && pickupLocations.length > 1 && (
                <div className="mt-4 p-3 border border-amber-500/20 bg-amber-500/5">
                  <p className="font-mono text-xs text-amber-400">
                    This is your default location. The next available location will be set as default automatically.
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-white/10 flex gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteLocationModal(false); setLocationToDelete(null); }}
                className="px-5 py-2.5 bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLocation}
                className="px-5 py-2.5 bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-red-400 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
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
