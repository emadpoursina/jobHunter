import { useMemo } from 'react';
import { marked } from 'marked';

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Escape raw HTML tokens; keep a full Renderer so marked's other methods stay intact
function createSafeRenderer() {
  const renderer = new marked.Renderer();
  renderer.html = (token) => {
    const text = typeof token === 'string' ? token : (token?.text ?? '');
    return escapeHtml(text);
  };
  return renderer;
}

// Render CV markdown as styled HTML for inline previews
export default function CvPreview({ markdown, className = '', safe = false }) {
  const html = useMemo(() => {
    if (!markdown) return '';
    if (!safe) return marked.parse(markdown, { async: false });

    return marked.parse(markdown, {
      async: false,
      renderer: createSafeRenderer(),
    });
  }, [markdown, safe]);

  if (!markdown) return null;

  return (
    <div
      className={`cv-preview markdown-body${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
