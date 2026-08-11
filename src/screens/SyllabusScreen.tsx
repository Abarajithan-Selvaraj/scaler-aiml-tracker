import React, { useState, useMemo } from 'react';
import { useTrackerStore, normalizeSyllabusItem } from '../store/useTrackerStore';
import { Search, BookOpen, CheckCircle, Video, FileCode, HelpCircle, Check } from 'lucide-react';

export const SyllabusScreen: React.FC = () => {
  const { syllabusItems, modules, toggleItemCompletion, toggleSubComponentCompletion } =
    useTrackerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedModuleId, setSelectedModuleId] = useState('all');

  const normalizedSyllabusItems = useMemo(
    () => syllabusItems.map(normalizeSyllabusItem),
    [syllabusItems]
  );

  const filteredItems = useMemo(() => {
    return normalizedSyllabusItems.filter((item) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesType = item.type.toLowerCase().includes(q);
        if (!matchesTitle && !matchesType) return false;
      }

      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) return false;

      // Module filter
      if (selectedModuleId !== 'all' && item.moduleId !== selectedModuleId) return false;

      return true;
    });
  }, [normalizedSyllabusItems, searchQuery, selectedType, selectedModuleId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-indigo-400" />
            Full Syllabus List ({syllabusItems.length} Items)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Flat, searchable list of classes, research papers, skill tests, mocks & capstones
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full">
          {filteredItems.length} Matched
        </span>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search all 270 class titles, papers, or topics (e.g. Docker, Git, CNN)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Type Filter */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Content Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Content Types</option>
              <option value="Class">Class Lectures</option>
              <option value="Paper">Research Papers</option>
              <option value="Test">Skill Tests</option>
              <option value="Mock">Mock Interviews</option>
              <option value="Capstone">Capstone Projects</option>
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Module Filter
            </label>
            <select
              value={selectedModuleId}
              onChange={(e) => setSelectedModuleId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Modules</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  M{m.moduleNumber}: {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Item List */}
      <div className="space-y-2.5">
        {filteredItems.map((item) => {
          const mod = modules.find((m) => m.id === item.moduleId);

          return (
            <div
              key={item.id}
              className={`glass-panel rounded-xl p-3.5 border transition-all ${
                item.completed
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200'
              }`}
            >
              <div
                className="flex items-start space-x-3.5 cursor-pointer"
                onClick={() => toggleItemCompletion(item.id)}
              >
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                    item.completed
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  {item.completed && <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        item.type === 'Class'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : item.type === 'Paper'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {item.type} #{item.sequence}
                    </span>
                    {mod && (
                      <span className="text-[10px] text-slate-400 truncate">
                        M{mod.moduleNumber}: {mod.name}
                      </span>
                    )}
                  </div>

                  <div
                    className={`text-xs font-semibold mt-1 leading-snug ${
                      item.completed ? 'line-through opacity-75' : 'text-slate-100'
                    }`}
                  >
                    {item.title}
                  </div>
                </div>

                <div className="text-right shrink-0 text-[11px] font-semibold text-slate-400">
                  {item.estimatedHours}h est.
                </div>
              </div>

              {/* Sub-Components Pills for Class Items */}
              {item.type === 'Class' && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5 pl-8">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubComponentCompletion(item.id, 'video');
                    }}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                      item.videoCompleted
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span>Video Recording</span>
                    {item.videoCompleted && <Check className="w-3 h-3 text-indigo-300 ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubComponentCompletion(item.id, 'assignment');
                    }}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                      item.assignmentCompleted
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <FileCode className="w-3 h-3" />
                    <span>Assignments</span>
                    {item.assignmentCompleted && <Check className="w-3 h-3 text-purple-300 ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubComponentCompletion(item.id, 'additional');
                    }}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                      item.additionalProblemsCompleted
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Additional Problems</span>
                    {item.additionalProblemsCompleted && <Check className="w-3 h-3 text-amber-300 ml-0.5" />}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
