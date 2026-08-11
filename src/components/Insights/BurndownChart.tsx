import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ScheduleBlock } from '../../types/tracker';

interface BurndownChartProps {
  scheduleBlocks: ScheduleBlock[];
  courseStartDate: string;
  chosenPaceFinish: string;
  currentDateStr: string;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({
  scheduleBlocks,
  courseStartDate,
  chosenPaceFinish,
  currentDateStr,
}) => {
  // Aggregate target and actual hours by date
  const data = React.useMemo(() => {
    const map = new Map<string, { target: number; actual: number | null }>();

    for (const block of scheduleBlocks) {
      const prev = map.get(block.date) || { target: 0, actual: null };
      const hasActual = block.actualHours !== null && block.actualHours !== undefined;
      map.set(block.date, {
        target: prev.target + (block.targetHours || 0),
        actual: hasActual ? (prev.actual || 0) + (block.actualHours || 0) : prev.actual,
      });
    }

    const sortedDates = Array.from(map.keys()).sort();
    let cumTarget = 0;
    let cumActual = 0;

    return sortedDates.map((date) => {
      const entry = map.get(date)!;
      cumTarget += entry.target;

      let actualVal: number | null = null;
      if (date <= currentDateStr && entry.actual !== null) {
        cumActual += entry.actual;
        actualVal = Math.round(cumActual * 10) / 10;
      }

      return {
        date: date.substring(5), // "08-01"
        fullDate: date,
        TargetPlan: Math.round(cumTarget * 10) / 10,
        ActualLogged: actualVal,
      };
    });
  }, [scheduleBlocks, currentDateStr]);

  return (
    <div className="glass-panel rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Burn-Down Progress Chart</h3>
          <p className="text-xs text-slate-400">Cumulative Target Hours vs Actual Hours Logged</p>
        </div>
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '12px',
                color: '#f8fafc',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Area
              type="monotone"
              dataKey="TargetPlan"
              name="Planned Hours Target"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#targetGrad)"
            />
            <Line
              type="monotone"
              dataKey="ActualLogged"
              name="Actual Hours Logged"
              stroke="#10b981"
              strokeWidth={3}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
