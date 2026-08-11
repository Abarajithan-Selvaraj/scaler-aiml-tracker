import React from 'react';
import { Module } from '../../types/tracker';
import { Search, Filter, Calendar as CalendarIcon } from 'lucide-react';

interface TimetableFiltersProps {
  modules: Module[];
  selectedModuleId: string;
  selectedDayType: string;
  selectedCompletionStatus: string;
  searchQuery: string;
  onModuleChange: (id: string) => void;
  onDayTypeChange: (type: string) => void;
  onCompletionStatusChange: (status: string) => void;
  onSearchChange: (q: string) => void;
  onJumpToToday: () => void;
}

export const TimetableFilters: React.FC<TimetableFiltersProps> = ({
  modules,
  selectedModuleId,
  selectedDayType,
  selectedCompletionStatus,
  searchQuery,
  onModuleChange,
  onDayTypeChange,
  onCompletionStatusChange,
  onSearchChange,
  onJumpToToday,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      {/* Top row: Search & Jump to Today */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dates, topics, or titles..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          onClick={onJumpToToday}
          className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all shrink-0"
        >
          <CalendarIcon className="w-4 h-4 mr-1.5" />
          Jump to Today
        </button>
      </div>

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Module Filter */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Module
          </label>
          <select
            value={selectedModuleId}
            onChange={(e) => onModuleChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Modules (15)</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                M{m.moduleNumber}: {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Day Type Filter */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Day Type
          </label>
          <select
            value={selectedDayType}
            onChange={(e) => onDayTypeChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Day Types</option>
            <option value="weekday">Weekday Sessions</option>
            <option value="weekend">Regular Weekend</option>
            <option value="travel">Travel Weekend</option>
            <option value="buffer">Buffer Days</option>
          </select>
        </div>

        {/* Completion Status Filter */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Status
          </label>
          <select
            value={selectedCompletionStatus}
            onChange={(e) => onCompletionStatusChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed Only</option>
            <option value="pending">Pending / Logged</option>
          </select>
        </div>
      </div>
    </div>
  );
};
