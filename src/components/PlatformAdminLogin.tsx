/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { User } from '../types';
import { AuthService } from '../lib/authService';

interface PlatformAdminLoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function PlatformAdminLogin({ onLoginSuccess }: PlatformAdminLoginProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!loginId.trim() || !password) {
      setError('Enter the authorized Platform Administrator email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.login(loginId.trim(), password);
      if (!result.user) {
        setError(result.error?.message || 'Platform login failed. Check the credentials and try again.');
        return;
      }
      if (result.user.role !== 'super_admin') {
        await AuthService.logout();
        setError('This entrance is reserved for Classtago Platform Administrators. Please open your school website for school ERP login.');
        return;
      }
      onLoginSuccess(result.user);
    } catch (loginError: any) {
      setError(loginError?.message || 'Secure platform authentication could not be completed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="rounded-2xl bg-slate-950 p-3 text-cyan-300 shadow-lg shadow-cyan-950/20">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-cyan-700">Secure platform access</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Classtago Administrator</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">School users must sign in from their own school website.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">Administrator email</span>
          <input
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            type="email"
            autoComplete="username"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            placeholder="admin@classtago.com"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">Password</span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold leading-5 text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:bg-cyan-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {isLoading ? 'Verifying secure session…' : 'Open Platform Console'}
        </button>
      </form>
    </div>
  );
}
