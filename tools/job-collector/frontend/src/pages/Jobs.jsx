import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import JobCard from '../components/JobCard.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'raw', label: 'Raw' },
  { value: 'parsed', label: 'Parsed' },
  { value: 'cv_generated', label: 'CV ready' },
  { value: 'applied', label: 'Applied' },
  { value: 'rejected', label: 'Rejected' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Match score' },
  { value: 'date', label: 'Date collected' },
];

// Sort jobs client-side by match score or collection date
function sortJobs(jobs, sortBy) {
  const copy = [...jobs];

  if (sortBy === 'date') {
    copy.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return copy;
  }

  copy.sort((a, b) => {
    const scoreA = a.matchScore ?? -1;
    const scoreB = b.matchScore ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return copy;
}

export default function Jobs() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [alert, setAlert] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortBy, setSortBy] = useState('score');

  // Show a dismissible alert for 5 seconds
  const showAlert = useCallback((message) => {
    setAlert({ message });
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Load jobs from the API using current filter selections
  const loadJobs = useCallback(async () => {
    try {
      const filters = {};
      if (statusFilter) filters.status = statusFilter;
      if (sourceFilter) filters.source = sourceFilter;
      if (countryFilter) filters.country_code = countryFilter;

      const { jobs: data } = await api.getJobs(filters);
      setJobs(data ?? []);
    } catch (err) {
      showAlert(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sourceFilter, countryFilter, showAlert]);

  useEffect(() => {
    setLoading(true);
    loadJobs();
  }, [loadJobs]);

  const [countryOptions, setCountryOptions] = useState([{ value: '', label: 'All countries' }]);

  // Load distinct country codes once for the filter dropdown
  useEffect(() => {
    let cancelled = false;

    async function loadCountries() {
      try {
        const { jobs: allJobs } = await api.getJobs();
        if (cancelled) return;

        const codes = [...new Set(allJobs.map((job) => job.countryCode).filter(Boolean))].sort();
        setCountryOptions([
          { value: '', label: 'All countries' },
          ...codes.map((code) => ({ value: code, label: code })),
        ]);
      } catch {
        // Keep default option when the jobs list cannot be loaded.
      }
    }

    loadCountries();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedJobs = useMemo(() => sortJobs(jobs, sortBy), [jobs, sortBy]);

  return (
    <div>
      <h1>Jobs</h1>
      <p className="subtitle">Browse collected job listings.</p>

      <div className="filter-bar">
        <div className="filter-field">
          <label htmlFor="filter-status">Status</label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value || 'all'} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="filter-source">Source</label>
          <select
            id="filter-source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            {SOURCE_OPTIONS.map(({ value, label }) => (
              <option key={value || 'all'} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="filter-country">Country</label>
          <select
            id="filter-country"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
          >
            {countryOptions.map(({ value, label }) => (
              <option key={value || 'all'} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="filter-sort">Sort by</label>
          <select
            id="filter-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-wrap">
          <div className="spinner" />
          <span className="loading-text">Loading jobs…</span>
        </div>
      ) : sortedJobs.length === 0 ? (
        <div className="empty-state-card">
          <p>No jobs match the current filters.</p>
          <p className="hint">Paste a listing on the Dashboard to get started.</p>
        </div>
      ) : (
        <div className="job-list">
          {sortedJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {!loading && sortedJobs.length > 0 && (
        <p className="list-count">{sortedJobs.length} job(s)</p>
      )}

      {alert && <div className="alert alert-err">{alert.message}</div>}
    </div>
  );
}
