import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CvPreview from '../components/CvPreview.jsx';

const CV_POLL_MS = 2000;
const CV_POLL_TIMEOUT_MS = 120000;

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

function cvPdfFilename(job) {
  return cvFilename(job).replace(/\.md$/, '.pdf');
}

// Trigger a browser download of a PDF blob
function downloadPdf(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function jobUpdatedAt(job) {
  return job?.updatedAt ?? job?.updated_at ?? '';
}

export default function CvViewer() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [markdown, setMarkdown] = useState(null);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteBaseline, setRewriteBaseline] = useState(null);
  const [alert, setAlert] = useState(null);
  const [copied, setCopied] = useState(false);
  const [convertingPdf, setConvertingPdf] = useState(false);

  // Show a dismissible alert for 5 seconds
  const showAlert = useCallback((message, type = 'err') => {
    setAlert({ message, type });
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  const loadCv = useCallback(async () => {
    const [{ job: jobData }, cvResponse] = await Promise.all([
      api.getJob(id),
      api.getCvMarkdown(id).catch(() => null),
    ]);
    const nextMarkdown = cvResponse?.markdown ?? null;
    setJob(jobData);
    setMarkdown(nextMarkdown);
    return { job: jobData, markdown: nextMarkdown };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await loadCv();
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
  }, [loadCv, showAlert]);

  // Poll until rewrite writes a new CV (markdown change and/or updated_at)
  useEffect(() => {
    if (!rewriting || !rewriteBaseline) return;

    const interval = setInterval(async () => {
      try {
        if (Date.now() - rewriteBaseline.startedAt > CV_POLL_TIMEOUT_MS) {
          setRewriting(false);
          setRewriteBaseline(null);
          showAlert('CV rewrite timed out. Check server logs / LLM settings.');
          return;
        }

        const { job: data, markdown: nextMarkdown } = await loadCv();
        const updated = jobUpdatedAt(data) > rewriteBaseline.updatedAt;
        const changed =
          nextMarkdown != null &&
          nextMarkdown.trim() &&
          nextMarkdown !== rewriteBaseline.markdown;
        if (updated || changed) {
          setRewriting(false);
          setRewriteBaseline(null);
          if (nextMarkdown?.trim()) {
            showAlert('CV rewritten successfully.', 'info');
          } else {
            showAlert('CV rewrite finished but the file is empty. Try another model.');
          }
        }
      } catch (err) {
        setRewriting(false);
        setRewriteBaseline(null);
        showAlert(err.message);
      }
    }, CV_POLL_MS);

    return () => clearInterval(interval);
  }, [rewriting, rewriteBaseline, loadCv, showAlert]);

  // Enqueue a fresh CV rewrite via the existing generate endpoint
  async function handleRewrite() {
    setAlert(null);
    setRewriting(true);
    setRewriteBaseline({
      updatedAt: jobUpdatedAt(job),
      markdown,
      startedAt: Date.now(),
    });

    try {
      await api.generateCv(id);
    } catch (err) {
      setRewriting(false);
      setRewriteBaseline(null);
      showAlert(err.message);
    }
  }

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

  // Convert the saved CV markdown to PDF and download it
  async function handleDownloadPdf() {
    if (!markdown || !job) return;

    setConvertingPdf(true);
    setAlert(null);

    try {
      const blob = await api.downloadCvPdf(id);
      downloadPdf(blob, cvPdfFilename(job));
      showAlert('PDF downloaded.', 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setConvertingPdf(false);
    }
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

  if (!markdown && !rewriting) {
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
          <button
            type="button"
            className="btn"
            onClick={handleRewrite}
            disabled={rewriting}
          >
            {rewriting ? 'Rewriting…' : 'Rewrite CV'}
          </button>
          <button type="button" className="btn" onClick={handleCopy} disabled={rewriting || !markdown}>
            {copied ? 'Copied!' : 'Copy Markdown'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleDownload}
            disabled={rewriting || convertingPdf || !markdown}
          >
            Download .md
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadPdf}
            disabled={rewriting || convertingPdf || !markdown}
          >
            {convertingPdf ? 'Converting…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {rewriting ? (
        <div className="loading-wrap">
          <div className="spinner" />
          <span className="loading-text">Rewriting CV…</span>
        </div>
      ) : (
        <div className="card cv-viewer-card">
          <CvPreview markdown={markdown} />
        </div>
      )}

      {alert && (
        <div className={`alert alert-${alert.type === 'info' ? 'info' : 'err'}`}>
          {alert.message}
        </div>
      )}
    </div>
  );
}
