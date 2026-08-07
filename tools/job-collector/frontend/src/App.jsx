import { useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Jobs from './pages/Jobs.jsx';
import JobDetail from './pages/JobDetail.jsx';
import CvViewer from './pages/CvViewer.jsx';
import CoverLetterViewer from './pages/CoverLetterViewer.jsx';
import ProfileEditor from './pages/ProfileEditor.jsx';
import Settings from './pages/Settings.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/jobs', label: 'Jobs' },
  { to: '/profile', label: 'Profile' },
  { to: '/settings', label: 'Settings' },
];

export default function App() {
  const location = useLocation();
  const [profileDirty, setProfileDirty] = useState(false);

  function guardNavigation(event) {
    if (profileDirty && location.pathname === '/profile') {
      const ok = window.confirm('You have unsaved profile changes. Leave without saving?');
      if (!ok) event.preventDefault();
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          jobHunter <span>Job Collector</span>
        </div>
      </header>

      <div className="layout">
        <nav className="sidebar">
          <div className="sidebar-label">Navigation</div>
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={guardNavigation}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/:id/cv" element={<CvViewer />} />
            <Route path="/jobs/:id/cover-letter" element={<CoverLetterViewer />} />
            <Route path="/profile" element={<ProfileEditor onDirtyChange={setProfileDirty} />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </>
  );
}
