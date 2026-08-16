import React from 'react';
import { SyllabusItem, ScheduleBlock } from '../../types/tracker';
import { CheckCircle, Video, FileCode, HelpCircle, Check, Clock, Link2, X } from 'lucide-react';
import { getClassHoursCoverage, cleanFocusTitle } from '../../utils/seedMigration';

export interface ClassSessionCardProps {
  item: SyllabusItem;
  scheduleBlock: ScheduleBlock;
  allScheduleBlocks: ScheduleBlock[];
  moduleName?: string;
  moduleNumber?: number;
  sessionHours: number;
  isSplit?: boolean;
  onToggleBlockCompleted?: () => void;
  onToggleSubComponent?: (itemId: string, subComponent: 'video' | 'assignment' | 'additional') => void;
  onRemoveSubComponent?: (itemId: string, subComponent: 'assignment' | 'additional') => void;
}

export const ClassSessionCard: React.FC<ClassSessionCardProps> = ({
  item,
  scheduleBlock,
  allScheduleBlocks,
  moduleName,
  moduleNumber,
  sessionHours,
  isSplit,
  onToggleBlockCompleted,
  onToggleSubComponent,
  onRemoveSubComponent,
}) => {
  const coverage = getClassHoursCoverage(item, allScheduleBlocks);
  const matchingBlocks = allScheduleBlocks.filter(
    (b) =>
      (b.itemIds && b.itemIds.includes(item.id)) ||
      (b.focusItems &&
        b.focusItems.some((f) => {
          const cleaned = cleanFocusTitle(f).toLowerCase();
          const itemTitle = item.title.toLowerCase().trim();
          return cleaned && (cleaned.includes(itemTitle) || itemTitle.includes(cleaned));
        }))
  );

  const isSplitClass = matchingBlocks.length > 1;
  const isLastSplitBlock =
    !isSplitClass || (matchingBlocks.length > 0 && matchingBlocks[matchingBlocks.length - 1].id === scheduleBlock.id);

  const isBlockDone = Boolean(scheduleBlock.completed);
  const isMasterDone =
    Boolean(item.completed) ||
    (item.type === 'Class' &&
      Boolean(item.videoCompleted) &&
      Boolean(item.assignmentCompleted) &&
      Boolean(item.additionalProblemsCompleted));

  const isCardChecked = isBlockDone || isMasterDone;

  return (
    <div
      className={`rounded-2xl p-4 border transition-all space-y-3 relative ${
        isBlockDone
          ? 'bg-emerald-950/20 border-emerald-500/30'
          : 'glass-panel border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Session Metadata Pill Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`font-bold px-2 py-0.5 rounded flex items-center space-x-1 ${
              scheduleBlock.block === 'AM'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            <span>
              {scheduleBlock.block} Session Target: {sessionHours}h
            </span>
          </span>
          {isSplit && (
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold px-2 py-0.5 rounded">
              Split Session
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 text-slate-400 font-medium truncate max-w-full">
          <span>{moduleNumber ? `M${moduleNumber}` : ''}{moduleName ? `: ${moduleName}` : ''}</span>
        </div>
      </div>

      {/* Main Session Card Action & Details */}
      <div className="flex items-start space-x-3">
        {/* Checkbox for Session Completion */}
        <button
          type="button"
          onClick={() => onToggleBlockCompleted && onToggleBlockCompleted()}
          className="mt-0.5 shrink-0 focus:outline-none min-h-[32px] min-w-[32px] flex items-center justify-center"
        >
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
              isCardChecked
                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                : 'border-slate-600 bg-slate-800 hover:border-slate-500'
            }`}
          >
            {isCardChecked && <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        </button>

        {/* Title and Hours Distribution */}
        <div className="flex-1 min-w-0">
          <div
            className={`text-xs sm:text-sm font-semibold leading-snug cursor-pointer ${
              isCardChecked ? 'line-through text-slate-400' : 'text-slate-100'
            }`}
            onClick={() => onToggleBlockCompleted && onToggleBlockCompleted()}
          >
            {item.title}
          </div>

          <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>
              Session Est: <strong className="text-slate-200 font-mono">{sessionHours}h</strong>
            </span>
            {isSplit && (
              <span>
                (Class Total: <strong className="text-slate-300 font-mono">{item.estimatedHours}h</strong>)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Class Sub-Components Checklist as Interactive Chips */}
      {item.type === 'Class' && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>Class Sub-Components</span>
            <span className="text-slate-500 font-normal">Syllabus Sync</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Sub-component Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Recordings Chip */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSubComponent && onToggleSubComponent(item.id, 'video');
                }}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all cursor-pointer ${
                  item.videoCompleted
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    item.videoCompleted
                      ? 'bg-indigo-500 border-indigo-400 text-slate-950'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  {item.videoCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Video className="w-2 h-2 text-indigo-400" />}
                </div>
                <span className={item.videoCompleted ? 'line-through opacity-85' : ''}>
                  Recording
                </span>
              </button>

              {/* Assignments Chip (Only on final split session block or non-split class) */}
              {isLastSplitBlock && item.hasAssignment !== false && (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSubComponent && onToggleSubComponent(item.id, 'assignment');
                    }}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all cursor-pointer ${
                      item.assignmentCompleted
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10'
                        : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        item.assignmentCompleted
                          ? 'bg-purple-500 border-purple-400 text-slate-950'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {item.assignmentCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <FileCode className="w-2 h-2 text-purple-400" />}
                    </div>
                    <span className={item.assignmentCompleted ? 'line-through opacity-85' : ''}>
                      Assignments
                    </span>
                  </button>
                  {onRemoveSubComponent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSubComponent(item.id, 'assignment');
                      }}
                      className="ml-1 p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove Assignments"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Homeworks Chip (Only on final split session block or non-split class) */}
              {isLastSplitBlock && item.hasAdditionalProblems !== false && (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSubComponent && onToggleSubComponent(item.id, 'additional');
                    }}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all cursor-pointer ${
                      item.additionalProblemsCompleted
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                        : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        item.additionalProblemsCompleted
                          ? 'bg-amber-500 border-amber-400 text-slate-950'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {item.additionalProblemsCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <HelpCircle className="w-2 h-2 text-amber-400" />}
                    </div>
                    <span className={item.additionalProblemsCompleted ? 'line-through opacity-85' : ''}>
                      Homeworks
                    </span>
                  </button>
                  {onRemoveSubComponent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSubComponent(item.id, 'additional');
                      }}
                      className="ml-1 p-0.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove Homeworks"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Coverage Fill Badge (Integrated Progress Bar inside Box) */}
            <div className="shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
              <div
                className={`relative overflow-hidden rounded-lg px-2.5 py-1 text-[10px] font-bold font-mono border whitespace-nowrap transition-colors ${
                  coverage.progressPct === 100
                    ? 'border-emerald-500/40 text-emerald-300 bg-slate-950/80 shadow-sm shadow-emerald-500/10'
                    : 'border-indigo-500/30 text-indigo-200 bg-slate-950/80'
                }`}
              >
                {/* Dynamic Fill Layer */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out border-r ${
                    coverage.progressPct === 100
                      ? 'bg-emerald-500/25 border-emerald-400/50'
                      : 'bg-indigo-500/25 border-indigo-400/50'
                  }`}
                  style={{ width: `${coverage.progressPct}%` }}
                />
                {/* Badge Label */}
                <span className="relative z-10">
                  Coverage: {coverage.completedHours}h / {coverage.totalHours}h ({coverage.progressPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
