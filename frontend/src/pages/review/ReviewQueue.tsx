import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Laptop, Clock, ArrowRight, Filter, Search } from 'lucide-react';
import { useState } from 'react';
import { useAllAssets } from '@/hooks';

export function ReviewQueue() {
  const navigate = useNavigate();
  const { data: assets = [] } = useAllAssets();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Get assets pending remote review
  const pendingAssets = assets.filter(a => a.status === 'submitted');

  // Filter and sort
  const filteredAssets = pendingAssets
    .filter(a =>
      a.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serial_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-2">
            Remote Review
          </span>
          <h1 className="font-brand font-bold text-3xl text-slate-900 dark:text-white uppercase tracking-tight">
            Review Queue
          </h1>
          <p className="font-display text-zinc-500 text-sm mt-2 uppercase tracking-wide">
            {filteredAssets.length} devices pending review
          </p>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by brand, model, or serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-display placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:border-ecotribe-primary focus:outline-none transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('newest')}
            className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
              sortBy === 'newest'
                ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortBy('oldest')}
            className={`interactive px-4 py-3 border font-mono font-bold text-xs uppercase tracking-widest transition-all ${
              sortBy === 'oldest'
                ? 'border-ecotribe-primary bg-ecotribe-primary/10 text-ecotribe-primary'
                : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            Oldest
          </button>
        </div>
      </motion.div>

      {/* Queue List */}
      {filteredAssets.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]"
        >
          <div className="divide-y divide-slate-200 dark:divide-white/5">
            {filteredAssets.map((asset, idx) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Laptop className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white uppercase truncate">
                      {asset.brand} {asset.model}
                    </h3>
                    <p className="font-mono text-xs text-zinc-500">S/N: {asset.serial_number}</p>
                    <div className="flex items-center gap-4 mt-1 sm:mt-2">
                      <span className="font-mono text-xs text-zinc-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(asset.created_at).toLocaleDateString()}
                      </span>
                      {asset.enterprises?.name && (
                        <span className="font-mono text-xs text-zinc-600 truncate">
                          {asset.enterprises.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="px-3 py-1.5 border border-blue-400/30 bg-blue-400/10 font-mono font-bold text-xs text-blue-400 uppercase tracking-widest hidden sm:inline">
                    Pending
                  </span>
                  <button
                    onClick={() => navigate(`/review/queue/${asset.id}`)}
                    className="interactive px-5 py-3 sm:py-2.5 bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-blue-400 transition-all flex items-center gap-2"
                  >
                    Review
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] py-20 text-center"
        >
          <div className="w-20 h-20 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
            <Eye className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="font-brand font-bold text-xl text-zinc-500 uppercase tracking-tight mb-2">
            {searchQuery ? 'No Matches Found' : 'Queue Empty'}
          </h3>
          <p className="font-display text-zinc-600 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms.'
              : 'There are no devices waiting for remote review.'}
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default ReviewQueue;
