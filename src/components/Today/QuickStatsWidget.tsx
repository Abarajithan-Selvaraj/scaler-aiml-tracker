import React from 'react';
import { Flame, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { TrackerMetrics } from '../../utils/calculations';

interface QuickStatsWidgetProps {
  metrics: TrackerMetrics;
}

export const QuickStatsWidget: React.FC<QuickStatsWidgetProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* On-track Streak */}
      <div className="glass-card rounded-2xl p-3.5 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
          <Flame className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400">On-Track Streak</div>
          <div className="text-lg font-extrabold text-slate-100">{metrics.streakDays} Days</div>
        </div>
      </div>

      {/* Completion Percentage */}
      <div className="glass-card rounded-2xl p-3.5 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400">Syllabus Done</div>
          <div className="text-lg font-extrabold text-slate-100">
            {metrics.completionPercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Logged / Total Hours */}
      <div className="glass-card rounded-2xl p-3.5 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400">Hours Logged</div>
          <div className="text-lg font-extrabold text-slate-100">
            {metrics.totalHoursLogged.toFixed(1)}h <span className="text-xs font-normal text-slate-400">/ {metrics.totalHoursNeeded.toFixed(0)}h</span>
          </div>
        </div>
      </div>

      {/* Days Remaining */}
      <div className="glass-card rounded-2xl p-3.5 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400">Days Remaining</div>
          <div className="text-lg font-extrabold text-slate-100">
            {metrics.daysRemaining} Days
          </div>
        </div>
      </div>
    </div>
  );
};
