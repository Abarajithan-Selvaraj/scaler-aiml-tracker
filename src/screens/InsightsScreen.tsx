import React from 'react';
import { useTrackerStore } from '../store/useTrackerStore';
import { PaceProjectionWidget } from '../components/Insights/PaceProjectionWidget';
import { BurndownChart } from '../components/Insights/BurndownChart';
import { SleepTrendChart } from '../components/Insights/SleepTrendChart';
import { ScopeSuggestionsCard } from '../components/Insights/ScopeSuggestionsCard';
import { LineChart, Sparkles } from 'lucide-react';

export const InsightsScreen: React.FC = () => {
  const { scheduleBlocks, settings, currentDateStr, getMetrics } = useTrackerStore();

  const metrics = getMetrics();

  if (!metrics || !settings) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Loading insights metrics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center">
            <LineChart className="w-5 h-5 mr-2 text-indigo-400" />
            Analytics & Pace Insights
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Burn-down progress, rolling 14-day pace, projected completion date, and sleep trends
          </p>
        </div>
      </div>

      {/* Live Pace & Finish Projection Widget (FR-13, FR-15) */}
      <PaceProjectionWidget
        metrics={metrics}
        targetFinishDate={settings.chosenPaceFinish}
      />

      {/* Scope Cutting Suggestions Card (FR-16 - surfaces when > 14 days behind plan) */}
      <ScopeSuggestionsCard finishDeltaDays={metrics.finishDeltaDays} />

      {/* Burn-down Chart (FR-14) */}
      <BurndownChart
        scheduleBlocks={scheduleBlocks}
        courseStartDate={settings.courseStartDate}
        chosenPaceFinish={settings.chosenPaceFinish}
        currentDateStr={currentDateStr}
      />

      {/* Sleep Trend Chart (FR-17) */}
      <SleepTrendChart
        scheduleBlocks={scheduleBlocks}
        sleepFloorHours={settings.sleepFloorHours}
        currentDateStr={currentDateStr}
      />
    </div>
  );
};
