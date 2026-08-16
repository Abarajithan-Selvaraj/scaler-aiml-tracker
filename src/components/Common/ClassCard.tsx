import React from 'react';
import { SyllabusItem, ScheduleBlock } from '../../types/tracker';
import { CheckCircle, Video, FileCode, HelpCircle, Check, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { getClassHoursCoverage } from '../../utils/seedMigration';

export interface ClassCardProps {
  item: SyllabusItem;
  scheduleBlocks: ScheduleBlock[];
  moduleName?: string;
  moduleNumber?: number;
  sessionHours?: number;
  isSplit?: boolean;
  onToggleItem?: (itemId: string) => void;
  onToggleSubComponent?: (itemId: string, subComponent: 'video' | 'assignment' | 'additional') => void;
  showDragHandle?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  index?: number;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  item,
  scheduleBlocks,
  moduleName,
  moduleNumber,
  sessionHours,
  isSplit,
  onToggleItem,
  onToggleSubComponent,
  showDragHandle = false,
  onDragStart,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
  index = 0,
}) => {
  const coverage = getClassHoursCoverage(item, scheduleBlocks);

  return (
    <div
      draggable={showDragHandle}
      onDragStart={(e) => showDragHandle && onDragStart && onDragStart(e, index)}
      onDragOver={(e) => showDragHandle && onDragOver && onDragOver(e, index)}
      onDrop={(e) => showDragHandle && onDrop && onDrop(e, index)}
      className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3 relative group transition-all"
    >
      {/* Top Header & Main Checkbox */}
      <div className="flex items-start space-x-3">
        {showDragHandle && (
          <div className="flex flex-col items-center justify-center pt-1 text-slate-400">
            <div className="cursor-grab active:cursor-grabbing p-1 hover:text-white transition-colors">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="flex flex-col space-y-0.5 mt-0.5">
              {onMoveUp && (
                <button
                  type="button"
                  onClick={onMoveUp}
                  className="p-0.5 hover:text-indigo-300 transition-colors"
                  title="Move Up"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              )}
              {onMoveDown && (
                <button
                  type="button"
                  onClick={onMoveDown}
                  className="p-0.5 hover:text-indigo-300 transition-colors"
                  title="Move Down"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Checkbox & Item Details */}
        <div
          className="flex-1 flex items-start space-x-3 cursor-pointer"
          onClick={() => onToggleItem && onToggleItem(item.id)}
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
              {(moduleName || moduleNumber) && (
                <span className="text-[10px] text-slate-400 truncate">
                  {moduleNumber ? `M${moduleNumber}` : ''}{moduleName ? `: ${moduleName}` : ''}
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

          {/* Duration & Coverage Metrics */}
          <div className="text-right shrink-0 space-y-1 ml-2">
            <div className="text-[10px] font-semibold text-slate-400">
              {sessionHours && isSplit ? (
                <span>Session: <strong className="text-slate-300 font-mono">{sessionHours}h</strong> (Total: {item.estimatedHours}h)</span>
              ) : (
                <span>Est: <strong className="text-slate-300 font-mono">{item.estimatedHours}h</strong></span>
              )}
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
        </div>
      </div>

      {/* Class Sub-Components Checklist */}
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
              onToggleSubComponent && onToggleSubComponent(item.id, 'video');
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
              onToggleSubComponent && onToggleSubComponent(item.id, 'assignment');
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
              onToggleSubComponent && onToggleSubComponent(item.id, 'additional');
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
};
