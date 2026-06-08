import { useState } from 'react';
import { api } from '../api.js';

// Panel for one collector: copy console script, paste JSON, import
export default function BrowserCollector({ name, label, script, instructions, searchHint, detailHint, onImported, onError }) {
  const [expanded, setExpanded] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Copy the browser-console script to clipboard
  async function handleCopyScript() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.('Could not copy — select the script manually.');
    }
  }

  // Parse pasted JSON and send to import endpoint
  async function handleImport() {
    const trimmed = jsonInput.trim();
    if (!trimmed) {
      onError?.('Paste the JSON from your browser console first.');
      return;
    }

    setImporting(true);
    try {
      let payload;
      try {
        payload = JSON.parse(trimmed);
      } catch {
        throw new Error('Invalid JSON — run the script again and paste the full output.');
      }

      const source = payload.source ?? name;
      const offers = payload.offers ?? (Array.isArray(payload) ? payload : null);

      if (!offers?.length) {
        throw new Error('JSON must contain an "offers" array with at least one entry.');
      }

      const { runId, offerCount } = await api.importCollect(source, offers);
      setJsonInput('');
      onImported?.({ runId, offerCount, source });
    } catch (err) {
      onError?.(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="browser-collector">
      <button
        type="button"
        className="browser-collector-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="browser-collector-name">{label}</span>
        <span className="browser-collector-chevron">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="browser-collector-body">
          <ol className="browser-collector-steps">
            {instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {searchHint && <p className="hint">{searchHint}</p>}
          {detailHint && <p className="hint">{detailHint}</p>}

          <div className="browser-script-wrap">
            <div className="browser-script-header">
              <span>Console script</span>
              <button type="button" className="btn btn-sm" onClick={handleCopyScript}>
                {copied ? 'Copied!' : 'Copy script'}
              </button>
            </div>
            <pre className="browser-script">{script}</pre>
          </div>

          <div className="field">
            <label htmlFor={`import-${name}`}>Pasted JSON</label>
            <textarea
              id={`import-${name}`}
              rows={5}
              placeholder='{"source":"linkedin","offers":[...]}'
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImport}
            disabled={importing || !jsonInput.trim()}
          >
            {importing ? 'Importing…' : 'Import offers'}
          </button>
        </div>
      )}
    </div>
  );
}
