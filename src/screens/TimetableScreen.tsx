import React, { useState, useMemo, useRef } from 'react';
import { useTrackerStore, normalizeSyllabusItem } from '../store/useTrackerStore';
import { TimetableFilters } from '../components/Timetable/TimetableFilters';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScheduleBlock, SyllabusItem } from '../types/tracker';
import { Calendar, Plane, Shield, Clock, ArrowRight, Moon } from 'lucide-react';
import { cleanFocusTitle, parseFocusItemHours, getSessionHoursAndSplitState } from '../utils/seedMigration';
import { ClassSessionCard } from '../components/Common/ClassSessionCard';

interface DateGroup {
  date: string;
  dayOfWeek: string;
  isTravelWeekend: boolean;
  isBuffer: boolean;
  amBlock?: ScheduleBlock;
  pmBlock?: ScheduleBlock;
}

export const TimetableScreen: React.FC = () => {
  const {
    scheduleBlocks,
    syllabusItems,
    modules,
    currentDateStr,
    updateBlockLog,
    toggleItemCompletion,
    toggleSubComponentCompletion,
    removeSubComponent,
    restoreSubComponent,
    reassignScheduleBlockDate,
    setCurrentDateStr,
  } = useTrackerStore();

  const [selectedModuleId, setSelectedModuleId] = useState('all');
  const [selectedDayType, setSelectedDayType] = useState('all');
  const [selectedCompletionStatus, setSelectedCompletionStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Group blocks by date
  const dateGroups = useMemo(() => {
    const map = new Map<string, DateGroup>();

    for (const block of scheduleBlocks) {
      let group = map.get(block.date);
      if (!group) {
        group = {
          date: block.date,
          dayOfWeek: block.dayOfWeek,
          isTravelWeekend: block.isTravelWeekend,
          isBuffer: block.isBuffer,
        };
        map.set(block.date, group);
      }
      if (block.block === 'AM') group.amBlock = block;
      if (block.block === 'PM') group.pmBlock = block;
    }

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [scheduleBlocks]);

  // Filter groups
  const filteredDateGroups = useMemo(() => {
    return dateGroups.filter((group) => {
      // Day Type Filter
      if (selectedDayType === 'travel' && !group.isTravelWeekend) return false;
      if (selectedDayType === 'buffer' && !group.isBuffer) return false;
      if (selectedDayType === 'weekday' && ['Sat', 'Sun'].includes(group.dayOfWeek)) return false;
      if (selectedDayType === 'weekend' && !['Sat', 'Sun'].includes(group.dayOfWeek)) return false;

      // Completion Status Filter
      if (selectedCompletionStatus === 'completed') {
        const amDone = group.amBlock ? group.amBlock.completed : true;
        const pmDone = group.pmBlock ? group.pmBlock.completed : true;
        if (!amDone || !pmDone) return false;
      }
      if (selectedCompletionStatus === 'pending') {
        const amDone = group.amBlock ? group.amBlock.completed : false;
        const pmDone = group.pmBlock ? group.pmBlock.completed : false;
        if (amDone && pmDone) return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const dateMatch = group.date.includes(q) || group.dayOfWeek.toLowerCase().includes(q);
        const amMatch = group.amBlock?.focusItems.some((f) => f.toLowerCase().includes(q));
        const pmMatch = group.pmBlock?.focusItems.some((f) => f.toLowerCase().includes(q));
        if (!dateMatch && !amMatch && !pmMatch) return false;
      }

      // Module Filter
      if (selectedModuleId !== 'all') {
        const matchingModule = modules.find((m) => m.id === selectedModuleId);
        const modulePrefix = matchingModule ? `M${matchingModule.moduleNumber}` : '';
        const amHasMod = group.amBlock?.focusItems.some((f) => f.includes(modulePrefix));
        const pmHasMod = group.pmBlock?.focusItems.some((f) => f.includes(modulePrefix));
        if (!amHasMod && !pmHasMod) return false;
      }

      return true;
    });
  }, [dateGroups, selectedDayType, selectedCompletionStatus, searchQuery, selectedModuleId, modules]);

  // Virtualizer setup
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredDateGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320,
    overscan: 5,
  });

  const handleJumpToToday = () => {
    const todayIndex = filteredDateGroups.findIndex((g) => g.date === currentDateStr);
    if (todayIndex !== -1 && parentRef.current) {
      rowVirtualizer.scrollToIndex(todayIndex, { align: 'start' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
            Timetable Calendar
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            404 AM/PM study blocks from 1 Aug 2026 to 18 Feb 2027
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full">
          {filteredDateGroups.length} Days Displayed
        </span>
      </div>

      {/* Filter Component */}
      <TimetableFilters
        modules={modules}
        selectedModuleId={selectedModuleId}
        selectedDayType={selectedDayType}
        selectedCompletionStatus={selectedCompletionStatus}
        searchQuery={searchQuery}
        onModuleChange={setSelectedModuleId}
        onDayTypeChange={setSelectedDayType}
        onCompletionStatusChange={setSelectedCompletionStatus}
        onSearchChange={setSearchQuery}
        onJumpToToday={handleJumpToToday}
      />

      {/* Virtualized Date Group List */}
      <div
        ref={parentRef}
        className="h-[calc(100vh-280px)] min-h-[500px] overflow-auto pr-1 space-y-4 rounded-2xl"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const group = filteredDateGroups[virtualRow.index];
            const isToday = group.date === currentDateStr;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="pb-4"
              >
                <div
                  className={`glass-panel rounded-2xl p-4 border transition-all ${
                    isToday
                      ? 'border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                      : group.isTravelWeekend
                      ? 'border-sky-500/40 bg-sky-950/20'
                      : group.isBuffer
                      ? 'border-slate-700 bg-slate-900/30'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Date Group Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`text-sm font-extrabold px-3 py-1 rounded-xl ${
                          isToday
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        {group.dayOfWeek} • {group.date}
                      </span>

                      {isToday && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/30">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {group.isTravelWeekend && (
                        <span className="flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          <Plane className="w-3.5 h-3.5 mr-1" /> Travel Weekend
                        </span>
                      )}
                      {group.isBuffer && (
                        <span className="flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          <Shield className="w-3.5 h-3.5 mr-1" /> Buffer Week
                        </span>
                      )}
                    </div>
                  </div>

                  {/* AM & PM Block Rows */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    {[group.amBlock, group.pmBlock].map((block) => {
                      if (!block) return null;

                      let matchedItems: SyllabusItem[] = [];
                      if (block.itemIds && block.itemIds.length > 0) {
                        matchedItems = block.itemIds
                          .map((id) => syllabusItems.find((i) => i.id === id))
                          .filter((item): item is SyllabusItem => Boolean(item));
                      }
                      if (matchedItems.length === 0 && block.focusItems && Array.isArray(block.focusItems)) {
                        for (const focusStr of block.focusItems) {
                          const cleaned = cleanFocusTitle(focusStr).toLowerCase();
                          if (!cleaned) continue;
                          const matched = syllabusItems.find((item) => {
                            const titleLower = item.title.trim().toLowerCase();
                            return titleLower === cleaned || titleLower.includes(cleaned) || cleaned.includes(titleLower);
                          });
                          if (matched && !matchedItems.some((i) => i.id === matched.id)) {
                            matchedItems.push(matched);
                          }
                        }
                      }
                      const blockSyllabusItems = matchedItems.map(normalizeSyllabusItem);

                      return (
                        <div
                          key={block.id}
                          className="bg-slate-900/60 rounded-xl p-3.5 border border-slate-800/80 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                block.block === 'AM'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-indigo-500/20 text-indigo-300'
                              }`}
                            >
                              {block.block} ({block.timeWindow})
                            </span>
                            <span className="text-xs font-medium text-slate-400">
                              Target: {block.targetHours}h
                            </span>
                          </div>

                          {/* Focus Items List with Unified ClassCard */}
                          <div className="space-y-2.5">
                            {blockSyllabusItems.length > 0 ? (
                              blockSyllabusItems.map((item) => {
                                const { sessionHours, isSplit } = getSessionHoursAndSplitState(item, block, scheduleBlocks);
                                const mod = modules.find((m) => m.id === item.moduleId);

                                return (
                                  <ClassSessionCard
                                    key={item.id}
                                    item={item}
                                    scheduleBlock={block}
                                    allScheduleBlocks={scheduleBlocks}
                                    moduleName={mod?.name}
                                    moduleNumber={mod?.moduleNumber}
                                    sessionHours={sessionHours}
                                    isSplit={isSplit}
                                    onToggleBlockCompleted={() => updateBlockLog(block.id, { completed: !block.completed })}
                                    onToggleSubComponent={toggleSubComponentCompletion}
                                    onRemoveSubComponent={removeSubComponent}
                                    onRestoreSubComponent={restoreSubComponent}
                                  />
                                );
                              })
                            ) : (
                              block.focusItems.map((f, i) => {
                                const cleaned = cleanFocusTitle(f);
                                const rawParsedHours = parseFocusItemHours(f, 2.5);
                                const realMatch = syllabusItems.find(
                                  (s) =>
                                    s.title &&
                                    (s.title.toLowerCase().trim().includes(cleaned.toLowerCase()) ||
                                      cleaned.toLowerCase().includes(s.title.toLowerCase().trim()))
                                );

                                if (realMatch) {
                                  const { sessionHours, isSplit } = getSessionHoursAndSplitState(realMatch, block, scheduleBlocks);
                                  const mod = modules.find((m) => m.id === realMatch.moduleId);
                                  return (
                                    <ClassSessionCard
                                      key={realMatch.id}
                                      item={realMatch}
                                      scheduleBlock={block}
                                      allScheduleBlocks={scheduleBlocks}
                                      moduleName={mod?.name}
                                      moduleNumber={mod?.moduleNumber}
                                      sessionHours={sessionHours}
                                      isSplit={isSplit}
                                      onToggleBlockCompleted={() => updateBlockLog(block.id, { completed: !block.completed })}
                                      onToggleSubComponent={toggleSubComponentCompletion}
                                      onRemoveSubComponent={removeSubComponent}
                                      onRestoreSubComponent={restoreSubComponent}
                                    />
                                  );
                                }

                                const fallbackItem: SyllabusItem = {
                                  id: `virtual-tt-${i}`,
                                  moduleId: 'm4',
                                  sequence: i + 1,
                                  title: cleaned,
                                  type: 'Class',
                                  estimatedHours: rawParsedHours,
                                  completed: block.completed || false,
                                  videoCompleted: block.completed || false,
                                  assignmentCompleted: block.completed || false,
                                  additionalProblemsCompleted: block.completed || false,
                                };

                                return (
                                  <ClassSessionCard
                                    key={i}
                                    item={fallbackItem}
                                    scheduleBlock={block}
                                    allScheduleBlocks={scheduleBlocks}
                                    sessionHours={rawParsedHours}
                                    isSplit={false}
                                    onToggleBlockCompleted={() => updateBlockLog(block.id, { completed: !block.completed })}
                                    onToggleSubComponent={(_id, subComp) => {
                                      const updatedSub = !fallbackItem[
                                        subComp === 'video'
                                          ? 'videoCompleted'
                                          : subComp === 'assignment'
                                          ? 'assignmentCompleted'
                                          : 'additionalProblemsCompleted'
                                      ];
                                      const nextVid = subComp === 'video' ? updatedSub : fallbackItem.videoCompleted;
                                      const nextAssign = subComp === 'assignment' ? updatedSub : fallbackItem.assignmentCompleted;
                                      const nextAdd = subComp === 'additional' ? updatedSub : fallbackItem.additionalProblemsCompleted;
                                      const allDone = nextVid && nextAssign && nextAdd;
                                      updateBlockLog(block.id, { completed: allDone });
                                    }}
                                    onRemoveSubComponent={removeSubComponent ? (_id, subComp) => {
                                      const matched = syllabusItems.find((s) => s.title && s.title.toLowerCase().trim().includes(cleaned.toLowerCase()));
                                      if (matched) removeSubComponent(matched.id, subComp);
                                    } : undefined}
                                    onRestoreSubComponent={restoreSubComponent ? (_id, subComp) => {
                                      const matched = syllabusItems.find((s) => s.title && s.title.toLowerCase().trim().includes(cleaned.toLowerCase()));
                                      if (matched) restoreSubComponent(matched.id, subComp);
                                    } : undefined}
                                  />
                                );
                              })
                            )}
                          </div>

                          {/* Inline Log Controls */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-slate-400">Logged:</span>
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max="8"
                                value={block.actualHours ?? 0}
                                onChange={(e) =>
                                  updateBlockLog(block.id, {
                                    actualHours: parseFloat(e.target.value) || 0,
                                  })
                                }
                                className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-indigo-300 font-mono text-center focus:outline-none focus:border-indigo-500"
                              />
                              <span className="text-slate-400">hrs</span>
                            </div>

                            {block.block === 'AM' && (
                              <div className="flex items-center space-x-1.5">
                                <Moon className="w-3.5 h-3.5 text-purple-400" />
                                <span className="text-slate-400">Sleep:</span>
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max="12"
                                  value={block.sleepHours ?? 7}
                                  onChange={(e) =>
                                    updateBlockLog(block.id, {
                                      sleepHours: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-purple-300 font-mono text-center focus:outline-none focus:border-purple-500"
                                />
                                <span className="text-slate-400">hrs</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
