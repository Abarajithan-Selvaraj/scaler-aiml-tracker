import React, { useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTrackerStore } from '../../store/useTrackerStore';
import { BottomNav } from './BottomNav';
import { Sparkles, Calendar, Settings as SettingsIcon, Database } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { loadData, setupAuthListener, isLoading, currentDateStr, settings, activeBackend } = useTrackerStore();

  useEffect(() => {
    const unsubscribe = setupAuthListener();
    return () => unsubscribe();
  }, [setupAuthListener]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-300 font-medium text-sm animate-pulse">
            Loading Scaler AI/ML Syllabus & Schedule...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Desktop & Mobile Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent truncate">
                Scaler AI/ML Tracker
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                <span className="flex items-center font-mono">
                  <Calendar className="w-3 h-3 mr-1 text-indigo-400 shrink-0" />
                  {currentDateStr}
                  {settings?.simulatedDate && (
                    <span className="ml-1 text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono">
                      Sim
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="flex items-center text-[10px] sm:text-[11px] text-slate-400">
                  <Database className="w-3 h-3 mr-1 text-indigo-400 shrink-0" />
                  {activeBackend === 'firestore' ? 'Cloud Sync' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center space-x-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              Today
            </NavLink>
            <NavLink
              to="/timetable"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              Timetable
            </NavLink>
            <NavLink
              to="/modules"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              Modules
            </NavLink>
            <NavLink
              to="/syllabus"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              Syllabus
            </NavLink>
            <NavLink
              to="/insights"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              Insights
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors ${
                  isActive ? 'bg-slate-800 text-indigo-400' : ''
                }`
              }
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
