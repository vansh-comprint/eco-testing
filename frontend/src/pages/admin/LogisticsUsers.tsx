import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, UserPlus, Phone, Mail, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth, useLogisticsUsers, useCreateLogisticsUser, useUpdateLogisticsUserStatus } from '@/hooks';
import { PageHeader } from '@/components/ui';

export function ITAdminLogisticsUsers() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isOrgAdmin = user?.role === 'org_admin' || location.pathname.startsWith('/org-admin');
  const basePath = isOrgAdmin ? '/org-admin' : '/admin';
  const { data: logisticsUsers = [] } = useLogisticsUsers();
  const createUserMutation = useCreateLogisticsUser();
  const updateStatusMutation = useUpdateLogisticsUserStatus();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const isAdding = createUserMutation.isPending;

  const addUser = async () => {
    if (!form.name || !form.email) return;
    await createUserMutation.mutateAsync({
      name: form.name,
      phone: form.phone,
      email: form.email,
      logistics_admin_id: user?.id || '',
    });
    setForm({ name: '', phone: '', email: '' });
  };

  const toggleStatus = async (id: string, currentStatus: 'active' | 'inactive') => {
    await updateStatusMutation.mutateAsync({
      userId: id,
      status: currentStatus === 'active' ? 'inactive' : 'active',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Logistics Management"
        title="Logistics Users"
        subtitle="Add and manage logistics team members"
        backLink={`${basePath}/logistics`}
      />

      {/* Add User Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-6"
      >
        <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase mb-4">Add New User</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Full Name *"
            className="flex-1 px-4 py-3 text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Phone Number"
            className="flex-1 px-4 py-3 text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email Address *"
            className="flex-1 px-4 py-3 text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
          />
          <button
            onClick={addUser}
            disabled={!form.name || !form.email || isAdding}
            className="px-6 py-3 bg-ecotribe-primary text-black font-mono text-xs uppercase tracking-widest border border-ecotribe-primary/40 hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> {isAdding ? 'Adding...' : 'Add User'}
          </button>
        </div>
      </motion.div>

      {/* Users List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10">
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">
              All Logistics Users ({logisticsUsers.length})
            </h3>
          </div>

          {logisticsUsers.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus className="w-12 h-12 mx-auto mb-3 text-slate-400 dark:text-white/30" />
              <p className="font-display font-bold text-sm text-slate-500 dark:text-white/50 uppercase">No logistics users yet</p>
              <p className="font-mono text-xs text-slate-400 dark:text-white/30 mt-1">Add a user using the form above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {logisticsUsers.map((u, idx) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className="border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-slate-200 dark:border-white/10 bg-ecotribe-primary/10 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-ecotribe-primary" />
                      </div>
                      <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">{u.name}</p>
                    </div>
                    <StatusBadge status={u.status} />
                  </div>

                  <div className="text-sm text-slate-500 dark:text-white/50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span className="font-mono">{u.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="font-mono truncate">{u.email}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex gap-2">
                    <button
                      onClick={() => toggleStatus(u.id, u.status)}
                      className={`flex-1 px-3 py-2 font-mono text-xs uppercase tracking-widest border transition-colors ${
                        u.status === 'active'
                          ? 'border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20'
                          : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20'
                      }`}
                    >
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  const map = {
    active: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400',
    inactive: 'border-slate-400/40 bg-slate-400/10 text-slate-400',
  } as const;
  return (
    <span className={`px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-widest border ${map[status]}`}>
      {status}
    </span>
  );
}
