import React from 'react';
import { TrackerMetrics } from '../../utils/calculations';
import { Clock, Calendar, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PaceProjectionWidgetProps {
  metrics: TrackerMetrics;
  targetFinishDate: string;
}

export const PaceProjectionWidget: React.FC<PaceProjectionWidgetProps> = ({
  metrics,
  targetFinishDate,
}) => {
  const isBehind = metrics.finishDeltaDays > 0;
  const isAhead = metrics.finishDeltaDays < 0;

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-5 border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Live Pace & Finish Projection</h3>
          <p className="text-xs text-slate-400">Recomputed continuously based on actual logged hours</p>
        </div>
      </div>

      {/* Primary Finish Date Comparison Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Planned Target Finish */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Chosen Target Finish Plan
          </div>
          <div className="text-xl font-black text-slate-100 font-mono">
            {targetFinishDate}
          </div>
          <div className="text-xs text-slate-400">Original target schedule picked</div>
        </div>

        {/* Projected Finish Date Based on Live Pace */}
        <div
          className={`p-4 rounded-2xl border space-y-1 ${
            isBehind
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : isAhead
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Projected Finish Date</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                isBehind
                  ? 'bg-rose-500/20 text-rose-300'
                  : isAhead
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-indigo-500/20 text-indigo-300'
              }`}
            >
              {isBehind
                ? `+${metrics.finishDeltaDays} days behind plan`
                : isAhead
                ? `${metrics.finishDeltaDays} days ahead of plan`
                : 'Exactly on target'}
            </span>
          </div>
          <div className="text-xl font-black font-mono">
            {metrics.projectedFinishDate}
          </div>
          <div className="text-xs opacity-80">
            Based on {metrics.rollingWeeklyPace.toFixed(1)} hrs/week rolling pace
          </div>
        </div>
      </div>

      {/* Recomputed Totals Grid (FR-13) */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-medium">Total Needed</div>
          <div className="text-sm font-bold text-slate-200 mt-0.5">
            {metrics.totalHoursNeeded.toFixed(1)}h
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-medium">Hours Logged</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            {metrics.totalHoursLogged.toFixed(1)}h
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-medium">Hours Remaining</div>
          <div className="text-sm font-bold text-amber-400 mt-0.5">
            {metrics.totalHoursRemaining.toFixed(1)}h
          </div>
        </div>
      </div>
    </div>
  );
};
