import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Save,
  CheckCircle2,
  XCircle,
  Lock,
  BadgeCheck,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ProfileViewProps {
  profile: any;
  onProfileUpdate: () => void;
}

export function ProfileView({ profile, onProfileUpdate }: ProfileViewProps) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    setStatus(error ? 'error' : 'success');
    if (!error) onProfileUpdate();

    setSaving(false);
    setTimeout(() => setStatus('idle'), 3500);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  const initials = (profile?.full_name || profile?.email || 'U')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-7">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
          <User className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold leading-tight bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">
  Profile Settings
</h2>
          <p className="text-slate-500 text-sm">Manage your account information and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Card header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                <User className="w-4 h-4 text-cyan-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Personal Information</h3>
            </div>

            <div className="p-6 space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none transition-all text-sm text-slate-800 placeholder:text-slate-300 bg-white hover:border-slate-300"
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Email Address
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-600 flex-1 truncate">{profile?.email}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">
                    <Lock className="w-2.5 h-2.5" />
                    Read-only
                  </span>
                </div>
              </div>

              {/* Save row */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-sm font-semibold hover:from-cyan-700 hover:to-teal-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>

                {status === 'success' && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold animate-pulse-once">
                    <CheckCircle2 className="w-4 h-4" />
                    Profile updated
                  </div>
                )}
                {status === 'error' && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    <XCircle className="w-4 h-4" />
                    Update failed
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security & Privacy */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Security & Privacy</h3>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <BadgeCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-slate-800">Your data is secure</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Protected
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    All your stress analysis data is encrypted and stored securely. Only you can access your information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">

          {/* Avatar + identity */}
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl border border-cyan-200 p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-200 text-white text-xl font-bold">
              {initials}
            </div>
            <p className="text-base font-bold text-slate-800 mb-0.5 truncate">
              {profile?.full_name || 'Unnamed User'}
            </p>
            <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active account
              </span>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Account Details</h3>
            </div>
            <div className="divide-y divide-slate-50">
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-300" />
                  Created
                </div>
                <span className="text-xs font-semibold text-slate-700">{formatDate(profile?.created_at)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-300" />
                  Last updated
                </div>
                <span className="text-xs font-semibold text-slate-700">{formatDate(profile?.updated_at)}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Shield className="w-3.5 h-3.5 text-slate-300" />
                  Status
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-sky-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">About StressKE</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                StressKE uses advanced AI to analyze facial expressions and detect stress levels,
                helping you maintain better mental well-being through personalised insights.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {['AI-Powered', 'Private', 'Real-time'].map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
