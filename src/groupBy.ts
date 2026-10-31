/** Rows by key. Groups keep the order their keys first appear in, and so do their rows. */
export function groupBy<Row>(rows: Row[], keyOf: (row: Row) => string) {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return groups;
}
