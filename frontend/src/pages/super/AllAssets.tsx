import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Laptop, Search, Download, Eye, ArrowLeft, Building2, ChevronDown, ChevronRight, Layers, Loader2 } from 'lucide-react';
import { Input, Button, Card, Badge, PageHeader, InfiniteScrollTrigger, InfiniteScrollInfo } from '@/components/ui';
import { batchesApi } from '@/lib/api/batches';
import { assetsApi } from '@/lib/api/assets';
import { useInfiniteEnterprises } from '@/hooks';
import { glass, text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';

interface Asset {
  id: string;
  enterprise_id: string;
  batch_id?: string;
  serial_number: string;
  brand: string;
  model: string;
  status: string;
  base_price: number;
  assigned_to_user_id?: string;
  assigned_sub_user_name?: string;
  created_at: string;
}

interface Batch {
  id: string;
  name: string;
  enterprise_id: string;
  status: string;
  asset_count: number;
  created_at: string;
}

interface ExpandedEnterpriseData {
  batches: Batch[];
  assets: Asset[];
  loading: boolean;
}

export function AllAssets() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEnterprises, setExpandedEnterprises] = useState<Set<string>>(new Set());
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [expandedData, setExpandedData] = useState<Record<string, ExpandedEnterpriseData>>({});

  // Infinite scroll for enterprises
  const { data: enterprisePages, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteEnterprises();

  const enterprises = useMemo(() => {
    return (enterprisePages?.pages.flatMap(p => p.data || []) ?? []).map(e => ({
      id: e.id,
      name: e.name,
      status: e.status,
      created_at: e.created_at,
    }));
  }, [enterprisePages]);

  const total = enterprisePages?.pages[0]?.pagination?.total ?? 0;

  const toggleEnterprise = async (enterpriseId: string) => {
    if (expandedEnterprises.has(enterpriseId)) {
      setExpandedEnterprises(prev => {
        const n = new Set(prev);
        n.delete(enterpriseId);
        return n;
      });
    } else {
      setExpandedEnterprises(prev => new Set(prev).add(enterpriseId));
      // Lazy load batches and assets for this enterprise
      if (!expandedData[enterpriseId]) {
        setExpandedData(prev => ({
          ...prev,
          [enterpriseId]: { batches: [], assets: [], loading: true },
        }));
        try {
          const [batchRes, assetRes] = await Promise.all([
            batchesApi.list({ enterprise_id: enterpriseId, limit: 100 }),
            assetsApi.list({ enterprise_id: enterpriseId, limit: 100 }),
          ]);
          const batches: Batch[] = (batchRes.success && batchRes.data)
            ? batchRes.data.map(b => ({
                id: b.id,
                name: b.name,
                enterprise_id: b.enterprise_id,
                status: b.status,
                asset_count: b.asset_count || 0,
                created_at: b.created_at,
              }))
            : [];
          const assets: Asset[] = (assetRes.success && assetRes.data)
            ? assetRes.data.map(a => ({
                id: a.id,
                enterprise_id: a.enterprise_id,
                batch_id: a.batch_id,
                serial_number: a.serial_number,
                brand: a.brand || '',
                model: a.model || '',
                status: a.status,
                base_price: a.base_price || 0,
                assigned_to_user_id: a.assigned_to_user_id,
                created_at: a.created_at,
              }))
            : [];
          setExpandedData(prev => ({
            ...prev,
            [enterpriseId]: { batches, assets, loading: false },
          }));
        } catch (error) {
          console.error('Error fetching enterprise data:', error);
          setExpandedData(prev => ({
            ...prev,
            [enterpriseId]: { batches: [], assets: [], loading: false },
          }));
        }
      }
    }
  };

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-slate-500',
      pending_assignment: 'bg-amber-500',
      assigned: 'bg-blue-500',
      check_in_started: 'bg-indigo-500',
      submitted: 'bg-purple-500',
      remote_review: 'bg-violet-500',
      conditionally_accepted: 'bg-cyan-500',
      ready_for_pickup: 'bg-teal-500',
      pickup_requested: 'bg-sky-500',
      pickup_scheduled: 'bg-blue-600',
      picked_up: 'bg-indigo-600',
      in_transit: 'bg-purple-600',
      facility_qc: 'bg-violet-600',
      final_accepted: 'bg-emerald-500',
      payout_pending: 'bg-lime-500',
      completed: 'bg-green-600',
      rejected: 'bg-red-500',
    };
    return statusColors[status] || 'bg-gray-500';
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Build grouped data from enterprises + lazy loaded expanded data
  const enterpriseData = useMemo(() => {
    return enterprises.map(enterprise => {
      const eData = expandedData[enterprise.id];
      if (!eData || eData.loading) {
        return {
          enterprise,
          batches: [] as { batch: Batch; assets: Asset[] }[],
          unbatchedAssets: [] as Asset[],
          loading: eData?.loading ?? false,
        };
      }

      const batchesWithAssets = eData.batches.map(batch => ({
        batch,
        assets: eData.assets.filter(a => a.batch_id === batch.id),
      }));

      const unbatchedAssets = eData.assets.filter(a => !a.batch_id);

      return {
        enterprise,
        batches: batchesWithAssets,
        unbatchedAssets,
        loading: false,
      };
    });
  }, [enterprises, expandedData]);

  // Calculate total stats from loaded data
  const loadedStats = useMemo(() => {
    let totalAssets = 0;
    let totalBatches = 0;
    for (const eData of Object.values(expandedData)) {
      if (!eData.loading) {
        totalAssets += eData.assets.length;
        totalBatches += eData.batches.length;
      }
    }
    return { totalAssets, totalBatches, totalEnterprises: enterprises.length };
  }, [expandedData, enterprises.length]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return enterpriseData;
    const term = searchTerm.toLowerCase();
    return enterpriseData
      .map(ed => ({
        ...ed,
        batches: ed.batches
          .map(b => ({
            ...b,
            assets: b.assets.filter(
              a =>
                a.serial_number.toLowerCase().includes(term) ||
                a.brand.toLowerCase().includes(term) ||
                a.model.toLowerCase().includes(term)
            ),
          }))
          .filter(b => b.assets.length > 0 || searchTerm === ''),
        unbatchedAssets: ed.unbatchedAssets.filter(
          a =>
            a.serial_number.toLowerCase().includes(term) ||
            a.brand.toLowerCase().includes(term) ||
            a.model.toLowerCase().includes(term)
        ),
      }))
      .filter(
        ed =>
          ed.enterprise.name.toLowerCase().includes(term) ||
          ed.batches.length > 0 ||
          ed.unbatchedAssets.length > 0 ||
          searchTerm === ''
      );
  }, [enterpriseData, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Super Admin"
        title="All Assets"
        subtitle="Organized by Enterprise and Batch"
        actions={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/super')}
              leftIcon={<ArrowLeft className={iconSize.sm} />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              leftIcon={<Download className={iconSize.sm} />}
            >
              Export
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Total Enterprises</p>
              <p className={`font-brand text-3xl font-bold ${text.primary} mt-1`}>{loadedStats.totalEnterprises}</p>
            </div>
            <Building2 className={`${iconSize.xl} text-blue-500`} />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Total Batches</p>
              <p className={`font-brand text-3xl font-bold text-amber-500 mt-1`}>{loadedStats.totalBatches}</p>
            </div>
            <Layers className={`${iconSize.xl} text-amber-500`} />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Total Assets</p>
              <p className={`font-brand text-3xl font-bold text-emerald-500 mt-1`}>{loadedStats.totalAssets}</p>
            </div>
            <Laptop className={`${iconSize.xl} text-emerald-500`} />
          </div>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6">
          <Input
            placeholder="Search by enterprise, batch, serial number, brand, or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className={iconSize.sm} />}
          />
        </Card>
      </motion.div>

      {/* Hierarchical List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {isLoading ? (
          <Card className="p-12 text-center">
            <p className={`font-mono text-sm ${text.muted}`}>Loading enterprises...</p>
          </Card>
        ) : filteredData.length === 0 ? (
          <Card className="p-12 text-center">
            <p className={`font-mono text-sm ${text.muted}`}>No enterprises found</p>
          </Card>
        ) : (
          filteredData.map((enterpriseItem, enterpriseIndex) => {
            const isEnterpriseExpanded = expandedEnterprises.has(enterpriseItem.enterprise.id);
            const enterpriseAssetCount =
              enterpriseItem.batches.reduce((sum, b) => sum + b.assets.length, 0) +
              enterpriseItem.unbatchedAssets.length;

            return (
              <motion.div
                key={enterpriseItem.enterprise.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * enterpriseIndex }}
              >
                <Card>
                  {/* Enterprise Header */}
                  <button
                    onClick={() => toggleEnterprise(enterpriseItem.enterprise.id)}
                    className={`w-full p-6 text-left ${hoverStyles.row} flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 border border-blue-500/30 dark:border-blue-400/20 bg-blue-50/80 dark:bg-blue-500/10 flex items-center justify-center">
                        <Building2 className={`${iconSize.lg} text-blue-700 dark:text-blue-400`} />
                      </div>
                      <div>
                        <h3 className={`font-brand font-bold text-lg uppercase ${text.primary}`}>
                          {enterpriseItem.enterprise.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={enterpriseItem.enterprise.status === 'active' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {enterpriseItem.enterprise.status}
                          </Badge>
                          {isEnterpriseExpanded && !enterpriseItem.loading && (
                            <p className={`font-mono text-xs ${text.muted}`}>
                              {enterpriseItem.batches.length} batches • {enterpriseAssetCount} assets
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {isEnterpriseExpanded ? (
                      <ChevronDown className={`${iconSize.md} ${text.muted}`} />
                    ) : (
                      <ChevronRight className={`${iconSize.md} ${text.muted}`} />
                    )}
                  </button>

                  {/* Batches and Assets */}
                  {isEnterpriseExpanded && (
                    <div className="border-t border-slate-200/80 dark:border-zinc-800">
                      {enterpriseItem.loading ? (
                        <div className="p-8 text-center flex items-center justify-center gap-2">
                          <Loader2 className={`${iconSize.sm} ${text.muted} animate-spin`} />
                          <p className={`font-mono text-sm ${text.muted}`}>Loading batches and assets...</p>
                        </div>
                      ) : enterpriseItem.batches.length === 0 && enterpriseItem.unbatchedAssets.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className={`font-mono text-sm ${text.muted}`}>
                            No batches or assets yet
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                          {/* Batches */}
                          {enterpriseItem.batches.map((batchItem) => {
                            const isBatchExpanded = expandedBatches.has(batchItem.batch.id);

                            return (
                              <div key={batchItem.batch.id}>
                                {/* Batch Header */}
                                <button
                                  onClick={() => toggleBatch(batchItem.batch.id)}
                                  className={`w-full p-4 pl-20 text-left ${hoverStyles.row} flex items-center justify-between`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 border border-amber-500/30 dark:border-amber-400/20 bg-amber-50/80 dark:bg-amber-500/10 flex items-center justify-center">
                                      <Layers className={`${iconSize.md} text-amber-700 dark:text-amber-400`} />
                                    </div>
                                    <div>
                                      <p className={`font-display text-sm font-bold uppercase ${text.primary}`}>
                                        {batchItem.batch.name}
                                      </p>
                                      <p className={`font-mono text-xs ${text.muted}`}>
                                        {batchItem.assets.length} assets
                                      </p>
                                    </div>
                                  </div>
                                  {isBatchExpanded ? (
                                    <ChevronDown className={`${iconSize.sm} ${text.muted}`} />
                                  ) : (
                                    <ChevronRight className={`${iconSize.sm} ${text.muted}`} />
                                  )}
                                </button>

                                {/* Assets in Batch */}
                                {isBatchExpanded && (
                                  <div className="bg-slate-50/50 dark:bg-zinc-900/30">
                                    {batchItem.assets.length === 0 ? (
                                      <div className="p-6 pl-32 text-center">
                                        <p className={`font-mono text-sm ${text.muted}`}>No assets in this batch</p>
                                      </div>
                                    ) : (
                                      <div className="divide-y divide-slate-200/40 dark:divide-zinc-800/40">
                                        {batchItem.assets.map((asset) => (
                                          <div
                                            key={asset.id}
                                            className={`p-4 pl-32 flex items-center justify-between ${hoverStyles.row}`}
                                          >
                                            <div className="flex items-center gap-4">
                                              <Laptop className={`${iconSize.md} ${text.muted}`} />
                                              <div>
                                                <p className={`font-mono text-sm font-bold ${text.primary}`}>
                                                  {asset.serial_number}
                                                </p>
                                                <p className={`font-display text-xs uppercase ${text.muted}`}>
                                                  {asset.brand} {asset.model}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                              <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 ${getStatusColor(asset.status)} rounded-full`} />
                                                <span className={`font-mono text-xs uppercase ${text.primary}`}>
                                                  {formatStatus(asset.status)}
                                                </span>
                                              </div>
                                              <p className={`font-mono text-sm font-bold ${text.primary}`}>
                                                ₹{asset.base_price.toLocaleString()}
                                              </p>
                                              <button
                                                onClick={() => navigate(`/super/assets/${asset.id}`)}
                                                className={`p-2 hover:bg-lime-500/10 transition-colors ${text.muted} hover:text-lime-500`}
                                                title="View Details"
                                              >
                                                <Eye className={iconSize.sm} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Unbatched Assets */}
                          {enterpriseItem.unbatchedAssets.length > 0 && (
                            <div>
                              <div className="p-4 pl-20 bg-slate-100/50 dark:bg-zinc-800/30">
                                <p className={`font-display text-sm font-bold uppercase ${text.primary}`}>
                                  Unbatched Assets ({enterpriseItem.unbatchedAssets.length})
                                </p>
                              </div>
                              <div className="divide-y divide-slate-200/40 dark:divide-zinc-800/40 bg-slate-50/50 dark:bg-zinc-900/30">
                                {enterpriseItem.unbatchedAssets.map((asset) => (
                                  <div
                                    key={asset.id}
                                    className={`p-4 pl-32 flex items-center justify-between ${hoverStyles.row}`}
                                  >
                                    <div className="flex items-center gap-4">
                                      <Laptop className={`${iconSize.md} ${text.muted}`} />
                                      <div>
                                        <p className={`font-mono text-sm font-bold ${text.primary}`}>
                                          {asset.serial_number}
                                        </p>
                                        <p className={`font-display text-xs uppercase ${text.muted}`}>
                                          {asset.brand} {asset.model}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 ${getStatusColor(asset.status)} rounded-full`} />
                                        <span className={`font-mono text-xs uppercase ${text.primary}`}>
                                          {formatStatus(asset.status)}
                                        </span>
                                      </div>
                                      <p className={`font-mono text-sm font-bold ${text.primary}`}>
                                        ₹{asset.base_price.toLocaleString()}
                                      </p>
                                      <button
                                        onClick={() => navigate(`/super/assets/${asset.id}`)}
                                        className={`p-2 hover:bg-lime-500/10 transition-colors ${text.muted} hover:text-lime-500`}
                                        title="View Details"
                                      >
                                        <Eye className={iconSize.sm} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Infinite Scroll Trigger + Info */}
      <InfiniteScrollTrigger
        hasNextPage={hasNextPage ?? false}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
      <InfiniteScrollInfo
        loadedCount={enterprises.length}
        totalCount={total}
      />
    </div>
  );
}
