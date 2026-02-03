/**
 * Shared password change section for settings pages.
 * Used by all role settings pages.
 */
import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui';
import { authApi } from '@/lib/api/auth';

export function PasswordChange() {
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.currentPassword) {
      addToast({ type: 'error', title: 'Current Password Required', message: 'Please enter your current password.' });
      return;
    }
    if (!form.newPassword || form.newPassword.length < 8) {
      addToast({ type: 'error', title: 'Invalid Password', message: 'New password must be at least 8 characters.' });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      addToast({ type: 'error', title: 'Passwords Do Not Match', message: 'Please ensure both passwords match.' });
      return;
    }
    setSaving(true);
    try {
      const response = await authApi.changePassword({
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to change password');
      }
      addToast({ type: 'success', title: 'Password Changed', message: 'Your password has been updated successfully.' });
      setShowForm(false);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Password Change Failed',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 border border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/30 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border border-slate-200 dark:border-white/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase">Password</p>
            <p className="font-mono text-xs text-slate-500 dark:text-zinc-600">Change your account password</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
          }}
          className="interactive px-4 py-2 text-slate-600 dark:text-zinc-500 hover:text-ecotribe-primary font-mono font-bold text-xs uppercase tracking-widest transition-colors"
        >
          {showForm ? 'Cancel' : 'Change'}
        </button>
      </div>
      {showForm && (
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <div>
            <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Current Password</label>
            <input
              type="password"
              placeholder="Enter your current password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">New Password</label>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Confirm New Password</label>
            <input
              type="password"
              placeholder="Re-enter new password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !form.currentPassword || !form.newPassword || !form.confirmPassword}
            className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Update Password
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
