import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CvPreview from '../components/CvPreview.jsx';
import { matchScoreClass } from '../components/JobCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const CV_POLL_MS = 2000;

// Render visa sponsorship as a small badge when present
function VisaBadge({ visa }) {
  if (!visa) return null;

  const normalized = String(visa).toLowerCase();
  let className = 'visa-neutral';
  if (normalized === 'yes' || normalized === 'likely') className = 'visa-yes';
  if (normalized === 'no' || normalized === 'unlikely') className = 'visa-no';

  return <span className={`visa-badge ${className}`}>{visa}</span>;
}

// Copy text to the clipboard and show a brief confirmation
async function copyToClipboard(text, onSuccess) {
  await navigator.clipboard.writeText(text);
  onSuccess?.();
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [cvMarkdown, setCvMarkdown] = useState(null);
  const [generatingCv, setGeneratingCv] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingApplyScript, setGeneratingApplyScript] = useState(false);
  const [markingApplied, setMarkingApplied] = useState(false);
  const [applyScript, setApplyScript] = useState(null);
  const [applyPdfPath, setApplyPdfPath] = useState(null);
  const [applyWarnings, setApplyWarnings] = useState([]);
  const [copiedScript, setCopiedScript] = useState(false);
  const [alert, setAlert] = useState(null);
  const [copiedPath, setCopiedPath] = useState(false);
  const [applyUrlInput, setApplyUrlInput] = useState('');
  const [savingApplyUrl, setSavingApplyUrl] = useState(false);

  // Show a dismissible alert for 5 seconds
  const showAlert = useCallback((message, type = 'err') => {
    setAlert({ message, type });
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Load job record and CV markdown when available
  const loadJob = useCallback(async () => {
    const { job: data } = await api.getJob(id);
    setJob(data);

    const cvPath = data.cvMdPath ?? data.cv_md_path;
    if (cvPath) {
      try {
        const { markdown } = await api.getCvMarkdown(id);
        setCvMarkdown(markdown);
      } catch {
        setCvMarkdown(null);
      }
    } else {
      setCvMarkdown(null);
    }

    return data;
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        await loadJob();
      } catch (err) {
        if (!cancelled) showAlert(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loadJob, showAlert]);

  useEffect(() => {
    const url = job?.applyUrl ?? job?.apply_url ?? '';
    setApplyUrlInput(url || '');
  }, [job?.applyUrl, job?.apply_url]);

  // Poll job until CV path appears after generation starts
  useEffect(() => {
    if (!generatingCv) return;

    const interval = setInterval(async () => {
      try {
        const data = await loadJob();
        const cvPath = data.cvMdPath ?? data.cv_md_path;
        if (cvPath) {
          setGeneratingCv(false);
          showAlert('CV generated successfully.', 'info');
        }
      } catch (err) {
        setGeneratingCv(false);
        showAlert(err.message);
      }
    }, CV_POLL_MS);

    return () => clearInterval(interval);
  }, [generatingCv, loadJob, showAlert]);

  // Enqueue CV generation on the server
  async function handleGenerateCv() {
    setGeneratingCv(true);
    setAlert(null);

    try {
      await api.generateCv(id);
    } catch (err) {
      setGeneratingCv(false);
      showAlert(err.message);
    }
  }

  // Generate the company apply fill-assist userscript and show it on the page
  async function handleGenerateApplyScript() {
    setGeneratingApplyScript(true);
    setAlert(null);
    setApplyScript(null);
    setApplyPdfPath(null);
    setApplyWarnings([]);

    try {
      const data = await api.generateApplyScript(id);
      setApplyScript(data.script);
      setApplyPdfPath(data.pdfPath ?? null);
      setApplyWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      showAlert(
        'Apply script ready. Open the company apply page, paste into DevTools, review fields, then submit yourself.',
        'info',
      );
    } catch (err) {
      showAlert(err.message);
    } finally {
      setGeneratingApplyScript(false);
    }
  }

  // Copy the generated apply script from the on-page box
  async function handleCopyApplyScript() {
    if (!applyScript) return;
    try {
      await copyToClipboard(applyScript, () => {
        setCopiedScript(true);
        setTimeout(() => setCopiedScript(false), 2000);
      });
    } catch (err) {
      showAlert(err.message || 'Failed to copy script');
    }
  }

  // Record applied_at + applied_url for the company application
  async function handleMarkApplied() {
    setMarkingApplied(true);
    setAlert(null);

    const appliedUrl = job?.applyUrl ?? job?.apply_url ?? job?.sourceUrl ?? null;

    try {
      const { job: updated } = await api.markApplied(id, appliedUrl);
      setJob(updated);
      showAlert('Application recorded (applied_at timestamp saved).', 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setMarkingApplied(false);
    }
  }

  const isDecisionStatus = job?.status === 'applied' || job?.status === 'rejected';

  // Update job status (applied, rejected, or neutral)
  async function handleStatusChange(status) {
    setUpdatingStatus(true);
    setAlert(null);

    try {
      const { job: updated } = await api.updateJob(id, { status });
      setJob(updated);
      const message = status === 'neutral' ? 'Reset to neutral.' : `Marked as ${status}.`;
      showAlert(message, 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  }

  // Copy the offer markdown file path to the clipboard
  async function handleCopyPath() {
    const path = job?.offerMdPath ?? job?.offer_md_path;
    if (!path) return;

    try {
      await copyToClipboard(path, () => {
        setCopiedPath(true);
        setTimeout(() => setCopiedPath(false), 2000);
      });
    } catch (err) {
      showAlert(err.message || 'Failed to copy path');
    }
  }

  async function handleSaveApplyUrl() {
    setSavingApplyUrl(true);
    setAlert(null);

    try {
      const { job: updated } = await api.updateJob(id, { applyUrl: applyUrlInput });
      setJob(updated);
      showAlert('Company apply URL saved.', 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setSavingApplyUrl(false);
    }
  }

  // Remove the job record and return to the list
  async function handleDelete() {
    if (!window.confirm('Delete this job? This cannot be undone.')) return;

    try {
      await api.deleteJob(id);
      navigate('/jobs');
    } catch (err) {
      showAlert(err.message);
    }
  }

  if (loading) {
    return (
      <div>
        <h1>Job Detail</h1>
        <div className="loading-wrap">
          <div className="spinner" />
          <span className="loading-text">Loading job…</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div>
        <h1>Job Detail</h1>
        <div className="empty-state-card">
          <p>Job not found.</p>
          <Link to="/jobs" className="btn">
            Back to jobs
          </Link>
        </div>
      </div>
    );
  }

  const scoreClass = matchScoreClass(job.matchScore);
  const offerPath = job.offerMdPath ?? job.offer_md_path;
  const cvPath = job.cvMdPath ?? job.cv_md_path;
  const requiredSkills = job.requiredSkills ?? job.required_skills ?? [];
  const niceToHave = job.niceToHave ?? job.nice_to_have ?? [];
  const responsibilities = job.responsibilities ?? [];
  const applyUrl = job.applyUrl ?? job.apply_url ?? null;
  const canGenerateApplyScript = Boolean(cvPath && applyUrl);

  return (
    <div className="job-detail">
      <div className="page-nav">
        <Link to="/jobs" className="back-link">
          ← Jobs
        </Link>
      </div>

      <header className="job-detail-header">
        <div className="job-detail-header-main">
          <h1>{job.title || 'Untitled role'}</h1>
          <p className="job-detail-meta">
            {[job.company, job.location].filter(Boolean).join(' · ') || 'Unknown company'}
          </p>
          <div className="job-detail-badges">
            <StatusBadge status={job.status} />
            <VisaBadge visa={job.visaSponsorship ?? job.visa_sponsorship} />
            <span className={`match-score ${scoreClass}`}>
              {job.matchScore != null ? `${job.matchScore}% match` : 'No score'}
            </span>
          </div>
        </div>

        <div className="job-detail-meta-row">
          <span className="job-detail-source">{job.source}</span>
          {job.countryCode && <span className="job-detail-country">{job.countryCode}</span>}
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="job-detail-link"
            >
              View listing
            </a>
          )}
        </div>
      </header>

      <section className="card job-detail-section">
        <div className="card-title">Company apply URL</div>
        <p className="detail-row">
          Careers / ATS form link (separate from the listing URL above).
        </p>
        {applyUrl && (
          <p className="detail-row">
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="job-detail-link"
            >
              Open company apply page
            </a>
          </p>
        )}
        <div className="apply-url-row">
          <input
            type="url"
            className="apply-url-input"
            placeholder="https://careers.example.com/apply/…"
            value={applyUrlInput}
            onChange={(e) => setApplyUrlInput(e.target.value)}
            disabled={savingApplyUrl}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveApplyUrl}
            disabled={savingApplyUrl}
          >
            {savingApplyUrl ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      {(requiredSkills.length > 0 || niceToHave.length > 0) && (
        <section className="card job-detail-section">
          <div className="card-title">Skills</div>

          {requiredSkills.length > 0 && (
            <div className="tag-group">
              <span className="tag-label">Required</span>
              {requiredSkills.map((skill) => (
                <span key={skill} className="tag tag-required">
                  {skill}
                </span>
              ))}
            </div>
          )}

          {niceToHave.length > 0 && (
            <div className="tag-group">
              <span className="tag-label">Nice to have</span>
              {niceToHave.map((skill) => (
                <span key={skill} className="tag tag-nice">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {responsibilities.length > 0 && (
        <section className="card job-detail-section">
          <div className="card-title">Responsibilities</div>
          <ul className="responsibilities-list">
            {responsibilities.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {(job.employmentType || job.salary) && (
        <section className="card job-detail-section">
          <div className="card-title">Details</div>
          {job.employmentType && (
            <p className="detail-row">
              <strong>Employment:</strong> {job.employmentType}
            </p>
          )}
          {job.salary && (
            <p className="detail-row">
              <strong>Salary:</strong> {job.salary}
            </p>
          )}
        </section>
      )}

      {offerPath && (
        <section className="card job-detail-section">
          <div className="card-title">Offer Markdown</div>
          <div className="path-row">
            <code className="file-path">{offerPath}</code>
            <button type="button" className="btn" onClick={handleCopyPath}>
              {copiedPath ? 'Copied!' : 'Copy path'}
            </button>
          </div>
        </section>
      )}

      <section className="card job-detail-section">
        <div className="card-title">CV</div>

        {generatingCv && (
          <div className="loading-wrap">
            <div className="spinner" />
            <span className="loading-text">Generating CV…</span>
          </div>
        )}

        {!generatingCv && cvPath && cvMarkdown && (
          <>
            <CvPreview markdown={cvMarkdown} />
            <div className="btn-actions">
              <Link to={`/jobs/${id}/cv`} className="btn btn-primary">
                Open full CV
              </Link>
              <button
                type="button"
                className="btn"
                onClick={handleGenerateCv}
                disabled={generatingCv}
              >
                Regenerate CV
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleGenerateApplyScript}
                disabled={generatingApplyScript || !canGenerateApplyScript}
                title={
                  !applyUrl
                    ? 'Set the company apply URL above first'
                    : !cvPath
                      ? 'Generate a CV first'
                      : 'Generate fill-assist script for the company apply page'
                }
              >
                {generatingApplyScript ? 'Generating…' : 'Generate apply script'}
              </button>
            </div>
            {!applyUrl && cvPath && (
              <p className="hint">Set the company apply URL above to generate a fill-assist script.</p>
            )}
          </>
        )}

        {!generatingCv && !cvPath && (
          <div className="btn-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateCv}
              disabled={generatingCv}
            >
              Generate CV
            </button>
          </div>
        )}
      </section>

      {(generatingApplyScript || applyScript) && (
        <section className="card job-detail-section">
          <div className="card-title">Apply Script</div>

          {generatingApplyScript && (
            <div className="loading-wrap">
              <div className="spinner" />
              <span className="loading-text">Generating apply script…</span>
            </div>
          )}

          {!generatingApplyScript && applyScript && (
            <>
              {applyPdfPath && (
                <p className="detail-row">
                  <strong>PDF:</strong> <code className="file-path">{applyPdfPath}</code>
                </p>
              )}
              {applyWarnings.length > 0 && (
                <ul className="apply-warnings">
                  {applyWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
              <p className="hint">
                Copy the script below, open the{' '}
                {applyUrl ? (
                  <a href={applyUrl} target="_blank" rel="noopener noreferrer" className="job-detail-link">
                    company apply page
                  </a>
                ) : (
                  'company apply page'
                )}
                , paste into the DevTools console, review highlighted fields, and click Submit
                yourself.
              </p>
              <div className="browser-script-wrap">
                <div className="browser-script-header">
                  <span>Console script</span>
                  <button type="button" className="btn" onClick={handleCopyApplyScript}>
                    {copiedScript ? 'Copied!' : 'Copy script'}
                  </button>
                </div>
                <pre className="browser-script">{applyScript}</pre>
              </div>
            </>
          )}
        </section>
      )}

      <section className="card job-detail-section">
        <div className="card-title">Status</div>
        <div className="btn-actions">
          <button
            type="button"
            className="btn"
            onClick={() => handleStatusChange('neutral')}
            disabled={updatingStatus || !isDecisionStatus}
          >
            Mark neutral
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => handleStatusChange('applied')}
            disabled={updatingStatus || job.status === 'applied'}
          >
            Mark applied
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleMarkApplied}
            disabled={markingApplied || Boolean(job.appliedAt)}
            title="Record applied_at and company apply URL after you submit the application"
          >
            {job.appliedAt ? 'Application recorded' : 'Record application'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => handleStatusChange('rejected')}
            disabled={updatingStatus || job.status === 'rejected'}
          >
            Mark rejected
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={updatingStatus}
          >
            Delete job
          </button>
        </div>
      </section>

      {alert && (
        <div className={`alert alert-${alert.type === 'info' ? 'info' : 'err'}`}>
          {alert.message}
        </div>
      )}
    </div>
  );
}
