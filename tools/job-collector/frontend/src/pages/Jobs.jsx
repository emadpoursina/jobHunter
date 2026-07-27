import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import JobCard from '../components/JobCard.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'raw', label: 'Raw' },
  { value: 'parsed', label: 'Parsed' },
  { value: 'unmatched', label: 'Not a match' },
  { value: 'cv_generated', label: 'CV ready' },
  { value: 'applied', label: 'Applied' },
  { value: 'rejected', label: 'Rejected' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'manual', label: 'Manual' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'germantechjobs', label: 'GermanTechJobs' },
];

const SORT_OPTIONS = [
  { value: 'score', label: 'Match score' },
  { value: 'date', label: 'Date collected' },
];

const BULK_ACTIONS = [
  { id: 'remove', label: 'Remove', danger: true },
  { id: 'rejected', label: 'Mark rejected' },
  { id: 'applied', label: 'Mark applied' },
  { id: 'neutral', label: 'Mark neutral' },
  { id: 'cv', label: 'Generate CV' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const DEFAULT_PAGE_SIZE = 20;

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

// Run one bulk action against a single job id via existing APIs
async function applyBulkAction(id, action) {
  if (action === 'remove') return api.deleteJob(id);
  if (action === 'cv') return api.generateCv(id);
  return api.updateJob(id, { status: action });
}

export default function Jobs() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [alert, setAlert] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Show a dismissible alert for 5 seconds
  const showAlert = useCallback((message, type = 'err') => {
    setAlert({ message, type });
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

  // Drop selection when the visible list changes (filters / reload)
  useEffect(() => {
    setSelected(new Set());
  }, [jobs]);

  // Reset to first page when filters or sort change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, sourceFilter, countryFilter, sortBy, pageSize]);

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
  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedJobs.slice(start, start + pageSize);
  }, [sortedJobs, currentPage, pageSize]);

  const pageSelectedCount = pageJobs.filter((job) => selected.has(job.id)).length;
  const allPageSelected = pageJobs.length > 0 && pageSelectedCount === pageJobs.length;
  const someSelected = selected.size > 0;

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const job of pageJobs) next.delete(job.id);
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      for (const job of pageJobs) next.add(job.id);
      return next;
    });
  }

  async function handleBulk(action) {
    const ids = [...selected];
    if (ids.length === 0 || bulkBusy) return;

    if (
      action === 'remove' &&
      !window.confirm(`Delete ${ids.length} job(s)? This cannot be undone.`)
    ) {
      return;
    }

    setBulkBusy(true);
    setAlert(null);

    let ok = 0;
    let fail = 0;

    for (const id of ids) {
      try {
        await applyBulkAction(id, action);
        ok += 1;
      } catch {
        fail += 1;
      }
    }

    await loadJobs();
    setBulkBusy(false);

    if (fail === 0) {
      const labels = {
        remove: `Removed ${ok} job(s).`,
        rejected: `Marked ${ok} job(s) as rejected.`,
        applied: `Marked ${ok} job(s) as applied.`,
        neutral: `Reset ${ok} job(s) to neutral.`,
        cv: `CV generation started for ${ok} job(s).`,
      };
      showAlert(labels[action] ?? `Updated ${ok} job(s).`, 'info');
    } else {
      showAlert(`${ok} succeeded, ${fail} failed.`);
    }
  }

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
        <>
          <div className="bulk-bar">
            <label className="bulk-select-all">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={toggleSelectAll}
                disabled={bulkBusy}
              />
              <span>
                {someSelected
                  ? `${selected.size} selected`
                  : `Select page (${pageJobs.length})`}
              </span>
            </label>

            {someSelected && (
              <div className="bulk-actions">
                {BULK_ACTIONS.map(({ id, label, danger }) => (
                  <button
                    key={id}
                    type="button"
                    className={`btn${danger ? ' btn-danger' : ''}`}
                    onClick={() => handleBulk(id)}
                    disabled={bulkBusy}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="job-list">
            {pageJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={selected.has(job.id)}
                onToggleSelect={toggleSelect}
                selectDisabled={bulkBusy}
              />
            ))}
          </div>

          <div className="pagination">
            <p className="list-count">
              {sortedJobs.length} job(s) · page {currentPage} of {totalPages}
            </p>
            <div className="pagination-controls">
              <label className="pagination-size">
                Per page
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  disabled={bulkBusy}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn"
                onClick={() => setPage(currentPage - 1)}
                disabled={bulkBusy || currentPage <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setPage(currentPage + 1)}
                disabled={bulkBusy || currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {alert && (
        <div className={`alert alert-${alert.type === 'info' ? 'info' : 'err'}`}>
          {alert.message}
        </div>
      )}
    </div>
  );
}
