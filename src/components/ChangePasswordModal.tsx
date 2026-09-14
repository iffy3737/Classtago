import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import { supabase, LocalERPDatabase } from '../lib/supabase';
import type { User } from '../types';

type Props = {
  user: User;
  onClose: () => void;
};

function passwordRuleError(value: string): string {
  if (value.length < 6 || value.length > 72) return 'Password must contain 6 to 72 characters.';
  return '';
}

export default function ChangePasswordModal({ user, onClose }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || success) return;
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Current password, new password and confirmation are required.');
      return;
    }
    const ruleError = passwordRuleError(newPassword);
    if (ruleError) {
      setError(ruleError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    setBusy(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const email = sessionData.session?.user?.email;
      if (!email) throw new Error('Secure login session was not found. Please sign in again.');

      // Re-authenticate before changing a sensitive credential. This verifies that
      // the person holding an active browser session also knows the current password.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });
      if (verifyError) throw new Error('Current password is incorrect.');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      try {
        LocalERPDatabase.addAuditLog(
          user.id,
          user.name,
          user.role,
          'PASSWORD_CHANGED_SELF_SERVICE',
          'Security',
          `Authenticated user changed their own Supabase Auth password for ${user.username}`
        );
      } catch {
        // Password success must never be rolled back because a compatibility audit
        // surface is unavailable. Supabase Auth remains the credential authority.
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (caught: any) {
      setError(caught?.message || 'Password could not be changed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm no-print" role="dialog" aria-modal="true" aria-labelledby="edx-change-password-title">
      <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,.32)]">
        <div className="flex items-start justify-between border-b border-slate-100 bg-[linear-gradient(135deg,#ecfeff,#f5f3ff_55%,#fff)] p-5">
          <div className="flex gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950 shadow-lg"><KeyRound className="h-5 w-5" /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-700">Account Security</p>
              <h2 id="edx-change-password-title" className="mt-1 text-lg font-black text-slate-950">Change Password</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">Updates only your own Classtago login password.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950" aria-label="Close change password"><X className="h-4 w-4" /></button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck className="h-7 w-7" /></div>
            <h3 className="mt-4 text-lg font-black text-slate-950">Password changed successfully</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Your new password will be required the next time you sign in. Your User ID remains unchanged.</p>
            <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wide text-slate-600">Current Password</label>
              <div className="relative mt-1.5">
                <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} autoComplete="current-password" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-11 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100" />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700" aria-label={showCurrent ? 'Hide current password' : 'Show current password'}>{showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wide text-slate-600">New Password</label>
              <div className="relative mt-1.5">
                <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-11 text-sm font-semibold text-slate-950 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700" aria-label={showNew ? 'Hide new password' : 'Show new password'}>{showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
              <p className="mt-1.5 text-[10px] font-semibold text-slate-500">Use 6–72 characters. Do not reuse the current password.</p>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wide text-slate-600">Confirm New Password</label>
              <input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </div>

            {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold leading-5 text-rose-800">{error}</div>}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">{busy ? <><Loader2 className="h-4 w-4 animate-spin" />Updating…</> : <><KeyRound className="h-4 w-4" />Update Password</>}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
