import React from 'react';
import { Module, SyllabusItem } from '../../types/tracker';
import { X, BookOpen, FileText, Award, CheckCircle } from 'lucide-react';
import { useTrackerStore, normalizeSyllabusItem } from '../../store/useTrackerStore';
import { ClassCard } from '../Common/ClassCard';

interface ModuleDetailModalProps {
  module: Module;
  syllabusItems: SyllabusItem[];
  onClose: () => void;
  onToggleItem: (itemId: string) => void;
  onUpdateModule: (moduleId: string, patch: Partial<Module>) => void;
}

export const ModuleDetailModal: React.FC<ModuleDetailModalProps> = ({
  module,
  syllabusItems,
  onClose,
  onToggleItem,
  onUpdateModule,
}) => {
  const { toggleSubComponentCompletion, scheduleBlocks } = useTrackerStore();

  const moduleItems = syllabusItems
    .filter((i) => i.moduleId === module.id)
    .sort((a, b) => a.sequence - b.sequence)
    .map(normalizeSyllabusItem);

  const classes = moduleItems.filter((i) => i.type === 'Class');
  const papers = moduleItems.filter((i) => i.type === 'Paper');
  const tests = moduleItems.filter((i) => i.type === 'Test');
  const mocks = moduleItems.filter((i) => i.type === 'Mock');
  const capstones = moduleItems.filter((i) => i.type === 'Capstone');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col border border-slate-700 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
          <div>
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Module {module.moduleNumber} • {module.weeks}
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">{module.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Editable Module Settings (FR-12) */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Module Configuration & Notes (FR-12)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={module.isDataConfirmed}
                  onChange={(e) => onUpdateModule(module.id, { isDataConfirmed: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-slate-300">Data Confirmed from Scaler</span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={module.capstoneRequired}
                  onChange={(e) => onUpdateModule(module.id, { capstoneRequired: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-slate-300">Capstone Project Required</span>
              </label>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Module Notes</label>
              <textarea
                rows={2}
                value={module.notes || ''}
                onChange={(e) => onUpdateModule(module.id, { notes: e.target.value })}
                placeholder="Add personal notes or target revision points for this module..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Classes Section */}
          {classes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Class Lectures ({classes.length})</span>
              </div>
              <div className="space-y-2.5">
                {classes.map((item) => (
                  <ClassCard
                    key={item.id}
                    item={item}
                    scheduleBlocks={scheduleBlocks}
                    moduleName={module.name}
                    moduleNumber={module.moduleNumber}
                    onToggleItem={onToggleItem}
                    onToggleSubComponent={toggleSubComponentCompletion}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Research Papers Section */}
          {papers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Research Papers ({papers.length})</span>
              </div>
              <div className="space-y-2">
                {papers.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      item.completed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => onToggleItem(item.id)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {item.completed && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className={item.completed ? 'line-through opacity-80' : 'font-medium'}>
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Est. Reading: {item.estimatedHours} hrs
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Assessments & Capstones */}
          {(tests.length > 0 || mocks.length > 0 || capstones.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Assessments & Capstones</span>
              </div>
              <div className="space-y-2">
                {[...tests, ...mocks, ...capstones].map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      item.completed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => onToggleItem(item.id)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 ${
                        item.completed
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {item.completed && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 text-xs">
                      <div className={item.completed ? 'line-through opacity-80' : 'font-medium'}>
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Type: {item.type} • Est: {item.estimatedHours} hrs
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
