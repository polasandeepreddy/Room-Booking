'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { 
  User as UserIcon, 
  Phone, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Save
} from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login?redirect=profile');
      } else {
        setFullName(user.fullName || user.full_name || '');
        setMobileNumber(user.mobileNumber || user.mobile_number || '');
      }
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword) {
      if (!currentPassword) {
        setFeedback({ type: 'error', text: 'Please enter your current password to set a new password.' });
        return;
      }
      if (newPassword.length < 6) {
        setFeedback({ type: 'error', text: 'New password must be at least 6 characters.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setFeedback({ type: 'error', text: 'New passwords do not match.' });
        return;
      }
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          mobileNumber: mobileNumber.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', text: data.error || 'Failed to update profile.' });
      } else {
        setFeedback({ type: 'success', text: 'Profile updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await refreshUser();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-500 selection:text-slate-950">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/" className="hover:text-amber-400">Home</Link>
            <span>/</span>
            <span className="text-amber-400 font-medium">Customer Profile</span>
          </div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-amber-400" />
            <span>Customer Profile</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage your personal contact information and password security.
          </p>
        </div>

        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-center gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Overview Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-xl shadow-md">
                {(fullName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{fullName || user.fullName}</h3>
                <p className="text-xs text-gray-400">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {user.role}
                  </span>
                  {user.status && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {user.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs text-gray-400">
              <div>
                <span className="block text-gray-500">Email Address (Fixed)</span>
                <span className="text-white font-medium">{user.email}</span>
              </div>
              <div>
                <span className="block text-gray-500">Account Created</span>
                <span className="text-white font-medium">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active Member'}
                </span>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white">Personal Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Mobile Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white">Change Password</h3>
              <p className="text-xs text-gray-400 mt-0.5">Leave blank if you do not wish to change your password.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:brightness-110 shadow-lg shadow-amber-400/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
