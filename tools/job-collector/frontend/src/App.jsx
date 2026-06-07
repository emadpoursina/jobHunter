import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Jobs from './pages/Jobs.jsx';
import JobDetail from './pages/JobDetail.jsx';
import CvViewer from './pages/CvViewer.jsx';
import Settings from './pages/Settings.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/jobs', label: 'Jobs' },
  { to: '/settings', label: 'Settings' },
];

export default function App() {
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
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </>
  );
}
