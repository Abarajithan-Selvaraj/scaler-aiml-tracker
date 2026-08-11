import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from 'recharts';
import { ScheduleBlock } from '../../types/tracker';

interface SleepTrendChartProps {
  scheduleBlocks: ScheduleBlock[];
  sleepFloorHours: number;
  currentDateStr: string;
}

export const SleepTrendChart: React.FC<SleepTrendChartProps> = ({
  scheduleBlocks,
  sleepFloorHours,
  currentDateStr,
}) => {
  const data = React.useMemo(() => {
    // Get last 30 logged sleep blocks
    const sleepBlocks = scheduleBlocks
      .filter((b) => b.block === 'AM' && b.sleepHours !== null && b.date <= currentDateStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    return sleepBlocks.map((b) => ({
      date: b.date.substring(5), // "08-01"
      sleep: b.sleepHours ?? 0,
      isLow: (b.sleepHours ?? 0) < sleepFloorHours,
    }));
  }, [scheduleBlocks, sleepFloorHours, currentDateStr]);

  return (
    <div className="glass-panel rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Sleep History (Last 30 Days)</h3>
          <p className="text-xs text-slate-400">
            Daily Sleep Hours Logged with {sleepFloorHours.toFixed(1)}h Minimum Threshold Line
          </p>
        </div>
      </div>

      <div className="w-full h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 12]} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={sleepFloorHours}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Sleep Floor: ${sleepFloorHours}h`,
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <Bar dataKey="sleep" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isLow ? '#ef4444' : '#8b5cf6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No sleep hours logged yet for the active period.
          </div>
        )}
      </div>
    </div>
  );
};
