import * as XLSX from 'xlsx';
import { cellStr, flagKind } from './fieldCategoriser';
import { isBlacklistedHeader } from './constants';

export type ProjectStatus = 'Completed' | 'In Progress' | 'Delayed';

export interface EnrichedRow {
  row: Record<string, unknown>;
  progress: number;   // 0–100
  status: ProjectStatus;
  pm: string;
  name: string;
}

// ── Column detection ─────────────────────────────────────────────────────────

function findCol(headers: string[], keywords: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function findPMColumn(headers: string[]): string | null {
  return findCol(headers, ['project manager', 'pm', 'owner', 'responsible', 'assigned to']);
}

export function findEndDateColumn(headers: string[]): string | null {
  return findCol(headers, ['end date', 'due date', 'deadline', 'finish date', 'planned end', 'target date', 'completion date']);
}

export function findProgressColumn(headers: string[]): string | null {
  return findCol(headers, ['progress', 'completion %', '% done', '% complete', 'percent done']);
}

export function findNameColumn(headers: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase());
  const blocked = (s: string) =>
    /\btitle\b/.test(s) || ((s.includes('tech') || s.includes('teck')) && s.includes('team'));

  // 1) Item Description
  let idx = lower.findIndex(
    (h) => h.includes('item') && (h.includes('descr') || h.includes('description')) && !blocked(h)
  );
  if (idx !== -1) return headers[idx];

  // 2) Project Name
  idx = lower.findIndex((h) => h.includes('project') && h.includes('name') && !blocked(h));
  if (idx !== -1) return headers[idx];

  // 3) Initiative
  idx = lower.findIndex((h) => h.includes('initiative') && !blocked(h));
  if (idx !== -1) return headers[idx];

  // 4) Generic Name (avoid Tech/Teck Team Name)
  idx = lower.findIndex((h) => (h === 'name' || h.includes('name')) && !blocked(h));
  if (idx !== -1) return headers[idx];

  return null;
}

// ── Date parsing ─────────────────────────────────────────────────────────────

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const n = Number(value);
  if (!isNaN(n) && n > 10000) {
    // Excel serial date (days since 1899-12-30)
    return new Date((n - 25569) * 86400 * 1000);
  }
  const str = cellStr(value).trim();
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// ── Progress computation ─────────────────────────────────────────────────────

function computeYNProgress(headers: string[], row: Record<string, unknown>): number | null {
  let yes = 0, no = 0;
  headers.forEach((h) => {
    if (isBlacklistedHeader(h)) return;
    const kind = flagKind(row[h]);
    if (kind === 'yes') yes++;
    else if (kind === 'no') no++;
  });
  const total = yes + no;
  return total > 0 ? Math.round((yes / total) * 100) : null;
}

function getProjectName(
  headers: string[],
  row: Record<string, unknown>,
  nameCol: string | null
): string {
  const lc = (s: string) => s.toLowerCase();
  const blocked = (s: string) =>
    /\btitle\b/.test(s) || ((s.includes('tech') || s.includes('teck')) && s.includes('team'));
  const isBizDesc = (s: string) =>
    s.includes('σαφή') && s.includes('επιχειρησιακ') && s.includes('περιγραφ') && s.includes('αλλαγ');
 
  // Primary from provided name column if available
  let primary = '';
  if (nameCol) {
    const v = cellStr(row[nameCol]).trim();
    if (v) primary = v;
  }
 
  // Explicit precedence if not set yet:
  // Item Description > Project Name > PBI Id > AfterCare/Redmine Id
  if (!primary) {
    const lower = headers.map(lc);
    const preferOrder: ((s: string) => boolean)[] = [
      (h) => h.includes('item') && (h.includes('descr') || h.includes('description')),
      (h) => h.includes('project') && h.includes('name'),
      (h) => /\bpbi\b/.test(h),
      (h) =>
        ((h.includes('redmine') || h.includes('ticket')) && h.includes('id')) ||
        (h.includes('after') && h.includes('care') && (h.includes('id') || h.includes('redmine'))),
    ];
    for (const predicate of preferOrder) {
      const idx = lower.findIndex((h) => predicate(h) && !blocked(h));
      if (idx !== -1) {
        const v = cellStr(row[headers[idx]]).trim();
        if (v) { primary = v; break; }
      }
    }
  }
 
  // Generic fallback: first reasonable non-numeric, excluding blocked headers
  if (!primary) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const hl = lc(h);
      if (blocked(hl)) continue;
      const v = cellStr(row[h]).trim();
      if (v && isNaN(Number(v)) && !v.includes('@') && v.length > 1 && v.length <= 80) {
        primary = v;
        break;
      }
    }
  }
 
  // Append business description (Greek) if present
  let biz = '';
  for (const h of headers) {
    const hl = lc(h);
    if (isBizDesc(hl)) {
      const v = cellStr(row[h]).trim();
      if (v) { biz = v; break; }
    }
  }
 
  const name = [primary || 'Project', biz].filter(Boolean).join(' + ');
  return name;
}

