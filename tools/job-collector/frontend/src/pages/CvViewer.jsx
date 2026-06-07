import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CvPreview from '../components/CvPreview.jsx';

// Trigger a browser download of markdown content as a .md file
function downloadMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Build a safe filename from job title and company
function cvFilename(job) {
  const parts = [job.company, job.title].filter(Boolean).join('-');
  const slug = parts
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || `job-${job.id}`}-cv.md`;
}

export default function CvViewer() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [markdown, setMarkdown] = useState(null);
  const [alert, setAlert] = useState(null);
  const [copied, setCopied] = useState(false);

  // Show a dismissible alert for 5 seconds
  const showAlert = useCallback((message, type = 'err') => {
    setAlert({ message, type });
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [{ job: jobData }, cvResponse] = await Promise.all([
          api.getJob(id),
          api.getCvMarkdown(id).catch(() => null),
        ]);

        if (cancelled) return;

        setJob(jobData);
        setMarkdown(cvResponse?.markdown ?? null);
      } catch (err) {
        if (!cancelled) showAlert(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, showAlert]);

  // Copy the full CV markdown to the clipboard
  async function handleCopy() {
    if (!markdown) return;

    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showAlert(err.message || 'Failed to copy markdown');
    }
  }

  // Download the CV as a .md file
  function handleDownload() {
    if (!markdown || !job) return;
    downloadMarkdown(markdown, cvFilename(job));
  }

  if (loading) {
    return (
      <div className="cv-viewer-page">
        <h1>CV Viewer</h1>
        <div className="loading-wrap">
          <div className="spinner" />
          <span className="loading-text">Loading CV…</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="cv-viewer-page">
        <h1>CV Viewer</h1>
        <div className="empty-state-card">
          <p>Job not found.</p>
          <Link to="/jobs" className="btn">
            Back to jobs
          </Link>
        </div>
      </div>
    );
  }

  if (!markdown) {
    return (
      <div className="cv-viewer-page">
        <div className="page-nav">
          <Link to={`/jobs/${id}`} className="back-link">
            ← Job detail
          </Link>
        </div>
        <h1>CV Viewer</h1>
        <p className="subtitle">
          {job.title || 'Untitled role'} · {job.company || 'Unknown company'}
        </p>
        <div className="empty-state-card">
          <p>No CV has been generated for this job yet.</p>
          <Link to={`/jobs/${id}`} className="btn btn-primary">
            Go to job detail
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cv-viewer-page">
      <div className="page-nav">
        <Link to={`/jobs/${id}`} className="back-link">
          ← Job detail
        </Link>
      </div>

      <div className="cv-viewer-header">
        <div>
          <h1>CV</h1>
          <p className="subtitle">
            {job.title || 'Untitled role'} · {job.company || 'Unknown company'}
          </p>
        </div>
        <div className="btn-actions cv-viewer-actions">
          <button type="button" className="btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Markdown'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleDownload}>
            Download .md
          </button>
        </div>
      </div>

      <div className="card cv-viewer-card">
        <CvPreview markdown={markdown} />
      </div>

      {alert && (
        <div className={`alert alert-${alert.type === 'info' ? 'info' : 'err'}`}>
          {alert.message}
        </div>
      )}
    </div>
  );
}
