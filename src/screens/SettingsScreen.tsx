import React, { useState, useEffect } from 'react';
import { useTrackerStore } from '../store/useTrackerStore';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  RotateCcw,
  Sliders,
  Calendar,
  Cloud,
  CheckCircle,
  AlertTriangle,
  LogOut,
  LogIn,
  Bug,
  Shield,
  Check,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    currentDateStr,
    activeBackend,
    updateSettingsData,
    exportData,
    importData,
    resetToSeed,
    setCurrentDateStr,
    syncLocalToCloud,
  } = useTrackerStore();

  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState(auth.currentUser);
  const [showDiag, setShowDiag] = useState(false);
  const [pendingStartDate, setPendingStartDate] = useState(settings?.courseStartDate || '2026-08-01');
  const [pendingFinishDate, setPendingFinishDate] = useState(settings?.chosenPaceFinish || settings?.targetDeadline || '2027-02-18');
  const [showDateConfirmModal, setShowDateConfirmModal] = useState(false);
  const [dateChangeSuccess, setDateChangeSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setPendingStartDate(settings.courseStartDate);
      setPendingFinishDate(settings.chosenPaceFinish || settings.targetDeadline || '2027-02-18');
    }
  }, [settings]);

  const handleApplyDateChanges = async () => {
    if (!auth.currentUser) {
      setAuthError('Authentication required: You must be signed in with Google to confirm official schedule date edits.');
      return;
    }
    setAuthError(null);
    await updateSettingsData({
      courseStartDate: pendingStartDate,
      chosenPaceFinish: pendingFinishDate,
      targetDeadline: pendingFinishDate,
    });
    setShowDateConfirmModal(false);
    setDateChangeSuccess(true);
    setTimeout(() => setDateChangeSuccess(false), 4000);
  };

  // Keep user state in sync with Firebase auth so the UI reflects real state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsub;
  }, []);

  const firebaseConfigured = isFirebaseConfigured();
  const apiKeyRaw = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;

  // Assumptions state (FR-19)
  const assumptions = settings?.assumptions || {};

  const handleAssumptionChange = (key: string, val: number) => {
    if (!settings) return;
    const updated = { ...assumptions, [key]: val };
    updateSettingsData({ assumptions: updated });
  };

  const handleExport = async () => {
    const jsonStr = await exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scaler-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        await importData(json);
        alert('Tracker data successfully imported!');
      } catch (err: any) {
        setImportError('Failed to import JSON file. Please check file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleReset = async () => {
    if (confirmPhrase !== 'RESET SCALER TRACKER') {
      alert('Confirmation phrase does not match. Type "RESET SCALER TRACKER" exactly.');
      return;
    }
    await resetToSeed();
    setShowResetModal(false);
    setConfirmPhrase('');
    alert('Progress reset to initial seed data!');
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    if (!isFirebaseConfigured()) {
      setAuthError('Firebase API Key is missing or invalid. Please configure VITE_FIREBASE_API_KEY in your deployment environment variables.');
      return;
    }
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setUser(res.user);
      await syncLocalToCloud();
    } catch (err: any) {
      if (err?.code === 'auth/api-key-not-valid') {
        setAuthError('Invalid Firebase API Key. Please verify VITE_FIREBASE_API_KEY in your deployment settings.');
      } else {
        setAuthError(err.message || 'Google sign in failed');
      }
    }
  };

  const handleGoogleSignOut = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center">
          <SettingsIcon className="w-5 h-5 mr-2 text-indigo-400" />
          Tracker Settings & Data Management
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure velocity assumptions, test simulated dates, export/import data, and manage cloud sync
        </p>
      </div>

      {/* Course Start & Target Deadline Configuration (Authenticated + Confirmation Modal) */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>Course Start & Target Finish Date Configuration</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Configure official course start date and target completion deadline. Changing dates requires explicit authentication confirmation before saving to cloud/local settings.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Course Start Date
            </label>
            <input
              type="date"
              value={pendingStartDate}
              onChange={(e) => setPendingStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Target Completion Deadline
            </label>
            <input
              type="date"
              value={pendingFinishDate}
              onChange={(e) => setPendingFinishDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (!auth.currentUser) {
                setAuthError('Authentication required: Sign in with Google below to modify official course dates.');
                return;
              }
              setAuthError(null);
              setShowDateConfirmModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center space-x-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Confirm & Save Date Changes</span>
          </button>

          {dateChangeSuccess && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center">
              <Check className="w-4 h-4 mr-1" /> Dates Updated Successfully!
            </span>
          )}
        </div>

        {!user && (
          <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Sign in with Google below to unlock persistent course date editing.</span>
          </div>
        )}
      </div>

      {/* Date Simulation & Testing Widget */}
      <div className="glass-panel rounded-2xl p-5 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>Active / Simulated Today Date</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Test how Today and Insights screens recompute progress for any date between 1 Aug 2026 and 18 Feb 2027.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 pt-1">
          <input
            type="date"
            min="2026-08-01"
            max="2027-02-18"
            value={currentDateStr}
            onChange={(e) => {
              const val = e.target.value;
              setCurrentDateStr(val);
              updateSettingsData({ simulatedDate: val });
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => {
              const todayIso = new Date().toISOString().split('T')[0];
              setCurrentDateStr(todayIso);
              updateSettingsData({ simulatedDate: undefined });
            }}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Reset to Real Device Date
          </button>
        </div>
      </div>

      {/* Firebase Cloud Sync & Authentication Section */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Cloud className="w-4 h-4 text-indigo-400" />
            <span>Cross-Device Cloud Sync (Firebase)</span>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeBackend === 'firestore'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {activeBackend === 'firestore' ? 'Firestore Enabled' : 'IndexedDB Offline'}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Sign in with Google to synchronize your daily logs, sleep records, and syllabus completion across your mobile phone and laptop.
        </p>

        {user ? (
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center space-x-3">
              {user.photoURL && (
                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-indigo-500/40" />
              )}
              <div>
                <div className="text-xs font-bold text-white">{user.displayName}</div>
                <div className="text-[10px] text-slate-400">{user.email}</div>
              </div>
            </div>
            <button
              onClick={handleGoogleSignOut}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google for Cloud Sync</span>
            </button>
            {authError && <div className="text-xs text-rose-400 mt-2">{authError}</div>}
          </div>
        )}
      </div>

      {/* ── Firebase Diagnostics (collapsible) ───────────────────────── */}
      <div className="glass-panel rounded-2xl p-4 space-y-3 border border-slate-700/50">
        <button
          onClick={() => setShowDiag(v => !v)}
          className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider w-full text-left hover:text-slate-200 transition-colors"
        >
          <Bug className="w-4 h-4 text-slate-500" />
          <span>Firebase Diagnostics</span>
          <span className="ml-auto text-slate-600">{showDiag ? '▲' : '▼'}</span>
        </button>

        {showDiag && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <DiagRow
              label="isFirebaseConfigured()"
              value={firebaseConfigured ? '✅ true' : '❌ false'}
              ok={firebaseConfigured}
            />
            <DiagRow
              label="VITE_FIREBASE_API_KEY"
              value={
                !apiKeyRaw || apiKeyRaw === 'undefined'
                  ? '❌ not set'
                  : apiKeyRaw.length > 10
                  ? `✅ set (…${apiKeyRaw.slice(-6)})`
                  : `⚠️ too short (${apiKeyRaw})`
              }
              ok={Boolean(apiKeyRaw && apiKeyRaw !== 'undefined' && apiKeyRaw.length > 10)}
            />
            <DiagRow
              label="VITE_FIREBASE_PROJECT_ID"
              value={(import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || '❌ not set'}
              ok={Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID)}
            />
            <DiagRow
              label="VITE_FIREBASE_AUTH_DOMAIN"
              value={(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || '❌ not set'}
              ok={Boolean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN)}
            />
            <DiagRow
              label="Signed-in user"
              value={user ? `✅ ${user.email}` : '❌ not signed in'}
              ok={Boolean(user)}
            />
            <DiagRow
              label="Active backend"
              value={activeBackend === 'firestore' ? '✅ firestore' : '⚠️ indexeddb'}
              ok={activeBackend === 'firestore'}
            />
          </div>
        )}
      </div>

      {/* Assumptions Configuration (FR-19) */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span>Curriculum Velocity Assumptions (FR-19)</span>
        </div>
        <p className="text-xs text-slate-400">
          Changing any assumption live-recomputes estimated hours across all 15 modules and Insights totals.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Lecture Length (hrs)
            </label>
            <input
              type="number"
              step="0.25"
              value={assumptions.recordingLengthHours ?? 2.5}
              onChange={(e) => handleAssumptionChange('recordingLengthHours', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Playback Speed (x)
            </label>
            <input
              type="number"
              step="0.25"
              value={assumptions.playbackSpeed ?? 1.5}
              onChange={(e) => handleAssumptionChange('playbackSpeed', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              HW Hrs / Lecture
            </label>
            <input
              type="number"
              step="0.25"
              value={assumptions.homeworkHoursPerRecording ?? 1.0}
              onChange={(e) => handleAssumptionChange('homeworkHoursPerRecording', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Paper Est. (hrs)
            </label>
            <input
              type="number"
              step="0.25"
              value={assumptions.paperHours ?? 1.5}
              onChange={(e) => handleAssumptionChange('paperHours', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Skill Test Est. (hrs)
            </label>
            <input
              type="number"
              step="0.25"
              value={assumptions.skillTestHours ?? 3.0}
              onChange={(e) => handleAssumptionChange('skillTestHours', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Mock Interview Est. (hrs)
            </label>
            <input
              type="number"
              step="0.25"
              value={assumptions.mockInterviewHours ?? 3.0}
              onChange={(e) => handleAssumptionChange('mockInterviewHours', parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Export / Import Data (FR-20) */}
      <div className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Data Backup & Restore (FR-20)</span>
        </div>
        <p className="text-xs text-slate-400">
          Export all modules, syllabus completions, schedule blocks, sleep logs, and settings to a JSON file.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export Backup JSON</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer">
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Import Backup JSON</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="sr-only" />
          </label>
        </div>

        {importError && <div className="text-xs text-rose-400">{importError}</div>}
      </div>

      {/* Reset to Seed Data (FR-21) */}
      <div className="glass-panel rounded-2xl p-5 space-y-4 border-rose-500/20 bg-rose-950/10">
        <div className="flex items-center space-x-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span>Reset All Progress (FR-21)</span>
        </div>
        <p className="text-xs text-slate-400">
          Wipe all logged hours, sleep data, and completions and restore from original <code className="text-rose-300">seed_data.json</code>.
        </p>

        <button
          onClick={() => setShowResetModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Reset Progress to Seed</span>
        </button>
      </div>

      {/* Reset Double Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 space-y-4 border border-rose-500/30">
            <h3 className="text-base font-bold text-rose-300 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-rose-400" />
              Double-Confirmation Required
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This action cannot be undone. To confirm resetting all logged study hours and syllabus completions back to zero, type <strong className="text-white font-mono">RESET SCALER TRACKER</strong> below:
            </p>
            <input
              type="text"
              placeholder="RESET SCALER TRACKER"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500 shadow-lg shadow-rose-600/20"
              >
                Confirm Wipe & Reset
              </button>
            </div>
          </div>
        </div>
      )}
      {showDateConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full rounded-3xl p-6 space-y-4 border border-indigo-500/40 shadow-2xl">
            <h3 className="text-base font-bold text-indigo-300 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-indigo-400" />
              Confirm Schedule Date Changes
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Modifying official course dates will re-anchor schedule velocity projections and burndown calculations for all connected devices.
            </p>

            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Start:</span>
                <span className="text-slate-200">{settings?.courseStartDate || '2026-08-01'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-400 font-bold">New Proposed Start:</span>
                <span className="text-indigo-300 font-bold">{pendingStartDate}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between">
                <span className="text-slate-400">Current Finish:</span>
                <span className="text-slate-200">{settings?.chosenPaceFinish || settings?.targetDeadline || '2027-02-18'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-400 font-bold">New Target Finish:</span>
                <span className="text-indigo-300 font-bold">{pendingFinishDate}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDateConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyDateChanges}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
              >
                Confirm & Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Diagnostic row helper ──────────────────────────────────────────────────
const DiagRow: React.FC<{ label: string; value: string; ok: boolean }> = ({ label, value, ok }) => (
  <div className={`rounded-xl p-3 border text-xs font-mono ${ok ? 'bg-emerald-950/30 border-emerald-700/30' : 'bg-rose-950/30 border-rose-700/30'}`}>
    <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{label}</div>
    <div className={ok ? 'text-emerald-300' : 'text-rose-300'}>{value}</div>
  </div>
);