// ── Main enrichment ──────────────────────────────────────────────────────────

export function enrichRows(
  headers: string[],
  rows: Record<string, unknown>[]
): EnrichedRow[] {
  const progressCol = findProgressColumn(headers);
  const endDateCol  = findEndDateColumn(headers);
  const pmCol       = findPMColumn(headers);
  const nameCol     = findNameColumn(headers);
  const today       = new Date();

  return rows.map((row) => {
    // ── Progress ──
    let progress: number;
    if (progressCol) {
      const raw = cellStr(row[progressCol]).trim().replace('%', '');
      const n = parseFloat(raw);
      if (!isNaN(n)) {
        progress = n > 1 ? Math.round(n) : Math.round(n * 100);
      } else {
        progress = computeYNProgress(headers, row) ?? 0;
      }
    } else {
      progress = computeYNProgress(headers, row) ?? 0;
    }
    progress = Math.min(100, Math.max(0, progress));

    // ── Status ──
    const endDate = endDateCol ? parseDate(row[endDateCol]) : null;
    let status: ProjectStatus;
    if (progress >= 100) {
      status = 'Completed';
    } else if (endDate && endDate < today) {
      status = 'Delayed';
    } else {
      status = 'In Progress';
    }

    const pm   = pmCol ? cellStr(row[pmCol]).trim() : '';
    const name = getProjectName(headers, row, nameCol);

    return { row, progress, status, pm, name };
  });
}

// ── Aggregate helpers ────────────────────────────────────────────────────────

export function getUniquePMs(enrichedRows: EnrichedRow[]): string[] {
  const pms = new Set<string>();
  enrichedRows.forEach((r) => { if (r.pm) pms.add(r.pm); });
  return Array.from(pms).sort();
}

export function getStatusCounts(
  enrichedRows: EnrichedRow[]
): Record<ProjectStatus, number> {
  return enrichedRows.reduce(
    (acc, r) => { acc[r.status]++; return acc; },
    { Completed: 0, 'In Progress': 0, Delayed: 0 } as Record<ProjectStatus, number>
  );
}

// ── Radar / Spider data ──────────────────────────────────────────────────────

/**
 * Returns up to 8 Y/N column names ordered by how many rows contain
 * a Y or N value in that column (most populated first).
 */
export function getRadarAxes(
  headers: string[],
  rows: Record<string, unknown>[]
): string[] {
  const freq: Record<string, number> = {};
  rows.forEach((row) =>
    headers.forEach((h) => {
      if (isBlacklistedHeader(h)) return;
      const kind = flagKind(row[h]);
      if (kind === 'yes' || kind === 'no') {
        freq[h] = (freq[h] ?? 0) + 1;
      }
    })
  );
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([h]) => h);
}

export function getRadarData(
  axes: string[],
  rows: Record<string, unknown>[]
): Array<{ axis: string; fullAxis: string; value: number }> {
  return axes.map((h) => {
    let yes = 0, total = 0;
    rows.forEach((row) => {
      const kind = flagKind(row[h]);
      if (kind === 'yes') { yes++; total++; }
      else if (kind === 'no') { total++; }
    });
    const label = h
      .replace(/\s*\([Yy]\/[Nn]\)/g, '')
      .replace(/\?$/, '')
      .trim()
      .slice(0, 18)
      .trim();
    return { axis: label, fullAxis: h, value: total > 0 ? Math.round((yes / total) * 100) : 0 };
  });
}

// ── Excel export ─────────────────────────────────────────────────────────────

export function exportUpdatedExcel(
  headers: string[],
  enrichedRows: EnrichedRow[],
  baseName: string,
  sheetName: string
): void {
  const exportHeaders = [...headers, 'Progress (%)', 'Status'];

  const sheetData = enrichedRows.map(({ row, progress, status }) => {
    const record: Record<string, unknown> = {};
    headers.forEach((h) => { record[h] = row[h] ?? ''; });
    record['Progress (%)'] = progress;
    record['Status'] = status;
    return record;
  });

  const ws = XLSX.utils.json_to_sheet(sheetData, { header: exportHeaders });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

  const fileName = `${baseName}_updated.xlsx`.replace(/[^\w._-]/g, '_');
  XLSX.writeFile(wb, fileName);
}
