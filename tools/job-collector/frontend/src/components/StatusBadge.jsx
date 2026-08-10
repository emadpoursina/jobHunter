const JOB_STATUS_CONFIG = {
  raw: { label: 'Raw', className: 'status-raw' },
  parsed: { label: 'Parsed', className: 'status-parsed' },
  unmatched: { label: 'Not a match', className: 'status-unmatched' },
  cv_generated: { label: 'CV ready', className: 'status-cv' },
  applied: { label: 'Applied', className: 'status-applied' },
  rejected: { label: 'Rejected', className: 'status-rejected' },
};

export const APPLICATION_STAGE_CONFIG = {
  not_started: { label: 'Not started', className: 'stage-not-started' },
  draft: { label: 'Draft', className: 'stage-draft' },
  reviewed: { label: 'Reviewed', className: 'stage-reviewed' },
  sent: { label: 'Sent', className: 'stage-sent' },
  screening: { label: 'Screening', className: 'stage-screening' },
  interview: { label: 'Interview', className: 'stage-interview' },
  offer: { label: 'Offer', className: 'stage-offer' },
  rejected: { label: 'Rejected', className: 'stage-rejected' },
  withdrawn: { label: 'Withdrawn', className: 'stage-withdrawn' },
};

export const APPLICATION_STAGE_OPTIONS = Object.entries(APPLICATION_STAGE_CONFIG).map(
  ([value, { label }]) => ({ value, label }),
);

const RUN_STATUS_CONFIG = {
  running: { label: 'Running', className: 'status-running' },
  done: { label: 'Done', className: 'status-done' },
  error: { label: 'Error', className: 'status-error' },
};

// Render a coloured pill for job status, run status, or application stage
export default function StatusBadge({ status, variant = 'job' }) {
  let configMap = JOB_STATUS_CONFIG;
  if (variant === 'run') configMap = RUN_STATUS_CONFIG;
  if (variant === 'stage') configMap = APPLICATION_STAGE_CONFIG;

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
