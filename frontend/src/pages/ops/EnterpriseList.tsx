import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Search,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Clock,
  Laptop
} from 'lucide-react';
import { useAllAssets, useEnterprises, useAllBatches } from '@/hooks';

export function EnterpriseList() {
  const navigate = useNavigate();
  // V3: Use React Query hooks for database data
  const { data: assets = [] } = useAllAssets();
  const { data: enterprises = [] } = useEnterprises();
  const { data: batches = [] } = useAllBatches();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter enterprises
  const filteredEnterprises = enterprises
    .filter(e =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.gst_number?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(e => statusFilter === 'all' || e.status === statusFilter);

  // V3: Use snake_case field names from database
  const getEnterpriseStats = (enterpriseId: string) => {
    const enterpriseAssets = assets.filter(a => a.enterprise_id === enterpriseId);
    const enterpriseBatches = batches.filter(b => b.enterprise_id === enterpriseId);
    const totalValue = enterpriseAssets.reduce((sum, a) => sum + (a.final_price || a.base_price || 0), 0);
    const pendingCount = enterpriseAssets.filter(a => !['completed', 'final_accepted', 'final_rejected', 'remote_rejected'].includes(a.status)).length;

    return {
      assetCount: enterpriseAssets.length,
      batchCount: enterpriseBatches.length,
      totalValue,
      pendingCount,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Enterprise Management
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            Enterprises
          </h1>
          <p className="font-display text-slate-500 dark:text-white/50 text-sm mt-2 uppercase tracking-wide">
            {filteredEnterprises.length} registered enterprises
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/ops/enterprises/create')}
          className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Enterprise
        </motion.button>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/50" />
          <input
            type="text"
            placeholder="Search by name, email, or GST..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'inactive', 'pending_verification'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
                statusFilter === status
                  ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                  : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500 dark:text-white/50 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Enterprise Grid */}
      {filteredEnterprises.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEnterprises.map((enterprise, idx) => {
            const stats = getEnterpriseStats(enterprise.id);

            return (
              <motion.div
                key={enterprise.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20 transition-all"
              >
                <div className="p-5 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-7 h-7 text-slate-500 dark:text-white/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white uppercase truncate">
                          {enterprise.name}
                        </h3>
                        <span className={`flex-shrink-0 px-2 py-1 border font-mono font-bold text-[10px] uppercase tracking-widest ${
                          enterprise.status === 'active'
                            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                            : enterprise.status === 'pending_verification'
                            ? 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                            : 'border-zinc-400/30 bg-zinc-400/10 text-slate-500 dark:text-white/50'
                        }`}>
                          {enterprise.status === 'active' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                          {enterprise.status === 'pending_verification' && <Clock className="w-3 h-3 inline mr-1" />}
                          {enterprise.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {enterprise.gst_number && (
                        <p className="font-mono text-xs text-slate-500 dark:text-white/50 mt-1">GST: {enterprise.gst_number}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    {enterprise.contact_person && (
                      <p className="font-display text-sm text-slate-900 dark:text-white">{enterprise.contact_person}</p>
                    )}
                    {enterprise.contact_email && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-white/50">
                        <Mail className="w-4 h-4" />
                        <span className="font-mono text-xs">{enterprise.contact_email}</span>
                      </div>
                    )}
                    {enterprise.contact_phone && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-white/50">
                        <Phone className="w-4 h-4" />
                        <span className="font-mono text-xs">{enterprise.contact_phone}</span>
                      </div>
                    )}
                    {(enterprise.city || enterprise.address) && (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-white/50">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="font-mono text-xs truncate">
                          {enterprise.city || (enterprise.address as any)?.city || 'Unknown location'}
                          {((enterprise.address as any)?.state) ? `, ${(enterprise.address as any).state}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                    <div>
                      <p className="font-brand font-bold text-xl text-slate-900 dark:text-white">{stats.assetCount}</p>
                      <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Assets</p>
                    </div>
                    <div>
                      <p className="font-brand font-bold text-xl text-slate-900 dark:text-white">{stats.batchCount}</p>
                      <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Batches</p>
                    </div>
                    <div>
                      <p className="font-brand font-bold text-xl text-amber-400">{stats.pendingCount}</p>
                      <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Pending</p>
                    </div>
                    <div>
                      <p className="font-brand font-bold text-xl text-ecotribe-primary">
                        ₹{(stats.totalValue / 1000).toFixed(0)}K
                      </p>
                      <p className="font-mono text-[10px] text-slate-500 dark:text-white/50 uppercase">Value</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => navigate(`/ops/enterprises/${enterprise.id}`)}
                    className="w-full interactive py-2.5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center"
        >
          <div className="w-20 h-20 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-slate-500 dark:text-white/50" />
          </div>
          <h3 className="font-brand font-bold text-xl text-slate-500 dark:text-white/50 uppercase tracking-tight mb-2">
            {searchQuery ? 'No Matches Found' : 'No Enterprises'}
          </h3>
          <p className="font-display text-slate-500 dark:text-white/50 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : 'Get started by adding your first enterprise.'}
          </p>
        </motion.div>
      )}

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5">
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-2">Total Enterprises</p>
          <p className="font-brand font-bold text-3xl text-slate-900 dark:text-white">{enterprises.length}</p>
        </div>
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5">
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-2">Active</p>
          <p className="font-brand font-bold text-3xl text-emerald-400">
            {enterprises.filter(e => e.status === 'active').length}
          </p>
        </div>
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5">
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-2">Total Assets</p>
          <p className="font-brand font-bold text-3xl text-blue-400">{assets.length}</p>
        </div>
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5">
          <p className="font-mono text-xs text-slate-500 dark:text-white/50 uppercase mb-2">Total Value</p>
          <p className="font-brand font-bold text-3xl text-ecotribe-primary">
            ₹{(assets.reduce((sum, a) => sum + (a.final_price || a.base_price || 0), 0) / 1000).toFixed(0)}K
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default EnterpriseList;
