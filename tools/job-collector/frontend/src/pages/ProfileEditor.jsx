import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import CvPreview from '../components/CvPreview.jsx';
import { buildLineDiff, diffHasChanges } from '../profileDiff.js';

function downloadMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Warn when leaving the page with unsaved profile edits
function useUnsavedGuard(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;

    const handler = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}

export default function ProfileEditor({ onDirtyChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [alert, setAlert] = useState(null);

  const [savedMarkdown, setSavedMarkdown] = useState('');
  const [savedRevision, setSavedRevision] = useState('');
  const [draft, setDraft] = useState('');

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProposal, setAiProposal] = useState(null);
  const [aiBaseRevision, setAiBaseRevision] = useState(null);

  const dirty = draft !== savedMarkdown;

  const diffRows = useMemo(() => {
    if (!aiProposal) return [];
    return buildLineDiff(savedMarkdown, aiProposal);
  }, [aiProposal, savedMarkdown]);

  useUnsavedGuard(dirty);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const showAlert = useCallback((message, type = 'err') => {
    setAlert({ message, type });
    const timer = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timer);
  }, []);

  const applyServerDocument = useCallback((doc) => {
    setSavedMarkdown(doc.markdown);
    setSavedRevision(doc.revision);
    setDraft(doc.markdown);
    setAiProposal(null);
    setAiBaseRevision(null);
  }, []);

  const loadProfile = useCallback(async () => {
    const doc = await api.getProfile();
    applyServerDocument(doc);
    return doc;
  }, [applyServerDocument]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await loadProfile();
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
  }, [loadProfile, showAlert]);

  function handleRevert() {
    setDraft(savedMarkdown);
    setAiProposal(null);
    setAiBaseRevision(null);
  }

  function handleDownload() {
    downloadMarkdown(draft, 'master-profile.md');
  }

  async function handleSave() {
    setSaving(true);
    setAlert(null);
    try {
      const result = await api.saveProfile(draft, savedRevision);
      applyServerDocument(result);
      showAlert('Profile saved.', 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAiPreview() {
    if (!aiPrompt.trim()) {
      showAlert('Enter an AI update request first.');
      return;
    }
    if (dirty) {
      showAlert('Save or revert your edits before running AI preview.');
      return;
    }

    setAiLoading(true);
    setAlert(null);
    try {
      const result = await api.previewProfileUpdate(aiPrompt.trim(), savedRevision);
      setAiProposal(result.proposal);
      setAiBaseRevision(result.baseRevision);
    } catch (err) {
      setAiProposal(null);
      setAiBaseRevision(null);
      showAlert(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  function handleDiscardProposal() {
    setAiProposal(null);
    setAiBaseRevision(null);
  }

  async function handleApplyProposal() {
    if (!aiProposal || !aiBaseRevision) return;

    setApplying(true);
    setAlert(null);
    try {
      const result = await api.applyProfileUpdate(aiProposal, aiBaseRevision);
      applyServerDocument(result);
      setAiPrompt('');
      showAlert('AI proposal applied.', 'info');
    } catch (err) {
      showAlert(err.message);
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-editor-page">
        <h1>Profile</h1>
        <div className="loading-wrap">
          <div className="spinner" />
          <span className="loading-text">Loading profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-editor-page">
      <div className="profile-editor-header">
        <div>
          <h1>Profile</h1>
          <p className="subtitle">Edit master-profile.md — manual save or AI-assisted updates.</p>
        </div>
        <div className="btn-actions profile-editor-actions">
          <button type="button" className="btn" onClick={handleDownload}>
            Download master profile
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleRevert}
            disabled={!dirty || saving || aiLoading || applying}
          >
            Revert
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!dirty || saving || aiLoading || applying}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {dirty && (
        <div className="alert alert-info profile-unsaved-banner">
          Unsaved changes — save or revert before AI preview.
        </div>
      )}

      <div className="profile-editor-grid">
        <div className="card profile-editor-pane">
          <div className="card-title">Markdown</div>
          <textarea
            className="profile-editor-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="card profile-editor-pane">
          <div className="card-title">Preview</div>
          <div className="profile-preview-wrap">
            <CvPreview markdown={draft} safe />
          </div>
        </div>
      </div>

      <div className="card profile-ai-card">
        <div className="card-title">AI update</div>
        <p className="hint">
          Preview runs against the saved profile on the server. Apply writes only after you review
          the proposal.
        </p>
        <div className="field">
          <label htmlFor="profile-ai-prompt">What should change?</label>
          <textarea
            id="profile-ai-prompt"
            rows={3}
            placeholder="e.g. Add Redis to core skills as Proficient"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            disabled={aiLoading || applying}
          />
        </div>
        <div className="btn-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAiPreview}
            disabled={aiLoading || applying || !aiPrompt.trim() || dirty}
          >
            {aiLoading ? 'Generating…' : 'Preview AI update'}
          </button>
          {aiProposal && (
            <button
              type="button"
              className="btn"
              onClick={handleDiscardProposal}
              disabled={applying}
            >
              Discard proposal
            </button>
          )}
        </div>
      </div>

      {aiProposal && (
        <div className="card profile-proposal-card">
          <div className="profile-proposal-header">
            <div className="card-title">AI proposal</div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApplyProposal}
              disabled={applying}
            >
              {applying ? 'Applying…' : 'Apply proposal'}
            </button>
          </div>

          {diffHasChanges(diffRows) && (
            <div className="profile-diff">
              <div className="card-title">Diff (saved → proposed)</div>
              <pre className="profile-diff-pre">
                {diffRows.map((row, index) => {
                  if (row.type === 'same') {
                    return (
                      <span key={`${index}-same`} className="profile-diff-same">
                        {`  ${row.text}\n`}
                      </span>
                    );
                  }
                  if (row.type === 'remove') {
                    return (
                      <span key={`${index}-remove`} className="profile-diff-remove">
                        {`- ${row.text}\n`}
                      </span>
                    );
                  }
                  return (
                    <span key={`${index}-add`} className="profile-diff-add">
                      {`+ ${row.text}\n`}
                    </span>
                  );
                })}
              </pre>
            </div>
          )}

          <div className="card-title">Proposed preview</div>
          <div className="profile-preview-wrap">
            <CvPreview markdown={aiProposal} safe />
          </div>
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
