import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Phone, Mail, Eye, EyeOff, Search, Users, UserCheck, UserX, Edit2, X, Shield, Loader2 } from 'lucide-react';
import { useAuth, useLogisticsUsers, useCreateLogisticsUser, useUpdateLogisticsUser } from '@/hooks';
import { useToast, Modal, PageHeader, Button } from '@/components/ui';
import { usersApi } from '@/lib/api';
import { text } from '@/lib/design-tokens';
import type { LogisticsUserResponse } from '@/lib/api/logistics';

export function LogisticsUserManagement() {
  const { user } = useAuth();
  const { data: logisticsUsers = [], isLoading } = useLogisticsUsers(user?.id);
  const createUserMutation = useCreateLogisticsUser();
  const updateUserMutation = useUpdateLogisticsUser();
  const { addToast } = useToast();

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<LogisticsUserResponse | null>(null);
  const [viewingUser, setViewingUser] = useState<LogisticsUserResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Add user form
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [showAddPassword, setShowAddPassword] = useState(false);

  // Edit user form
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

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

  // ─── Add user handlers ────────────────────────────────────────────────────
  const resetAddForm = () => {
    setAddForm({ name: '', phone: '', email: '', password: '' });
    setShowAddPassword(false);
  };

  const handleCloseAdd = () => {
    setShowAddModal(false);
    resetAddForm();
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-zA-Z]/.test(pwd)) return 'Password must contain at least one letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    if (!/[^a-zA-Z0-9]/.test(pwd)) return 'Password must contain at least one special character (!@#$...)';
    return null;
  };

  const addUser = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) {
      addToast({ type: 'error', title: 'Missing Fields', message: 'Name, email, and password are required' });
      return;
    }
    const pwdError = validatePassword(addForm.password);
    if (pwdError) {
      addToast({ type: 'error', title: 'Weak Password', message: pwdError });
      return;
    }
    try {
      await createUserMutation.mutateAsync({
        name: addForm.name,
        phone: addForm.phone,
        email: addForm.email,
        password: addForm.password,
        logistics_admin_id: user?.id || '',
      });
      handleCloseAdd();
      addToast({ type: 'success', title: 'User Created', message: `${addForm.name} can now log in with their email and password` });
    } catch (error) {
      addToast({ type: 'error', title: 'Failed to Create User', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  // ─── Edit user handlers ───────────────────────────────────────────────────
  const openEdit = (u: LogisticsUserResponse) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      phone: u.phone || '',
      email: u.email || '',
    });
    setShowResetPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    setShowResetPassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // ─── View user handlers ───────────────────────────────────────────────────
  const openView = (u: LogisticsUserResponse) => setViewingUser(u);
  const handleCloseView = () => setViewingUser(null);

  const saveEdit = async () => {
    if (!editingUser) return;
    if (!editForm.name.trim()) {
      addToast({ type: 'error', title: 'Missing Field', message: 'Name is required' });
      return;
    }
    if (!editForm.email.trim()) {
      addToast({ type: 'error', title: 'Missing Field', message: 'Email is required' });
      return;
    }
    try {
      await updateUserMutation.mutateAsync({ userId: editingUser.id, updates: { name: editForm.name, phone: editForm.phone, email: editForm.email } });
      addToast({ type: 'success', title: 'User Updated', message: `${editForm.name}'s details have been saved` });
      handleCloseEdit();
    } catch (error) {
      addToast({ type: 'error', title: 'Update Failed', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleResetPassword = async () => {
    if (!editingUser) return;
    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      addToast({ type: 'error', title: 'Weak Password', message: pwdError });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', title: 'Passwords Do Not Match', message: 'Please make sure both passwords are the same' });
      return;
    }
    setResettingPassword(true);
    try {
      await usersApi.resetPassword(editingUser.id, { new_password: newPassword });
      addToast({ type: 'success', title: 'Password Reset', message: `Password has been updated for ${editingUser.name}` });
      setShowResetPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      addToast({ type: 'error', title: 'Reset Failed', message: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setResettingPassword(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:border-ecotribe-primary focus:outline-none';
  const labelCls = `block font-mono text-xs uppercase tracking-widest ${text.muted} mb-2`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Logistics Admin"
        title="Field Users"
        subtitle="Manage your pickup and delivery team"
        actions={
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Field User
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/85 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/10 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Total</p>
            <p className={`font-brand text-2xl font-bold ${text.primary}`}>{logisticsUsers.length}</p>
          </div>
        </div>
        <div className="bg-white/85 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/10 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Active</p>
            <p className="font-brand text-2xl font-bold text-emerald-500">{activeUsers}</p>
          </div>
        </div>
        <div className="bg-white/85 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/10 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-500/10 border border-slate-500/30 flex items-center justify-center">
            <UserX className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Inactive</p>
            <p className="font-brand text-2xl font-bold text-slate-500">{inactiveUsers}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/85 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/10 p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0 ml-1" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 dark:text-white/30 dark:hover:text-white/60">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* User List */}
      {isLoading ? (
        <div className="bg-white/85 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/10 p-12 text-center">
          <p className={`font-mono text-sm ${text.muted}`}>Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white/85 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/10 p-12 text-center">
          <Users className={`w-12 h-12 mx-auto mb-4 ${text.muted}`} />
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
        </div>
      ) : (
        <div className="bg-white/85 dark:bg-white/[0.03] backdrop-blur-sm border border-slate-200 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/[0.05]">
          {filteredUsers.map((u, index) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => openView(u)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              {/* Info — no circular avatar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-display font-bold text-sm ${text.primary}`}>{u.name}</p>
                  <StatusBadge status={u.status as 'active' | 'inactive'} />
                </div>
                <div className={`flex items-center gap-4 mt-0.5 text-xs ${text.muted} flex-wrap`}>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {u.email}
                  </span>
                  {u.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {u.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Edit */}
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(u); }}
                  title="Edit user"
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-ecotribe-primary hover:bg-ecotribe-primary/10 dark:text-white/40 dark:hover:text-ecotribe-primary transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── View User Modal ────────────────────────────────────────────────── */}
      <Modal isOpen={!!viewingUser} onClose={handleCloseView} title="User Details" size="sm">
        {viewingUser && (
          <div className="space-y-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="w-14 h-14 rounded-full bg-ecotribe-primary/10 border border-ecotribe-primary/30 flex items-center justify-center font-brand font-bold text-lg text-ecotribe-primary flex-shrink-0">
                {viewingUser.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
              </div>
              <div>
                <p className={`font-display font-bold text-base ${text.primary}`}>{viewingUser.name}</p>
                <StatusBadge status={viewingUser.status as 'active' | 'inactive'} />
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <Mail className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0" />
                <div>
                  <p className={`font-mono text-[10px] uppercase tracking-widest ${text.muted}`}>Email</p>
                  <p className={`text-sm ${text.primary}`}>{viewingUser.email}</p>
                </div>
              </div>
              {viewingUser.phone && (
                <div className="flex items-center gap-3 px-1">
                  <Phone className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0" />
                  <div>
                    <p className={`font-mono text-[10px] uppercase tracking-widest ${text.muted}`}>Phone</p>
                    <p className={`text-sm ${text.primary}`}>{viewingUser.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 px-1">
                <Users className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0" />
                <div>
                  <p className={`font-mono text-[10px] uppercase tracking-widest ${text.muted}`}>Member Since</p>
                  <p className={`text-sm ${text.primary}`}>
                    {new Date(viewingUser.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
              <Button variant="secondary" onClick={handleCloseView} className="flex-1">Close</Button>
              <Button
                variant="primary"
                onClick={() => { handleCloseView(); openEdit(viewingUser); }}
                className="flex-1"
                leftIcon={<Edit2 className="w-4 h-4" />}
              >
                Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Add User Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={showAddModal} onClose={handleCloseAdd} title="Add Field User" size="md">
        <div className="space-y-4">
          <p className={`font-mono text-sm ${text.muted}`}>
            Create a new field user account. They will be able to log in and receive pickup assignments.
          </p>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '') })}
                placeholder="Enter full name"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email Address *</label>
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                placeholder="Enter email address"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Password *</label>
              <div className="relative">
                <input
                  type={showAddPassword ? 'text' : 'password'}
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowAddPassword(!showAddPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/60"
                >
                  {showAddPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {addForm.password && addForm.password.length < 8 && (
                <p className="text-red-500 text-xs mt-1">Password must be at least 8 characters</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input
                type="tel"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '') })}
                inputMode="numeric"
                placeholder="Enter phone number (optional)"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
            <Button variant="secondary" onClick={handleCloseAdd} className="flex-1">Cancel</Button>
            <Button
              variant="primary"
              onClick={addUser}
              disabled={!addForm.name || !addForm.email || !addForm.password || addForm.password.length < 8 || createUserMutation.isPending}
              className="flex-1"
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Edit User Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editingUser}
        onClose={handleCloseEdit}
        title={`Edit: ${editingUser?.name || ''}`}
        size="md"
      >
        {editingUser && (
          <div className="space-y-5">
            {/* User info fields */}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '') })}
                  placeholder="Enter full name"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Email Address *</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Enter email address"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '') })}
                  inputMode="numeric"
                  placeholder="Enter phone number"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span className={`font-mono text-xs uppercase tracking-widest font-bold text-amber-500`}>
                    Reset Password
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showResetPassword ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showResetPassword && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-white/10 space-y-3">
                      <p className={`font-mono text-xs ${text.muted}`}>
                        Set a new password for this user. They will need to use this to log in.
                      </p>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password (min 8 chars)"
                          className={`${inputCls} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/60"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className={`${inputCls} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-white/40 dark:hover:text-white/60"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-red-500 text-xs">Passwords do not match</p>
                      )}
                      <Button
                        variant="secondary"
                        onClick={handleResetPassword}
                        disabled={!newPassword || newPassword.length < 8 || !confirmPassword || newPassword !== confirmPassword || resettingPassword}
                        className="w-full"
                      >
                        {resettingPassword ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting...</>
                        ) : (
                          'Set New Password'
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
              <Button variant="secondary" onClick={handleCloseEdit} className="flex-1">Cancel</Button>
              <Button
                variant="primary"
                onClick={saveEdit}
                disabled={!editForm.name.trim() || !editForm.email.trim() || updateUserMutation.isPending}
                className="flex-1"
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  const config = {
    active: { cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400', label: 'Active' },
    inactive: { cls: 'border-slate-400/40 bg-slate-400/10 text-slate-400', label: 'Inactive' },
  } as const;
  const cfg = config[status];
  return (
    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
