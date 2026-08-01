import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import CvPreview from '../components/CvPreview.jsx';

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 120000;

function downloadMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function coverLetterFilename(job) {
  const parts = [job.company, job.title].filter(Boolean).join('-');
  const slug = parts
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || `job-${job.id}`}-cover-letter.md`;
}

function coverLetterPdfFilename(job) {
  return coverLetterFilename(job).replace(/\.md$/, '.pdf');
}

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

export default function CoverLetterViewer() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [markdown, setMarkdown] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genBaseline, setGenBaseline] = useState(null);
  const [alert, setAlert] = useState(null);
  const [copied, setCopied] = useState(false);
  const [convertingPdf, setConvertingPdf] = useState(false);

  const showAlert = useCallback((message, type = 'err') => {
    setAlert({ message, type });
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  const loadCoverLetter = useCallback(async () => {
    const [{ job: jobData }, letterResponse] = await Promise.all([
      api.getJob(id),
      api.getCoverLetterMarkdown(id).catch(() => null),
    ]);
    const nextMarkdown = letterResponse?.markdown ?? null;
    setJob(jobData);
    setMarkdown(nextMarkdown);
    return { job: jobData, markdown: nextMarkdown };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await loadCoverLetter();
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
  }, [loadCoverLetter, showAlert]);

  useEffect(() => {
    if (!generating || !genBaseline) return;

    const interval = setInterval(async () => {
      try {
        if (Date.now() - genBaseline.startedAt > POLL_TIMEOUT_MS) {
          setGenerating(false);
          setGenBaseline(null);
          showAlert('Cover letter generation timed out. Check server logs / LLM settings.');
          return;
        }

        const { job: data, markdown: nextMarkdown } = await loadCoverLetter();
        const updated = jobUpdatedAt(data) > genBaseline.updatedAt;
        const changed =
          nextMarkdown != null &&
          nextMarkdown.trim() &&
          nextMarkdown !== genBaseline.markdown;
        if (updated || changed) {
          setGenerating(false);
          setGenBaseline(null);
          if (nextMarkdown?.trim()) {
            showAlert('Cover letter generated successfully.', 'info');
          } else {
            showAlert('Generation finished but the file is empty. Try another model.');
          }
        }
      } catch (err) {
        setGenerating(false);
        setGenBaseline(null);
        showAlert(err.message);
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [generating, genBaseline, loadCoverLetter, showAlert]);

  async function handleGenerate() {
    setAlert(null);
    setGenerating(true);
    setGenBaseline({
      updatedAt: jobUpdatedAt(job),
      markdown,
      startedAt: Date.now(),
    });

    try {
      await api.generateCoverLetter(id);
    } catch (err) {
      setGenerating(false);
      setGenBaseline(null);
      showAlert(err.message);
    }
  }

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

  function handleDownload() {
    if (!markdown || !job) return;
    downloadMarkdown(markdown, coverLetterFilename(job));
  }

  async function handleDownloadPdf() {
    if (!markdown || !job) return;

    setConvertingPdf(true);
    setAlert(null);

    try {
      const blob = await api.downloadCoverLetterPdf(id);
      downloadPdf(blob, coverLetterPdfFilename(job));
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
        <h1>Cover Letter</h1>
        <div className="loading-wrap">
          <div className="spinner" />
          <span className="loading-text">Loading cover letter…</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="cv-viewer-page">
        <h1>Cover Letter</h1>
        <div className="empty-state-card">
          <p>Job not found.</p>
          <Link to="/jobs" className="btn">
            Back to jobs
          </Link>
        </div>
      </div>
    );
  }

  if (!markdown && !generating) {
    return (
      <div className="cv-viewer-page">
        <div className="page-nav">
          <Link to={`/jobs/${id}`} className="back-link">
            ← Job detail
          </Link>
        </div>
        <h1>Cover Letter</h1>
        <p className="subtitle">
          {job.title || 'Untitled role'} · {job.company || 'Unknown company'}
        </p>
        <div className="empty-state-card">
          <p>No cover letter has been generated for this job yet.</p>
          <button type="button" className="btn btn-primary" onClick={handleGenerate}>
            Generate cover letter
          </button>
        </div>
        {alert && (
          <div className={`alert alert-${alert.type === 'info' ? 'info' : 'err'}`}>
            {alert.message}
          </div>
        )}
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
          <h1>Cover Letter</h1>
          <p className="subtitle">
            {job.title || 'Untitled role'} · {job.company || 'Unknown company'}
          </p>
        </div>
        <div className="btn-actions cv-viewer-actions">
          <button
            type="button"
            className="btn"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Rewriting…' : 'Rewrite cover letter'}
          </button>
          <button type="button" className="btn" onClick={handleCopy} disabled={generating || !markdown}>
            {copied ? 'Copied!' : 'Copy Markdown'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleDownload}
            disabled={generating || convertingPdf || !markdown}
          >
            Download .md
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleDownloadPdf}
            disabled={generating || convertingPdf || !markdown}
          >
            {convertingPdf ? 'Converting…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {generating ? (
        <div className="loading-wrap">
          <div className="spinner" />
          <span className="loading-text">Generating cover letter…</span>
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
