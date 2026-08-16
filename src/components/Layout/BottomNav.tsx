import React from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, BookOpen, Layers, LineChart, CheckSquare, Settings as SettingsIcon } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Today', icon: CheckSquare },
    { to: '/timetable', label: 'Timetable', icon: Calendar },
    { to: '/modules', label: 'Modules', icon: Layers },
    { to: '/syllabus', label: 'Syllabus', icon: BookOpen },
    { to: '/insights', label: 'Insights', icon: LineChart },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t px-1 py-1.5 md:hidden backdrop-blur-xl">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 rounded-xl text-xs font-medium min-h-[44px] transition-all ${
                  isActive
                    ? 'text-indigo-400 font-semibold bg-indigo-500/15 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
