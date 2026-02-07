import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, Plus, Mail, Phone, MapPin, Clock, Ban, ExternalLink, Search, Power, CheckCircle } from 'lucide-react';
import { PageHeader, StatBox, Modal, Button, Spinner, ConfirmationModal } from '@/components/ui';
import { enterprisesApi } from '@/lib/api';
import type { Enterprise } from '@/types';

export function Enterprises() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [activeEnterprises, setActiveEnterprises] = useState<Enterprise[]>([]);
  const [inactiveEnterprises, setInactiveEnterprises] = useState<Enterprise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusChangeTarget, setStatusChangeTarget] = useState<{ enterprise: Enterprise; newStatus: 'active' | 'inactive' } | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const handleStatusChange = async () => {
    if (!statusChangeTarget) return;
    setIsChangingStatus(true);
    try {
      const result = await enterprisesApi.update(statusChangeTarget.enterprise.id, {
        status: statusChangeTarget.newStatus,
      });
      if (result.success) {
        await fetchEnterprises();
        setIsModalOpen(false);
        setSelectedEnterprise(null);
      }
    } catch (error) {
      console.error('Error changing enterprise status:', error);
    } finally {
      setIsChangingStatus(false);
      setStatusChangeTarget(null);
    }
  };

  const fetchEnterprises = async () => {
    setIsLoading(true);
    try {
      // Fetch all enterprises via REST API
      const response = await enterprisesApi.list();

      if (response.data) {
        const enterprises: Enterprise[] = response.data.map((row: any) => ({
          id: row.id,
          name: row.name,
          legalName: row.legal_name,
          gstNumber: row.gst_number,
          panNumber: row.pan_number,
          address: row.address,
          status: row.status,
          contactPerson: row.contact_person,
          contactEmail: row.contact_email,
          contactPhone: row.contact_phone,
          industry: row.industry,
          companySize: row.company_size,
          logoUrl: row.logo_url,
          bankDetails: row.bank_details,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
        }));

        // Separate active and inactive (V3: pending applications are in enterprise_applications table)
        setActiveEnterprises(enterprises.filter(e => e.status === 'active'));
        setInactiveEnterprises(enterprises.filter(e => e.status === 'inactive' || (e.status as any) === 'suspended'));
      }
    } catch (error) {
      console.error('Error fetching enterprises:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnterprises();
  }, []);

  const handleViewDetails = (enterprise: Enterprise) => {
    setSelectedEnterprise(enterprise);
    setIsModalOpen(true);
  };

  const filteredActive = useMemo(() => {
    if (!searchQuery.trim()) return activeEnterprises;
    const q = searchQuery.toLowerCase();
    return activeEnterprises.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.contactEmail?.toLowerCase().includes(q) ||
      e.gstNumber?.toLowerCase().includes(q) ||
      e.contactPerson?.toLowerCase().includes(q) ||
      (e as any).industry?.toLowerCase().includes(q)
    );
  }, [activeEnterprises, searchQuery]);

  const filteredInactive = useMemo(() => {
    if (!searchQuery.trim()) return inactiveEnterprises;
    const q = searchQuery.toLowerCase();
    return inactiveEnterprises.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.contactEmail?.toLowerCase().includes(q) ||
      e.gstNumber?.toLowerCase().includes(q) ||
      e.contactPerson?.toLowerCase().includes(q) ||
      (e as any).industry?.toLowerCase().includes(q)
    );
  }, [inactiveEnterprises, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Management"
        subtitle="Manage enterprise registrations and approvals"
        actions={
          <button
            onClick={() => navigate('/super/enterprises/create')}
            className="px-4 py-2 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest border border-ecotribe-primary/40 hover:bg-white transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Enterprise
          </button>
        }
      />

      {/* Info Banner - Link to Applications */}
      <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
        <Clock className="w-5 h-5 flex-shrink-0" />
        <p className="font-mono text-xs">
          To review new enterprise registration applications, go to{' '}
          <button
            onClick={() => navigate('/super/applications')}
            className="underline hover:text-blue-500 inline-flex items-center gap-1"
          >
            Applications <ExternalLink className="w-3 h-3" />
          </button>
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30 dark:text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, email, GST, contact person, or industry..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 font-mono text-xs focus:outline-none focus:border-ecotribe-primary pl-12 pr-4 py-3 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-zinc-600"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatBox
          label="Active Enterprises"
          value={activeEnterprises.length}
          icon={<Building2 className="w-5 h-5" />}
          accent="success"
        />
        <StatBox
          label="Inactive/Suspended"
          value={inactiveEnterprises.length}
          icon={<Ban className="w-5 h-5" />}
          accent="warning"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-black/10 dark:border-white/10">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
            activeTab === 'active'
              ? 'border-b-2 border-ecotribe-primary text-ecotribe-primary'
              : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
          }`}
        >
          Active ({activeEnterprises.length})
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
            activeTab === 'inactive'
              ? 'border-b-2 border-ecotribe-primary text-ecotribe-primary'
              : 'text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white'
          }`}
        >
          Inactive ({inactiveEnterprises.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'active' ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredActive.length === 0 ? (
                <div className="col-span-full text-center py-12 text-black/50 dark:text-white/50 font-mono text-sm">
                  {searchQuery ? 'No matching active enterprises' : 'No active enterprises'}
                </div>
              ) : (
                filteredActive.map((enterprise) => (
                  <EnterpriseCard
                    key={enterprise.id}
                    enterprise={enterprise}
                    onView={handleViewDetails}
                    onDeactivate={() => setStatusChangeTarget({ enterprise, newStatus: 'inactive' })}
                  />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="inactive"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredInactive.length === 0 ? (
                <div className="col-span-full text-center py-12 text-black/50 dark:text-white/50 font-mono text-sm">
                  {searchQuery ? 'No matching inactive enterprises' : 'No inactive enterprises'}
                </div>
              ) : (
                filteredInactive.map((enterprise) => (
                  <InactiveEnterpriseCard
                    key={enterprise.id}
                    enterprise={enterprise}
                    onView={handleViewDetails}
                    onActivate={() => setStatusChangeTarget({ enterprise, newStatus: 'active' })}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEnterprise(null);
        }}
        title="Enterprise Details"
      >
        {selectedEnterprise && (
          <div className="space-y-6">
            {/* Status Badge + Toggle */}
            <div className="flex items-center justify-between">
              <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border ${
                selectedEnterprise.status === 'active'
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
                  : 'border-red-400/40 bg-red-400/10 text-red-400'
              }`}>
                {selectedEnterprise.status}
              </span>
              {selectedEnterprise.status === 'active' ? (
                <button
                  onClick={() => setStatusChangeTarget({ enterprise: selectedEnterprise, newStatus: 'inactive' })}
                  className="flex items-center gap-2 px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-xs uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" /> Deactivate
                </button>
              ) : (
                <button
                  onClick={() => setStatusChangeTarget({ enterprise: selectedEnterprise, newStatus: 'active' })}
                  className="flex items-center gap-2 px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Activate
                </button>
              )}
            </div>

            {/* Enterprise Info */}
            <div className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 block mb-1">
                  Enterprise Name
                </label>
                <p className="font-display font-bold text-lg text-black dark:text-white">
                  {selectedEnterprise.name}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 block mb-1">
                    Industry
                  </label>
                  <p className="font-mono text-sm text-black dark:text-white capitalize">
                    {(selectedEnterprise as any).industry || '-'}
                  </p>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 block mb-1">
                    Company Size
                  </label>
                  <p className="font-mono text-sm text-black dark:text-white">
                    {(selectedEnterprise as any).companySize || '-'}
                  </p>
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 block mb-1">
                  Contact Person
                </label>
                <p className="font-display text-sm text-black dark:text-white">
                  {selectedEnterprise.contactPerson || '-'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-ecotribe-primary" />
                  <p className="font-mono text-xs text-black dark:text-white">
                    {selectedEnterprise.contactEmail || '-'}
                  </p>
                </div>
                {selectedEnterprise.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-ecotribe-primary" />
                    <p className="font-mono text-xs text-black dark:text-white">
                      {selectedEnterprise.contactPhone}
                    </p>
                  </div>
                )}
              </div>

              {selectedEnterprise.address && (
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 block mb-1">
                    Address
                  </label>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-ecotribe-primary flex-shrink-0 mt-0.5" />
                    <p className="font-mono text-xs text-black dark:text-white">
                      {selectedEnterprise.address.line1}
                      {selectedEnterprise.address.line2 && `, ${selectedEnterprise.address.line2}`}
                      <br />
                      {selectedEnterprise.address.city}, {selectedEnterprise.address.state} {selectedEnterprise.address.pincode || (selectedEnterprise.address as any).pinCode}
                      <br />
                      {selectedEnterprise.address.country}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Status Change Confirmation */}
      <ConfirmationModal
        isOpen={!!statusChangeTarget}
        onClose={() => setStatusChangeTarget(null)}
        onConfirm={handleStatusChange}
        title={statusChangeTarget?.newStatus === 'active' ? 'Activate Enterprise' : 'Deactivate Enterprise'}
        description={
          statusChangeTarget?.newStatus === 'active'
            ? `Are you sure you want to activate "${statusChangeTarget?.enterprise.name}"? This will restore full access for all users under this enterprise.`
            : `Are you sure you want to deactivate "${statusChangeTarget?.enterprise.name}"? All users under this enterprise will lose access.`
        }
        confirmText={statusChangeTarget?.newStatus === 'active' ? 'Activate' : 'Deactivate'}
        variant={statusChangeTarget?.newStatus === 'active' ? 'info' : 'danger'}
        isLoading={isChangingStatus}
      />
    </div>
  );
}

function EnterpriseCard({ enterprise, onView, onDeactivate }: { enterprise: Enterprise; onView: (e: Enterprise) => void; onDeactivate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/40 p-4 space-y-3 hover:border-ecotribe-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-ecotribe-primary" />
          <h3 className="font-display font-bold text-sm text-black dark:text-white">
            {enterprise.name}
          </h3>
        </div>
        <span className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border border-emerald-400/40 bg-emerald-400/10 text-emerald-400">
          Active
        </span>
      </div>

      <div className="space-y-2 text-sm text-black/60 dark:text-white/60 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <span>{enterprise.contactEmail}</span>
        </div>
        {enterprise.contactPhone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>{enterprise.contactPhone}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onView(enterprise)}
          className="flex-1 px-3 py-2 bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 text-black dark:text-white font-mono text-xs uppercase tracking-widest hover:border-ecotribe-primary transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" /> View
        </button>
        <button
          onClick={onDeactivate}
          className="px-3 py-2 border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 font-mono text-xs uppercase tracking-widest hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
          title="Deactivate enterprise"
        >
          <Ban className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function InactiveEnterpriseCard({ enterprise, onView, onActivate }: { enterprise: Enterprise; onView: (e: Enterprise) => void; onActivate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-red-500/30 bg-red-500/5 p-4 space-y-3 hover:border-red-500/50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-red-500" />
          <h3 className="font-display font-bold text-sm text-black dark:text-white">
            {enterprise.name}
          </h3>
        </div>
        <span className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border border-red-500/40 bg-red-500/10 text-red-500 capitalize">
          {enterprise.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-black/60 dark:text-white/60 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <span>{enterprise.contactEmail || '-'}</span>
        </div>
        {enterprise.contactPhone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>{enterprise.contactPhone}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <Ban className="w-4 h-4" />
          <span>Since {enterprise.updatedAt?.toLocaleDateString() || enterprise.createdAt.toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onView(enterprise)}
          className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/30 text-black dark:text-white font-mono text-xs uppercase tracking-widest hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" /> View
        </button>
        <button
          onClick={onActivate}
          className="px-3 py-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs uppercase tracking-widest hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
          title="Activate enterprise"
        >
          <CheckCircle className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
