import React, { useState, useEffect } from 'react';
import { supabase, StressResult } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { DashboardView } from './DashboardView';
import { HistoryView } from './HistoryView';
import { ProfileView } from './ProfileView';
import { StressAnalyzer, type AnalysisResult } from './StressAnalyzer';

interface DashboardProps {
  onAnalyze: () => void;
  onLogOut: () => void;
}

export function Dashboard({ onAnalyze, onLogOut }: DashboardProps) {
  const { profile, fetchProfile } = useAuth();
  const [results, setResults] = useState<StressResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'analyze' | 'history' | 'profile'>('dashboard');
  const [analyzeKey, setAnalyzeKey] = useState(0);

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

  const handleAnalysisComplete = (latest: AnalysisResult) => {
    const optimistic: StressResult = {
      id: `pending-${Date.now()}`,
      user_id: '',
      predicted_emotion: latest.predicted_emotion,
      stress_score: latest.stress_score,
      stress_level: latest.stress_level,
      probabilities: latest.probabilities,
      created_at: new Date().toISOString(),
    };
    setResults(prev => [optimistic, ...prev]);
    setCurrentView('dashboard');
    fetchResults();
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
        return (
          <DashboardView
            results={results}
            profile={profile}
            onNavigateAnalyze={() => {
              setAnalyzeKey(k => k + 1);
              setCurrentView('analyze');
            }}
          />
        );
      case 'analyze':
        return (
          <StressAnalyzer
            key={analyzeKey}
            onBack={() => setCurrentView('dashboard')}
            onAnalysisComplete={handleAnalysisComplete}
          />
        );
      case 'history':
        return <HistoryView results={results} />;
      case 'profile':
        return <ProfileView profile={profile} onProfileUpdate={handleProfileUpdate} />;
      default:
        return <DashboardView results={results} profile={profile} onNavigateAnalyze={() => setCurrentView('analyze')} />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => {
          if (view === 'analyze') setAnalyzeKey(k => k + 1);
          if (view === 'dashboard') fetchResults(); // ← add this
          setCurrentView(view);
        }}
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
