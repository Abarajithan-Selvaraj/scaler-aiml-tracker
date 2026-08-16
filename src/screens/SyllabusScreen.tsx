import React, { useState, useMemo } from 'react';
import { useTrackerStore, normalizeSyllabusItem } from '../store/useTrackerStore';
import { ClassCard } from '../components/Common/ClassCard';
import { Search, BookOpen } from 'lucide-react';

export const SyllabusScreen: React.FC = () => {
  const {
    syllabusItems,
    scheduleBlocks,
    modules,
    toggleItemCompletion,
    toggleSubComponentCompletion,
    removeSubComponent,
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
        {filteredItems.map((item, idx) => {
          const mod = modules.find((m) => m.id === item.moduleId);

          return (
            <ClassCard
              key={item.id}
              item={item}
              scheduleBlocks={scheduleBlocks}
              moduleName={mod?.name}
              moduleNumber={mod?.moduleNumber}
              onToggleItem={toggleItemCompletion}
              onToggleSubComponent={toggleSubComponentCompletion}
              onRemoveSubComponent={removeSubComponent}
              showDragHandle={true}
              index={idx}
              onDragStart={(e, i) => {
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
              onMoveUp={() => moveSyllabusItem(item.id, 'up')}
              onMoveDown={() => moveSyllabusItem(item.id, 'down')}
            />
          );
        })}
      </div>
    </div>
  );
};
