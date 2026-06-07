import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { matchScoreClass } from '../components/JobCard.jsx';
import RunButton from '../components/RunButton.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const RUN_POLL_MS = 3000;
const SCRAPER_SOURCES = new Set(['linkedin', 'indeed']);

// Merge stored collector config with defaults for run requests
function normalizeCollectorConfig(stored = {}) {
  return {
    queries: Array.isArray(stored.queries) ? stored.queries : [],
    location: stored.location ?? '',
    maxResults: stored.maxResults ?? 10,
  };
}

// Format run duration from ISO timestamps
function formatDuration(startedAt, finishedAt) {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

// Render parsed offer fields in the manual input preview card
function OfferPreview({ offer }) {
  const scoreClass = matchScoreClass(offer.matchScore ?? offer.match_score);

  return (
    <div className="offer-preview">
      <div className="offer-preview-header">
        <div>
          <h3>{offer.title || 'Untitled role'}</h3>
          <p className="offer-preview-meta">
            {[offer.company, offer.location].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span className={`match-score ${scoreClass}`}>
          {offer.matchScore ?? offer.match_score ?? '—'}% match
        </span>
      </div>

      {offer.visaSponsorship ?? offer.visa_sponsorship ? (
        <p className="offer-preview-row">
          <strong>Visa:</strong> {offer.visaSponsorship ?? offer.visa_sponsorship}
        </p>
      ) : null}

      {(offer.requiredSkills ?? offer.required_skills)?.length > 0 && (
        <div className="tag-group">
          <span className="tag-label">Required</span>
          {(offer.requiredSkills ?? offer.required_skills).map((skill) => (
            <span key={skill} className="tag tag-required">
              {skill}
            </span>
          ))}
        </div>
      )}

      {(offer.niceToHave ?? offer.nice_to_have)?.length > 0 && (
        <div className="tag-group">
          <span className="tag-label">Nice to have</span>
          {(offer.niceToHave ?? offer.nice_to_have).map((skill) => (
            <span key={skill} className="tag tag-nice">
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [inputMode, setInputMode] = useState('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [savedJobId, setSavedJobId] = useState(null);
  const [alert, setAlert] = useState(null);

  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState({ total: 0, withCv: 0, applied: 0 });
  const [pollingRuns, setPollingRuns] = useState(false);
  const [scrapers, setScrapers] = useState([]);
  const [collectorConfigs, setCollectorConfigs] = useState({});

  // Show a dismissible alert for 5 seconds
  const showAlert = useCallback((message, type = 'err') => {
    setAlert({ message, type });
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Load recent runs, collector config, and quick stats
  const refreshDashboard = useCallback(async () => {
    try {
      const [{ runs: recentRuns }, { jobs }, { collectors }, { settings }] = await Promise.all([
        api.getRuns(10),
        api.getJobs(),
        api.getCollectors(),
        api.getSettings(),
      ]);

      setRuns(recentRuns ?? []);
      setStats({
        total: jobs.length,
        withCv: jobs.filter((j) => j.status === 'cv_generated').length,
        applied: jobs.filter((j) => j.status === 'applied').length,
      });

      const enabledScrapers = (collectors ?? []).filter(
        (collector) => SCRAPER_SOURCES.has(collector.name) && collector.enabled,
      );
      setScrapers(enabledScrapers);

      const configs = {};
      for (const collector of collectors ?? []) {
        if (!SCRAPER_SOURCES.has(collector.name)) continue;
        configs[collector.name] = normalizeCollectorConfig(
          settings.collectors?.[collector.name],
        );
      }
      setCollectorConfigs(configs);

      const hasActive = (recentRuns ?? []).some((run) => run.status === 'running');
      setPollingRuns(hasActive);
    } catch (err) {
      showAlert(err.message);
    }
  }, [showAlert]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // Poll runs while any collection run is still active
  useEffect(() => {
    if (!pollingRuns) return;

    const interval = setInterval(refreshDashboard, RUN_POLL_MS);
    return () => clearInterval(interval);
  }, [pollingRuns, refreshDashboard]);

  // Poll a single run until it finishes
  async function waitForRun(runId) {
    while (true) {
      const run = await api.getRun(runId);
      if (run.status !== 'running') return run;
      await new Promise((resolve) => setTimeout(resolve, RUN_POLL_MS));
    }
  }

  const runningSources = useMemo(
    () => new Set(runs.filter((run) => run.status === 'running').map((run) => run.source)),
    [runs],
  );

  // Start an automated LinkedIn or Indeed collection run
  async function handleRunCollector(source) {
    const collector = scrapers.find((entry) => entry.name === source);
    const config = collectorConfigs[source];

    if (!collector) {
      showAlert('Collector is not enabled. Enable it in Settings.');
      return;
    }

    if (!config?.queries?.length) {
      showAlert(`Add search queries for ${collector.label} in Settings before running.`);
      return;
    }

    setAlert(null);

    try {
      const { runId } = await api.collect(source, {
        queries: config.queries,
        location: config.location,
        maxResults: config.maxResults,
      });
      setPollingRuns(true);
      const run = await waitForRun(runId);

      if (run.status === 'error') {
        throw new Error(run.error || 'Collection failed');
      }

      const found = run.jobsFound ?? 0;
      const newCount = run.jobsNew ?? 0;
      showAlert(
        `${collector.label} finished: ${found} job${found === 1 ? '' : 's'} found, ${newCount} new.`,
        'info',
      );
      await refreshDashboard();
    } catch (err) {
      showAlert(err.message);
      await refreshDashboard();
    }
  }

  // Parse pasted text into a structured offer preview (no DB write)
  async function handleParse() {
    const rawText = text.trim();
    if (!rawText) {
      showAlert('Paste job listing text before parsing.');
      return;
    }

    setParsing(true);
    setAlert(null);
    setPreview(null);
    setSavedJobId(null);

    try {
      const { offer } = await api.parseOffer(rawText);
      setPreview(offer);
    } catch (err) {
      showAlert(err.message);
    } finally {
      setParsing(false);
    }
  }

  // Fetch a URL via the manual collector and show the parsed result
  async function handleParseUrl() {
    const jobUrl = url.trim();
    if (!jobUrl) {
      showAlert('Enter a job listing URL before fetching.');
      return;
    }

    setParsing(true);
    setAlert(null);
    setPreview(null);
    setSavedJobId(null);

    try {
      const { runId } = await api.collect('manual', { url: jobUrl });
      setPollingRuns(true);
      const run = await waitForRun(runId);

      if (run.status === 'error') {
        throw new Error(run.error || 'Collection failed');
      }

      const { jobs } = await api.getJobs({ source: 'manual' });
      const newest = jobs[0];
      if (newest) {
        const { job } = await api.getJob(newest.id);
        setPreview({
          title: job.title,
          company: job.company,
          location: job.location,
          matchScore: job.matchScore,
          visaSponsorship: job.visaSponsorship,
          requiredSkills: job.requiredSkills,
          niceToHave: job.niceToHave,
        });
        setSavedJobId(job.id);
        showAlert('Job fetched and saved.', 'info');
      }

      await refreshDashboard();
    } catch (err) {
      showAlert(err.message);
    } finally {
      setParsing(false);
    }
  }

  // Persist a reviewed offer via the manual collector pipeline
  async function handleSave() {
    const rawText = text.trim();
    if (!rawText) {
      showAlert('Paste job listing text before saving.');
      return;
    }

    setSaving(true);
    setAlert(null);

    try {
      const { runId } = await api.collect('manual', { text: rawText, url: url.trim() || undefined });
      setPollingRuns(true);
      const run = await waitForRun(runId);

      if (run.status === 'error') {
        throw new Error(run.error || 'Save failed');
      }

      if (run.jobsNew === 0) {
        showAlert('Job already exists (duplicate URL).', 'info');
      } else {
        showAlert('Job saved successfully.', 'info');
        setText('');
        setPreview(null);
      }

      await refreshDashboard();
    } catch (err) {
      showAlert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function clearManualInput() {
    setText('');
    setUrl('');
    setPreview(null);
    setSavedJobId(null);
    setAlert(null);
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="subtitle">Collect jobs, parse offers, and track recent runs.</p>

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total jobs</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.withCv}</span>
          <span className="stat-label">CVs generated</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.applied}</span>
          <span className="stat-label">Applied</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Automated collectors</div>

        {scrapers.length === 0 ? (
          <p className="hint">
            No automated collectors enabled. Enable LinkedIn or Indeed in{' '}
            <Link to="/settings">Settings</Link>.
          </p>
        ) : (
          <>
            <div className="run-controls">
              {scrapers.map((collector) => (
                <RunButton
                  key={collector.name}
                  label={collector.label}
                  running={runningSources.has(collector.name)}
                  disabled={!collectorConfigs[collector.name]?.queries?.length}
                  onClick={() => handleRunCollector(collector.name)}
                />
              ))}
            </div>
            {scrapers.some((collector) => !collectorConfigs[collector.name]?.queries?.length) && (
              <p className="hint">
                Add search queries in <Link to="/settings">Settings</Link> before running.
              </p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">Manual input</div>

        <div className="tabs">
          <button
            type="button"
            className={`tab${inputMode === 'text' ? ' active' : ''}`}
            onClick={() => setInputMode('text')}
          >
            Paste text
          </button>
          <button
            type="button"
            className={`tab${inputMode === 'url' ? ' active' : ''}`}
            onClick={() => setInputMode('url')}
          >
            From URL
          </button>
        </div>

        {inputMode === 'text' ? (
          <>
            <div className="field">
              <label htmlFor="job-text">Job listing text</label>
              <textarea
                id="job-text"
                rows={8}
                placeholder="Paste the full job description here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="job-url-optional">Source URL (optional)</label>
              <input
                id="job-url-optional"
                type="text"
                placeholder="https://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="btn-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleParse}
                disabled={parsing || saving || !text.trim()}
              >
                {parsing ? 'Parsing…' : 'Parse'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={parsing || saving || !text.trim()}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn" onClick={clearManualInput}>
                Clear
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="job-url">Job listing URL</label>
              <input
                id="job-url"
                type="text"
                placeholder="https://company.com/careers/role"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="hint">Fetches the page, parses the listing, and saves it automatically.</p>
            </div>

            <div className="btn-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleParseUrl}
                disabled={parsing || !url.trim()}
              >
                {parsing ? 'Fetching…' : 'Fetch & save'}
              </button>
              <button type="button" className="btn" onClick={clearManualInput}>
                Clear
              </button>
            </div>
          </>
        )}

        {preview && (
          <>
            <hr className="divider" />
            <div className="card-title">Parsed preview</div>
            <OfferPreview offer={preview} />
            {savedJobId && (
              <div className="btn-actions">
                <Link to={`/jobs/${savedJobId}`} className="btn btn-primary">
                  View job
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <div className="card-title">Recent runs</div>

        {runs.length === 0 ? (
          <p className="empty-state">No collection runs yet.</p>
        ) : (
          <div className="runs-table-wrap">
            <table className="runs-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Found</th>
                  <th>New</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>{run.source}</td>
                    <td>
                      <span className="run-status-cell">
                        <StatusBadge status={run.status} variant="run" />
                        {run.status === 'running' && <span className="run-spinner" aria-hidden />}
                      </span>
                    </td>
                    <td>{run.jobsFound ?? 0}</td>
                    <td>{run.jobsNew ?? 0}</td>
                    <td>{formatDuration(run.startedAt, run.finishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {alert && (
        <div className={`alert alert-${alert.type === 'info' ? 'info' : 'err'}`}>
          {alert.message}
        </div>
      )}
    </div>
  );
}
