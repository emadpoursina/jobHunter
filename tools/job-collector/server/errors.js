// Map machine-readable error codes to HTTP status codes
const STATUS_BY_CODE = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  PARSE_ERROR: 422,
  LLM_ERROR: 503,
  OLLAMA_UNAVAILABLE: 503,
  DUPLICATE_URL: 409,
  INTERNAL_ERROR: 500,
};

// Build an Error tagged with HTTP status and machine-readable code
export function httpError(message, status = 500, code = 'INTERNAL_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// Resolve HTTP status from an error's code field
export function statusForError(err) {
  if (err.status) return err.status;
  if (err.code && STATUS_BY_CODE[err.code]) return STATUS_BY_CODE[err.code];
  return 500;
}

// Wrap async route handlers so rejections reach the global error handler
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
