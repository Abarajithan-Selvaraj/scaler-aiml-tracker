import React from 'react';
import { STATIC_SCOPE_SUGGESTIONS } from '../../utils/calculations';
import { ShieldAlert, Zap, Clock } from 'lucide-react';

interface ScopeSuggestionsCardProps {
  finishDeltaDays: number;
}

export const ScopeSuggestionsCard: React.FC<ScopeSuggestionsCardProps> = ({
  finishDeltaDays,
}) => {
  const isBehindThreshold = finishDeltaDays > 14;

  if (!isBehindThreshold) {
    return null; // Only surface when > 14 days behind schedule
  }

  const totalSaved = STATIC_SCOPE_SUGGESTIONS.reduce((s, item) => s + item.estimatedHoursSaved, 0);

  return (
    <div
      id="scope-suggestions"
      className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-amber-950/10 space-y-4 shadow-xl"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-300">
            Actionable Scope-Cutting Recommendations
          </h3>
          <p className="text-xs text-amber-200/80">
            Projected completion is <strong className="text-amber-200">{finishDeltaDays} days behind plan</strong>. Apply these tactical adjustments to reclaim up to {totalSaved} hours.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {STATIC_SCOPE_SUGGESTIONS.map((sugg) => (
          <div
            key={sugg.id}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-100 flex items-center">
                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                {sugg.title}
              </span>
              <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Save ~{sugg.estimatedHoursSaved}h
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{sugg.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
