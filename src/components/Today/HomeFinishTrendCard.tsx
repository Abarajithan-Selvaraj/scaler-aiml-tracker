import React from 'react';
import { TrackerMetrics } from '../../utils/calculations';
import { Sparkles, Calendar, TrendingUp, RotateCcw, Target, AlertCircle, CheckCircle2 } from 'lucide-react';

interface HomeFinishTrendCardProps {
  metrics: TrackerMetrics;
  chosenPaceFinish: string;
}

export const HomeFinishTrendCard: React.FC<HomeFinishTrendCardProps> = ({
  metrics,
  chosenPaceFinish,
}) => {
  const isBehind = metrics.finishDeltaDays > 0;
  const isAhead = metrics.finishDeltaDays < 0;

  return (
    <div className="relative overflow-hidden glass-panel rounded-3xl p-5 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-950 shadow-2xl space-y-4">
      {/* Subtle Background Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Course Completion Forecast</span>
        </div>

        {/* Delta Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center space-x-1.5 shadow ${
            isBehind
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : isAhead
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
          }`}
        >
          {isBehind ? (
            <>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>+{metrics.finishDeltaDays} Days Behind Plan</span>
            </>
          ) : isAhead ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{Math.abs(metrics.finishDeltaDays)} Days Ahead of Plan</span>
            </>
          ) : (
            <span>On Target Pace</span>
          )}
        </span>
      </div>

      {/* Projected Completion Date Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          <div className="text-[11px] text-slate-400 font-medium">Estimated Completion Date</div>
          <div className="text-2xl md:text-3xl font-black text-white font-mono mt-0.5 tracking-tight">
            {new Date(metrics.projectedFinishDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center">
            <Target className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Target: <strong className="text-slate-200 ml-1">{chosenPaceFinish}</strong>
          </div>
        </div>

        {/* Secondary Metrics: Pace & Carry-Forward Deficit */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Rolling Weekly Pace */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-indigo-400" />
              Rolling Pace
            </div>
            <div className="text-base font-extrabold text-indigo-300 font-mono">
              {metrics.rollingWeeklyPace.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">h/wk</span>
            </div>
          </div>

          {/* Carried Forward Deficit */}
          <div
            className={`p-3 rounded-2xl border space-y-1 ${
              metrics.carriedForwardDeficitHours > 0
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="text-[10px] text-slate-400 font-medium flex items-center">
              <RotateCcw className="w-3 h-3 mr-1 text-amber-400" />
              Rollover Deficit
            </div>
            <div
              className={`text-base font-extrabold font-mono ${
                metrics.carriedForwardDeficitHours > 0 ? 'text-amber-300' : 'text-slate-300'
              }`}
            >
              {metrics.carriedForwardDeficitHours.toFixed(1)}{' '}
              <span className="text-[10px] text-slate-400 font-normal">hrs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
