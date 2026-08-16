import React from 'react';
import { Flame, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { TrackerMetrics } from '../../utils/calculations';

interface QuickStatsWidgetProps {
  metrics: TrackerMetrics;
}

export const QuickStatsWidget: React.FC<QuickStatsWidgetProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
      {/* On-track Streak */}
      <div className="glass-card rounded-2xl p-3 sm:p-3.5 flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">On-Track Streak</div>
          <div className="text-sm sm:text-lg font-extrabold text-slate-100 truncate">{metrics.streakDays} Days</div>
        </div>
      </div>

      {/* Completion Percentage */}
      <div className="glass-card rounded-2xl p-3 sm:p-3.5 flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">Syllabus Done</div>
          <div className="text-sm sm:text-lg font-extrabold text-slate-100 truncate">
            {metrics.completionPercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Logged / Total Hours */}
      <div className="glass-card rounded-2xl p-3 sm:p-3.5 flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">Hours Logged</div>
          <div className="text-sm sm:text-lg font-extrabold text-slate-100 truncate">
            {metrics.totalHoursLogged.toFixed(1)}h <span className="text-[10px] sm:text-xs font-normal text-slate-400">/ {metrics.totalHoursNeeded.toFixed(0)}h</span>
          </div>
        </div>
      </div>

      {/* Days Remaining */}
      <div className="glass-card rounded-2xl p-3 sm:p-3.5 flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-400 truncate">Days Remaining</div>
          <div className="text-sm sm:text-lg font-extrabold text-slate-100 truncate">
            {metrics.daysRemaining} Days
          </div>
        </div>
      </div>
    </div>
  );
};
