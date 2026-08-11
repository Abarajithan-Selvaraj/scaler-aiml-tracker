import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/Layout/AppLayout';
import { TodayScreen } from './screens/TodayScreen';
import { TimetableScreen } from './screens/TimetableScreen';
import { ModulesScreen } from './screens/ModulesScreen';
import { SyllabusScreen } from './screens/SyllabusScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<TodayScreen />} />
          <Route path="timetable" element={<TimetableScreen />} />
          <Route path="modules" element={<ModulesScreen />} />
          <Route path="syllabus" element={<SyllabusScreen />} />
          <Route path="insights" element={<InsightsScreen />} />
          <Route path="settings" element={<SettingsScreen />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
