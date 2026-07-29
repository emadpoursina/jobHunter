# Agent: Company-site apply form filler (v1)

## Goal

Emit a single self-contained JavaScript userscript that fills a **company careers / ATS application
form** for one job, in the user's own logged-in browser, with the user clicking Submit. The user
navigates to the company apply URL (`__APPLY_CTX__.job.applyUrl` or the current page), pastes the
script into DevTools, and reviews every field before submitting. Dry-run by default — never
auto-submit — and never answer demographic, EEO, or consent questions.

Return the JavaScript userscript only. Do not include analysis, explanation, comments about the
prompt, code fences around the whole output, or statements that the script was generated. Inline
comments inside the script body are allowed where they clarify a non-obvious selector or step.

## Input

The caller (the server route) injects a context object before this script runs. The script reads
its data from a single `__APPLY_CTX__` global that the route prepends. Never hardcode profile
values, the PDF path, apply URL, or answers — read them from `__APPLY_CTX__`:

```js
const __APPLY_CTX__ = {
  profile: { /* locked profile shape from pipeline/profile.js */ },
  job: {
    title,
    company,
    sourceUrl,   // listing URL (e.g. LinkedIn) — informational
    applyUrl,    // company careers / ATS form URL (preferred target)
  },
  pdfPath: '/absolute/path/to/CV.pdf',
  urlHost: 'careers.example.com', // hostname of applyUrl (or fallback)
  answers: { 'why do you want to join': '...', 'cover letter': '...' },
};
```

The `profile` object fields are exactly: `fullName`, `email`, `phone`, `telegram`,
`linkedInUrl`, `githubUrl`, `location`, `seeking`, `workAuthorization`, `languages`
(array of `{ name, level }`).

The `answers` map is keyed by the lowercased, trimmed question text. It may be empty or
partial — the script must tolerate missing keys.

## Script requirements

### Safety contract

- Start with `const SUBMIT = false;`. The user flips this to `true` only if they want the
  script to click a final Submit / Apply button. Default behavior leaves the form filled but
  not submitted.
- Never call `form.submit()`, never click Submit / Apply / Send application buttons, and never
  navigate away unless `SUBMIT === true` AND the user has explicitly set that flag after
  reviewing all fields.
- Never answer, select, or type into any field that is part of demographic, EEO,
  equal-opportunity, race, gender, veteran, disability, age, or consent questions. Detect
  these by label keywords (`race`, `gender`, `veteran`, `disability`, `ethnicity`,
  `Hispanic`, `consent`, `privacy`, `authorize`, `age`, `sexual orientation`,
  `identification`, `eeo`, `voluntary`). Skip them and highlight red.
- Never change `window.location`, never call `fetch` to any external endpoint, never read or
  send cookies, never modify page storage.

### Page flow (company / ATS forms)

Unlike LinkedIn Easy Apply modals, company forms are usually a single page or a short
multi-step wizard on the same origin. The script should:

1. Assume the user is already on the apply page (or a page containing the application form).
   Do **not** require clicking an "Easy Apply" button or opening a LinkedIn modal.
2. Locate the main application `<form>` or the primary application container (common patterns:
   `form[action*="apply"]`, `form#application`, `[data-qa="application-form"]`, Greenhouse
   `#application-form`, Lever `.application-form`, Workday `data-automation-id` form regions).
   If multiple forms exist, prefer the one with the most visible text inputs.
3. For multi-step ATS wizards, advance by clicking visible Next / Continue / Save and continue
   buttons (text match, case-insensitive). Wait briefly after each click for the next step to
   render (poll with timeout). Stop before the final Submit unless `SUBMIT === true`.
4. On each step or section, fill visible fields (see below). Do not error if an expected field
   is absent — skip silently.
5. End with the form ready for human review. Log a summary reminding the user to upload CV
   manually if needed and to click Submit themselves when `SUBMIT` is false.

### Host-aware hints (`urlHost`)

When `__APPLY_CTX__.urlHost` matches known ATS hosts, prefer these conventions before generic
label matching:

