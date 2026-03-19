import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Calendar, Shield, Save } from 'lucide-react';

interface ProfileViewProps {
  profile: any;
  onProfileUpdate: () => void;
}

export function ProfileView({ profile, onProfileUpdate }: ProfileViewProps) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (error) {
      setMessage('Error updating profile');
    } else {
      setMessage('Profile updated successfully');
      onProfileUpdate();
    }

    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile Settings</h2>
        <p className="text-slate-600">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-600" />
              Personal Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                  <Mail className="w-5 h-5 text-slate-400" />
                  {profile?.email}
                </div>
                <p className="text-xs text-slate-500 mt-2">Email cannot be changed</p>
              </div>
              <div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-semibold hover:from-cyan-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {message && (
                  <p className={`text-sm mt-2 ${message.includes('Error') ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-600" />
              Security & Privacy
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                <Shield className="w-5 h-5 text-cyan-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Your data is secure</p>
                  <p className="text-sm text-slate-600">
                    All your stress analysis data is encrypted and stored securely. Only you can access your information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl shadow-sm p-6 border border-cyan-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              Account Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">Account Created</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(profile?.created_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Last Updated</p>
                <p className="text-sm font-semibold text-slate-800">
                  {formatDate(profile?.updated_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">Account Status</p>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">About StressKE</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              StressKE uses advanced AI technology to analyze facial expressions and detect stress levels,
              helping you maintain better mental well-being.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
