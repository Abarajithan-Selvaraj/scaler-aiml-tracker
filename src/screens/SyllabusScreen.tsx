import React, { useState, useMemo } from 'react';
import { useTrackerStore, normalizeSyllabusItem } from '../store/useTrackerStore';
import { getClassHoursCoverage } from '../utils/seedMigration';
import { Search, BookOpen, CheckCircle, Video, FileCode, HelpCircle, Check, GripVertical, ChevronUp, ChevronDown, Clock } from 'lucide-react';

export const SyllabusScreen: React.FC = () => {
  const {
    syllabusItems,
    scheduleBlocks,
    modules,
    toggleItemCompletion,
    toggleSubComponentCompletion,
    reorderSyllabusItems,
    moveSyllabusItem,
  } = useTrackerStore();

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
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', item.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const sourceId = e.dataTransfer.getData('text/plain');
                if (sourceId && sourceId !== item.id) {
                  reorderSyllabusItems(sourceId, item.id);
                }
              }}
              className={`glass-panel rounded-xl p-3.5 border transition-all cursor-grab active:cursor-grabbing ${
                item.completed
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Drag Handle & Reorder Controls */}
                <div className="flex flex-col items-center justify-center shrink-0 pt-0.5 text-slate-500 hover:text-slate-300 space-y-0.5" title="Drag to reorder">
                  <GripVertical className="w-4 h-4 cursor-grab" />
                  <div className="flex flex-col">
                    <button
                      type="button"
                      title="Move up"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSyllabusItem(item.id, 'up');
                      }}
                      className="p-0.5 hover:text-indigo-300 transition-colors"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      title="Move down"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveSyllabusItem(item.id, 'down');
                      }}
                      className="p-0.5 hover:text-indigo-300 transition-colors"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div
                  className="flex-1 flex items-start space-x-3 cursor-pointer"
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

                  {(() => {
                    const coverage = getClassHoursCoverage(item, scheduleBlocks);
                    return (
                      <div className="text-right shrink-0 space-y-1 ml-2">
                        <div className="text-[10px] font-semibold text-slate-400">
                          Est: <strong className="text-slate-300 font-mono">{item.estimatedHours}h</strong>
                        </div>
                        <div className="text-[10px] font-bold text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {coverage.completedHours}h / {coverage.totalHours}h ({coverage.progressPct}%)
                        </div>
                        <div className="w-20 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800 ml-auto">
                          <div
                            className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${coverage.progressPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Sub-Components Checklist (Recordings, Assignments, Additional Problems) */}
              {item.type === 'Class' && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5 pl-8">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Class Sub-Components
                  </div>

                  {/* Recordings Row */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubComponentCompletion(item.id, 'video');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2.5 text-xs">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          item.videoCompleted
                            ? 'bg-indigo-500 border-indigo-400 text-slate-950'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {item.videoCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <Video className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span
                        className={
                          item.videoCompleted ? 'line-through text-slate-400 font-medium' : 'text-slate-200 font-semibold'
                        }
                      >
                        Recordings
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.videoCompleted
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.videoCompleted ? 'Completed' : 'Pending'}
                    </span>
                  </button>

                  {/* Assignments Row */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubComponentCompletion(item.id, 'assignment');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2.5 text-xs">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          item.assignmentCompleted
                            ? 'bg-purple-500 border-purple-400 text-slate-950'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {item.assignmentCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span
                        className={
                          item.assignmentCompleted ? 'line-through text-slate-400 font-medium' : 'text-slate-200 font-semibold'
                        }
                      >
                        Assignments
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.assignmentCompleted
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.assignmentCompleted ? 'Completed' : 'Pending'}
                    </span>
                  </button>

                  {/* Additional Problems Row */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSubComponentCompletion(item.id, 'additional');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2.5 text-xs">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          item.additionalProblemsCompleted
                            ? 'bg-amber-500 border-amber-400 text-slate-950'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {item.additionalProblemsCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span
                        className={
                          item.additionalProblemsCompleted
                            ? 'line-through text-slate-400 font-medium'
                            : 'text-slate-200 font-semibold'
                        }
                      >
                        Additional Problems
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.additionalProblemsCompleted
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.additionalProblemsCompleted ? 'Completed' : 'Pending'}
                    </span>
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
