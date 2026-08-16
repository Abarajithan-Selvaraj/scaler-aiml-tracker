import React from 'react';
import { ScheduleBlock, SyllabusItem } from '../../types/tracker';
import { Check, Clock, Moon, Plus, Minus, Plane, Shield, CheckCircle } from 'lucide-react';
import { cleanFocusTitle, parseFocusItemHours, getSessionHoursAndSplitState } from '../../utils/seedMigration';
import { useTrackerStore, normalizeSyllabusItem } from '../../store/useTrackerStore';
import { ClassSessionCard } from '../Common/ClassSessionCard';

interface BlockQuickLogCardProps {
  block: ScheduleBlock;
  syllabusItems: SyllabusItem[];
  onToggleItem: (itemId: string) => void;
  onToggleSubComponent: (itemId: string, subComponent: 'video' | 'assignment' | 'additional') => void;
  onUpdateBlock: (
    blockId: string,
    patch: { actualHours?: number | null; sleepHours?: number | null; notes?: string; completed?: boolean }
  ) => void;
}

export const BlockQuickLogCard: React.FC<BlockQuickLogCardProps> = ({
  block,
  syllabusItems,
  onToggleItem,
  onToggleSubComponent,
  onUpdateBlock,
}) => {
  const { scheduleBlocks, modules } = useTrackerStore();
  const actualHours = block.actualHours ?? 0;
  const sleepHours = block.sleepHours ?? 7.0;

  // Resolve item titles & completion with robust string matching fallback
  const blockSyllabusItems = React.useMemo(() => {
    let items: SyllabusItem[] = [];

    if (block.itemIds && block.itemIds.length > 0) {
      items = block.itemIds
        .map((id) => syllabusItems.find((item) => item.id === id))
        .filter((item): item is SyllabusItem => Boolean(item));
    }

    if (items.length === 0 && block.focusItems && Array.isArray(block.focusItems)) {
      for (const focusStr of block.focusItems) {
        const cleaned = cleanFocusTitle(focusStr).toLowerCase();
        if (!cleaned) continue;
        const matched = syllabusItems.find((item) => {
          const titleLower = item.title.trim().toLowerCase();
          return titleLower === cleaned || titleLower.includes(cleaned) || cleaned.includes(titleLower);
        });
        if (matched && !items.some((i) => i.id === matched.id)) {
          items.push(matched);
        }
      }
    }

    return items.map(normalizeSyllabusItem);
  }, [block, syllabusItems]);

  const handleActualHoursChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(8, Math.round(newVal * 4) / 4));
    onUpdateBlock(block.id, { actualHours: clamped });
  };

  const handleSleepHoursChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(12, Math.round(newVal * 4) / 4));
    onUpdateBlock(block.id, { sleepHours: clamped });
  };

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-4 border border-slate-800 shadow-xl">
      {/* Block Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              block.block === 'AM'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            {block.block} Session
          </span>
          <span className="text-xs text-slate-300 font-medium">{block.timeWindow}</span>
        </div>

        <div className="flex items-center space-x-2">
          {block.isTravelWeekend && (
            <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              <Plane className="w-3 h-3 mr-1" /> Travel
            </span>
          )}
          {block.isBuffer && (
            <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700/50 text-slate-300 border border-slate-600">
              <Shield className="w-3 h-3 mr-1" /> Buffer
            </span>
          )}
          <span className="text-xs font-semibold text-slate-400">
            Target: <strong className="text-slate-200">{block.targetHours}h</strong>
          </span>
        </div>
      </div>

      {/* Focus Items Checklist */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
          Today's Syllabus Focus
        </div>

        {blockSyllabusItems.length > 0 ? (
          <div className="space-y-2.5">
            {blockSyllabusItems.map((item) => {
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
                  onToggleBlockCompleted={() => onUpdateBlock(block.id, { completed: !block.completed })}
                  onToggleSubComponent={onToggleSubComponent}
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-2.5">
            {block.focusItems.map((focusStr, idx) => {
              const cleaned = cleanFocusTitle(focusStr);
              const sessionHours = parseFocusItemHours(focusStr, 2.5);
              const realMatch = syllabusItems.find(
                (s) =>
                  s.title &&
                  (s.title.toLowerCase().trim().includes(cleaned.toLowerCase()) ||
                    cleaned.toLowerCase().includes(s.title.toLowerCase().trim()))
              );

              if (realMatch) {
                const isSplit = sessionHours > 0 && sessionHours !== realMatch.estimatedHours;
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
                    onToggleBlockCompleted={() => onUpdateBlock(block.id, { completed: !block.completed })}
                    onToggleSubComponent={onToggleSubComponent}
                  />
                );
              }

              const fallbackItem: SyllabusItem = {
                id: `virtual-${idx}`,
                moduleId: 'm4',
                sequence: idx + 1,
                title: cleaned,
                type: 'Class',
                estimatedHours: sessionHours,
                completed: block.completed || false,
                videoCompleted: block.completed || false,
                assignmentCompleted: block.completed || false,
                additionalProblemsCompleted: block.completed || false,
              };

              return (
                <ClassSessionCard
                  key={idx}
                  item={fallbackItem}
                  scheduleBlock={block}
                  allScheduleBlocks={scheduleBlocks}
                  sessionHours={sessionHours}
                  isSplit={false}
                  onToggleBlockCompleted={() => onUpdateBlock(block.id, { completed: !block.completed })}
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
                    onUpdateBlock(block.id, { completed: allDone });
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Actual Hours Quick Stepper & Slider */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            Actual Hours Studied
          </span>
          <span className="font-bold text-indigo-300 font-mono text-sm">
            {actualHours.toFixed(2)} hrs
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => handleActualHoursChange(actualHours - 0.25)}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-lg transition-transform"
            aria-label="Decrease hours"
          >
            <Minus className="w-4 h-4" />
          </button>

          <input
            type="range"
            min="0"
            max="8"
            step="0.25"
            value={actualHours}
            onChange={(e) => handleActualHoursChange(parseFloat(e.target.value))}
            className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />

          <button
            type="button"
            onClick={() => handleActualHoursChange(actualHours + 0.25)}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-lg transition-transform"
            aria-label="Increase hours"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sleep Hours Slider (AM Block Only) */}
      {block.block === 'AM' && (
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center">
              <Moon className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Sleep Logged Last Night
            </span>
            <span className="font-bold text-indigo-300 font-mono text-sm">
              {sleepHours.toFixed(2)} hrs
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleSleepHoursChange(sleepHours - 0.25)}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-lg transition-transform"
              aria-label="Decrease sleep hours"
            >
              <Minus className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="0"
              max="12"
              step="0.25"
              value={sleepHours}
              onChange={(e) => handleSleepHoursChange(parseFloat(e.target.value))}
              className="flex-1 accent-purple-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleSleepHoursChange(sleepHours + 0.25)}
              className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-lg transition-transform"
              aria-label="Increase sleep hours"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Block Completed Toggle */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onUpdateBlock(block.id, { completed: !block.completed })}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all min-h-[44px] ${
            block.completed
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>{block.completed ? 'Session Marked Completed' : 'Mark Session Completed'}</span>
        </button>
      </div>
    </div>
  );
};
