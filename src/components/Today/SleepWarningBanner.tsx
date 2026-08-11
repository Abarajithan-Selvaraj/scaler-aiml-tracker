import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SleepWarningBannerProps {
  sleepFloorHours: number;
}

export const SleepWarningBanner: React.FC<SleepWarningBannerProps> = ({ sleepFloorHours }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 shadow-lg shadow-amber-500/5">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-amber-300">
            Sleep Floor Warning Active
          </h3>
          <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
            Sleep has been under {sleepFloorHours.toFixed(1)} hrs for 5+ consecutive logged days — <strong className="text-amber-200">cut scope, not sleep.</strong>
          </p>
          <div className="mt-3">
            <Link
              to="/insights#scope-suggestions"
              className="inline-flex items-center text-xs font-semibold text-amber-300 hover:text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              View Scope-Cutting Suggestions
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
