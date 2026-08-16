import React from 'react';
import { Moon, Minus, Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ScheduleBlock } from '../../types/tracker';

interface DailySleepLogCardProps {
  amBlock?: ScheduleBlock;
  sleepFloorHours?: number;
  onUpdateSleep: (blockId: string, sleepHours: number) => void;
}

export const DailySleepLogCard: React.FC<DailySleepLogCardProps> = ({
  amBlock,
  sleepFloorHours = 6.0,
  onUpdateSleep,
}) => {
  if (!amBlock) return null;

  const currentSleep = amBlock.sleepHours ?? 6.0;

  const handleSleepHoursChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(12, Math.round(newVal * 4) / 4));
    onUpdateSleep(amBlock.id, clamped);
  };

  const isBelowFloor = currentSleep < sleepFloorHours;
  const isOptimal = currentSleep >= 7.0;

  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3 border border-slate-800/90 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Sleep & Recovery Log
              </span>
              {isBelowFloor ? (
                <span className="flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Below Floor ({sleepFloorHours}h)
                </span>
              ) : isOptimal ? (
                <span className="flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Optimal Recovery
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Good Rest
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Logged for last night's rest
            </div>
          </div>
        </div>

        {/* Stepper Fine Tuner Buttons */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleSleepHoursChange(currentSleep - 0.25)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 flex items-center justify-center font-bold text-xs transition-transform border border-slate-700 cursor-pointer"
            aria-label="Decrease sleep hours"
            title="-15 mins"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-bold text-purple-300 font-mono text-sm min-w-[64px] text-center bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            {currentSleep.toFixed(2)} hrs
          </span>
          <button
            type="button"
            onClick={() => handleSleepHoursChange(currentSleep + 0.25)}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-xs transition-transform border border-slate-700 cursor-pointer"
            aria-label="Increase sleep hours"
            title="+15 mins"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 1-Tap Preset Pills */}
      <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-1.5">
        {[5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((val) => {
          const isSelected = Math.abs(currentSleep - val) < 0.05;
          return (
            <button
              key={val}
              type="button"
              onClick={() => handleSleepHoursChange(val)}
              className={`px-3 py-1 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
                isSelected
                  ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/10'
                  : 'bg-slate-900/90 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {val.toFixed(1)}h
            </button>
          );
        })}
      </div>
    </div>
  );
};
