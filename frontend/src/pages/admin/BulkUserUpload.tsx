import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Info } from 'lucide-react';
import { CSVUserUpload } from '@/components/users';
import { useAuth, useCreateSubUsers } from '@/hooks';
import type { CreateSubUserInput } from '@/types';

export function BulkUserUpload() {
  const navigate = useNavigate();
  const location = useLocation();

  // V3: Use React Query hooks
  const { enterprise, user } = useAuth();
  const createSubUsersMutation = useCreateSubUsers();

  // V3.2: Detect if we're in Org Admin context
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';

  const handleUpload = async (users: CreateSubUserInput[]) => {
    await createSubUsersMutation.mutateAsync(users);
  };

  if (!enterprise) {
    return (
      <div className="flex items-center justify-center min-h-[400px] border border-white/10 bg-slate-50 dark:bg-white/[0.02]">
        <p className="font-display text-zinc-500 uppercase tracking-wide">Enterprise not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="interactive flex items-center gap-2 text-zinc-500 hover:text-ecotribe-primary transition-colors font-mono text-xs uppercase tracking-widest mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-start gap-5">
            <div className="w-14 h-14 border border-ecotribe-primary/30 bg-ecotribe-primary/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-ecotribe-primary" />
            </div>
            <div>
              <span className="font-mono font-bold text-xs text-ecotribe-primary tracking-[0.3em] uppercase block mb-1">Bulk</span>
              <h1 className="font-brand font-bold text-2xl md:text-3xl text-white uppercase tracking-tight">
                Import Sub-Users
              </h1>
              <p className="font-display text-zinc-500 text-sm mt-1 uppercase tracking-wide">
                Upload multiple users via CSV
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tips Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-blue-400/20 bg-blue-400/5 p-5"
      >
        <div className="flex gap-4">
          <div className="w-10 h-10 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-white uppercase tracking-wide mb-2">CSV Upload Tips</p>
            <ul className="font-mono text-xs text-zinc-500 space-y-1">
              <li>• Download our template for the correct format</li>
              <li>• Required column: email</li>
              <li>• Optional: name, phone, department</li>
              <li>• Supported departments: Engineering, Marketing, HR, Finance, Operations, Sales, IT, Other</li>
              <li>• Sub-users will receive email invites automatically</li>
              <li>• Duplicate emails will be flagged as errors</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* CSV Upload Component */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CSVUserUpload
          enterpriseId={enterprise.id}
          onUpload={handleUpload}
          onCancel={() => navigate(`${basePath}/sub-users`)}
        />
      </motion.div>
    </div>
  );
}

export default BulkUserUpload;
