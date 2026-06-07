import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';

// Return CSS class for match score colour bands
export function matchScoreClass(score) {
  if (score == null || score === '') return 'score-muted';
  if (score >= 70) return 'score-high';
  if (score >= 50) return 'score-mid';
  return 'score-low';
}

// Render visa sponsorship as a small badge when present
function VisaBadge({ visa }) {
  if (!visa) return null;

  const normalized = String(visa).toLowerCase();
  let className = 'visa-neutral';
  if (normalized === 'yes' || normalized === 'likely') className = 'visa-yes';
  if (normalized === 'no' || normalized === 'unlikely') className = 'visa-no';

  return <span className={`visa-badge ${className}`}>{visa}</span>;
}

// Compact job summary row for the Jobs list
export default function JobCard({ job }) {
  const scoreClass = matchScoreClass(job.matchScore);

  return (
    <article className="job-card">
      <div className="job-card-main">
        <div className="job-card-header">
          <h2 className="job-card-title">{job.title || 'Untitled role'}</h2>
          <div className="job-card-badges">
            <StatusBadge status={job.status} />
            <VisaBadge visa={job.visaSponsorship} />
          </div>
        </div>

        <p className="job-card-meta">
          {[job.company, job.location].filter(Boolean).join(' · ') || 'Unknown company'}
        </p>

        <div className="job-card-footer">
          <span className="job-card-source">{job.source}</span>
          {job.countryCode && (
            <span className="job-card-country">{job.countryCode}</span>
          )}
          <span className={`match-score ${scoreClass}`}>
            {job.matchScore != null ? `${job.matchScore}% match` : 'No score'}
          </span>
        </div>
      </div>

      <Link to={`/jobs/${job.id}`} className="btn btn-view">
        View
      </Link>
    </article>
  );
}
