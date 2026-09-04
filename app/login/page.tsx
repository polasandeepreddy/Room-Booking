'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const registered = searchParams.get('registered') === 'true';

  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid email or password.');
    } else {
      if (result.user?.role === 'admin' && redirectUrl === '/') {
        router.push('/admin');
      } else {
        router.push(redirectUrl === 'booking' ? '/booking' : redirectUrl);
      }
    }
  };

  const fillDemo = async (userType: 'guest' | 'admin') => {
    setError('');
    const demoEmail = userType === 'guest' ? 'guest@hotel.com' : 'admin@hotel.com';
    const demoPass = userType === 'guest' ? 'Guest@12345' : 'Admin@12345';

    setEmail(demoEmail);
    setPassword(demoPass);

    setIsLoading(true);
    const result = await login(demoEmail, demoPass);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Login failed.');
    } else {
      if (result.user?.role === 'admin' && redirectUrl === '/') {
        router.push('/admin');
      } else {
        router.push(redirectUrl === 'booking' ? '/booking' : redirectUrl);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <Link href="/" className="inline-flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Building2 className="w-6 h-6 text-slate-950 stroke-[2.2]" />
          </div>
          <span className="font-bold text-2xl tracking-wide text-white">
            COMFORTABLE FLAT
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Welcome Back
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Sign in to manage your bookings and room reservations
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 py-7 px-5 sm:px-10 rounded-3xl shadow-2xl space-y-5">

          {registered && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Account created successfully. Please login.</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {forgotPasswordMessage && (
            <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
              Password reset link sent to registered email if an account exists.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordMessage(true)}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:brightness-110 shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-amber-400 hover:text-amber-300">
                Create Account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
