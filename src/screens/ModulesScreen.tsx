import React, { useState } from 'react';
import { useTrackerStore } from '../store/useTrackerStore';
import { ModuleDetailModal } from '../components/Modules/ModuleDetailModal';
import { Module } from '../types/tracker';
import { Layers, BookOpen, FileText, CheckCircle2, AlertCircle, Clock, ChevronRight } from 'lucide-react';

export const ModulesScreen: React.FC = () => {
  const { modules, syllabusItems, scheduleBlocks, toggleItemCompletion, updateModuleData } =
    useTrackerStore();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  // Compute logged hours per module from linked schedule blocks
  const getLoggedHoursForModule = (moduleId: string) => {
    let sum = 0;
    for (const block of scheduleBlocks) {
      if (!block.actualHours || !block.itemIds) continue;
      const blockItems = block.itemIds
        .map((id) => syllabusItems.find((i) => i.id === id))
        .filter(Boolean);

      if (blockItems.some((i) => i!.moduleId === moduleId)) {
        // Divide block actual hours proportionally among items in block
        const modItemsInBlock = blockItems.filter((i) => i!.moduleId === moduleId).length;
        sum += (block.actualHours * modItemsInBlock) / blockItems.length;
      }
    }
    return sum;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <Layers className="w-5 h-5 mr-2 text-indigo-400" />
            Curriculum Modules (15)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Module 4 to Module 18 extracted from Scaler dashboard
          </p>
        </div>
      </div>

      {/* Grid of Module Cards (FR-10) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => {
          const modItems = syllabusItems.filter((i) => i.moduleId === module.id);
          const completedCount = modItems.filter((i) => i.completed).length;
          const totalCount = modItems.length;
          const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

          const classesDone = modItems.filter((i) => i.type === 'Class' && i.completed).length;
          const papersDone = modItems.filter((i) => i.type === 'Paper' && i.completed).length;
          const loggedHours = getLoggedHoursForModule(module.id);

          return (
            <div
              key={module.id}
              onClick={() => setSelectedModule(module)}
              className="glass-panel glass-card-hover rounded-2xl p-4 cursor-pointer flex flex-col justify-between space-y-4 border border-slate-800 relative group"
            >
              <div>
                {/* Module Badge & Name */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Module {module.moduleNumber} • {module.weeks}
                  </span>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      module.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : module.status === 'in_progress'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {module.status === 'completed'
                      ? 'Completed'
                      : module.status === 'in_progress'
                      ? 'In Progress'
                      : 'Not Started'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-2.5 leading-snug group-hover:text-indigo-300 transition-colors">
                  {module.name}
                </h3>
              </div>

              {/* Stats & Breakdown */}
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-400">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                    Classes:
                  </span>
                  <span className="font-semibold">
                    {classesDone} / {module.classesTotal}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-400">
                    <FileText className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                    Research Papers:
                  </span>
                  <span className="font-semibold">
                    {papersDone} / {module.papersTotal}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center text-slate-400">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Est / Logged:
                  </span>
                  <span className="font-semibold">
                    {loggedHours.toFixed(1)}h / {module.estimatedHours.total}h
                  </span>
                </div>

                {/* Badges for Skill Test & Mock Interview */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {module.skillTestRequired && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Skill Test
                    </span>
                  )}
                  {module.mockInterviewRequired && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        module.mockInterviewStatus === 'Expired'
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}
                    >
                      Mock: {module.mockInterviewStatus}
                    </span>
                  )}
                  {module.capstoneRequired && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      Capstone
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar & Footer */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Overall Module Progress</span>
                  <span className="font-bold text-indigo-300">{progressPct.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-end text-[11px] text-indigo-400 font-semibold pt-1">
                  View Syllabus Items <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Module Detail Modal Drilldown (FR-11) */}
      {selectedModule && (
        <ModuleDetailModal
          module={selectedModule}
          syllabusItems={syllabusItems}
          onClose={() => setSelectedModule(null)}
          onToggleItem={toggleItemCompletion}
          onUpdateModule={updateModuleData}
        />
      )}
    </div>
  );
};