| Host pattern | Notes |
|--------------|-------|
| `boards.greenhouse.io`, `*.greenhouse.io` | `#application-form`, `.field` labels, file input `#resume` / `input[type=file]` |
| `jobs.lever.co`, `*.lever.co` | `.application-form`, `.application-field`, posting apply sections |
| `*.myworkdayjobs.com`, `workday.com` | `[data-automation-id]` attributes on inputs; multi-step Next buttons |
| `*.personio.de`, `*.personio.com` | German/English label text; standard text inputs in apply widget |
| `*.ashbyhq.com` | Ashby application form sections; label `for` associations |
| `*.bamboohr.com` | BambooHR careers apply form fields |

If `urlHost` does not match a known pattern, use generic label / aria-label / placeholder /
`name` matching only. Do not fail when host is unknown.

### Field filling

Map profile fields to inputs by matching the input's visible label, associated `<label>`,
`aria-label`, `placeholder`, or `name` attribute (in that order). Use text-contains matching,
case-insensitive:

- Full name → `profile.fullName` (split across first/last name fields on first space if needed).
- Email → `profile.email`.
- Phone → `profile.phone`.
- LinkedIn URL → `profile.linkedInUrl`.
- GitHub / portfolio / website → `profile.githubUrl` (only if a field labeled
  `github`, `portfolio`, `website`, or `personal url` exists).
- Location / city / country → `profile.location`.
- Work authorization → `profile.workAuthorization` (only if a relevant field exists).

For `<select>` elements, pick the option whose text most closely matches the profile value.
For checkboxes (e.g. "I am authorized to work in this country"), check only when intent clearly
aligns — when unsure, leave unchecked and highlight red.

### Resume upload

If a file upload input is present (`input[type="file"]` accepting pdf/doc), attempt:

```js
const dt = new DataTransfer();
dt.items.add(new File([''], __APPLY_CTX__.pdfPath.split('/').pop(), { type: 'application/pdf' }));
fileInput.files = dt.files;
fileInput.dispatchEvent(new Event('change', { bubbles: true }));
fileInput.dispatchEvent(new Event('input', { bubbles: true }));
```

A pasted console script cannot attach a real file by path — if the upload field remains empty
after the attempt, highlight it red and `console.warn` telling the user to upload
`__APPLY_CTX__.pdfPath` manually. Never claim success when the upload did not register.

### Free-text and custom questions

For each text question on the form:

1. Read the question's label text, normalize: lowercase, trim, collapse whitespace.
2. If the normalized text contains any EEO/demographic keyword → skip, highlight red, continue.
3. If the normalized text is a key in `__APPLY_CTX__.answers` → fill the input with the
   answer value (respect `maxlength` if present).
4. If not found in `answers` → highlight red and `console.warn` the question text.

For multiple-choice or dropdown questions, only fill if the answer map contains a value that
matches one of the options (case-insensitive contains). Otherwise highlight red.

### Highlighting

Define one helper that outlines an element:

```js
function mark(el, status) { /* status: 'ok' | 'unknown' */
  el.style.outline = status === 'ok' ? '2px solid #22c55e' : '2px solid #ef4444';
}
```

Call `mark(el, 'ok')` after successfully filling a field. Call `mark(el, 'unknown')` for any
field you could not map or chose to skip. Outline inputs only — not page chrome or nav buttons.

### Robustness

- Wrap each major section in try/catch. On failure, `console.warn` and continue.
- At the end, `console.log` a summary: fields filled, skipped, resume upload status, and
  `urlHost`. Remind the user to review red-outlined fields and submit manually when
  `SUBMIT === false`.

## What not to do

- Do not target LinkedIn Easy Apply modals, "Easy Apply" buttons, or LinkedIn-specific step UI.
- Do not auto-submit unless `SUBMIT === true`.
- Do not answer EEO, demographic, race, gender, veteran, disability, age, or consent questions.
- Do not hardcode profile values, PDF path, apply URL, or answers — read from `__APPLY_CTX__`.
- Do not `fetch` any external URL, read cookies, or touch page storage.
- Do not modify `window.location` or reload the page.
- Do not output anything other than the JavaScript userscript.

## Output

Return the JavaScript userscript only. No preamble, no explanation, no markdown code fences
around the whole output. The first line should be `const SUBMIT = false;` and the script should
be ready to paste into a DevTools console on the company apply page.
