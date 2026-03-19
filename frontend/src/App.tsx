import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { StressAnalyzer } from './components/StressAnalyzer';
import { LandingPage } from './components/LandingPage';

function AppContent() {
  const { session, loading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard' | 'analyzer'>(
    session ? 'dashboard' : 'landing'
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayView, setDisplayView] = useState(currentView);

  // Update currentView when session changes
  useEffect(() => {
    if (session && currentView !== 'dashboard' && currentView !== 'analyzer') {
      setCurrentView('dashboard');
    } else if (!session && (currentView === 'dashboard' || currentView === 'analyzer')) {
      setCurrentView('landing');
    }
  }, [session]);

  useEffect(() => {
    if (currentView !== displayView) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayView(currentView);
        setIsTransitioning(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentView, displayView]);

  const handleViewChange = (newView: 'landing' | 'auth' | 'dashboard' | 'analyzer') => {
    setCurrentView(newView);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 flex items-center justify-center">
        <div className="inline-flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {displayView === 'dashboard' ? (
          <Dashboard
            onAnalyze={() => handleViewChange('analyzer')}
            onLogOut={async () => {
              try {
                await signOut();
                handleViewChange('landing');
              } catch (error) {
                console.error('Logout error:', error);
              }
            }}
          />
        ) : (
          <StressAnalyzer
            onBack={() => handleViewChange('dashboard')}
            onAnalysisComplete={() => handleViewChange('dashboard')}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      {displayView === 'landing' ? (
        <LandingPage
          onSignIn={() => handleViewChange('auth')}
          onGetStarted={() => handleViewChange('auth')}
        />
      ) : (
        <Auth
          onSuccess={() => handleViewChange('dashboard')}
          onBackToLanding={() => handleViewChange('landing')}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
