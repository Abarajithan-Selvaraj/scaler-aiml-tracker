import React from 'react';
import { useTrackerStore } from '../store/useTrackerStore';
import { QuickStatsWidget } from '../components/Today/QuickStatsWidget';
import { SleepWarningBanner } from '../components/Today/SleepWarningBanner';
import { HomeFinishTrendCard } from '../components/Today/HomeFinishTrendCard';
import { BlockQuickLogCard } from '../components/Today/BlockQuickLogCard';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export const TodayScreen: React.FC = () => {
  const {
    scheduleBlocks,
    syllabusItems,
    currentDateStr,
    settings,
    getMetrics,
    toggleItemCompletion,
    toggleSubComponentCompletion,
    updateBlockLog,
    setCurrentDateStr,
  } = useTrackerStore();

  const metrics = getMetrics();

  // Date Boundaries
  const minDateStr = settings?.courseStartDate || '2026-08-01';
  const maxDateStr = metrics?.projectedFinishDate || settings?.chosenPaceFinish || '2027-02-18';

  // Find blocks for current date
  const todayBlocks = scheduleBlocks.filter((b) => b.date === currentDateStr);

  // If outside plan range, fallback to first date in schedule
  const isOutsideRange = todayBlocks.length === 0;
  const displayBlocks = isOutsideRange && scheduleBlocks.length > 0
    ? scheduleBlocks.filter((b) => b.date === scheduleBlocks[0].date)
    : todayBlocks;

  const displayDateStr = isOutsideRange && scheduleBlocks.length > 0
    ? scheduleBlocks[0].date
    : currentDateStr;

  const navigateDate = (offsetDays: number) => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() + offsetDays);
    const newIso = d.toISOString().split('T')[0];

    // Enforce date bounds: minDate (2026-08-01) <= date <= maxDate
    if (newIso < minDateStr) {
      setCurrentDateStr(minDateStr);
    } else if (newIso > maxDateStr) {
      setCurrentDateStr(maxDateStr);
    } else {
      setCurrentDateStr(newIso);
    }
  };

  const isAtMinDate = currentDateStr <= minDateStr;
  const isAtMaxDate = currentDateStr >= maxDateStr;

  return (
    <div className="space-y-6">
      {/* Date Header / Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div>
          <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
            Current Log View
          </div>
          <h2 className="text-xl font-bold text-white flex items-center mt-0.5">
            <Calendar className="w-5 h-5 mr-2 text-indigo-400" />
            {new Date(displayDateStr).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </h2>
        </div>

        {/* Date Stepper Controls with Boundary Enforcement */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateDate(-1)}
            disabled={isAtMinDate}
            className={`p-2 rounded-xl text-slate-200 transition-colors ${
              isAtMinDate
                ? 'bg-slate-900/50 text-slate-600 border border-slate-800 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isAtMinDate ? 'Reached Course Start Date (2026-08-01)' : 'Previous Day'}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              const realTodayIso = new Date().toISOString().split('T')[0];
              if (realTodayIso < minDateStr) setCurrentDateStr(minDateStr);
              else if (realTodayIso > maxDateStr) setCurrentDateStr(maxDateStr);
              else setCurrentDateStr(realTodayIso);
            }}
            className="px-3 py-2 rounded-xl bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/40 border border-indigo-500/30 text-xs font-semibold transition-colors"
          >
            Today
          </button>

          <button
            onClick={() => navigateDate(1)}
            disabled={isAtMaxDate}
            className={`p-2 rounded-xl text-slate-200 transition-colors ${
              isAtMaxDate
                ? 'bg-slate-900/50 text-slate-600 border border-slate-800 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
            title={isAtMaxDate ? `Reached Projected Completion Date (${maxDateStr})` : 'Next Day'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Hero Course Completion & Pace Trend Card */}
      {metrics && (
        <HomeFinishTrendCard
          metrics={metrics}
          chosenPaceFinish={settings?.chosenPaceFinish || '2027-02-18'}
        />
      )}

      {/* Sleep Floor Warning Banner */}
      {metrics?.isSleepWarningActive && (
        <SleepWarningBanner sleepFloorHours={settings?.sleepFloorHours || 6.0} />
      )}

      {/* Quick Stats Widget */}
      {metrics && <QuickStatsWidget metrics={metrics} />}

      {/* Outside Range Notice */}
      {isOutsideRange && (
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
          Showing reference blocks for course start date (<strong className="text-white">{displayDateStr}</strong>). Use date controls or settings to test specific dates.
        </div>
      )}

      {/* Daily Schedule Blocks */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-300 tracking-wide uppercase">
          Daily Study Blocks ({displayBlocks.length})
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayBlocks.map((block) => (
            <BlockQuickLogCard
              key={block.id}
              block={block}
              syllabusItems={syllabusItems}
              onToggleItem={toggleItemCompletion}
              onToggleSubComponent={toggleSubComponentCompletion}
              onUpdateBlock={updateBlockLog}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
