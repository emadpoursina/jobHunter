import { useMemo } from 'react';
import { marked } from 'marked';

// Render CV markdown as styled HTML for inline previews
export default function CvPreview({ markdown, className = '' }) {
  const html = useMemo(() => {
    if (!markdown) return '';
    return marked.parse(markdown, { async: false });
  }, [markdown]);

  if (!markdown) return null;

  return (
    <div
      className={`cv-preview markdown-body${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
