// Naive line-by-line diff for profile AI proposals (no external deps)
export function buildLineDiff(before, after) {
  const oldLines = String(before ?? '').split('\n');
  const newLines = String(after ?? '').split('\n');
  const rows = [];
  const max = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < max; i += 1) {
    const left = oldLines[i];
    const right = newLines[i];
    if (left === right) {
      rows.push({ type: 'same', text: left ?? '' });
    } else {
      if (left !== undefined) rows.push({ type: 'remove', text: left });
      if (right !== undefined) rows.push({ type: 'add', text: right });
    }
  }

  return rows;
}

export function diffHasChanges(rows) {
  return rows.some((row) => row.type !== 'same');
}
