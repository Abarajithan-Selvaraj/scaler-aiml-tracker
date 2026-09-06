import React, { useState } from 'react';
import { Calendar, Download, ExternalLink, CheckCircle2, Clock, CalendarDays, Sparkles } from 'lucide-react';
import { useTrackerStore } from '../../store/useTrackerStore';
import { SyllabusItem } from '../../types/tracker';
import { buildGoogleCalendarWebUrl, downloadBacklogIcsFile } from '../../utils/calendarExport';

export const GoogleCalendarSyncCard: React.FC = () => {
  const { scheduleBlocks, syllabusItems, currentDateStr } = useTrackerStore();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Find incomplete past and current blocks (backlogs)
  const backlogBlocks = scheduleBlocks
    .filter((b) => !b.completed && b.date <= currentDateStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalBacklogHours = backlogBlocks.reduce((sum, b) => sum + (b.targetHours || 0), 0);

  const handleDownloadIcs = () => {
    downloadBacklogIcsFile(scheduleBlocks, syllabusItems);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center">
              Google Calendar Backlog Integration
              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Live Sync
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Export and synchronize all uncompleted study backlogs to your personal Google Calendar
            </p>
          </div>
        </div>

        {/* Bulk ICS Export Button */}
        <button
          type="button"
          onClick={handleDownloadIcs}
          className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer shrink-0"
        >
          {downloadSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Calendar File Downloaded!</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Export All Backlogs (.ics)</span>
            </>
          )}
        </button>
      </div>

      {/* Backlog Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <CalendarDays className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-300 font-medium">Overdue Backlog Blocks</span>
          </div>
          <span className="font-mono text-sm font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
            {backlogBlocks.length} blocks
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-300 font-medium">Total Carried Deficit</span>
          </div>
          <span className="font-mono text-sm font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
            {totalBacklogHours.toFixed(1)} hrs
          </span>
        </div>
      </div>

      {/* Backlog Item Web Link List */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-400" />
          1-Click Google Calendar Quick Links ({Math.min(5, backlogBlocks.length)})
        </div>

        {backlogBlocks.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400">
            🎉 All study sessions are up to date! No uncompleted backlogs to export.
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {backlogBlocks.slice(0, 5).map((block) => {
              const matchingItems = (block.itemIds || [])
                .map((id) => syllabusItems.find((item) => item.id === id))
                .filter((item): item is SyllabusItem => Boolean(item));
              const title = matchingItems.map((i) => i.title).join(', ') || block.focusItems.join(', ') || 'Study Session';
              const webUrl = buildGoogleCalendarWebUrl(block, syllabusItems);

              return (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-colors text-xs"
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {block.date} ({block.block})
                      </span>
                      <span className="text-slate-200 font-medium truncate">{title}</span>
                    </div>
                  </div>

                  <a
                    href={webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-medium text-[11px] transition-colors shrink-0"
                  >
                    <span>Add to Google Calendar</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
