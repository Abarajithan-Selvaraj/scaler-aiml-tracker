import React, { useState } from 'react';
import { SyllabusItem, ScheduleBlock } from '../../types/tracker';
import { CheckCircle, Video, FileCode, HelpCircle, Check, GripVertical, ChevronUp, ChevronDown, X, Plus } from 'lucide-react';
import { getClassHoursCoverage } from '../../utils/seedMigration';

export interface ClassCardProps {
  item: SyllabusItem;
  scheduleBlocks: ScheduleBlock[];
  moduleName?: string;
  moduleNumber?: number;
  sessionHours?: number;
  isSplit?: boolean;
  blockCompleted?: boolean;
  onToggleItem?: (itemId: string) => void;
  onToggleBlock?: () => void;
  onToggleSubComponent?: (itemId: string, subComponent: 'video' | 'assignment' | 'additional') => void;
  onRemoveSubComponent?: (itemId: string, subComponent: 'assignment' | 'additional') => void;
  onRestoreSubComponent?: (itemId: string, subComponent: 'assignment' | 'additional') => void;
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
  blockCompleted,
  onToggleItem,
  onToggleBlock,
  onToggleSubComponent,
  onRemoveSubComponent,
  onRestoreSubComponent,
  showDragHandle = false,
  onDragStart,
  onDragOver,
  onDrop,
  onMoveUp,
  onMoveDown,
  index = 0,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const coverage = getClassHoursCoverage(item, scheduleBlocks);
  const isFullyCompleted =
    Boolean(item.completed) ||
    (item.type === 'Class' &&
      (item.hasVideo === false || Boolean(item.videoCompleted)) &&
      (item.hasAssignment === false || Boolean(item.assignmentCompleted)) &&
      (item.hasAdditionalProblems === false || Boolean(item.additionalProblemsCompleted)));

  const isDone =
    blockCompleted !== undefined
      ? Boolean(blockCompleted) || isFullyCompleted
      : isFullyCompleted;

  return (
    <div
      draggable={showDragHandle}
      onDragStart={(e) => showDragHandle && onDragStart && onDragStart(e, index)}
      onDragOver={(e) => showDragHandle && onDragOver && onDragOver(e, index)}
      onDrop={(e) => showDragHandle && onDrop && onDrop(e, index)}
      className={`glass-panel rounded-2xl p-4 border border-slate-800 space-y-3 group transition-all ${
        showAddMenu ? 'z-40 relative' : 'relative'
      }`}
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
          onClick={() => {
            if (onToggleBlock) {
              onToggleBlock();
            } else if (onToggleItem) {
              onToggleItem(item.id);
            }
          }}
        >
          <div
            className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
              isDone
                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                : 'border-slate-600 bg-slate-800'
            }`}
          >
            {isDone && <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />}
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
                isDone ? 'line-through opacity-75' : 'text-slate-100'
              }`}
            >
              {item.title}
            </div>
          </div>

          {/* Duration Metric */}
          <div className="text-right shrink-0 space-y-1 ml-2">
            <div className="text-[10px] font-semibold text-slate-400">
              {sessionHours && isSplit ? (
                <span>Session: <strong className="text-slate-300 font-mono">{sessionHours}h</strong> (Total: {item.estimatedHours}h)</span>
              ) : (
                <span>Est: <strong className="text-slate-300 font-mono">{item.estimatedHours}h</strong></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Class Sub-Components Checklist as Interactive Chips */}
      {item.type === 'Class' && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5 pl-0 sm:pl-8">
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
                    ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/40 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                    item.videoCompleted
                      ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-400 text-white dark:text-slate-950'
                      : 'border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800'
                  }`}
                >
                  {item.videoCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Video className="w-2 h-2 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <span className={item.videoCompleted ? 'line-through opacity-85' : ''}>
                  Recording
                </span>
              </button>

              {/* Assignments Chip */}
              {item.hasAssignment !== false && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSubComponent && onToggleSubComponent(item.id, 'assignment');
                  }}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all cursor-pointer group/chip ${
                    item.assignmentCompleted
                      ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/40 shadow-sm hover:bg-purple-200 dark:hover:bg-purple-500/30'
                      : 'bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      item.assignmentCompleted
                        ? 'bg-purple-600 dark:bg-purple-500 border-purple-400 text-white dark:text-slate-950'
                        : 'border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {item.assignmentCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <FileCode className="w-2 h-2 text-purple-600 dark:text-purple-400" />}
                  </div>
                  <span className={item.assignmentCompleted ? 'line-through opacity-85' : ''}>
                    Assignments
                  </span>
                  {onRemoveSubComponent && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSubComponent(item.id, 'assignment');
                      }}
                      className="ml-1 p-0.5 rounded-full hover:bg-rose-500/20 dark:hover:bg-rose-500/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors shrink-0 cursor-pointer"
                      title="Remove Assignments (adds 20% weight to Recording)"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              )}

              {/* Homeworks Chip */}
              {item.hasAdditionalProblems !== false && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSubComponent && onToggleSubComponent(item.id, 'additional');
                  }}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all cursor-pointer group/chip ${
                    item.additionalProblemsCompleted
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 shadow-sm hover:bg-amber-200 dark:hover:bg-amber-500/30'
                      : 'bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      item.additionalProblemsCompleted
                        ? 'bg-amber-600 dark:bg-amber-500 border-amber-400 text-white dark:text-slate-950'
                        : 'border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {item.additionalProblemsCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <HelpCircle className="w-2 h-2 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <span className={item.additionalProblemsCompleted ? 'line-through opacity-85' : ''}>
                    Homeworks
                  </span>
                  {onRemoveSubComponent && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSubComponent(item.id, 'additional');
                      }}
                      className="ml-1 p-0.5 rounded-full hover:bg-rose-500/20 dark:hover:bg-rose-500/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors shrink-0 cursor-pointer"
                      title="Remove Homeworks (adds 10% weight to Recording)"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              )}

              {/* Restore Missing Chips Dropdown */}
              {onRestoreSubComponent && (item.hasAssignment === false || item.hasAdditionalProblems === false) && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddMenu(!showAddMenu);
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-full border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 text-[11px] font-medium transition-all cursor-pointer bg-slate-100 dark:bg-slate-900/50 shadow-sm"
                    title="Restore deleted sub-component chips"
                  >
                    <Plus className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>Add</span>
                  </button>

                  {showAddMenu && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 shadow-2xl flex flex-col space-y-1 min-w-[160px]">
                      {item.hasAssignment === false && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreSubComponent(item.id, 'assignment');
                            setShowAddMenu(false);
                          }}
                          className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-medium text-left cursor-pointer transition-colors"
                        >
                          <FileCode className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span>+ Assignments (20%)</span>
                        </button>
                      )}
                      {item.hasAdditionalProblems === false && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreSubComponent(item.id, 'additional');
                            setShowAddMenu(false);
                          }}
                          className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-medium text-left cursor-pointer transition-colors"
                        >
                          <HelpCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>+ Homeworks (10%)</span>
                        </button>
                      )}
                    </div>
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
