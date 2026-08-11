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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-800 px-2 py-1 md:hidden">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 px-3 rounded-xl text-xs font-medium min-h-[44px] transition-colors ${
                  isActive
                    ? 'text-indigo-400 font-semibold bg-indigo-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px]">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
