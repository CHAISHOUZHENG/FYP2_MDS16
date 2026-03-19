import React from 'react';
import { Activity, BarChart3, Brain, Home, User, LogOut } from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'analyze' | 'history' | 'profile';
  onViewChange: (view: 'dashboard' | 'analyze' | 'history' | 'profile') => void;
  onLogOut: () => void;
  userName?: string;
}

export function Sidebar({ currentView, onViewChange, onLogOut, userName }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'analyze' as const, label: 'Analyze', icon: Activity },
    { id: 'history' as const, label: 'History', icon: BarChart3 },
    { id: 'profile' as const, label: 'Profile', icon: User },
  ];

  return (
    <div className="w-72 bg-white flex flex-col h-screen sticky top-0 shadow-sm">
      <div className="p-8 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-200">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
              StressKE
            </h1>
            <p className="text-xs text-slate-500">AI Wellness Companion</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-5 pb-4">
        <ul className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 relative ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-200/50'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                  )}
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-5 border-t border-slate-100">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-3 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              {userName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 mb-0.5">Signed in as</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onLogOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
