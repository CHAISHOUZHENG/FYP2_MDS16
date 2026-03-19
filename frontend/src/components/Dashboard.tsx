import React, { useState, useEffect } from 'react';
import { supabase, StressResult } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { DashboardView } from './DashboardView';
import { HistoryView } from './HistoryView';
import { ProfileView } from './ProfileView';
import { StressAnalyzer } from './StressAnalyzer';

interface DashboardProps {
  onAnalyze: () => void;
  onLogOut: () => void;
}

export function Dashboard({ onAnalyze, onLogOut }: DashboardProps) {
  const { profile, fetchProfile } = useAuth();
  const [results, setResults] = useState<StressResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'analyze' | 'history' | 'profile'>('dashboard');

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    const { data, error } = await supabase
      .from('stress_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setResults(data);
    }
    setLoading(false);
  };

  const handleAnalysisComplete = () => {
    fetchResults();
    setCurrentView('dashboard');
  };

  const handleProfileUpdate = async () => {
    await fetchProfile();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading your data...</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardView results={results} profile={profile} />;
      case 'analyze':
        return <StressAnalyzer onComplete={handleAnalysisComplete} />;
      case 'history':
        return <HistoryView results={results} />;
      case 'profile':
        return <ProfileView profile={profile} onProfileUpdate={handleProfileUpdate} />;
      default:
        return <DashboardView results={results} profile={profile} />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogOut={onLogOut}
        userName={profile?.full_name || profile?.email || 'User'}
      />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
