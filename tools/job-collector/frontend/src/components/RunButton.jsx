// Trigger a collector run and show loading state while the run is active
export default function RunButton({ label, running, disabled, onClick }) {
  return (
    <button
      type="button"
      className="btn btn-primary run-button"
      onClick={onClick}
      disabled={disabled || running}
    >
      {running && <span className="run-spinner" aria-hidden />}
      {running ? `Running ${label}…` : `Run ${label}`}
    </button>
  );
}
