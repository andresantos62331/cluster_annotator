export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",");
  const out: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",");
    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] ?? "";
    }
    out.push(obj);
  }
  return out;
}
