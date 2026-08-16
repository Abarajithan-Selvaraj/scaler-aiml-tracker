import React from 'react';
import { SyllabusItem, ScheduleBlock } from '../../types/tracker';
import { CheckCircle, Video, FileCode, HelpCircle, Check, Clock, Link2 } from 'lucide-react';
import { getClassHoursCoverage } from '../../utils/seedMigration';

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
}) => {
  const coverage = getClassHoursCoverage(item, allScheduleBlocks);
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
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center space-x-2">
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

        <div className="flex items-center space-x-1 text-slate-400 font-medium">
          <Link2 className="w-3 h-3 text-indigo-400" />
          <span>Class #{item.sequence}</span>
          {(moduleName || moduleNumber) && (
            <span className="text-slate-500">
              ({moduleNumber ? `M${moduleNumber}` : ''}
              {moduleName ? `: ${moduleName}` : ''})
            </span>
          )}
        </div>
      </div>

      {/* Main Session Card Action & Details */}
      <div className="flex items-start space-x-3">
        {/* Checkbox for Session Completion */}
        <button
          type="button"
          onClick={() => onToggleBlockCompleted && onToggleBlockCompleted()}
          className="mt-0.5 shrink-0 focus:outline-none"
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
            className={`text-xs font-semibold leading-snug cursor-pointer ${
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

        {/* Coverage Badge & Progress Bar */}
        <div className="text-right shrink-0 space-y-1 ml-2">
          <div className="text-[10px] font-bold text-indigo-300 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Coverage: {coverage.completedHours}h / {coverage.totalHours}h ({coverage.progressPct}%)
          </div>
          <div className="w-24 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800 ml-auto">
            <div
              className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${coverage.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Class Sub-Components Checklist */}
      {item.type === 'Class' && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>Class Sub-Components</span>
            <span className="text-slate-500 font-normal">Syllabus Sync</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            {/* Recordings Row */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSubComponent && onToggleSubComponent(item.id, 'video');
              }}
              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors text-left"
            >
              <div className="flex items-center space-x-2 text-xs">
                <div
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    item.videoCompleted
                      ? 'bg-indigo-500 border-indigo-400 text-slate-950'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  {item.videoCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <Video className="w-3 h-3 text-indigo-400 shrink-0" />
                <span
                  className={
                    item.videoCompleted ? 'line-through text-slate-400 text-[11px]' : 'text-slate-200 text-[11px] font-medium'
                  }
                >
                  Recordings
                </span>
              </div>
            </button>

            {/* Assignments Row */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSubComponent && onToggleSubComponent(item.id, 'assignment');
              }}
              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors text-left"
            >
              <div className="flex items-center space-x-2 text-xs">
                <div
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    item.assignmentCompleted
                      ? 'bg-purple-500 border-purple-400 text-slate-950'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  {item.assignmentCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <FileCode className="w-3 h-3 text-purple-400 shrink-0" />
                <span
                  className={
                    item.assignmentCompleted ? 'line-through text-slate-400 text-[11px]' : 'text-slate-200 text-[11px] font-medium'
                  }
                >
                  Assignments
                </span>
              </div>
            </button>

            {/* Additional Problems Row */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSubComponent && onToggleSubComponent(item.id, 'additional');
              }}
              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors text-left"
            >
              <div className="flex items-center space-x-2 text-xs">
                <div
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    item.additionalProblemsCompleted
                      ? 'bg-amber-500 border-amber-400 text-slate-950'
                      : 'border-slate-600 bg-slate-800'
                  }`}
                >
                  {item.additionalProblemsCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <HelpCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span
                  className={
                    item.additionalProblemsCompleted
                      ? 'line-through text-slate-400 text-[11px]'
                      : 'text-slate-200 text-[11px] font-medium'
                  }
                >
                  Additional
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
