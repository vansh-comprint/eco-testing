/**
 * Shared profile settings section.
 * Allows editing name and phone. Email is read-only.
 */
import { useState } from 'react';
import { User, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks';
import { useToast } from '@/components/ui';
import { usersApi } from '@/lib/api/users';
import { roleLabels, type UserRole } from '@/types';

export function ProfileSettings() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await usersApi.updateMe({
        name: form.name,
        phone: form.phone,
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to save profile');
      }
      addToast({ type: 'success', title: 'Profile Saved', message: 'Your profile has been updated.' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: error instanceof Error ? error.message : 'Failed to save changes.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md border border-slate-200 dark:border-white/10 btn-chamfer">
      <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
        <User className="w-5 h-5 text-slate-500 dark:text-zinc-600" />
        <h2 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wide">Profile</h2>
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[^a-zA-Z\s'.\-]/g, '') })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-500 font-mono text-sm cursor-not-allowed"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              inputMode="numeric"
              maxLength={10}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:border-ecotribe-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="block font-mono font-bold text-[10px] text-slate-600 dark:text-zinc-500 uppercase tracking-widest mb-2">Role</label>
            <div className="w-full px-4 py-3 bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-ecotribe-primary font-mono text-sm font-bold uppercase">
              {user?.role ? roleLabels[user.role as UserRole] || user.role : '-'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-2">
          {saved && (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span className="font-mono text-xs uppercase tracking-widest">Saved</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="interactive px-5 py-2.5 bg-ecotribe-primary text-black font-mono font-bold text-xs uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
