import React from 'react';
import { ScheduleBlock, SyllabusItem } from '../../types/tracker';
import { Check, Clock, Moon, Plus, Minus, CheckCircle, Plane, Shield, Video, FileCode, HelpCircle } from 'lucide-react';
import { cleanFocusTitle, parseFocusItemHours } from '../../utils/seedMigration';
import { normalizeSyllabusItem } from '../../store/useTrackerStore';

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
  const actualHours = block.actualHours ?? 0;
  const sleepHours = block.sleepHours ?? 7.0;

  // Resolve item titles & completion
  const blockSyllabusItems = (block.itemIds || [])
    .map((id) => syllabusItems.find((item) => item.id === id))
    .filter((item): item is SyllabusItem => Boolean(item))
    .map(normalizeSyllabusItem);

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
              const matchedFocusStr = block.focusItems.find(f => cleanFocusTitle(f).toLowerCase().includes(item.title.toLowerCase().trim())) || block.focusItems[0] || '';
              const sessionHours = parseFocusItemHours(matchedFocusStr, item.estimatedHours);
              const isSplit = sessionHours > 0 && sessionHours !== item.estimatedHours;

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    block.completed || item.completed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  {/* Main Class Checkbox */}
                  <div className="flex items-start space-x-3 cursor-pointer" onClick={() => onToggleItem(item.id)}>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        item.completed || block.completed
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {(item.completed || block.completed) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1 text-xs leading-snug">
                      <span className={item.completed || block.completed ? 'line-through opacity-80' : 'font-medium'}>
                        {item.title}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Session Est: <strong className="text-slate-300">{sessionHours}h</strong>
                        {isSplit && <span> (Class Total: {item.estimatedHours}h)</span>} • Type: {item.type}
                      </div>
                    </div>
                  </div>

                {/* Sub-Components Pills for Class Items */}
                {item.type === 'Class' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                    {/* Video Recording Pill */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSubComponent(item.id, 'video');
                      }}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                        item.videoCompleted
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <Video className="w-3 h-3" />
                      <span>Video</span>
                      {item.videoCompleted && <Check className="w-3 h-3 text-indigo-300 ml-0.5" />}
                    </button>

                    {/* Assignment Pill */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSubComponent(item.id, 'assignment');
                      }}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                        item.assignmentCompleted
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <FileCode className="w-3 h-3" />
                      <span>Assignment</span>
                      {item.assignmentCompleted && <Check className="w-3 h-3 text-purple-300 ml-0.5" />}
                    </button>

                    {/* Additional Problems Pill */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSubComponent(item.id, 'additional');
                      }}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                        item.additionalProblemsCompleted
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Add. Problems</span>
                      {item.additionalProblemsCompleted && <Check className="w-3 h-3 text-amber-300 ml-0.5" />}
                    </button>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        ) : (
          <div className="space-y-1.5">
            {block.focusItems.map((focusStr, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-300"
              >
                {cleanFocusTitle(focusStr)}
              </div>
            ))}
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
