const JOB_STATUS_CONFIG = {
  raw: { label: 'Raw', className: 'status-raw' },
  parsed: { label: 'Parsed', className: 'status-parsed' },
  cv_generated: { label: 'CV ready', className: 'status-cv' },
  applied: { label: 'Applied', className: 'status-applied' },
  rejected: { label: 'Rejected', className: 'status-rejected' },
};

const RUN_STATUS_CONFIG = {
  running: { label: 'Running', className: 'status-running' },
  done: { label: 'Done', className: 'status-done' },
  error: { label: 'Error', className: 'status-error' },
};

// Render a coloured pill for a job or collection run status
export default function StatusBadge({ status, variant = 'job' }) {
  const configMap = variant === 'run' ? RUN_STATUS_CONFIG : JOB_STATUS_CONFIG;
  const config = configMap[status] ?? {
    label: status ?? 'Unknown',
    className: 'status-raw',
  };

  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}
