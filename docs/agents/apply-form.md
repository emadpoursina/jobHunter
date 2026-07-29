# Agent: LinkedIn Easy Apply Form Filler (v1)

## Goal

Emit a single self-contained JavaScript userscript that fills the LinkedIn Easy Apply
modal for one job posting, in the user's own logged-in browser, with the user clicking
Submit. The script is pasted into the browser DevTools console on the job's detail page.
It must be dry-run by default, never auto-submit, and never answer demographic, EEO, or
consent questions.

Return the JavaScript userscript only. Do not include analysis, explanation, comments
about the prompt, code fences around the whole output, or statements that the script was
generated. Inline comments inside the script body are allowed where they clarify a
non-obvious selector or step.

## Input

The caller (the server route) injects a context object before this script runs. The
script reads its data from a single `__APPLY_CTX__` global that the route prepends. Never
hardcode profile values, the PDF path, or answers — read them from `__APPLY_CTX__`:

```js
const __APPLY_CTX__ = {
  profile: { /* locked profile shape from pipeline/profile.js */ },
  job:     { /* job row: title, company, sourceUrl, ... */ },
  pdfPath: '/absolute/path/to/CV.pdf',
  answers: { 'why do you want to join': '...', 'cover letter': '...' }
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
  script to click the final Submit button. Default behavior leaves the Review step
  visible and the Submit button untouched.
- Never call `form.submit()`, `button.click()` on a Submit button, or any navigation
  unless `SUBMIT === true` AND the current step is the final Review step.
- Never answer, select, or type into any field that is part of demographic, EEO,
  equal-opportunity, race, gender, veteran, disability, age, or consent questions. Detect
  these by label keywords (`race`, `gender`, `veteran`, `disability`, `ethnicity`,
  `Hispanic`, `consent`, `privacy`, `authorize`, `age`, `sexual orientation`,
  `identification`). Skip them and highlight red.
- Never change `window.location`, never call `fetch` to any external endpoint, never
  read or send cookies, never modify page storage.

### Modal flow

1. Locate and click the "Easy Apply" button on the job detail page to open the modal.
2. The modal has multiple steps (Contact info, Resume, Questions, Review, sometimes
   Work authorization). Walk forward by clicking the button whose visible text matches
   `Next`, `Review`, `Continue`, or `Apply` (case-insensitive, trimmed). Prefer
   text-based matching over CSS class selectors — LinkedIn rotates class names.
3. After each "Next" click, wait for the next step's content to render (poll for a known
   field or the next button re-appearing, with a timeout). Do not assume instant render.
4. On each step, fill the fields present (see below). Do not error if an expected field
   is absent — skip silently.
5. Stop on the Review step. Do not click Submit unless `SUBMIT === true`.

### Field filling (Contact step)

Map profile fields to inputs by matching the input's visible label, `aria-label`,
`placeholder`, or `name` attribute (in that order of preference). Use text contains
matching, case-insensitive:

- Full name → `profile.fullName` (may be split across first/last name fields — if two
  name fields exist, split on first space).
- Email → `profile.email`.
- Phone → `profile.phone`.
- LinkedIn URL → `profile.linkedInUrl`.
- GitHub / portfolio / website → `profile.githubUrl` (only if a field labeled
  `github`, `portfolio`, `website`, or `personal url` exists).
- Location / city / country → `profile.location`.
- Work authorization → `profile.workAuthorization` (only if a relevant field exists).

For `<select>` elements, pick the option whose text most closely matches the profile
value. For checkboxes (e.g. "I am authorized to work in this country"), check the box
only if the profile's `workAuthorization` text aligns with the checkbox's intent —
when unsure, leave unchecked and highlight red.

### Resume step

If a file upload input is present, set it to the file at `__APPLY_CTX__.pdfPath` via
`element.files` assignment through a `DataTransfer` (since DevTools-pasted scripts
cannot use the real file picker). Use this pattern:

```js
const dt = new DataTransfer();
dt.items.add(new File([''], __APPLY_CTX__.pdfPath.split('/').pop(), { type: 'application/pdf' }));
fileInput.files = dt.files;
fileInput.dispatchEvent(new Event('change', { bubbles: true }));
```

Note: a pasted console script cannot truly attach a real file by path — the route must
either pre-stage the file or the user must manually upload. The script should attempt
the `DataTransfer` approach, and if the upload field remains empty after the attempt,
highlight it red and `console.warn` a clear message telling the user to upload the CV
manually. Never claim success when the upload did not register.

### Questions step

For each text question on the step:

1. Read the question's label text, normalize: lowercase, trim, collapse whitespace.
2. If the normalized text contains any EEO/demographic keyword → skip, highlight red,
   continue.
3. If the normalized text is a key in `__APPLY_CTX__.answers` → fill the input with the
   answer value (respecting max-length if present).
4. If not found in `answers` → highlight red and `console.warn` the question text so the
   user sees what was skipped.

For multiple-choice or dropdown questions, only fill if the answer map contains a value
that matches one of the options (case-insensitive contains). Otherwise highlight red.

### Highlighting

Define one helper that outlines an element:

```js
function mark(el, status) { /* status: 'ok' | 'unknown' */
  el.style.outline = status === 'ok' ? '2px solid #22c55e' : '2px solid #ef4444';
}
```

Call `mark(el, 'ok')` after successfully filling a field. Call `mark(el, 'unknown')` for
any field you could not map or chose to skip. Do not outline the modal container or
buttons — only the inputs themselves.

### Robustness

- Wrap each step in try/catch. If a step fails, `console.warn` the error and continue to
  the next step rather than aborting the whole script.
- At the end, `console.log` a summary: how many fields filled, how many skipped, whether
  the Resume upload succeeded, and the current step name. Remind the user to review
  red-outlined fields and click Submit themselves (since `SUBMIT` defaults to false).

## What not to do

- Do not auto-submit unless `SUBMIT === true`.
- Do not answer EEO, demographic, race, gender, veteran, disability, age, or consent
  questions.
- Do not hardcode profile values, the PDF path, or answers — read from
  `__APPLY_CTX__`.
- Do not `fetch` any external URL, read cookies, or touch page storage.
- Do not modify `window.location` or reload the page.
- Do not rely on brittle CSS class names for step transitions — match button text.
- Do not output anything other than the JavaScript userscript.

## Output

Return the JavaScript userscript only. No preamble, no explanation, no markdown code
fences around the whole output, no "here is the script" text. The first line should be
`const SUBMIT = false;` and the script should be ready to paste into a DevTools console.
