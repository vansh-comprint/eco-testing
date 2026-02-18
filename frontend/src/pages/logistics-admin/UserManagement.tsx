import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, UserPlus, Phone, Mail, Eye, EyeOff, Search, X, Users, UserCheck, Truck } from 'lucide-react';
import { useAuth, useLogisticsUsers, useCreateLogisticsUser } from '@/hooks';
import { useToast, Modal, Card, PageHeader, Button, Input } from '@/components/ui';
import { iconSize, text } from '@/lib/design-tokens';

export function LogisticsUserManagement() {
  const { user } = useAuth();
  const { data: logisticsUsers = [], isLoading } = useLogisticsUsers(user?.id);
  const createUserMutation = useCreateLogisticsUser();
  const { addToast } = useToast();

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Search filter
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return logisticsUsers;
    const query = searchTerm.toLowerCase();
    return logisticsUsers.filter(u =>
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.includes(query)
    );
  }, [logisticsUsers, searchTerm]);

  // Stats
  const activeUsers = logisticsUsers.filter(u => u.status === 'active').length;
  const inactiveUsers = logisticsUsers.filter(u => u.status === 'inactive').length;

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', password: '' });
    setShowPassword(false);
  };

  const handleClose = () => {
    setShowAddModal(false);
    resetForm();
  };

  const addUser = async () => {
    if (!form.name || !form.email || !form.password) {
      addToast({
        type: 'error',
        title: 'Missing Fields',
        message: 'Name, email, and password are required',
      });
      return;
    }
    if (form.password.length < 8) {
      addToast({ type: 'error', title: 'Weak Password', message: 'Password must be at least 8 characters' });
      return;
    }
    if (!/[a-zA-Z]/.test(form.password)) {
      addToast({ type: 'error', title: 'Weak Password', message: 'Password must contain at least one letter' });
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      addToast({ type: 'error', title: 'Weak Password', message: 'Password must contain at least one number' });
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(form.password)) {
      addToast({ type: 'error', title: 'Weak Password', message: 'Password must contain at least one special character (!@#$...)' });
      return;
    }
    try {
      await createUserMutation.mutateAsync({
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        logistics_admin_id: user?.id || '',
      });
      handleClose();
      addToast({
        type: 'success',
        title: 'User Created',
        message: `${form.name} can now log in with their email and password`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Create User',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Logistics Admin"
        title="Field Users"
        subtitle={`Manage your pickup and delivery team`}
        actions={
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className={iconSize.sm} />}
          >
            Add Field User
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Total Users</p>
              <p className={`font-brand text-2xl font-bold ${text.primary}`}>{logisticsUsers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Active</p>
              <p className="font-brand text-2xl font-bold text-emerald-500">{activeUsers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-500/10 border border-slate-500/30 flex items-center justify-center">
              <Truck className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Inactive</p>
              <p className="font-brand text-2xl font-bold text-slate-500">{inactiveUsers}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className={iconSize.sm} />}
        />
      </Card>

      {/* Users Grid */}
      {isLoading ? (
        <Card className="p-12 text-center">
          <p className={`font-mono text-sm ${text.muted}`}>Loading users...</p>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-12 text-center">
          <UserPlus className={`w-12 h-12 mx-auto mb-4 ${text.muted}`} />
          <p className={`font-display font-bold text-lg ${text.primary} mb-2`}>
            {searchTerm ? 'No users found' : 'No field users yet'}
          </p>
          <p className={`font-mono text-sm ${text.muted} mb-4`}>
            {searchTerm ? 'Try a different search term' : 'Add your first field user to get started'}
          </p>
          {!searchTerm && (
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Field User
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((u, index) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-5 hover:border-ecotribe-primary/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-ecotribe-primary/10 border border-ecotribe-primary/30 flex items-center justify-center font-brand font-bold text-ecotribe-primary">
                      {u.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                    </div>
                    <div>
                      <p className={`font-display font-bold text-sm ${text.primary}`}>{u.name}</p>
                      <p className={`font-mono text-xs ${text.muted}`}>Field User</p>
                    </div>
                  </div>
                  <StatusBadge status={u.status as 'active' | 'inactive'} />
                </div>

                <div className={`space-y-2 text-sm ${text.muted}`}>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{u.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{u.phone || 'No phone'}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleClose}
        title="Add Field User"
        size="md"
      >
        <div className="space-y-4">
          <p className={`font-mono text-sm ${text.muted}`}>
            Create a new field user account. They will be able to log in and receive pickup assignments.
          </p>

          <div className="space-y-4">
            <div>
              <label className={`block font-mono text-xs uppercase tracking-widest ${text.muted} mb-2`}>
                Full Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '') })}
                placeholder="Enter full name"
                className="w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
              />
            </div>

            <div>
              <label className={`block font-mono text-xs uppercase tracking-widest ${text.muted} mb-2`}>
                Email Address *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Enter email address"
                className="w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
              />
            </div>

            <div>
              <label className={`block font-mono text-xs uppercase tracking-widest ${text.muted} mb-2`}>
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full px-4 py-3 pr-12 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {form.password && form.password.length < 8 && (
                <p className="text-red-500 text-xs mt-1">Password must be at least 8 characters</p>
              )}
            </div>

            <div>
              <label className={`block font-mono text-xs uppercase tracking-widest ${text.muted} mb-2`}>
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '') })}
                inputMode="numeric"
                placeholder="Enter phone number (optional)"
                className="w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={addUser}
              disabled={!form.name || !form.email || !form.password || form.password.length < 8 || createUserMutation.isPending}
              className="flex-1"
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  const config = {
    active: {
      cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400',
      label: 'Active',
    },
    inactive: {
      cls: 'border-slate-400/40 bg-slate-400/10 text-slate-400',
      label: 'Inactive',
    },
  } as const;

  const cfg = config[status];

  return (
    <span className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
