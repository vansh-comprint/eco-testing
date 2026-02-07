import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Phone,
  Clock,
  AlertCircle,
  Star,
  Loader2,
} from 'lucide-react';
import {
  useAuth,
  usePickupLocations,
  useCreatePickupLocation,
  useUpdatePickupLocation,
  useDeletePickupLocation,
  useSetDefaultPickupLocation,
} from '@/hooks';
import { ConfirmationModal } from '@/components/ui';

// V3: Database pickup location type (snake_case)
interface PickupLocation {
  id: string;
  enterprise_id: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  contact_person?: string;
  contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  is_default?: boolean;
  status?: string;
  created_at: string;
  updated_at?: string;
}

interface CreatePickupLocationInput {
  enterprise_id: string;
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pin_code: string;
  contact_person?: string;
  contact_phone?: string;
  operating_hours?: string;
  special_instructions?: string;
  is_default?: boolean;
}

export function PickupLocations() {
  // V3: Use React Query hook for auth
  const { user, enterprise } = useAuth();
  const enterpriseId = enterprise?.id || '';

  // V3: React Query hooks for data fetching
  const { data: pickupLocations = [], isLoading } = usePickupLocations(enterpriseId);
  const createLocationMutation = useCreatePickupLocation();
  const updateLocationMutation = useUpdatePickupLocation();
  const deleteLocationMutation = useDeletePickupLocation();
  const setDefaultMutation = useSetDefaultPickupLocation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<PickupLocation | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleCreateLocation = async (input: CreatePickupLocationInput) => {
    try {
      await createLocationMutation.mutateAsync(input as any);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create location:', error);
      alert('Failed to create location. Please try again.');
    }
  };

  const handleSetDefault = async (locationId: string) => {
    if (!enterpriseId) return;
    try {
      await setDefaultMutation.mutateAsync({ locationId, enterpriseId });
    } catch (error) {
      console.error('Failed to set default location:', error);
    }
  };

  const handleDelete = (locationId: string) => {
    setPendingDeleteId(locationId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteLocationMutation.mutateAsync({ locationId: pendingDeleteId, enterpriseId });
      setShowDeleteModal(false);
      setPendingDeleteId(null);
    } catch (error) {
      console.error('Failed to delete location:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-ecotribe-primary mx-auto mb-4" />
          <p className="font-display font-bold uppercase tracking-wide text-slate-500 dark:text-white/50">Loading pickup locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
              Logistics
            </span>
            <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
              Pickup Locations
            </h1>
            <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
              Manage your enterprise pickup locations
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest border border-ecotribe-primary/40 hover:bg-white transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </motion.div>
      </div>

      {/* Locations Grid */}
      {pickupLocations.length === 0 ? (
        <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 py-16 px-6 text-center">
          <div className="w-20 h-20 bg-slate-200 dark:bg-white/10 flex items-center justify-center mx-auto mb-6">
            <MapPin className="w-10 h-10 text-slate-500 dark:text-white/50" />
          </div>
          <h3 className="text-lg font-bold text-slate-500 dark:text-white/50 mb-2">No Locations Yet</h3>
          <p className="text-sm text-slate-500 dark:text-white/50 max-w-xs mx-auto mb-4">
            Add your first pickup location to start scheduling device pickups.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="interactive px-4 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all"
          >
            Add First Location
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pickupLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location as any}
              onSetDefault={handleSetDefault}
              onEdit={setEditingLocation}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingLocation) && (
        <LocationModal
          location={editingLocation}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingLocation(null);
          }}
          onSave={async (input) => {
            if (editingLocation) {
              await updateLocationMutation.mutateAsync({
                locationId: editingLocation.id,
                updates: input,
              });
              setEditingLocation(null);
            } else {
              await handleCreateLocation(input);
            }
          }}
          enterpriseId={enterpriseId}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Pickup Location?"
        description={`Are you sure you want to delete "${pickupLocations.find(l => l.id === pendingDeleteId)?.name || 'this location'}"? This location will no longer be available for scheduling pickups.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteLocationMutation.isPending}
      />
    </div>
  );
}

// Location Card Component
interface LocationCardProps {
  location: PickupLocation;
  onSetDefault: (id: string) => void;
  onEdit: (location: PickupLocation) => void;
  onDelete: (id: string) => void;
}

function LocationCard({ location, onSetDefault, onEdit, onDelete }: LocationCardProps) {
  // V3: Combine address fields for display
  const fullAddress = location.address_line2
    ? `${location.address_line1}, ${location.address_line2}`
    : location.address_line1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 relative"
    >
      {/* Default Badge */}
      {location.is_default && (
        <div className="absolute top-3 right-3 bg-ecotribe-primary/20 border border-ecotribe-primary/30 px-2 py-1 flex items-center gap-1">
          <Star className="w-3 h-3 text-ecotribe-primary fill-ecotribe-primary" />
          <span className="text-[10px] font-bold uppercase text-ecotribe-primary">Default</span>
        </div>
      )}

      {/* Location Name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-ecotribe-primary/20 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-ecotribe-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white truncate">{location.name}</h3>
          <p className="text-xs text-slate-500 dark:text-white/50">
            {location.city}, {location.pin_code}
          </p>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2 mb-4">
        <p className="text-xs text-slate-600 dark:text-white/60">
          {fullAddress}
        </p>

        {/* Contact Info */}
        <div className="flex flex-col gap-1">
          {location.contact_phone && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60">
              <Phone className="w-3 h-3" />
              <span>{location.contact_phone}</span>
            </div>
          )}
          {location.operating_hours && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60">
              <Clock className="w-3 h-3" />
              <span>{location.operating_hours}</span>
            </div>
          )}
        </div>

        {location.special_instructions && (
          <div className="bg-blue-500/10 border border-blue-500/20 px-2 py-1.5 flex gap-2">
            <AlertCircle className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 dark:text-blue-300">{location.special_instructions}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
        {!location.is_default && (
          <button
            onClick={() => onSetDefault(location.id)}
            className="flex-1 px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-ecotribe-primary/20 border border-transparent hover:border-ecotribe-primary/30 font-mono font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1"
          >
            <Star className="w-3 h-3" />
            Set Default
          </button>
        )}
        <button
          onClick={() => onEdit(location)}
          className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-blue-500/20 border border-transparent hover:border-blue-500/30 font-mono font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1"
        >
          <Edit className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => onDelete(location.id)}
          className="px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-red-500/20 border border-transparent hover:border-red-500/30 font-mono font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </motion.div>
  );
}

// Location Modal Component
interface LocationModalProps {
  location: PickupLocation | null;
  onClose: () => void;
  onSave: (input: CreatePickupLocationInput) => Promise<void>;
  enterpriseId: string;
}

function LocationModal({ location, onClose, onSave, enterpriseId }: LocationModalProps) {
  // V3: Use snake_case for form data to match database
  const [formData, setFormData] = useState<CreatePickupLocationInput>({
    enterprise_id: enterpriseId,
    name: location?.name || '',
    address_line1: location?.address_line1 || '',
    address_line2: location?.address_line2 || '',
    city: location?.city || '',
    state: location?.state || '',
    pin_code: location?.pin_code || '',
    contact_person: location?.contact_person || '',
    contact_phone: location?.contact_phone || '',
    operating_hours: location?.operating_hours || 'Mon-Fri, 9 AM - 6 PM',
    special_instructions: location?.special_instructions || '',
    is_default: location?.is_default || false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save location:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-slate-200 dark:border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl z-10">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-mono uppercase tracking-widest">
            {location ? 'Edit Location' : 'Add Location'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Location Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
              Location Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Bangalore HQ, Mumbai Office"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary"
            />
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
              Address Line 1 *
            </label>
            <input
              type="text"
              required
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="Building name, street address"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary"
            />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              value={formData.address_line2 || ''}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
              placeholder="Area, landmark (optional)"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary"
            />
          </div>

          {/* City, State & Pin Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                State *
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                Pin Code *
              </label>
              <input
                type="text"
                required
                value={formData.pin_code}
                onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary"
              />
            </div>
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                Contact Person *
              </label>
              <input
                type="text"
                required
                value={formData.contact_person || ''}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
                Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary"
              />
            </div>
          </div>

          {/* Operating Hours */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
              Operating Hours *
            </label>
            <input
              type="text"
              required
              value={formData.operating_hours || ''}
              onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
              placeholder="e.g., Mon-Fri, 9 AM - 6 PM"
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary"
            />
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-white/60 mb-2">
              Special Instructions
            </label>
            <textarea
              value={formData.special_instructions || ''}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              rows={2}
              placeholder="Gate pass requirements, parking info, etc."
              className="w-full px-3 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-ecotribe-primary focus:ring-1 focus:ring-ecotribe-primary resize-none"
            />
          </div>

          {/* Set as Default */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_default || false}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              className="w-4 h-4 accent-ecotribe-primary"
            />
            <span className="text-sm text-slate-900 dark:text-white">Set as default location</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-white/20 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {location ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default PickupLocations;
